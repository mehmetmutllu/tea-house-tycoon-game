/**
 * kat2-esya.tsx — K2-1 tur 2b: KAT 2 EŞYALARININ GÖRÜNÜŞ ADAYLARI (dev aracı, oyuna girmez).
 *
 * Her aday küçük bir köşe sahnesinde, oyunun ışığı + Kat 2'nin seçilen zemini (D-180: tek düz
 * ahşap) + Kat 1'in duvarıyla çizilir; kamera oyunun 45° bakışı, ölçek için patron ayakta durur.
 * Dört eşya × altı aday; bir eşyanın adayları birebir aynı kadrajda.
 *
 * Adres: /tools/kat2-esya.html?esya=okey|tavla|cezve|merdiven&no=1..6
 *        /tools/kat2-esya.html?esya=okey|tavla&yol=A|B|C  (yükseltme yolu: Sv1…Sv5 yan yana, boş masa)
 * Çekim: node tools/kat2-esya-cek.mjs
 */
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { SceneLights } from '../src/components/three/lights';
import { WallPanels } from '../src/components/three/wallPanel';
import { WALL_H } from '../src/components/three/wallOlcu';
import { Model } from '../src/components/three/Model';
import { KayActor } from '../src/components/three/KayActor';
import { MaketCezveStation, MaketCounter, MaketPlant, MaketWall, MaketWallShelf } from '../src/components/three/maketParts';
import { FLOOR_THEMES, LIGHTING, PALETTE, WALL_THEMES } from '../src/config/palette';
import { CAMERA_LOOK_Y } from '../src/config/actor';
import { CAMERA_FOV } from '../src/config/camera';
import { KAY_F, KAY_R, Kutu, Sandalye, Silindir, type Oturak } from './kat2-ortak';

const q = new URLSearchParams(location.search);
type Tur = 'okey' | 'tavla' | 'cezve' | 'merdiven';
const ESYA = (q.get('esya') ?? 'okey') as Tur;
const NO = Number(q.get('no') ?? 1);
const YOL = q.get('yol') as 'A' | 'B' | 'C' | 'D' | 'E' | null;

const ZEMIN = FLOOR_THEMES.parke; // D-180
const TEMA = WALL_THEMES.krem;
const BAKIR = '#b87333';
const CEVIZ = '#6b4026';
const KOYU = '#5d4037';
const KREM_TAS = '#f4eedc';

// ================================ OKEY ================================
type OkeyAday = { masa: 'kayOrta' | 'kat1' | 'cerceve' | 'yuvarlak'; cuha?: string; oturak: Oturak; ortu?: string; cay?: boolean; boy?: number; pirinc?: boolean };
const OKEY: Record<number, OkeyAday> = {
  1: { masa: 'kayOrta', cuha: '#2e7d4f', oturak: 'chair_A_wood' }, // tur 1'deki hâl
  2: { masa: 'kat1', cuha: '#2e7d4f', oturak: 'tabure' }, // Kat 1 masa + tabure ailesi
  3: { masa: 'cerceve', cuha: '#2e7d4f', oturak: 'chair_B_wood' }, // çerçeveli klasik okey masası
  4: { masa: 'yuvarlak', cuha: '#2e7d4f', oturak: 'chair_A_wood' }, // yuvarlak tabla
  5: { masa: 'cerceve', cuha: '#8e2f2a', oturak: 'tabure', cay: true }, // bordo çuha + tabure + çay
  6: { masa: 'kat1', cuha: '#2e7d4f', oturak: 'chair_A_wood', ortu: '#5a93cf', cay: true }, // Kat 1 mavi örtü üstüne çuha
};

const UST = 0.75; // tabla üstü (Kat 1 ile aynı, D-073)

/*
 * YÜKSELTME YOLLARI — Kat 1'in masa merdiveni (Tables.tsx): Sv1 çıplak + 1 tabure · Sv2 +1 tabure ·
 * Sv3 minder · Sv4 masa BÜYÜR · Sv5 örtü. Okeyde hep 4, tavlada hep 2 kişi oturur → oturak SAYISI
 * seviye sinyali olamaz; yerine çuha/oturak tipi/boy/aksesuar. Her basamak TEK gözle görülür değişim.
 */
const YESIL = '#2e7d4f';
const BORDO = '#8e2f2a';
const MAVI = '#5a93cf'; // Kat 1'in örtü mavisi (PALETTE.tableclothByLevel)
const OKEY_YOL: Record<'A' | 'B' | 'C' | 'D' | 'E', OkeyAday[]> = {
  // Kullanıcı (tur 2b): "seviye yükseldikçe sandalye olsun; sandalyeler ya da masa Kat 1'deki gibi mavileşsin".
  D: [ // tabure → ahşap sandalye → MAVİ sandalye → masa büyür → MASA mavileşir (Kat 1 Sv5 örtüsü)
    { masa: 'kat1', cuha: YESIL, oturak: 'stool_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'chair_A_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'chair_A' },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_A', boy: 1.15 },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_A', boy: 1.15, ortu: MAVI, cay: true },
  ],
  E: [ // tabure → MAVİ tabure → ahşap sandalye → masa büyür + MAVİ sandalye → pirinç + çay
    { masa: 'kat1', cuha: YESIL, oturak: 'stool_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'stool' },
    { masa: 'kat1', cuha: YESIL, oturak: 'chair_A_wood' },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_A', boy: 1.15 },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_A', boy: 1.15, pirinc: true, cay: true },
  ],
  A: [ // Kat 1'in yolu: çuha → minder → masa büyür → pirinç + çay
    { masa: 'kat1', oturak: 'stool_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'stool_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'stool' },
    { masa: 'cerceve', cuha: YESIL, oturak: 'stool', boy: 1.15 },
    { masa: 'cerceve', cuha: YESIL, oturak: 'stool', boy: 1.15, pirinc: true, cay: true },
  ],
  B: [ // Sandalyeye geçiş: tabure → sandalye → çerçeveli masa → oymalı sandalye + büyür → bordo çuha
    { masa: 'kat1', cuha: YESIL, oturak: 'stool_wood' },
    { masa: 'kat1', cuha: YESIL, oturak: 'chair_A_wood' },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_A_wood' },
    { masa: 'cerceve', cuha: YESIL, oturak: 'chair_B_wood', boy: 1.15 },
    { masa: 'cerceve', cuha: BORDO, oturak: 'chair_B_wood', boy: 1.15, cay: true },
  ],
  C: [ // Yuvarlak: çıplak → çuha → minder → büyür + sandalye → pirinç + çay
    { masa: 'yuvarlak', oturak: 'stool_wood' },
    { masa: 'yuvarlak', cuha: YESIL, oturak: 'stool_wood' },
    { masa: 'yuvarlak', cuha: YESIL, oturak: 'stool' },
    { masa: 'yuvarlak', cuha: YESIL, oturak: 'chair_A_wood', boy: 1.15 },
    { masa: 'yuvarlak', cuha: YESIL, oturak: 'chair_A_wood', boy: 1.15, pirinc: true, cay: true },
  ],
};

function Pirinc({ hw, y, yuvarlak }: { hw: number; y: number; yuvarlak?: boolean }) {
  const m = <meshStandardMaterial color={PALETTE.brass} metalness={0.7} roughness={0.3} />;
  if (yuvarlak)
    return (
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[hw, 0.022, 6, 32]} />
        {m}
      </mesh>
    );
  return (
    <group>
      {[[0, hw, 2 * hw + 0.05, 0.03], [0, -hw, 2 * hw + 0.05, 0.03], [hw, 0, 0.03, 2 * hw + 0.05], [-hw, 0, 0.03, 2 * hw + 0.05]].map(([x, z, w, d], k) => (
        <mesh key={k} position={[x, y, z]}>
          <boxGeometry args={[w, 0.06, d]} />
          {m}
        </mesh>
      ))}
    </group>
  );
}

function OkeyMasasi({ x, z, a, dolu, i }: { x: number; z: number; a: OkeyAday; dolu: boolean; i: number }) {
  const b = a.boy ?? 1;
  const r = 1.0 + (b - 1) * 0.6;
  const yer: [number, number][] = [[0, r], [r, 0], [0, -r], [-r, 0]];
  const yuvarlak = a.masa === 'yuvarlak';
  let ust = UST;
  let tabla: ReactNode;
  if (a.masa === 'kayOrta') tabla = <Model src={`${KAY_F}table_medium.gltf`} scale={[0.6, 0.75, 0.6]} fallback={null} />;
  else if (a.masa === 'kat1') tabla = <Model src={`${KAY_F}table_small.gltf`} scale={[1.12, 0.75, 1.12]} fallback={null} />;
  else if (a.masa === 'cerceve') {
    ust = 0.77;
    tabla = (
      <group>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => (
          <Kutu key={k} w={0.08} h={0.73} d={0.08} renk={CEVIZ} pos={[sx * 0.52, 0.365, sz * 0.52]} />
        ))}
        <Kutu w={1.04} h={0.1} d={1.04} renk={CEVIZ} pos={[0, 0.66, 0]} />
        <Kutu w={1.16} h={0.04} d={1.16} renk={CEVIZ} pos={[0, 0.73, 0]} />
        {[0, 1, 2, 3].map((k) => (
          <Kutu key={`c${k}`} w={k % 2 ? 0.08 : 1.2} h={0.05} d={k % 2 ? 1.2 : 0.08} renk="#4a2a18" pos={[k === 1 ? 0.56 : k === 3 ? -0.56 : 0, 0.775, k === 0 ? 0.56 : k === 2 ? -0.56 : 0]} />
        ))}
      </group>
    );
  } else {
    tabla = (
      <group>
        <Silindir r1={0.3} r2={0.3} h={0.04} renk={CEVIZ} pos={[0, 0.02, 0]} seg={16} />
        <Silindir r1={0.07} r2={0.09} h={0.7} renk={CEVIZ} pos={[0, 0.37, 0]} seg={10} />
        <Silindir r1={0.66} r2={0.66} h={0.05} renk={CEVIZ} pos={[0, 0.725, 0]} seg={28} />
      </group>
    );
  }
  const cuhaY = ust + 0.006;
  return (
    <group>
      <group position={[x, 0, z]} scale={[b, 1, b]}>
        {tabla}
        {a.pirinc && <Pirinc hw={yuvarlak ? 0.665 : a.masa === 'cerceve' ? 0.6 : 0.565} y={ust - 0.03} yuvarlak={yuvarlak} />}
        {a.ortu && (
          <mesh position={[0, ust + 0.003, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[1.25, 0.006, 1.25]} />
            <meshStandardMaterial color={a.ortu} />
          </mesh>
        )}
        {!a.cuha ? null : yuvarlak ? (
          <Silindir r1={0.58} r2={0.58} h={0.012} renk={a.cuha} pos={[0, cuhaY + 0.004, 0]} seg={28} />
        ) : (
          <mesh position={[0, cuhaY + (a.ortu ? 0.006 : 0), 0]} receiveShadow>
            <boxGeometry args={[a.masa === 'cerceve' ? 1.04 : 1.04, 0.012, a.masa === 'cerceve' ? 1.04 : 1.04]} />
            <meshStandardMaterial color={a.cuha} />
          </mesh>
        )}
        {yer.map(([dx, dz], k) => (
          <group key={k} position={[(dx / r) * 0.4, cuhaY + 0.03, (dz / r) * 0.4]} rotation={[0, Math.atan2(dx, dz), 0]}>
            <Kutu w={0.62} h={0.05} d={0.11} renk="#8a5a3b" pos={[0, 0, 0]} />
            <Kutu w={0.54} h={0.08} d={0.025} renk={KREM_TAS} pos={[0, 0.06, -0.02]} />
            {Array.from({ length: 6 }, (_, t) => (
              <mesh key={t} position={[-0.22 + t * 0.088, 0.08, -0.004]}>
                <boxGeometry args={[0.018, 0.018, 0.004]} />
                <meshStandardMaterial color={['#c62828', '#1565c0', '#222', '#e0a000'][(t + k) % 4]} />
              </mesh>
            ))}
          </group>
        ))}
        {Array.from({ length: 7 }, (_, k) => (
          <Kutu key={`t${k}`} w={0.07} h={0.03} d={0.05} renk={KREM_TAS} pos={[((k % 4) - 1.5) * 0.08, cuhaY + 0.02 + Math.floor(k / 4) * 0.035, (Math.floor(k / 4) - 0.5) * 0.07]} />
        ))}
        {a.cay && <CayBardaklari ust={cuhaY} />}
      </group>
      {yer.map(([dx, dz], k) => (
        <Sandalye key={k} x={x + dx} z={z + dz} aci={Math.atan2(-dx, -dz)} kisi={dolu} i={i * 4 + k} tip={a.oturak} />
      ))}
    </group>
  );
}

function CayBardaklari({ ust }: { ust: number }) {
  return (
    <group>
      {[[0.38, 0.38], [-0.38, -0.38]].map(([x, z], k) => (
        <group key={k} position={[x, ust, z]}>
          <Silindir r1={0.05} r2={0.05} h={0.008} renk="#f4f1ea" pos={[0, 0.006, 0]} seg={12} />
          <Silindir r1={0.026} r2={0.02} h={0.08} renk="#c0571c" pos={[0, 0.05, 0]} seg={10} />
        </group>
      ))}
    </group>
  );
}

// ================================ TAVLA ================================
type TavlaAday = { masa: 'kayKucuk' | 'kat1' | 'yuvarlak'; tahta: 'kutu' | 'kakma' | 'cuha'; oturak: Oturak; cay?: boolean; boy?: number; pirinc?: boolean };
const TAVLA_YOL: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E', TavlaAday[]>> = {
  A: [ // Kat 1'in yolu: kakma kutu → minder → masa büyür → pirinç + çay/zar
    { masa: 'kat1', tahta: 'kutu', oturak: 'stool_wood' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'stool_wood' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'stool' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'stool', boy: 1.2 },
    { masa: 'kat1', tahta: 'kakma', oturak: 'stool', boy: 1.2, pirinc: true, cay: true },
  ],
  B: [ // Sandalyeye geçiş: kakma → sandalye → oymalı + büyür → yeşil çuhalı tavla + çay
    { masa: 'kat1', tahta: 'kutu', oturak: 'stool_wood' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'stool_wood' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'chair_A_wood' },
    { masa: 'kat1', tahta: 'kakma', oturak: 'chair_B_wood', boy: 1.2 },
    { masa: 'kat1', tahta: 'cuha', oturak: 'chair_B_wood', boy: 1.2, cay: true },
  ],
  C: [ // Yuvarlak masa: kakma → minder → büyür + sandalye → pirinç + çay/zar
    { masa: 'yuvarlak', tahta: 'kutu', oturak: 'stool_wood' },
    { masa: 'yuvarlak', tahta: 'kakma', oturak: 'stool_wood' },
    { masa: 'yuvarlak', tahta: 'kakma', oturak: 'stool' },
    { masa: 'yuvarlak', tahta: 'kakma', oturak: 'chair_A_wood', boy: 1.2 },
    { masa: 'yuvarlak', tahta: 'kakma', oturak: 'chair_A_wood', boy: 1.2, pirinc: true, cay: true },
  ],
};
const TAVLA: Record<number, TavlaAday> = {
  1: { masa: 'kayKucuk', tahta: 'kutu', oturak: 'chair_A_wood' }, // tur 1'deki hâl
  2: { masa: 'kat1', tahta: 'kutu', oturak: 'tabure' }, // Kat 1 ikili masa + tabure
  3: { masa: 'kat1', tahta: 'kakma', oturak: 'tabure' }, // açık kakma tavla kutusu
  4: { masa: 'yuvarlak', tahta: 'kakma', oturak: 'chair_A_wood' }, // küçük yuvarlak masa
  5: { masa: 'kat1', tahta: 'cuha', oturak: 'chair_B_wood' }, // yeşil çuhalı tavla
  6: { masa: 'kat1', tahta: 'kakma', oturak: 'tabure', cay: true }, // kakma + çay + zar
};

function TavlaTahtasi({ tip, ust }: { tip: TavlaAday['tahta']; ust: number }) {
  if (tip === 'kutu') {
    return (
      <group position={[0, ust, 0]}>
        <Kutu w={0.46} h={0.05} d={0.62} renk="#5d3a24" pos={[0, 0.025, 0]} />
        {[-1, 1].map((k) => (
          <mesh key={k} position={[0, 0.052, k * 0.155]}>
            <boxGeometry args={[0.4, 0.004, 0.27]} />
            <meshStandardMaterial color="#e6cf9e" />
          </mesh>
        ))}
        <Pullar y={0.06} />
      </group>
    );
  }
  const alan = tip === 'cuha' ? '#2f6b45' : '#ead7ae';
  const ucA = tip === 'cuha' ? '#f1e6cc' : '#9b2c22';
  const ucB = tip === 'cuha' ? '#9b2c22' : '#3a2a20';
  const W = 0.6;
  const D = 0.78;
  return (
    <group position={[0, ust, 0]}>
      <Kutu w={W} h={0.03} d={D} renk="#4a2a18" pos={[0, 0.015, 0]} />
      <mesh position={[0, 0.032, 0]}>
        <boxGeometry args={[W - 0.06, 0.004, D - 0.06]} />
        <meshStandardMaterial color={alan} />
      </mesh>
      {/* kenarlar + orta menteşe çıtası */}
      {[[0, -D / 2 + 0.015, W, 0.03], [0, D / 2 - 0.015, W, 0.03], [0, 0, W, 0.04]].map(([x, z, w, d], k) => (
        <Kutu key={k} w={w} h={0.055} d={d} renk="#4a2a18" pos={[x, 0.045, z]} />
      ))}
      {[-1, 1].map((s) => (
        <Kutu key={`y${s}`} w={0.03} h={0.055} d={D} renk="#4a2a18" pos={[s * (W / 2 - 0.015), 0.045, 0]} />
      ))}
      {/* 24 hane: iki yarıda, iki uzun kenardan merkeze uzanan ince uçlar */}
      {[-1, 1].flatMap((yari) =>
        [-1, 1].flatMap((kenar) =>
          Array.from({ length: 6 }, (_, n) => {
            const z = yari * (0.05 + n * 0.054 + 0.027);
            return (
              <mesh key={`${yari}${kenar}${n}`} position={[kenar * (W / 2 - 0.03 - 0.1), 0.036, z]}>
                <boxGeometry args={[0.2, 0.003, 0.028]} />
                <meshStandardMaterial color={(n + (kenar > 0 ? 1 : 0)) % 2 ? ucA : ucB} />
              </mesh>
            );
          }),
        ),
      )}
      <Pullar y={0.045} />
    </group>
  );
}

function Pullar({ y }: { y: number }) {
  return (
    <group>
      {Array.from({ length: 12 }, (_, k) => {
        const sira = k % 6;
        const kat = Math.floor(k / 6);
        const beyaz = sira < 3;
        return (
          <Silindir key={k} r1={0.032} r2={0.032} h={0.018} renk={beyaz ? '#f6f1e4' : '#2b1d16'} pos={[(beyaz ? -1 : 1) * 0.19, y + kat * 0.019, -0.33 + (sira % 3) * 0.066 + (beyaz ? 0 : 0.4)]} seg={12} />
        );
      })}
    </group>
  );
}

function TavlaMasasi({ x, z, a, dolu, i }: { x: number; z: number; a: TavlaAday; dolu: boolean; i: number }) {
  const b = a.boy ?? 1;
  const r = 0.85 + (b - 1) * 0.45;
  const yer: [number, number][] = [[r, 0], [-r, 0]];
  let tabla: ReactNode;
  if (a.masa === 'kayKucuk') tabla = <Model src={`${KAY_F}table_small.gltf`} scale={[0.8, 0.75, 0.8]} fallback={null} />;
  else if (a.masa === 'kat1') tabla = <Model src={`${KAY_F}table_small.gltf`} scale={[0.9, 0.75, 0.9]} fallback={null} />;
  else
    tabla = (
      <group>
        <Silindir r1={0.25} r2={0.25} h={0.04} renk={CEVIZ} pos={[0, 0.02, 0]} seg={16} />
        <Silindir r1={0.06} r2={0.08} h={0.7} renk={CEVIZ} pos={[0, 0.37, 0]} seg={10} />
        <Silindir r1={0.5} r2={0.5} h={0.05} renk={CEVIZ} pos={[0, 0.725, 0]} seg={24} />
      </group>
    );
  return (
    <group>
      <group position={[x, 0, z]}>
        <group scale={[b, 1, b]}>
          {tabla}
          {a.pirinc && <Pirinc hw={a.masa === 'yuvarlak' ? 0.505 : 0.45} y={UST - 0.03} yuvarlak={a.masa === 'yuvarlak'} />}
        </group>
        <TavlaTahtasi tip={a.tahta} ust={UST} />
        {a.cay && (
          <group>
            <group position={[0.34, UST, 0.36]}>
              <Silindir r1={0.05} r2={0.05} h={0.008} renk="#f4f1ea" pos={[0, 0.006, 0]} seg={12} />
              <Silindir r1={0.026} r2={0.02} h={0.08} renk="#c0571c" pos={[0, 0.05, 0]} seg={10} />
            </group>
            <group position={[-0.34, UST, -0.36]}>
              <Silindir r1={0.05} r2={0.05} h={0.008} renk="#f4f1ea" pos={[0, 0.006, 0]} seg={12} />
              <Silindir r1={0.026} r2={0.02} h={0.08} renk="#c0571c" pos={[0, 0.05, 0]} seg={10} />
            </group>
            <Kutu w={0.035} h={0.035} d={0.035} renk="#fafafa" pos={[0.1, UST + 0.08, 0.2]} rot={[0, 0.5, 0]} />
            <Kutu w={0.035} h={0.035} d={0.035} renk="#fafafa" pos={[0.15, UST + 0.08, 0.14]} rot={[0, 1.1, 0]} />
          </group>
        )}
      </group>
      {yer.map(([dx, dz], k) => (
        <Sandalye key={k} x={x + dx} z={z + dz} aci={Math.atan2(-dx, -dz)} kisi={dolu} i={i * 2 + k + 200} tip={a.oturak} />
      ))}
    </group>
  );
}

// ================================ CEZVE OCAĞI ================================
function Cezve({ x, y, z, gomuk = 0, s = 1 }: { x: number; y: number; z: number; gomuk?: number; s?: number }) {
  return (
    <group position={[x, y - gomuk, z]} scale={s}>
      <Silindir r1={0.07} r2={0.095} h={0.16} renk={BAKIR} pos={[0, 0.08, 0]} seg={10} />
      <Silindir r1={0.016} r2={0.016} h={0.28} renk={KOYU} pos={[0, 0.13, -0.17]} rot={[Math.PI / 2.4, 0, 0]} seg={5} />
    </group>
  );
}

/** Kum ocağı: bakır tepsi içinde kızgın kum, cezveler kuma gömülü, altta köz ışığı. */
function KumOcagi({ x, len = 1.5 }: { x: number; len?: number }) {
  return (
    <group position={[x, 0.97, 0]}>
      <Kutu w={len} h={0.14} d={0.6} renk={BAKIR} pos={[0, 0.07, 0]} />
      <mesh position={[0, 0.142, 0]}>
        <boxGeometry args={[len - 0.08, 0.006, 0.52]} />
        <meshStandardMaterial color="#d9bd84" />
      </mesh>
      <mesh position={[0, 0.03, 0.302]}>
        <boxGeometry args={[len - 0.2, 0.04, 0.006]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#ff5a00" emissiveIntensity={1.2} />
      </mesh>
      {Array.from({ length: Math.round(len / 0.34) }, (_, i) => (
        <Cezve key={i} x={(i - (Math.round(len / 0.34) - 1) / 2) * 0.34} y={0.145} z={0.02} gomuk={0.05} />
      ))}
    </group>
  );
}

function Fincanlar({ x, z, n = 4, yukseklik = 0.97 }: { x: number; z: number; n?: number; yukseklik?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, j) => (
        <group key={j} position={[x + (j % 2) * 0.2, yukseklik, z + Math.floor(j / 2) * 0.2]}>
          <Silindir r1={0.06} r2={0.06} h={0.008} renk="#f4f1ea" pos={[0, 0.006, 0]} seg={12} />
          <Silindir r1={0.042} r2={0.032} h={0.06} renk="#f4f1ea" pos={[0, 0.04, 0]} seg={10} />
        </group>
      ))}
    </group>
  );
}

function Semaver({ x }: { x: number }) {
  return (
    <group position={[x, 0.97, 0]}>
      <Silindir r1={0.16} r2={0.19} h={0.08} renk={BAKIR} pos={[0, 0.04, 0]} seg={16} />
      <Silindir r1={0.17} r2={0.21} h={0.44} renk={BAKIR} pos={[0, 0.3, 0]} seg={16} />
      <Silindir r1={0.08} r2={0.12} h={0.1} renk={BAKIR} pos={[0, 0.57, 0]} seg={14} />
      <Silindir r1={0.09} r2={0.08} h={0.14} renk="#f4f1ea" pos={[0, 0.69, 0]} seg={12} />
      <Silindir r1={0.015} r2={0.015} h={0.14} renk={BAKIR} pos={[0, 0.16, 0.22]} rot={[Math.PI / 2, 0, 0]} seg={6} />
    </group>
  );
}

function OcakIzgara() {
  // ocak gözü: koyu halka + mavi alev (ince emissive disk)
  return (
    <group>
      {[-0.45, 0.25].map((x) => (
        <group key={x} position={[x, 0.97, 0]}>
          <Silindir r1={0.2} r2={0.2} h={0.03} renk="#2b2b2b" pos={[0, 0.015, 0]} seg={16} />
          <Silindir r1={0.12} r2={0.12} h={0.008} renk="#3a7bff" pos={[0, 0.034, 0]} seg={16} em={1.4} />
          <Cezve x={0} y={0.04} z={0} />
        </group>
      ))}
    </group>
  );
}

function Davlumbaz() {
  return (
    <group position={[-0.1, 0, -0.55]}>
      <mesh position={[0, 2.05, 0.15]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.95, 0.55, 4]} />
        <meshStandardMaterial color={BAKIR} />
      </mesh>
      <Silindir r1={0.16} r2={0.16} h={0.9} renk={BAKIR} pos={[0, 2.75, 0.15]} seg={10} />
      <Kutu w={1.42} h={0.06} d={0.9} renk="#8a5326" pos={[0, 1.79, 0.15]} />
    </group>
  );
}

// ---- KayKit restoran parçalarıyla (Kat 1 mutfağı: kitchenLook.ts — ölçek 0,9, sırt duvarda) ----
const KS = 0.9;
const DUVAR_IC = -2.11; // Duvar() z −2,2 · kalınlık 0,18
const MODUL = 2.0 * KS;
const kz = (minZ: number) => DUVAR_IC - minZ * KS; // kitchenLook.arkaZ ile aynı türetme
const ASILI_Y = 3.2 - (2.0 + 2.0) * KS; // kitchenLook.WALL_UNIT_Y
function Kay({ ad, x, z, y = 0 }: { ad: string; x: number; z: number; y?: number }) {
  return <Model src={`${KAY_R}${ad}.gltf`} scale={KS} position={[x, y, z]} fallback={null} />;
}
function KayOcak({ no }: { no: number }) {
  const ust = 1.0 * KS; // tezgâh üstü
  const onZ = kz(-1.0) + 0.1; // tezgâhın orta-önü
  return (
    <group>
      <Kay ad="kitchencounter_straight_A_backsplash" x={-MODUL} z={kz(-1.0)} />
      <Kay ad="stove_single" x={0} z={kz(-1.03)} />
      <Kay ad={no === 9 ? 'kitchencounter_straight_B_backsplash' : 'kitchencounter_straight_B_backsplash'} x={MODUL} z={kz(-1.0)} />
      {no !== 9 && <Kay ad="extractorhood" x={0} z={DUVAR_IC} y={ASILI_Y} />}
      {no === 8 && (
        <>
          <Kay ad="kitchencabinet" x={-MODUL} z={DUVAR_IC} y={ASILI_Y} />
          <Kay ad="kitchencabinet" x={MODUL} z={DUVAR_IC} y={ASILI_Y} />
        </>
      )}
      {/* ocak gözlerinde cezveler */}
      {/* KayKit ölçeğinde cezve 1,5× (ocak ızgarası iri); ızgaranın üstünde durur */}
      {[-0.24, 0.24].map((x) => (
        <Cezve key={x} x={x} y={ust + 0.16} z={kz(-1.03) + 0.05} s={1.5} />
      ))}
      {/* sol tezgâh: fincanlar · sağ tezgâh: semaver (9) ya da cezve dizisi */}
      <Fincanlar x={-MODUL - 0.3} z={onZ - 0.85} n={4} yukseklik={ust} />
      {no === 9 ? (
        <group position={[MODUL, ust - 0.97, onZ]}>
          <Semaver x={0} />
        </group>
      ) : (
        Array.from({ length: 3 }, (_, i) => <Cezve key={`d${i}`} x={MODUL - 0.45 + i * 0.45} y={ust} z={onZ} s={1.5} />)
      )}
      {no === 9 && <Kay ad="shelf_papertowel_decorated" x={-MODUL} z={DUVAR_IC} y={1.9} />}
    </group>
  );
}

function CezveAday({ no }: { no: number }) {
  if (no >= 7) {
    return (
      <group>
        <KayOcak no={no} />
        <group position={[0.15, 0, 0.45]} rotation={[0, Math.PI, 0]}>
          <KayActor kind="waiter" hal="calis" />
        </group>
      </group>
    );
  }
  // Tezgâh dünyada z = 0'da, müşteri yüzü +z; çaycı arkasında (−z), duvar onun arkasında.
  return (
    <group>
      {no === 1 && <MaketCezveStation pos={[0, 0, 0]} rot={Math.PI} />}
      {no !== 1 && <MaketCounter len={2.6} pos={[0, 0, 0]} />}
      {no === 2 && (
        <>
          <KumOcagi x={-0.35} />
          <Fincanlar x={0.85} z={-0.2} />
        </>
      )}
      {no === 3 && (
        <>
          <OcakIzgara />
          <Fincanlar x={0.85} z={-0.2} />
        </>
      )}
      {no === 4 && (
        <>
          <KumOcagi x={-0.35} />
          <Fincanlar x={0.85} z={-0.2} />
          <Davlumbaz />
        </>
      )}
      {no === 5 && (
        <>
          <KumOcagi x={-0.35} />
          <Fincanlar x={0.85} z={-0.2} />
          <MaketWallShelf w={2.4} pos={[0, 1.75, -1.85]} />
          <Kutu w={2.4} h={0.05} d={0.05} renk={KOYU} pos={[0, 2.25, -1.8]} />
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} position={[-1 + i * 0.4, 2.0, -1.72]}>
              <Silindir r1={0.07} r2={0.09} h={0.14} renk={BAKIR} pos={[0, 0, 0]} seg={10} />
            </group>
          ))}
        </>
      )}
      {no === 6 && (
        <>
          <Semaver x={-0.85} />
          <KumOcagi x={0.45} len={1.2} />
          <Fincanlar x={-0.3} z={0.15} n={2} />
        </>
      )}
      <group position={[0.2, 0, -1.0]} rotation={[0, 0, 0]}>
        <KayActor kind="waiter" hal="calis" />
      </group>
    </group>
  );
}

// ================================ MERDİVEN ÇIKIŞI ================================
const BX = 2.3; // boşluk yarı eni (plan ile aynı)
const BZ = { arka: -3.1, on: 3.1 };
type Korkuluk = 'ince' | 'kalin' | 'panel' | 'ferforje';
const MERDIVEN: Record<number, { k: Korkuluk; saksi?: boolean; yolluk?: boolean; lamba?: boolean; cerceve?: boolean }> = {
  1: { k: 'ince' }, // tur 1'deki hâl
  2: { k: 'kalin' }, // kalın ahşap + babalar
  3: { k: 'panel' }, // dolu ahşap panel
  4: { k: 'ferforje' }, // siyah demir + pirinç topuz
  5: { k: 'kalin', saksi: true, yolluk: true }, // karşılama: saksı + yolluk
  6: { k: 'kalin', lamba: true, cerceve: true }, // lamba direkleri + koyu kuyu çerçevesi
};

function KorkulukHat({ x1, z1, x2, z2, k }: { x1: number; z1: number; x2: number; z2: number; k: Korkuluk }) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const yatay = z1 === z2;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const boy = (w: number, d: number) => (yatay ? [L, w, d] : [d, w, L]) as [number, number, number];
  if (k === 'panel') {
    return (
      <group>
        <mesh position={[cx, 0.48, cz]} castShadow>
          <boxGeometry args={boy(0.96, 0.14)} />
          <meshStandardMaterial color={KOYU} />
        </mesh>
        <mesh position={[cx, 1.0, cz]} castShadow>
          <boxGeometry args={boy(0.08, 0.24)} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
      </group>
    );
  }
  const ara = k === 'ince' ? 0.45 : k === 'ferforje' ? 0.16 : 0.24;
  const n = Math.round(L / ara);
  const ray = k === 'ferforje' ? '#1f1f1f' : PALETTE.doorWood;
  const dik = k === 'ferforje' ? '#262626' : k === 'ince' ? '#6b4f3a' : '#7a5236';
  return (
    <group>
      <mesh position={[cx, 1.0, cz]} castShadow>
        <boxGeometry args={boy(k === 'kalin' ? 0.1 : 0.08, k === 'kalin' ? 0.16 : k === 'ferforje' ? 0.07 : 0.14)} />
        <meshStandardMaterial color={ray} />
      </mesh>
      {k !== 'ince' && (
        <mesh position={[cx, 0.12, cz]}>
          <boxGeometry args={boy(0.06, 0.1)} />
          <meshStandardMaterial color={ray} />
        </mesh>
      )}
      {Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n;
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        return k === 'kalin' ? (
          <group key={i} position={[x, 0, z]}>
            <Silindir r1={0.035} r2={0.035} h={0.86} renk={dik} pos={[0, 0.55, 0]} seg={8} />
            <Silindir r1={0.05} r2={0.05} h={0.14} renk={dik} pos={[0, 0.5, 0]} seg={8} />
          </group>
        ) : (
          <Silindir key={i} r1={k === 'ferforje' ? 0.014 : 0.035} r2={k === 'ferforje' ? 0.014 : 0.035} h={1.0} renk={dik} pos={[x, 0.5, z]} seg={6} />
        );
      })}
    </group>
  );
}

function Baba({ x, z, k }: { x: number; z: number; k: Korkuluk }) {
  if (k === 'ince') return null;
  const demir = k === 'ferforje';
  return (
    <group position={[x, 0, z]}>
      <Kutu w={demir ? 0.07 : 0.18} h={1.12} d={demir ? 0.07 : 0.18} renk={demir ? '#1f1f1f' : KOYU} pos={[0, 0.56, 0]} />
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[demir ? 0.06 : 0.1, 12, 8]} />
        <meshStandardMaterial color={demir ? '#d4af37' : '#8a5a3b'} metalness={demir ? 0.5 : 0} roughness={demir ? 0.35 : 0.8} />
      </mesh>
    </group>
  );
}

function MerdivenAday({ no }: { no: number }) {
  const a = MERDIVEN[no];
  const N = 14;
  const D = (BZ.on - BZ.arka) / N;
  const h = 3.2 / N;
  const hatlar: [number, number, number, number][] = [
    [-BX, BZ.on, BX, BZ.on],
    [-BX, BZ.arka + 1.2, -BX, BZ.on],
    [BX, BZ.arka + 1.2, BX, BZ.on],
  ];
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * BX, -1.6, 0]}>
          <boxGeometry args={[0.05, 3.2, BZ.on - BZ.arka]} />
          <meshStandardMaterial color="#5a4a3e" />
        </mesh>
      ))}
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[0, -(i + 0.5) * h - 0.02, BZ.arka + (i + 0.5) * D]} receiveShadow>
          <boxGeometry args={[BX * 2 - 0.1, h, D]} />
          <meshStandardMaterial color={i % 2 ? '#8a6a4f' : '#94735a'} />
        </mesh>
      ))}
      {hatlar.map(([x1, z1, x2, z2], i) => (
        <KorkulukHat key={i} x1={x1} z1={z1} x2={x2} z2={z2} k={a.k} />
      ))}
      {[[-BX, BZ.on], [BX, BZ.on], [-BX, BZ.arka + 1.2], [BX, BZ.arka + 1.2]].map(([x, z], i) => (
        <Baba key={i} x={x} z={z} k={a.k} />
      ))}
      {a.cerceve &&
        [[0, BZ.on + 0.15, BX * 2 + 0.6, 0.3], [-BX - 0.15, 0, 0.3, BZ.on - BZ.arka], [BX + 0.15, 0, 0.3, BZ.on - BZ.arka]].map(([x, z, w, d], i) => (
          <mesh key={`c${i}`} position={[x, 0.008, z]} receiveShadow>
            <boxGeometry args={[w, 0.012, d]} />
            <meshStandardMaterial color="#4a2a18" />
          </mesh>
        ))}
      {a.saksi && (
        <>
          <MaketPlant pos={[-BX - 0.55, 0, BZ.on + 0.5]} big />
          <MaketPlant pos={[BX + 0.55, 0, BZ.on + 0.5]} big />
        </>
      )}
      {a.yolluk &&
        [-1, 1].map((s) => (
          <group key={`y${s}`} position={[s * (BX + 1.1), 0, BZ.arka + 0.6]}>
            <mesh position={[0, 0.01, 0]} receiveShadow>
              <boxGeometry args={[1.9, 0.01, 0.95]} />
              <meshStandardMaterial color="#d9b56a" />
            </mesh>
            <mesh position={[0, 0.016, 0]} receiveShadow>
              <boxGeometry args={[1.7, 0.01, 0.75]} />
              <meshStandardMaterial color="#8e2f2a" />
            </mesh>
          </group>
        ))}
      {a.lamba &&
        [-1, 1].map((s) => (
          <group key={`l${s}`} position={[s * (BX + 0.5), 0, BZ.on + 0.5]}>
            <Model src={`${KAY_F}lamp_standing.gltf`} scale={0.75} fallback={null} />
          </group>
        ))}
    </group>
  );
}

// ================================ SAHNE ================================
type Cerceve = { bak: [number, number, number]; d: number };
const KADRAJ: Record<Tur, Cerceve> = {
  okey: { bak: [0.08, 0.45, -0.1], d: 3.9 },
  tavla: { bak: [0.05, 0.5, -0.05], d: 3.6 },
  cezve: { bak: [0.3, 0.9, -0.2], d: 3.4 },
  merdiven: { bak: [0, 0, 0.2], d: 6.4 },
};

function Kamera() {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as import('three').PerspectiveCamera;
    // Yol karesi beş masayı yan yana gösterir: dar açı + uzak kamera → kenardaki masa çarpılmaz (aynı boy okunur).
    const { bak, d } = YOL
      ? { bak: [0, 0.35, 0.15] as [number, number, number], d: ESYA === 'okey' ? 8.6 : 8.0 }
      : ESYA === 'cezve' && NO >= 7
        ? { bak: [0, 0.9, -0.7] as [number, number, number], d: 4.4 } // KayKit ocağı üç modül (5,4 m)
        : KADRAJ[ESYA];
    cam.fov = YOL ? 26 : CAMERA_FOV;
    cam.position.set(bak[0], bak[1] + d, bak[2] + d);
    cam.lookAt(bak[0], bak[1], bak[2]);
    cam.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Zemin() {
  const parca = (x0: number, x1: number, z0: number, z1: number, renk = ZEMIN.base) => (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.002, (z0 + z1) / 2]}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={renk} />
    </mesh>
  );
  if (ESYA === 'merdiven') {
    return (
      <group>
        {parca(-12, -BX, -3.6, 12)}
        {parca(BX, 12, -3.6, 12)}
        {parca(-BX, BX, BZ.on, 12)}
        {parca(-BX, BX, -3.6, BZ.arka)}
      </group>
    );
  }
  if (ESYA === 'cezve') {
    return (
      <group>
        {parca(-12, 12, -2.2, 0.6, '#e8dcc8')}
        {parca(-12, 12, 0.6, 12)}
      </group>
    );
  }
  return parca(-30, 30, -12, 14);
}

function Duvar() {
  const z = ESYA === 'merdiven' ? -3.6 : ESYA === 'cezve' ? -2.2 : -2.6;
  return (
    <group>
      <WallPanels slabs={[{ x: 0, z, w: 60, d: 0.18, theme: TEMA, h: WALL_H }]} />
      {ESYA === 'merdiven' && (
        <>
          <MaketWall x1={-4.6} z1={-3.6} x2={-4.6} z2={3.5} h={2.2} />
          <MaketWall x1={4.6} z1={-3.6} x2={4.6} z2={3.5} h={2.2} />
        </>
      )}
    </group>
  );
}

const YOL_ARA = { okey: 3.4, tavla: 3.2 } as const;
function Yol() {
  const ara = YOL_ARA[ESYA as 'okey' | 'tavla'];
  const seri = (ESYA === 'okey' ? OKEY_YOL[YOL!] : TAVLA_YOL[YOL!]) ?? [];
  return (
    <>
      {seri.map((a, k) =>
        ESYA === 'okey' ? (
          <OkeyMasasi key={k} x={(k - 2) * ara} z={0} a={a as OkeyAday} dolu={false} i={k} />
        ) : (
          <TavlaMasasi key={k} x={(k - 2) * ara} z={0} a={a as TavlaAday} dolu={false} i={k} />
        ),
      )}
    </>
  );
}

function Icerik() {
  if (YOL) return <Yol />;
  if (ESYA === 'okey') {
    const a = OKEY[NO];
    return (
      <>
        <OkeyMasasi x={-1.45} z={0} a={a} dolu i={NO} />
        <OkeyMasasi x={1.6} z={0} a={a} dolu={false} i={NO + 9} />
      </>
    );
  }
  if (ESYA === 'tavla') {
    const a = TAVLA[NO];
    return (
      <>
        <TavlaMasasi x={-1.15} z={0} a={a} dolu i={NO} />
        <TavlaMasasi x={1.25} z={0} a={a} dolu={false} i={NO + 9} />
      </>
    );
  }
  if (ESYA === 'cezve') {
    return (
      <>
        <CezveAday no={NO} />
        <group position={[1.95, 0, 1.0]}>
          <KayActor kind="owner" />
        </group>
      </>
    );
  }
  return (
    <>
      <MerdivenAday no={NO} />
      <group position={[-BX - 1.1, 0, BZ.arka + 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <KayActor kind="owner" />
      </group>
    </>
  );
}

function Hazir({ children }: { children: ReactNode }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 30) (window as unknown as { MAKET_HAZIR?: boolean }).MAKET_HAZIR = true;
  });
  return <>{children}</>;
}

createRoot(document.getElementById('kok')!).render(
  <Canvas shadows="percentage" camera={{ position: [0, 10, 10], fov: CAMERA_FOV }} gl={{ antialias: true, toneMappingExposure: LIGHTING.exposure, preserveDrawingBuffer: true }} dpr={[1, 2]}>
    <color attach="background" args={[LIGHTING.background]} />
    <SceneLights shadows />
    <Kamera />
    <Suspense fallback={null}>
      <Hazir>
        <Zemin />
        <Duvar />
        <Icerik />
      </Hazir>
    </Suspense>
  </Canvas>,
);
