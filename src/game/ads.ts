/**
 * ads.ts — REKLAM KATMANI (F3 · D-144). Oyun reklamı yalnız bu modülden görür.
 *
 * İki parça:
 *  1. `gecisliUygun` — geçişli reklamın KURALI, saf fonksiyon (bekçi bunu test eder).
 *  2. Arka uç — cihazda AdMob eklentisi (`@capacitor-community/admob`), tarayıcıda/testte SAHTE
 *     arka uç (monetization.md §4: "test modunda reklamlar mock'lanır"). Oyun ikisini ayırt etmez.
 *
 * Banner YOK (kullanıcı kararı, kalıcı). Ödüllü videonun ödül MİKTARI burada değil —
 * `economy.config.ts`te ve varyant kapısına tabi.
 */
import { adsConfig } from '../config/ads.config';
import { magazaPlatformu, type MagazaPlatformu } from './platform';
import type { OdulluSonuc } from './satinAlimTipleri';

export interface GecisliGirdi {
  simdi: number;
  /** Oturumun açıldığı an (ms) — soğuma buradan başlar: açılışta reklam yok. */
  oturumBasi: number;
  /** Son geçişli reklamın gösterildiği an (ms), hiç yoksa null. */
  sonGecisli: number | null;
  /** Bu panel açıkken bir ödül alındı mı (ödül ekranından sonra reklam YASAK). */
  panelOdul: boolean;
  /** Şu an ekranda bir reklam var mı. */
  reklamAcik: boolean;
  sogumaSn: number;
  /** "Reklamları Kaldır" alındı (F4a · D-040): geçişli HİÇ çıkmaz. Ödüllüye dokunmaz. */
  reklamsiz: boolean;
}

/** C1′: soğuma KURAR, panel kapanışı PATLATIR. Kapanış anında bu fonksiyon doğruysa reklam çıkar. */
export function gecisliUygun(g: GecisliGirdi): boolean {
  if (g.reklamsiz || g.panelOdul || g.reklamAcik) return false;
  const referans = Math.max(g.oturumBasi, g.sonGecisli ?? -Infinity);
  return g.simdi - referans >= g.sogumaSn * 1000;
}

/** Reklam SDK'sının oyuna görünen yüzü. Her `goster` reklam kapanınca çözülür. */
export interface ReklamArkaUcu {
  /** Rıza → (iOS) ATT → SDK başlatma. Reklam istenemiyorsa HATA fırlatır (ön plana dönüşte yeniden denenir). */
  kur(): Promise<void>;
  gecisliHazirla(): Promise<boolean>;
  gecisliGoster(): Promise<boolean>;
  odulluHazirla(): Promise<boolean>;
  /** `odul` = video sonuna dek izlendi · `yarida` = açıldı ama ödülsüz kapandı · `gosterilemedi`. */
  odulluGoster(): Promise<OdulluSonuc>;
  /** UMP "gizlilik seçenekleri": rıza verilen bölgede (AB/UK) oyuncu kararını sonradan değiştirebilmeli. */
  tercihler?: { gerekli(): boolean; ac(): Promise<void> };
}

/** Tarayıcı / test: her istek anında "gösterildi" sayılır, hiçbir ağ çağrısı yok. */
export function sahteArkaUc(): ReklamArkaUcu {
  return {
    kur: async () => {},
    gecisliHazirla: async () => true,
    gecisliGoster: async () => true,
    odulluHazirla: async () => true,
    odulluGoster: async () => 'odul',
  };
}

/** iOS ATT penceresi uygulama ön planda değilken düşer: belge görünür olana dek (en çok `ms`) bekle. */
function gorunurBekle(ms: number): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((coz) => {
    const bitti = () => {
      clearTimeout(zaman);
      document.removeEventListener('visibilitychange', bak);
      coz();
    };
    const bak = () => { if (document.visibilityState === 'visible') bitti(); };
    const zaman = setTimeout(bitti, ms);
    document.addEventListener('visibilitychange', bak);
  });
}

type Kapanis = 'kapandi' | 'gosterilemedi' | 'zamanAsimi';

/** Cihazda: AdMob. `platform` birimi ve iOS'un izin sırasını seçer (platform.ts tek kaynak). */
export async function admobArkaUcu(platform: MagazaPlatformu): Promise<ReklamArkaUcu> {
  const { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } =
    await import('@capacitor-community/admob');
  let tercihGerekli = false;
  const test = adsConfig.test;
  const birim = (test ? adsConfig.testBirim : adsConfig.birim)[platform];
  /**
   * `show*` çağrısı reklam AÇILINCA döner; oyun reklam KAPANANA dek beklemeli. Dinleyiciler
   * `goster()`ten ÖNCE kaydedilir (olay kaçmaz). Hiç HATA FIRLATMAZ ve asla sonsuza dek beklemez:
   * "açıldı" `acilmaSn` içinde gelmezse `gosterilemedi`, açıldıysa en geç `ustSinirSn`de `zamanAsimi`.
   */
  const kapanisiBekle = async (
    olay: { acildi: string; kapandi: string; basarisiz: string },
    goster: () => Promise<unknown>,
  ): Promise<Kapanis> => {
    const dinleyiciler: { remove: () => Promise<void> }[] = [];
    const zamanlar: ReturnType<typeof setTimeout>[] = [];
    let bitir!: (k: Kapanis) => void;
    const sonuc = new Promise<Kapanis>((coz) => { bitir = coz; });
    let acildi = false;
    try {
      dinleyiciler.push(await AdMob.addListener(olay.kapandi as never, () => bitir('kapandi')));
      dinleyiciler.push(await AdMob.addListener(olay.basarisiz as never, () => bitir('gosterilemedi')));
      dinleyiciler.push(await AdMob.addListener(olay.acildi as never, () => { acildi = true; }));
      const { acilmaSn, ustSinirSn } = adsConfig.gosterim;
      zamanlar.push(setTimeout(() => { if (!acildi) bitir('gosterilemedi'); }, acilmaSn * 1000));
      zamanlar.push(setTimeout(() => bitir('zamanAsimi'), ustSinirSn * 1000));
      goster().catch(() => bitir('gosterilemedi'));
      return await sonuc;
    } catch {
      return 'gosterilemedi';
    } finally {
      zamanlar.forEach(clearTimeout);
      await Promise.all(dinleyiciler.map((d) => d.remove().catch(() => {})));
    }
  };
  return {
    kur: async () => {
      // Sıra (Google UMP + Apple): RIZA → (form) → iOS ATT → `canRequestAds` ise SDK başlat → yükle.
      // UMP (GDPR): rıza gerekiyorsa Google'ın kendi formu — AB/UK'de rızasız reklam hiç gelmez.
      let bilgi: Awaited<ReturnType<typeof AdMob.requestConsentInfo>> | null = null;
      try {
        bilgi = await AdMob.requestConsentInfo();
        if (bilgi.status === AdmobConsentStatus.REQUIRED && bilgi.isConsentFormAvailable) bilgi = await AdMob.showConsentForm();
      } catch {
        // Bilgi/form alınamadı (ağ) — ATT yine sorulur; SDK başlatılmaz, ön plana dönüşte yeniden denenir.
      }
      tercihGerekli = bilgi?.privacyOptionsRequirementStatus === 'REQUIRED';
      // iOS · ATT (Apple zorunluluğu) AYRI denemede: rıza adımı düşse de sorulur. AdMob panelinde "IDFA
      // açıklama mesajı" kuruluysa UMP formu pencereyi kendisi açar; değilse burada. Sistem bir kez sorar.
      // ATT hatası reklamı kapatmaz: izin yoksa SDK kişiselleştirilmemiş reklam sunar.
      if (platform === 'ios') {
        await gorunurBekle(adsConfig.izin.gorunurBekleSn * 1000);
        await dene(async () => {
          if ((await AdMob.trackingAuthorizationStatus()).status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        }, undefined);
      }
      if (!bilgi?.canRequestAds) throw new Error('reklam istenemez (rıza yok / bilgi alınamadı)');
      // D-151: SDK'ya kısıt bayrağı verilmez — içerik AdMob panelinden yönetiliyor (ads.config.ts).
      await AdMob.initialize({ initializeForTesting: test });
    },
    gecisliHazirla: async () => {
      await AdMob.prepareInterstitial({ adId: birim.gecisli, isTesting: test });
      return true;
    },
    gecisliGoster: async () => {
      const k = await kapanisiBekle({
        acildi: InterstitialAdPluginEvents.Showed,
        kapandi: InterstitialAdPluginEvents.Dismissed,
        basarisiz: InterstitialAdPluginEvents.FailedToShow,
      }, () => AdMob.showInterstitial());
      return k !== 'gosterilemedi';
    },
    odulluHazirla: async () => {
      await AdMob.prepareRewardVideoAd({ adId: birim.odullu, isTesting: test });
      return true;
    },
    odulluGoster: async () => {
      // Ödül olayı gelmeden kapanırsa (erken çıkış) ödül YOK; geldiyse zaman aşımında da ödül kaybolmaz.
      let hakEtti = false;
      const dinle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { hakEtti = true; });
      try {
        const k = await kapanisiBekle({
          acildi: RewardAdPluginEvents.Showed,
          kapandi: RewardAdPluginEvents.Dismissed,
          basarisiz: RewardAdPluginEvents.FailedToShow,
        }, () => AdMob.showRewardVideoAd());
        return hakEtti ? 'odul' : k === 'gosterilemedi' ? 'gosterilemedi' : 'yarida';
      } finally {
        await dinle.remove().catch(() => {});
      }
    },
    tercihler: {
      gerekli: () => tercihGerekli,
      ac: () => AdMob.showPrivacyOptionsForm(),
    },
  };
}

// ─── Oturum durumu ───────────────────────────────────────────────────────────────────────────
let arkaUc: ReklamArkaUcu | null = null;
/** `kur` düştü (ağ · rıza alınamadı): ön plana dönüşte `reklamYenidenKur` bununla yeniden dener. */
let bekleyen: ReklamArkaUcu | null = null;
let kurUcusu: Promise<boolean> | null = null;
let oturumBasi = Date.now();
let sonGecisli: number | null = null;
let panelOdul = false;
let reklamAcik = false;
let gecisliHazir = false;
let odulluHazir = false;
let reklamsiz = false;
const sayac = { gecisli: 0, odullu: 0 };
type Tur = 'gecisli' | 'odullu';
/** Yükleme hatası sonrası geri çekilme: tür başına deneme sayısı + bekleyen zamanlayıcı. */
const yeniden: Record<Tur, { deneme: number; zaman: ReturnType<typeof setTimeout> | null }> = {
  gecisli: { deneme: 0, zaman: null },
  odullu: { deneme: 0, zaman: null },
};
const dinleyiciler = new Set<() => void>();
const bildir = () => dinleyiciler.forEach((f) => f());

/** Bir işlem başarısız olursa oyun durmaz — reklam gelmez, o kadar (dolum oranı %70-95). */
async function dene<T>(is: () => Promise<T>, yedek: T): Promise<T> {
  try {
    return await is();
  } catch {
    return yedek;
  }
}

function reklamAcikAyarla(v: boolean) {
  reklamAcik = v;
  bildir();
}

function yenidenTemizle(tur: Tur) {
  const r = yeniden[tur];
  if (r.zaman != null) clearTimeout(r.zaman);
  r.zaman = null;
}

/** Yükleme sonucu: başarıda sayaç sıfırlanır, hatada 15 → 30 → … → 300 sn sonra yeniden denenir. */
function yuklemeSonucu(tur: Tur, hazir: boolean, yukle: () => Promise<void>) {
  const r = yeniden[tur];
  if (hazir) { r.deneme = 0; return; }
  const { ilkSn, tavanSn } = adsConfig.yeniden;
  const sn = Math.min(ilkSn * 2 ** r.deneme, tavanSn);
  r.deneme++;
  yenidenTemizle(tur);
  r.zaman = setTimeout(() => { r.zaman = null; void yukle(); }, sn * 1000);
}

async function gecisliYukle(): Promise<void> {
  if (!arkaUc || gecisliHazir) return;
  yenidenTemizle('gecisli');
  const uc = arkaUc;
  const hazir = await dene(uc.gecisliHazirla, false);
  if (arkaUc !== uc) return; // bu arada yeniden başlatıldı
  gecisliHazir = hazir;
  yuklemeSonucu('gecisli', hazir, gecisliYukle);
}

async function odulluYukle(): Promise<void> {
  if (!arkaUc || odulluHazir) return;
  yenidenTemizle('odullu');
  const uc = arkaUc;
  const hazir = await dene(uc.odulluHazirla, false);
  if (arkaUc !== uc) return;
  odulluHazir = hazir;
  yuklemeSonucu('odullu', hazir, odulluYukle);
  bildir();
}

/** `kur` tek uçuşta: açılış ve ön plana dönüş aynı anda gelirse ikinci rıza formu açılmaz. */
function kurDene(secilen: ReklamArkaUcu): Promise<boolean> {
  if (kurUcusu) return kurUcusu;
  let ucus: Promise<boolean> | null = null;
  ucus = (async () => {
    const kuruldu = await dene(async () => { await secilen.kur(); return true; }, false);
    if (kurUcusu !== ucus) return false; // bu arada reklamBaslat yeniden çağrıldı
    if (!kuruldu) {
      bekleyen = secilen;
      return false;
    }
    bekleyen = null;
    arkaUc = secilen;
    await Promise.all([gecisliYukle(), odulluYukle()]);
    return true;
  })().finally(() => { if (kurUcusu === ucus) kurUcusu = null; });
  kurUcusu = ucus;
  return kurUcusu;
}

/** Uygulama açılışında bir kez. `ozel` verilirse o arka uç kullanılır (test). */
export async function reklamBaslat(ozel?: ReklamArkaUcu): Promise<void> {
  arkaUc = bekleyen = null;
  kurUcusu = null;
  oturumBasi = Date.now();
  sonGecisli = null;
  panelOdul = false;
  reklamAcik = false;
  gecisliHazir = odulluHazir = false;
  sayac.gecisli = sayac.odullu = 0;
  for (const t of ['gecisli', 'odullu'] as const) { yenidenTemizle(t); yeniden[t].deneme = 0; }
  const platform = magazaPlatformu();
  const secilen = ozel ?? (platform ? await dene(() => admobArkaUcu(platform), null) : sahteArkaUc());
  if (!secilen) return;
  await kurDene(secilen);
}

/**
 * Ön plana dönüş (App.tsx): açılışta kurulum düştüyse (ağ yok · rıza bilgisi gelmedi) yeniden dener.
 * Kuruluysa ya da denenecek bir şey yoksa hiçbir şey yapmaz. Kurulu mu → true.
 */
export async function reklamYenidenKur(): Promise<boolean> {
  if (arkaUc) return true;
  if (!bekleyen) return false;
  return kurDene(bekleyen);
}

/** Store çağırır (açılış · satın alma · geri yükleme). Reklam başlatılmadan önce de gelebilir. */
export function reklamsizAyarla(b: boolean): void {
  reklamsiz = b;
}

/** Oyun sıfırlandı: yeni oyun açılış sayılır, soğuma baştan kurulur. */
export function sogumaSifirla(): void {
  oturumBasi = Date.now();
  sonGecisli = null;
}

/**
 * Ekranda reklam var mı. App.tsx: o sürede WebView gizlenir ama bu çevrimdışı dönüş SAYILMAZ, müzik
 * susar. Gösterim bekçisi (`adsConfig.gosterim`) sayesinde en geç `ustSinirSn`de false'a döner.
 */
export const reklamEkranda = () => reklamAcik;

/** Panel içinde ödül alındı (günlük görev · hedef) — bu panelin kapanışı reklam patlatmaz. */
export function odulAlindi(): void {
  panelOdul = true;
}

/** Panel kapandı: kural uygunsa geçişli reklam gösterilir. Gösterildiyse true. */
export async function panelKapandi(): Promise<boolean> {
  const uygun = gecisliUygun({
    simdi: Date.now(),
    oturumBasi,
    sonGecisli,
    panelOdul,
    reklamAcik,
    sogumaSn: adsConfig.gecisli.sogumaSn,
    reklamsiz,
  });
  panelOdul = false; // bayrak YALNIZ burada iner: bir ödül, ardından gelen ilk kapanışı reklamsız yapar
  if (!uygun || !arkaUc || !gecisliHazir) return false;
  const uc = arkaUc;
  reklamAcikAyarla(true);
  gecisliHazir = false;
  let gosterildi: boolean;
  try {
    gosterildi = await dene(uc.gecisliGoster, false);
  } finally {
    reklamAcikAyarla(false);
  }
  if (gosterildi) {
    sonGecisli = Date.now();
    sayac.gecisli++;
  }
  void gecisliYukle();
  return gosterildi;
}

export const odulluReklamHazir = () => odulluHazir && !reklamAcik;

/** React aboneliği (`useSyncExternalStore`) — ödüllü düğme hazır olunca etkinleşir. */
export function reklamAbone(f: () => void): () => void {
  dinleyiciler.add(f);
  return () => dinleyiciler.delete(f);
}

/**
 * Ödüllü video, ayrıntılı sonuçla (Sprint A sözleşmesi): `odul` · `yarida` (oyuncu erken kapattı) ·
 * `gosterilemedi` (reklam yok / yüklenemedi / açılmadı → "Reklam yüklenemedi. Tekrar dene.").
 */
export async function odulluIzleSonuc(): Promise<OdulluSonuc> {
  if (!arkaUc || !odulluReklamHazir()) return 'gosterilemedi';
  const uc = arkaUc;
  odulluHazir = false;
  reklamAcikAyarla(true);
  let sonuc: OdulluSonuc;
  try {
    sonuc = await dene(uc.odulluGoster, 'gosterilemedi');
  } finally {
    reklamAcikAyarla(false);
  }
  if (sonuc === 'odul') sayac.odullu++;
  // Tarama-6 #4: ödüllü video da tam ekran reklamdır — izlendiyse (ödül ya da yarıda) ardından gelen ilk
  // panel kapanışı reklamsız ve 3 dk soğuma yeniden başlar ("ödül ekranından sonra reklam yok").
  if (sonuc !== 'gosterilemedi') {
    panelOdul = true;
    sonGecisli = Date.now();
  }
  void odulluYukle();
  return sonuc;
}

/** Geriye uyumlu (HUD): ödül hak edildiyse true. Yeni çağrı yerleri `odulluIzleSonuc` kullanır. */
export async function odulluIzle(): Promise<boolean> {
  return (await odulluIzleSonuc()) === 'odul';
}

/** Ayarlar'daki "Reklam tercihleri" satırı yalnız UMP isterse (AB/UK) görünür. */
export const reklamTercihleriGerekli = () => arkaUc?.tercihler?.gerekli() ?? false;

export async function reklamTercihleriniAc(): Promise<void> {
  const t = arkaUc?.tercihler;
  if (t) await dene(t.ac, undefined);
}

/** Dev/duman: sayaçlar + soğumanın kalan süresi. */
export function reklamDurumu() {
  const referans = Math.max(oturumBasi, sonGecisli ?? -Infinity);
  return {
    kuruldu: arkaUc != null,
    gecisli: sayac.gecisli,
    odullu: sayac.odullu,
    sogumaKalanSn: Math.max(0, adsConfig.gecisli.sogumaSn - (Date.now() - referans) / 1000),
    odulluHazir: odulluReklamHazir(),
    reklamsiz,
  };
}

/** Dev/duman: saati ileri al (soğumayı beklemeden kuralı sınamak için). */
export function reklamSaatiKaydir(ms: number): void {
  oturumBasi -= ms;
  if (sonGecisli != null) sonGecisli -= ms;
}
