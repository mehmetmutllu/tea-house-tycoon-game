/**
 * kat2/kademeliMontaj.tsx — Kat 2 ÖN KURULUMUNDA ağır listeleri kare başına bir öğe kurar (tarama 2026-11-18 #6).
 *
 * Kat 1'deyken arkada kurulan Kat 2'nin en ağır parçası 22 masa (eşya + grup gövdesi klonları); hepsi tek
 * commit'te kurulunca Kat 1'de ~1,8 sn'lik tek kare donuyordu (4× CPU, DEV). Ön kurulum sırasında her karede
 * bir öğe açılır. Öğe kendi kapısına abonedir: açılan öğe yalnız kendini çizer, listeyi (ve kurulmuş kardeşlerini)
 * yeniden render etmez. Oyuncu Kat 2'deyken ya da ön kurulum bittiyse kapı yok — davranış eskisiyle aynı.
 */
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';

type Sayac = { n: number; dinleyici: Set<() => void> };
const KademeliBaglam = createContext<Sayac | null>(null);
const bos = () => () => {};

/** `acik`: Kat 2 şu an Kat 1'in arkasında ön kuruluyor — `KademeliOge`ler kare başına bir açılsın. */
export function KademeliMontaj({ acik, children }: { acik: boolean; children: ReactNode }) {
  const sayac = useMemo<Sayac>(() => ({ n: 0, dinleyici: new Set() }), []);
  useFrame(() => {
    if (!acik) return;
    sayac.n++;
    for (const f of sayac.dinleyici) f();
  });
  return <KademeliBaglam.Provider value={acik ? sayac : null}>{children}</KademeliBaglam.Provider>;
}

/** Listenin `sira`ncı öğesi: kademeli kurulumda `sira`ncı karede açılır, değilse hemen. */
export function KademeliOge({ sira, children }: { sira: number; children: ReactNode }) {
  const s = useContext(KademeliBaglam);
  const abone = useCallback(
    (f: () => void) => {
      if (!s) return bos();
      s.dinleyici.add(f);
      return () => s.dinleyici.delete(f);
    },
    [s],
  );
  const acik = useSyncExternalStore(abone, () => !s || s.n > sira);
  return acik ? children : null;
}
