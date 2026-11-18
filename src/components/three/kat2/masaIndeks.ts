/**
 * kat2/masaIndeks.ts — çizimin masa okuması için ortak, AYIRMASIZ yardımcılar (perf W3).
 *
 * `kat2Dunya.masalar` her tick yeni dizi; 22 masanın her biri kendi seçicisinde `.find` yapınca bir
 * `set` 22 × N tarama + dizgi üretimi ediyordu. Dizi kimliği başına BİR KEZ id → masa haritası kurulur;
 * seçiciler sayı döndürür (dizgi/dizi üretmez, `Object.is` karşılaştırması bedava).
 */
import type { Kat2Dunya } from '../../../game/kat2Dongu';
import { KAT2_MASALAR } from '../../../game/kat';

type Masa = Kat2Dunya['masalar'][number];

const indeksler = new WeakMap<readonly Masa[], Map<string, Masa>>();

/** `masalar` dizisinde id'li masa (dizi kimliği başına tek harita). */
export function masaBul(masalar: readonly Masa[], id: string): Masa | undefined {
  let h = indeksler.get(masalar);
  if (!h) {
    h = new Map();
    for (const m of masalar) h.set(m.id, m);
    indeksler.set(masalar, h);
  }
  return h.get(id);
}

const SIRA = new Map(KAT2_MASALAR.map((m, i) => [m.id, i]));

/** Oyundaki masaların bit maskesi (bit i = `KAT2_MASALAR[i]`); 22 masa 32 bite sığar. */
export function oyundaMaskesi(masalar: readonly Masa[]): number {
  let maske = 0;
  for (const m of masalar) {
    if (m.durum !== 'oyunda') continue;
    const i = SIRA.get(m.id);
    if (i !== undefined) maske |= 1 << i;
  }
  return maske;
}

/** Bir masanın `KAT2_MASALAR` sırası (maskeyi okumak için). */
export const masaSirasi = (id: string): number => SIRA.get(id) ?? -1;
