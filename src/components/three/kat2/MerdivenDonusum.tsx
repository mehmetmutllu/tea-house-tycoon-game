/**
 * kat2/MerdivenDonusum.tsx — Kat 1'in MERDİVEN KOVASI ve DÖNÜŞÜM ANI (D-191/D-192). Merdiven pad'i
 * dolana dek yıkık merdiven + uyarı şeridi + dubalar; pad dolunca (aynı oturumda) yıkık takım yere
 * gömülür, toz kalkar, tamir edilmiş merdiven yerinde büyür. Yüklemede zaten açıksa doğrudan durur.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { MaketDuba, MaketMerdivenHarap, MaketUyariSeridi } from '../maketParts';
import { MerdivenTamir } from '../Kat2';
import { Dogus } from './Esya';

/** Yıkık takımın gömülme süresi · tozun ömrü (sn). */
const GOMUL = 0.45;
const TOZ = 0.9;
const TOZ_N = 10;

function YikikTakim({ stairZ, zf }: { stairZ: number; zf: number }) {
  return (
    <>
      <MaketMerdivenHarap pos={[0, 0, stairZ]} />
      <MaketUyariSeridi x1={-4.2} x2={4.2} z={zf - 0.1} />
      {[-3.6, 0, 3.6].map((x) => (
        <MaketDuba key={x} pos={[x, 0, zf - 0.25]} />
      ))}
    </>
  );
}

/** Gömülen yıkık takım + kovanın ağzında kalkan toz; bitince kendini kaldırır. */
function Gecis({ stairZ, zf, bitti }: { stairZ: number; zf: number; bitti: () => void }) {
  const yikik = useRef<Group>(null);
  const toz = useRef<Group>(null);
  const t = useRef(0);
  const tozlar = useMemo(
    () =>
      Array.from({ length: TOZ_N }, (_, i) => {
        const a = (i / TOZ_N) * Math.PI * 2;
        return { x: Math.cos(a) * 1.6 + (i % 3) * 0.4 - 0.4, z: zf - 1.6 + Math.sin(a) * 1.2, r: 0.35 + (i % 4) * 0.08 };
      }),
    [zf],
  );
  useFrame((_, dt) => {
    t.current += dt;
    const y = yikik.current;
    if (y) {
      const x = Math.min(1, t.current / GOMUL);
      y.scale.y = Math.max(0.001, 1 - x * x);
      y.visible = x < 1;
    }
    const g = toz.current;
    if (g) {
      const x = Math.min(1, t.current / TOZ);
      g.children.forEach((c, i) => {
        const m = c as Mesh;
        m.scale.setScalar(0.4 + x * 1.2);
        m.position.y = 0.3 + x * 1.1 + (i % 3) * 0.1;
        (m.material as MeshStandardMaterial).opacity = 0.55 * (1 - x);
      });
    }
    if (t.current >= TOZ) bitti();
  });
  return (
    <group>
      <group ref={yikik}>
        <YikikTakim stairZ={stairZ} zf={zf} />
      </group>
      <group ref={toz}>
        {tozlar.map((p, i) => (
          <mesh key={i} position={[p.x, 0.3, p.z]}>
            <sphereGeometry args={[p.r, 8, 6]} />
            <meshStandardMaterial color="#d9cbb2" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function MerdivenKovasi({ acik, stairZ, zf }: { acik: boolean; stairZ: number; zf: number }) {
  // Bileşen kurulurken kapalıydı ve şimdi açıksa = oturumda açıldı → dönüşüm oynar.
  const ilkAcik = useRef(acik);
  const [gecis, setGecis] = useState(true);
  if (!acik) return <YikikTakim stairZ={stairZ} zf={zf} />;
  const donusum = !ilkAcik.current;
  return (
    <>
      <Dogus dogus={donusum} pos={[0, 0, stairZ]}>
        <MerdivenTamir pos={[0, 0, stairZ]} />
      </Dogus>
      {donusum && gecis && <Gecis stairZ={stairZ} zf={zf} bitti={() => setGecis(false)} />}
    </>
  );
}
