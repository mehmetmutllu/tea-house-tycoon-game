/**
 * kat2/TozDonusumu.tsx — AÇILIŞIN DÖNÜŞÜM ANI (D-193 merdiveninden; G-117 lavabo da aynı dille). Eski takım
 * (yıkık merdiven / tadilat perdesi + kaba inşaat) yere gömülür, yerinde toz kalkar; bitince kendini kaldırır.
 * Yeni obje çağıranda `Dogus` ile yerinde büyür. Toz öbekleri `yapiOlcu.tozNoktalari`.
 */
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { tozNoktalari } from './yapiOlcu';

/** Eski takımın gömülme süresi · tozun ömrü (sn). */
const GOMUL = 0.45;
const TOZ = 0.9;

export function TozDonusumu({
  merkez,
  yaricap,
  n = 10,
  bitti,
  children,
}: {
  merkez: readonly [number, number];
  yaricap: readonly [number, number];
  n?: number;
  bitti: () => void;
  children: ReactNode;
}) {
  const eski = useRef<Group>(null);
  const toz = useRef<Group>(null);
  const t = useRef(0);
  const tozlar = useMemo(() => tozNoktalari(merkez, yaricap, n), [merkez, yaricap, n]);
  useFrame((_, dt) => {
    t.current += dt;
    const y = eski.current;
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
      <group ref={eski}>{children}</group>
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
