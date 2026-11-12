import { useGame } from '../../game/store';
import { gecisKarartma } from '../../game/kat';

/**
 * K2-2: merdiven geçişinin perdesi — ekran kararır, kat değişir, açılır (`kat.GECIS_SN`).
 * Dokunmayı yutmaz: geçiş kısa ve o sırada girdi zaten yok sayılıyor (store.tick).
 */
export function KatPerdesi() {
  const o = useGame((s) => gecisKarartma(s.katGecis));
  if (o <= 0) return null;
  return <div className="kat-perdesi" style={{ opacity: o }} aria-hidden />;
}
