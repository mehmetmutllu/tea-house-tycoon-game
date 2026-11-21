/* eslint-disable react-refresh/only-export-components -- tek seferlik çekim sayfası, hızlı yenileme gerekmez */
/**
 * kucuk-resim.tsx — mağaza kozmetiğinin GERÇEK küçük resmi (dev aracı, oyuna girmez; Sprint B · Faz 4).
 * Eşya oyunun KENDİ bileşeniyle çizilir (`DekorGovde`, `KayActor`, `CupTray`, `FloorPattern`,
 * `WallPanels`, `Model`), ışık sahnenin ışığı (`SceneLights`). Zemin saydam; kadraj eşyanın çizilen
 * kutusundan kurulur, her türün sabit bakış açısı var.
 * Adres: /tools/kucuk-resim.html?tur=dekor&id=koltuk — çekimi `tools/kucuk-resim.mjs` yapar.
 *
 * KIRMIZI KUTU TUZAĞI: `Model` yüklenirken Suspense yedeğini (dekorda kırmızı kutu) çizer. Çekim,
 * yükleyici boşalıp sessiz kalmadan ve renk atlası hazır olmadan YAPILMAZ; ayrıca sahnede yedek
 * kutunun izi (yedek rengi + büyük geometri) aranır, bulunursa sonuç HATA döner.
 */
import { yukleme } from './kucuk-resim-yukleme';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useRef, type ReactNode } from 'react';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Group, type PerspectiveCamera } from 'three';
import { economyConfig } from '../src/config/economy.config';
import { FLOOR_THEMES, PREVIEW_GL, WALL_THEMES } from '../src/config/palette';
import { DekorGovde } from '../src/components/three/VitrinDekor';
import { KayActor } from '../src/components/three/KayActor';
import { CupTray } from '../src/components/three/Player';
import { Model } from '../src/components/three/Model';
import { FloorPattern } from '../src/components/three/floorPattern';
import { WallPanels } from '../src/components/three/wallPanel';
import { SceneLights } from '../src/components/three/lights';
import { atlasReady } from '../src/components/three/recolor';
import { FLOOR_S, floorKaroModel, floorKaroW, temaNative, zeminEsleme } from '../src/components/three/kitchenLook';
import { DOLAP_UST, KANARYA, MASA_UST } from '../src/components/three/vitrinDekorLook';
import { KUCUK_PX, type KucukTur } from './kucuk-resim-liste';

const q = new URLSearchParams(location.search);
const tur = (q.get('tur') ?? 'dekor') as KucukTur;
const id = q.get('id') ?? 'koltuk';
const CIZIM_PX = KUCUK_PX * 2; // 2× çizilip küçültülür (kenar yumuşatma)

type Sonuc = { hazir: boolean; hata?: string; webp?: string; olcu?: Record<string, number> };
const sonuc: Sonuc = { hazir: false };
(window as unknown as { KUCUK: Sonuc }).KUCUK = sonuc;
const bitir = (s: Partial<Sonuc>) => Object.assign(sonuc, s, { hazir: true });
addEventListener('error', (e) => bitir({ hata: `sayfa: ${e.message}` }));

/** Bakış: yatay dönüş (eşya döndürülür) + kamera yükseliş açısı (derece). */
const BAKIS: Record<KucukTur, { yaw: number; elev: number; doluluk: number }> = {
  kiyafet: { yaw: -0.45, elev: 8, doluluk: 0.9 },
  tepsi: { yaw: -0.35, elev: 38, doluluk: 0.86 },
  dekor: { yaw: -0.4, elev: 18, doluluk: 0.88 },
  masa: { yaw: -0.5, elev: 30, doluluk: 0.9 },
  zemin: { yaw: Math.PI / 4, elev: 50, doluluk: 0.94 },
  mutfak: { yaw: Math.PI / 4, elev: 50, doluluk: 0.94 },
  duvar: { yaw: -0.5, elev: 12, doluluk: 0.9 },
};

/**
 * Kadrajın ALT sınırı (m). Masa/dolap üstündeki eşyada mobilya karenin çoğunu yiyor, eşya pulda
 * seçilmiyordu (kontakt sayfası 1. tur: semaver masanın üstünde bir leke). Bu eşyalarda kadraj
 * mobilyanın tablasından başlar; mobilya karenin altından taşar.
 */
const ALT_KES: Record<string, number> = {
  semaver: MASA_UST - 0.12,
  gramofon: MASA_UST - 0.12,
  radyo: DOLAP_UST - 0.3,
  kanarya: KANARYA.kafesY - 0.55,
  lamba: 0.55,
};
const altKes = tur === 'dekor' ? (ALT_KES[id] ?? -Infinity) : -Infinity;

// --- Eşyalar: oyunun bileşenleri -------------------------------------------------------------

const KAY_MOBILYA = '/assets/models/kaykit-furniture-bits/';
const KAY_MUTFAK = '/assets/models/kaykit-restaurant-bits/';

/** Masa teması — `TableThemePreview.ThemedTable` ile aynı dil (dışa açık değil, burada aynısı). */
function TemaliMasa({ color }: { color: string }) {
  const yer: [number, number][] = [[0, 0.78], [0, -0.78], [0.78, 0], [-0.78, 0]];
  return (
    <group>
      <Model src={`${KAY_MOBILYA}table_medium.gltf`} scale={[0.45, 0.55, 0.45]} fallback={null} />
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {yer.map(([x, z], i) => (
        <Model key={i} src={`${KAY_MOBILYA}chair_stool.gltf`} scale={0.6} position={[x, 0, z]} recolor={color} fallback={null} />
      ))}
    </group>
  );
}

/** Salon zemini — `SalonSlice.FloorPatch` ile aynı katmanlar, ama sınırlı bir karo (kenarı görünür). */
function ZeminParcasi({ floorId }: { floorId: string }) {
  const t = FLOOR_THEMES[floorId] ?? FLOOR_THEMES.parke;
  const y = 1.3;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[y * 2, y * 2]} />
        <meshStandardMaterial color={t.grout ?? t.base} />
      </mesh>
      <FloorPattern theme={t} x0={-y} x1={y} z0={-y} z1={y} />
    </group>
  );
}

/** Mutfak fayansı — `Kitchen.Fayans` ile aynı model + göz eşlemesi, 2×2 karo. */
function MutfakParcasi({ temaId }: { temaId: string }) {
  const w = floorKaroW('kucuk');
  const src = `${KAY_MUTFAK}${floorKaroModel('kucuk')}.gltf`;
  const esleme = temaNative(temaId) ? undefined : zeminEsleme(temaId);
  return (
    <group>
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
        <Model key={i} src={src} scale={FLOOR_S} position={[x * w, 0, z * w]} esleme={esleme} fallback={null} />
      ))}
    </group>
  );
}

function Esya() {
  const c = economyConfig.cosmetics;
  switch (tur) {
    case 'kiyafet':
      return <KayActor kind="owner" kiyafet={id} />;
    case 'tepsi':
      return <CupTray tea={6} dirty={0} cap={6} gorunum={id} />;
    case 'dekor': {
      const u = c.decor.find((d) => d.id === id);
      return u ? <DekorGovde yuva={u.yuva} id={id} /> : null;
    }
    case 'masa': {
      const u = c.tableThemes.find((d) => d.id === id);
      return u ? <TemaliMasa color={u.color} /> : null;
    }
    case 'zemin':
      return <ZeminParcasi floorId={id} />;
    case 'duvar':
      return <WallPanels slabs={[{ x: 0, z: 0, w: 2.2, d: 0.2, theme: WALL_THEMES[id] ?? WALL_THEMES.krem }]} />;
    case 'mutfak':
      return <MutfakParcasi temaId={id} />;
  }
}

// --- Çekim -----------------------------------------------------------------------------------

/** Dekordaki Suspense/hata yedeklerinin renkleri (`VitrinDekor.tsx` koltuk · yılbaşı · halı). */
const YEDEK_RENK = new Set(['7c2230', '9b1c22', 'b3262a']);

/**
 * Çizilen her mesh'in kendi kutusunun 8 köşesi (dünya). Tek eksen-hizalı kutu yerine nokta bulutu:
 * döndürülmüş eşyanın kutusu boşluk taşır, köşe bulutu kadrajı sıkı tutar. Örnekli (zemin/duvar) ve
 * iskeletli (karakter) mesh'te kutu mesh'in kendisinden (örnekler · o anki poz) alınır.
 */
function gorunurNoktalar(kok: Group): Vector3[] {
  const noktalar: Vector3[] = [];
  kok.updateWorldMatrix(true, true);
  kok.traverseVisible((o) => {
    const m = o as Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean; boundingBox?: Box3 | null; computeBoundingBox?: () => void };
    if (!m.isMesh || !m.geometry) return;
    let k: Box3 | null | undefined;
    if (m.isInstancedMesh || m.isSkinnedMesh) {
      m.computeBoundingBox?.();
      k = m.boundingBox;
    } else {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      k = m.geometry.boundingBox;
    }
    if (!k || k.isEmpty()) return;
    for (const x of [k.min.x, k.max.x])
      for (const y of [k.min.y, k.max.y])
        for (const z of [k.min.z, k.max.z]) {
          const n = new Vector3(x, y, z).applyMatrix4(m.matrixWorld);
          n.y = Math.max(n.y, altKes);
          noktalar.push(n);
        }
  });
  return noktalar;
}

/** Sahnede kırmızı yedek kutu var mı: yedek renginde ve eşyanın kendi küçük süslerinden büyük mesh. */
function yedekVarMi(kok: Group): boolean {
  let var_ = false;
  kok.traverseVisible((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const mat = m.material as MeshStandardMaterial;
    if (!mat?.color || !YEDEK_RENK.has(mat.color.getHexString())) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if ((m.geometry.boundingSphere?.radius ?? 0) > 0.25) var_ = true;
  });
  return var_;
}

/** Kutunun 8 köşesi verilen bakışla kadraja sığacak şekilde kamerayı yerleştirir. */
function kadrajla(cam: PerspectiveCamera, koseler: Vector3[], elev: number, doluluk: number) {
  const e = (elev * Math.PI) / 180;
  const ileri = new Vector3(0, Math.sin(e), Math.cos(e)); // hedeften kameraya
  const sag = new Vector3(1, 0, 0);
  const ust = new Vector3().crossVectors(ileri, sag).normalize();
  const t = Math.tan(((cam.fov * Math.PI) / 180) / 2) * doluluk;
  const merkez = new Box3().setFromPoints(koseler).getCenter(new Vector3());
  // İki tur: uzaklık bul → izdüşüm kutusunu ortala → yeniden uzaklık.
  for (let tur2 = 0; tur2 < 3; tur2++) {
    let d = 0;
    for (const k of koseler) {
      const r = k.clone().sub(merkez);
      const z = r.dot(ileri);
      d = Math.max(d, z + Math.abs(r.dot(sag)) / t, z + Math.abs(r.dot(ust)) / t);
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const k of koseler) {
      const r = k.clone().sub(merkez);
      const derin = d - r.dot(ileri);
      const px = r.dot(sag) / derin;
      const py = r.dot(ust) / derin;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    merkez.addScaledVector(sag, ((x0 + x1) / 2) * d).addScaledVector(ust, ((y0 + y1) / 2) * d);
    if (tur2 === 2) {
      cam.position.copy(merkez).addScaledVector(ileri, d);
      cam.up.copy(ust);
      cam.lookAt(merkez);
      cam.near = Math.max(0.01, d / 50);
      cam.far = d * 10;
      cam.updateProjectionMatrix();
    }
  }
}

function Cekim({ kok }: { kok: { current: Group | null } }) {
  const gl = useThree((s) => s.gl);
  const cam = useThree((s) => s.camera) as PerspectiveCamera;
  const st = useRef({ kare: 0, kadrajKare: -1, bitti: false });
  useFrame(() => {
    const r = st.current;
    if (r.bitti || !kok.current) return;
    r.kare++;
    if (r.kare > 1800) {
      r.bitti = true;
      bitir({ hata: `zaman aşımı (bekleyen ${yukleme.bekleyen}, atlas ${atlasReady()})` });
      return;
    }
    const sakin = yukleme.bekleyen <= 0 && performance.now() - yukleme.sonDegisim > 600 && atlasReady();
    if (r.kadrajKare < 0) {
      if (r.kare < 30 || !sakin) return;
      if (yukleme.hatalar.length) {
        r.bitti = true;
        bitir({ hata: `yüklenemedi: ${yukleme.hatalar.join(', ')}` });
        return;
      }
      const noktalar = gorunurNoktalar(kok.current);
      if (!noktalar.length) return;
      kadrajla(cam, noktalar, BAKIS[tur].elev, BAKIS[tur].doluluk);
      r.kadrajKare = r.kare;
      return;
    }
    if (r.kare - r.kadrajKare < 4) return;
    r.bitti = true;
    // preserveDrawingBuffer: tuval bir önceki karenin (yeni kadrajlı) çizimini taşıyor.
    const k = document.createElement('canvas');
    k.width = KUCUK_PX;
    k.height = KUCUK_PX;
    const x = k.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(gl.domElement, 0, 0, KUCUK_PX, KUCUK_PX);
    const p = x.getImageData(0, 0, KUCUK_PX, KUCUK_PX).data;
    let dolu = 0, kirmizi = 0, x0 = KUCUK_PX, x1 = 0, y0 = KUCUK_PX, y1 = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 128) continue;
      dolu++;
      const px = (i / 4) % KUCUK_PX, py = Math.floor(i / 4 / KUCUK_PX);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      // Yedek kırmızısı (ışık altında): ton 340-12°, doygun, orta parlaklık.
      const [R, G, B] = [p[i], p[i + 1], p[i + 2]];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx !== R || mx < 50 || mx > 235 || (mx - mn) / mx < 0.55) continue;
      const ton = (((G - B) / (mx - mn)) * 60 + 360) % 360;
      if (ton > 340 || ton < 12) kirmizi++;
    }
    bitir({
      hata: tur === 'dekor' && yedekVarMi(kok.current) ? 'sahnede kırmızı yedek kutu var (model yüklenmedi)' : undefined,
      webp: k.toDataURL('image/webp', 0.86),
      olcu: { dolu: dolu / (KUCUK_PX * KUCUK_PX), kirmizi: dolu ? kirmizi / dolu : 0, en: (x1 - x0 + 1) / KUCUK_PX, boy: (y1 - y0 + 1) / KUCUK_PX },
    });
  });
  return null;
}

class Sinir extends Component<{ children: ReactNode }, { hata: boolean }> {
  state = { hata: false };
  static getDerivedStateFromError(e: Error) {
    bitir({ hata: `çizim: ${e.message}` });
    return { hata: true };
  }
  render() {
    return this.state.hata ? null : this.props.children;
  }
}

function Sahne() {
  const kok = useRef<Group>(null);
  return (
    <Canvas
      style={{ width: CIZIM_PX, height: CIZIM_PX }}
      dpr={1}
      gl={{ ...PREVIEW_GL, alpha: true, preserveDrawingBuffer: true }}
      camera={{ fov: 28, position: [0, 2, 6] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <SceneLights />
      <Sinir>
        <Suspense fallback={null}>
          <group ref={kok} rotation={[0, Number(q.get('yaw') ?? BAKIS[tur].yaw), 0]}>
            <Esya />
          </group>
        </Suspense>
      </Sinir>
      <Cekim kok={kok} />
    </Canvas>
  );
}

createRoot(document.getElementById('kok')!).render(<Sahne />);
