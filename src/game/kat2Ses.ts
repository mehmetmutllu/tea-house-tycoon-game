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
 *  - Ortam (takırtı/zar) olay değil ZAMANLAYICI: her oynayan masanın kendi rastgele saati + bütün masalar
 *    için ortak `ORTAM_ARALIK`; birden çok masa sıradaysa en YAKINI çalar, gerisi bir sonraki tura kayar.
 *  - Sessiz kip/seviye: her güncellemede `settings`ten motora (Kat 1 ile aynı satır). Arka plan/reklam:
 *    web arka ucu `sesDuraklatildi` iken çalmaz; zamanlayıcı da o sürede ses ÜRETMEZ (dönüşte birikmiş
 *    takırtı patlamasın).
 */
import { economyConfig } from '../config/economy.config';
import { sesMotoruKur, SES_KATALOG, type SesId, type SesMotoru } from './audio';
import {
  KAT2_SES_KATALOG, MASA_ARALIK, ORTAM_ARALIK, yakinlik, type Kat2SesId,
} from './audioKat2';
import { sesDuraklatildi, webSesArkaUcu } from './audioWeb';
import type { Decimal } from './decimal';
import { KAT2_MASALAR, OCAKLAR, kat2AcikAlan, type KatNo, type MasaTuru } from './kat';
import { useGame } from './store';

type Durum = ReturnType<typeof useGame.getState>;

/** Kat 2'nin çalabildiği her ses: kendi kataloğu + Kat 1'den yeniden kullanılanlar. */
export type Kat2CalId = Kat2SesId | Extract<SesId, 'coin' | 'serve' | 'pour' | 'padFill'>;

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
  /** Dünya sürekliliği (`Kat2Dunya.nextId`): geri giderse dünya yeniden kuruldu. */
  nextId: number;
  tepsi: number;
  birikimToplam: number;
  istekToplam: number;
  paraIdleri: readonly number[];
  ocakHazir: readonly number[];
  kasa: Decimal;
  cuzdan: Decimal;
  x: number;
  z: number;
  /** Oyunda olan masalar (ortam zamanlayıcısı için). */
  oynayan: readonly { id: string; tur: MasaTuru; x: number; z: number }[];
}

const HAZIR: readonly string[] = economyConfig.kat2.hazir;
const MASA_YERI = new Map(KAT2_MASALAR.map((m) => [m.id, m]));

/** Masa Sv toplamı — `kat2.masaSv` Ajan A'nın additive alanı; yoksa (eski kayıt / A öncesi) 0. */
const svToplami = (kat2: unknown): number => {
  const sv = (kat2 as { masaSv?: Readonly<Record<string, number>> }).masaSv;
  return sv ? Object.values(sv).reduce((a, b) => a + b, 0) : 0;
};

export function kat2KesitAl(s: Durum): Kat2SesKesit {
  const d = s.kat2Dunya;
  const oynayan: { id: string; tur: MasaTuru; x: number; z: number }[] = [];
  let birikimToplam = 0;
  let istekToplam = 0;
  for (const m of d.masalar) {
    birikimToplam += m.birikim;
    istekToplam += m.istek;
    if (m.durum !== 'oyunda') continue;
    const y = MASA_YERI.get(m.id);
    if (y) oynayan.push({ id: m.id, tur: m.tur, x: y.x, z: y.z });
  }
  return {
    kat: s.kat,
    gecis: s.katGecis != null,
    acik: s.kat2.acik,
    hazirda: s.kat2.padsDone.every((id) => HAZIR.includes(id)),
    padSayisi: s.kat2.padsDone.length,
    acikAlan: kat2AcikAlan(s.kat2.padsDone),
    svToplam: svToplami(s.kat2),
    nextId: d.nextId,
    tepsi: d.tepsi,
    birikimToplam,
    istekToplam,
    paraIdleri: d.paralar.map((p) => p.id),
    ocakHazir: d.ocaklar.map((o) => o.hazir),
    kasa: s.kasa,
    cuzdan: s.wallet,
    x: s.player[0],
    z: s.player[2],
    oynayan,
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
  // Kat 1 kasası cüzdana boşaldı (sıfırlamada kasa da düşer ama cüzdan artmaz → sessiz).
  if (s.kat === 1 && s.kasa.lt(onceki.kasa) && s.cuzdan.gt(onceki.cuzdan)) cal('k2kasa');

  if (s.kat !== 2 || onceki.kat !== 2 || s.nextId < onceki.nextId) return o;
  if (s.svToplam > onceki.svToplam) cal('k2sv');
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
  // Para: önceki karede olan bir yığın kayboldu (yalnız oyuncu toplar).
  const simdi = new Set(s.paraIdleri);
  if (onceki.paraIdleri.some((id) => !simdi.has(id))) cal('coin');
  return o;
}

/**
 * ORTAM ZAMANLAYICISI — takırtı (okey) ve zar (tavla). Durumlu; saat ve rastgele DIŞARIDAN (test).
 * `adim` her güncellemede çağrılır, en çok BİR ortam sesi döner.
 */
export function ortamZamanlayici(rastgele: () => number = Math.random) {
  const sonraki = new Map<string, number>();
  let sonOrtam = -Infinity;
  const aralik = () => MASA_ARALIK[0] + rastgele() * (MASA_ARALIK[1] - MASA_ARALIK[0]);
  return {
    adim(t: number, s: Kat2SesKesit): Kat2SesOlay | null {
      if (s.kat !== 2 || s.gecis) {
        // Kat 2'de değilken saatler durur; dönüşte her masa yeniden rastgele gecikmeyle başlar.
        sonraki.clear();
        return null;
      }
      const oynayan = new Set(s.oynayan.map((m) => m.id));
      for (const id of [...sonraki.keys()]) if (!oynayan.has(id)) sonraki.delete(id);
      for (const m of s.oynayan) if (!sonraki.has(m.id)) sonraki.set(m.id, t + aralik());
      if (t - sonOrtam < ORTAM_ARALIK) return null;
      let enIyi: { id: Kat2SesId; kazanc: number; masa: string } | null = null;
      for (const m of s.oynayan) {
        if ((sonraki.get(m.id) ?? Infinity) > t) continue;
        const k = yakinlik(Math.hypot(s.x - m.x, s.z - m.z));
        // Duyulmayacak kadar uzak masanın saati yine kurulur: birikip oyuncu yaklaşınca hep birden çalmasın.
        if (k <= 0) { sonraki.set(m.id, t + aralik()); continue; }
        if (!enIyi || k > enIyi.kazanc) enIyi = { id: m.tur === 'okey' ? 'k2takirti' : 'k2zar', kazanc: k, masa: m.id };
      }
      if (!enIyi) return null;
      sonraki.set(enIyi.masa, t + aralik());
      sonOrtam = t;
      return { id: enIyi.id, kazanc: enIyi.kazanc };
    },
  };
}

/** Kat 2'nin birleşik kataloğu: kendi sesleri + Kat 1'den yeniden kullanılanlar (aynı tanım, aynı tampon). */
const KATALOG: Record<Kat2CalId, (typeof SES_KATALOG)[SesId]> = {
  ...KAT2_SES_KATALOG,
  coin: SES_KATALOG.coin,
  serve: SES_KATALOG.serve,
  pour: SES_KATALOG.pour,
  padFill: SES_KATALOG.padFill,
};

export interface Kat2SesSecenek {
  motor?: SesMotoru<Kat2CalId>;
  saat?: () => number;
  rastgele?: () => number;
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
  const ortam = ortamZamanlayici(sec.rastgele);
  const bellek = yeniBellek();
  let onceki: Kat2SesKesit | null = null;

  const ac = () => m.kilidiAc();
  const olaylar = ['pointerdown', 'touchend', 'click', 'keydown'] as const;
  if (typeof window !== 'undefined') for (const o of olaylar) window.addEventListener(o, ac, { passive: true });

  const cikar = useGame.subscribe((s: Durum) => {
    m.ayarla(s.settings.sound, s.settings.soundVolume);
    const simdi = kat2KesitAl(s);
    const olay = kat2SesOlaylari(onceki, simdi, bellek);
    onceki = simdi;
    if (duraklatildi()) return;
    for (const e of olay) m.cal(e.id, e.kazanc);
    const o = ortam.adim(saat(), simdi);
    if (o) m.cal(o.id, o.kazanc);
  });

  return () => {
    cikar();
    if (typeof window !== 'undefined') for (const o of olaylar) window.removeEventListener(o, ac);
  };
}
