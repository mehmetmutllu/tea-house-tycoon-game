/**
 * Kat2.tsx — KAT 2'NİN SAHNESİ (K2-2: boş salon). Görünüş kararları K2-1'de maketle verildi:
 * plan B bölmeli salonlar (D-179) · tek düz ahşap zemin + tam bölme (D-180) · merdiven 2 = kalın
 * ahşap korkuluk + topuzlu babalar (D-181). Çizim `tools/kat2-maket.tsx` / `kat2-esya.tsx`ten taşındı;
 * ölçünün tek kaynağı `game/kat.ts` (yürüme alanı ile çizim aynı sayılardan doğar).
 *
 * K2-2'de yalnız arka "merdiven salonu" açık; ön salonlar kaba inşaat, bandın iki yanı tadilat
 * perdesinin arkasında (sol: K2-3'ün cezve ocağı · sağ: kilitli blok).
 */
import { FloorPattern } from './floorPattern';
import { WallPanels, type WallSlab } from './wallPanel';
import { WALL_H } from './wallOlcu';
import { MaketIskele, MaketMoloz, MaketPlant, MaketTadilatPerde, MaketWall } from './maketParts';
import { FLOOR_THEMES, PALETTE, WALL_THEMES, type FloorTheme } from '../../config/palette';
import { BAND, FLOOR_HALF } from '../../game/layout';
import { STEP_D, STEP_H, STEP_N } from './wallLook';
import { AGIZ, KAT2_ACIK_ALAN, KAT2_ALANLAR, KOVA, type Dik } from '../../game/kat';

const H = FLOOR_HALF;
/** Dış duvar kat kenarının 0,5 dışında (Scene.Walls ile aynı). */
const M = 0.5;
const BANT_ARKA = BAND.back;
const TEMA = WALL_THEMES.krem;
const ZEMIN = FLOOR_THEMES.parke;
const SAP = '#bdb7ad';
const KOYU = '#5d4037';

// ---- Duvar: açık dikdörtgenlerin BİRLEŞİMİNİN çevresi (maketin `cevre`/`hat`ı) ----
type Kenar = { yon: 'x' | 'z'; c: number; a: number; b: number; dis: boolean; yan: boolean };

function cikar(spans: [number, number][], a: number, b: number): [number, number][] {
  return spans.flatMap(([s, e]) => {
    if (b <= s || a >= e) return [[s, e]] as [number, number][];
    const r: [number, number][] = [];
    if (a > s) r.push([s, a]);
    if (b < e) r.push([b, e]);
    return r;
  });
}

function cevre(diks: Dik[]): Kenar[] {
  const out: Kenar[] = [];
  diks.forEach((r, i) => {
    const kenarlar = [
      { yon: 'x' as const, c: r.z1, a: r.x0, b: r.x1, karsi: (o: Dik) => o.z0 === r.z1 },
      { yon: 'x' as const, c: r.z0, a: r.x0, b: r.x1, karsi: (o: Dik) => o.z1 === r.z0 },
      { yon: 'z' as const, c: r.x0, a: r.z0, b: r.z1, karsi: (o: Dik) => o.x1 === r.x0 },
      { yon: 'z' as const, c: r.x1, a: r.z0, b: r.z1, karsi: (o: Dik) => o.x0 === r.x1 },
    ];
    for (const k of kenarlar) {
      let sp: [number, number][] = [[k.a, k.b]];
      diks.forEach((o, j) => {
        if (j === i || !k.karsi(o)) return;
        sp = k.yon === 'x' ? cikar(sp, o.x0, o.x1) : cikar(sp, o.z0, o.z1);
      });
      const dis = Math.abs(k.c) === H || k.c === BANT_ARKA;
      for (const [a, b] of sp) out.push({ yon: k.yon, c: k.c, a, b, dis, yan: k.yon === 'z' && dis && b > BAND.front });
    }
  });
  return out;
}

/** Yan duvarlarda pencere boşlukları (salon kısmında, 4,25 adımla). */
function pencereler(k: Kenar): { a: number; b: number }[] {
  if (!k.yan) return [];
  const adim = 4.25;
  const r: { a: number; b: number }[] = [];
  for (let m = -H + adim / 2; m < H; m += adim) {
    if (m - 0.9 < Math.max(k.a, BAND.front + 0.5) || m + 0.9 > k.b) continue;
    r.push({ a: m - 0.9, b: m + 0.9 });
  }
  return r;
}

function hat(k: Kenar): WallSlab[] {
  const c = k.dis ? k.c + Math.sign(k.c) * M : k.c;
  const sl = (a: number, b: number, y0 = 0, h = WALL_H): WallSlab =>
    k.yon === 'x'
      ? { x: (a + b) / 2, z: c, w: b - a, d: 0.18, theme: TEMA, y0, h }
      : { x: c, z: (a + b) / 2, w: 0.18, d: b - a, theme: TEMA, y0, h };
  const out: WallSlab[] = [];
  let s = k.a - (k.dis ? M : 0);
  const e = k.b + (k.dis ? M : 0);
  for (const g of pencereler(k)) {
    out.push(sl(s, g.a));
    out.push(sl(g.a, g.b, 2.7));
    out.push(sl(g.a, g.b, 0, 0.95));
    s = g.b;
  }
  out.push(sl(s, e));
  return out;
}

function Duvarlar() {
  const bant: Dik = { x0: -H, x1: H, z0: BANT_ARKA, z1: BAND.front };
  const kenarlar = cevre([bant, ...KAT2_ALANLAR.slice(0, KAT2_ACIK_ALAN)]);
  const camlar = kenarlar.flatMap((k) =>
    pencereler(k).map((g) => {
      const c = k.c + Math.sign(k.c) * M;
      return { x: c, z: (g.a + g.b) / 2, w: 0.04, d: g.b - g.a };
    }),
  );
  return (
    <group>
      <WallPanels slabs={kenarlar.flatMap(hat)} />
      {camlar.map((c, i) => (
        <mesh key={i} position={[c.x, 1.825, c.z]}>
          <boxGeometry args={[c.w, 1.75, c.d]} />
          <meshStandardMaterial color={PALETTE.glass} emissive={PALETTE.glass} emissiveIntensity={0.18} transparent opacity={0.34} />
        </mesh>
      ))}
      {/* kovanın ara duvarları (Kat 1 ile aynı hat, 2,2) */}
      <MaketWall x1={KOVA.x0} z1={BANT_ARKA} x2={KOVA.x0} z2={BAND.front} h={2.2} />
      <MaketWall x1={KOVA.x1} z1={BANT_ARKA} x2={KOVA.x1} z2={BAND.front} h={2.2} />
    </group>
  );
}

// ---- Zemin ----
function ZeminParca({ r, tema }: { r: Dik; tema: FloorTheme }) {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, 0.004, (r.z0 + r.z1) / 2]}>
        <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        <meshStandardMaterial color={tema.grout ?? tema.base} />
      </mesh>
      <FloorPattern theme={tema} x0={r.x0} x1={r.x1} z0={r.z0} z1={r.z1} />
    </group>
  );
}

/** Kat 2'de "boş arsa" yok: kilitli salon kaba şap + iskele + moloz (kaba inşaat). */
function KabaInsaat({ r }: { r: Dik }) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.003, cz]}>
        <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        <meshStandardMaterial color={SAP} />
      </mesh>
      <MaketIskele len={Math.min(4, (r.x1 - r.x0) * 0.4)} pos={[cx - 2, 0, cz - 1]} />
      <MaketMoloz pos={[cx + 2.5, 0, cz + 2]} />
      <MaketMoloz pos={[cx - 3, 0, cz + 3.5]} rot={1.2} />
    </group>
  );
}

function Zemin() {
  const x = AGIZ.x;
  return (
    <group>
      {KAT2_ALANLAR.map((r, i) => (i < KAT2_ACIK_ALAN ? <ZeminParca key={i} r={r} tema={ZEMIN} /> : <KabaInsaat key={i} r={r} />))}
      {/* bant: servis köşesi fayans · kova (kuyu hariç) · sağ blok */}
      <ZeminParca r={{ x0: -H, x1: KOVA.x0, z0: BANT_ARKA, z1: BAND.front }} tema={FLOOR_THEMES.fayans} />
      <ZeminParca r={{ x0: KOVA.x0, x1: -x, z0: BANT_ARKA, z1: BAND.front }} tema={ZEMIN} />
      <ZeminParca r={{ x0: x, x1: KOVA.x1, z0: BANT_ARKA, z1: BAND.front }} tema={ZEMIN} />
      <ZeminParca r={{ x0: -x, x1: x, z0: BANT_ARKA, z1: AGIZ.arka }} tema={ZEMIN} />
      <ZeminParca r={{ x0: -x, x1: x, z0: AGIZ.on, z1: BAND.front }} tema={ZEMIN} />
      <ZeminParca r={{ x0: KOVA.x1, x1: H, z0: BANT_ARKA, z1: BAND.front }} tema={ZEMIN} />
    </group>
  );
}

// ---- Merdiven ağzı: kuyu + basamaklar + kalın ahşap korkuluk + topuzlu babalar (D-181 merdiven 2) ----
function Silindir({ r, h, renk, pos }: { r: number; h: number; renk: string; pos: [number, number, number] }) {
  return (
    <mesh position={pos} castShadow>
      <cylinderGeometry args={[r, r, h, 8]} />
      <meshStandardMaterial color={renk} />
    </mesh>
  );
}

function Korkuluk({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const yatay = z1 === z2;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const boy = (w: number, d: number) => (yatay ? [L, w, d] : [d, w, L]) as [number, number, number];
  const n = Math.round(L / 0.24);
  return (
    <group>
      <mesh position={[cx, 1.0, cz]} castShadow>
        <boxGeometry args={boy(0.1, 0.16)} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
      <mesh position={[cx, 0.12, cz]}>
        <boxGeometry args={boy(0.06, 0.1)} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
      {Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n;
        return (
          <group key={i} position={[x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t]}>
            <Silindir r={0.035} h={0.86} renk="#7a5236" pos={[0, 0.55, 0]} />
            <Silindir r={0.05} h={0.14} renk="#7a5236" pos={[0, 0.5, 0]} />
          </group>
        );
      })}
    </group>
  );
}

function Baba({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 1.12, 0.18]} />
        <meshStandardMaterial color={KOYU} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
    </group>
  );
}

function MerdivenAgzi() {
  const N = 14;
  const D = (AGIZ.on - AGIZ.arka) / N;
  const h = 3.2 / N;
  const x = AGIZ.x;
  const yan = AGIZ.sahanlik;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * x, -1.6, (AGIZ.arka + AGIZ.on) / 2]}>
          <boxGeometry args={[0.05, 3.2, AGIZ.on - AGIZ.arka]} />
          <meshStandardMaterial color="#5a4a3e" />
        </mesh>
      ))}
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[0, -(i + 0.5) * h - 0.02, AGIZ.arka + (i + 0.5) * D]} receiveShadow>
          <boxGeometry args={[x * 2 - 0.1, h, D]} />
          <meshStandardMaterial color={i % 2 ? '#8a6a4f' : '#94735a'} />
        </mesh>
      ))}
      <Korkuluk x1={-x} z1={AGIZ.on} x2={x} z2={AGIZ.on} />
      <Korkuluk x1={-x} z1={yan} x2={-x} z2={AGIZ.on} />
      <Korkuluk x1={x} z1={yan} x2={x} z2={AGIZ.on} />
      {[[-x, AGIZ.on], [x, AGIZ.on], [-x, yan], [x, yan]].map(([bx, bz], i) => (
        <Baba key={i} x={bx} z={bz} />
      ))}
    </group>
  );
}

/**
 * KAT 1'İN TAMİR EDİLMİŞ MERDİVENİ (K2-2b) — Kat 2 açılınca yıkık merdiven + dubalar yerine bu durur.
 * Dil Kat 2'deki ağızla aynı (D-181 merdiven 2): ahşap basamak · kalın küpeşte · topuzlu babalar ·
 * üstüne yolluk ("çıkılır" okunsun). Ölçü yıkık merdivenle birebir (`STEP_*`, sahanlık −L−0,3):
 * oyuncunun girdiği ağız (`merdivenTetik`) aynı yer.
 */
export function MerdivenTamir({ pos }: { pos: [number, number, number] }) {
  const w = 2 * AGIZ.x;
  const L = STEP_N * STEP_D;
  const yx = w / 2 - 0.12;
  const egim = Math.atan2(STEP_N * STEP_H, L);
  const kupL = Math.hypot(L, STEP_N * STEP_H);
  return (
    <group position={pos}>
      {Array.from({ length: STEP_N }, (_, i) => {
        const z = -STEP_D / 2 - i * STEP_D;
        return (
          <group key={i}>
            <mesh position={[0, ((i + 1) * STEP_H) / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[w, (i + 1) * STEP_H, STEP_D]} />
              <meshStandardMaterial color={KOYU} />
            </mesh>
            {/* basamak tahtası: öne 4 cm taşar (burun) */}
            <mesh position={[0, (i + 1) * STEP_H + 0.02, z + 0.02]} castShadow receiveShadow>
              <boxGeometry args={[w + 0.06, 0.04, STEP_D + 0.04]} />
              <meshStandardMaterial color={i % 2 ? '#8a6a4f' : '#94735a'} />
            </mesh>
            <mesh position={[0, (i + 1) * STEP_H + 0.045, z + 0.02]} receiveShadow>
              <boxGeometry args={[w * 0.56, 0.012, STEP_D + 0.045]} />
              <meshStandardMaterial color="#8e2f2a" />
            </mesh>
          </group>
        );
      })}
      {/* sahanlık */}
      <mesh position={[0, (STEP_N * STEP_H) / 2, -L - 0.3]} castShadow receiveShadow>
        <boxGeometry args={[w, STEP_N * STEP_H, 0.6]} />
        <meshStandardMaterial color={KOYU} />
      </mesh>
      <mesh position={[0, STEP_N * STEP_H + 0.02, -L - 0.3]} receiveShadow>
        <boxGeometry args={[w + 0.06, 0.04, 0.6]} />
        <meshStandardMaterial color="#94735a" />
      </mesh>
      {/* iki yanda küpeşte: her basamakta bir dikme, eğimli kalın tırabzan, dipte topuzlu baba */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: STEP_N }, (_, i) => (
            <Silindir key={i} r={0.035} h={0.86} renk="#7a5236" pos={[s * yx, (i + 1) * STEP_H + 0.43, -STEP_D / 2 - i * STEP_D]} />
          ))}
          <mesh position={[s * yx, (STEP_N * STEP_H) / 2 + 0.98, -L / 2 - 0.1]} rotation={[egim, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 0.16, kupL]} />
            <meshStandardMaterial color={PALETTE.doorWood} />
          </mesh>
          <Baba x={s * yx} z={0.05} />
        </group>
      ))}
    </group>
  );
}

export function Kat2Sahne() {
  const salon = KAT2_ALANLAR[0];
  return (
    <group>
      <Zemin />
      <Duvarlar />
      <MerdivenAgzi />
      <MaketTadilatPerde x1={-H} x2={KOVA.x0 - 0.2} z={BAND.front} />
      <MaketTadilatPerde x1={KOVA.x1 + 0.2} x2={H} z={BAND.front} />
      <MaketPlant pos={[salon.x0 + 0.8, 0, salon.z0 + 0.8]} big />
      <MaketPlant pos={[salon.x1 - 0.8, 0, salon.z0 + 0.8]} big />
      <MaketPlant pos={[salon.x0 + 0.8, 0, salon.z1 - 0.8]} />
      <MaketPlant pos={[salon.x1 - 0.8, 0, salon.z1 - 0.8]} />
    </group>
  );
}
