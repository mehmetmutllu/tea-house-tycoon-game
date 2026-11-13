/**
 * kat2/Esya.tsx — Kat 2'nin eşyaları, D-181'de KULLANICI ONAYLI görünüşleriyle (değiştirme):
 *  · okey masası = yol G Sv1: Kat 1'in masası (`table_small` ×1,12) + yeşil çuha + `chair_stool_wood`
 *  · tavla masası = yol A Sv1: Kat 1'in masası (×0,9) + sade tavla kutusu + `chair_stool_wood`, iki kişi
 *  · cezve ocağı = 7: KayKit restoran tezgâhı + `stove_single` + davlumbaz (ölçek 0,9), cezve 1,5×
 * Çizim kaynağı `tools/kat2-esya.tsx` (aday aracı); burada yalnız seçilen basamak yaşıyor.
 *
 * Kumar YOK: masada para/jeton görünmez — yalnız taş, ıstaka, tavla pulları.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, Color, MathUtils, MeshStandardMaterial, Object3D, type Group, type InstancedMesh } from 'three';
import { Model } from '../Model';
import { STOOL_S } from '../tableLook';
import { MaketCrates, MaketPlant, MaketWallShelf } from '../maketParts';
import { BAND } from '../../../game/layout';
import { Fincan, Kutu, Silindir } from './parca';

export const KAY_F = '/assets/models/kaykit-furniture-bits/';
export const KAY_R = '/assets/models/kaykit-restaurant-bits/';

const UST = 0.75; // tabla üstü (Kat 1 ile aynı, D-073)
const YESIL = '#2e7d4f';
const KREM_TAS = '#f4eedc';
const ISTAKA = '#8a5a3b';
const TAS_RENK = ['#c62828', '#1565c0', '#222222', '#e0a000'];
const BAKIR = '#b87333';
const KOYU = '#5d4037';

/** Oturak yarıçapları: okeyde dört yan (±1,0), tavlada iki yan ±x (0,82). Grup da buradan oturur. */
export const OKEY_OTURAK_R = 1.0;
export const TAVLA_OTURAK_R = 0.82;
export const oturakYerleri = (tur: 'okey' | 'tavla'): [number, number][] =>
  tur === 'okey'
    ? [[0, -OKEY_OTURAK_R], [OKEY_OTURAK_R, 0], [0, OKEY_OTURAK_R], [-OKEY_OTURAK_R, 0]]
    : [[TAVLA_OTURAK_R, 0], [-TAVLA_OTURAK_R, 0]];

function Tabure({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Model src={`${KAY_F}chair_stool_wood.gltf`} scale={STOOL_S} fallback={<Silindir r1={0.22} r2={0.22} h={0.45} renk={ISTAKA} pos={[0, 0.225, 0]} />} />
    </group>
  );
}

/**
 * Yeni açılan eşya "pat" diye belirmez: yerinde küçükten büyür (Kat 1 masa açılışının dili).
 * `dogus` yalnız oturum içinde açılan eşyaya verilir; kata girişte duran eşya doğrudan tam boy.
 * Ölçek `pos` çevresinde (çocuklar dünya koordinatında çizilir): eşya dünyanın ortasından uçarak değil
 * kendi yerinde büyür.
 */
export function Dogus({ dogus, pos, children }: { dogus: boolean; pos: [number, number, number]; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const t = useRef(dogus ? 0 : 1);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt * 2.2);
    const x = t.current;
    // geri sekmeli büyüme (easeOutBack)
    const s = 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
    g.scale.setScalar(Math.max(0.001, s));
  });
  return (
    <group ref={ref} position={pos} scale={dogus ? 0.001 : 1}>
      <group position={[-pos[0], -pos[1], -pos[2]]}>{children}</group>
    </group>
  );
}

/**
 * Istakadaki taşların renkli rakamları (4 × 6) ve ortadaki taş destesi TEK instanced çizim (perf):
 * masa başına ~30 küçük mesh 2 çizime iner — 22 masada fark yüzlerce çizim çağrısı.
 */
const NOKTA_GEO = new BoxGeometry(0.018, 0.018, 0.004);
const TAS_GEO = new BoxGeometry(0.07, 0.03, 0.05);
const BEYAZ_MAT = new MeshStandardMaterial({ color: '#ffffff' });
const KREM_MAT = new MeshStandardMaterial({ color: KREM_TAS });

function TasNoktalari({ y }: { y: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    const c = new Color();
    let i = 0;
    oturakYerleri('okey').forEach(([dx, dz], k) => {
      const aci = Math.atan2(dx, dz);
      for (let t = 0; t < 6; t++) {
        // ıstakanın yerel ekseninde (x boyunca dizili, ön yüzde) → dünyaya döndür
        const lx = -0.22 + t * 0.088;
        const lz = -0.004;
        d.position.set(dx * 0.4 + Math.cos(aci) * lx + Math.sin(aci) * lz, y + 0.08, dz * 0.4 - Math.sin(aci) * lx + Math.cos(aci) * lz);
        d.rotation.set(0, aci, 0);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        m.setColorAt(i, c.set(TAS_RENK[(t + k) % 4]));
        i++;
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [y]);
  return <instancedMesh ref={ref} args={[NOKTA_GEO, BEYAZ_MAT, 24]} />;
}

function OrtaTaslar({ y }: { y: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    for (let k = 0; k < 6; k++) {
      d.position.set(((k % 3) - 1) * 0.08 - 0.04, y + 0.02 + Math.floor(k / 3) * 0.035, -0.035);
      d.updateMatrix();
      m.setMatrixAt(k, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [y]);
  return <instancedMesh ref={ref} args={[TAS_GEO, KREM_MAT, 6]} />;
}

/** Okey masası — yol G Sv1. `oyunda`: ortadaki taşlardan biri ıstakaya gidip gelir (oyun hissi). */
export function OkeyMasa({ x, z, oyunda, faz = 0 }: { x: number; z: number; oyunda: boolean; faz?: number }) {
  const cuhaY = UST + 0.006;
  const tas = useRef<Object3D>(null);
  useFrame((st) => {
    const m = tas.current;
    if (!m) return;
    if (!oyunda) {
      m.position.set(0.12, cuhaY + 0.055, 0.035);
      return;
    }
    // Her 2,4 sn'de bir oyuncu taş çeker: ortadan sıradaki ıstakaya yay çizerek gider.
    const p = (st.clock.elapsedTime + faz * 0.7) / 2.4;
    const k = Math.floor(p) % 4;
    const u = MathUtils.clamp((p % 1) * 2.2, 0, 1);
    const [dx, dz] = oturakYerleri('okey')[k];
    m.position.set(MathUtils.lerp(0.12, dx * 0.32, u), cuhaY + 0.055 + Math.sin(u * Math.PI) * 0.14, MathUtils.lerp(0.035, dz * 0.32, u));
  });
  return (
    <group position={[x, 0, z]}>
      <Model src={`${KAY_F}table_small.gltf`} scale={[1.12, 0.75, 1.12]} fallback={<Kutu w={1.1} h={0.75} d={1.1} renk={ISTAKA} pos={[0, 0.375, 0]} />} />
      <mesh position={[0, cuhaY, 0]} receiveShadow>
        <boxGeometry args={[1.04, 0.012, 1.04]} />
        <meshStandardMaterial color={YESIL} />
      </mesh>
      {oturakYerleri('okey').map(([dx, dz], k) => (
        <group key={k} position={[dx * 0.4, cuhaY + 0.03, dz * 0.4]} rotation={[0, Math.atan2(dx, dz), 0]}>
          <Kutu w={0.62} h={0.05} d={0.11} renk={ISTAKA} pos={[0, 0, 0]} golge={false} />
          <Kutu w={0.54} h={0.08} d={0.025} renk={KREM_TAS} pos={[0, 0.06, -0.02]} golge={false} />
        </group>
      ))}
      <TasNoktalari y={cuhaY + 0.03} />
      <OrtaTaslar y={cuhaY} />
      <mesh ref={tas} position={[0.12, cuhaY + 0.055, 0.035]}>
        <boxGeometry args={[0.07, 0.03, 0.05]} />
        <meshStandardMaterial color={KREM_TAS} />
      </mesh>
      {oturakYerleri('okey').map(([dx, dz], k) => (
        <Tabure key={k} x={dx} z={dz} />
      ))}
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
          <Silindir key={k} r1={0.032} r2={0.032} h={0.018} renk={beyaz ? '#f6f1e4' : '#2b1d16'} pos={[(beyaz ? -1 : 1) * 0.19, y + kat * 0.019, -0.33 + (sira % 3) * 0.066 + (beyaz ? 0 : 0.4)]} seg={12} golge={false} />
        );
      })}
    </group>
  );
}

/** Tavla masası — yol A Sv1 (sade kutu). `oyunda`: iki zar ara ara atılır (havalanıp döner). */
export function TavlaMasa({ x, z, oyunda, faz = 0 }: { x: number; z: number; oyunda: boolean; faz?: number }) {
  const zarlar = useRef<Group>(null);
  useFrame((st) => {
    const g = zarlar.current;
    if (!g) return;
    g.visible = oyunda;
    if (!oyunda) return;
    const p = (st.clock.elapsedTime + faz * 0.9) / 3.1;
    const u = MathUtils.clamp((p % 1) * 3, 0, 1);
    g.children.forEach((c, i) => {
      c.position.y = UST + 0.075 + Math.sin(u * Math.PI) * 0.18;
      c.rotation.set(u * 7 + i, u * 5 + i * 2, 0);
    });
  });
  return (
    <group position={[x, 0, z]}>
      <Model src={`${KAY_F}table_small.gltf`} scale={[0.9, 0.75, 0.9]} fallback={<Kutu w={0.9} h={0.75} d={0.9} renk={ISTAKA} pos={[0, 0.375, 0]} />} />
      <group position={[0, UST, 0]}>
        <Kutu w={0.46} h={0.05} d={0.62} renk="#5d3a24" pos={[0, 0.025, 0]} golge={false} />
        {[-1, 1].map((k) => (
          <mesh key={k} position={[0, 0.052, k * 0.155]}>
            <boxGeometry args={[0.4, 0.004, 0.27]} />
            <meshStandardMaterial color="#e6cf9e" />
          </mesh>
        ))}
        <Pullar y={0.06} />
      </group>
      <group ref={zarlar} visible={false}>
        {[-0.05, 0.05].map((dx) => (
          <mesh key={dx} position={[dx, UST + 0.075, 0.05]}>
            <boxGeometry args={[0.04, 0.04, 0.04]} />
            <meshStandardMaterial color="#fafafa" />
          </mesh>
        ))}
      </group>
      {oturakYerleri('tavla').map(([dx, dz], k) => (
        <Tabure key={k} x={dx} z={dz} />
      ))}
    </group>
  );
}

// ---- CEZVE OCAĞI 7 (KayKit restoran, Kat 1 mutfağının ölçeği 0,9) ----
// Çizim ocağın YEREL ekseninde: merkez (0, 0), önü +z (oyuncunun aldığı `al` noktasına bakar).
const KS = 0.9;
const MODUL = 2.0 * KS;
/** Tezgâh sırasının arka yüzü (yerel z). */
const ARKA = -1.0 * KS;
const kz = (minZ: number) => ARKA - minZ * KS;
const ASILI_Y = 3.2 - (2.0 + 2.0) * KS;
const TEZGAH_UST = 1.0 * KS;
const DAVLUMBAZ_GERI = 0.75;
/** Hazır fincanların dizildiği yer (yerel): sol tezgâhın ön kenarı, oyuncunun aldığı noktaya bakar. */
const FINCAN_YERI = { x: -1.2, z: 0.5, adim: 0.22 } as const;

export interface OcakYeri {
  x: number;
  z: number;
  al: readonly [number, number];
  /** Yürüme alanı içindeki ocağın gövde yarısı (yoksa bandın ocağı: alanın dışında, tam sıra). */
  govde?: readonly [number, number];
}

/** Ocağın y dönüşü: yerel +z, `al` noktasına bakar (ocak sırtını duvara verir). */
export const ocakAcisi = (o: OcakYeri): number => Math.atan2(o.al[0] - o.x, o.al[1] - o.z);

/**
 * Çizimin merkezi. Bandın ocağı `OCAK` noktasında (S1). Salondaki ocağın sırtı gövdesinin arka
 * yüzüne (bölmeye) oturur: tezgâh çiziminin arkası `ARKA` (yerel −0,9) oraya denk gelir.
 */
function cizimMerkezi(o: OcakYeri, aci: number): [number, number] {
  if (!o.govde) return [o.x, o.z];
  const geri = o.govde[1] + ARKA;
  return [o.x - Math.sin(aci) * geri, o.z - Math.cos(aci) * geri];
}

function Kay({ ad, x, z, y = 0 }: { ad: string; x: number; z: number; y?: number }) {
  return <Model src={`${KAY_R}${ad}.gltf`} scale={KS} position={[x, y, z]} fallback={null} />;
}

function Cezve({ x, y, z, s = 1.5 }: { x: number; y: number; z: number; s?: number }) {
  return (
    <group position={[x, y, z]} scale={s}>
      <Silindir r1={0.07} r2={0.095} h={0.16} renk={BAKIR} pos={[0, 0.08, 0]} seg={10} />
      <Silindir r1={0.016} r2={0.016} h={0.28} renk={KOYU} pos={[0, 0.13, -0.17]} rot={[Math.PI / 2.4, 0, 0]} seg={5} />
    </group>
  );
}

/**
 * Ocak — `hazir` kadar fincan tezgâhta bekler; `pisiyor` iken ocaktaki cezve köpürür (hafif
 * kabarma). Ocağın önü `al` noktasına bakar: oyuncu kahveyi ocağın tam önünden alır. Her ocak
 * (`OCAKLAR`) aynı bileşen; yalnız yeri ve yönü değişir.
 */
export function CezveOcagi({ ocak, hazir, pisiyor }: { ocak: OcakYeri; hazir: number; pisiyor: boolean }) {
  // Salondaki ocak KISA sıra: sol tezgâh (fincanlar) + ocak; bandın ocağı üç modül (yedek cezveli sağ tezgâh).
  const kisa = !!ocak.govde;
  const aci = ocakAcisi(ocak);
  const [cx, cz] = cizimMerkezi(ocak, aci);
  const ox = kisa ? MODUL / 2 : 0;
  const kopuk = useRef<Group>(null);
  useFrame((st) => {
    const k = kopuk.current;
    if (!k) return;
    k.visible = pisiyor;
    if (pisiyor) k.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(st.clock.elapsedTime * 2.6));
  });
  const stoveZ = kz(-1.03);
  return (
    <group position={[cx, 0, cz]} rotation={[0, aci, 0]}>
      <group position={[ox, 0, 0]}>
        <Kay ad="kitchencounter_straight_A_backsplash" x={-MODUL} z={kz(-1.0)} />
        <Kay ad="stove_single" x={0} z={stoveZ} />
        {!kisa && <Kay ad="kitchencounter_straight_B_backsplash" x={MODUL} z={kz(-1.0)} />}
        {/* Davlumbaz tezgâhın arkasına kaydırılır: Kat 1'de duvardaki ünite kameraya önünü verir,
            burada ocak kameraya en yakın sırada — yerinde dursa ocağın üstünü (cezveleri) örterdi.
            Salondaki ocağın sırtı bölmede: geri kayan davlumbaz duvarın öbür yanına taşardı, yok. */}
        {!kisa && <Kay ad="extractorhood" x={0} z={ARKA - DAVLUMBAZ_GERI} y={ASILI_Y} />}
        {/* bacası tavana çıkar (asılı durmasın) */}
        {!kisa && <Silindir r1={0.13} r2={0.13} h={1.0} renk={BAKIR} pos={[0, 2.75, ARKA - DAVLUMBAZ_GERI + 0.35]} seg={10} />}
        {[-0.24, 0.24].map((dx) => (
          <Cezve key={dx} x={dx} y={TEZGAH_UST + 0.16} z={stoveZ + 0.05} />
        ))}
        <group ref={kopuk} position={[-0.24, TEZGAH_UST + 0.16 + 0.24, stoveZ + 0.05]} visible={false}>
          <Silindir r1={0.1} r2={0.1} h={0.05} renk="#c9a27a" pos={[0, 0.025, 0]} seg={10} golge={false} />
        </group>
        {/* sağ tezgâh: yedek cezveler */}
        {!kisa &&
          [0, 1, 2].map((i) => <Cezve key={`d${i}`} x={MODUL - 0.45 + i * 0.45} y={TEZGAH_UST} z={-0.2} />)}
        {Array.from({ length: hazir }, (_, i) => (
          <Fincan key={i} pos={[FINCAN_YERI.x + i * FINCAN_YERI.adim - ((hazir - 1) * FINCAN_YERI.adim) / 2, TEZGAH_UST, FINCAN_YERI.z]} s={1.6} />
        ))}
      </group>
    </group>
  );
}

/** Bandın sol köşesi açılınca (ocak) içi boş kalmasın: raf, kasalar, saksı (maket `CayOcagi`). */
export function OcakKosesi() {
  return (
    <group>
      <MaketWallShelf w={5} pos={[-11.6, 2.0, BAND.back + 0.5]} />
      <MaketCrates pos={[-15.6, 0, BAND.back + 1.0]} />
      <MaketPlant pos={[-16.2, 0, BAND.front - 0.8]} big />
    </group>
  );
}
