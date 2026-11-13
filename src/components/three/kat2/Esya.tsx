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
import { PALETTE } from '../../../config/palette';
import { STOOL_S } from '../tableLook';
import { MaketCrates, MaketPlant, MaketWallShelf } from '../maketParts';
import { BAND } from '../../../game/layout';
import { Fincan, Kutu, Silindir } from './parca';
import { oturakYerleri } from './yol';

export const KAY_F = '/assets/models/kaykit-furniture-bits/';
export const KAY_R = '/assets/models/kaykit-restaurant-bits/';

const UST = 0.75; // tabla üstü (Kat 1 ile aynı, D-073)
const YESIL = '#2e7d4f';
const KREM_TAS = '#f4eedc';
const ISTAKA = '#8a5a3b';
const TAS_RENK = ['#c62828', '#1565c0', '#222222', '#e0a000'];
const BAKIR = '#b87333';
const KOYU = '#5d4037';

/**
 * MASA SEVİYESİ (S3 · D-181) — her basamak TEK gözle görülür değişim, final en görünür (CoC):
 *  okey yol G: Sv1 tabure · Sv2 ahşap sandalye · Sv3 mavi minderli sandalye · Sv4 çerçeveli masa
 *    büyür (×1,15) · Sv5 tam döşemeli mavi sandalye + pirinç kenar + çay
 *  tavla yol A: Sv1 sade kutu · Sv2 kakma tavla · Sv3 minderli tabure · Sv4 masa büyür (×1,2) ·
 *    Sv5 pirinç kenar + çay + zar
 * Okeyde 4, tavlada 2 kişi sabit → seviye sinyali oturak SAYISI değil; oturak tipi + boy + aksesuar.
 * Renk yalnız üst yüzey/minder (`feedback_upgrade_legibility`).
 */
type Oturak = 'chair_stool_wood' | 'chair_stool' | 'chair_A_wood' | 'chair_A' | 'chair_C';
interface OkeyGorunus { cerceve: boolean; oturak: Oturak; boy: number; pirinc: boolean; cay: boolean }
interface TavlaGorunus { kakma: boolean; oturak: Oturak; boy: number; pirinc: boolean; cay: boolean }
const OKEY_SV: readonly OkeyGorunus[] = [
  { cerceve: false, oturak: 'chair_stool_wood', boy: 1, pirinc: false, cay: false },
  { cerceve: false, oturak: 'chair_A_wood', boy: 1, pirinc: false, cay: false },
  { cerceve: false, oturak: 'chair_A', boy: 1, pirinc: false, cay: false },
  { cerceve: true, oturak: 'chair_A', boy: 1.15, pirinc: false, cay: false },
  { cerceve: true, oturak: 'chair_C', boy: 1.15, pirinc: true, cay: true },
];
const TAVLA_SV: readonly TavlaGorunus[] = [
  { kakma: false, oturak: 'chair_stool_wood', boy: 1, pirinc: false, cay: false },
  { kakma: true, oturak: 'chair_stool_wood', boy: 1, pirinc: false, cay: false },
  { kakma: true, oturak: 'chair_stool', boy: 1, pirinc: false, cay: false },
  { kakma: true, oturak: 'chair_stool', boy: 1.2, pirinc: false, cay: false },
  { kakma: true, oturak: 'chair_stool', boy: 1.2, pirinc: true, cay: true },
];
/** Seviye 1..5'e sıkıştırılır (kayıt bozuksa da çizim düşmez). */
const svi = (sv: number) => Math.min(5, Math.max(1, Math.round(sv || 1))) - 1;
export const okeyGorunus = (sv: number): OkeyGorunus => OKEY_SV[svi(sv)];
export const tavlaGorunus = (sv: number): TavlaGorunus => TAVLA_SV[svi(sv)];

/** chair_A_wood oturağı ~0,55 → 0,45: Kat 1 taburesiyle aynı oturak yüksekliği (`kat2-ortak`). */
const SANDALYE_S = 0.82;
const CEVIZ = '#6b4026';

/** Oturak: tabure yönsüz; sandalye masaya bakar. */
function Oturagi({ x, z, tip }: { x: number; z: number; tip: Oturak }) {
  const tabure = tip === 'chair_stool_wood' || tip === 'chair_stool';
  return (
    <group position={[x, 0, z]} rotation={[0, tabure ? 0 : Math.atan2(-x, -z), 0]}>
      <Model
        src={`${KAY_F}${tip}.gltf`}
        scale={tabure ? STOOL_S : SANDALYE_S}
        fallback={<Silindir r1={0.22} r2={0.22} h={0.45} renk={tip === 'chair_A' || tip === 'chair_C' || tip === 'chair_stool' ? '#5a93cf' : ISTAKA} pos={[0, 0.225, 0]} />}
      />
    </group>
  );
}

/** Pirinç kenar: tablanın çevresinde dört ince metal çıta (Sv5'in "en görünür" sinyali). */
function Pirinc({ hw, y }: { hw: number; y: number }) {
  return (
    <group>
      {[[0, hw, 2 * hw + 0.05, 0.03], [0, -hw, 2 * hw + 0.05, 0.03], [hw, 0, 0.03, 2 * hw + 0.05], [-hw, 0, 0.03, 2 * hw + 0.05]].map(([x, z, w, d], k) => (
        <mesh key={k} position={[x, y, z]}>
          <boxGeometry args={[w, 0.06, d]} />
          <meshStandardMaterial color={PALETTE.brass} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** İnce belli çay bardağı tabağıyla (Sv5). */
function CayBardagi({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <Silindir r1={0.05} r2={0.05} h={0.008} renk="#f4f1ea" pos={[0, 0.006, 0]} seg={12} golge={false} />
      <Silindir r1={0.026} r2={0.02} h={0.08} renk="#c0571c" pos={[0, 0.05, 0]} seg={10} golge={false} />
    </group>
  );
}

/** Çerçeveli klasik okey masası (Sv4+): dört ayak, etek, tabla, koyu kenar çıtası. Üst yüzey 0,77. */
function CerceveliMasa() {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => (
        <Kutu key={k} w={0.08} h={0.73} d={0.08} renk={CEVIZ} pos={[sx * 0.52, 0.365, sz * 0.52]} />
      ))}
      <Kutu w={1.04} h={0.1} d={1.04} renk={CEVIZ} pos={[0, 0.66, 0]} />
      <Kutu w={1.16} h={0.04} d={1.16} renk={CEVIZ} pos={[0, 0.73, 0]} />
      {[0, 1, 2, 3].map((k) => (
        <Kutu key={`c${k}`} w={k % 2 ? 0.08 : 1.2} h={0.05} d={k % 2 ? 1.2 : 0.08} renk="#4a2a18" pos={[k === 1 ? 0.56 : k === 3 ? -0.56 : 0, 0.775, k === 0 ? 0.56 : k === 2 ? -0.56 : 0]} golge={false} />
      ))}
    </group>
  );
}

/**
 * SEVİYE ATLAMA ANI (S3): masa yeni hâline YERİNDE sekerek geçer (0,82 → 1, easeOutBack) ve
 * ayağından toz kalkar (merdiven dönüşümünün tozu, `MerdivenDonusum`). Kat 1 masasının seviye
 * juice'u yok (anlık takas); dil Kat 2'nin `Dogus`u. İlk çizimde (kata giriş) oynamaz.
 */
const SEKME_SN = 0.45;
const TOZ_SN = 0.8;
const TOZ_N = 8;
const TOZ_MAT = new MeshStandardMaterial({ color: '#d9cbb2', transparent: true, opacity: 0.55, depthWrite: false });
export function SvSekme({ sv, pos, children }: { sv: number; pos: [number, number, number]; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const toz = useRef<Group>(null);
  const onceki = useRef(sv);
  const t = useRef(1);
  useFrame((_, dt) => {
    if (sv !== onceki.current) {
      if (sv > onceki.current) t.current = 0;
      onceki.current = sv;
    }
    const g = ref.current;
    const tz = toz.current;
    if (!g || !tz) return;
    if (t.current >= 1) {
      tz.visible = false;
      return;
    }
    t.current = Math.min(1, t.current + dt / TOZ_SN);
    const x = Math.min(1, (t.current * TOZ_SN) / SEKME_SN);
    const s = 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
    g.scale.set(0.82 + 0.18 * s, 0.82 + 0.18 * s, 0.82 + 0.18 * s);
    tz.visible = t.current < 1;
    const u = t.current;
    tz.children.forEach((c, i) => {
      c.scale.setScalar(0.3 + u * 0.9);
      c.position.y = 0.15 + u * 0.6 + (i % 3) * 0.06;
    });
    TOZ_MAT.opacity = 0.55 * (1 - u);
  });
  return (
    <>
      <group ref={ref} position={pos}>
        <group position={[-pos[0], -pos[1], -pos[2]]}>{children}</group>
      </group>
      <group ref={toz} position={pos} visible={false}>
        {Array.from({ length: TOZ_N }, (_, i) => {
          const a = (i / TOZ_N) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.05, 0.15, Math.sin(a) * 1.05]} material={TOZ_MAT}>
              <sphereGeometry args={[0.22 + (i % 3) * 0.05, 8, 6]} />
            </mesh>
          );
        })}
      </group>
    </>
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

/** Okey masası — yol G, `sv` 1..5. `oyunda`: ortadaki taşlardan biri ıstakaya gidip gelir (oyun hissi). */
export function OkeyMasa({ x, z, oyunda, faz = 0, sv = 1 }: { x: number; z: number; oyunda: boolean; faz?: number; sv?: number }) {
  const g = okeyGorunus(sv);
  const cuhaY = (g.cerceve ? 0.77 : UST) + 0.006;
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
      <group scale={[g.boy, 1, g.boy]}>
        {g.cerceve ? (
          <CerceveliMasa />
        ) : (
          <Model src={`${KAY_F}table_small.gltf`} scale={[1.12, 0.75, 1.12]} fallback={<Kutu w={1.1} h={0.75} d={1.1} renk={ISTAKA} pos={[0, 0.375, 0]} />} />
        )}
        {g.pirinc && <Pirinc hw={0.6} y={0.74} />}
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
        {g.cay && [[0.38, 0.38], [-0.38, -0.38]].map(([cx, cz]) => <CayBardagi key={cx} pos={[cx, cuhaY, cz]} />)}
      </group>
      {oturakYerleri('okey', sv).map(([dx, dz], k) => (
        <Oturagi key={k} x={dx} z={dz} tip={g.oturak} />
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

/** Kakma tavla (Sv2+): açık kutu, krem alan, 24 hane (kırmızı/koyu uçlar), koyu çerçeve + menteşe. */
function KakmaTavla() {
  const W = 0.6;
  const D = 0.78;
  return (
    <group>
      <Kutu w={W} h={0.03} d={D} renk="#4a2a18" pos={[0, 0.015, 0]} golge={false} />
      <mesh position={[0, 0.032, 0]}>
        <boxGeometry args={[W - 0.06, 0.004, D - 0.06]} />
        <meshStandardMaterial color="#ead7ae" />
      </mesh>
      {[[0, -D / 2 + 0.015, W, 0.03], [0, D / 2 - 0.015, W, 0.03], [0, 0, W, 0.04]].map(([kx, kz, w, d], k) => (
        <Kutu key={k} w={w} h={0.055} d={d} renk="#4a2a18" pos={[kx, 0.045, kz]} golge={false} />
      ))}
      {[-1, 1].map((s) => (
        <Kutu key={`y${s}`} w={0.03} h={0.055} d={D} renk="#4a2a18" pos={[s * (W / 2 - 0.015), 0.045, 0]} golge={false} />
      ))}
      <Haneler w={W} />
      <Pullar y={0.045} />
    </group>
  );
}

/** Tavlanın 24 hanesi TEK instanced çizim (masa başına 24 mesh → 1; 12 tavla masası). */
const HANE_GEO = new BoxGeometry(0.2, 0.003, 0.028);
function Haneler({ w }: { w: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    const c = new Color();
    let i = 0;
    for (const yari of [-1, 1])
      for (const kenar of [-1, 1])
        for (let n = 0; n < 6; n++) {
          d.position.set(kenar * (w / 2 - 0.13), 0.036, yari * (0.05 + n * 0.054 + 0.027));
          d.updateMatrix();
          m.setMatrixAt(i, d.matrix);
          m.setColorAt(i, c.set((n + (kenar > 0 ? 1 : 0)) % 2 ? '#9b2c22' : '#3a2a20'));
          i++;
        }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [w]);
  return <instancedMesh ref={ref} args={[HANE_GEO, BEYAZ_MAT, 24]} />;
}

/** Tavla masası — yol A, `sv` 1..5. `oyunda`: iki zar ara ara atılır (havalanıp döner). */
export function TavlaMasa({ x, z, oyunda, faz = 0, sv = 1 }: { x: number; z: number; oyunda: boolean; faz?: number; sv?: number }) {
  const gor = tavlaGorunus(sv);
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
      <group scale={[gor.boy, 1, gor.boy]}>
        <Model src={`${KAY_F}table_small.gltf`} scale={[0.9, 0.75, 0.9]} fallback={<Kutu w={0.9} h={0.75} d={0.9} renk={ISTAKA} pos={[0, 0.375, 0]} />} />
        {gor.pirinc && <Pirinc hw={0.45} y={UST - 0.03} />}
      </group>
      <group position={[0, UST, 0]}>
        {gor.kakma ? (
          <KakmaTavla />
        ) : (
          <>
            <Kutu w={0.46} h={0.05} d={0.62} renk="#5d3a24" pos={[0, 0.025, 0]} golge={false} />
            {[-1, 1].map((k) => (
              <mesh key={k} position={[0, 0.052, k * 0.155]}>
                <boxGeometry args={[0.4, 0.004, 0.27]} />
                <meshStandardMaterial color="#e6cf9e" />
              </mesh>
            ))}
            <Pullar y={0.06} />
          </>
        )}
      </group>
      {gor.cay && (
        <>
          <CayBardagi pos={[0.34, UST, 0.36]} />
          <CayBardagi pos={[-0.34, UST, -0.36]} />
          {!oyunda && (
            <>
              <Kutu w={0.035} h={0.035} d={0.035} renk="#fafafa" pos={[0.1, UST + 0.08, 0.2]} rot={[0, 0.5, 0]} golge={false} />
              <Kutu w={0.035} h={0.035} d={0.035} renk="#fafafa" pos={[0.15, UST + 0.08, 0.14]} rot={[0, 1.1, 0]} golge={false} />
            </>
          )}
        </>
      )}
      <group ref={zarlar} visible={false}>
        {[-0.05, 0.05].map((dx) => (
          <mesh key={dx} position={[dx, UST + 0.075, 0.05]}>
            <boxGeometry args={[0.04, 0.04, 0.04]} />
            <meshStandardMaterial color="#fafafa" />
          </mesh>
        ))}
      </group>
      {oturakYerleri('tavla', sv).map(([dx, dz], k) => (
        <Oturagi key={k} x={dx} z={dz} tip={gor.oturak} />
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
