/**
 * kat2Dongu.ts — KAT 2'NİN OYUN DÖNGÜSÜ (K2-3): okey + tavla masası + Türk kahvesi + cezve ocağı.
 *
 * Kat 1'den farkı (kat2-plan §2): müşteri tek tek değil DÖRTLÜ GRUP gelir, masada uzun oturur
 * (okey), oturduğu sürece ara ara KAHVE ister, kalkarken masa ücretini + içtiği kahvelerin
 * parasını TEK YIĞIN olarak masanın önüne bırakır → "seyrek + büyük para".
 *
 * K2-3c: masalar `kat.KAT2_MASALAR`dan (22: 4 + 6 okey · 12 tavla), durum İD ile. Tavla aynı döngüyü
 * İKİ kişiyle ve kendi sayılarıyla (`Kat2Ayar.tavla`) döner; okey davranışı birebir korunur
 * (bekçi: `docs/olcum-kat2-dongu-final.txt` ile aynı çıktı).
 *
 * SAF MODÜL: durum girer, yeni durum + kazanç/harcama çıkar. Store ve ölçüm aracı (`tools/
 * olcum-kat2-dongu.ts`) aynı fonksiyonu sürer. Denge sayıları `Kat2Ayar` ile DIŞARIDAN gelir —
 * ölçüm aracı kolları config'e yazmadan koşar (D-084 varyant kapısı).
 *
 * Kumar YOK: masada para/jeton görünmez; ücret "masa ücreti"dir (kat2-plan §2).
 */
import {
  KAT2_GARSON_PAD,
  KAT2_GARSON_YER,
  KAT2_KISI,
  KAT2_LAVABO_PAD,
  KAT2_LAVABO_YER,
  KAT2_MASALAR,
  KAT2_SALON_PAD,
  KAT2_SALON_PAD_YER,
  KAT2_SV_MAX,
  OCAKLAR,
  OKEY_YARI,
  TAVLA_YARI,
  kat2Adim,
  kat2YolAgi,
  masaErisimde,
  paraDusmeYeri,
  type Kat2MasaYeri,
  type MasaTuru,
} from './kat';
import { LAYOUT } from './layout';
import { inFrame, masaCercevesi, masaEtiketi, padCercevesi } from './markerFrame';
import { t } from '../i18n';

/** Denge sayıları (K2-3: varyant; seçilen kol `economy.config.kat2`ye yazılır). */
export interface Kat2Ayar {
  /** Boş (açık) okey masasına yeni grubun gelme aralığı (sn). */
  gelisAralik: number;
  /** Grubun merdivenden masaya yürüyüp oturması (sn). */
  yurume: number;
  /** Okey oyunu (oturum) süresi (sn). */
  oturum: number;
  /** Oturan grubun kahve isteme aralığı (sn; istek karşılanınca / düşünce yeniden sayar). */
  kahveAralik: number;
  /** Bir istekte kaç fincan. */
  istekAdet: number;
  /** İstek bu kadar sn içinde gelmezse sessizce düşer (ceza yok, para yok). */
  kahveSabir: number;
  /** Bir fincan Türk kahvesinin fiyatı (₺) — kalkışta yığına eklenir. */
  kahveFiyat: number;
  /** Okey masa ücreti (₺) — oyun bitince yığına eklenir. */
  masaUcreti: number;
  /** Cezve: bir fincanın pişme süresi (sn). */
  demleme: number;
  /** Ocakta bekleyebilen hazır fincan. */
  ocakKuyruk: number;
  /** Kat 2 pad'leri AÇILIŞ SIRASIYLA (önceki açılmadan sonraki görünmez). */
  padler: readonly { id: string; cost: number; fillRate: number }[];
  /**
   * K2-3c: TAVLA masasının kendi sayıları (2 kişi). Geliş/yürüme/kahve sabrı okeyle ortak.
   * YOKSA tavla masası pad'i açılsa bile masaya grup GELMEZ (ölçülmemiş sayıyla para üretmez —
   * okey sayılarına düşmek 4 kişinin ücretini 2 kişiye yazmak olurdu). `kat2ZincirHatasi` bunu yakalar.
   */
  tavla?: Kat2TavlaAyar;
  /**
   * S2: Kat 2 GARSONUNUN sayıları (D-186; ölçüm `tools/olcum-kat2-garson.ts`). Tavla deseni: YOKSA
   * `k2garson` pad'i açılsa bile garson gelmez; `kat2ZincirHatasi` uyarır (`kat2EksikSayi`).
   */
  garson?: Kat2GarsonAyar;
  /**
   * D-192: Kat 2 LAVABOSU (`k2lavabo` açıksa). Kalkan grubun her kişisi `ugrama` olasılığıyla uğrar ve
   * lavabonun önündeki yığına `ucret` bırakır. Rastgele değil: uğrayan kişi payı `Kat2Dunya.lavaboSayac`ta
   * birikir, tam bir kişi olunca ücret düşer (beklenen değer birebir, ölçüm `tools/olcum-kat2-akis.ts`).
   * YOKSA lavabo süs: pad açılır, para getirmez.
   */
  lavabo?: { ugrama: number; ucret: number };
  /**
   * S3: MASA SEVİYESİ (Sv1-5) kolları, masa türüne göre. Garson deseni: YOKSA Sv tetiği çizilmez,
   * `Kat2Girdi.masaSv` okunmaz, oyun bugünküyle BİREBİR (bütün çarpanlar 1). Ölçüm `tools/olcum-kat2-masasv.ts`.
   */
  masaSv?: { okey: Kat2SvKol; tavla: Kat2SvKol };
}

/**
 * Bir masa türünün Sv kolu. Diziler Sv sırasıyla (indeks 0 = Sv1, uzunluk `KAT2_SV_MAX`); çarpanların
 * indeks 0'ı 1,0 (Sv1 = bugünkü masa). `fiyat[i]` = Sv(i+1)'e ÇIKIŞIN fiyatı → `fiyat[0]` kullanılmaz (0).
 */
export interface Kat2SvKol {
  fiyat: number[];
  /** Masa ücreti × (₺/müşteri). */
  ucretCarpan: number[];
  /** Kahve isteme aralığı × (< 1 = daha sık kahve → daha çok servis). */
  kahveAralikCarpan: number[];
  /** Boş masaya grubun gelme aralığı × (< 1 = masa daha az boş kalır). */
  gelisAralikCarpan: number[];
  /** Opsiyonel (ölçüm kolu): kahve fiyatı × (yoksa 1). */
  kahveFiyatCarpan?: number[];
  /** Opsiyonel (ölçüm kolu): oyun süresi × (< 1 = grup daha çabuk kalkar; yoksa 1). */
  oturumCarpan?: number[];
  /** Sv tetiğinin TAM dolum süresi (sn; yoksa `SV_DOLUM_SN`). */
  dolumSn?: number;
}

/** Sv dolumu, pad'lerin dolum kuralıyla aynı: tam fiyat ~3,5 sn'de akar (D-192 `fillRate = cost / 3,5`). */
export const SV_DOLUM_SN = 3.5;

/**
 * Kat 2 garsonu: YALNIZ kahve taşır, YALNIZ tavla masalarına (oyuncu okeyde taşır — aktif oynanış;
 * yığınları her zaman oyuncu toplar, oto-toplayıcı yok).
 */
export interface Kat2GarsonAyar {
  /** Yürüme hızı (br/sn). */
  hiz: number;
  /** Tepsisi (fincan). */
  tepsi: number;
  /** Kaç garson (yoksa 1). */
  sayi?: number;
}

/** Tavla masasının döngü sayıları (anlamları `Kat2Ayar`ın aynı adlı alanlarıyla aynı). */
export interface Kat2TavlaAyar {
  oturum: number;
  kahveAralik: number;
  istekAdet: number;
  kahveFiyat: number;
  masaUcreti: number;
}

export type MasaDurum = 'kapali' | 'bos' | 'geliyor' | 'oyunda';

/** Bir Kat 2 masası (adı tarihsel: okey de tavla da). Alanlar `id, durum, istek, birikim` sahne sözleşmesi. */
export interface OkeyMasa {
  id: string;
  /** Masa türü (`KAT2_MASALAR`dan). */
  tur: MasaTuru;
  durum: MasaDurum;
  /** Durumun kalan süresi (bos: grubun gelişine · geliyor: oturmaya · oyunda: oyunun sonuna). */
  t: number;
  /** Sonraki kahve isteğine kalan (sn). */
  kahveT: number;
  /** Açık istek: bekleyen fincan (0 = istek yok) ve kalan sabır. */
  istek: number;
  sabir: number;
  /** Bu oturumda servis edilen kahvenin parası (kalkışta yığına eklenir). */
  birikim: number;
}

export interface ParaYigini {
  id: number;
  x: number;
  z: number;
  miktar: number;
}

/** Bir cezve ocağının anlık hâli (sıra `kat.OCAKLAR`; kapalı ocak hazir 0). */
export interface Kat2OcakDurum {
  id: string;
  /** Ocakta bekleyen hazır fincan. */
  hazir: number;
  /** Pişmekte olan fincanın geçen süresi (sn; 0 = pişmiyor). */
  demT: number;
}

/** Kat 2 garsonunun anlık hâli. `hedef`: gittiği masa ya da ocak kimliği; null = evine dönüyor/boşta. */
export interface Kat2Garson {
  x: number;
  z: number;
  tepsi: number;
  hedef: string | null;
}

/** Kat 2'nin anlık dünyası. Kalıcı olan yalnız `padsDone` (kayıtta `kat2.padsDone`); gerisi transient. */
export interface Kat2Dunya {
  masalar: OkeyMasa[];
  ocaklar: Kat2OcakDurum[];
  /** Kat 2 garsonu (pad'i yoksa ya da `Kat2Ayar.garson` yoksa null). */
  garson: Kat2Garson | null;
  /** `garson.sayi` > 1 ise ikinci ve sonraki garsonlar (S2'de yalnız ölçüm kolu; yoksa boş). */
  garsonEk?: Kat2Garson[];
  /** Oyuncunun tepsisindeki kahve. */
  tepsi: number;
  paralar: ParaYigini[];
  padFill: Record<string, number>;
  nextId: number;
  /** D-192: lavaboya uğrayan kişi payının birikimi (0..1; tam kişi olunca yığına ücret düşer). */
  lavaboSayac?: number;
}

export interface Kat2Girdi {
  /** Oyuncu (x, z) — Kat 2 koordinatı. */
  x: number;
  z: number;
  /** Oyuncu durdu mu (pad dolumu yalnız dururken — Kat 1'in `fillReady`si). */
  durdu: boolean;
  /** Harcanabilir cüzdan (₺). */
  cuzdan: number;
  padsDone: readonly string[];
  /** Tepsi kapasitesi (Kat 1 ile aynı karakter yükseltmesi). */
  tepsiKap: number;
  /** Para mıknatısı yarıçapı (aynı karakter yükseltmesi). */
  miknatis: number;
  /** S3: masa id → Sv (1..5; yok = 1). Yalnız `Kat2Ayar.masaSv` varken etkili. */
  masaSv?: Readonly<Record<string, number>>;
}

export interface Kat2Cikti {
  dunya: Kat2Dunya;
  padsDone: string[];
  /** Toplanan para (cüzdana +). */
  kazanc: number;
  /** Pad'e akan para (cüzdandan −). */
  harcama: number;
  /** Bu adımda olanlar (ölçüm + görsel juice). */
  olay: {
    servis: number;
    kacan: number;
    kalkis: number;
    istek: number;
    padBitti: string | null;
    /** Bu adımda masaya düşen yığınların ₺'si. */
    dusen: number[];
    /** Bu adımda kalkan masaların kimlikleri (`dusen` ile aynı sırada). */
    kalkan: string[];
    /** `servis`in garsonun getirdiği kısmı. */
    garsonServis: number;
    /** Tavla masalarının payı (`servis`/`kacan` içinden). */
    tavlaServis: number;
    tavlaKacan: number;
    /** D-192: bu adımda lavabonun önündeki yığına düşen ₺ (`dusen`e girmez — masa yığını değil). */
    lavabo: number;
    /**
     * S3: Sv tetiği bu adımda dolan masalar (id). `kat2Tick` Sv'yi ARTIRMAZ — çağıran (store / ölçüm)
     * `kat2.masaSv[id]`yi bir artırır (pad tamamlanma deseni). Sv'nin parası `harcama`ya girer.
     */
    svAtlayan: string[];
  };
}

/** En az bir cezve ocağı açık mı (kahve istekleri bununla başlar). */
export const ocakAcik = (padsDone: readonly string[]): boolean => OCAKLAR.some((o) => padsDone.includes(o.id));

const MASA_YERI: ReadonlyMap<string, Kat2MasaYeri> = new Map(KAT2_MASALAR.map((m) => [m.id, m]));
export const kat2MasaYeri = (id: string): Kat2MasaYeri | undefined => MASA_YERI.get(id);

/**
 * Pad'in yeri: masa pad'i masanın yerinde (masa orada belirir), ocak pad'i ocağın önünde, salon
 * pad'i merdiven salonu tarafında geçidin önünde.
 */
export function kat2PadYeri(id: string): [number, number] {
  const o = OCAKLAR.find((x) => x.id === id);
  if (o) return [o.al[0], o.al[1]];
  if (id === KAT2_GARSON_PAD) return [KAT2_GARSON_YER[0], KAT2_GARSON_YER[1]];
  if (id === KAT2_LAVABO_PAD) return [KAT2_LAVABO_YER[0], KAT2_LAVABO_YER[1]];
  const s = KAT2_SALON_PAD_YER[id];
  if (s) return s;
  const m = MASA_YERI.get(id);
  if (!m) throw new Error(`Kat 2 pad yeri yok: ${id}`);
  return [m.x, m.z];
}

/** Pad hangi alanda duruyor (salon pad'leri merdiven salonunda, ocak/garson/masa kendi yerinde). */
function padAlani(id: string): number {
  const m = MASA_YERI.get(id);
  if (m) return m.alan;
  if (id === KAT2_GARSON_PAD) return 2;
  return 0;
}

/**
 * Zincirin YAPISI tutarlı mı? Her pad'in yeri var · tekrar yok · salon pad'leri sırayla · masa, ocak
 * ve garson pad'i salonu AÇILDIKTAN sonra gelir (yoksa pad kapalı salonda kalır, oyuncu erişemez).
 * Bu bir HATADIR: oyun bozuk demektir. Hata metni döner (geliştirici için), tutarlıysa null.
 */
export function kat2YapiHatasi(ayar: Kat2Ayar): string | null {
  const gorulen = new Set<string>();
  for (const p of ayar.padler) {
    if (gorulen.has(p.id)) return `tekrar: ${p.id}`;
    try {
      kat2PadYeri(p.id);
    } catch {
      return `yeri yok: ${p.id}`;
    }
    const si = KAT2_SALON_PAD.indexOf(p.id);
    if (si > 0 && !gorulen.has(KAT2_SALON_PAD[si - 1])) return `${p.id} ${KAT2_SALON_PAD[si - 1]}'den önce`;
    const alan = padAlani(p.id);
    if (alan > 0 && !gorulen.has(KAT2_SALON_PAD[alan - 1])) return `${p.id} salonu (${KAT2_SALON_PAD[alan - 1]}) açılmadan`;
    gorulen.add(p.id);
  }
  return null;
}

/**
 * Zincirde açılan bir şeyin SAYILARI eksik mi? Tavla masası varsa `tavla`, garson pad'i varsa `garson`
 * sayıları olmalı; yoksa pad açılır ama masaya grup / garson gelmez (ölçülmemiş sayıyla para üretmez).
 * Yapı hatasından AYRI tutulur: S2'de config bilerek "garson sayısı yok" hâlindedir (ölçüldü, karar
 * bekliyor) — config bekçisi yapıyı null, eksiği TAM bu listeyle çivi gibi tutar. Eksik yoksa null.
 */
export function kat2EksikSayi(ayar: Kat2Ayar): string | null {
  const eksik: string[] = [];
  const ilkTavla = ayar.padler.find((p) => MASA_YERI.get(p.id)?.tur === 'tavla');
  if (ilkTavla && !ayar.tavla) eksik.push(`${ilkTavla.id}: tavla sayıları (Kat2Ayar.tavla) yok`);
  if (ayar.padler.some((p) => p.id === KAT2_GARSON_PAD) && !ayar.garson) eksik.push(`${KAT2_GARSON_PAD}: garson sayıları (Kat2Ayar.garson) yok`);
  return eksik.length ? eksik.join(' · ') : null;
}

/** Zincir oynanabilir mi: önce yapı, sonra eksik sayı. Tutarlıysa null. */
export function kat2ZincirHatasi(ayar: Kat2Ayar): string | null {
  return kat2YapiHatasi(ayar) ?? kat2EksikSayi(ayar);
}

/** Masanın döngü sayıları türüne göre (tavla sayıları yoksa null → masa işlemez). */
function masaAyari(tur: MasaTuru, ayar: Kat2Ayar): Kat2TavlaAyar | null {
  return tur === 'tavla' ? (ayar.tavla ?? null) : ayar;
}

/** Sıradaki (görünen) pad — zincir tek hat: önceki bitmeden sonraki çıkmaz. */
export function kat2SiradakiPad(ayar: Kat2Ayar, padsDone: readonly string[]) {
  return ayar.padler.find((p) => !padsDone.includes(p.id)) ?? null;
}

export function yeniKat2Dunya(padsDone: readonly string[], ayar: Kat2Ayar): Kat2Dunya {
  return {
    masalar: KAT2_MASALAR.map((o) => ({
      id: o.id,
      tur: o.tur,
      durum: padsDone.includes(o.id) ? 'bos' : 'kapali',
      t: ayar.gelisAralik,
      kahveT: 0,
      istek: 0,
      sabir: 0,
      birikim: 0,
    })),
    ocaklar: OCAKLAR.map((o) => ({ id: o.id, hazir: 0, demT: 0 })),
    ...garsonAyir(garsonKur(padsDone, ayar, [])),
    tepsi: 0,
    paralar: [],
    padFill: {},
    nextId: 1,
    lavaboSayac: 0,
  };
}

/**
 * D-192: kalkan grubun `kisi` kişisinden uğrayan payı birikir; tam kişi olunca lavabonun önündeki TEK
 * yığına ücret eklenir (yığın yoksa açılır). Pad'in yeri açılınca boşalır, yığın oraya düşer.
 */
function lavaboyaUgra(d: Kat2Dunya, kisi: number, l: { ugrama: number; ucret: number }, olay: Kat2Cikti['olay']): void {
  const sayac = (d.lavaboSayac ?? 0) + kisi * l.ugrama;
  const n = Math.floor(sayac + 1e-9);
  d.lavaboSayac = sayac - n;
  if (n <= 0) return;
  const miktar = n * l.ucret;
  const [x, z] = KAT2_LAVABO_YER;
  const y = d.paralar.find((p) => p.x === x && p.z === z);
  if (y) y.miktar += miktar;
  else d.paralar.push({ id: d.nextId++, x, z, miktar });
  olay.lavabo += miktar;
}

/** Pad etiketi (çerçeve ölçüsü etikete bağlı — Kat 1'in `padCercevesi` dili). */
export function kat2PadEtiket(id: string): string {
  if (OCAKLAR.some((o) => o.id === id)) return t('Cezve Ocağı');
  if (id === KAT2_GARSON_PAD) return t('Garson');
  if (id === KAT2_LAVABO_PAD) return t('Lavabo');
  if (id === KAT2_SALON_PAD[0]) return t('Okey Salonu');
  if (id === KAT2_SALON_PAD[1]) return t('Tavla Köşesi');
  return MASA_YERI.get(id)?.tur === 'tavla' ? t('Tavla Masası') : t('Okey Masası');
}

// ---- MASA SEVİYESİ (S3) -----------------------------------------------------------------------

/** Sv tetiği ile masanın ayak izi (oturaklar dahil) arasındaki boşluk (br) — çerçeve masaya yapışmasın. */
const SV_BOSLUK = 0.2;

/** Masanın Sv'si (1..KAT2_SV_MAX; kayıtta yoksa 1). */
export const masaSvOku = (masaSv: Readonly<Record<string, number>> | undefined, id: string): number =>
  Math.min(KAT2_SV_MAX, Math.max(1, Math.floor(masaSv?.[id] ?? 1)));

/** Kolun bu Sv'deki çarpanı (kol/dizi yoksa 1 → ayar.masaSv yokken aritmetik birebir aynı). */
const svCarpan = (dizi: readonly number[] | undefined, sv: number): number => dizi?.[sv - 1] ?? 1;

/** Bir Sv tetiği: çizilen çerçeve = dolum testi (D-121). `w`/`d` TAM genişlik/derinlik (yarısı `inFrame`e). */
export interface Kat2SvTetik {
  /** `'sv:' + masaId` — dolum `Kat2Dunya.padFill[id]`de birikir. */
  id: string;
  masaId: string;
  tur: MasaTuru;
  /** Masanın ŞİMDİKİ Sv'si (etiket bunu yazar, Kat 1 `masaEtiketi` gibi). */
  sv: number;
  /** Sv+1'e çıkışın fiyatı (₺). */
  fiyat: number;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Çerçevenin etiketi (`masaEtiketi(sv - 1)`; çizen `MASA_ISARET_R` + ok ile aynı kutuyu çizer). */
  etiket: string;
}

/**
 * Sv tetikleri: açık masalar, Sv < 5, yalnız `ayar.masaSv` varsa. Çerçeve Kat 1 masa yükseltme noktasının
 * kutusu (`masaCercevesi`, ok + `MASA_ISARET_R`) ve masanın YANINDA, salonun ortasından (x = 0) UZAK yanda
 * (N7 tam ayna): ayak izinin (oturak dahil) `SV_BOSLUK` dışı, z masanın hizası. Önü yığına, arkası grubun
 * koridoruna ayrılmış; sıralar arası (tavla 1,2 br) çerçeveye yetmez. Çakışmazlık bekçisi `tests/kat2-masasv`.
 */
export function kat2SvTetikleri(ayar: Kat2Ayar, padsDone: readonly string[], masaSv: Readonly<Record<string, number>>): Kat2SvTetik[] {
  const kollar = ayar.masaSv;
  if (!kollar) return [];
  const out: Kat2SvTetik[] = [];
  for (const m of KAT2_MASALAR) {
    if (!padsDone.includes(m.id)) continue;
    const sv = masaSvOku(masaSv, m.id);
    if (sv >= KAT2_SV_MAX) continue;
    const c = masaCercevesi(sv - 1);
    const yari = m.tur === 'tavla' ? TAVLA_YARI[0] : OKEY_YARI;
    const s = m.x < 0 ? -1 : 1;
    out.push({
      id: 'sv:' + m.id,
      masaId: m.id,
      tur: m.tur,
      sv,
      fiyat: kollar[m.tur].fiyat[sv] ?? 0,
      x: m.x + s * (yari + SV_BOSLUK + c.hw),
      z: m.z,
      w: 2 * c.hw,
      d: 2 * c.hh,
      etiket: masaEtiketi(sv - 1),
    });
  }
  return out;
}

// ---- KAT 2 GARSONU (S2) -------------------------------------------------------------------------

/** i. garsonun evi (pad'in yeri; ikinci garson bir adım SOLUNDA — sağı iç tavla sütunu). */
const garsonEvi = (i: number): [number, number] => [KAT2_GARSON_YER[0] - i * 1.0, KAT2_GARSON_YER[1]];

/** Garsonlar: pad'i açık + sayıları var → `sayi` kadar (mevcutlar korunur, yeniler evinde doğar). */
function garsonKur(padsDone: readonly string[], ayar: Kat2Ayar, mevcut: readonly Kat2Garson[]): Kat2Garson[] {
  if (!ayar.garson || !padsDone.includes(KAT2_GARSON_PAD)) return [];
  const n = Math.max(1, Math.floor(ayar.garson.sayi ?? 1));
  return Array.from({ length: n }, (_, i) => mevcut[i] ?? { x: garsonEvi(i)[0], z: garsonEvi(i)[1], tepsi: 0, hedef: null });
}

const garsonAyir = (gs: Kat2Garson[]): Pick<Kat2Dunya, 'garson' | 'garsonEk'> => ({ garson: gs[0] ?? null, garsonEk: gs.slice(1) });

/**
 * Garsonun tavla masasına yaklaşma noktası: masanın +z önü (yığının düştüğü yüz), ayak izinin
 * şişkinliğinin (yarı + gövde yarıçapı) hemen dışı, kahve erişiminin içi.
 */
const garsonMasaNoktasi = (m: Kat2MasaYeri): [number, number] => [m.x, m.z + TAVLA_YARI[1] + LAYOUT.playerRadius + 0.13];

/**
 * Garsonların bir adımı: karar → yürüyüş → ocaktan alma. Servis masa döngüsünde (oyuncunun
 * servisinden SONRA) yapılır. Kural (deterministik):
 *  - Tepside kahve varsa: sabrı en az kalan açık tavla isteğine (önceki garsonun hedefi atlanır).
 *    İstek yoksa kahveyle evine döner, sonraki isteğe oradan gider.
 *  - Tepsi boşsa ve karşılanmamış tavla isteği varsa (açık istekler − öteki garsonların tepsisi):
 *    YOL UZUNLUĞUNCA en yakın açık ocağa gider, önünde bekler; ihtiyaç kadar alır (tepsiyi
 *    gereksiz doldurup oyuncunun kahvesini tüketmez).
 *  - Ocak paylaşımı: oyuncu aynı adımda ÖNCE alır (`kat2Tick` sırası), sonra garsonlar dizi sırasıyla.
 */
function garsonlarAdim(d: Kat2Dunya, gs: Kat2Garson[], padsDone: readonly string[], acikOcak: readonly boolean[], ga: Kat2GarsonAyar, dt: number): void {
  const ag = kat2YolAgi(padsDone);
  const istekli = d.masalar
    .filter((m) => m.tur === 'tavla' && m.durum === 'oyunda' && m.istek > 0)
    .sort((a, b) => a.sabir - b.sabir);
  const toplamIstek = istekli.reduce((a, m) => a + m.istek, 0);
  const alinan = new Set<string>();
  gs.forEach((g, i) => {
    let hedef: string | null = null;
    let nokta: [number, number] = garsonEvi(i);
    let ihtiyac = 0;
    if (g.tepsi > 0) {
      const m = istekli.find((x) => !alinan.has(x.id)) ?? istekli[0];
      if (m) {
        hedef = m.id;
        alinan.add(m.id);
        nokta = garsonMasaNoktasi(MASA_YERI.get(m.id)!);
      }
    } else {
      ihtiyac = toplamIstek - gs.reduce((a, o) => (o === g ? a : a + o.tepsi), 0);
      if (ihtiyac > 0) {
        let en = -1;
        let enL = Infinity;
        OCAKLAR.forEach((o, k) => {
          if (!acikOcak[k]) return;
          const L = ag.uzunluk(g.x, g.z, o.al[0], o.al[1]);
          if (L < enL) {
            enL = L;
            en = k;
          }
        });
        if (en >= 0) {
          hedef = OCAKLAR[en].id;
          nokta = [OCAKLAR[en].al[0], OCAKLAR[en].al[1]];
        }
      }
    }
    g.hedef = hedef;
    // Yürüyüş: yol ağının gösterdiği noktaya, adımı `kat2Adim` atar (bölme + masa + ocak katı).
    const kalan = Math.hypot(nokta[0] - g.x, nokta[1] - g.z);
    if (kalan > 0.1) {
      const [wx, wz] = ag.nokta(g.x, g.z, nokta[0], nokta[1]);
      const L = Math.hypot(wx - g.x, wz - g.z);
      if (L > 1e-6) {
        const s = Math.min(ga.hiz * dt, L) / L;
        [g.x, g.z] = kat2Adim(g.x, g.z, (wx - g.x) * s, (wz - g.z) * s, ag.acikAlan, ag.engeller);
      }
    }
    // Ocaktan al (yalnız ocağa giderken; ihtiyaç kadar).
    const k = OCAKLAR.findIndex((o) => o.id === hedef);
    if (k >= 0) {
      const o = OCAKLAR[k];
      const od = d.ocaklar[k];
      if (od.hazir > 0 && Math.hypot(g.x - o.al[0], g.z - o.al[1]) <= o.erisim) {
        const al = Math.min(od.hazir, ga.tepsi - g.tepsi, ihtiyac);
        if (al > 0) {
          od.hazir -= al;
          g.tepsi += al;
        }
      }
    }
  });
}

/** Bir adım. `d` değiştirilmez; yeni dünya döner. */
export function kat2Tick(d0: Kat2Dunya, g: Kat2Girdi, dt: number, ayar: Kat2Ayar): Kat2Cikti {
  const d: Kat2Dunya = {
    ...d0,
    masalar: d0.masalar.map((m) => ({ ...m })),
    ocaklar: d0.ocaklar.map((o) => ({ ...o })),
    paralar: d0.paralar.slice(),
    padFill: { ...d0.padFill },
  };
  let garsonlar = [d0.garson, ...(d0.garsonEk ?? [])].filter((x): x is Kat2Garson => x !== null).map((x) => ({ ...x }));
  let padsDone = g.padsDone as string[];
  const olay: Kat2Cikti['olay'] = {
    servis: 0,
    kacan: 0,
    kalkis: 0,
    istek: 0,
    padBitti: null,
    dusen: [],
    kalkan: [],
    garsonServis: 0,
    tavlaServis: 0,
    tavlaKacan: 0,
    lavabo: 0,
    svAtlayan: [],
  };
  let kazanc = 0;
  let harcama = 0;
  // Adımın başındaki açık ocaklar (bu adımda biten ocak pad'i bir sonraki adımda pişirmeye başlar).
  const acikOcak = OCAKLAR.map((o) => padsDone.includes(o.id));
  const ocak = acikOcak.some(Boolean);

  // ---- PAD: sıradaki pad'in çerçevesinde durunca cüzdandan dolar (Kat 1 `padFillSystem` deseni).
  const pad = kat2SiradakiPad(ayar, padsDone);
  if (pad) {
    const [px, pz] = kat2PadYeri(pad.id);
    if (inFrame(g.x, g.z, [px, 0, pz], padCercevesi(kat2PadEtiket(pad.id)))) {
      let fill = d.padFill[pad.id] ?? 0;
      if (g.durdu) {
        const amt = Math.min(pad.fillRate * dt, g.cuzdan, pad.cost - fill);
        if (amt > 0) {
          fill += amt;
          harcama += amt;
        }
      }
      if (fill >= pad.cost - 1e-9) {
        padsDone = [...padsDone, pad.id];
        delete d.padFill[pad.id];
        olay.padBitti = pad.id;
        const m = d.masalar.find((x) => x.id === pad.id);
        if (m) {
          m.durum = 'bos';
          m.t = ayar.gelisAralik;
        }
      } else {
        d.padFill[pad.id] = fill;
      }
    }
  }
  garsonlar = garsonKur(padsDone, ayar, garsonlar);

  // ---- MASA Sv (S3): oyuncunun durduğu Sv çerçevesi cüzdandan dolar (pad deseni); dolunca masa olaya
  // yazılır, Sv'yi çağıran artırır. Çerçeveler birbirine değmez → en fazla biri.
  if (ayar.masaSv) {
    for (const tt of kat2SvTetikleri(ayar, padsDone, g.masaSv ?? {})) {
      if (!inFrame(g.x, g.z, [tt.x, 0, tt.z], { hw: tt.w / 2, hh: tt.d / 2 })) continue;
      let fill = d.padFill[tt.id] ?? 0;
      if (g.durdu) {
        const hiz = tt.fiyat / (ayar.masaSv[tt.tur].dolumSn ?? SV_DOLUM_SN);
        const amt = Math.min(hiz * dt, g.cuzdan - harcama, tt.fiyat - fill);
        if (amt > 0) {
          fill += amt;
          harcama += amt;
        }
      }
      if (fill >= tt.fiyat - 1e-9) {
        delete d.padFill[tt.id];
        olay.svAtlayan.push(tt.masaId);
      } else {
        d.padFill[tt.id] = fill;
      }
      break;
    }
  }

  // ---- CEZVE: her açık ocak kendi hazır fincan kuyruğu dolana dek pişirir.
  d.ocaklar.forEach((o, k) => {
    if (acikOcak[k] && o.hazir < ayar.ocakKuyruk) {
      o.demT += dt;
      while (o.demT >= ayar.demleme && o.hazir < ayar.ocakKuyruk) {
        o.demT -= ayar.demleme;
        o.hazir += 1;
      }
    } else {
      o.demT = 0;
    }
  });
  // Oyuncu ocaktan alır: önündeki noktada tepsi boşluğu kadar (garsonlardan ÖNCE).
  d.ocaklar.forEach((o, k) => {
    const yer = OCAKLAR[k];
    if (acikOcak[k] && o.hazir > 0 && Math.hypot(g.x - yer.al[0], g.z - yer.al[1]) <= yer.erisim) {
      const al = Math.min(o.hazir, g.tepsiKap - d.tepsi);
      if (al > 0) {
        o.hazir -= al;
        d.tepsi += al;
      }
    }
  });
  if (garsonlar.length && ayar.garson) garsonlarAdim(d, garsonlar, padsDone, acikOcak, ayar.garson, dt);

  // ---- MASALAR
  for (const m of d.masalar) {
    if (m.durum === 'kapali') continue;
    const yer = MASA_YERI.get(m.id);
    const a = masaAyari(m.tur, ayar);
    if (!yer || !a) continue; // tavla sayıları yok: masa açık ama grup gelmez
    const tavla = m.tur === 'tavla';
    // S3: Sv çarpanları (`ayar.masaSv` yoksa hepsi 1 → bugünküyle birebir).
    const sv = masaSvOku(g.masaSv, m.id);
    const kol = ayar.masaSv?.[m.tur];
    const kahveAralik = a.kahveAralik * svCarpan(kol?.kahveAralikCarpan, sv);
    const kahveFiyat = a.kahveFiyat * svCarpan(kol?.kahveFiyatCarpan, sv);
    m.t -= dt;
    if (m.durum === 'bos') {
      if (m.t <= 0) {
        m.durum = 'geliyor';
        m.t += ayar.yurume; // taşan kesir korunur (dt'den bağımsız süre)
      }
      continue;
    }
    if (m.durum === 'geliyor') {
      if (m.t <= 0) {
        m.durum = 'oyunda';
        m.t += a.oturum * svCarpan(kol?.oturumCarpan, sv);
        m.kahveT = kahveAralik;
        m.istek = 0;
        m.birikim = 0;
      }
      continue;
    }
    // oyunda
    if (ocak) {
      if (m.istek > 0) {
        // Servis: tepside kahve + masanın erişiminde. Önce oyuncu, sonra (yalnız tavlada) garsonlar.
        if (d.tepsi > 0 && masaErisimde(yer, g.x, g.z)) {
          const n = Math.min(d.tepsi, m.istek);
          d.tepsi -= n;
          m.istek -= n;
          m.birikim += n * kahveFiyat;
          olay.servis += n;
          if (tavla) olay.tavlaServis += n;
          if (m.istek === 0) m.kahveT = kahveAralik;
        }
        if (tavla) {
          for (const gs of garsonlar) {
            if (m.istek === 0) break;
            if (gs.tepsi <= 0 || !masaErisimde(yer, gs.x, gs.z)) continue;
            const n = Math.min(gs.tepsi, m.istek);
            gs.tepsi -= n;
            m.istek -= n;
            m.birikim += n * kahveFiyat;
            olay.servis += n;
            olay.garsonServis += n;
            olay.tavlaServis += n;
            if (m.istek === 0) m.kahveT = kahveAralik;
          }
        }
        if (m.istek > 0) {
          m.sabir -= dt;
          if (m.sabir <= 0) {
            olay.kacan += m.istek;
            if (tavla) olay.tavlaKacan += m.istek;
            m.istek = 0;
            m.kahveT = kahveAralik;
          }
        }
      } else {
        m.kahveT -= dt;
        // Oyunun son anlarında istenmez: getirilecek vakit yok.
        if (m.kahveT <= 0 && m.t > ayar.kahveSabir * 0.5) {
          m.istek = a.istekAdet;
          m.sabir = ayar.kahveSabir;
          olay.istek += a.istekAdet;
        }
      }
    }
    if (m.t <= 0) {
      // Oyun bitti: ücret + kahve parası tek yığın, masa boşalır, yeni grup gelir.
      olay.kacan += m.istek;
      if (tavla) olay.tavlaKacan += m.istek;
      const miktar = a.masaUcreti * svCarpan(kol?.ucretCarpan, sv) + m.birikim;
      const [px, pz] = paraDusmeYeri(yer);
      d.paralar.push({ id: d.nextId++, x: px, z: pz, miktar });
      olay.dusen.push(miktar);
      olay.kalkan.push(m.id);
      olay.kalkis += 1;
      if (ayar.lavabo && padsDone.includes(KAT2_LAVABO_PAD)) lavaboyaUgra(d, KAT2_KISI[m.tur], ayar.lavabo, olay);
      m.durum = 'bos';
      m.t += ayar.gelisAralik * svCarpan(kol?.gelisAralikCarpan, sv);
      m.istek = 0;
      m.birikim = 0;
    }
  }

  // ---- PARA: mıknatıs yarıçapına giren yığın toplanır (yalnız oyuncu — garson para toplamaz).
  if (d.paralar.length) {
    d.paralar = d.paralar.filter((p) => {
      if (Math.hypot(g.x - p.x, g.z - p.z) <= g.miknatis) {
        kazanc += p.miktar;
        return false;
      }
      return true;
    });
  }

  Object.assign(d, garsonAyir(garsonlar));
  return { dunya: d, padsDone, kazanc, harcama, olay };
}
