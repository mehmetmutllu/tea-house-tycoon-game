/**
 * kat2-varis.tsx — KAT 2 VARIŞ TURU (dev aracı, oyuna girmez · 2026-11-19).
 *
 * Kullanıcı: "merdiven salona dönük mü olsa? Çıkınca duvar dibinde çıkıyorum, yürümem gerekiyor."
 * Bu modül ÇALIŞAN OYUNUN sahnesine (dev `window.__three.scene`) aday merdiven kuyusunu ekler:
 * bugünkü kuyu (korkuluk + basamak + kuyu duvarı) gizlenir, deliği parke kapatır, adayın kuyusu
 * oyunun ölçüleriyle (14 basamak, 3,2 kat yüksekliği, D-181 korkuluk dili) çizilir. Oyuncu, masalar,
 * mutfak, HUD gerçek oyunun kendisi — değişen YALNIZ kuyu + varış noktası (+ iniş işareti).
 *
 * Çizim ikinci bir r3f kökünde (görünmez tuval) yapılır, nesneler ana sahneye taşınır.
 * Kullanım: `node tools/kat2-varis-cek.mjs` (sayfa içinden `import('/tools/kat2-varis.tsx')`).
 */
import { _roots, advance, createRoot, type RootState } from '@react-three/fiber';
import { Box3, Group, type Object3D, type Scene } from 'three';
import { FloorPattern } from '../src/components/three/floorPattern';
import { GroundMarker } from '../src/components/three/GroundMarker';
import { FLOOR_THEMES, PALETTE } from '../src/config/palette';
import { AGIZ } from '../src/game/kat';

const ZEMIN = FLOOR_THEMES.parke;
const KOYU = '#5d4037';
const H_KAT = 3.2;
const N = 14;

type Ust = 'on' | 'arka' | 'dogu';
interface Kuyu {
  /** Delik (dünya). */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Basamakların ÜST ucu hangi kenarda (oyuncu oradan iner / oraya çıkar). */
  ust: Ust;
  /** U dönüşlü (iki kol + ara sahanlık). */
  u?: boolean;
  korkuluk: [number, number, number, number][];
  babalar: [number, number][];
}
export interface Aday {
  kuyu?: Kuyu;
  /** "Kat 1" zemin işareti (iniş pad'i). */
  pad?: [number, number];
}

const R = 2.3;
export const ADAYLAR: Record<string, Aday> = {
  A: {},
  B: {
    kuyu: {
      x0: -R, x1: R, z0: -16.4, z1: -11.0, ust: 'on',
      korkuluk: [[-R, -16.4, R, -16.4], [-R, -16.4, -R, -11.0], [R, -16.4, R, -11.0]],
      babalar: [[-R, -11.0], [R, -11.0], [-R, -16.4], [R, -16.4]],
    },
  },
  C: {
    kuyu: {
      x0: -R, x1: R, z0: -16.4, z1: -11.6, ust: 'on',
      korkuluk: [[-R, -16.4, R, -16.4], [-R, -16.4, -R, -11.6], [R, -16.4, R, -11.6]],
      babalar: [[-R, -11.6], [R, -11.6], [-R, -16.4], [R, -16.4]],
    },
    pad: [0, -10.55],
  },
  D: {},
  E: {
    kuyu: {
      x0: -4.0, x1: 1.6, z0: -16.0, z1: -11.6, ust: 'dogu',
      korkuluk: [[-4.0, -16.0, 1.6, -16.0], [-4.0, -11.6, 1.6, -11.6], [-4.0, -16.0, -4.0, -11.6]],
      babalar: [[1.6, -16.0], [1.6, -11.6], [-4.0, -16.0], [-4.0, -11.6]],
    },
  },
  F: {
    kuyu: {
      x0: -4.0, x1: 4.0, z0: -16.4, z1: -11.0, ust: 'on', u: true,
      korkuluk: [[-4.0, -16.4, 4.0, -16.4], [-4.0, -16.4, -4.0, -11.0], [4.0, -16.4, 4.0, -11.0], [0, -11.0, 4.0, -11.0], [0, -14.9, 0, -11.0]],
      babalar: [[-4.0, -11.0], [0, -11.0], [4.0, -11.0], [-4.0, -16.4], [4.0, -16.4], [0, -14.9]],
    },
  },
  G: {
    kuyu: {
      x0: -4.0, x1: 4.0, z0: -16.4, z1: -11.0, ust: 'on',
      korkuluk: [[-4.0, -16.4, 4.0, -16.4], [-4.0, -16.4, -4.0, -11.0], [4.0, -16.4, 4.0, -11.0]],
      babalar: [[-4.0, -11.0], [4.0, -11.0], [-4.0, -16.4], [4.0, -16.4]],
    },
  },
};

/** Varış noktası (oyuncunun belirdiği yer) — A bugünkü `VARIS[2]`. */
export const VARIS_ADAY: Record<string, [number, number]> = {
  A: [-AGIZ.x - 0.45 - 0.35, (AGIZ.arka + AGIZ.sahanlik) / 2],
  B: [0, -9.3],
  C: [0, -8.6],
  D: [0, -9.3],
  E: [3.2, -10.6],
  F: [-2.0, -9.3],
  G: [0, -9.3],
};

// ---------------------------------------------------------------- çizim
function Kutu({ p, s, c, golge = true }: { p: [number, number, number]; s: [number, number, number]; c: string; golge?: boolean }) {
  return (
    <mesh position={p} castShadow={golge} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}

function Korkuluk({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const yatay = z1 === z2;
  const boy = (w: number, d: number) => (yatay ? [L, w, d] : [d, w, L]) as [number, number, number];
  const n = Math.round(L / 0.24);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  return (
    <group>
      <Kutu p={[cx, 1.0, cz]} s={boy(0.1, 0.16)} c={PALETTE.doorWood} />
      <Kutu p={[cx, 0.12, cz]} s={boy(0.06, 0.1)} c={PALETTE.doorWood} golge={false} />
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[x1 + ((x2 - x1) * i) / n, 0.55, z1 + ((z2 - z1) * i) / n]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.86, 8]} />
          <meshStandardMaterial color="#7a5236" />
        </mesh>
      ))}
    </group>
  );
}

function Baba({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Kutu p={[0, 0.56, 0]} s={[0.18, 1.12, 0.18]} c={KOYU} />
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
    </group>
  );
}

/** Basamak kolu (yerel): x ∈ [xa, xb], z 0'dan −L'ye, y ya'dan yb'ye iner. */
function Kol({ xa, xb, L, ya, yb, n, ters = false }: { xa: number; xb: number; L: number; ya: number; yb: number; n: number; ters?: boolean }) {
  const D = L / n;
  const h = (ya - yb) / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        // ters: kol −L'den 0'a doğru iner (U'nun ikinci kolu)
        const z = ters ? -L + (i + 0.5) * D : -(i + 0.5) * D;
        return <Kutu key={i} p={[(xa + xb) / 2, ya - (i + 0.5) * h - 0.02, z]} s={[xb - xa - 0.1, h, D]} c={i % 2 ? '#8a6a4f' : '#94735a'} golge={false} />;
      })}
    </>
  );
}

function KuyuCiz({ k }: { k: Kuyu }) {
  // Yerel çerçeve: üst kenar z = 0, iniş −z yönünde; W kenar boyu, L iniş boyu.
  const yatay = k.ust === 'dogu';
  const W = yatay ? k.z1 - k.z0 : k.x1 - k.x0;
  const L = yatay ? k.x1 - k.x0 : k.z1 - k.z0;
  const kok: [number, number, number] =
    k.ust === 'on' ? [(k.x0 + k.x1) / 2, 0, k.z1] : k.ust === 'arka' ? [(k.x0 + k.x1) / 2, 0, k.z0] : [k.x1, 0, (k.z0 + k.z1) / 2];
  const rot = k.ust === 'on' ? 0 : k.ust === 'arka' ? Math.PI : Math.PI / 2;
  const cx = (k.x0 + k.x1) / 2;
  const cz = (k.z0 + k.z1) / 2;
  const SAH = 1.3;
  return (
    <group>
      {/* kuyu duvarları (koyu, aşağı) */}
      <Kutu p={[k.x0, -H_KAT / 2, cz]} s={[0.05, H_KAT, k.z1 - k.z0]} c="#5a4a3e" golge={false} />
      <Kutu p={[k.x1, -H_KAT / 2, cz]} s={[0.05, H_KAT, k.z1 - k.z0]} c="#5a4a3e" golge={false} />
      <Kutu p={[cx, -H_KAT / 2, k.z0]} s={[k.x1 - k.x0, H_KAT, 0.05]} c="#5a4a3e" golge={false} />
      <Kutu p={[cx, -H_KAT / 2, k.z1]} s={[k.x1 - k.x0, H_KAT, 0.05]} c="#5a4a3e" golge={false} />
      <Kutu p={[cx, -H_KAT - 0.05, cz]} s={[k.x1 - k.x0, 0.1, k.z1 - k.z0]} c="#6b5a4c" golge={false} />
      <group position={kok} rotation={[0, rot, 0]}>
        {k.u ? (
          <>
            <Kol xa={-W / 2} xb={0} L={L - SAH} ya={0} yb={-H_KAT / 2} n={N / 2} />
            <Kutu p={[0, -H_KAT / 2 - 0.08, -L + SAH / 2]} s={[W - 0.1, 0.16, SAH]} c="#94735a" golge={false} />
            <Kol xa={0} xb={W / 2} L={L - SAH} ya={-H_KAT / 2} yb={-H_KAT} n={N / 2} ters />
            {/* iki kolun arası: kalın ara duvar */}
            <Kutu p={[0, -H_KAT / 2, -(L - SAH) / 2]} s={[0.14, H_KAT, L - SAH]} c="#5a4a3e" golge={false} />
          </>
        ) : (
          <Kol xa={-W / 2} xb={W / 2} L={L} ya={0} yb={-H_KAT} n={N} />
        )}
        {/* üstte yolluk: "buradan inilir" (Kat 1 tamir merdiveninin halısı) */}
        <Kutu p={[k.u ? -W / 4 : 0, 0.01, 0.5]} s={[k.u ? W * 0.28 : W * 0.56, 0.012, 1.0]} c="#8e2f2a" golge={false} />
      </group>
      {k.korkuluk.map(([x1, z1, x2, z2], i) => (
        <Korkuluk key={i} x1={x1} z1={z1} x2={x2} z2={z2} />
      ))}
      {k.babalar.map(([x, z], i) => (
        <Baba key={i} x={x} z={z} />
      ))}
    </group>
  );
}

/** Bugünkü deliğin YENİ kuyunun dışında kalan kısmını parkeyle kapatır. */
function DelikliZemin({ k }: { k: Kuyu }) {
  // Kova bandı x ±4,6, z −17,31…−9,8 — yeni kuyunun çevresi parke (bugünkü bant zemini zaten çizili; burada yalnız
  // bugünkü deliğin YENİ kuyunun dışında kalan kısmı kapatılır).
  const parcalar: { x0: number; x1: number; z0: number; z1: number }[] = [];
  const ax0 = -AGIZ.x;
  const ax1 = AGIZ.x;
  const az0 = AGIZ.arka;
  const az1 = AGIZ.on;
  // eski delik eksi yeni delik: dört şerit
  if (k.z0 > az0) parcalar.push({ x0: ax0, x1: ax1, z0: az0, z1: Math.min(az1, k.z0) });
  if (k.z1 < az1) parcalar.push({ x0: ax0, x1: ax1, z0: Math.max(az0, k.z1), z1: az1 });
  const iz0 = Math.max(az0, k.z0);
  const iz1 = Math.min(az1, k.z1);
  if (iz1 > iz0) {
    if (k.x0 > ax0) parcalar.push({ x0: ax0, x1: Math.min(ax1, k.x0), z0: iz0, z1: iz1 });
    if (k.x1 < ax1) parcalar.push({ x0: Math.max(ax0, k.x1), x1: ax1, z0: iz0, z1: iz1 });
  }
  return (
    <group>
      {parcalar.map((r, i) => (
        <group key={i}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, 0.004, (r.z0 + r.z1) / 2]}>
            <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
            <meshStandardMaterial color={ZEMIN.grout ?? ZEMIN.base} />
          </mesh>
          <FloorPattern theme={ZEMIN} x0={r.x0} x1={r.x1} z0={r.z0} z1={r.z1} />
        </group>
      ))}
    </group>
  );
}

function AdayCiz({ a }: { a: Aday }) {
  return (
    <group>
      {a.kuyu && <DelikliZemin k={a.kuyu} />}
      {a.kuyu && <KuyuCiz k={a.kuyu} />}
      {a.pad && <GroundMarker pos={[a.pad[0], 0, a.pad[1]]} label="Kat 1" sub="↓" tint="#43d17a" progress={0.4} afford />}
    </group>
  );
}

// ---------------------------------------------------------------- sahneye takma
const gizli: Object3D[] = [];
let takili: Group | null = null;

/** Bugünkü kuyuyu gizler (yalnız kuyunun İÇİNDE kalan çizimler: basamak, kuyu duvarı, korkuluk, baba). */
function bugunkuKuyuyuGizle(scene: Scene) {
  const b = new Box3();
  scene.updateMatrixWorld(true);
  // Yalnız Kat 2 katmanı; iskeletli gövdeler (oyuncu, merdivendeki grup) hiç dokunulmaz.
  const kat2 = scene.getObjectByName('kat2') ?? scene;
  kat2.traverse((o) => {
    if (!(o as { isMesh?: boolean }).isMesh || (o as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
    b.setFromObject(o);
    if (b.isEmpty()) return;
    const icinde = b.min.x >= -AGIZ.x - 0.2 && b.max.x <= AGIZ.x + 0.2 && b.min.z >= AGIZ.arka - 0.1 && b.max.z <= AGIZ.on + 0.12 && b.max.y < 1.4;
    if (!icinde) return;
    // zemin parçaları (y ≈ 0 düzlemi) kuyunun içinde değil; oyuncu/NPC bu kurulumda kuyuda durmaz
    if (b.max.y - b.min.y < 0.02 && b.min.y > -0.01) return;
    o.visible = false;
    gizli.push(o);
  });
}

export async function adayKur(ad: string): Promise<{ gizlenen: number }> {
  const w = window as unknown as { __three?: { scene: Scene } };
  const scene = w.__three!.scene;
  for (const o of gizli) o.visible = true;
  gizli.length = 0;
  if (takili) {
    scene.remove(takili);
    takili = null;
  }
  const a = ADAYLAR[ad] ?? {};
  if (!a.kuyu && !a.pad) return { gizlenen: 0 };
  if (a.kuyu) bugunkuKuyuyuGizle(scene);
  const tuval = document.createElement('canvas');
  tuval.width = 4;
  tuval.height = 4;
  const kok = createRoot(tuval);
  await kok.configure({ frameloop: 'never', size: { width: 4, height: 4, top: 0, left: 0 } });
  kok.render(<AdayCiz a={a} />);
  // r3f 9: kök deposu tuvale bağlı. YALNIZ bu kök ilerletilir — durumsuz `advance` ana oyunun kökünü de
  // ilerletir ve takip sistemini bozar (oyuncu NaN'a düşüyordu).
  const durum = (_roots as unknown as Map<HTMLCanvasElement, { store: { getState(): RootState } }>).get(tuval)!.store.getState();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    advance(performance.now(), false, durum);
  }
  const kaynak = durum.scene;
  const g = new Group();
  g.name = 'kat2-varis-aday';
  for (const c of [...kaynak.children]) g.add(c);
  scene.add(g);
  takili = g;
  return { gizlenen: gizli.length };
}
