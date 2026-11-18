/**
 * bulut.ts — BULUT KAYDI + PLAY GAMES (F4b · D-153 · Sprint A). Oyun bulutu yalnız bu modülden görür.
 *
 * Kayıt kanalı platformdan bağımsız `BulutArkaUcu`dur (dosya sonu):
 * - ANDROID (`playGamesVar`): Play Games Saved Games — kendi native eklentimiz (`PlayGamesPlugin.java`).
 *   Giriş + başarımlar da yalnız burada. APP_ID girilmemişse eklenti "kullanılamaz" der, katman KAPALI.
 * - iOS: iCloud Key-Value Storage — yerel eklenti `eklentiler/bulut-kayit/` (`BulutKayit`). Giriş
 *   ekranı yok: cihaz iCloud'a bağlıysa sessizce eşitlenir; değilse katman kapalı. Ayarlar'da Play
 *   Games bölümü iOS'ta görünmez (`playGamesDurumu` yalnız Play'i söyler).
 * - Tarayıcı: kurulmaz. Testler SAHTE arka ucu `ozel` ile verir (Play: `sahteArkaUc`, KVS: `sahteBulut`).
 *
 * ÇAKIŞMA KURALI (kullanıcı kararı 2026-09-24 + Sprint A): DAHA İLERİ kayıt kazanır. Sıra: bilinçli
 * sıfırlama sayısı (`sifirlamaNo`) > toplam kazanç > XP > son kayıt anı (`kayitIleriMi`). Buluttaki daha ileriyse açılışta yüklenir; yereldeki ileriyse buluta
 * yazılır. Daha ileri bir bulut kaydının üstüne ASLA yazılmaz — tek istisna oyuncunun bilinçli
 * sıfırlamasıdır (`bulutSifirla`). Bulut okunamadıysa hiç yazılmaz: bilinmeyen bir kaydı ezmemek için.
 *
 * Satın alımlar mağaza hesabının malıdır: bulut kaydı yüklenirken yereldeki satın alım bilgisi ve
 * ayarlar KORUNUR (birleştirilir), yoksa telefondaki reklamsızlık eski bir kayıtla düşebilirdi. Kat 2
 * de yereldeki daha ileriyse korunur (`kat2Koru`).
 */
import { registerPlugin } from '@capacitor/core';
import { levelProgress } from '../config/economy.config';
import { playGamesConfig } from '../config/playGames.config';
import { acikBasarimlar } from './basarim';
import { D } from './decimal';
import { magazaPlatformu, playGamesVar } from './platform';
import { kat2Koru, kayitKilitli, kayitMetni, kayitMetniCoz, type SaveData } from './save';
import { t } from '../i18n';

export interface PlayGamesArkaUcu {
  /** `kullanilabilir`: APP_ID girilmiş ve SDK kuruldu. `girisli`: oyuncu Play Games'e bağlı. */
  durum(): Promise<{ kullanilabilir: boolean; girisli: boolean }>;
  girisYap(): Promise<boolean>;
  /** Buluttaki kayıt metni; hiç yazılmamışsa null. Okunamazsa HATA fırlatır (null değil). */
  oku(): Promise<string | null>;
  yaz(veri: string, ilerleme: number, aciklama: string): Promise<void>;
  /** Anahtar config'teki başarımdır; Play kimliğine çeviri arka ucun işi (kimliksizse HATA). */
  basarimAc(anahtar: string): Promise<void>;
  basarimlariGoster(): Promise<void>;
}

interface PlayGamesYerli {
  durum(): Promise<{ kullanilabilir: boolean; girisli: boolean }>;
  girisYap(): Promise<{ girisli: boolean }>;
  bulutOku(o: { ad: string }): Promise<{ veri: string | null }>;
  bulutYaz(o: { ad: string; veri: string; ilerleme: number; aciklama: string }): Promise<void>;
  basarimAc(o: { kimlik: string }): Promise<void>;
  basarimlariGoster(): Promise<void>;
}

function yerliArkaUc(): PlayGamesArkaUcu {
  const P = registerPlugin<PlayGamesYerli>('PlayGames');
  const ad = playGamesConfig.kayitAdi;
  return {
    durum: () => P.durum(),
    girisYap: async () => (await P.girisYap()).girisli,
    oku: async () => (await P.bulutOku({ ad })).veri ?? null,
    yaz: (veri, ilerleme, aciklama) => P.bulutYaz({ ad, veri, ilerleme, aciklama }),
    basarimAc: async (anahtar) => {
      const kimlik = playGamesConfig.basarimlar.find((b) => b.anahtar === anahtar)?.kimlik;
      if (!kimlik) throw new Error(`Play kimliği girilmemiş: ${anahtar}`);
      await P.basarimAc({ kimlik });
    },
    basarimlariGoster: () => P.basarimlariGoster(),
  };
}

/** Tarayıcı / test: bellekte bir bulut. `acilan` ve `veri` testin gözlemi içindir. */
export interface SahtePlayGames extends PlayGamesArkaUcu {
  veri: string | null;
  acilan: string[];
  yazmaSayisi: number;
  girisli: boolean;
  okumaHatasi: boolean;
}

export function sahteArkaUc(o: { girisli?: boolean; veri?: string | null } = {}): SahtePlayGames {
  const s: SahtePlayGames = {
    veri: o.veri ?? null,
    acilan: [],
    yazmaSayisi: 0,
    girisli: o.girisli ?? true,
    okumaHatasi: false,
    durum: async () => ({ kullanilabilir: true, girisli: s.girisli }),
    girisYap: async () => (s.girisli = true),
    oku: async () => {
      if (s.okumaHatasi) throw new Error('okunamadı');
      return s.veri;
    },
    yaz: async (veri) => {
      s.veri = veri;
      s.yazmaSayisi++;
    },
    basarimAc: async (anahtar) => {
      if (!s.acilan.includes(anahtar)) s.acilan.push(anahtar);
    },
    basarimlariGoster: async () => {},
  };
  return s;
}

/** iOS iCloud KVS eklentisi (`eklentiler/bulut-kayit/ios`). */
interface BulutKayitYerli {
  varMi(): Promise<{ var: boolean }>;
  oku(o: { anahtar: string }): Promise<{ veri: string | null }>;
  yaz(o: { anahtar: string; veri: string }): Promise<void>;
}

const KVS_ANAHTARI = 'kiraathane.save';

/** iOS: iCloud Key-Value Storage. `varMi` = cihaz iCloud'a bağlı (ubiquityIdentityToken). */
export function icloudArkaUcu(): BulutArkaUcu {
  const P = registerPlugin<BulutKayitYerli>('BulutKayit');
  return {
    varMi: async () => (await P.varMi()).var,
    oku: async () => (await P.oku({ anahtar: KVS_ANAHTARI })).veri ?? null,
    yaz: (veri) => P.yaz({ anahtar: KVS_ANAHTARI, veri }),
  };
}

/** Play Games'in kayıt kanalı `BulutArkaUcu` kalıbında: ilerleme + açıklama metnin kendisinden türer. */
export function playGamesKayitUcu(pg: PlayGamesArkaUcu): BulutArkaUcu {
  return {
    varMi: async () => (await pg.durum()).girisli,
    oku: () => pg.oku(),
    yaz: (veri) => {
      const d = kayitMetniCoz(veri)?.data;
      return pg.yaz(veri, d ? ilerlemeDegeri(d) : 0, t('Seviye {1}', levelProgress(d?.xp ?? 0).level));
    },
  };
}

/** Tarayıcı / test: bellekte bir KVS. */
export interface SahteBulut extends BulutArkaUcu {
  veri: string | null;
  yazmaSayisi: number;
  bagli: boolean;
  okumaHatasi: boolean;
}

export function sahteBulut(o: { bagli?: boolean; veri?: string | null } = {}): SahteBulut {
  const s: SahteBulut = {
    veri: o.veri ?? null,
    yazmaSayisi: 0,
    bagli: o.bagli ?? true,
    okumaHatasi: false,
    varMi: async () => s.bagli,
    oku: async () => {
      if (s.okumaHatasi) throw new Error('okunamadı');
      return s.veri;
    },
    yaz: async (veri) => {
      s.veri = veri;
      s.yazmaSayisi++;
    },
  };
  return s;
}

const oyunUcuMu = (u: PlayGamesArkaUcu | BulutArkaUcu): u is PlayGamesArkaUcu => 'girisYap' in u;

/** Seçim kuralının okuduğu alanlar (eski çağıranlar yalnız kazanç + XP verir). */
export type Ilerleme = Pick<SaveData, 'lifetime' | 'xp'> & Partial<Pick<SaveData, 'sifirlamaNo' | 'lastSaved'>>;

/**
 * `a`, `b`'den DAHA İLERİ mi: bilinçli sıfırlama sayısı > toplam kazanç > XP > son kayıt anı.
 * Sıfırlama önce gelir: oyuncunun sıfırladığı oyun, başka cihazda kalan eski ilerlemeye yenilmesin.
 * Tümü eşit kayıt ileri sayılmaz.
 */
export function kayitIleriMi(a: Ilerleme, b: Ilerleme): boolean {
  const sa = a.sifirlamaNo ?? 0;
  const sb = b.sifirlamaNo ?? 0;
  if (sa !== sb) return sa > sb;
  const k = D(a.lifetime).cmp(D(b.lifetime));
  if (k !== 0) return k > 0;
  if (a.xp !== b.xp) return a.xp > b.xp;
  return (a.lastSaved ?? 0) > (b.lastSaved ?? 0);
}

/**
 * Buluttaki kaydı yerelin üstüne koyarken yerelden KORUNANLAR: ayarlar + satın alımlar. Bulutun
 * bilmediği yerel işlemlerin 💎'ı buluttaki bakiyeye EKLENİR (Y-25): yoksa girişten önce alınan
 * 💎 kaybolurdu — işlem kimliği `islenen`e birleştiği için mağaza onu bir daha da vermez.
 */
export function bulutlaBirlestir(bulut: SaveData, yerel: SaveData): SaveData {
  const a = bulut.satin;
  const b = yerel.satin;
  const yereldeKalan = b.islenen.filter((i) => !a.islenen.includes(i));
  const tasinan = yereldeKalan.reduce((t, i) => t + (b.islemElmas?.[i] ?? 0), 0);
  // Sprint A uzlaşma alanları: biri yoksa öbürü korunur (yok → "şimdi" kuralı `magazaUzlas`ın).
  // `uzlasmaBasi` ikisinde de varsa GEÇ olanı: öncesi işlenmiş sayılır → bir işlem iki kez ödenmez.
  const uzlasmaBasi = a.uzlasmaBasi === undefined ? b.uzlasmaBasi
    : b.uzlasmaBasi === undefined ? a.uzlasmaBasi : Math.max(a.uzlasmaBasi, b.uzlasmaBasi);
  const hakKimlik = b.hakKimlik ?? a.hakKimlik;
  // Kat 2 KAT BAZINDA birleşir (tarama 2026-11-18 · kayıt #1): bulutun Kat 2'si gerideyse (1.0.7 alanı
  // hiç yazmaz) yereldeki korunur.
  return kat2Koru({
    ...bulut,
    diamonds: tasinan > 0 ? D(bulut.diamonds).add(tasinan).toString() : bulut.diamonds,
    settings: { ...yerel.settings },
    satin: {
      reklamsiz: a.reklamsiz || b.reklamsiz,
      baslangic: a.baslangic || b.baslangic,
      gunlukGun: Math.max(a.gunlukGun, b.gunlukGun),
      islenen: [...new Set([...a.islenen, ...b.islenen])],
      // Eski bulut kaydında alan yok (additive) — `!!` undefined'ı false sayar.
      teklif: !!a.teklif || !!b.teklif,
      islemElmas: { ...a.islemElmas, ...b.islemElmas },
      ...(uzlasmaBasi !== undefined && { uzlasmaBasi }),
      ...((a.baslangicElmas !== undefined || b.baslangicElmas !== undefined) && { baslangicElmas: !!a.baslangicElmas || !!b.baslangicElmas }),
      ...(hakKimlik !== undefined && { hakKimlik }),
    },
  }, yerel);
}

/** Saved Games'in `progressValue`'su — Google'ın kendi çakışma çözümü de "en ileri"yi seçsin. */
const ilerlemeDegeri = (s: SaveData): number =>
  Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(D(s.lifetime).toNumber())));

export interface BulutKancasi {
  /** Şu anki oyun durumunun kayıt görüntüsü. */
  yerel: () => SaveData;
  /** Buluttan gelen (birleştirilmiş) kaydı oyuna yükle. */
  yukle: (d: SaveData) => void;
}

// ─── Oturum durumu ───────────────────────────────────────────────────────────────────────────
/** Play Games (giriş + başarım) — yalnız Android. */
let arkaUc: PlayGamesArkaUcu | null = null;
/** Kayıt kanalı: Play Games'in kayıt ucu ya da iCloud KVS. */
let kayitUcu: BulutArkaUcu | null = null;
let tur: 'playGames' | 'icloud' | null = null;
let kanca: BulutKancasi | null = null;
let girisli = false;
let okundu = false;
/** Bulutta bildiğimiz en son kayıt (okunan ya da yazılan) — daha ileriyse üstüne yazılmaz. */
let bilinen: Ilerleme | null = null;
let sonImza = '';
const gonderilen = new Set<string>();
let kuyruk: Promise<unknown> = Promise.resolve();
const dinleyiciler = new Set<() => void>();
let surum = 0;
const bildir = () => { surum++; dinleyiciler.forEach((f) => f()); };
export const bulutSurumu = () => surum;
export const bulutAbone = (f: () => void): (() => void) => {
  dinleyiciler.add(f);
  return () => dinleyiciler.delete(f);
};
export const playGamesDurumu = () => ({ kullanilabilir: arkaUc != null, girisli: arkaUc != null && girisli });
/** Hangi bulut açık ve eşitlendi mi (Ayarlar'da iCloud satırı için). */
export const bulutDurumu = () => ({ tur, esitlendi: girisli && okundu });

/** Saved Games aynı kaydı iki kez aynı anda açamaz — bulut işleri sıraya girer. */
function sirada<T>(is: () => Promise<T>): Promise<T> {
  const r = kuyruk.then(is, is);
  kuyruk = r.catch(() => {});
  return r;
}

async function dene<T>(is: () => Promise<T>, yedek: T): Promise<T> {
  try {
    return await is();
  } catch {
    return yedek;
  }
}

/**
 * Uygulama açılışında bir kez. Play Games v2 girişi açılışta kendiliğinden dener; oyuncu bağlıysa
 * bulut hemen eşitlenir. `ozel` verilirse o arka uç kullanılır (test).
 */
export async function bulutBaslat(k: BulutKancasi, ozel?: PlayGamesArkaUcu | BulutArkaUcu): Promise<void> {
  arkaUc = null;
  kayitUcu = null;
  tur = null;
  kanca = k;
  girisli = false;
  okundu = false;
  bilinen = null;
  sonImza = '';
  gonderilen.clear();
  kuyruk = Promise.resolve();
  if (ozel && !oyunUcuMu(ozel)) return kvsBaslat(ozel);
  if (!ozel && magazaPlatformu() === 'ios') return kvsBaslat(icloudArkaUcu());
  const secilen = ozel ?? (playGamesVar() ? yerliArkaUc() : null);
  if (!secilen) { bildir(); return; }
  const d = await dene(() => secilen.durum(), null);
  if (!d?.kullanilabilir) { bildir(); return; }
  arkaUc = secilen;
  kayitUcu = playGamesKayitUcu(secilen);
  tur = 'playGames';
  girisli = d.girisli;
  bildir();
  if (girisli) await esitle();
}

/** iCloud KVS (ya da sahte KVS): giriş düğmesi yok — cihaz bağlıysa açılışta eşitlenir. */
async function kvsBaslat(u: BulutArkaUcu): Promise<void> {
  if (!(await dene(() => u.varMi(), false))) { bildir(); return; }
  kayitUcu = u;
  tur = 'icloud';
  girisli = true;
  bildir();
  await esitle();
}

/** Ayarlar'daki "Bağlan" düğmesi. */
export async function girisYap(): Promise<boolean> {
  if (!arkaUc) return false;
  if (!girisli) {
    girisli = await dene(arkaUc.girisYap, false);
    bildir();
    if (girisli) await esitle();
  }
  return girisli;
}

async function esitle(): Promise<void> {
  if (!kayitUcu || !kanca) return;
  const a = kayitUcu;
  const ham = await dene<string | null | undefined>(() => sirada(() => a.oku()), undefined);
  if (ham === undefined) return; // okunamadı → yazma da yok: bilinmeyen kaydı ezme
  okundu = true;
  // Bozuk bulut kaydı (JSON · sağlama · NaN cüzdan): yereldeki onun yerine geçer.
  const bulut = ham ? kayitMetniCoz(ham) : null;
  const yerel = kanca.yerel();
  if (bulut && kayitIleriMi(bulut.data, yerel)) {
    bilinen = bulut.data;
    // Daha yeni bir sürümle yazılmış kayıt bu pakette yüklenmez (şemayı bilmiyoruz) ama üstüne de
    // yazılmaz — oyuncu uygulamayı güncelleyince gelir.
    if (!bulut.yeniSurum) kanca.yukle(bulutlaBirlestir(bulut.data, yerel));
  } else {
    await bulutKaydet({ zorla: false });
  }
  await basarimlariGonder();
  bildir();
}

/** Yerel kaydı buluta yazar. Yazdıysa true. `zorla`: sıfırlamadan sonra (daha geri kayıt da yazılır). */
export async function bulutKaydet(o: { zorla: boolean } = { zorla: false }): Promise<boolean> {
  if (!kayitUcu || !kanca || !girisli || !okundu || kayitKilitli()) return false;
  const yerel = kanca.yerel();
  if (!o.zorla && bilinen && kayitIleriMi(bilinen, yerel)) return false;
  const { lastSaved: _z, ...icerik } = yerel;
  const imza = JSON.stringify(icerik);
  if (!o.zorla && imza === sonImza) return false;
  const a = kayitUcu;
  const veri = kayitMetni(yerel);
  const ok = await dene(async () => {
    await sirada(() => a.yaz(veri));
    return true;
  }, false);
  if (ok) {
    sonImza = imza;
    bilinen = yerel;
  }
  return ok;
}

/** Oyuncu oyunu sıfırladı: bulut da sıfırlanır, yoksa bir sonraki açılışta eski ilerleme geri gelirdi. */
export const bulutSifirla = () => bulutKaydet({ zorla: true });

/** Koşulu sağlanmış ve bu oturumda gönderilmemiş başarımları açar. Açmak tekrarlanabilir bir işlemdir. */
export async function basarimlariGonder(): Promise<number> {
  if (!arkaUc || !kanca || !girisli) return 0;
  const a = arkaUc;
  let n = 0;
  for (const anahtar of acikBasarimlar(kanca.yerel())) {
    if (gonderilen.has(anahtar)) continue;
    if (await dene(async () => { await a.basarimAc(anahtar); return true; }, false)) {
      gonderilen.add(anahtar);
      n++;
    }
  }
  return n;
}

export async function basarimlariGoster(): Promise<void> {
  if (arkaUc && girisli) await dene(arkaUc.basarimlariGoster, undefined);
}

/**
 * Açık oyunda düzenli yoklama: başarımlar kısa, bulut yazımı uzun aralıkla. Temizleyiciyi döndürür.
 * Sayfa GİZLİYKEN (arka plan, kilit ekranı) zamanlayıcılar DURUR — arka planda pil/ağ harcamasın
 * (perf #5); gizlenme anındaki son yazımı App'in `visibilitychange`i zaten yapıyor.
 */
export function bulutDongusu(): () => void {
  let b: ReturnType<typeof setInterval> | null = null;
  let y: ReturnType<typeof setInterval> | null = null;
  const baslat = () => {
    if (b) return;
    b = setInterval(() => void basarimlariGonder(), playGamesConfig.basarimAraligiSn * 1000);
    y = setInterval(() => void bulutKaydet(), playGamesConfig.yazmaAraligiSn * 1000);
  };
  const durdur = () => {
    if (b) clearInterval(b);
    if (y) clearInterval(y);
    b = y = null;
  };
  const belge = typeof document === 'undefined' ? null : document;
  const gorunurluk = () => (belge?.visibilityState === 'hidden' ? durdur() : baslat());
  belge?.addEventListener('visibilitychange', gorunurluk);
  gorunurluk();
  return () => {
    durdur();
    belge?.removeEventListener('visibilitychange', gorunurluk);
  };
}

/** Sprint A ortak sözleşmesi: platformdan bağımsız bulut kaydı arka ucu (iOS iCloud KVS · Android Play Games). */
export interface BulutArkaUcu {
  varMi(): Promise<boolean>;
  /** Hiç yazılmamışsa null; okunamazsa HATA fırlatır. */
  oku(): Promise<string | null>;
  yaz(veri: string): Promise<void>;
}
