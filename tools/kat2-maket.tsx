/**
 * kat2-maket.tsx — K2-1: KAT 2'NİN PLAN ADAYLARI (dev aracı, oyuna girmez).
 *
 * Oyunun kendi ışığı, zemini, duvarı, KayKit mobilyası ve müşteri gövdeleriyle çizilir; böylece
 * adaylar "maket gibi" değil oyunda nasıl duracaklarsa öyle görünür. Bu turun sorusu YALNIZ PLAN:
 * katın nasıl bölündüğü + hangi sırayla açıldığı. Okey/tavla masasının, cezve ocağının ve
 * merdivenin GÖRÜNÜŞÜ sonraki turun işi (ölçü önce, sanat sonra) — burada dört adayda birebir aynı.
 *
 * Adres: /tools/kat2-maket.html?v=A&adim=3&kadraj=genel|oyun&kisi=1
 * Çekim: node tools/kat2-maket-cek.mjs
 *
 * Tur 2a (B seçildikten sonra): `&bolme=tam|alcak|parmak|sutun|yok` salonların NASIL ayrıldığı,
 * `&zemin=Z1…Z8` salon zemin takımı. İki eksen ayrı çekilir (biri sabitken öbürü değişir).
 */
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { SceneLights } from '../src/components/three/lights';
import { FloorPattern } from '../src/components/three/floorPattern';
import { WallPanels, type WallSlab } from '../src/components/three/wallPanel';
import { WALL_H } from '../src/components/three/wallOlcu';
import { Model } from '../src/components/three/Model';
import { KayActor } from '../src/components/three/KayActor';
import { KAY_F, Sandalye } from './kat2-ortak';
import {
  MaketCezveStation,
  MaketCrates,
  MaketIskele,
  MaketMoloz,
  MaketPlant,
  MaketTadilatPerde,
  MaketWall,
  MaketWallShelf,
} from '../src/components/three/maketParts';
import { FLOOR_THEMES, LIGHTING, PALETTE, WALL_THEMES, type FloorTheme } from '../src/config/palette';
import { CAMERA_LOOK_Y } from '../src/config/actor';
import { CAMERA_FOV, cameraDistance } from '../src/config/camera';

const q = new URLSearchParams(location.search);
const VAR = (q.get('v') ?? 'A') as Harf;
const ADIM = Number(q.get('adim') ?? 3);
const KADRAJ = q.get('kadraj') ?? 'genel';
const KISI = q.get('kisi') !== '0';
type BolmeTip = 'tam' | 'alcak' | 'parmak' | 'sutun' | 'yok';
const BOLME = (q.get('bolme') ?? 'tam') as BolmeTip;
const ZEMIN_TAKIM = q.get('zemin');

// ---- Kat 1'den miras ölçüler (layout.ts) — Kat 2 aynı binanın üst katı, ayak izi aynı ----
const H = 17; // kat yarı-boyu (34 × 34)
const BANT = { on: -9.8, arka: -16.9 };
const MERDIVEN_X = 4.6; // merdiven kovası x ∈ [−4,6, 4,6]
const BOSLUK = { x: 2.3, arka: -16.4, on: -10.2 }; // Kat 1 merdiveninin üst ucu (14 × 0,46)
const M = 0.5; // dış duvar kat kenarının 0,5 dışında (Scene.Walls ile aynı)
const TEMA = WALL_THEMES.krem;

type Harf = 'A' | 'B' | 'C' | 'D';
type Dik = { x0: number; x1: number; z0: number; z1: number };
type Okey = { t: 'okey'; x: number; z: number; a: number };
type Tavla = { t: 'tavla'; x: number; z: number; a: number; rot?: number };
type Esya = Okey | Tavla;
type Bolme = { x1: number; z1: number; x2: number; z2: number; kapilar: [number, number][]; alanlar: [number, number] };
type Aday = {
  ad: string;
  alanlar: Dik[];
  alanAdi: string[];
  zemin: string[];
  esya: Esya[];
  bolmeler?: Bolme[];
  balkon?: { dik: Dik; alan: number; kapilar: number[] };
  oyuncu: [number, number];
};

const izgara = (xs: number[], zs: number[], f: (x: number, z: number) => Esya) => xs.flatMap((x) => zs.map((z) => f(x, z)));
const ok = (a: number) => (x: number, z: number): Okey => ({ t: 'okey', x, z, a });
const tv = (a: number, rot = 0) => (x: number, z: number): Tavla => ({ t: 'tavla', x, z, a, rot });

const ARKA: Dik = { x0: -H, x1: H, z0: BANT.on, z1: 0 };
const ON_SOL: Dik = { x0: -H, x1: 0, z0: 0, z1: H };
const ON_SAG: Dik = { x0: 0, x1: H, z0: 0, z1: H };
const ARKA_OKEY = izgara([-13, -7.5, 7.5, 13], [-4.9], ok(0));

const ADAYLAR: Record<Harf, Aday> = {
  A: {
    ad: 'Kat 1’in aynası',
    alanlar: [ARKA, ON_SOL, ON_SAG],
    alanAdi: ['Merdiven salonu', 'Okey salonu', 'Tavla köşesi'],
    zemin: ['parke', 'parke', 'parke'],
    esya: [...ARKA_OKEY, ...izgara([-12.5, -5], [4.5, 9.5, 14.5], ok(1)), ...izgara([4, 8.5, 13], [3.8, 7.4, 11, 14.6], tv(2))],
    oyuncu: [-8.5, 7],
  },
  B: {
    ad: 'Bölmeli salonlar',
    alanlar: [ARKA, ON_SOL, ON_SAG],
    alanAdi: ['Merdiven salonu', 'Okey salonu', 'Tavla köşesi'],
    zemin: ['parke', 'ceviz', 'dama'],
    esya: [...ARKA_OKEY, ...izgara([-12.5, -5], [4.5, 9.5, 14.5], ok(1)), ...izgara([4, 8.5, 13], [3.8, 7.4, 11, 14.6], tv(2))],
    bolmeler: [
      { x1: -H, z1: 0, x2: 0, z2: 0, kapilar: [[-10.5, -7.2], [-1.8, 0]], alanlar: [0, 1] },
      { x1: 0, z1: 0, x2: H, z2: 0, kapilar: [[0, 1.8], [7.2, 10.5]], alanlar: [0, 2] },
      { x1: 0, z1: 0, x2: 0, z2: H, kapilar: [[7.2, 10.2]], alanlar: [1, 2] },
    ],
    oyuncu: [-8.5, 7],
  },
  C: {
    ad: 'Ortadan kanatlanan',
    alanlar: [
      { x0: -8.5, x1: 8.5, z0: BANT.on, z1: H },
      { x0: -H, x1: -8.5, z0: BANT.on, z1: H },
      { x0: 8.5, x1: H, z0: BANT.on, z1: H },
    ],
    alanAdi: ['Okey salonu', 'Tavla kanadı', 'Okey kanadı'],
    zemin: ['parke', 'parke', 'parke'],
    esya: [
      ...izgara([-4.25, 4.25], [-5, 0.5, 6, 11.5], ok(0)),
      ...izgara([-14.4, -10.6], [-6.5, -2.5, 1.5, 5.5, 9.5, 13.5], tv(1)),
      ...izgara([12.75], [-5, 1, 7, 13], ok(2)),
    ],
    oyuncu: [0, 3],
  },
  D: {
    ad: 'Balkonlu',
    alanlar: [ARKA, { x0: -H, x1: H, z0: 0, z1: H }],
    alanAdi: ['Merdiven salonu', 'Okey salonu', 'Tavla balkonu'],
    zemin: ['parke', 'parke'],
    esya: [
      ...ARKA_OKEY,
      ...izgara([-12.5, -6, 6, 12.5], [4.5, 10.5], ok(1)),
      ...izgara([-11.25, -6.75, -2.25, 2.25, 6.75, 11.25], [19.3], tv(2)),
    ],
    balkon: { dik: { x0: -14, x1: 14, z0: H + M, z1: 21.5 }, alan: 2, kapilar: [-9, 0, 9] },
    oyuncu: [0, 12],
  },
};

// ---- Tur 2a: zemin takımları [merdiven salonu + bant, okey salonu, tavla köşesi] ----
const ft = (kind: FloorTheme['kind'], base: string, alt: string, grout?: string, cell?: number): FloorTheme => ({ kind, base, alt, grout, cell });
const Z: Record<string, FloorTheme> = {
  bal: ft('plank', '#c08f5a', '#b3824e', '#8e6239'),
  mese: ft('plank', '#d4b384', '#c9a676', '#a8865b'),
  cevizDuz: ft('flat', '#8f5f3f', '#7c4f33'),
  terrakota: ft('tile', '#b8653f', '#ad5b37', '#7f4229', 0.62),
  yumusakDama: ft('checker', '#e8dcc4', '#c49a6c'),
  cini: ft('tile', '#7fa38a', '#76997f', '#e6dcc6', 0.55),
  toprakKaro: ft('tile', '#d7b48a', '#cfab80', '#a98458', 0.9),
};
type Hali = { renk: string; kenar: string; desen: string };
const HALI_BORDO: Hali = { renk: '#8e2f2a', kenar: '#d9b56a', desen: '#3b2a4a' };
const HALI_LACI: Hali = { renk: '#2f4a6e', kenar: '#d9b56a', desen: '#8e2f2a' };
const ZEMIN_TAKIMLARI: Record<string, { zemin: [string, string, string]; hali?: [Hali | null, Hali | null, Hali | null] }> = {
  Z1: { zemin: ['parke', 'ceviz', 'dama'] }, // tur 1'deki hâl (referans)
  Z2: { zemin: ['parke', 'parke', 'parke'] }, // Kat 1 gibi tek düz ahşap
  Z3: { zemin: ['parke', 'bal', 'mese'] }, // ahşap tonları
  Z4: { zemin: ['parke', 'terrakota', 'fayans'] }, // eski kıraathane karosu
  Z5: { zemin: ['parke', 'parke', 'parke'], hali: [null, HALI_BORDO, HALI_LACI] }, // ahşap + kilim
  Z6: { zemin: ['parke', 'ceviz', 'yumusakDama'] }, // dama ama yumuşak
  Z7: { zemin: ['parke', 'cini', 'toprakKaro'] }, // çini yeşili + toprak karo
  Z8: { zemin: ['cevizDuz', 'parke', 'yemek'] }, // koyu merdiven salonu, açık oyun salonları
};
const takim = ZEMIN_TAKIMLARI[ZEMIN_TAKIM ?? ''];
const tema = (id: string) => Z[id] ?? FLOOR_THEMES[id];

const aday = ADAYLAR[VAR];
if (takim) aday.zemin = [...takim.zemin];
const acik = (a: number) => a < ADIM;

// ---- Duvar: açık dikdörtgenlerin BİRLEŞİMİNİN çevresi (layout.wallSpans'in genel hâli) ----
type Kenar = { yon: 'x' | 'z'; c: number; a: number; b: number; dis: boolean; cephe: boolean; yan: boolean };
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
      const dis = Math.abs(k.c) === H || k.c === BANT.arka;
      for (const [a, b] of sp) {
        out.push({ yon: k.yon, c: k.c, a, b, dis, cephe: k.yon === 'x' && k.c === H, yan: k.yon === 'z' && dis && b > BANT.on });
      }
    }
  });
  return out;
}

/** Bir duvar hattını boşluklarıyla parçalara böler: boşluk = pencere (eşik + lento) ya da kapı. */
function hat(k: Kenar, bosluklar: { a: number; b: number; pencere: boolean }[]): WallSlab[] {
  const c = k.dis ? k.c + Math.sign(k.c) * M : k.c;
  const sl = (a: number, b: number, y0 = 0, h = WALL_H): WallSlab =>
    k.yon === 'x'
      ? { x: (a + b) / 2, z: c, w: b - a, d: 0.18, theme: TEMA, y0, h }
      : { x: c, z: (a + b) / 2, w: 0.18, d: b - a, theme: TEMA, y0, h };
  const out: WallSlab[] = [];
  let s = k.a - (k.dis ? M : 0);
  const e = k.b + (k.dis ? M : 0);
  for (const g of bosluklar.filter((g) => g.a >= s && g.b <= e).sort((p, r) => p.a - r.a)) {
    out.push(sl(s, g.a));
    out.push(sl(g.a, g.b, g.pencere ? 2.7 : 2.6));
    if (g.pencere) out.push(sl(g.a, g.b, 0, 0.95));
    s = g.b;
  }
  out.push(sl(s, e));
  return out;
}

function pencereler(k: Kenar, balkonKapilari: number[]): { a: number; b: number; pencere: boolean }[] {
  if (k.cephe && balkonKapilari.length) return balkonKapilari.map((x) => ({ a: x - 1.1, b: x + 1.1, pencere: false }));
  if (!k.cephe && !k.yan) return [];
  const adim = 4.25;
  const r: { a: number; b: number; pencere: boolean }[] = [];
  for (let m = -H + adim / 2; m < H; m += adim) {
    if (m - 0.9 < Math.max(k.a, k.yan ? BANT.on + 0.5 : -H) || m + 0.9 > k.b) continue;
    r.push({ a: m - 0.9, b: m + 0.9, pencere: true });
  }
  return r;
}

function Duvarlar() {
  const bant: Dik = { x0: -H, x1: H, z0: BANT.arka, z1: BANT.on };
  const diks = [bant, ...aday.alanlar.filter((_, i) => acik(i))];
  const balkonAcik = !!aday.balkon && acik(aday.balkon.alan);
  const kenarlar = cevre(diks);
  const slabs = kenarlar.flatMap((k) => hat(k, pencereler(k, balkonAcik ? aday.balkon!.kapilar : [])));
  const camlar = kenarlar.flatMap((k) =>
    pencereler(k, []).map((g) => {
      const c = k.dis ? k.c + Math.sign(k.c) * M : k.c;
      return k.yon === 'x' ? { x: (g.a + g.b) / 2, z: c, w: g.b - g.a, d: 0.04 } : { x: c, z: (g.a + g.b) / 2, w: 0.04, d: g.b - g.a };
    }),
  );
  const balkonCam = balkonAcik ? [] : camlar;
  return (
    <group>
      <WallPanels slabs={slabs} />
      {(balkonAcik ? camlar.filter((c) => c.d > 0.1) : balkonCam).map((c, i) => (
        <mesh key={i} position={[c.x, 1.825, c.z]}>
          <boxGeometry args={[c.w, 1.75, c.d]} />
          <meshStandardMaterial color={PALETTE.glass} emissive={PALETTE.glass} emissiveIntensity={0.18} transparent opacity={0.34} />
        </mesh>
      ))}
      {/* bandın ara duvarları (Kat 1 ile aynı hat, 2,2) */}
      <MaketWall x1={-MERDIVEN_X} z1={BANT.arka} x2={-MERDIVEN_X} z2={BANT.on} h={2.2} />
      <MaketWall x1={MERDIVEN_X} z1={BANT.arka} x2={MERDIVEN_X} z2={BANT.on} h={2.2} />
      {BOLME !== 'yok' &&
        aday.bolmeler
          ?.filter((b) => acik(b.alanlar[0]) && acik(b.alanlar[1]))
          .map((b, i) => <Bolmeler key={i} b={b} />)}
    </group>
  );
}

/** Bölmeli adayın salon arası duvarı: 2,2 yükseklik, kapı boşluğunun üstünde ahşap kemer. */
function Bolmeler({ b }: { b: Bolme }) {
  const yatay = b.z1 === b.z2;
  const a0 = yatay ? b.x1 : b.z1;
  const a1 = yatay ? b.x2 : b.z2;
  const parca: [number, number][] = [];
  let s = a0;
  for (const [ka, kb] of b.kapilar) {
    parca.push([s, ka]);
    s = kb;
  }
  parca.push([s, a1]);
  const P = (u: number) => (yatay ? ([u, b.z1] as const) : ([b.x1, u] as const));
  if (BOLME === 'sutun') return <SutunKiris a0={a0} a1={a1} P={P} kapilar={b.kapilar} />;
  return (
    <group>
      {parca.filter(([p, r]) => r - p > 0.05).map(([p, r], i) => {
        const [x1, z1] = P(p);
        const [x2, z2] = P(r);
        if (BOLME === 'alcak') return <AlcakDuvar key={i} x1={x1} z1={z1} x2={x2} z2={z2} />;
        if (BOLME === 'parmak') return <Korkuluk key={i} x1={x1} z1={z1} x2={x2} z2={z2} h={1.05} aralik={0.32} kalin />;
        return <MaketWall key={i} x1={x1} z1={z1} x2={x2} z2={z2} h={2.2} />;
      })}
      {b.kapilar.map(([ka, kb], i) => {
        const [x, z] = P((ka + kb) / 2);
        const w = kb - ka;
        return (
          <group key={`k${i}`} position={[x, 0, z]} rotation={[0, yatay ? 0 : Math.PI / 2, 0]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[(s * w) / 2, 1.2, 0]} castShadow>
                <boxGeometry args={[0.22, 2.4, 0.3]} />
                <meshStandardMaterial color={PALETTE.doorWood} />
              </mesh>
            ))}
            <mesh position={[0, 2.3, 0]} castShadow>
              <boxGeometry args={[w + 0.22, 0.22, 0.3]} />
              <meshStandardMaterial color={PALETTE.doorWood} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Yarım duvar: lambri yüksekliğinde (0,95) dolu gövde + üstünde ahşap küpeşte; göz üstünden geçer. */
function AlcakDuvar({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  return (
    <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, Math.atan2(dx, dz), 0]}>
      <mesh position={[0, 0.475, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.95, len]} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
      <mesh position={[0, 0.99, 0]} castShadow>
        <boxGeometry args={[0.32, 0.08, len + 0.06]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
    </group>
  );
}

/** Ahşap parmaklık: küpeşte + alt kayıt + sık dikmeler (balkon korkuluğunun kalın hâli). */
function Korkuluk({ x1, z1, x2, z2, h = 1.0, aralik = 0.5, kalin = false }: { x1: number; z1: number; x2: number; z2: number; h?: number; aralik?: number; kalin?: boolean }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(L / aralik));
  const yatay = z1 === z2;
  const t = kalin ? 0.16 : 0.12;
  return (
    <group>
      <mesh position={[(x1 + x2) / 2, h, (z1 + z2) / 2]} castShadow>
        <boxGeometry args={yatay ? [L, 0.08, t] : [t, 0.08, L]} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
      {kalin && (
        <mesh position={[(x1 + x2) / 2, 0.06, (z1 + z2) / 2]}>
          <boxGeometry args={yatay ? [L, 0.12, t] : [t, 0.12, L]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
      )}
      {Array.from({ length: n + 1 }, (_, i) => {
        const k = i / n;
        return (
          <mesh key={i} position={[x1 + (x2 - x1) * k, h / 2, z1 + (z2 - z1) * k]} castShadow>
            <boxGeometry args={kalin ? [0.08, h, 0.08] : [0.06, h, 0.06]} />
            <meshStandardMaterial color={kalin ? '#6b4f3a' : '#3e2f28'} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Sütun + kiriş: hat boyunca ≤ 4,4 aralıklı ahşap direkler, tepede kesintisiz kiriş; arası açık. */
function SutunKiris({ a0, a1, P, kapilar }: { a0: number; a1: number; P: (u: number) => readonly [number, number]; kapilar: [number, number][] }) {
  const n = Math.ceil((a1 - a0) / 4.4);
  const direk = Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n).filter(
    (u) => !kapilar.some(([ka, kb]) => u > ka - 0.4 && u < kb + 0.4),
  );
  const [bx1, bz1] = P(a0);
  const [bx2, bz2] = P(a1);
  const yatay = bz1 === bz2;
  const L = a1 - a0;
  return (
    <group>
      {direk.map((u, i) => {
        const [x, z] = P(u);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <boxGeometry args={[0.3, 2.4, 0.3]} />
              <meshStandardMaterial color={PALETTE.doorWood} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.42, 0.2, 0.42]} />
              <meshStandardMaterial color="#5a3f30" />
            </mesh>
          </group>
        );
      })}
      <mesh position={[(bx1 + bx2) / 2, 2.42, (bz1 + bz2) / 2]} castShadow>
        <boxGeometry args={yatay ? [L, 0.26, 0.32] : [0.32, 0.26, L]} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
    </group>
  );
}

// ---- Zemin ----
const SAP = '#bdb7ad';
function Zemin() {
  return (
    <group>
      {aday.alanlar.map((r, i) =>
        acik(i) ? (
          <group key={i}>
            <ZeminParca r={r} tema={tema(aday.zemin[i])} />
            {takim?.hali?.[i] && <HaliCiz r={r} h={takim.hali[i]!} />}
          </group>
        ) : (
          <KabaInsaat key={i} r={r} />
        ),
      )}
      {/* bant: servis köşesi fayans · merdiven kovası (boşluk hariç) · sağ blok */}
      <ZeminParca r={{ x0: -H, x1: -MERDIVEN_X, z0: BANT.arka, z1: BANT.on }} tema={FLOOR_THEMES.fayans} />
      <ZeminParca r={{ x0: -MERDIVEN_X, x1: -BOSLUK.x, z0: BANT.arka, z1: BANT.on }} tema={tema(aday.zemin[0])} />
      <ZeminParca r={{ x0: BOSLUK.x, x1: MERDIVEN_X, z0: BANT.arka, z1: BANT.on }} tema={tema(aday.zemin[0])} />
      <ZeminParca r={{ x0: -BOSLUK.x, x1: BOSLUK.x, z0: BANT.arka, z1: BOSLUK.arka }} tema={tema(aday.zemin[0])} />
      <ZeminParca r={{ x0: -BOSLUK.x, x1: BOSLUK.x, z0: BOSLUK.on, z1: BANT.on }} tema={tema(aday.zemin[0])} />
      <ZeminParca r={{ x0: MERDIVEN_X, x1: H, z0: BANT.arka, z1: BANT.on }} tema={tema(aday.zemin[0])} />
      {aday.balkon && acik(aday.balkon.alan) && <Balkon d={aday.balkon.dik} />}
    </group>
  );
}

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

/** Kilim: salonun ortasında kenar şeritli büyük halı; masalar üstünde durur. */
function HaliCiz({ r, h }: { r: Dik; h: Hali }) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2 + 0.6;
  const w = r.x1 - r.x0 - 3.4;
  const d = r.z1 - r.z0 - 4.2;
  const kat = (y: number, ww: number, dd: number, c: string) => (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, y, cz]}>
      <planeGeometry args={[ww, dd]} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
  return (
    <group>
      {kat(0.01, w, d, h.kenar)}
      {kat(0.012, w - 0.5, d - 0.5, h.desen)}
      {kat(0.014, w - 0.9, d - 0.9, h.renk)}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} receiveShadow rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[cx + k * (w / 3.4), 0.016, cz]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial color={h.kenar} />
        </mesh>
      ))}
    </group>
  );
}

function KabaInsaat({ r }: { r: Dik }) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  return (
    <group>
      {/* Kat 2'de "boş arsa" yok: kilitli alan kaba şap + iskele + moloz (kaba inşaat) */}
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

function Balkon({ d }: { d: Dik }) {
  const korkuluk = (x1: number, z1: number, x2: number, z2: number) => {
    const L = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.round(L / 0.5);
    const yatay = z1 === z2;
    return (
      <group>
        <mesh position={[(x1 + x2) / 2, 1.0, (z1 + z2) / 2]} castShadow>
          <boxGeometry args={yatay ? [L, 0.08, 0.12] : [0.12, 0.08, L]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
        {Array.from({ length: n + 1 }, (_, i) => {
          const t = i / n;
          return (
            <mesh key={i} position={[x1 + (x2 - x1) * t, 0.5, z1 + (z2 - z1) * t]} castShadow>
              <boxGeometry args={[0.06, 1.0, 0.06]} />
              <meshStandardMaterial color="#3e2f28" />
            </mesh>
          );
        })}
      </group>
    );
  };
  return (
    <group>
      <mesh receiveShadow position={[(d.x0 + d.x1) / 2, -0.1, (d.z0 + d.z1) / 2 - 0.25]} castShadow>
        <boxGeometry args={[d.x1 - d.x0, 0.2, d.z1 - d.z0 + 0.5]} />
        <meshStandardMaterial color="#d8cdb6" />
      </mesh>
      <FloorPattern theme={FLOOR_THEMES.fayans} x0={d.x0} x1={d.x1} z0={d.z0 - 0.5} z1={d.z1} />
      {korkuluk(d.x0, d.z1, d.x1, d.z1)}
      {korkuluk(d.x0, d.z0, d.x0, d.z1)}
      {korkuluk(d.x1, d.z0, d.x1, d.z1)}
      <MaketPlant pos={[d.x0 + 0.6, 0, d.z1 - 0.6]} big />
      <MaketPlant pos={[d.x1 - 0.6, 0, d.z1 - 0.6]} big />
    </group>
  );
}

// ---- Arka bant: merdiven boşluğu + çay ocağı + kilitli sağ blok ----
function MerdivenBoslugu() {
  const N = 14;
  const D = (BOSLUK.on - BOSLUK.arka) / N;
  const h = 3.2 / N;
  const w = BOSLUK.x * 2;
  return (
    <group>
      {/* kuyu: iç yüzler koyu, aşağı Kat 1'e iner */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * BOSLUK.x, -1.6, (BOSLUK.arka + BOSLUK.on) / 2]}>
          <boxGeometry args={[0.05, 3.2, BOSLUK.on - BOSLUK.arka]} />
          <meshStandardMaterial color="#5a4a3e" />
        </mesh>
      ))}
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[0, -(i + 0.5) * h - 0.02, BOSLUK.arka + (i + 0.5) * D]} receiveShadow>
          <boxGeometry args={[w - 0.1, h, D]} />
          <meshStandardMaterial color={i % 2 ? '#8a6a4f' : '#94735a'} />
        </mesh>
      ))}
      {/* korkuluk: ön + iki yan; arka sahanlık açık (çıkış oradan) */}
      {[
        [-BOSLUK.x, BOSLUK.on, BOSLUK.x, BOSLUK.on],
        [-BOSLUK.x, BOSLUK.arka + 1.2, -BOSLUK.x, BOSLUK.on],
        [BOSLUK.x, BOSLUK.arka + 1.2, BOSLUK.x, BOSLUK.on],
      ].map(([x1, z1, x2, z2], i) => {
        const L = Math.hypot(x2 - x1, z2 - z1);
        const yatay = z1 === z2;
        const n = Math.round(L / 0.45);
        return (
          <group key={i}>
            <mesh position={[(x1 + x2) / 2, 1.0, (z1 + z2) / 2]} castShadow>
              <boxGeometry args={yatay ? [L + 0.1, 0.09, 0.14] : [0.14, 0.09, L]} />
              <meshStandardMaterial color={PALETTE.doorWood} />
            </mesh>
            {Array.from({ length: n + 1 }, (_, k) => (
              <mesh key={k} position={[x1 + ((x2 - x1) * k) / n, 0.5, z1 + ((z2 - z1) * k) / n]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 1.0, 6]} />
                <meshStandardMaterial color="#6b4f3a" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function CayOcagi() {
  return (
    <group>
      <MaketCezveStation pos={[-7.4, 0, BANT.on - 0.55]} rot={Math.PI} />
      <MaketWallShelf w={5} pos={[-11, 2.0, BANT.arka - 0.4]} />
      <MaketCrates pos={[-15.6, 0, BANT.arka + 0.9]} />
      <MaketPlant pos={[-16.2, 0, BANT.on - 0.7]} big />
      <group position={[-7.4, 0, BANT.on - 1.6]}>
        <KayActor kind="waiter" hal="calis" />
      </group>
    </group>
  );
}

// ---- Okey / tavla birimi (görünüşü bu turda SABİT; sonraki turun adayları buradan çıkar) ----
function OkeyMasasi({ x, z, i, dolu }: { x: number; z: number; i: number; dolu: boolean }) {
  const yer: [number, number][] = [
    [0, 1.0],
    [1.0, 0],
    [0, -1.0],
    [-1.0, 0],
  ];
  return (
    <group>
      <group position={[x, 0, z]}>
        <Model src={`${KAY_F}table_medium.gltf`} scale={[0.6, 0.75, 0.6]} fallback={null} />
        <mesh position={[0, 0.8, 0]} receiveShadow>
          <boxGeometry args={[1.06, 0.016, 1.06]} />
          <meshStandardMaterial color="#2e7d4f" />
        </mesh>
        {yer.map(([dx, dz], k) => (
          <group key={k} position={[dx * 0.4, 0.83, dz * 0.4]} rotation={[0, Math.atan2(dx, dz), 0]}>
            <mesh>
              <boxGeometry args={[0.62, 0.05, 0.11]} />
              <meshStandardMaterial color="#8a5a3b" />
            </mesh>
            <mesh position={[0, 0.06, -0.02]}>
              <boxGeometry args={[0.54, 0.08, 0.025]} />
              <meshStandardMaterial color="#f4eedc" />
            </mesh>
          </group>
        ))}
        {Array.from({ length: 7 }, (_, k) => (
          <mesh key={`t${k}`} position={[((k % 4) - 1.5) * 0.08, 0.82 + Math.floor(k / 4) * 0.035, (Math.floor(k / 4) - 0.5) * 0.07]}>
            <boxGeometry args={[0.07, 0.03, 0.05]} />
            <meshStandardMaterial color="#f4eedc" />
          </mesh>
        ))}
      </group>
      {yer.map(([dx, dz], k) => (
        <Sandalye key={k} x={x + dx} z={z + dz} aci={Math.atan2(-dx, -dz)} kisi={dolu && KISI} i={i * 4 + k} />
      ))}
    </group>
  );
}

function TavlaMasasi({ x, z, rot = 0, i, dolu }: { x: number; z: number; rot?: number; i: number; dolu: boolean }) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const yer: [number, number][] = [
    [0.82 * c, -0.82 * s],
    [-0.82 * c, 0.82 * s],
  ];
  return (
    <group>
      <group position={[x, 0, z]} rotation={[0, rot, 0]}>
        <Model src={`${KAY_F}table_small.gltf`} scale={[0.8, 0.75, 0.8]} fallback={null} />
        <mesh position={[0, 0.82, 0]} castShadow>
          <boxGeometry args={[0.46, 0.05, 0.62]} />
          <meshStandardMaterial color="#5d3a24" />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[0, 0.848, k * 0.155]}>
            <boxGeometry args={[0.4, 0.004, 0.27]} />
            <meshStandardMaterial color="#e6cf9e" />
          </mesh>
        ))}
        {Array.from({ length: 10 }, (_, k) => (
          <mesh key={`p${k}`} position={[(k % 2 ? 1 : -1) * 0.14, 0.86, ((k >> 1) - 2) * 0.11]}>
            <cylinderGeometry args={[0.028, 0.028, 0.018, 10]} />
            <meshStandardMaterial color={k % 2 ? '#f6f1e4' : '#3b2a22'} />
          </mesh>
        ))}
      </group>
      {yer.map(([dx, dz], k) => (
        <Sandalye key={k} x={x + dx} z={z + dz} aci={Math.atan2(-dx, -dz)} kisi={dolu && KISI} i={i * 2 + k + 200} />
      ))}
    </group>
  );
}

function Esyalar() {
  return (
    <group>
      {aday.esya.map((e, i) =>
        acik(e.a) ? (
          e.t === 'okey' ? (
            <OkeyMasasi key={i} x={e.x} z={e.z} i={i} dolu={i % 3 !== 2} />
          ) : (
            <TavlaMasasi key={i} x={e.x} z={e.z} rot={e.rot} i={i} dolu={i % 4 !== 3} />
          )
        ) : null,
      )}
    </group>
  );
}

// ---- Kamera ----
function Kamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as import('three').PerspectiveCamera;
    if (KADRAJ === 'oyun') {
      const [px, pz] = aday.oyuncu;
      const d = cameraDistance(size.width / size.height);
      cam.fov = CAMERA_FOV;
      cam.position.set(px, d, pz + d);
      cam.lookAt(px, CAMERA_LOOK_Y, pz);
    } else if (KADRAJ === 'ust') {
      cam.fov = 30;
      cam.position.set(0, 92, 18);
      cam.lookAt(0, 0, 1.5);
    } else {
      cam.fov = 32;
      const dz = aday.balkon ? 3 : 0; // balkonlu aday cepheden 4,5 taşar: kadraj öne kayar
      cam.position.set(-25, 37, 43 + dz);
      cam.lookAt(0, 0, 1.5 + dz);
    }
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Hazir({ children }: { children: ReactNode }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 30) (window as unknown as { MAKET_HAZIR?: boolean }).MAKET_HAZIR = true;
  });
  return <>{children}</>;
}

function Dekor() {
  const solA = aday.alanlar[0];
  return (
    <group>
      {acik(0) && <MaketPlant pos={[solA.x0 + 0.8, 0, solA.z0 + 0.8]} big />}
      {acik(0) && <MaketPlant pos={[solA.x1 - 0.8, 0, solA.z0 + 0.8]} big />}
      {aday.alanlar.map((r, i) =>
        acik(i) ? (
          <group key={i}>
            <MaketPlant pos={[r.x0 + 0.8, 0, r.z1 - 0.8]} />
            <MaketPlant pos={[r.x1 - 0.8, 0, r.z1 - 0.8]} />
          </group>
        ) : null,
      )}
    </group>
  );
}

function Sahne() {
  return (
    <>
      <color attach="background" args={[LIGHTING.background]} />
      <fog attach="fog" args={[LIGHTING.background, 80, 200]} />
      <SceneLights shadows />
      <Kamera />
      <Suspense fallback={null}>
        <Hazir>
          <Zemin />
          <Duvarlar />
          <MerdivenBoslugu />
          <CayOcagi />
          <MaketTadilatPerde x1={MERDIVEN_X + 0.2} x2={H} z={BANT.on} />
          <Esyalar />
          <Dekor />
          {KADRAJ === 'oyun' && (
            <group position={[aday.oyuncu[0], 0, aday.oyuncu[1]]}>
              <KayActor kind="owner" />
            </group>
          )}
        </Hazir>
      </Suspense>
    </>
  );
}

createRoot(document.getElementById('kok')!).render(
  <Canvas shadows="percentage" camera={{ position: [0, 40, 40], fov: 32 }} gl={{ antialias: true, toneMappingExposure: LIGHTING.exposure, preserveDrawingBuffer: true }} dpr={[1, 2]}>
    <Sahne />
  </Canvas>,
);
