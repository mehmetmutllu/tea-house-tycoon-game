/**
 * kat2Ses.ts — KAT 2'NİN SESLERİ (S3 · Ajan C). `audioBridge.ts`in Kat 2 karşılığı, aynı desen:
 * store'a ABONE olur, durumdan bir KESİT çıkarır, iki kesitin FARKINDAN olay türetir (saf), motora verir.
 * Store'a, `kat2Dongu.ts`e dokunmaz — `kat2Tick`in `olay`ı store'a yazılmıyor, ses de ona muhtaç değil.
 *
 * Kurallar:
 *  - Kat 2 dünyasının sesleri YALNIZ oyuncu Kat 2'deyken çalar (Kat 1'deyken Kat 2 arkada işliyor).
 *    Kasa boşalması Kat 1'in olayıdır → yalnız Kat 1'de. Merdiven her iki yönde.
 *  - Dünya SÜREKLİLİĞİ: `nextId` geriye gittiyse dünya yeniden kuruldu (yükleme, sıfırlama, merdiven
 *    açılışı) → o karede dünya kaynaklı ses çalmaz (Kat 1'in "azalma sessizdir" kuralının karşılığı).
 *  - Ortam (takırtı/zar) zamanlayıcısı S5'te KALKTI (G-125, kullanıcı: *"arka planda sürekli zar sesi —
 *    kalksın"*). İki ses katalogda/dinleme sayfasında durur ama oyuna bağlı değil.
 *  - Para: Kat 1'de yerde tek tek duran paralar art arda toplanır ve `coin`in SERİ ivmesi (D-122 · I2) "tık tık"
 *    yükselen bir zincir çalar. Kat 2'de para tek yığın → tek tık duyuluyordu (G-106). Bir yığın artık
 *    `PARA_ZINCIR.adet` tıklık bir zincirdir; seri basamağı Kat 1'in motorundan gelir (aynı tanım).
 *  - Kat 1'de karşılığı olan iki olay daha Kat 1'in sesini çalar (S5 denetimi): ocak/lavabo yükseltmesi →
 *    `purchase`, Kat 2 görevi bitti → `quest`.
 *  - Sessiz kip/seviye: her güncellemede `settings`ten motora (Kat 1 ile aynı satır). Arka plan/reklam:
 *    web arka ucu `sesDuraklatildi` iken çalmaz; zamanlayıcı da o sürede ses ÜRETMEZ (dönüşte birikmiş
 *    takırtı patlamasın).
 */
import { economyConfig } from '../config/economy.config';
import { sesMotoruKur, SES_KATALOG, type SesId, type SesMotoru } from './audio';
import {
  KAT2_SES_KATALOG, PARA_ZINCIR, yakinlik, type Kat2SesId,
} from './audioKat2';
import { sesDuraklatildi, webSesArkaUcu } from './audioWeb';
import { OCAKLAR, kat2AcikAlan, type KatNo } from './kat';
import { useGame } from './store';

type Durum = ReturnType<typeof useGame.getState>;

/** Kat 2'nin çalabildiği her ses: kendi kataloğu + Kat 1'den yeniden kullanılanlar. */
export type Kat2CalId = Kat2SesId | Extract<SesId, 'coin' | 'serve' | 'pour' | 'padFill' | 'purchase' | 'quest'>;

export interface Kat2SesOlay {
  id: Kat2CalId;
  /** Yakınlık kısması (0..1); olay sesleri 1. */
  kazanc: number;
}

export interface Kat2SesKesit {
  kat: KatNo;
  gecis: boolean;
  acik: boolean;
  /** Kat 2 pad'leri yalnız hazır olanlar mı (oyuncu daha hiçbir şey açmadı). */
  hazirda: boolean;
  padSayisi: number;
  acikAlan: number;
  svToplam: number;
  /** Ocak + lavabo yükseltme sayısı (Kat 1 `yukseltmeToplam`ının karşılığı; garson yükseltmesi Kat 1'deki gibi sessiz). */
  yukToplam: number;
  /** Kat 2 görev hattının sırası (`kat2.gorev.idx`). */
  gorevIdx: number;
  /** Dünya sürekliliği (`Kat2Dunya.nextId`): geri giderse dünya yeniden kuruldu. */
  nextId: number;
  tepsi: number;
  birikimToplam: number;
  istekToplam: number;
  /** Oyuncunun ELİYLE topladığı yığın sayacı (`stats.kat2Para`). Oto-toplanan yığın saymaz → sessiz (Kat 1 `coinsCollected`). */
  paraToplanan: number;
  ocakHazir: readonly number[];
  x: number;
  z: number;
}

const HAZIR: readonly string[] = economyConfig.kat2.hazir;

/** Masa Sv toplamı — `kat2.masaSv` Ajan A'nın additive alanı; yoksa (eski kayıt / A öncesi) 0. */
const svToplami = (kat2: unknown): number => {
  const sv = (kat2 as { masaSv?: Readonly<Record<string, number>> }).masaSv;
  return sv ? Object.values(sv).reduce((a, b) => a + b, 0) : 0;
};

export function kat2KesitAl(s: Durum): Kat2SesKesit {
  const d = s.kat2Dunya;
  let birikimToplam = 0;
  let istekToplam = 0;
  for (const m of d.masalar) {
    birikimToplam += m.birikim;
    istekToplam += m.istek;
  }
  return {
    kat: s.kat,
    gecis: s.katGecis != null,
    acik: s.kat2.acik,
    hazirda: s.kat2.padsDone.every((id) => HAZIR.includes(id)),
    padSayisi: s.kat2.padsDone.length,
    acikAlan: kat2AcikAlan(s.kat2.padsDone),
    svToplam: svToplami(s.kat2),
    yukToplam: (s.kat2.yuk?.ocak ?? 0) + (s.kat2.yuk?.lavabo ?? 0),
    gorevIdx: s.kat2.gorev?.idx ?? 0,
    nextId: d.nextId,
    tepsi: d.tepsi,
    birikimToplam,
    istekToplam,
    paraToplanan: s.stats.kat2Para ?? 0,
    ocakHazir: d.ocaklar.map((o) => o.hazir),
    x: s.player[0],
    z: s.player[2],
  };
}

/** Oturum belleği: "yeni kat" anı oturumda bir kez, merdiven açıldıktan ya da hiç pad açılmamışken. */
export interface Kat2SesBellek {
  yeniKatBekliyor: boolean;
  yeniKatCalindi: boolean;
}
export const yeniBellek = (): Kat2SesBellek => ({ yeniKatBekliyor: false, yeniKatCalindi: false });

/**
 * İki kesit arasındaki Kat 2 OLAY sesleri (ortam hariç). SAF (yalnız `bellek` güncellenir).
 * Sıra Kat 1'deki gibi: en nadir/anlamlı olay önce.
 */
export function kat2SesOlaylari(onceki: Kat2SesKesit | null, s: Kat2SesKesit, bellek: Kat2SesBellek): Kat2SesOlay[] {
  if (!onceki) return [];
  const o: Kat2SesOlay[] = [];
  const cal = (id: Kat2CalId, kazanc = 1) => o.push({ id, kazanc });
  if (!onceki.acik && s.acik) bellek.yeniKatBekliyor = true;

  // Geçiş başladı → merdiven (iki yönde; oyuncunun kendi eylemi).
  if (!onceki.gecis && s.gecis) cal('k2merdiven');
  // Perde arkasında Kat 2'ye VARDI (yalnız geçişle — yükleme anı sayılmaz).
  if (onceki.kat === 1 && s.kat === 2 && onceki.gecis && !bellek.yeniKatCalindi && (bellek.yeniKatBekliyor || s.hazirda)) {
    bellek.yeniKatCalindi = true;
    cal('k2yeniKat');
  }

  if (s.kat !== 2 || onceki.kat !== 2 || s.nextId < onceki.nextId) return o;
  if (s.gorevIdx > onceki.gorevIdx) cal('quest');
  if (s.svToplam > onceki.svToplam) cal('k2sv');
  if (s.yukToplam > onceki.yukToplam) cal('purchase');
  if (s.acikAlan > onceki.acikAlan) cal('k2duvar');
  if (s.padSayisi > onceki.padSayisi) cal('padFill');
  if (s.tepsi < onceki.tepsi && (s.birikimToplam > onceki.birikimToplam || s.istekToplam < onceki.istekToplam)) cal('serve');
  if (s.tepsi > onceki.tepsi) cal('pour');
  // Cezve: hazır sayısı artan ocak, oyuncuya yakınlığıyla (birden çoksa en yakını).
  let cezve = 0;
  s.ocakHazir.forEach((h, k) => {
    const yer = OCAKLAR[k];
    if (yer && h > (onceki.ocakHazir[k] ?? 0)) cezve = Math.max(cezve, yakinlik(Math.hypot(s.x - yer.al[0], s.z - yer.al[1])));
  });
  if (cezve > 0) cal('k2cezve', cezve);
  // Para: oyuncu yığın topladı (oto-toplama sessiz — Kat 1'de de `coin` yalnız elle toplamada).
  if (s.paraToplanan > onceki.paraToplanan) cal('coin');
  return o;
}

/** Bu adımda oyuncunun ELİYLE topladığı yığın sayısı. Kat 2 dışında / dünya yeniden kurulduysa 0. SAF. */
export function toplananYigin(onceki: Kat2SesKesit | null, s: Kat2SesKesit): number {
  if (!onceki || s.kat !== 2 || onceki.kat !== 2 || s.nextId < onceki.nextId) return 0;
  return Math.max(0, s.paraToplanan - onceki.paraToplanan);
}

/**
 * G-106 — PARA ZİNCİRİ: bir yığın = `PARA_ZINCIR.adet` tık, `aralik` arayla (ilki hemen). Zincir sürerken gelen yığın
 * onun ARKASINA eklenir: iki yığın art arda = tek uzun, yükselen zincir (Kat 1'de yerdeki paraları arka arkaya
 * toplamak gibi). Dönüş: çalınacak tıkların zamanları (sıralı). SAF.
 */
export function paraZinciriEkle(kuyruk: readonly number[], t: number, yigin: number): number[] {
  const out = kuyruk.slice();
  let son = out.length ? out[out.length - 1] : t - PARA_ZINCIR.aralik;
  for (let i = 0; i < yigin * PARA_ZINCIR.adet; i++) out.push((son += PARA_ZINCIR.aralik));
  return out;
}

/** Kat 2'nin birleşik kataloğu: kendi sesleri + Kat 1'den yeniden kullanılanlar (aynı tanım, aynı tampon). */
const KATALOG: Record<Kat2CalId, (typeof SES_KATALOG)[SesId]> = {
  ...KAT2_SES_KATALOG,
  coin: SES_KATALOG.coin,
  serve: SES_KATALOG.serve,
  pour: SES_KATALOG.pour,
  padFill: SES_KATALOG.padFill,
  purchase: SES_KATALOG.purchase,
  quest: SES_KATALOG.quest,
};

export interface Kat2SesSecenek {
  motor?: SesMotoru<Kat2CalId>;
  saat?: () => number;
  duraklatildi?: () => boolean;
}

/**
 * Store'a abone olup Kat 2 seslerini çalar. Dönüş: aboneliği bitiren fonksiyon.
 * `sesiBagla()` ile YAN YANA çağrılır (App'te, `init()`ten sonra): ilk kesit kıyas noktasıdır, ses çalmaz.
 */
export function kat2SesBaslat(sec: Kat2SesSecenek = {}): () => void {
  const ayar = useGame.getState().settings;
  const m = sec.motor ?? sesMotoruKur<Kat2CalId>(webSesArkaUcu<Kat2CalId>(), ayar.sound, ayar.soundVolume, KATALOG);
  const saat = sec.saat ?? (() => performance.now() / 1000);
  const duraklatildi = sec.duraklatildi ?? sesDuraklatildi;
  let zincir: number[] = [];
  const bellek = yeniBellek();
  let onceki: Kat2SesKesit | null = null;

  const ac = () => m.kilidiAc();
  const olaylar = ['pointerdown', 'touchend', 'click', 'keydown'] as const;
  if (typeof window !== 'undefined') for (const o of olaylar) window.addEventListener(o, ac, { passive: true });

  const cikar = useGame.subscribe((s: Durum) => {
    m.ayarla(s.settings.sound, s.settings.soundVolume);
    const simdi = kat2KesitAl(s);
    const olay = kat2SesOlaylari(onceki, simdi, bellek);
    const yigin = toplananYigin(onceki, simdi);
    onceki = simdi;
    if (simdi.kat !== 2 || simdi.gecis) zincir = [];
    if (duraklatildi()) {
      zincir = []; // arka planda biriken zincir dönüşte patlamasın
      return;
    }
    const t = saat();
    // `coin` olayı zincirin kendisi olarak çalar (ilk tık hemen) — olay listesinde ayrıca çalınmaz.
    for (const e of olay) if (e.id !== 'coin') m.cal(e.id, e.kazanc);
    if (yigin > 0) zincir = paraZinciriEkle(zincir, t, yigin);
    while (zincir.length && zincir[0] <= t) {
      zincir.shift();
      m.cal('coin');
    }
  });

  return () => {
    cikar();
    if (typeof window !== 'undefined') for (const o of olaylar) window.removeEventListener(o, ac);
  };
}
