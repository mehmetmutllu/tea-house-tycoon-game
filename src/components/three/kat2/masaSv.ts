/**
 * kat2/masaSv.ts — masa seviyesinin çizimdeki TEK okuma yeri: görünüş store'daki `kat2.masaSv[masaId]`den
 * TÜRER (yok = 1, S3 sözleşmesi). Masa, oturan grup ve Sv işareti aynı değeri buradan okur.
 */
import { useGame } from '../../../game/store';
import { masaSvOku } from '../../../game/kat2Dongu';

type Durum = ReturnType<typeof useGame.getState>;
const BOS: Readonly<Record<string, number>> = {};

/** Bütün masaların seviyesi (nesne kimliği değişmedikçe yeniden çizim yok). */
export const masaSvleri = (s: Durum): Readonly<Record<string, number>> => s.kat2.masaSv ?? BOS;

export const useMasaSvleri = () => useGame(masaSvleri);
export const useMasaSv = (id: string): number => useGame((s) => masaSvOku(s.kat2.masaSv, id));
