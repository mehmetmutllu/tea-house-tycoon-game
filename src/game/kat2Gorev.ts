/**
 * kat2Gorev.ts — KAT 2'NİN GÖREV HATTI (S3 · ajan D). Saf: kayıt + olay + durum girer, yeni kayıt + biten
 * görevler + ödül çıkar. Store bağlar (her `kat2Tick`ten sonra `kat2GorevIlerlet`, yüklemede `kat2GorevHizala`).
 *
 * Kat 1 hattının dili (D-088 · D-175): tek aktif görev, sıralı; sayaç hedefi görev BAŞLADIĞINDAN itibaren
 * DELTA sayılır (`sayac` görev değişince sıfırlanır); durum hedefi (pad · masa Sv) doğrudan durumdan okunur.
 * Ödül kuralı Kat 1'in M1 bandı: referans pad maliyetinin %10-20'si (Kat 2'de ~%15, 50'ye yuvarlı).
 *
 * q_tost5 dersi (D-146/D-147): görev, zincirin henüz açmadığı bir şeyi istemez. `kat2GorevHatasi` bunu
 * yapısal olarak denetler (bekçi `tests/kat2-gorev.test.ts`): pad hedefleri zincir sırasında, sayaç
 * hedefinin istediği masa/ocak/garson ÖNCEKİ görevlerle açılmış, Sv görevleri yalnız hattın SONUNDA ve
 * yalnız `Kat2Ayar.masaSv` varken (yoksa listeden düşer — kuyrukta oldukları için `idx` kaymaz).
 */
import type { QuestTarget } from '../config/economy.config';
import { KAT2_GARSON_PAD, KAT2_MASALAR, KAT2_SALON_PAD, KAT2_SV_MAX, OCAKLAR, type MasaTuru } from './kat';
import type { Kat2Ayar } from './kat2Dongu';

/** Sayaç hedeflerinin okuduğu akış (hepsi `kat2Tick`in `olay`ından + `kazanc`tan). */
export type Kat2GorevSayac =
  /** Oyuncunun ELİYLE götürdüğü kahve (garsonunki hariç — Kat 1 `serveTea` deseni). */
  | 'servis'
  /** Tavla masalarına giden kahve (garson dahil: garson tavla köşesinden önce gelir, elle sayılsa
   *  garson kahveyi önce kapar — q_tost5'in kilidi). */
  | 'tavlaKahve'
  /** Garsonun götürdüğü kahve. */
  | 'garson'
  /** Oyununu bitirip kalkan grup. */
  | 'kalkis'
  /** Kat 2'de toplanan coin. */
  | 'kazanc';

export type Kat2GorevHedef =
  | { tip: 'pad'; id: string }
  | { tip: 'sayac'; sayac: Kat2GorevSayac; adet: number }
  /** En az `adet` açık masa (tür verilirse yalnız o tür) `sv` seviyesinde. Yalnız `Kat2Ayar.masaSv` varken. */
  | { tip: 'masaSv'; sv: number; adet: number; tur?: MasaTuru };

export interface Kat2GorevDef {
  id: string;
  /** Görevler ekranındaki lakap (Kat 1 `kicker`). */
  kicker: string;
  title: string;
  hedef: Kat2GorevHedef;
  /** Tamamlanınca cüzdana eklenen coin (TASLAK — kapı kapalı, final zincir koşusunda ölçülür). */
  reward: number;
}

/** Kayıttaki ilerleme (`Kat2Kayit.gorev`; A açar). `sayac` yalnız aktif görevin sayacını tutar. */
export interface Kat2GorevKayit {
  idx: number;
  sayac: Record<string, number>;
}

/** Görevin okuduğu durum — `Kat2Kayit`in yapısal alt kümesi. */
export interface Kat2GorevDurum {
  padsDone: readonly string[];
  masaSv?: Readonly<Record<string, number>>;
  gorev?: Kat2GorevKayit;
}

/** Bir adımın olayları: `{ ...r.olay, kazanc: r.kazanc }`. */
export interface Kat2GorevOlay {
  servis: number;
  garsonServis: number;
  tavlaServis: number;
  kalkis: number;
  kazanc: number;
}

export interface Kat2GorevSonuc {
  kayit: Kat2GorevKayit;
  /** Bu adımda biten görevler (sırayla; çoğu adımda boş). */
  biten: Kat2GorevDef[];
  /** Bitenlerin toplam coin ödülü. */
  odul: number;
}

const BOS: Kat2GorevKayit = Object.freeze({ idx: 0, sayac: Object.freeze({}) as Record<string, number> });
const MASA_TURU: ReadonlyMap<string, MasaTuru> = new Map(KAT2_MASALAR.map((m) => [m.id, m.tur]));

const svGorevi = (g: Kat2GorevDef): boolean => g.hedef.tip === 'masaSv';

/** O derlemede OYNANAN hat: Sv görevleri yalnız `ayar.masaSv` varken (kuyrukta durdukları için idx kaymaz). */
export function kat2Gorevleri(gorevler: readonly Kat2GorevDef[], ayar: Pick<Kat2Ayar, 'masaSv'>): readonly Kat2GorevDef[] {
  return ayar.masaSv ? gorevler : gorevler.filter((g) => !svGorevi(g));
}

/** Bir adımın sayaç artışları. */
export function kat2GorevArtisi(o: Kat2GorevOlay): Record<Kat2GorevSayac, number> {
  return {
    servis: Math.max(0, o.servis - o.garsonServis),
    tavlaKahve: Math.max(0, o.tavlaServis),
    garson: Math.max(0, o.garsonServis),
    kalkis: Math.max(0, o.kalkis),
    kazanc: Math.max(0, o.kazanc),
  };
}

function svSayisi(h: Extract<Kat2GorevHedef, { tip: 'masaSv' }>, d: Kat2GorevDurum): number {
  const sv = d.masaSv ?? {};
  return d.padsDone.filter((id) => {
    const tur = MASA_TURU.get(id);
    return tur !== undefined && (!h.tur || h.tur === tur) && (sv[id] ?? 1) >= h.sv;
  }).length;
}

/** Hedefin ilerlemesi (`cur` ≥ `total` ⇒ tamam). */
function hedefDurumu(g: Kat2GorevDef, sayac: Readonly<Record<string, number>>, d: Kat2GorevDurum): { cur: number; total: number } {
  const h = g.hedef;
  if (h.tip === 'pad') return { cur: d.padsDone.includes(h.id) ? 1 : 0, total: 1 };
  if (h.tip === 'sayac') return { cur: sayac[h.sayac] ?? 0, total: h.adet };
  return { cur: svSayisi(h, d), total: h.adet };
}

const tamam = (g: Kat2GorevDef, sayac: Readonly<Record<string, number>>, d: Kat2GorevDurum): boolean => {
  const { cur, total } = hedefDurumu(g, sayac, d);
  return cur >= total;
};

/**
 * Bir adım ilerlet: aktif sayaç görevine olayı ekler, tamamlanan görevleri (art arda olabilir — oyuncu
 * sayaç görevi sürerken zincirden pad almışsa) bitirir. Değişiklik yoksa AYNI kayıt nesnesi döner.
 */
export function kat2GorevIlerlet(
  kayit: Kat2GorevKayit | undefined,
  olay: Kat2GorevOlay,
  durum: Kat2GorevDurum,
  gorevler: readonly Kat2GorevDef[],
  ayar: Pick<Kat2Ayar, 'masaSv'>,
): Kat2GorevSonuc {
  const hat = kat2Gorevleri(gorevler, ayar);
  const k0 = kayit ?? BOS;
  let idx = k0.idx;
  let sayac: Record<string, number> = k0.sayac;
  let degisti = false;
  const aktif = hat[idx];
  if (aktif?.hedef.tip === 'sayac') {
    const artis = kat2GorevArtisi(olay)[aktif.hedef.sayac];
    if (artis > 0) {
      sayac = { ...sayac, [aktif.hedef.sayac]: (sayac[aktif.hedef.sayac] ?? 0) + artis };
      degisti = true;
    }
  }
  const biten: Kat2GorevDef[] = [];
  while (idx < hat.length && tamam(hat[idx], sayac, durum)) {
    biten.push(hat[idx]);
    idx += 1;
    sayac = {};
    degisti = true;
  }
  if (!degisti) return { kayit: k0, biten, odul: 0 };
  return { kayit: { idx, sayac }, biten, odul: biten.reduce((a, g) => a + g.reward, 0) };
}

/**
 * YÜKLEME hizası (ödülsüz): görev hattı yokken alınmış pad'ler / Sv'ler bir eski kayıtta durur. Hattın EN
 * GEÇ tamamlanmış durum görevinin ardına geçilir (aradaki sayaç görevleri atlanır — D-088'in "ilerleme
 * geriye gitmez"i), sonra tamamlanmış durum görevleri de atlanır. Değişiklik yoksa aynı nesne.
 */
export function kat2GorevHizala(
  kayit: Kat2GorevKayit | undefined,
  durum: Kat2GorevDurum,
  gorevler: readonly Kat2GorevDef[],
  ayar: Pick<Kat2Ayar, 'masaSv'>,
): Kat2GorevKayit {
  const hat = kat2Gorevleri(gorevler, ayar);
  const k0 = kayit ?? BOS;
  let idx = Math.max(0, Math.min(Math.floor(k0.idx) || 0, hat.length));
  for (let i = hat.length - 1; i >= idx; i--) {
    if (hat[i].hedef.tip !== 'sayac' && tamam(hat[i], {}, durum)) {
      idx = i + 1;
      break;
    }
  }
  while (idx < hat.length && hat[idx].hedef.tip !== 'sayac' && tamam(hat[idx], {}, durum)) idx += 1;
  return idx === k0.idx && kayit ? kayit : { idx, sayac: idx === k0.idx ? k0.sayac : {} };
}

/** Hat bitti mi (o derlemenin hattında). */
export function kat2GorevHattiBitti(durum: Kat2GorevDurum, gorevler: readonly Kat2GorevDef[], ayar: Pick<Kat2Ayar, 'masaSv'>): boolean {
  return (durum.gorev?.idx ?? 0) >= kat2Gorevleri(gorevler, ayar).length;
}

/** HUD görev şeridinin Kat 2 görünümü (Kat 1 `questView` dili). Hat bittiyse null. */
export interface Kat2GorevGorunum {
  id: string;
  kicker: string;
  title: string;
  /** İlerleme çubuğu (yoksa null — tek adımlı pad görevi Kat 1'deki gibi çubuksuz). */
  cur: number | null;
  total: number | null;
  reward: number;
  /** Görev resmi için Kat 1 karşılığı (`QuestPhoto`). */
  foto: QuestTarget;
}

/**
 * Pad görevinin ADIMLARI: önceki pad görevinin hedefinden sonra bu görevin hedefine kadar zincirin
 * pad'leri ("Merdiven salonunu doldur" = okey3 + okey4 → 0/2). Zincir tek hat olduğu için oyuncu aradaki
 * pad'leri zaten sırayla alır; görev onları sayar, saklamaz (padsDone'dan türer).
 */
export function kat2PadAdimlari(hat: readonly Kat2GorevDef[], i: number, ayar: Pick<Kat2Ayar, 'padler'>): string[] {
  const g = hat[i];
  if (g?.hedef.tip !== 'pad') return [];
  const zincir = ayar.padler.map((p) => p.id);
  let bas = 0;
  for (let j = i - 1; j >= 0; j--) {
    const h = hat[j].hedef;
    if (h.tip === 'pad') {
      bas = zincir.indexOf(h.id) + 1;
      break;
    }
  }
  const son = zincir.indexOf(g.hedef.id);
  return son < 0 ? [g.hedef.id] : zincir.slice(bas, son + 1);
}

export function kat2GorevGorunumu(
  durum: Kat2GorevDurum,
  gorevler: readonly Kat2GorevDef[],
  ayar: Pick<Kat2Ayar, 'masaSv' | 'padler'>,
): Kat2GorevGorunum | null {
  const hat = kat2Gorevleri(gorevler, ayar);
  const idx = durum.gorev?.idx ?? 0;
  const g = hat[idx];
  if (!g) return null;
  let cur: number | null = null;
  let total: number | null = null;
  if (g.hedef.tip === 'pad') {
    const adim = kat2PadAdimlari(hat, idx, ayar);
    if (adim.length > 1) {
      total = adim.length;
      cur = adim.filter((id) => durum.padsDone.includes(id)).length;
    }
  } else {
    const d = hedefDurumu(g, durum.gorev?.sayac ?? {}, durum);
    if (d.total > 1) {
      total = d.total;
      cur = Math.min(d.cur, d.total);
    }
  }
  return { id: g.id, kicker: g.kicker, title: g.title, cur, total, reward: g.reward, foto: kat2GorevFoto(g.hedef) };
}

/** Görev resmi: Kat 1'in ikon diline eşleme (yeni ikon çizilmez). */
export function kat2GorevFoto(h: Kat2GorevHedef): QuestTarget {
  if (h.tip === 'masaSv') return { type: 'tableLevel', level: h.sv - 1 };
  if (h.tip === 'sayac') {
    if (h.sayac === 'kazanc') return { type: 'collectCoin', count: h.adet };
    if (h.sayac === 'garson') return { type: 'pad', id: 'waiter' };
    return { type: 'serveTea', count: h.adet };
  }
  if (h.id === KAT2_GARSON_PAD) return { type: 'pad', id: 'waiter' };
  if (OCAKLAR.some((o) => o.id === h.id)) return { type: 'stationLevel', level: 1 };
  if (h.id === 'k2lavabo') return { type: 'lavaboLevel', level: 1 };
  return { type: 'pad', id: h.id };
}

// ============================== BEKÇİ: ULAŞILABİLİRLİK ==============================

/**
 * Hattın i. görevine gelindiğinde KESİN açık olanlar: hazır pad'ler + zincirde önceki pad görevlerinin en
 * geç hedefine kadar her şey (zincir tek hat — o hedef alındıysa öncekiler de alınmıştır).
 */
export function kat2GorevOncesiAcik(
  hat: readonly Kat2GorevDef[],
  i: number,
  ayar: Pick<Kat2Ayar, 'padler'>,
  hazir: readonly string[],
): Set<string> {
  const zincir = ayar.padler.map((p) => p.id);
  let son = -1;
  for (let j = 0; j < i; j++) {
    const h = hat[j].hedef;
    if (h.tip === 'pad') son = Math.max(son, zincir.indexOf(h.id));
  }
  return new Set([...hazir, ...zincir.slice(0, son + 1)]);
}

/**
 * Ödül referansı (Kat 1 M1 bandı): pad görevinde hedef pad'in fiyatı; sayaç görevinde o anda sırada
 * bekleyen zincir pad'inin fiyatı; Sv görevinde Sv'ye çıkışın fiyatı × adet (`masaSv` yoksa null).
 */
export function kat2GorevOdulReferansi(
  hat: readonly Kat2GorevDef[],
  i: number,
  ayar: Pick<Kat2Ayar, 'padler' | 'masaSv'>,
): number | null {
  const h = hat[i].hedef;
  if (h.tip === 'pad') return ayar.padler.find((p) => p.id === h.id)?.cost ?? null;
  if (h.tip === 'masaSv') {
    const kol = ayar.masaSv?.[h.tur ?? 'okey'];
    return kol ? (kol.fiyat[h.sv - 1] ?? 0) * h.adet : null;
  }
  const acik = kat2GorevOncesiAcik(hat, i, ayar, []);
  return ayar.padler.find((p) => !acik.has(p.id))?.cost ?? null;
}

/**
 * Hat oynanabilir mi? Hata metni (geliştirici için) ya da null. Kurallar:
 * kimlik tekil · pad hedefi zincirde ve zincir sırasında (geri dönmez) · son durum görevi zincirin son pad'i
 * (hat "Kat 2 bitti"de biter) · sayaç görevinin istediği şey önceki görevlerle açık · Sv görevleri kuyrukta,
 * seviyesi ve adedi ulaşılabilir.
 */
export function kat2GorevHatasi(
  gorevler: readonly Kat2GorevDef[],
  ayar: Pick<Kat2Ayar, 'padler' | 'masaSv'>,
  hazir: readonly string[],
): string | null {
  const zincir = ayar.padler.map((p) => p.id);
  const ids = new Set<string>();
  let onceki = -1;
  let svBasladi = false;
  for (let i = 0; i < gorevler.length; i++) {
    const g = gorevler[i];
    if (ids.has(g.id)) return `tekrar kimlik: ${g.id}`;
    ids.add(g.id);
    if (!(g.reward > 0)) return `${g.id}: ödül yok`;
    const h = g.hedef;
    if (svBasladi && h.tip !== 'masaSv') return `${g.id}: Sv görevinden sonra (Sv görevleri kuyrukta olmalı)`;
    const acik = kat2GorevOncesiAcik(gorevler, i, ayar, hazir);
    const turAcik = (tur: MasaTuru) => [...acik].some((id) => MASA_TURU.get(id) === tur);
    const ocak = OCAKLAR.some((o) => acik.has(o.id));
    if (h.tip === 'pad') {
      const z = zincir.indexOf(h.id);
      if (z < 0) return `${g.id}: ${h.id} zincirde yok`;
      if (z <= onceki) return `${g.id}: ${h.id} zincir sırasına aykırı`;
      onceki = z;
    } else if (h.tip === 'sayac') {
      if (!(h.adet > 0)) return `${g.id}: adet yok`;
      const masa = [...acik].some((id) => MASA_TURU.has(id));
      const gerek =
        h.sayac === 'servis' ? turAcik('okey') && ocak
        : h.sayac === 'tavlaKahve' ? turAcik('tavla') && ocak
        : h.sayac === 'garson' ? acik.has(KAT2_GARSON_PAD) && turAcik('tavla') && ocak
        : masa;
      if (!gerek) return `${g.id}: ${h.sayac} henüz açılmamış bir şeyi istiyor`;
    } else {
      svBasladi = true;
      const turler: MasaTuru[] = h.tur ? [h.tur] : ['okey', 'tavla'];
      const kolMax = Math.max(...turler.map((t) => ayar.masaSv?.[t].fiyat.length ?? KAT2_SV_MAX));
      if (h.sv < 2 || h.sv > kolMax) return `${g.id}: Sv${h.sv} ulaşılamaz`;
      const masaSayisi = [...acik].filter((id) => {
        const tur = MASA_TURU.get(id);
        return tur !== undefined && turler.includes(tur);
      }).length;
      if (h.adet < 1 || h.adet > masaSayisi) return `${g.id}: ${h.adet} masa açık değil`;
    }
  }
  const sonDurum = [...gorevler].reverse().find((g) => g.hedef.tip === 'pad');
  if (sonDurum && sonDurum.hedef.tip === 'pad' && sonDurum.hedef.id !== zincir[zincir.length - 1])
    return `hat zincirin son pad'inde bitmiyor (${sonDurum.hedef.id})`;
  if (!KAT2_SALON_PAD.every((s) => [...gorevler].some((g) => g.hedef.tip === 'pad' && g.hedef.id === s)))
    return 'her salon açılışının kendi görevi olmalı';
  return null;
}
