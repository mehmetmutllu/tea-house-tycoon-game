/**
 * gorevPano.ts — G-120 (S5, kullanıcı kararı M1 + M2) görev arayüzünün SAF mantığı.
 *
 *   M1 · alttaki bant büyük karta döner: "GÖREV n/N" · başlık · ilerleme çubuğu · ödül · "sırada" (2).
 *   M2 · Görevler sekmesi aktif görevle açılır → sıradaki 3 → tamamlananlar (katlı) → günlükler (tek satır).
 *
 * Kat 1 ve Kat 2 aynı biçime (`HatGorevi`) çevrilir, bileşen kat bilmez. Kullanıcı "sonra belki
 * değiştiririz" dedi: düzen yalnız buradaki sıradan ve `GorevKarti.tsx`ten okunur — geri almak iki dosya.
 * Bekçi: tests/s5-ux2.test.ts.
 */
import type { QuestTarget } from '../../config/economy.config';
import type { Kat2GorevDef } from '../../game/kat2Gorev';

/** Hattın bir adımı, katından bağımsız. `yukseltme`: mevcut bir şeyi büyüten adım (sarı durak). */
export interface HatGorevi {
  id: string;
  title: string;
  reward: number | null;
  yukseltme: boolean;
}

/** Kat 1'de "yükseltme durağı" sayılan hedefler: yeni şey açmaz, var olanın seviyesini artırır. */
const KAT1_YUKSELTME: ReadonlySet<QuestTarget['type']> = new Set([
  'stationLevel', 'tableLevel', 'tablesAtLevel', 'waiterSpeed', 'waiterTray', 'charStat', 'lavaboLevel',
]);

export function kat1Hat(quests: readonly { id: string; title: string; reward?: number | null; target: QuestTarget }[]): HatGorevi[] {
  return quests.map((q) => ({ id: q.id, title: q.title, reward: q.reward ?? null, yukseltme: KAT1_YUKSELTME.has(q.target.type) }));
}

export function kat2Hat(gorevler: readonly Kat2GorevDef[]): HatGorevi[] {
  return gorevler.map((g) => ({ id: g.id, title: g.title, reward: g.reward, yukseltme: g.hedef.tip === 'masaSv' }));
}

/** Aktif görevin (id ile) ardından gelen en çok `adet` adım. Görev hatta yoksa boş. */
export function siradakiler(hat: readonly HatGorevi[], aktifId: string, adet: number): HatGorevi[] {
  const i = hat.findIndex((g) => g.id === aktifId);
  return i < 0 ? [] : hat.slice(i + 1, i + 1 + adet);
}

/** M1 kartında "sırada" kaç adım görünür (ekran yükü: iki çip). */
export const KART_SIRADA = 2;
/** M2 sekmesinde sıradaki kaç adım listelenir. */
export const SEKME_SIRADA = 3;

export interface KartVerisi {
  /** 1 tabanlı sıra ("GÖREV 4/29"); hatta yoksa null. */
  no: number | null;
  toplam: number;
  /** İlerleme yüzdesi 0–100 (sayaçsız görevde null — çubuk çizilmez). */
  yuzde: number | null;
  cur: number | null;
  total: number | null;
  reward: number | null;
  sirada: HatGorevi[];
}

/** M1 kartının gösterdiği her değer — bileşen yalnız bunu çizer. */
export function kartVerisi(
  aktif: { id: string; cur: number | null; total: number | null; reward: number | null },
  hat: readonly HatGorevi[],
): KartVerisi {
  const i = hat.findIndex((g) => g.id === aktif.id);
  const sayacli = aktif.total != null && aktif.total > 0;
  const cur = sayacli ? Math.max(0, Math.min(aktif.cur ?? 0, aktif.total!)) : null;
  return {
    no: i < 0 ? null : i + 1,
    toplam: hat.length,
    yuzde: sayacli ? (cur! / aktif.total!) * 100 : null,
    cur,
    total: sayacli ? aktif.total : null,
    reward: aktif.reward,
    sirada: siradakiler(hat, aktif.id, KART_SIRADA),
  };
}

export type SekmeBolumu =
  | { tur: 'aktif' }
  | { tur: 'bitti' }
  | { tur: 'sirada'; gorevler: HatGorevi[] }
  | { tur: 'tamamlanan'; gorevler: HatGorevi[] }
  | { tur: 'gunluk' };

/**
 * M2 sekme düzeni: aktif (yoksa "hat bitti") → sıradaki 3 → tamamlananlar (yeniden eskiye) → günlükler EN ALTTA.
 * `aktifId` null = hat bitti; `yapilan` = hattın tamamlanan adım sayısı.
 */
export function sekmeDuzeni(hat: readonly HatGorevi[], aktifId: string | null, yapilan: number): SekmeBolumu[] {
  const b: SekmeBolumu[] = [aktifId != null ? { tur: 'aktif' } : { tur: 'bitti' }];
  const sira = aktifId != null ? siradakiler(hat, aktifId, SEKME_SIRADA) : [];
  if (sira.length > 0) b.push({ tur: 'sirada', gorevler: sira });
  const biten = hat.slice(0, Math.max(0, Math.min(yapilan, hat.length))).reverse();
  if (biten.length > 0) b.push({ tur: 'tamamlanan', gorevler: biten });
  b.push({ tur: 'gunluk' });
  return b;
}

/** Günlüklerin tek satırlık özeti: kaç görev, kaçının ödülü hazır, hepsi alındı mı. */
export function gunlukOzeti(gunler: readonly { state: string }[]): {
  toplam: number;
  hazir: number;
  bitti: boolean;
} {
  return {
    toplam: gunler.length,
    hazir: gunler.filter((g) => g.state === 'claimable').length,
    bitti: gunler.length > 0 && gunler.every((g) => g.state === 'claimed'),
  };
}
