/**
 * kat2/Bolme.tsx — ALANLAR ARASI DUVAR (D-191: bölme yok). Hat yalnız bir yanı açıkken çizilir: kapalı
 * alanın önünde boydan boya TAM BOY sıva duvar (arkada kaba inşaat). İki yanı açılınca duvar kalkar:
 * kısa bir titreşimden sonra yere gömülür. Yeni beliren duvar (bir sonraki kapalı alanın önü) yerden yükselir.
 * Çarpışma `kat.kat2Duvarlar` ile aynı kural (`kat2DuvarVar`) — animasyon yalnız görüntü, katı gövde anında değişir.
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { KAT2_BOLMELER, kat2DuvarVar } from '../../../game/kat';
import { MaketWall } from '../maketParts';
import { WALL_H } from '../wallOlcu';

/** Kalkış: titreşim + gömülme süresi (sn). */
const TITRE = 0.35;
const GOMUL = 0.75;
/** Beliriş: yerden yükselme süresi (sn). */
const YUKSEL = 0.6;

type Hal = 'dur' | 'kalk' | 'cik';

function Duvar({ i, hal, bitti }: { i: number; hal: Hal; bitti: (i: number) => void }) {
  const b = KAT2_BOLMELER[i];
  const ref = useRef<Group>(null);
  const t = useRef(0);
  const yatay = b.z1 === b.z2;
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || hal === 'dur') return;
    t.current += dt;
    if (hal === 'cik') {
      const x = Math.min(1, t.current / YUKSEL);
      g.scale.y = Math.max(0.001, 1 - (1 - x) ** 3);
      if (x >= 1) bitti(i);
      return;
    }
    if (t.current < TITRE) {
      const s = Math.sin(t.current * 70) * 0.05 * (1 - t.current / TITRE);
      g.position.set(yatay ? 0 : s, 0, yatay ? s : 0);
      return;
    }
    g.position.set(0, 0, 0);
    const x = Math.min(1, (t.current - TITRE) / GOMUL);
    g.scale.y = Math.max(0.001, 1 - x * x);
    if (x >= 1) bitti(i);
  });
  return (
    <group ref={ref} scale={[1, hal === 'cik' ? 0.001 : 1, 1]}>
      <MaketWall x1={b.x1} z1={b.z1} x2={b.x2} z2={b.z2} h={WALL_H} />
    </group>
  );
}

export function Bolmeler({ acikAlan }: { acikAlan: number }) {
  // Kata girildiğindeki duvarlar doğrudan durur; oturumda değişenler animasyonla gelir/gider.
  const onceki = useRef(acikAlan);
  const [haller, setHaller] = useState<Map<number, Hal>>(
    () => new Map(KAT2_BOLMELER.flatMap((b, i) => (kat2DuvarVar(b, acikAlan) ? [[i, 'dur' as Hal]] : []))),
  );
  useEffect(() => {
    const eski = onceki.current;
    if (eski === acikAlan) return;
    onceki.current = acikAlan;
    setHaller((m) => {
      const n = new Map(m);
      KAT2_BOLMELER.forEach((b, i) => {
        const vardi = kat2DuvarVar(b, eski);
        const var_ = kat2DuvarVar(b, acikAlan);
        if (vardi && !var_) n.set(i, 'kalk');
        else if (!vardi && var_) n.set(i, acikAlan > eski ? 'cik' : 'dur');
      });
      return n;
    });
  }, [acikAlan]);
  const bitti = (i: number) =>
    setHaller((m) => {
      const h = m.get(i);
      if (h === 'dur' || h === undefined) return m;
      const n = new Map(m);
      if (h === 'kalk') n.delete(i);
      else n.set(i, 'dur');
      return n;
    });
  return (
    <group>
      {[...haller].map(([i, hal]) => (
        <Duvar key={`${i}-${hal === 'kalk' ? 'k' : 'd'}`} i={i} hal={hal} bitti={bitti} />
      ))}
    </group>
  );
}
