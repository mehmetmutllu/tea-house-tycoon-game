/**
 * kasa.ts — KAT 1'İN KASASI (K2-4, D-174 ②: "Kat 2'deyken Kat 1 çalışır, kasada birikir, kasa dolunca durur").
 *
 * Oyuncu Kat 2'deyken Kat 1'de kendiliğinden toplanan para (bugün `tick.coinSystem`in oto-toplaması,
 * 180 sn) cüzdana değil KASAYA girer. Kasanın sınırı vardır; sınırın üstü kasaya girmez (taşan ₺ —
 * kaybolur mu yerde mi bekler, kol sorusu: `docs/kat2-kasa-raporu-k2-4.md`). Oyuncu Kat 1'e inince
 * ya da kasanın yanına yürüyünce kasa cüzdana boşalır.
 *
 * SAF MODÜL: durum girer, yeni durum çıkar. Para Decimal (`decimal.ts`); store `kasa: Decimal` tutar.
 * Sınır sayısı burada YOK — `kasaSiniri` ona Kat 1'in dakika gelirinden türer, dakika sayısı config'e
 * (S2) yazılır. `null` sınır = sınırsız (bugünkü davranış).
 */
import { D, type Decimal, type Numberish } from './decimal';

/** Kasa sınırı: Kat 1'in dakika gelirinin `dakika` katı. `dakika` ≤ 0 ya da sonsuz → sınırsız (`null`). */
export function kasaSiniri(dakikaGeliri: Numberish, dakika: number): Decimal | null {
  if (!(dakika > 0) || !Number.isFinite(dakika)) return null;
  return D(dakikaGeliri).mul(dakika).floor();
}

export interface KasayaAtSonuc {
  kasa: Decimal;
  /** Kasaya sığan kısım. */
  giren: Decimal;
  /** Sınırın üstünde kalan kısım (kasaya girmedi). */
  tasan: Decimal;
}

/** Kasaya para atar; sınır doluysa fazlası `tasan`a çıkar. Negatif miktar yok sayılır. */
export function kasayaAt(kasa: Decimal, miktar: Numberish, sinir: Decimal | null): KasayaAtSonuc {
  const m = D(miktar);
  if (m.lte(0)) return { kasa, giren: D(0), tasan: D(0) };
  if (sinir === null) return { kasa: kasa.add(m), giren: m, tasan: D(0) };
  const bos = sinir.sub(kasa);
  const giren = bos.lte(0) ? D(0) : m.lt(bos) ? m : bos;
  return { kasa: kasa.add(giren), giren, tasan: m.sub(giren) };
}

/** Kasa cüzdana boşalır. */
export function kasaBosalt(kasa: Decimal, cuzdan: Decimal): { kasa: Decimal; cuzdan: Decimal; bosalan: Decimal } {
  return { kasa: D(0), cuzdan: cuzdan.add(kasa), bosalan: kasa };
}

/** Doluluk 0..1 (sayaç/çubuk için). Sınırsız kasa hep 0 döner (dolmaz). */
export function kasaDoluluk(kasa: Decimal, sinir: Decimal | null): number {
  if (sinir === null || sinir.lte(0)) return 0;
  return Math.min(1, kasa.div(sinir).toNumber());
}

export const kasaDolu = (kasa: Decimal, sinir: Decimal | null): boolean => sinir !== null && kasa.gte(sinir);

/**
 * Boşaltma tetiği — iki kol: `inis` = oyuncu Kat 1'e indiği anda; `yurume` = Kat 1'de kasanın
 * `erisim` yarıçapına girince (hareket temelli, dwell değil — `feedback_interaction_model`).
 */
export type BosaltmaKipi = 'inis' | 'yurume';
export function kasaBosaltilir(
  kip: BosaltmaKipi,
  g: { kat: 1 | 2; indi: boolean; x: number; z: number },
  yer: readonly [number, number],
  erisim: number,
): boolean {
  if (g.kat !== 1) return false;
  if (kip === 'inis') return g.indi;
  return Math.hypot(g.x - yer[0], g.z - yer[1]) <= erisim;
}
