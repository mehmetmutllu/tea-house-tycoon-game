/**
 * kat2/gorselSecim.ts — GÖSTER-SEÇ KARE SETİ (K2-S1 · ajan A). Kullanıcı üç soruyu metinle değil
 * görerek seçecek: kahve balonu · para yığını · arka duvarın üstü. Her sorunun adayları AYNI
 * oyun kadrajında çizilsin diye seçim sorgu dizesinden gelir (yalnız DEV):
 *
 *   ?k2gorsel=balon:B,para:C,dis:A
 *
 * Verilmeyen soru varsayılan adayda kalır. Üretimde sorgu okunmaz, varsayılanlar çizilir; seçim
 * yapılınca kazanan aday varsayılan olur, öbürleri silinir (S2).
 */
export type BalonAday = 'A' | 'B' | 'C' | 'D';
export type ParaAday = 'A' | 'B' | 'C' | 'D';
export type DisAday = 'A' | 'B' | 'C' | 'D';

export interface Kat2Gorsel {
  balon: BalonAday;
  para: ParaAday;
  dis: DisAday;
}

const VARSAYILAN: Kat2Gorsel = { balon: 'A', para: 'A', dis: 'A' };
const GECERLI = new Set(['A', 'B', 'C', 'D']);

function oku(): Kat2Gorsel {
  if (!import.meta.env.DEV || typeof location === 'undefined') return VARSAYILAN;
  const q = new URLSearchParams(location.search).get('k2gorsel');
  if (!q) return VARSAYILAN;
  const out = { ...VARSAYILAN };
  for (const parca of q.split(',')) {
    const [soru, aday] = parca.split(':');
    if ((soru === 'balon' || soru === 'para' || soru === 'dis') && GECERLI.has(aday)) out[soru] = aday as BalonAday;
  }
  return out;
}

/** Sayfa ömrü boyunca sabit (sorgu dizesi değişmez). */
export const K2_GORSEL: Kat2Gorsel = oku();
