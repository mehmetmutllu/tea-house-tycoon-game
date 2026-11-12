/**
 * kat2-ortak.tsx — Kat 2 maket araçlarının (plan · eşya) paylaştığı parçalar: oturan müşteri,
 * sandalye/tabure, ilkel kutu/silindir. Dev aracı, oyuna girmez.
 */
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { AnimationMixer, MeshStandardMaterial, type Group, type SkinnedMesh } from 'three';
import { clone as skinKlon } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Model } from '../src/components/three/Model';
import { KLIP, basMi, ekipmanMi, kafaKucult, useKayKlipler } from '../src/components/three/KayActor';
import { PALETTE } from '../src/config/palette';
import { STOOL_S } from '../src/components/three/tableLook';
import { KAY_KOK, KAY_MUSTERI_GOVDE, KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, KAY_SCALE } from '../src/config/actor';

export const KAY_F = '/assets/models/kaykit-furniture-bits/';
export const KAY_R = '/assets/models/kaykit-restaurant-bits/';
export const SANDALYE_S = 0.82; // chair_A_wood oturağı ~0,55 → 0,45 (Kat 1 taburesiyle aynı oturak)
const GOMLEK = ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#4bacc6', '#d6b656', '#7f6084', '#e8e1d0'];

type V3 = [number, number, number];
export function Kutu({ w, h, d, renk, pos, rot }: { w: number; h: number; d: number; renk: string; pos: V3; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={renk} />
    </mesh>
  );
}
export function Silindir({ r1, r2, h, renk, pos, seg = 10, rot, em }: { r1: number; r2: number; h: number; renk: string; pos: V3; seg?: number; rot?: V3; em?: number }) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <cylinderGeometry args={[r1, r2, h, seg]} />
      <meshStandardMaterial color={renk} emissive={em ? renk : '#000'} emissiveIntensity={em ?? 0} />
    </mesh>
  );
}

/** Kat 1'in taburesi (Tables.Stool'un ölçüleri: oturak üstü 0,45, kırmızı minder). */
export function Tabure({ x, z }: { x: number; z: number }) {
  const s = 0.9 / 1.11;
  return (
    <group position={[x, 0, z]} scale={s}>
      <Silindir r1={0.23} r2={0.23} h={0.04} renk={PALETTE.stool} pos={[0, 0.03, 0]} />
      <Silindir r1={0.07} r2={0.07} h={0.42} renk={PALETTE.stool} pos={[0, 0.22, 0]} seg={8} />
      <Silindir r1={0.27} r2={0.25} h={0.11} renk={PALETTE.stool} pos={[0, 0.45, 0]} />
      <Silindir r1={0.25} r2={0.25} h={0.05} renk={PALETTE.stoolCushion} pos={[0, 0.53, 0]} />
    </group>
  );
}

/** tabure = Kat 1 greybox taburesi (kırmızı minder) · stool_wood/stool = Kat 1'in GERÇEK oturağı (KayKit; L0-1 çıplak, L2+ mavi minderli). */
export type Oturak = 'chair_A_wood' | 'chair_B_wood' | 'tabure' | 'stool_wood' | 'stool';
export function Sandalye({ x, z, aci, kisi, i, tip = 'chair_A_wood' }: { x: number; z: number; aci: number; kisi: boolean; i: number; tip?: Oturak }) {
  return (
    <group>
      {tip === 'tabure' ? (
        <Tabure x={x} z={z} />
      ) : tip === 'stool_wood' || tip === 'stool' ? (
        <group position={[x, 0, z]}>
          <Model src={`${KAY_F}${tip === 'stool' ? 'chair_stool' : 'chair_stool_wood'}.gltf`} scale={STOOL_S} fallback={<Tabure x={0} z={0} />} />
        </group>
      ) : (
        <group position={[x, 0, z]} rotation={[0, aci, 0]}>
          <Model src={`${KAY_F}${tip}.gltf`} scale={SANDALYE_S} fallback={null} />
        </group>
      )}
      {kisi && <Oturan x={x} z={z} aci={aci} i={i} />}
    </group>
  );
}

/** Oturan müşteri: oyunun müşteri gövdesi (Customers.yuvaKur'un sade hâli). */
export function Oturan({ x, z, aci, i }: { x: number; z: number; aci: number; i: number }) {
  const yol = `${KAY_KOK}${KAY_MUSTERI_GOVDE[i % KAY_MUSTERI_GOVDE.length]}.glb`;
  const gltf = useGLTF(yol);
  const klipler = useKayKlipler();
  const { kok, mixer } = useMemo(() => {
    const k = skinKlon(gltf.scene) as Group;
    const govde = new MeshStandardMaterial({ color: GOMLEK[(i * 7) % GOMLEK.length], roughness: 0.85 });
    const pant = new MeshStandardMaterial({ color: PALETTE.pants, roughness: 0.85 });
    k.traverse((n) => {
      const m = n as SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      if (ekipmanMi(m.name)) m.visible = false;
      else if (!basMi(m.name)) m.material = /leg/i.test(m.name) ? pant : govde;
      m.castShadow = true;
    });
    kafaKucult(k);
    k.scale.setScalar(KAY_SCALE);
    const mx = new AnimationMixer(k);
    const klip = klipler.find((c) => c.name === KLIP.otur);
    if (klip) mx.clipAction(klip).play();
    mx.setTime((i % 9) * 0.37);
    return { kok: k, mixer: mx };
  }, [gltf, klipler, i]);
  useFrame((_, dt) => mixer.update(dt));
  return (
    <primitive
      object={kok}
      position={[x + Math.sin(aci) * KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, z + Math.cos(aci) * KAY_OTURMA_ILERI]}
      rotation={[0, aci, 0]}
    />
  );
}
