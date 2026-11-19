/**
 * s5-tasarim.tsx — S5 TASARIM TURU (dev aracı, oyuna girmez · 2026-11-20).
 *
 * `tools/kat2-varis.tsx` deseni: ÇALIŞAN OYUNUN sahnesine (dev `window.__three.scene`) aday parçalar eklenir,
 * bugünkü parçalar kutu (Box3) süzgeciyle gizlenir / boyanır. Oyuncu, masalar, mutfak, HUD oyunun kendisi;
 * değişen YALNIZ adayın dokunduğu parça. `src/**` değişmez.
 *
 * Kullanım: `node tools/s5-tasarim-cek.mjs` (sayfa içinden `import('/tools/s5-tasarim.tsx')`).
 */
import { Suspense, useMemo, type ReactNode } from 'react';
import { _roots, advance, createRoot, type RootState } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Color, GreaterDepth, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Plane, SkinnedMesh, Vector3, type Material, type Object3D, type Scene, type WebGLRenderer } from 'three';
import { useGame } from '../src/game/store';
import { FloorPattern } from '../src/components/three/floorPattern';
import { MC, MaketWall } from '../src/components/three/maketParts';
import { FLOOR_THEMES, PALETTE, type FloorTheme } from '../src/config/palette';
import { BAND, BAND_SHELL, FLOOR_HALF } from '../src/game/layout';
import { KAT2_ON_TEZGAH } from '../src/game/kat';
import { FRONT_TOP_Y } from '../src/components/three/kitchenLook';

const H = FLOOR_HALF;
const KAY = '/assets/models/kaykit-restaurant-bits/';
const T = KAT2_ON_TEZGAH;

// ================================================================ sahne yardımcıları
type Kok = 'kat1' | 'kat2' | 'hepsi';
type Kutu = { x0?: number; x1?: number; y0?: number; y1?: number; z0?: number; z1?: number };
const gizli: Object3D[] = [];
const boyali: { m: Mesh; mat: Material | Material[] }[] = [];
const takili: Group[] = [];

const sahne = (): Scene => (window as unknown as { __three: { scene: Scene } }).__three.scene;

function icinde(b: Box3, k: Kutu): boolean {
  return (
    b.min.x >= (k.x0 ?? -1e9) && b.max.x <= (k.x1 ?? 1e9) &&
    b.min.y >= (k.y0 ?? -1e9) && b.max.y <= (k.y1 ?? 1e9) &&
    b.min.z >= (k.z0 ?? -1e9) && b.max.z <= (k.z1 ?? 1e9)
  );
}

/** Kutunun TAMAMEN içindeki ağları (iskeletli gövdeler hariç) döndürür. `kok`: 'kat2' ya da bütün sahne. */
function ağlar(k: Kutu, kok: Kok = 'kat2', ek?: (m: Mesh, b: Box3) => boolean): Mesh[] {
  const s = sahne();
  s.updateMatrixWorld(true);
  const root = kok === 'hepsi' ? s : s.getObjectByName(kok) ?? s;
  const b = new Box3();
  const out: Mesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
    if (!m.isMesh || m.isSkinnedMesh) return;
    if (takili.some((g) => g === o || isAncestor(g, o))) return;
    b.setFromObject(m);
    if (b.isEmpty() || !icinde(b, k)) return;
    if (ek && !ek(m, b)) return;
    out.push(m);
  });
  return out;
}

function isAncestor(a: Object3D, o: Object3D): boolean {
  for (let p = o.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

export function gizle(k: Kutu, kok: Kok = 'kat2', ek?: (m: Mesh, b: Box3) => boolean): number {
  const l = ağlar(k, kok, ek).filter((m) => m.visible);
  for (const m of l) {
    m.visible = false;
    gizli.push(m);
  }
  return l.length;
}

/** Ağların rengini değiştirir (malzeme klonlanır, geri alınır). */
export function boya(k: Kutu, renk: string, kok: Kok = 'kat2', ek?: (m: Mesh, b: Box3) => boolean, opak = 1): number {
  const l = ağlar(k, kok, ek);
  for (const m of l) {
    boyali.push({ m, mat: m.material });
    const yeni = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => {
      const c = (x as MeshStandardMaterial).clone();
      if (renk) c.color = new Color(renk);
      if (opak < 1) {
        c.transparent = true;
        c.opacity = opak;
        c.depthWrite = false;
      }
      return c;
    });
    m.material = Array.isArray(m.material) ? yeni : yeni[0];
  }
  return l.length;
}

export function sifirla() {
  for (const o of gizli) o.visible = true;
  gizli.length = 0;
  for (const { m, mat } of boyali) m.material = mat;
  boyali.length = 0;
  for (const k of siluetler) k.parent?.remove(k);
  siluetler.length = 0;
  const s = sahne();
  for (const g of takili) s.remove(g);
  takili.length = 0;
}

/** JSX'i ikinci bir r3f kökünde çizip ana sahneye taşır (kat2-varis deseni). */
export async function ekle(jsx: ReactNode, ad = 's5-aday'): Promise<void> {
  const tuval = document.createElement('canvas');
  tuval.width = 4;
  tuval.height = 4;
  const kok = createRoot(tuval);
  await kok.configure({ frameloop: 'never', size: { width: 4, height: 4, top: 0, left: 0 } });
  kok.render(<Suspense fallback={null}>{jsx}</Suspense>);
  const durum = (_roots as unknown as Map<HTMLCanvasElement, { store: { getState(): RootState } }>).get(tuval)!.store.getState();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    advance(performance.now(), false, durum);
  }
  const g = new Group();
  g.name = ad;
  for (const c of [...durum.scene.children]) g.add(c);
  sahne().add(g);
  takili.push(g);
}

/** Sahne içindeki bir nesnenin dünya kutusu (ölçüm). */
export function kutuOlc(k: Kutu, kok: Kok = 'kat2'): { n: number; min: number[]; max: number[] } {
  const l = ağlar(k, kok);
  const b = new Box3();
  for (const m of l) b.expandByObject(m);
  return { n: l.length, min: b.min.toArray(), max: b.max.toArray() };
}

export function agListe(k: Kutu, kok: Kok = 'kat2') {
  const b = new Box3();
  return ağlar(k, kok).map((m) => {
    b.setFromObject(m);
    const t = m as Mesh & { isInstancedMesh?: boolean; count?: number };
    return { ad: m.name || m.type, inst: t.isInstancedMesh ? t.count : 0, min: b.min.toArray().map((v) => +v.toFixed(2)), max: b.max.toArray().map((v) => +v.toFixed(2)) };
  });
}

// ================================================================ çizim parçaları
function K({ p, s, c, golge = true, opak = 1 }: { p: [number, number, number]; s: [number, number, number]; c: string; golge?: boolean; opak?: number }) {
  return (
    <mesh position={p} castShadow={golge} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} transparent={opak < 1} opacity={opak} depthWrite={opak >= 1} />
    </mesh>
  );
}

/** KayKit modeli hedef kutuya oturtulur (taban y0, merkez x/z, dönüş y). */
function KayFit({ ad, w, h, d, pos, rot = 0, klasor = KAY }: { ad: string; w?: number; h?: number; d?: number; pos: [number, number, number]; rot?: number; klasor?: string }) {
  const { scene } = useGLTF(`${klasor}${ad}.gltf`);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const b = new Box3().setFromObject(c);
    const sz = b.getSize(new Vector3());
    const sx = w ? w / sz.x : h ? h / sz.y : 1;
    const sy = h ? h / sz.y : sx;
    const sz_ = d ? d / sz.z : sx;
    const g = new Group();
    c.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    g.add(c);
    g.scale.set(sx, sy, sz_);
    return g;
  }, [scene, w, h, d]);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <primitive object={obj} />
    </group>
  );
}

function ZeminParca({ x0, x1, z0, z1, tema, y = 0.006 }: { x0: number; x1: number; z0: number; z1: number; tema: FloorTheme; y?: number }) {
  return (
    <group position={[0, y - 0.004, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.004, (z0 + z1) / 2]}>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial color={tema.grout ?? tema.base} />
      </mesh>
      <FloorPattern theme={tema} x0={x0} x1={x1} z0={z0} z1={z1} />
    </group>
  );
}

/** Korkuluk (Kat 2 merdiven dili, D-181). */
function Korkuluk({ x1, z1, x2, z2, h = 1.0 }: { x1: number; z1: number; x2: number; z2: number; h?: number }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const yatay = z1 === z2;
  const boy = (w: number, d: number) => (yatay ? [L, w, d] : [d, w, L]) as [number, number, number];
  const n = Math.round(L / 0.24);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  return (
    <group>
      <K p={[cx, h, cz]} s={boy(0.1, 0.16)} c={PALETTE.doorWood} />
      <K p={[cx, 0.12, cz]} s={boy(0.06, 0.1)} c={PALETTE.doorWood} golge={false} />
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[x1 + ((x2 - x1) * i) / n, h / 2 + 0.05, z1 + ((z2 - z1) * i) / n]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, h - 0.14, 8]} />
          <meshStandardMaterial color="#7a5236" />
        </mesh>
      ))}
      {[[x1, z1], [x2, z2]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <K p={[0, (h + 0.12) / 2, 0]} s={[0.18, h + 0.12, 0.18]} c="#5d4037" />
          <mesh position={[0, h + 0.2, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 8]} />
            <meshStandardMaterial color="#8a5a3b" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Alçak duvar (lambri + çıta) — Kat 2 `AlcakBolme` dili; yön x ya da z. */
function AlcakDuvar({ x1, z1, x2, z2, h }: { x1: number; z1: number; x2: number; z2: number; h: number }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const yatay = z1 === z2;
  const boy = (a: number, b: number, d: number) => (yatay ? [L, a, d] : [d, a, L]) as [number, number, number];
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  return (
    <group>
      <K p={[cx, h / 2, cz]} s={boy(h, 0, 0.22)} c={MC.wain} />
      <K p={[cx, h + 0.04, cz]} s={boy(0.08, 0, 0.28)} c={MC.doorWood} />
    </group>
  );
}

// ---------------------------------------------------------------- G-102 / G-111: mutfağın sağ duvarı (x = −4,6)
const SAG_X = BAND.stairs.minX;
const BANT_ARKA = BAND_SHELL.back;
/** Bugünkü sağ duvar (kovanın sol ara duvarı, MaketWall h 2,2) — gizleme kutusu. */
export const SAG_DUVAR: Kutu = { x0: SAG_X - 0.2, x1: SAG_X + 0.2, y0: -0.05, y1: 2.4, z0: BAND_SHELL.back - 0.3, z1: BAND.front + 0.2 };
const sagDuvarGizle = () => gizle(SAG_DUVAR);

function Pilastr({ x, z, h = 2.45, w = 0.42 }: { x: number; z: number; h?: number; w?: number }) {
  return (
    <group position={[x, 0, z]}>
      <K p={[0, 0.06, 0]} s={[w + 0.08, 0.12, w + 0.08]} c={MC.doorWood} />
      <K p={[0, h / 2, 0]} s={[w, h, w]} c={MC.wallCream} />
      <K p={[0, 0.45, 0]} s={[w + 0.03, 0.9, w + 0.03]} c={MC.wain} />
      <K p={[0, h + 0.05, 0]} s={[w + 0.1, 0.1, w + 0.1]} c={MC.doorWood} />
    </group>
  );
}

export const G102: Record<string, { aciklama: string; kur: () => Promise<unknown> }> = {
  A: { aciklama: 'BUGÜN — kova ara duvarı 2,2 m (lambri + krem sıva), boydan boya', kur: async () => 0 },
  B: {
    aciklama: 'DUVAR YOK — mutfak merdiven kovasına açık; kuyu korkuluğu mutfaktan görünür',
    kur: async () => sagDuvarGizle(),
  },
  C: {
    aciklama: 'ALÇAK DUVAR 1,0 m — lambri + çıta (salon bölmelerinin alçak dili, D-198)',
    kur: async () => {
      sagDuvarGizle();
      await ekle(<AlcakDuvar x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={BAND.front} h={1.0} />);
    },
  },
  D: {
    aciklama: 'YARIM DUVAR — arka yarı 2,2 (raflar dayanır), ön yarı tezgâh boyu 1,0',
    kur: async () => {
      sagDuvarGizle();
      const orta = (BANT_ARKA + BAND.front) / 2;
      await ekle(
        <>
          <MaketWall x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={orta} h={2.2} />
          <AlcakDuvar x1={SAG_X} z1={orta} x2={SAG_X} z2={BAND.front} h={1.0} />
        </>,
      );
    },
  },
  E: {
    aciklama: 'KORKULUK — merdivenin ahşap korkuluğu (D-181) mutfak sınırında; boydan boya açık',
    kur: async () => {
      sagDuvarGizle();
      await ekle(<Korkuluk x1={SAG_X} z1={BANT_ARKA + 0.2} x2={SAG_X} z2={BAND.front - 0.05} />);
    },
  },
  F: {
    aciklama: 'KayKit TEZGÂH UCU — ön tezgâh köşeden dönüp sağ kenar boyunca arkaya uzanır (duvar yok)',
    kur: async () => {
      sagDuvarGizle();
      const n = 6;
      const L = BAND.front - 0.8 - (BANT_ARKA + 0.6);
      const w = L / n;
      await ekle(
        <>
          <KayFit ad="kitchencounter_outercorner" w={0.8} h={FRONT_TOP_Y} d={0.8} pos={[SAG_X - 0.4, 0, (T.z0 + T.z1) / 2]} rot={0} />
          {Array.from({ length: n }, (_, i) => (
            <KayFit key={i} ad="kitchencounter_straight_A" w={w} h={FRONT_TOP_Y} d={0.8} pos={[SAG_X - 0.4, 0, T.z0 - w * (i + 0.5)]} rot={-Math.PI / 2} />
          ))}
        </>,
      );
    },
  },
  G: {
    aciklama: 'KayKit SİPARİŞ PENCERELİ DUVAR — wall_orderwindow: duvar kalır, ortası tezgâh boyu açık',
    kur: async () => {
      sagDuvarGizle();
      const L = BAND.front - BANT_ARKA;
      const n = 3;
      const w = L / n;
      await ekle(
        <>
          {Array.from({ length: n }, (_, i) => (
            <KayFit key={i} ad={i === 1 ? 'wall_orderwindow' : 'wall'} w={w} h={2.2} d={0.2} pos={[SAG_X, 0, BANT_ARKA + w * (i + 0.5)]} rot={Math.PI / 2} />
          ))}
        </>,
      );
    },
  },
};

// ---------------------------------------------------------------- G-111: tezgâh + sağ duvar birleşimi
export const G111: Record<string, { aciklama: string; kur: () => Promise<unknown> }> = {
  A: { aciklama: 'BUGÜN — tezgâhın ucu duvarın içine gömülür; duvar tezgâhtan 0,0 önde biter, çıta/lambri tezgâhı keser', kur: async () => 0 },
  B: {
    aciklama: 'PİLASTR — duvarın ucunda 0,42 kare sıva ayak (süpürgelik + başlık); tezgâh ona dayanır',
    kur: async () => ekle(<Pilastr x={SAG_X} z={BAND.front + 0.05} />),
  },
  C: {
    aciklama: 'KayKit DIŞ KÖŞE — tezgâhın son modülü kitchencounter_outercorner, duvar köşenin arkasında biter',
    kur: async () => {
      gizle({ x0: SAG_X - 0.2, x1: SAG_X + 0.2, y0: -0.05, y1: 2.4, z0: T.z0 - 0.05, z1: BAND.front + 0.2 });
      gizle({ x0: SAG_X - 1.95, x1: SAG_X + 0.05, y0: -0.05, y1: FRONT_TOP_Y + 0.08, z0: T.z0 - 0.1, z1: T.z1 + 0.1 });
      await ekle(
        <>
          <MaketWall x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={T.z0} h={2.2} />
          <KayFit ad="kitchencounter_straight_A" w={1.05} h={FRONT_TOP_Y} d={0.8} pos={[SAG_X - 1.4, 0, (T.z0 + T.z1) / 2]} />
          <KayFit ad="kitchencounter_outercorner" w={0.85} h={FRONT_TOP_Y} d={0.8} pos={[SAG_X - 0.45, 0, (T.z0 + T.z1) / 2]} rot={0} />
        </>,
      );
    },
  },
  D: {
    aciklama: 'TEZGÂH DÖNÜŞÜ (L) — tezgâh köşeden dönüp duvar boyunca 2 modül arkaya; duvar dönüşün arkasında başlar',
    kur: async () => {
      gizle({ x0: SAG_X - 0.2, x1: SAG_X + 0.2, y0: -0.05, y1: 2.4, z0: T.z0 - 2.2, z1: BAND.front + 0.2 });
      await ekle(
        <>
          <MaketWall x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={T.z0 - 1.6} h={2.2} />
          <KayFit ad="kitchencounter_straight_A" w={1.6} h={FRONT_TOP_Y} d={0.8} pos={[SAG_X - 0.4, 0, T.z0 - 0.8]} rot={-Math.PI / 2} />
        </>,
      );
    },
  },
  E: {
    aciklama: 'DUVAR TEZGÂHTA BİTER — son 0,8 m tezgâh boyuna iner (1,0), başlık çıtası tezgâh hizasında',
    kur: async () => {
      gizle({ x0: SAG_X - 0.2, x1: SAG_X + 0.2, y0: -0.05, y1: 2.4, z0: BAND_SHELL.back - 0.3, z1: BAND.front + 0.2 });
      await ekle(
        <>
          <MaketWall x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={T.z0} h={2.2} />
          <AlcakDuvar x1={SAG_X} z1={T.z0} x2={SAG_X} z2={BAND.front + 0.05} h={FRONT_TOP_Y + 0.02} />
          <K p={[SAG_X, 1.25, T.z0]} s={[0.26, 2.5 - 0.0, 0.26]} c={MC.doorWood} />
        </>,
      );
    },
  },
  F: {
    aciklama: 'KayKit DİREK — pillar_A duvarın ucunda; tezgâh ucuna köşe direği',
    kur: async () => ekle(<KayFit ad="pillar_A" w={0.5} h={2.45} d={0.5} pos={[SAG_X, 0, BAND.front - 0.05]} />),
  },
  G: {
    aciklama: 'TEZGÂH KAPAĞI — tezgâhın ucu ahşap yan panelle kapanır, duvar 0,25 geri çekilir (iki ayrı parça okunur)',
    kur: async () => {
      gizle({ x0: SAG_X - 0.2, x1: SAG_X + 0.2, y0: -0.05, y1: 2.4, z0: BAND_SHELL.back - 0.3, z1: BAND.front + 0.2 });
      await ekle(
        <>
          <MaketWall x1={SAG_X} z1={BANT_ARKA} x2={SAG_X} z2={T.z0 - 0.05} h={2.2} />
          <K p={[SAG_X - 0.02, FRONT_TOP_Y / 2 + 0.02, (T.z0 + T.z1) / 2 + 0.02]} s={[0.1, FRONT_TOP_Y + 0.06, 0.88]} c={MC.doorWood} />
        </>,
      );
    },
  },
};

// ---------------------------------------------------------------- G-112: Kat 1 mutfak zemini
/** Kat 1 mutfak zemini: sahnenin Kat 1 katmanında KayKit karo (Merged) → kutu: servis köşesi, y ≈ 0. */
export const G112_KUTU: Kutu = { x0: -H - 1, x1: BAND.stairs.minX + 0.3, y0: -0.6, y1: 0.12, z0: BAND_SHELL.back - 0.3, z1: BAND.front + 0.3 };

export async function parkeKaplama() {
  await ekle(<ZeminParca x0={-H} x1={BAND.stairs.minX} z0={BAND_SHELL.innerBack} z1={BAND.front} tema={FLOOR_THEMES.parke} y={0.035} />);
}

// ---------------------------------------------------------------- G-114: ön duvar adayları
/** Kat 1 / Kat 2 ön (kameraya bakan) dış duvar hattı: z = H + 0,5. */
export const ON_HAT = H + 0.5;

/**
 * KIRPMA: bütün duvarlar TEK InstancedMesh (`WallPanels`) — kutu süzgeciyle parça seçilemez. Bunun yerine
 * malzemeye dünya-uzayı kırpma düzlemleri takılır (`clipIntersection`: yalnız BÜTÜN düzlemlerin dışında kalan
 * parça silinir) → ön duvarın istenen bölgesi kesilir, geri kalan duvar oyunun kendi çizimi olarak kalır.
 */
const ON_Z: [number, number] = [ON_HAT - 0.3, ON_HAT + 0.7];
export function onKirp(kok: Kok, bolge: { y?: number; x0?: number; x1?: number }) {
  const gl = (window as unknown as { __three: { gl: WebGLRenderer } }).__three.gl;
  gl.localClippingEnabled = true;
  const pl = [new Plane(new Vector3(0, 0, -1), ON_Z[0]), new Plane(new Vector3(0, 0, 1), -ON_Z[1]), new Plane(new Vector3(0, -1, 0), bolge.y ?? 0.02)];
  if (bolge.x0 != null) pl.push(new Plane(new Vector3(-1, 0, 0), bolge.x0));
  if (bolge.x1 != null) pl.push(new Plane(new Vector3(1, 0, 0), -bolge.x1));
  const s = sahne();
  s.updateMatrixWorld(true);
  const root = kok === 'hepsi' ? s : s.getObjectByName(kok) ?? s;
  const b = new Box3();
  const serit = new Box3(new Vector3(-H - 2, 0.3, ON_Z[0]), new Vector3(H + 2, 4, ON_Z[1]));
  let n = 0;
  root.traverse((o) => {
    const m = o as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
    if (!m.isMesh || m.isSkinnedMesh) return;
    if (takili.some((g) => isAncestor(g, o))) return;
    if (m.isInstancedMesh) {
      (m as unknown as { computeBoundingBox(): void }).computeBoundingBox();
      b.copy((m as unknown as { boundingBox: Box3 }).boundingBox).applyMatrix4(m.matrixWorld);
    } else b.setFromObject(m);
    if (!b.intersectsBox(serit)) return;
    boyali.push({ m, mat: m.material });
    const yeni = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => {
      const c = x.clone();
      c.clippingPlanes = pl;
      c.clipIntersection = true;
      return c;
    });
    m.material = Array.isArray(m.material) ? yeni : yeni[0];
    n++;
  });
  return n;
}

/** Kırpılan duvarın yeni üst kenarına çıta (alçak duvar okunsun). */
export async function onCita(y: number, x0 = -H - 0.6, x1 = H + 0.6) {
  await ekle(<K p={[(x0 + x1) / 2, y + 0.04, ON_HAT]} s={[x1 - x0, 0.08, 0.28]} c={MC.doorWood} />);
}

/** Saydam ön duvar: kırpılan duvarın yerine yarı saydam krem levha. */
export async function onSaydam(opak: number) {
  await ekle(<K p={[0, 3.2 / 2, ON_HAT]} s={[2 * H + 1.2, 3.2, 0.18]} c={MC.wallCream} opak={opak} golge={false} />);
}

/** SİLUET: oyuncunun iskeletli gövdeleri ikinci kez, YALNIZ örtülü yerde (depthFunc Greater) düz renkle çizilir. */
const siluetler: SkinnedMesh[] = [];
export function siluet(renk = '#ffd45a', opak = 0.85) {
  const p = useGame.getState().player;
  const s = sahne();
  s.updateMatrixWorld(true);
  const b = new Box3();
  const c = new Vector3();
  const mat = new MeshBasicMaterial({ color: renk, transparent: true, opacity: opak, depthFunc: GreaterDepth, depthWrite: false });
  const bul: SkinnedMesh[] = [];
  s.traverse((o) => {
    const m = o as SkinnedMesh;
    if (!m.isSkinnedMesh || !m.visible) return;
    b.setFromObject(m).getCenter(c);
    if (Math.hypot(c.x - p[0], c.z - p[2]) < 0.7) bul.push(m);
  });
  for (const m of bul) {
    const k = new SkinnedMesh(m.geometry, mat);
    k.bind(m.skeleton, m.bindMatrix);
    k.position.copy(m.position);
    k.quaternion.copy(m.quaternion);
    k.scale.copy(m.scale);
    k.renderOrder = 999;
    k.frustumCulled = false;
    m.parent!.add(k);
    siluetler.push(k);
  }
  return bul.length;
}

// ---------------------------------------------------------------- G-115: Kat 2 dış çevresi
/** "Alt kat duvar olarak": bina gövdesi Kat 2 zemininin altına 3,2 m iner (cephe sıvası + kat silmesi). */
export async function altKatGovde() {
  const D = 3.2;
  const ic = 0.0;
  const x0 = -H - 0.6;
  const x1 = H + 0.6;
  const z0 = BAND_SHELL.back - 0.1;
  const z1 = H + 0.6;
  const c = MC.wallCream;
  await ekle(
    <group>
      <K p={[(x0 + x1) / 2, -D / 2 - ic, z1]} s={[x1 - x0, D, 0.2]} c={c} golge={false} />
      <K p={[x0, -D / 2 - ic, (z0 + z1) / 2]} s={[0.2, D, z1 - z0]} c={c} golge={false} />
      <K p={[x1, -D / 2 - ic, (z0 + z1) / 2]} s={[0.2, D, z1 - z0]} c={c} golge={false} />
      {/* kat silmesi (iki kat arası taş kuşak) */}
      <K p={[(x0 + x1) / 2, -0.12, z1 + 0.08]} s={[x1 - x0 + 0.3, 0.24, 0.36]} c="#cdbb9b" golge={false} />
      <K p={[x0 - 0.08, -0.12, (z0 + z1) / 2]} s={[0.36, 0.24, z1 - z0]} c="#cdbb9b" golge={false} />
      <K p={[x1 + 0.08, -0.12, (z0 + z1) / 2]} s={[0.36, 0.24, z1 - z0]} c="#cdbb9b" golge={false} />
      {/* alt kat pencereleri (cephede koyu cam) */}
      {Array.from({ length: 6 }, (_, i) => (
        <K key={i} p={[-H + 3 + i * 5.6, -1.7, z1 + 0.11]} s={[1.8, 1.5, 0.04]} c="#3d5566" golge={false} />
      ))}
    </group>,
  );
}

/** "Sokak/çatı": Kat 2'nin çevresinde Kat 1'in çatı saçağı + aşağıda sokak (gök yerine yer). */
export async function cevreZemin(renk: string, y: number) {
  await ekle(
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={renk} />
    </mesh>,
  );
}

export async function sacak() {
  const x0 = -H - 0.6;
  const x1 = H + 0.6;
  const z0 = BAND_SHELL.back - 0.1;
  const z1 = H + 0.6;
  const W = 1.6;
  const kiremit = '#b4553b';
  await ekle(
    <group>
      <mesh position={[(x0 + x1) / 2, -0.35, z1 + W / 2]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[x1 - x0 + 2 * W, 0.12, W]} />
        <meshStandardMaterial color={kiremit} />
      </mesh>
      <mesh position={[x0 - W / 2, -0.35, (z0 + z1) / 2]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[W, 0.12, z1 - z0]} />
        <meshStandardMaterial color={kiremit} />
      </mesh>
      <mesh position={[x1 + W / 2, -0.35, (z0 + z1) / 2]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[W, 0.12, z1 - z0]} />
        <meshStandardMaterial color={kiremit} />
      </mesh>
    </group>,
  );
}

// ---------------------------------------------------------------- G-129: masa dağılımı
export interface MasaYer {
  tur: 'okey' | 'tavla';
  x: number;
  z: number;
}

/** Bugünkü masaları gizler (alan 1 + 2, z > 0) — yerine aday düzen klonlanır. */
export function salonMasalariniGizle() {
  return gizle({ x0: -H, x1: H, y0: -0.1, y1: 2.0, z0: 0.3, z1: H }, 'kat2');
}

/** Sahnedeki bir masa grubunu (okey/tavla) yeni yerlere klonlar. Kaynak: bugünkü masanın konumundaki ağlar. */
export function masaKlonla(kaynak: [number, number], yarim: [number, number], yerler: MasaYer[], tur: 'okey' | 'tavla') {
  const s = sahne();
  s.updateMatrixWorld(true);
  const k: Kutu = { x0: kaynak[0] - yarim[0], x1: kaynak[0] + yarim[0], z0: kaynak[1] - yarim[1], z1: kaynak[1] + yarim[1], y0: -0.1, y1: 2.2 };
  const l = ağlar(k, 'kat2');
  const g = new Group();
  g.name = `s5-masa-${tur}`;
  for (const y of yerler.filter((y) => y.tur === tur)) {
    const t = new Group();
    for (const m of l) {
      const c = m.clone();
      c.visible = true;
      m.updateWorldMatrix(true, false);
      c.matrixAutoUpdate = false;
      c.matrix.copy(m.matrixWorld);
      c.matrix.elements[12] += y.x - kaynak[0];
      c.matrix.elements[14] += y.z - kaynak[1];
      t.add(c);
    }
    g.add(t);
  }
  s.add(g);
  takili.push(g);
  return l.length;
}

const OK = [-13, -6.5];
const TV_BUGUN = [2.5, 4.9, 7.3, 9.7, 12.1, 14.5];
const OKEY_SAT = [2.5, 8.5, 14.5];
const arkaSol: MasaYer[] = [-13, -6.5].map((x) => ({ tur: 'okey', x, z: -3.5 }));
const arkaSagOkey: MasaYer[] = [6.5, 13].map((x) => ({ tur: 'okey', x, z: -3.5 }));
const arkaSagTavla: MasaYer[] = [6.5, 13].flatMap((x) => [-4.7, -2.3].map((z) => ({ tur: 'tavla' as const, x, z })));
const solOkey: MasaYer[] = OK.flatMap((x) => OKEY_SAT.map((z) => ({ tur: 'okey' as const, x, z })));
const tvBugun: MasaYer[] = [6.5, 13].flatMap((x) => TV_BUGUN.map((z) => ({ tur: 'tavla' as const, x, z })));
const tvBlok: MasaYer[] = [6.5, 13].flatMap((x) => OKEY_SAT.flatMap((z) => [z - 1.2, z + 1.2].map((zz) => ({ tur: 'tavla' as const, x, z: zz }))));
const tvIzgara: MasaYer[] = [5.0, 10.0, 15.0].flatMap((x) => [2.5, 6.5, 10.5, 14.5].map((z) => ({ tur: 'tavla' as const, x, z })));

export const G129: Record<string, { aciklama: string; yer: MasaYer[] }> = {
  A: { aciklama: 'BUGÜN (N7) — sağ arka sırada 2 okey, altında 12 tavla sık sıra (2,4 m adım); sol tam okey', yer: [...arkaSol, ...arkaSagOkey, ...solOkey, ...tvBugun] },
  B: { aciklama: 'TARAF AYRIMI — sağ arka sıranın 2 okeyi yerine 4 tavla: sol hep okey, sağ hep tavla', yer: [...arkaSol, ...arkaSagTavla, ...solOkey, ...tvBugun] },
  C: { aciklama: 'BLOK RİTMİ — tavla ikişerli blok, blok okey sıralarıyla aynı hizada (z 2,5 · 8,5 · 14,5)', yer: [...arkaSol, ...arkaSagOkey, ...solOkey, ...tvBlok] },
  D: { aciklama: 'IZGARA 3×4 — tavla üç sütun × dört sıra, eşit aralık (sağ yarı kendi içinde düzenli)', yer: [...arkaSol, ...arkaSagOkey, ...solOkey, ...tvIzgara] },
  E: { aciklama: 'B + C — sağ taraf baştan sona ikişerli tavla blokları, sol baştan sona okey (tam ayna ritmi)', yer: [...arkaSol, ...arkaSagTavla, ...solOkey, ...tvBlok] },
};

/** Koridor ölçüsü: komşu masalar arası en dar SERBEST şerit (aralık − gövde çapı 0,94) + orta yolun genişliği. */
export function koridor(yer: MasaYer[]) {
  const yari = (m: MasaYer): [number, number] => (m.tur === 'tavla' ? [1.2, 0.6] : [1.25, 1.25]);
  let enDar = Infinity;
  let dar = 0;
  for (let i = 0; i < yer.length; i++)
    for (let j = i + 1; j < yer.length; j++) {
      const a = yer[i];
      const b = yer[j];
      const [ax, az] = yari(a);
      const [bx, bz] = yari(b);
      const gx = Math.abs(a.x - b.x) - ax - bx;
      const gz = Math.abs(a.z - b.z) - az - bz;
      let g: number | null = null;
      if (gx < 0 && gz >= 0) g = gz;
      else if (gz < 0 && gx >= 0) g = gx;
      if (g == null || g > 3) continue;
      const serbest = g - 0.94;
      enDar = Math.min(enDar, serbest);
      if (serbest < 0.5) dar++;
    }
  const sagIc = Math.min(...yer.filter((m) => m.x > 0 && m.z > 0).map((m) => m.x - yari(m)[0]));
  const solIc = Math.min(...yer.filter((m) => m.x < 0 && m.z > 0).map((m) => -m.x - yari(m)[0]));
  return { masa: yer.length, okey: yer.filter((m) => m.tur === 'okey').length, tavla: yer.filter((m) => m.tur === 'tavla').length, enDarSerbest: +enDar.toFixed(2), darSerit: dar, ortaYol: +(sagIc + solIc).toFixed(2) };
}

export async function g129Kur(ad: string) {
  const a = G129[ad];
  if (ad === 'A') return koridor(a.yer);
  masaKlonla([-13, 2.5], [1.4, 1.4], a.yer, 'okey');
  masaKlonla([6.5, 2.5], [1.3, 0.5], a.yer, 'tavla');
  salonMasalariniGizle();
  gizle({ x0: 4, x1: 15, z0: -5.2, z1: -1.8, y0: -0.1, y1: 2.2 }, 'kat2');
  gizle({ x0: -15, x1: -4, z0: -5.2, z1: -1.8, y0: -0.1, y1: 2.2 }, 'kat2');
  return koridor(a.yer);
}
