import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace, type Group } from 'three';
import { vitrinYuva, yuvaAnkraj } from '../../config/decor';
import { useGame } from '../../game/store';
import { cizilenDekor } from '../../game/vitrin';
import { onizlemeGrubuKaydet } from './DekorCekimi';
import { Model } from './Model';
import { DECOR_S, DUVAR_GOLGE, LAMBA_YER_S } from './decorLook';
import { golgeVerir, silindirGolgeVerir } from './golgeKurali';
import {
  DOLAP_UST, FURNITURE, GRAMOFON, HALI_S, HOLIDAY, KANARYA, KOLTUK_S, MASA_S, MASA_UST, RADYO, SAAT, SEMAVER,
  TABLO, YERLESIM, YILBASI_MODEL, YILBASI_S,
} from './vitrinDekorLook';

/**
 * VitrinDekor.tsx — 💎 DEKORUN ÇİZİMİ (F4c-2 · D-155). Nereye → `config/decor.ts` `VITRIN_YUVALARI`,
 * ne kadar → `vitrinDekorLook.ts`. Salt görsel: collision/nav'a girmez (`Decor.tsx` ile aynı kural).
 * Görünen ürünler `gorunenDekor`dan: sahip olunan + yuvasına konmuş + yuvanın salonu açık.
 *
 * Modeller adaylardan (`tools/vitrin-adaylari.html`, kullanıcı 2026-09-24 seçti): KayKit parçası
 * olanlar `Model` ile, ilkel çizimi olanlar doğrudan. Yerel çerçeve: sırt z = 0, yüz +z.
 */

const BAKIR = '#d0864a';
const ALTIN = '#d4af37';
const CEVIZ = '#6b4226';
const KOYU = '#2a1c12';
const metal = { metalness: 0.55, roughness: 0.35 } as const;
/** Bakır parlak ama koyulaşmasın: ortam ışığında tam metal kahverengi fıçıya dönüyordu. */
const bakirMetal = { metalness: 0.3, roughness: 0.4 } as const;

function Kutu({ w, h, d, renk, pos, golge = golgeVerir(w, h, d) }: { w: number; h: number; d: number; renk: string; pos: [number, number, number]; golge?: boolean }) {
  return (
    <mesh castShadow={golge} position={pos}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={renk} flatShading />
    </mesh>
  );
}

function Silindir({
  r1, r2, h, renk, pos, seg = 12, rot, m,
}: { r1: number; r2: number; h: number; renk: string; pos: [number, number, number]; seg?: number; rot?: [number, number, number]; m?: { metalness: number; roughness: number } }) {
  return (
    <mesh castShadow={silindirGolgeVerir(r1, r2, h)} position={pos} rotation={rot}>
      <cylinderGeometry args={[r1, r2, h, seg]} />
      <meshStandardMaterial color={renk} flatShading {...m} />
    </mesh>
  );
}

const kay = (ad: string) => `${FURNITURE}${ad}.gltf`;
// Mağaza önizlemesi eşyayı ilk tıkta çeker: model inmemişse ilkel yedek (kırmızı kutu) çekime girerdi.
['cabinet_small', 'table_small', 'armchair', 'lamp_standing'].forEach((ad) => useGLTF.preload(kay(ad)));
['carpet_round_small', ...Object.values(YILBASI_MODEL)].forEach((ad) => useGLTF.preload(`${HOLIDAY}${ad}.gltf`));

function Radyo() {
  const z = YERLESIM.radyo.dolapZ;
  return (
    <group>
      <Model src={kay('cabinet_small')} scale={DECOR_S} position={[0, 0, z]} fallback={<Kutu w={0.9} h={DOLAP_UST} d={0.9} renk={CEVIZ} pos={[0, DOLAP_UST / 2, z]} />} />
      <group position={[0, DOLAP_UST + RADYO.h / 2, z]}>
        <Kutu w={RADYO.w} h={RADYO.h} d={RADYO.d} renk={CEVIZ} pos={[0, 0, 0]} />
        <Kutu w={0.3} h={0.22} d={0.02} renk="#d9c79b" pos={[-0.06, 0.02, RADYO.d / 2 + 0.005]} golge={false} />
        {[0.15, 0.2].map((x) => (
          <Silindir key={x} r1={0.03} r2={0.03} h={0.03} renk={KOYU} pos={[x, -0.06, RADYO.d / 2 + 0.01]} rot={[Math.PI / 2, 0, 0]} seg={10} />
        ))}
      </group>
    </group>
  );
}

function Masa() {
  const z = YERLESIM.masa.z;
  return <Model src={kay('table_small')} scale={MASA_S} position={[0, 0, z]} fallback={<Kutu w={0.9} h={MASA_UST} d={0.9} renk={CEVIZ} pos={[0, MASA_UST / 2, z]} />} />;
}

function Semaver() {
  const z = YERLESIM.masa.z;
  return (
    <group>
      <Masa />
      <group position={[0, MASA_UST, z]}>
        <Silindir r1={0.12} r2={0.14} h={0.06} renk={BAKIR} pos={[0, 0.03, 0]} seg={16} m={bakirMetal} />
        <Silindir r1={0.13} r2={0.16} h={0.34} renk={BAKIR} pos={[0, 0.2, 0]} seg={16} m={bakirMetal} />
        <Silindir r1={0.07} r2={0.09} h={0.12} renk="#f4f1ea" pos={[0, SEMAVER.h - 0.06, 0]} seg={12} />
        <Silindir r1={0.012} r2={0.012} h={0.1} renk={BAKIR} pos={[0, 0.12, 0.17]} rot={[Math.PI / 2, 0, 0]} seg={6} m={bakirMetal} />
      </group>
    </group>
  );
}

function Gramofon() {
  const z = YERLESIM.masa.z;
  const plak = useRef<Group>(null);
  useFrame((_, dt) => {
    if (plak.current) plak.current.rotation.y += dt * 3.5;
  });
  return (
    <group>
      <Masa />
      <group position={[0, MASA_UST, z]}>
        <Kutu w={GRAMOFON.kutu} h={GRAMOFON.kutuH} d={GRAMOFON.kutu} renk={CEVIZ} pos={[0, GRAMOFON.kutuH / 2, 0]} />
        <group ref={plak} position={[0, GRAMOFON.kutuH + 0.008, 0]}>
          <Silindir r1={0.15} r2={0.15} h={0.015} renk="#111" pos={[0, 0, 0]} seg={20} />
          <Silindir r1={0.04} r2={0.04} h={0.018} renk="#9b1c22" pos={[0, 0.001, 0]} seg={12} />
        </group>
        <Silindir r1={0.015} r2={0.015} h={0.26} renk={ALTIN} pos={[0.12, 0.27, -0.1]} seg={6} m={metal} />
        <Silindir r1={0.16} r2={0.02} h={0.3} renk={ALTIN} pos={[0.12, 0.42, 0]} rot={[-0.9, 0, 0]} seg={16} m={metal} />
      </group>
    </group>
  );
}

function Kanarya() {
  const kus = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!kus.current) return;
    const t = clock.elapsedTime;
    // Küçük seke: iki saniyede bir kısa zıplama + yön değiştirme.
    const faz = t % 2;
    kus.current.position.y = faz < 0.25 ? Math.sin((faz / 0.25) * Math.PI) * 0.05 : 0;
    kus.current.rotation.y = Math.floor(t / 2) % 2 ? 0.8 : -0.8;
  });
  const cz = KANARYA.tabanR;
  return (
    <group position={[0, 0, cz]}>
      <Silindir r1={0.18} r2={KANARYA.tabanR} h={0.04} renk="#2a2a2a" pos={[0, 0.02, 0]} seg={10} />
      <Silindir r1={0.03} r2={0.03} h={KANARYA.direk} renk="#2a2a2a" pos={[0, KANARYA.direk / 2, 0]} seg={6} />
      <group position={[0, KANARYA.kafesY, 0]}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <Silindir key={i} r1={0.006} r2={0.006} h={0.4} renk={ALTIN} pos={[Math.cos(a) * KANARYA.kafesR * 0.95, 0, Math.sin(a) * KANARYA.kafesR * 0.95]} seg={4} m={metal} />;
        })}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={ALTIN} wireframe {...metal} />
        </mesh>
        <Silindir r1={KANARYA.kafesR} r2={KANARYA.kafesR} h={0.03} renk={ALTIN} pos={[0, -0.2, 0]} seg={14} m={metal} />
        <group ref={kus} position={[0, -0.13, 0]}>
          <mesh castShadow scale={[1.3, 1, 1]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#ffd23f" flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Koltuk() {
  return (
    <Model
      src={kay('armchair')}
      scale={KOLTUK_S}
      position={[0, 0, YERLESIM.koltuk.z]}
      fallback={<Kutu w={1.26} h={0.86} d={1.12} renk="#7c2230" pos={[0, 0.43, 0.56]} />}
    />
  );
}

function Lamba() {
  return (
    <Model
      src={kay('lamp_standing')}
      scale={LAMBA_YER_S}
      position={[0, 0, YERLESIM.lamba.z]}
      fallback={<Silindir r1={0.03} r2={0.03} h={1.55} renk={KOYU} pos={[0, 0.775, 0.31]} />}
    />
  );
}

/** Eski İstanbul tablosu — tuval elle çizilir (gün batımı + kubbe + iki minare), çerçeve altın. */
function Tablo() {
  const doku = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 170;
    const x = c.getContext('2d');
    if (!x) return null;
    const g = x.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, '#f2b872');
    g.addColorStop(1, '#6b8fb3');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 170);
    x.fillStyle = '#3b3550';
    x.fillRect(0, 110, 256, 60);
    x.beginPath();
    x.arc(128, 95, 36, Math.PI, 0);
    x.fill();
    for (const px of [70, 186]) x.fillRect(px - 4, 40, 8, 75);
    x.fillStyle = '#2a4d6e';
    x.fillRect(0, 140, 256, 30);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[0, TABLO.h / 2, 0]}>
      <Kutu w={TABLO.w} h={TABLO.h} d={TABLO.d * 0.6} renk={ALTIN} pos={[0, 0, TABLO.d * 0.3]} golge={DUVAR_GOLGE} />
      <mesh position={[0, 0, TABLO.d * 0.6 + 0.004]}>
        <planeGeometry args={[TABLO.w - 0.12, TABLO.h - 0.11]} />
        <meshStandardMaterial map={doku} color={doku ? '#ffffff' : '#c98a5a'} />
      </mesh>
    </group>
  );
}

/** Sarkaçlı duvar saati — sarkaç sallanır (hafif `useFrame`, feedback_visual_polish). */
function Saat() {
  const sarkac = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sarkac.current) sarkac.current.rotation.z = Math.sin(clock.elapsedTime * Math.PI) * 0.18;
  });
  const on = SAAT.d + 0.005;
  return (
    <group>
      <Kutu w={SAAT.w} h={SAAT.h} d={SAAT.d} renk="#5a3a22" pos={[0, SAAT.h / 2, SAAT.d / 2]} golge={DUVAR_GOLGE} />
      <mesh position={[0, SAAT.h - 0.24, on]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 20]} />
        <meshStandardMaterial color="#f4ead2" />
      </mesh>
      <Kutu w={0.012} h={0.1} d={0.01} renk={KOYU} pos={[0, SAAT.h - 0.2, on + 0.012]} golge={false} />
      <Kutu w={0.07} h={0.012} d={0.01} renk={KOYU} pos={[0.03, SAAT.h - 0.24, on + 0.012]} golge={false} />
      <Kutu w={0.26} h={0.5} d={0.01} renk="#3a2616" pos={[0, 0.36, on]} golge={false} />
      <group ref={sarkac} position={[0, 0.6, on + 0.012]}>
        <Kutu w={0.015} h={0.36} d={0.01} renk={ALTIN} pos={[0, -0.18, 0]} golge={false} />
        <mesh position={[0, -0.38, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.015, 14]} />
          <meshStandardMaterial color={ALTIN} {...metal} />
        </mesh>
      </group>
    </group>
  );
}

function Yilbasi({ id }: { id: string }) {
  const y = YERLESIM.yilbasi;
  return (
    <group>
      <Model
        src={`${HOLIDAY}carpet_round_small.gltf`}
        scale={HALI_S}
        position={[0, 0.006, y.haliZ]}
        fallback={<Silindir r1={0.7} r2={0.7} h={0.02} renk="#b3262a" pos={[0, 0.01, y.haliZ]} seg={24} />}
      />
      <Model
        src={`${HOLIDAY}${YILBASI_MODEL[id] ?? 'chair_large_red'}.gltf`}
        scale={YILBASI_S}
        position={[0, 0, y.koltukZ]}
        fallback={<Kutu w={0.92} h={1.07} d={0.81} renk="#9b1c22" pos={[0, 0.535, 0.4]} />}
      />
    </group>
  );
}

export function DekorGovde({ yuva, id }: { yuva: string; id: string }) {
  switch (yuva) {
    case 'radyo': return <Radyo />;
    case 'koltuk': return <Koltuk />;
    case 'lamba': return <Lamba />;
    case 'tablo': return <Tablo />;
    case 'semaver': return <Semaver />;
    case 'gramofon': return <Gramofon />;
    case 'kanarya': return <Kanarya />;
    case 'saat': return <Saat />;
    case 'yilbasi': return <Yilbasi id={id} />;
    default: return null;
  }
}

export function VitrinDekor() {
  const areasOpen = useGame((s) => s.areasOpen);
  const dekor = useGame((s) => s.dekor);
  const ownedCosmetics = useGame((s) => s.ownedCosmetics);
  const baslangic = useGame((s) => s.satin.baslangic);
  const onizleme = useGame((s) => s.dekorOnizleme);
  // F4c-4 (D-157): mağazada önizlenen ürün de kendi yuvasında çizilir (geçici); grubu çekime kaydedilir.
  const liste = cizilenDekor({ dekor, ownedCosmetics, satin: { baslangic }, areasOpen }, onizleme);
  return (
    <group>
      {liste.map(({ yuva, id }) => {
        const y = vitrinYuva(yuva);
        if (!y) return null;
        const { pos, rot } = yuvaAnkraj(y);
        return (
          <group
            key={`${yuva}:${id}`}
            ref={id === onizleme ? onizlemeGrubuKaydet : undefined}
            position={pos}
            rotation={[0, rot, 0]}
          >
            <DekorGovde yuva={yuva} id={id} />
          </group>
        );
      })}
    </group>
  );
}
