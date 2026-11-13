/**
 * kat2/Bolme.tsx — SALONLAR ARASI BÖLMELER (D-180 tam bölme 2,2) + kemerli geçitler (maket `Bolmeler`).
 * Bölme en az bir yanı açıksa çizilir; iki yanı açıksa geçit açık, değilse geçit tahta perdeli.
 *
 * GÖSTER-SEÇ (K2-S2, yalnız DEV — `?k2bolme=A|B|C|D`, verilmezse bugünkü 2,2 bölme): oyuncu bölmenin
 * hemen arkasındayken (kameradan uzak yanında) görünmüyor. Kazanan seçilince öbürleri silinir.
 *  A · alçak bölme 1,2 (lambri + ince krem bant, geçit dikmeleri kısalır, lento yok)
 *  B · pencereli bölme: lambri dolu, üstü dikmeli açıklık + 2,2'de üst kiriş
 *  C · oyuncu yakınken bölmenin kameraya bakan parçası lambri boyuna iner (yerinde, yumuşak)
 *  D · bölme aynı; duvar arkasındaki oyuncu renkli silüetle görünür
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry, GreaterDepth, MathUtils, MeshBasicMaterial, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3,
  type InstancedMesh,
} from 'three';
import { KAT2_BOLMELER } from '../../../game/kat';
import { useGame } from '../../../game/store';
import { PALETTE } from '../../../config/palette';
import { MaketTadilatPerde, MaketWall } from '../maketParts';

export type BolmeAday = 'A' | 'B' | 'C' | 'D';

function adayOku(): BolmeAday | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search).get('k2bolme');
  return q === 'A' || q === 'B' || q === 'C' || q === 'D' ? q : null;
}

/** Sayfa ömrü boyunca sabit (sorgu dizesi değişmez). */
const ADAY = adayOku();

const KREM = '#e6d7b8';
const LAMBRI = '#6d4c41';
const BOY = 2.2;
const LAMBRI_H = 0.9;
type BolmeTanim = (typeof KAT2_BOLMELER)[number];

/** Lambri + çıta (MaketWall'un alt yarısı); bütün adaylarda ortak alt gövde. */
function Lambri({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  return (
    <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, Math.atan2(x2 - x1, z2 - z1), 0]}>
      <mesh position={[0, LAMBRI_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.22, LAMBRI_H, len]} />
        <meshStandardMaterial color={LAMBRI} />
      </mesh>
      <mesh position={[0, 0.94, 0]} receiveShadow>
        <boxGeometry args={[0.26, 0.08, len]} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
    </group>
  );
}

/** B · pencereli: lambri dolu, üstünde ~1,5 aralıklı dikmeler + 2,2'de kiriş (arası açık). */
function PencereliParca({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(len / 1.5));
  return (
    <group>
      <Lambri x1={x1} z1={z1} x2={x2} z2={z2} />
      <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, Math.atan2(x2 - x1, z2 - z1), 0]}>
        {Array.from({ length: n + 1 }, (_, i) => (
          <mesh key={i} position={[0, (0.98 + BOY - 0.2) / 2, -len / 2 + (i * len) / n]} castShadow>
            <boxGeometry args={[0.16, BOY - 0.2 - 0.98, 0.16]} />
            <meshStandardMaterial color={PALETTE.doorWood} />
          </mesh>
        ))}
        <mesh position={[0, BOY - 0.1, 0]} castShadow>
          <boxGeometry args={[0.24, 0.2, len]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
      </group>
    </group>
  );
}

// ---- C · oyuncuya yakın üst parça iner ----
const DILIM = 1.0;
/** Oyuncudan bu yatay mesafedeki dilim iner (tam), dışı tam boy. */
const C_YARICAP = 2.4;
/** Kameraya bakan yan: dilim oyuncunun en çok bu kadar arkasındaysa (−z) de iner. */
const C_GERI = 0.4;
const UST_GEO = new BoxGeometry(0.18, 1, DILIM);
const UST_MAT = new MeshStandardMaterial({ color: KREM });
const _o = new Object3D();

function InenUst({ parcalar, yatay, c }: { parcalar: [number, number][]; yatay: boolean; c: number }) {
  const dilimler = useMemo(() => parcalar.flatMap(([p, r]) => {
    const n = Math.max(1, Math.round((r - p) / DILIM));
    const w = (r - p) / n;
    return Array.from({ length: n }, (_, i) => ({ u: p + (i + 0.5) * w, w, h: 1 }));
  }), [parcalar]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    ref.current?.computeBoundingSphere();
  }, []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const [px, , pz] = useGame.getState().player;
    const ustH = BOY - 0.98;
    dilimler.forEach((d, i) => {
      const x = yatay ? d.u : c;
      const z = yatay ? c : d.u;
      const yakin = Math.hypot(x - px, z - pz) < C_YARICAP && z > pz - C_GERI;
      d.h = MathUtils.damp(d.h, yakin ? 0.02 : 1, 8, dt);
      const h = ustH * d.h;
      _o.position.set(x, 0.98 + h / 2, z);
      _o.rotation.set(0, yatay ? Math.PI / 2 : 0, 0);
      _o.scale.set(1, Math.max(0.001, h), d.w / DILIM);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[UST_GEO, UST_MAT, dilimler.length]} castShadow receiveShadow frustumCulled={false} />;
}

function Bolme({ b, acik, aday }: { b: BolmeTanim; acik: boolean; aday: BolmeAday | null }) {
  const yatay = b.z1 === b.z2;
  const a0 = yatay ? Math.min(b.x1, b.x2) : Math.min(b.z1, b.z2);
  const a1 = yatay ? Math.max(b.x1, b.x2) : Math.max(b.z1, b.z2);
  const kapilar = [...b.kapilar].sort((p, q) => p[0] - q[0]);
  const parca: [number, number][] = [];
  let u = a0;
  for (const [ka, kb] of kapilar) {
    parca.push([u, ka]);
    u = kb;
  }
  parca.push([u, a1]);
  const dolu = parca.filter(([p, r]) => r - p > 0.05);
  const P = (v: number) => (yatay ? ([v, b.z1] as const) : ([b.x1, v] as const));
  const alcak = aday === 'A';
  const dikmeH = alcak ? 1.35 : 2.4;
  return (
    <group>
      {dolu.map(([p, r], i) => {
        const [x1, z1] = P(p);
        const [x2, z2] = P(r);
        if (aday === 'B') return <PencereliParca key={i} x1={x1} z1={z1} x2={x2} z2={z2} />;
        if (aday === 'C') return <Lambri key={i} x1={x1} z1={z1} x2={x2} z2={z2} />;
        return <MaketWall key={i} x1={x1} z1={z1} x2={x2} z2={z2} h={alcak ? 1.2 : BOY} />;
      })}
      {aday === 'C' && <InenUst parcalar={dolu} yatay={yatay} c={yatay ? b.z1 : b.x1} />}
      {kapilar.map(([ka, kb], i) => {
        const [x, z] = P((ka + kb) / 2);
        const w = kb - ka;
        return (
          <group key={`k${i}`} position={[x, 0, z]} rotation={[0, yatay ? 0 : Math.PI / 2, 0]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[(s * w) / 2, dikmeH / 2, 0]} castShadow>
                <boxGeometry args={[0.22, dikmeH, 0.3]} />
                <meshStandardMaterial color={PALETTE.doorWood} />
              </mesh>
            ))}
            {!alcak && (
              <mesh position={[0, 2.3, 0]} castShadow>
                <boxGeometry args={[w + 0.22, 0.22, 0.3]} />
                <meshStandardMaterial color={PALETTE.doorWood} />
              </mesh>
            )}
            {/* kapalı salonun geçidi: tahta perde (kilitli obje = tadilat hâli) */}
            {!acik && <MaketTadilatPerde x1={-w / 2 + 0.11} x2={w / 2 - 0.11} z={0} />}
          </group>
        );
      })}
    </group>
  );
}

// ---- D · oyuncu silüeti: duvarın ARKASINDA kalan pikseller renkli çizilir ----
// Sıra (opak listede renderOrder): sahne 0 → silüet 1 (yalnız önünde bir şey olan yerde, derinlik
// yazmaz) → oyuncunun kendi gövdesi 2. Gövde silüetten SONRA çizildiği için kendi kolu/bacağı
// silüet vermez; yalnız bölme, masa gibi BAŞKA bir şeyin arkasında kalan kısım boyanır.
const SILUET_MAT = new MeshBasicMaterial({ color: '#ffc93c', depthFunc: GreaterDepth, depthWrite: false, toneMapped: false });
const _v = new Vector3();

/**
 * Oyuncunun KayKit gövdesini sahnede bulur (skinned mesh'in kök kemiği oyuncunun yerinde; garson ve
 * grup gövdeleri `userData.k2npc` ile ayrılır) ve aynı iskelete bağlı ikinci bir mesh takar.
 */
function OyuncuSiluet() {
  const scene = useThree((s) => s.scene);
  const takili = useRef<{ s: SkinnedMesh; m: SkinnedMesh }[]>([]);
  const sayac = useRef(0);
  useEffect(() => () => {
    for (const k of takili.current) {
      k.s.removeFromParent();
      k.m.renderOrder = 0;
    }
    takili.current = [];
  }, []);
  useFrame(() => {
    if (takili.current.length && takili.current.every((k) => k.s.parent && k.m.parent)) return;
    if (sayac.current++ % 20) return;
    for (const k of takili.current) k.s.removeFromParent();
    takili.current = [];
    const [px, , pz] = useGame.getState().player;
    const bulunan: SkinnedMesh[] = [];
    scene.traverse((n) => {
      const m = n as SkinnedMesh;
      if (!m.isSkinnedMesh || !m.visible || m.material === SILUET_MAT) return;
      for (let a = m.parent; a; a = a.parent) if (a.userData.k2npc) return;
      m.skeleton.bones[0]?.getWorldPosition(_v);
      if (Math.hypot(_v.x - px, _v.z - pz) < 0.6) bulunan.push(m);
    });
    for (const m of bulunan) {
      const s = new SkinnedMesh(m.geometry, SILUET_MAT);
      s.bind(m.skeleton, m.bindMatrix);
      s.position.copy(m.position);
      s.quaternion.copy(m.quaternion);
      s.scale.copy(m.scale);
      s.renderOrder = 1;
      s.frustumCulled = false;
      m.renderOrder = 2;
      m.parent?.add(s);
      takili.current.push({ s, m });
    }
  });
  return null;
}

export function Bolmeler({ acikAlan }: { acikAlan: number }) {
  return (
    <group>
      {KAT2_BOLMELER.map((b, i) => {
        const [a1, a2] = b.alanlar;
        if (a1 >= acikAlan && a2 >= acikAlan) return null;
        return <Bolme key={i} b={b} acik={a1 < acikAlan && a2 < acikAlan} aday={ADAY} />;
      })}
      {ADAY === 'D' && <OyuncuSiluet />}
    </group>
  );
}
