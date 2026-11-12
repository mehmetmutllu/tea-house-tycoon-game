/**
 * kat2/parca.tsx — Kat 2 çiziminin küçük ortak parçaları (maket araçlarının `kat2-ortak`ından
 * oyuna taşındı; tek fark: oyun ağacına girer). Ölçü yazmaz, yalnız ilkel kutu/silindir.
 */
import { MeshStandardMaterial } from 'three';

type V3 = [number, number, number];

/**
 * Renk başına TEK materyal (modül önbelleği): masa, ocak ve fincanlar aynı birkaç rengi
 * tekrar tekrar kullanıyor — her kopyaya ayrı materyal kurmak boşuna program/uniform yükü.
 */
const MATLAR = new Map<string, MeshStandardMaterial>();
export function renkMat(renk: string, em = 0): MeshStandardMaterial {
  const k = `${renk}|${em}`;
  let m = MATLAR.get(k);
  if (!m) {
    m = new MeshStandardMaterial({ color: renk, emissive: em ? renk : '#000000', emissiveIntensity: em });
    MATLAR.set(k, m);
  }
  return m;
}

export function Kutu({ w, h, d, renk, pos, rot, golge = true }: { w: number; h: number; d: number; renk: string; pos: V3; rot?: V3; golge?: boolean }) {
  return (
    <mesh position={pos} rotation={rot} castShadow={golge} receiveShadow material={renkMat(renk)}>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

export function Silindir({ r1, r2, h, renk, pos, seg = 10, rot, em, golge = true }: { r1: number; r2: number; h: number; renk: string; pos: V3; seg?: number; rot?: V3; em?: number; golge?: boolean }) {
  return (
    <mesh position={pos} rotation={rot} castShadow={golge} material={renkMat(renk, em)}>
      <cylinderGeometry args={[r1, r2, h, seg]} />
    </mesh>
  );
}

/** Türk kahvesi fincanı (tabaklı, köpüklü) — ocakta, tepside ve masada aynı nesne. */
export function Fincan({ pos, s = 1 }: { pos: V3; s?: number }) {
  return (
    <group position={pos} scale={s}>
      <Silindir r1={0.062} r2={0.058} h={0.01} renk="#f4f1ea" pos={[0, 0.005, 0]} seg={12} golge={false} />
      <Silindir r1={0.042} r2={0.03} h={0.06} renk="#f4f1ea" pos={[0, 0.04, 0]} seg={10} />
      <Silindir r1={0.036} r2={0.036} h={0.004} renk="#7a4a2a" pos={[0, 0.069, 0]} seg={10} golge={false} />
    </group>
  );
}
