/**
 * audioKat2.ts — KAT 2'NİN SES KATALOĞU (S3 · Ajan C). Her yeni ses için İKİ ADAY; oyuna `KAT2_SECIM`teki
 * aday bağlanır (bugün hepsi 0 = Aday 1). Kullanıcı `tools/kat2-ses-dinle.html`den seçince yalnız
 * `KAT2_SECIM` değişir — dinleme sayfası bu dosyayı ve `audioSynth.seslendir`i DOĞRUDAN içe aktarır,
 * yani duyulan aday ile oyunda çalan aday aynı koddur (D-096 · "ölçülen = duyulan").
 *
 * Kaynak D-122 K1: SENTEZ. Aile kuralı Kat 1'inki (`audio.ts` SES_KATALOG başlığı): FİZİKSEL olaylar
 * gürültü + filtre (taş, zar, cezve, duvar, merdiven), İLERLEME olayları tonal (Sv, yeni kat). Kat 1'de
 * karşılığı olan olaylar YENİ ses almaz, Kat 1'inkini çalar (`kat2Ses.ts`): para → `coin`, kahve
 * masaya → `serve`, ocaktan kahve → `pour`, pad → `padFill`.
 *
 * Kimlikler `k2` önekli: web arka ucunun tampon önbelleği `id:yarimSes` anahtarlı ve Kat 1 ile ortak.
 */
import type { SesTanim } from './audio';
import type { Katman } from './audioSynth';

export type Kat2SesId =
  | 'k2takirti'  // okey taşı — oynayan okey masasından ara ara, yakınlığa göre kısık
  | 'k2zar'      // tavla zarı — oynayan tavla masasından ara ara, yakınlığa göre kısık
  | 'k2cezve'    // cezvede kahve hazır (fokurtu) — ocağa yakınlığa göre kısık
  | 'k2kasa'     // Kat 1 kasası cüzdana boşaldı
  | 'k2merdiven' // kat geçişi başladı
  | 'k2duvar'    // alanlar arası duvar gömüldü (salon açıldı)
  | 'k2sv'       // masa seviye atladı
  | 'k2yeniKat'; // Kat 2'ye ilk çıkış

/** Bir sesin iki adayı: [Aday 1, Aday 2] + dinleme sayfasındaki kısa tarifleri. */
export interface Kat2Aday {
  ad: string;
  tarif: [string, string];
  adaylar: [SesTanim, SesTanim];
}

const yok = (id: string) => `/assets/audio/${id}.ogg`;

/** Kısa tahta/plastik tık: dar bant gürültü + çok kısa gövde. Taş, zar ve moloz bunun dizilimi. */
const tik = (gecikme: number, hz: number, gain: number, q = 5, govdeHz = 0): Katman[] => [
  { kaynak: 'gurultu', hz: [hz], q, gecikme, atak: 0.0005, sonme: 0.035, gain },
  ...(govdeHz ? [{ kaynak: 'ton' as const, hz: [govdeHz], dalga: 'sine' as const, gecikme, atak: 0.001, sonme: 0.045, gain: gain * 0.45 }] : []),
];

/** Kabarcık: yukarı süzülen kısa sinüs ("blup"). */
const kabarcik = (gecikme: number, hz0: number, gain: number): Katman =>
  ({ kaynak: 'ton', hz: [hz0, hz0 * 1.7], suzul: true, dalga: 'sine', gecikme, atak: 0.003, sonme: 0.07, gain });

/** Ayak sesi: tok alçak gövde + yumuşak sürtünme. */
const adim = (gecikme: number, hz: number): Katman[] => [
  { kaynak: 'ton', hz: [hz], dalga: 'sine', gecikme, atak: 0.002, sonme: 0.08, gain: 0.08 },
  { kaynak: 'gurultu', hz: [520], q: 2, gecikme, atak: 0.001, sonme: 0.04, gain: 0.03 },
];

/** Madenî tık (Kat 1 `coin` tınısının alçak/kısa akrabası) — kasa adayı 2'nin dökülen paraları. */
const sikke = (gecikme: number, hz: number, gain: number): Katman =>
  ({ kaynak: 'ton', hz: [hz], kismi: [1, 2.76, 5.4], gecikme, atak: 0.001, sonme: 0.07, gain });

export const KAT2_SES_ADAYLARI: Record<Kat2SesId, Kat2Aday> = {
  k2takirti: {
    ad: 'Okey taşı takırtısı',
    tarif: ['iki taş art arda konuyor (tık-tık)', 'üç hızlı tık + masaya tok bir dokunuş (ıstaka dizme)'],
    adaylar: [
      { dosya: yok('k2_takirti'), aralik: 0.5, katmanlar: [...tik(0, 3200, 0.07, 6, 820), ...tik(0.09, 2900, 0.055, 6, 760)] },
      {
        dosya: yok('k2_takirti'), aralik: 0.5,
        katmanlar: [
          ...tik(0, 3600, 0.06, 5), ...tik(0.07, 3300, 0.05, 5), ...tik(0.15, 3000, 0.045, 5),
          { kaynak: 'ton', hz: [180], dalga: 'sine', gecikme: 0.15, atak: 0.002, sonme: 0.06, gain: 0.03 },
        ],
      },
    ],
  },
  k2zar: {
    ad: 'Tavla zarı',
    tarif: ['zar tahtaya düşüp yuvarlanıyor (seyrelen tıklar)', 'avuçta sallama + iki zar düşüyor'],
    adaylar: [
      {
        dosya: yok('k2_zar'), aralik: 0.8,
        katmanlar: [
          { kaynak: 'ton', hz: [220], dalga: 'sine', atak: 0.001, sonme: 0.05, gain: 0.04 },
          ...tik(0, 2200, 0.07, 4), ...tik(0.08, 2400, 0.06, 4), ...tik(0.15, 2000, 0.045, 4),
          ...tik(0.2, 2300, 0.035, 4), ...tik(0.24, 2100, 0.025, 4),
        ],
      },
      {
        dosya: yok('k2_zar'), aralik: 0.8,
        katmanlar: [
          { kaynak: 'gurultu', hz: [2500], q: 1.5, atak: 0.06, sonme: 0.18, gain: 0.03 },
          ...tik(0.26, 2000, 0.07, 4, 210), ...tik(0.33, 2300, 0.05, 4, 230),
        ],
      },
    ],
  },
  k2cezve: {
    ad: 'Cezve fokurtusu / kahve hazır',
    tarif: ['üç kabarcık (fokur-fokur)', 'iki kabarcık + minik "ting" (hazır)'],
    adaylar: [
      { dosya: yok('k2_cezve'), aralik: 1.5, katmanlar: [kabarcik(0, 300, 0.07), kabarcik(0.09, 360, 0.06), kabarcik(0.2, 280, 0.05)] },
      {
        dosya: yok('k2_cezve'), aralik: 1.5,
        katmanlar: [
          kabarcik(0, 320, 0.06), kabarcik(0.1, 380, 0.05),
          { kaynak: 'ton', hz: [1320], kismi: [1, 2.76], gecikme: 0.2, atak: 0.002, sonme: 0.25, gain: 0.035 },
        ],
      },
    ],
  },
  k2kasa: {
    ad: 'Kat 1 kasası boşaldı',
    tarif: ['çekmece tok + çift çan (ding-ding)', 'çekmece + dökülen beş sikke'],
    adaylar: [
      {
        dosya: yok('k2_kasa'), aralik: 0.5,
        katmanlar: [
          { kaynak: 'gurultu', hz: [700], q: 3, atak: 0.002, sonme: 0.06, gain: 0.07 },
          { kaynak: 'ton', hz: [1568], kismi: [1, 2.76, 5.4], gecikme: 0.05, atak: 0.002, sonme: 0.3, gain: 0.09 },
          { kaynak: 'ton', hz: [2093], kismi: [1, 2.76, 5.4], gecikme: 0.14, atak: 0.002, sonme: 0.35, gain: 0.08 },
        ],
      },
      {
        dosya: yok('k2_kasa'), aralik: 0.5,
        katmanlar: [
          { kaynak: 'gurultu', hz: [700], q: 3, atak: 0.002, sonme: 0.06, gain: 0.06 },
          sikke(0.04, 2600, 0.08), sikke(0.09, 2900, 0.07), sikke(0.13, 2700, 0.06),
          sikke(0.18, 3000, 0.05), sikke(0.24, 2800, 0.04),
        ],
      },
    ],
  },
  k2merdiven: {
    ad: 'Merdiven / kat geçişi',
    tarif: ['üç yumuşak ayak sesi + hafif hışırtı', 'yalnız hışırtı (perde iniyor)'],
    adaylar: [
      {
        dosya: yok('k2_merdiven'), aralik: 0.5,
        katmanlar: [
          ...adim(0, 140), ...adim(0.14, 160), ...adim(0.28, 180),
          { kaynak: 'gurultu', hz: [300, 1200], suzul: true, q: 0.8, atak: 0.15, sonme: 0.35, gain: 0.03 },
        ],
      },
      {
        dosya: yok('k2_merdiven'), aralik: 0.5,
        katmanlar: [{ kaynak: 'gurultu', hz: [250, 1400, 400], suzul: true, q: 0.7, atak: 0.2, sonme: 0.45, gain: 0.05 }],
      },
    ],
  },
  k2duvar: {
    ad: 'Duvar gömüldü',
    tarif: ['yumuşak alçak gümbürtü (aşağı inen)', 'gümbürtü + üç ufak moloz tıkı'],
    adaylar: [
      {
        dosya: yok('k2_duvar'), aralik: 0.8,
        katmanlar: [
          { kaynak: 'gurultu', hz: [360, 140], suzul: true, q: 0.9, atak: 0.03, sonme: 0.55, gain: 0.09 },
          { kaynak: 'ton', hz: [95, 70], suzul: true, dalga: 'sine', atak: 0.01, sonme: 0.35, gain: 0.07 },
        ],
      },
      {
        dosya: yok('k2_duvar'), aralik: 0.8,
        katmanlar: [
          { kaynak: 'gurultu', hz: [360, 140], suzul: true, q: 0.9, atak: 0.03, sonme: 0.5, gain: 0.08 },
          { kaynak: 'ton', hz: [95, 70], suzul: true, dalga: 'sine', atak: 0.01, sonme: 0.3, gain: 0.06 },
          ...tik(0.15, 1500, 0.025, 3), ...tik(0.25, 1700, 0.02, 3), ...tik(0.32, 1400, 0.018, 3),
        ],
      },
    ],
  },
  k2sv: {
    ad: 'Masa seviye atladı',
    tarif: ['tahta tok + yükselen büyük altılı (iki nota)', 'tahta tok + yukarı süzülen "büyüme" + parıltı'],
    adaylar: [
      {
        dosya: yok('k2_sv'), aralik: 0.3,
        katmanlar: [
          { kaynak: 'gurultu', hz: [900], q: 4, atak: 0.001, sonme: 0.05, gain: 0.08 },
          { kaynak: 'ton', hz: [587, 988], dalga: 'triangle', gecikme: 0.03, atak: 0.004, sonme: 0.28, gain: 0.1 },
        ],
      },
      {
        dosya: yok('k2_sv'), aralik: 0.3,
        katmanlar: [
          { kaynak: 'gurultu', hz: [900], q: 4, atak: 0.001, sonme: 0.05, gain: 0.08 },
          { kaynak: 'ton', hz: [400, 900], suzul: true, dalga: 'sine', gecikme: 0.03, atak: 0.01, sonme: 0.3, gain: 0.08 },
          { kaynak: 'gurultu', hz: [6000], q: 5, gecikme: 0.22, atak: 0.002, sonme: 0.08, gain: 0.03 },
        ],
      },
    ],
  },
  k2yeniKat: {
    ad: 'Kat 2\'ye ilk çıkış',
    tarif: ['hicaz dörtlüsü (la-si♭-do♯-re) + çan', 'büyük altılı + oktav sıçrama, parlak süpürme'],
    adaylar: [
      {
        dosya: yok('k2_yeni_kat'), aralik: 1,
        katmanlar: [
          { kaynak: 'ton', hz: [440, 466, 554, 587], dalga: 'triangle', atak: 0.004, sonme: 0.7, gain: 0.11 },
          { kaynak: 'ton', hz: [880], kismi: [1, 2.76, 5.4], gecikme: 0.55, atak: 0.002, sonme: 0.6, gain: 0.06 },
        ],
      },
      {
        dosya: yok('k2_yeni_kat'), aralik: 1,
        katmanlar: [
          { kaynak: 'ton', hz: [392, 659, 784], dalga: 'triangle', atak: 0.004, sonme: 0.6, gain: 0.11 },
          { kaynak: 'ton', hz: [784, 1318, 1568], dalga: 'sine', gecikme: 0.005, atak: 0.004, sonme: 0.55, gain: 0.04 },
          { kaynak: 'gurultu', hz: [800, 3000], suzul: true, q: 1, atak: 0.1, sonme: 0.5, gain: 0.03 },
        ],
      },
    ],
  },
};

/** Oyuna bağlı aday (0 = Aday 1). Kullanıcı dinleme sayfasından seçince YALNIZ burası değişir. */
export const KAT2_SECIM: Record<Kat2SesId, 0 | 1> = {
  // Kullanıcı 2026-11-13 (D-195): "1. ve sonuncu aday 2, diğerleri aday 1" — takırtı + ilk çıkış Aday 2.
  k2takirti: 1, k2zar: 0, k2cezve: 0, k2kasa: 0, k2merdiven: 0, k2duvar: 0, k2sv: 0, k2yeniKat: 1,
};

/** Oyunun çaldığı Kat 2 kataloğu — adaylardan TÜRER. */
export const KAT2_SES_KATALOG = Object.fromEntries(
  (Object.keys(KAT2_SES_ADAYLARI) as Kat2SesId[]).map((id) => [id, KAT2_SES_ADAYLARI[id].adaylar[KAT2_SECIM[id]]]),
) as Record<Kat2SesId, SesTanim>;

// ---- ORTAM SESLERİ (takırtı + zar): sıklık ve yakınlık. Sunum sayısı, denge değil (`audio.ts` aralık deseni).

/** İki ortam sesi (takırtı/zar, HANGİ masadan olursa olsun) arasındaki en az süre (sn) — "sürekli değil". */
export const ORTAM_ARALIK = 1.8;
/** Bir masanın iki ortam sesi arası (sn), bu aralıkta rastgele. İlk ses de bu aralıkta gecikir. */
export const MASA_ARALIK: readonly [number, number] = [7, 15];
/** Yakınlık kısması: YAKIN'a kadar tam, UZAK'ta sıfır (m), arası doğrusal. */
export const YAKIN = 3;
export const UZAK = 14;

/** Oyuncu ile kaynak arasındaki mesafeden kazanç çarpanı (0..1). */
export function yakinlik(mesafe: number): number {
  if (mesafe <= YAKIN) return 1;
  if (mesafe >= UZAK) return 0;
  return 1 - (mesafe - YAKIN) / (UZAK - YAKIN);
}
