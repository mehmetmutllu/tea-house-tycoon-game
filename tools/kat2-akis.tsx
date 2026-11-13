/**
 * kat2-akis.tsx — KAT 2 AKIŞ TURU (dev aracı, oyuna girmez · 2026-11-13).
 *
 * Kullanıcı ilk akış sayfasını "karmaşık, kareler dar" buldu. Bu araç bütün katı GENİŞ kadrajda,
 * oyunun kendi parçalarıyla (cezve ocağı, okey/tavla masası, alçak bölme, oturan müşteri) çizer;
 * değişen yalnız senaryo: başlangıç mutfağı nerede · 2. ocak nerede · açılış sırası · kapalı alan
 * nasıl görünür · tadilat perdesi nasıl görünür. Her soru aynı kadrajda yan yana kıyaslanır.
 *
 * Adres: /tools/kat2-akis.html?s=<senaryo>   (senaryolar aşağıda `S`)
 * Çekim: node tools/kat2-akis-cek.mjs        (çıktı docs/tasarim/kat2-akis/)
 */
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { SceneLights } from '../src/components/three/lights';
import { FloorPattern } from '../src/components/three/floorPattern';
import { WallPanels, type WallSlab } from '../src/components/three/wallPanel';
import { WALL_H } from '../src/components/three/wallOlcu';
import { KayActor } from '../src/components/three/KayActor';
import { MaketIskele, MaketLavaboBlock, MaketMoloz, MaketPlant, MaketTadilatPerde, MaketWall } from '../src/components/three/maketParts';
import { CezveOcagi, OcakKosesi, OkeyMasa, TavlaMasa, oturakYerleri, type OcakYeri } from '../src/components/three/kat2/Esya';
import { Oturan } from './kat2-ortak';
import { useGame } from '../src/game/store';
import { FLOOR_THEMES, LIGHTING, PALETTE, WALL_THEMES, type FloorTheme } from '../src/config/palette';
import { BAND, FLOOR_HALF } from '../src/game/layout';
import { AGIZ, KAT2_ALANLAR, KAT2_BOLMELER, KAT2_MASALAR, KOVA, type Dik } from '../src/game/kat';

const H = FLOOR_HALF;
const M = 0.5;
const ON = BAND.front;
const ARKA = BAND.back;
const TEMA = WALL_THEMES.krem;
const ZEMIN = FLOOR_THEMES.parke;
const SAP = '#bdb7ad';
const VURGU = '#ffb627';

// ============================== SENARYOLAR ==============================
type MutfakYeri = 'yok' | 'sol' | 'sag' | 'yan';
type Ocak2 = 'yok' | 'solBuyur' | 'sagBant' | 'disDuvar' | 'bugun';
type Kapali = 'kaba' | 'ortulu' | 'tamDuvar' | 'karanlik' | 'bos';
type Perde = 'bugun' | 'duz' | 'levha' | 'branda' | 'capraz' | 'kontrplak';
type Kadraj = 'genis' | 'perde';
interface Sen {
  mutfak: MutfakYeri;
  mutfakBuyuk: boolean;
  ocak2: Ocak2;
  /** Açık alanlar (0 merdiven salonu · 1 okey salonu · 2 tavla köşesi). */
  acik: number[];
  masalar: string[];
  kapali: Kapali;
  perde: Perde;
  kadraj: Kadraj;
  /** Bu adımda yeni açılanlar: alan numarası ya da masa/ocak kimliği ('mutfak', 'ocak2'). */
  yeni?: (number | string)[];
  /** Tur 2 (kullanıcı 2026-11-13): bölmeler kalkar; kapalı alan TAM duvar arkasında, açılınca duvar kalkar. */
  duvar?: 'alcak' | 'siva' | 'tahta';
  /** Bitmiş katın masa düzeni. */
  duzen?: 'bugun' | 'kilim' | 'kolon' | 'yeni' | 'izgara' | 'izgaraSik' | 'ayna';
  /** Bandın sağ köşesi Kat 2'nin lavabosu. */
  lavabo?: boolean;
}

const okey0 = ['k2okey1', 'k2okey2', 'k2okey3', 'k2okey4'];
const okey1 = [1, 2, 3, 4, 5, 6].map((i) => `k2s2okey${i}`);
const tavla = Array.from({ length: 12 }, (_, i) => `k2tavla${i + 1}`);
const HEPSI = [...okey0, ...okey1, ...tavla];

const taban: Sen = { mutfak: 'sol', mutfakBuyuk: false, ocak2: 'yok', acik: [0], masalar: ['k2okey1'], kapali: 'kaba', perde: 'duz', kadraj: 'genis' };
const adim1: Sen = { ...taban, mutfakBuyuk: true, masalar: okey0 };
const akis: Sen = { ...taban, mutfakBuyuk: true, duvar: 'siva', perde: 'levha', duzen: 'ayna' };
const son: Sen = { ...taban, mutfakBuyuk: true, ocak2: 'solBuyur', acik: [0, 1, 2], masalar: HEPSI, duvar: 'siva', perde: 'levha', lavabo: true };

const S: Record<string, Sen> = {
  // ① BAŞLANGIÇ — kata ilk çıkış (hazır masa + en kötü mutfak)
  b0: { ...taban, mutfak: 'yok', masalar: [], perde: 'bugun' }, // bugünkü varış (referans)
  b1: { ...taban, yeni: ['mutfak', 'k2okey1'] },
  b2: { ...taban, mutfak: 'sag', masalar: ['k2okey3'], yeni: ['mutfak', 'k2okey3'] },
  b3: { ...taban, mutfak: 'yan', yeni: ['mutfak', 'k2okey1'] },
  // ② 2. OCAK — bitmiş kat, bütün masalar açık
  m1: { ...taban, mutfakBuyuk: true, ocak2: 'solBuyur', acik: [0, 1, 2], masalar: HEPSI, yeni: ['ocak2'] },
  m2: { ...taban, mutfakBuyuk: true, ocak2: 'sagBant', acik: [0, 1, 2], masalar: HEPSI, yeni: ['ocak2'] },
  m3: { ...taban, mutfakBuyuk: true, ocak2: 'disDuvar', acik: [0, 1, 2], masalar: HEPSI, yeni: ['ocak2'] },
  m4: { ...taban, mutfakBuyuk: true, ocak2: 'bugun', acik: [0, 1, 2], masalar: HEPSI, yeni: ['ocak2'] },
  // ③ AÇILIŞ SIRASI (b1 + m1 ile)
  s0: { ...taban, yeni: ['mutfak', 'k2okey1'] },
  s1: { ...adim1, yeni: ['mutfak', 'k2okey2', 'k2okey3', 'k2okey4'] },
  s2: { ...adim1, acik: [0, 1], masalar: [...okey0, 'k2s2okey1', 'k2s2okey2'], yeni: [1] },
  s3: { ...adim1, acik: [0, 1], ocak2: 'solBuyur', masalar: [...okey0, ...okey1], yeni: ['ocak2', ...okey1.slice(2)] },
  s4: { ...adim1, acik: [0, 1, 2], ocak2: 'solBuyur', masalar: [...okey0, ...okey1, ...tavla.slice(0, 4)], yeni: [2] },
  s5: { ...adim1, acik: [0, 1, 2], ocak2: 'solBuyur', masalar: HEPSI, yeni: tavla.slice(4) },
  s2b: { ...adim1, acik: [0, 2], masalar: [...okey0, ...tavla.slice(0, 4)], yeni: [2] }, // tavla köşesi önce
  // ④ KAPALI ALAN DİLİ — merdiven salonu dolu, iki ön salon kapalı
  k1: { ...adim1, kapali: 'kaba' },
  k2: { ...adim1, kapali: 'ortulu' },
  k3: { ...adim1, kapali: 'tamDuvar' },
  k4: { ...adim1, kapali: 'karanlik' },
  k5: { ...adim1, kapali: 'bos' },
  // ⑤ PERDE (sarı-siyah bantsız) — oyun kadrajı, geçit + bandın kapalı köşesi
  p1: { ...adim1, perde: 'bugun', kadraj: 'perde' },
  p2: { ...adim1, perde: 'duz', kadraj: 'perde' },
  p3: { ...adim1, perde: 'levha', kadraj: 'perde' },
  p4: { ...adim1, perde: 'branda', kadraj: 'perde' },
  p5: { ...adim1, perde: 'capraz', kadraj: 'perde' },
  p6: { ...adim1, perde: 'kontrplak', kadraj: 'perde' },
  // ⑥ TUR 2 — NİHAİ DÜZEN: tek mutfak (2 ocak) sol · lavabo sağ · ara bölme yok
  n1: { ...son, duzen: 'bugun' },
  n2: { ...son, duzen: 'kilim' },
  n3: { ...son, duzen: 'kolon' },
  n4: { ...son, duzen: 'yeni' },
  // tur 3: "bugünkü yerler gibi ama düzenli" — ortak sütun/satır ızgarası, merdiven önü yol
  n5: { ...son, duzen: 'izgara' },
  n6: { ...son, duzen: 'izgaraSik' },
  n7: { ...son, duzen: 'ayna' },
  // tur 3: N7 + W1 sıva + kaba inşaat + P3 — açılış sırası (okey salonu önce)
  t0: { ...akis, mutfakBuyuk: false, masalar: ['k2okey2'], yeni: ['mutfak', 'k2okey2'] },
  t1: { ...akis, masalar: okey0, yeni: ['mutfak', 'k2okey1', 'k2okey3', 'k2okey4'] },
  t2: { ...akis, acik: [0, 1], masalar: [...okey0, ...okey1.slice(0, 2)], yeni: [1] },
  t3: { ...akis, acik: [0, 1], ocak2: 'solBuyur', masalar: [...okey0, ...okey1], yeni: ['ocak2', ...okey1.slice(2)] },
  t4: { ...akis, acik: [0, 1], ocak2: 'solBuyur', masalar: [...okey0, ...okey1], lavabo: true, yeni: ['lavabo'] },
  t5: { ...akis, acik: [0, 1, 2], ocak2: 'solBuyur', masalar: [...okey0, ...okey1, ...tavla.slice(0, 2)], lavabo: true, yeni: [2] },
  t6: { ...son, duzen: 'ayna', yeni: tavla.slice(2) },
  // ⑦ TUR 2 — KAPALI ALANIN DUVARI (kaba inşaat arkada, P3 perde): merdiven salonu dolu → okey salonu açık
  w1: { ...adim1, duvar: 'siva', perde: 'levha' },
  w2: { ...adim1, duvar: 'tahta', perde: 'levha' },
  w1b: { ...adim1, duvar: 'siva', perde: 'levha', acik: [0, 1], masalar: [...okey0, ...okey1.slice(0, 2)], yeni: [1] },
  w2b: { ...adim1, duvar: 'tahta', perde: 'levha', acik: [0, 1], masalar: [...okey0, ...okey1.slice(0, 2)], yeni: [1] },
};

const q = new URLSearchParams(location.search);
const sen = S[q.get('s') ?? 'b1'] ?? S.b1;
const acikMi = (a: number) => sen.acik.includes(a);
// Lavabo bloğu seviyesini oyunun durumundan okur: aracın kendi deposuna "lavabo açık" yazılır.
if (sen.lavabo) useGame.setState({ padsDone: ['lavabo'], lavaboLevel: 2 });
const yeniMi = (k: number | string) => !!sen.yeni?.includes(k);

// ============================== OCAKLAR ==============================
const GOVDE: readonly [number, number] = [1.8, 1.03];
const bantOcak = (x: number, buyuk: boolean): OcakYeri => ({ x, z: ON - 0.55, al: [x, ON + 0.6], govde: buyuk ? undefined : GOVDE });
const duvarOcak = (z: number): OcakYeri => ({ x: -H + GOVDE[1], z, al: [-H + 3, z], govde: GOVDE });

function mutfakOcagi(): OcakYeri | null {
  if (sen.mutfak === 'sol') return bantOcak(-7.4, sen.mutfakBuyuk);
  if (sen.mutfak === 'sag') return bantOcak(7.4, sen.mutfakBuyuk);
  if (sen.mutfak === 'yan') return duvarOcak(-5);
  return null;
}
function ikinciOcak(): OcakYeri | null {
  if (sen.ocak2 === 'solBuyur') return bantOcak(-13.2, true);
  if (sen.ocak2 === 'sagBant') return bantOcak(7.4, true);
  if (sen.ocak2 === 'disDuvar') return duvarOcak(9.5);
  if (sen.ocak2 === 'bugun') return { x: -4.5, z: 0.09 + GOVDE[1], al: [-4.5, 3.1], govde: GOVDE };
  return null;
}
const solBantAcik = sen.mutfak === 'sol' || sen.ocak2 === 'solBuyur';
const sagBantAcik = sen.mutfak === 'sag' || sen.ocak2 === 'sagBant';

// ============================== DUVARLAR ==============================
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
      const dis = Math.abs(k.c) === H || k.c === ARKA;
      for (const [a, b] of sp) out.push({ yon: k.yon, c: k.c, a, b, dis, yan: k.yon === 'z' && dis && b > ON });
    }
  });
  return out;
}
function pencereler(k: Kenar): { a: number; b: number }[] {
  if (!k.yan) return [];
  const r: { a: number; b: number }[] = [];
  for (let m = -H + 4.25 / 2; m < H; m += 4.25) {
    if (m - 0.9 < Math.max(k.a, ON + 0.5) || m + 0.9 > k.b) continue;
    r.push({ a: m - 0.9, b: m + 0.9 });
  }
  return r;
}
function hat(k: Kenar): WallSlab[] {
  const c = k.dis ? k.c + Math.sign(k.c) * M : k.c;
  const sl = (a: number, b: number, y0 = 0, h = WALL_H): WallSlab =>
    k.yon === 'x' ? { x: (a + b) / 2, z: c, w: b - a, d: 0.18, theme: TEMA, y0, h } : { x: c, z: (a + b) / 2, w: 0.18, d: b - a, theme: TEMA, y0, h };
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

function Kabuk() {
  const bant: Dik = { x0: -H, x1: H, z0: ARKA, z1: ON };
  // Kameraya bakan ön cephe (z = +H) çizilmez — oyunda da kamera yakın duvarı kapatır; kat okunsun.
  const kenarlar = cevre([bant, ...KAT2_ALANLAR]).filter((k) => k.dis && !(k.yon === 'x' && k.c === H));
  return (
    <group>
      <WallPanels slabs={kenarlar.flatMap(hat)} />
      <MaketWall x1={KOVA.x0} z1={ARKA} x2={KOVA.x0} z2={ON} h={2.2} />
      <MaketWall x1={KOVA.x1} z1={ARKA} x2={KOVA.x1} z2={ON} h={2.2} />
    </group>
  );
}

// ============================== PERDE ADAYLARI ==============================
/** Perde: yerel x boyunca [x1, x2], z = 0 hattında (çağıran döndürür). */
function PerdeCiz({ x1, x2, h, tip }: { x1: number; x2: number; h: number; tip: Perde }) {
  const len = x2 - x1;
  const cx = (x1 + x2) / 2;
  const n = Math.max(1, Math.round(len / 0.62));
  const st = len / n;
  const k = h / 2.4;
  if (tip === 'bugun') return <MaketTadilatPerde x1={x1} x2={x2} z={0} h={h} />;
  const tahta = (renkler: string[]) =>
    Array.from({ length: n }, (_, i) => (
      <mesh key={i} position={[x1 + st / 2 + i * st, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[st - 0.05, h, 0.1]} />
        <meshStandardMaterial color={renkler[i % renkler.length]} flatShading />
      </mesh>
    ));
  const kusak = (ys: number[], renk = PALETTE.doorWood) =>
    ys.map((y) => (
      <mesh key={y} position={[cx, y * k, 0.03]}>
        <boxGeometry args={[len, 0.13, 0.16]} />
        <meshStandardMaterial color={renk} />
      </mesh>
    ));
  if (tip === 'duz')
    return (
      <group>
        {tahta(['#8a6242', '#9c6f4a', '#7d5b40'])}
        {kusak([0.55, 2.05])}
      </group>
    );
  if (tip === 'levha') {
    const r = Math.min(0.42, h * 0.22);
    return (
      <group>
        {tahta(['#8a6242', '#9c6f4a', '#7d5b40'])}
        {kusak([0.4 * (2.4 / Math.max(h, 1)), 2.05])}
        {/* ortada yuvarlak levha: arkadaki salonun işareti (okey taşı) */}
        <group position={[cx, h * 0.6, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[r, r, 0.05, 20]} />
            <meshStandardMaterial color="#f1e6cc" />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[r + 0.05, r + 0.05, 0.03, 20]} />
            <meshStandardMaterial color={PALETTE.doorWood} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[r * 0.75, 0.02, r * 1.05]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
          <mesh position={[0, 0.06, -r * 0.1]}>
            <cylinderGeometry args={[r * 0.17, r * 0.17, 0.02, 12]} />
            <meshStandardMaterial color="#b3322b" />
          </mesh>
        </group>
      </group>
    );
  }
  if (tip === 'branda')
    return (
      <group>
        {[x1 + 0.06, x2 - 0.06].map((x) => (
          <mesh key={x} position={[x, h / 2, 0]} castShadow>
            <boxGeometry args={[0.12, h, 0.12]} />
            <meshStandardMaterial color={PALETTE.doorWood} />
          </mesh>
        ))}
        <mesh position={[cx, h * 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[len - 0.14, h * 0.9, 0.05]} />
          <meshStandardMaterial color="#9b3b33" flatShading />
        </mesh>
        <mesh position={[cx, h * 0.97, 0.01]}>
          <boxGeometry args={[len, 0.1, 0.1]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
        {/* krem kenar dikişi (bant değil, ince çerçeve) */}
        {[h * 0.1, h * 0.94].map((y) => (
          <mesh key={y} position={[cx, y, 0.03]}>
            <boxGeometry args={[len - 0.16, 0.04, 0.01]} />
            <meshStandardMaterial color="#e8d9b8" />
          </mesh>
        ))}
      </group>
    );
  if (tip === 'capraz') {
    const w = Math.min(len, 2.2);
    const parca = Math.max(1, Math.round(len / w));
    const pw = len / parca;
    return (
      <group>
        {tahta(['#c9a477', '#bf9a6c', '#cfab80'])}
        {kusak([0.2, h / k - 0.2])}
        {Array.from({ length: parca }, (_, i) => {
          const px = x1 + pw / 2 + i * pw;
          const aci = Math.atan2(h - 0.4, pw);
          const L = Math.hypot(pw, h - 0.4);
          return [1, -1].map((s) => (
            <mesh key={`${i}${s}`} position={[px, h / 2, 0.08]} rotation={[0, 0, s * aci]} castShadow>
              <boxGeometry args={[L, 0.14, 0.06]} />
              <meshStandardMaterial color={PALETTE.doorWood} />
            </mesh>
          ));
        })}
      </group>
    );
  }
  // kontrplak: açık renk levhalar, koyu çerçeve, vida noktaları
  const lv = Math.max(1, Math.round(len / 1.2));
  const lw = len / lv;
  return (
    <group>
      {Array.from({ length: lv }, (_, i) => (
        <mesh key={i} position={[x1 + lw / 2 + i * lw, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[lw - 0.04, h, 0.06]} />
          <meshStandardMaterial color={i % 2 ? '#dcc095' : '#d4b789'} flatShading />
        </mesh>
      ))}
      {Array.from({ length: lv + 1 }, (_, i) => (
        <mesh key={`c${i}`} position={[x1 + i * lw, h / 2, 0.04]}>
          <boxGeometry args={[0.08, h, 0.04]} />
          <meshStandardMaterial color="#8a6242" />
        </mesh>
      ))}
      {[0.06, h - 0.06].map((y) => (
        <mesh key={y} position={[cx, y, 0.04]}>
          <boxGeometry args={[len, 0.1, 0.04]} />
          <meshStandardMaterial color="#8a6242" />
        </mesh>
      ))}
    </group>
  );
}

// ============================== BÖLMELER ==============================
const BOY = 1.2;
const DIKME_H = 1.35;
/** Tur 2: bölme yok — iki yanı açıksa hat boş (ya da kolon), biri kapalıysa hat boyunca TAM duvar. */
function TamBolme({ b }: { b: (typeof KAT2_BOLMELER)[number] }) {
  const [a1, a2] = b.alanlar;
  const yatay = b.z1 === b.z2;
  const L = yatay ? Math.abs(b.x2 - b.x1) : Math.abs(b.z2 - b.z1);
  const cx = (b.x1 + b.x2) / 2;
  const cz = (b.z1 + b.z2) / 2;
  const rot = yatay ? 0 : Math.PI / 2;
  if (acikMi(a1) && acikMi(a2)) {
    if (sen.duzen !== 'kolon') return null;
    const n = Math.round(L / 4.25);
    return (
      <group position={[cx, 0, cz]} rotation={[0, rot, 0]}>
        {Array.from({ length: n - 1 }, (_, i) => (
          <group key={i} position={[-L / 2 + ((i + 1) * L) / n, 0, 0]}>
            <mesh position={[0, WALL_H / 2, 0]} castShadow>
              <boxGeometry args={[0.34, WALL_H, 0.34]} />
              <meshStandardMaterial color={PALETTE.doorWood} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[0.5, 0.24, 0.5]} />
              <meshStandardMaterial color="#5a3f30" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (!acikMi(a1) && !acikMi(a2)) return null;
  if (sen.duvar === 'siva') return <MaketWall x1={b.x1} z1={b.z1} x2={b.x2} z2={b.z2} h={WALL_H} />;
  return (
    <group position={[cx, 0, cz]} rotation={[0, rot, 0]}>
      <PerdeCiz x1={-L / 2} x2={L / 2} h={WALL_H} tip={sen.perde} />
    </group>
  );
}

function Bolme({ b }: { b: (typeof KAT2_BOLMELER)[number] }) {
  if (sen.duvar && sen.duvar !== 'alcak') return <TamBolme b={b} />;
  const [a1, a2] = b.alanlar;
  const iki = acikMi(a1) && acikMi(a2);
  const hicbiri = !acikMi(a1) && !acikMi(a2);
  const tam = sen.kapali === 'tamDuvar' && !iki;
  if (hicbiri && !tam) return null;
  const yatay = b.z1 === b.z2;
  const a0 = yatay ? Math.min(b.x1, b.x2) : Math.min(b.z1, b.z2);
  const aSon = yatay ? Math.max(b.x1, b.x2) : Math.max(b.z1, b.z2);
  const kapilar = [...b.kapilar].sort((p, r) => p[0] - r[0]);
  const parca: [number, number][] = [];
  let u = a0;
  for (const [ka, kb] of kapilar) {
    parca.push([u, ka]);
    u = kb;
  }
  parca.push([u, aSon]);
  const P = (v: number) => (yatay ? ([v, b.z1] as const) : ([b.x1, v] as const));
  if (tam) {
    // tam duvar: geçit de dahil kesintisiz, oda üstten kapalı (tavan levhası `Tavan`)
    const [x1, z1] = P(a0);
    const [x2, z2] = P(aSon);
    return <MaketWall x1={x1} z1={z1} x2={x2} z2={z2} h={WALL_H} />;
  }
  return (
    <group>
      {parca
        .filter(([p, r]) => r - p > 0.05)
        .map(([p, r], i) => {
          const [x1, z1] = P(p);
          const [x2, z2] = P(r);
          return <MaketWall key={i} x1={x1} z1={z1} x2={x2} z2={z2} h={BOY} />;
        })}
      {kapilar.map(([ka, kb], i) => {
        const [x, z] = P((ka + kb) / 2);
        const w = kb - ka;
        return (
          <group key={`k${i}`} position={[x, 0, z]} rotation={[0, yatay ? 0 : Math.PI / 2, 0]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[(s * w) / 2, DIKME_H / 2, 0]} castShadow>
                <boxGeometry args={[0.22, DIKME_H, 0.3]} />
                <meshStandardMaterial color={PALETTE.doorWood} />
              </mesh>
            ))}
            {!iki && <PerdeCiz x1={-w / 2 + 0.11} x2={w / 2 - 0.11} h={DIKME_H - 0.05} tip={sen.perde} />}
          </group>
        );
      })}
    </group>
  );
}

// ============================== ZEMİN + KAPALI ALAN ==============================
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
function Duz({ r, renk, y = 0.003 }: { r: Dik; renk: string; y?: number }) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]}>
      <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
      <meshStandardMaterial color={renk} />
    </mesh>
  );
}

function KapaliAlan({ a }: { a: number }) {
  const r = KAT2_ALANLAR[a];
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  if (sen.kapali === 'kaba')
    return (
      <group>
        <Duz r={r} renk={SAP} />
        <MaketIskele len={Math.min(4, (r.x1 - r.x0) * 0.4)} pos={[cx - 2, 0, cz - 1]} />
        <MaketMoloz pos={[cx + 2.5, 0, cz + 2]} />
        <MaketMoloz pos={[cx - 3, 0, cz + 3.5]} rot={1.2} />
      </group>
    );
  if (sen.kapali === 'ortulu')
    return (
      <group>
        <ZeminParca r={r} tema={ZEMIN} />
        {KAT2_MASALAR.filter((m) => m.alan === a).map((m) => (
          <Ortu key={m.id} x={m.x} z={m.z} tavla={m.tur === 'tavla'} />
        ))}
      </group>
    );
  if (sen.kapali === 'tamDuvar')
    return (
      <group>
        <Duz r={r} renk={SAP} />
        <mesh position={[cx, WALL_H + 0.06, cz]} castShadow receiveShadow>
          <boxGeometry args={[r.x1 - r.x0 + 0.2, 0.12, r.z1 - r.z0 + 0.2]} />
          <meshStandardMaterial color="#8a7466" flatShading />
        </mesh>
      </group>
    );
  if (sen.kapali === 'karanlik') return <Duz r={r} renk="#3b322d" />;
  return <ZeminParca r={r} tema={ZEMIN} />;
}

/** Toz örtüsü: masa + oturakları örten krem çarşaf yumrusu. */
function Ortu({ x, z, tavla }: { x: number; z: number; tavla: boolean }) {
  const [w, d] = tavla ? [0.9, 2.1] : [2.3, 2.3];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.84, d]} />
        <meshStandardMaterial color="#e9e3d6" flatShading />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[w * 0.55, 0.14, d * 0.55]} />
        <meshStandardMaterial color="#f2ede2" flatShading />
      </mesh>
    </group>
  );
}

function Zemin() {
  const x = AGIZ.x;
  return (
    <group>
      {[
        { x0: -H - M - 0.2, x1: H + M + 0.2, z0: ARKA - M - 0.2, z1: ARKA },
        { x0: -H - M - 0.2, x1: H + M + 0.2, z0: H, z1: H + M + 0.2 },
        { x0: -H - M - 0.2, x1: -H, z0: ARKA, z1: H },
        { x0: H, x1: H + M + 0.2, z0: ARKA, z1: H },
      ].map((r, i) => (
        <Duz key={i} r={r} renk={SAP} y={0.002} />
      ))}
      {KAT2_ALANLAR.map((r, i) => (acikMi(i) ? <ZeminParca key={i} r={r} tema={ZEMIN} /> : <KapaliAlan key={i} a={i} />))}
      <ZeminParca r={{ x0: -H, x1: KOVA.x0, z0: ARKA, z1: ON }} tema={solBantAcik ? FLOOR_THEMES.fayans : ZEMIN} />
      <ZeminParca r={{ x0: KOVA.x0, x1: -x, z0: ARKA, z1: ON }} tema={ZEMIN} />
      <ZeminParca r={{ x0: x, x1: KOVA.x1, z0: ARKA, z1: ON }} tema={ZEMIN} />
      <ZeminParca r={{ x0: -x, x1: x, z0: ARKA, z1: AGIZ.arka }} tema={ZEMIN} />
      <ZeminParca r={{ x0: -x, x1: x, z0: AGIZ.on, z1: ON }} tema={ZEMIN} />
      <ZeminParca r={{ x0: KOVA.x1, x1: H, z0: ARKA, z1: ON }} tema={sagBantAcik ? FLOOR_THEMES.fayans : ZEMIN} />
    </group>
  );
}

// ============================== MERDİVEN AĞZI ==============================
function MerdivenAgzi() {
  const N = 14;
  const D = (AGIZ.on - AGIZ.arka) / N;
  const h = 3.2 / N;
  const x = AGIZ.x;
  const kup = (x1: number, z1: number, x2: number, z2: number, i: number) => {
    const L = Math.hypot(x2 - x1, z2 - z1);
    const yatay = z1 === z2;
    const n = Math.round(L / 0.45);
    return (
      <group key={i}>
        <mesh position={[(x1 + x2) / 2, 1.0, (z1 + z2) / 2]} castShadow>
          <boxGeometry args={yatay ? [L + 0.1, 0.1, 0.16] : [0.16, 0.1, L]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
        {Array.from({ length: n + 1 }, (_, k) => (
          <mesh key={k} position={[x1 + ((x2 - x1) * k) / n, 0.5, z1 + ((z2 - z1) * k) / n]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
            <meshStandardMaterial color="#7a5236" />
          </mesh>
        ))}
      </group>
    );
  };
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[0, -(i + 0.5) * h - 0.02, AGIZ.arka + (i + 0.5) * D]} receiveShadow>
          <boxGeometry args={[x * 2 - 0.1, h, D]} />
          <meshStandardMaterial color={i % 2 ? '#8a6a4f' : '#94735a'} />
        </mesh>
      ))}
      {kup(-x, AGIZ.on, x, AGIZ.on, 0)}
      {kup(-x, AGIZ.sahanlik, -x, AGIZ.on, 1)}
      {kup(x, AGIZ.sahanlik, x, AGIZ.on, 2)}
    </group>
  );
}

// ============================== EŞYA ==============================
function Halka({ x, z, r = 1.7 }: { x: number; z: number; r?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
      <ringGeometry args={[r - 0.18, r, 40]} />
      <meshBasicMaterial color={VURGU} />
    </mesh>
  );
}
function AlanCercevesi({ r }: { r: Dik }) {
  const t = 0.22;
  const p = 0.35;
  const s = [
    { x: (r.x0 + r.x1) / 2, z: r.z0 + p, w: r.x1 - r.x0 - 2 * p, d: t },
    { x: (r.x0 + r.x1) / 2, z: r.z1 - p, w: r.x1 - r.x0 - 2 * p, d: t },
    { x: r.x0 + p, z: (r.z0 + r.z1) / 2, w: t, d: r.z1 - r.z0 - 2 * p },
    { x: r.x1 - p, z: (r.z0 + r.z1) / 2, w: t, d: r.z1 - r.z0 - 2 * p },
  ];
  return (
    <group>
      {s.map((k, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[k.x, 0.03, k.z]}>
          <planeGeometry args={[k.w, k.d]} />
          <meshBasicMaterial color={VURGU} />
        </mesh>
      ))}
    </group>
  );
}

/** N4 yeni dizilim: okey ortada (merdiven önü boş), tavla iki yan pencere dibinde. */
const YENI_OKEY: [number, number][] = [[-8.5, -4], [8.5, -4], [-8.5, 3], [-3, 3], [3, 3], [8.5, 3], [-8.5, 9.8], [-3, 9.8], [3, 9.8], [8.5, 9.8]];
const YENI_TAVLA: [number, number][] = [-14.6, 14.6].flatMap((x) => [-5.5, -1.5, 2.5, 6.5, 10.5, 14.5].map((z) => [x, z] as [number, number]));
/** Hizalı ızgara: sütunlar ortaya göre ayna (okey ±iç, ±dış), tavla sağda aynı iki sütun + arası. */
function izgara(ic: number, dis: number, ayna = false) {
  const okey: [number, number][] = [
    ...[-dis, -ic, ic, dis].map((x) => [x, -3.5] as [number, number]),
    ...[-dis, -ic].flatMap((x) => [2.5, 8.5, 14.5].map((z) => [x, z] as [number, number])),
  ];
  const tavla: [number, number][] = ayna
    ? [ic, dis].flatMap((x) => [2.5, 4.9, 7.3, 9.7, 12.1, 14.5].map((z) => [x, z] as [number, number]))
    : [ic, (ic + dis) / 2, dis].flatMap((x) => [2.5, 6.5, 10.5, 14.5].map((z) => [x, z] as [number, number]));
  return { okey, tavla };
}
function masaYerleri() {
  if (sen.duzen === 'izgara' || sen.duzen === 'izgaraSik' || sen.duzen === 'ayna') {
    const g = sen.duzen === 'izgaraSik' ? izgara(5, 11.2) : izgara(6.5, 13, sen.duzen === 'ayna');
    let o = 0;
    let t = 0;
    return KAT2_MASALAR.map((m) => {
      const [x, z] = m.tur === 'okey' ? g.okey[o++] : g.tavla[t++];
      return { ...m, x, z };
    });
  }
  if (sen.duzen !== 'yeni') return KAT2_MASALAR;
  let o = 0;
  let t = 0;
  return KAT2_MASALAR.map((m) => {
    const [x, z] = m.tur === 'okey' ? YENI_OKEY[o++] : YENI_TAVLA[t++];
    return { ...m, x, z };
  });
}

function Kilimler() {
  if (sen.duzen !== 'kilim') return null;
  return (
    <group>
      <HaliCiz r={{ x0: -16.2, x1: -1.2, z0: 1.4, z1: 16.4 }} renk="#8e2f2a" kenar="#d9b56a" desen="#3b2a4a" />
      <HaliCiz r={{ x0: 1.2, x1: 16.2, z0: 1.4, z1: 16.4 }} renk="#2f4a6e" kenar="#d9b56a" desen="#8e2f2a" />
      <HaliCiz r={{ x0: -16.2, x1: 16.2, z0: -8, z1: -1.6 }} renk="#6b4a2f" kenar="#d9b56a" desen="#8e2f2a" />
    </group>
  );
}
function HaliCiz({ r, renk, kenar, desen }: { r: Dik; renk: string; kenar: string; desen: string }) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const kat = (y: number, ww: number, dd: number, c: string) => (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, y, cz]}>
      <planeGeometry args={[ww, dd]} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
  return (
    <group>
      {kat(0.01, w, d, kenar)}
      {kat(0.012, w - 0.5, d - 0.5, desen)}
      {kat(0.014, w - 0.9, d - 0.9, renk)}
    </group>
  );
}

function Masalar() {
  return (
    <group>
      <Kilimler />
      {masaYerleri().map((m, i) => {
        if (!sen.masalar.includes(m.id)) return null;
        const dolu = i % 3 !== 2;
        return (
          <group key={m.id}>
            {m.tur === 'okey' ? <OkeyMasa x={m.x} z={m.z} oyunda={dolu} faz={i} /> : <TavlaMasa x={m.x} z={m.z} oyunda={dolu} faz={i} />}
            {dolu &&
              oturakYerleri(m.tur).map(([dx, dz], k) => <Oturan key={k} x={m.x + dx} z={m.z + dz} aci={Math.atan2(-dx, -dz)} i={i * 4 + k} />)}
            {yeniMi(m.id) && <Halka x={m.x} z={m.z} r={m.tur === 'okey' ? 1.8 : 1.3} />}
          </group>
        );
      })}
    </group>
  );
}

function Ocaklar() {
  const o1 = mutfakOcagi();
  const o2 = ikinciOcak();
  return (
    <group>
      {o1 && <CezveOcagi ocak={o1} hazir={sen.mutfakBuyuk ? 3 : 1} pisiyor />}
      {o1 && yeniMi('mutfak') && <Halka x={o1.x} z={o1.z} r={2.4} />}
      {o2 && <CezveOcagi ocak={o2} hazir={2} pisiyor />}
      {o2 && yeniMi('ocak2') && <Halka x={o2.x} z={o2.z} r={2.4} />}
      {solBantAcik && <OcakKosesi />}
      {sagBantAcik && (
        <group scale={[-1, 1, 1]}>
          <OcakKosesi />
        </group>
      )}
      {!solBantAcik && (
        <group position={[0, 0, ON]}>
          <PerdeCiz x1={-H} x2={KOVA.x0 - 0.2} h={2.4} tip={sen.perde} />
        </group>
      )}
      {sen.lavabo && <MaketLavaboBlock />}
      {sen.lavabo && yeniMi('lavabo') && <Halka x={13.4} z={ON + 1.2} r={1.8} />}
      {!sagBantAcik && !sen.lavabo && (
        <group position={[0, 0, ON]}>
          <PerdeCiz x1={KOVA.x1 + 0.2} x2={H} h={2.4} tip={sen.perde} />
        </group>
      )}
    </group>
  );
}

function Dekor() {
  const s = KAT2_ALANLAR[0];
  return (
    <group>
      <MaketPlant pos={[s.x0 + 0.8, 0, s.z0 + 0.8]} big />
      <MaketPlant pos={[s.x1 - 0.8, 0, s.z0 + 0.8]} big />
      {sen.acik.map((a) => {
        const r = KAT2_ALANLAR[a];
        return (
          <group key={a}>
            <MaketPlant pos={[r.x0 + 0.8, 0, r.z1 - 0.8]} />
            <MaketPlant pos={[r.x1 - 0.8, 0, r.z1 - 0.8]} />
          </group>
        );
      })}
      {sen.acik.filter((a) => yeniMi(a)).map((a) => (
        <AlanCercevesi key={`c${a}`} r={KAT2_ALANLAR[a]} />
      ))}
    </group>
  );
}

// ============================== KAMERA ==============================
const OYUNCU: [number, number] = sen.kadraj === 'perde' ? [5.6, -3.2] : [0, -8.6];
function Kamera() {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as import('three').PerspectiveCamera;
    if (sen.kadraj === 'perde') {
      // orta mesafe: salon pad'inin geniş geçidi (x 7,2-10,5) + bandın kapalı sağ köşesi aynı karede
      cam.fov = 42;
      cam.position.set(6, 15, 9);
      cam.lookAt(7, 0.6, -4.2);
    } else {
      cam.fov = 30;
      cam.position.set(0, 58, 40);
      cam.lookAt(0, 0, 0.2);
    }
    cam.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Hazir({ children }: { children: ReactNode }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 40) (window as unknown as { MAKET_HAZIR?: boolean }).MAKET_HAZIR = true;
  });
  return <>{children}</>;
}

function Sahne() {
  return (
    <>
      <color attach="background" args={[LIGHTING.background]} />
      <SceneLights shadows />
      <Kamera />
      <Suspense fallback={null}>
        <Hazir>
          <Zemin />
          <Kabuk />
          {KAT2_BOLMELER.map((b, i) => (
            <Bolme key={i} b={b} />
          ))}
          <MerdivenAgzi />
          <Ocaklar />
          <Masalar />
          <Dekor />
          <group position={[OYUNCU[0], 0, OYUNCU[1]]}>
            <KayActor kind="owner" />
          </group>
        </Hazir>
      </Suspense>
    </>
  );
}

createRoot(document.getElementById('kok')!).render(
  <Canvas shadows="percentage" camera={{ position: [0, 50, 40], fov: 30 }} gl={{ antialias: true, toneMappingExposure: LIGHTING.exposure, preserveDrawingBuffer: true }} dpr={[1, 2]}>
    <Sahne />
  </Canvas>,
);
