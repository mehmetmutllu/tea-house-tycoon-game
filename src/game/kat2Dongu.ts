/**
 * kat2Dongu.ts — KAT 2'NİN OYUN DÖNGÜSÜ (K2-3): okey masası + Türk kahvesi + cezve ocağı.
 *
 * Kat 1'den farkı (kat2-plan §2): müşteri tek tek değil DÖRTLÜ GRUP gelir, masada uzun oturur
 * (okey), oturduğu sürece ara ara KAHVE ister, kalkarken masa ücretini + içtiği kahvelerin
 * parasını TEK YIĞIN olarak masanın önüne bırakır → "seyrek + büyük para".
 *
 * SAF MODÜL: durum girer, yeni durum + kazanç/harcama çıkar. Store ve ölçüm aracı (`tools/
 * olcum-kat2-dongu.ts`) aynı fonksiyonu sürer. Denge sayıları `Kat2Ayar` ile DIŞARIDAN gelir —
 * ölçüm aracı kolları config'e yazmadan koşar (D-084 varyant kapısı).
 *
 * Kumar YOK: masada para/jeton görünmez; ücret "masa ücreti"dir (kat2-plan §2).
 */
import { OCAK, OKEY_ERISIM, OKEY_YER, PARA_DUSME_DZ } from './kat';
import { inFrame, padCercevesi } from './markerFrame';
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
}

export type MasaDurum = 'kapali' | 'bos' | 'geliyor' | 'oyunda';

export interface OkeyMasa {
  id: string;
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

/** Kat 2'nin anlık dünyası. Kalıcı olan yalnız `padsDone` (kayıtta `kat2.padsDone`); gerisi transient. */
export interface Kat2Dunya {
  masalar: OkeyMasa[];
  ocakHazir: number;
  demT: number;
  /** Oyuncunun tepsisindeki kahve. */
  tepsi: number;
  paralar: ParaYigini[];
  padFill: Record<string, number>;
  nextId: number;
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
  };
}

export const ocakAcik = (padsDone: readonly string[]): boolean => padsDone.includes(OCAK.id);

/** Pad'in yeri: okey pad'i masanın yerinde (masa orada belirir), ocak pad'i ocağın önünde. */
export function kat2PadYeri(id: string): [number, number] {
  if (id === OCAK.id) return OCAK.al;
  const m = OKEY_YER.find((o) => o.id === id);
  if (!m) throw new Error(`Kat 2 pad yeri yok: ${id}`);
  return [m.x, m.z];
}

/** Sıradaki (görünen) pad — zincir tek hat: önceki bitmeden sonraki çıkmaz. */
export function kat2SiradakiPad(ayar: Kat2Ayar, padsDone: readonly string[]) {
  return ayar.padler.find((p) => !padsDone.includes(p.id)) ?? null;
}

export function yeniKat2Dunya(padsDone: readonly string[], ayar: Kat2Ayar): Kat2Dunya {
  return {
    masalar: OKEY_YER.map((o) => ({
      id: o.id,
      durum: padsDone.includes(o.id) ? 'bos' : 'kapali',
      t: ayar.gelisAralik,
      kahveT: 0,
      istek: 0,
      sabir: 0,
      birikim: 0,
    })),
    ocakHazir: 0,
    demT: 0,
    tepsi: 0,
    paralar: [],
    padFill: {},
    nextId: 1,
  };
}

/** Pad etiketi (çerçeve ölçüsü etikete bağlı — Kat 1'in `padCercevesi` dili). */
export const kat2PadEtiket = (id: string): string => (id === OCAK.id ? t('Cezve Ocağı') : t('Okey Masası'));

/** Bir adım. `d` değiştirilmez; yeni dünya döner. */
export function kat2Tick(d0: Kat2Dunya, g: Kat2Girdi, dt: number, ayar: Kat2Ayar): Kat2Cikti {
  const d: Kat2Dunya = {
    ...d0,
    masalar: d0.masalar.map((m) => ({ ...m })),
    paralar: d0.paralar.slice(),
    padFill: { ...d0.padFill },
  };
  let padsDone = g.padsDone as string[];
  const olay: Kat2Cikti['olay'] = { servis: 0, kacan: 0, kalkis: 0, istek: 0, padBitti: null, dusen: [] };
  let kazanc = 0;
  let harcama = 0;
  const ocak = ocakAcik(padsDone);

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

  // ---- CEZVE: hazır fincan kuyruğu dolana dek pişirir.
  if (ocak && d.ocakHazir < ayar.ocakKuyruk) {
    d.demT += dt;
    while (d.demT >= ayar.demleme && d.ocakHazir < ayar.ocakKuyruk) {
      d.demT -= ayar.demleme;
      d.ocakHazir += 1;
    }
  } else {
    d.demT = 0;
  }
  // Ocaktan al: önündeki noktada tepsi boşluğu kadar.
  if (ocak && d.ocakHazir > 0 && Math.hypot(g.x - OCAK.al[0], g.z - OCAK.al[1]) <= OCAK.erisim) {
    const al = Math.min(d.ocakHazir, g.tepsiKap - d.tepsi);
    if (al > 0) {
      d.ocakHazir -= al;
      d.tepsi += al;
    }
  }

  // ---- MASALAR
  d.masalar.forEach((m, i) => {
    const yer = OKEY_YER[i];
    if (m.durum === 'kapali') return;
    m.t -= dt;
    if (m.durum === 'bos') {
      if (m.t <= 0) {
        m.durum = 'geliyor';
        m.t += ayar.yurume; // taşan kesir korunur (dt'den bağımsız süre)
      }
      return;
    }
    if (m.durum === 'geliyor') {
      if (m.t <= 0) {
        m.durum = 'oyunda';
        m.t += ayar.oturum;
        m.kahveT = ayar.kahveAralik;
        m.istek = 0;
        m.birikim = 0;
      }
      return;
    }
    // oyunda
    if (ocak) {
      if (m.istek > 0) {
        // Servis: tepside kahve + masanın erişiminde.
        if (d.tepsi > 0 && Math.max(Math.abs(g.x - yer.x), Math.abs(g.z - yer.z)) <= OKEY_ERISIM) {
          const n = Math.min(d.tepsi, m.istek);
          d.tepsi -= n;
          m.istek -= n;
          m.birikim += n * ayar.kahveFiyat;
          olay.servis += n;
          if (m.istek === 0) m.kahveT = ayar.kahveAralik;
        }
        if (m.istek > 0) {
          m.sabir -= dt;
          if (m.sabir <= 0) {
            olay.kacan += m.istek;
            m.istek = 0;
            m.kahveT = ayar.kahveAralik;
          }
        }
      } else {
        m.kahveT -= dt;
        // Oyunun son anlarında istenmez: getirilecek vakit yok.
        if (m.kahveT <= 0 && m.t > ayar.kahveSabir * 0.5) {
          m.istek = ayar.istekAdet;
          m.sabir = ayar.kahveSabir;
          olay.istek += ayar.istekAdet;
        }
      }
    }
    if (m.t <= 0) {
      // Oyun bitti: ücret + kahve parası tek yığın, masa boşalır, yeni grup gelir.
      olay.kacan += m.istek;
      const miktar = ayar.masaUcreti + m.birikim;
      d.paralar.push({ id: d.nextId++, x: yer.x, z: yer.z + PARA_DUSME_DZ, miktar });
      olay.dusen.push(miktar);
      olay.kalkis += 1;
      m.durum = 'bos';
      m.t += ayar.gelisAralik;
      m.istek = 0;
      m.birikim = 0;
    }
  });

  // ---- PARA: mıknatıs yarıçapına giren yığın toplanır.
  if (d.paralar.length) {
    d.paralar = d.paralar.filter((p) => {
      if (Math.hypot(g.x - p.x, g.z - p.z) <= g.miknatis) {
        kazanc += p.miktar;
        return false;
      }
      return true;
    });
  }

  return { dunya: d, padsDone, kazanc, harcama, olay };
}
