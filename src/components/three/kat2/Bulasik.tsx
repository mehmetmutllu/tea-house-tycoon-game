/**
 * kat2/Bulasik.tsx — KAT 2 BULAŞIĞININ ÇİZİMİ (D-201 Parça 2). Mantık `kat2Dongu` (Kat 1 döngüsü): teslim edilen
 * fincan masada içilir (`ictigi`), sonraki teslimde boşu KİRLİ olur (`kirli`); kirliyi oyuncu/garson/bulaşıkçı
 * toplar, ön tezgâhtaki LEĞENE bırakır (`legen`), leğen `yikamaSn`de hepsini temize döndürür.
 *
 * Yalnız SUNUM: durumu okur, üretmez. Dil Kat 1'in bulaşığı: kirli gri (Kat 1 kirli bardağı) + dipte telve;
 * leğende yığın sayıyla büyür (bakırın üstüne oturur, su yok — G-127), boşaldığı an su-mavisi halka (Kat 1 `DishSink.Yikama`).
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { useGame } from "../../../game/store";
import {
  KAT2_BULASIKCI_PAD,
  KAT2_KISI,
  KAT2_MASALAR,
  KAT2_ON_TEZGAH,
  KAT2_YIKAMA_YER,
  type Kat2MasaYeri,
} from "../../../game/kat";
import { masaSvOku } from "../../../game/kat2Dongu";
import { FRONT_TOP_Y } from "../kitchenLook";
import { okeyGorunus, tavlaGorunus } from "./Esya";
import { oturakYerleri } from "./yol";
import { useMasaSvleri } from "./masaSv";
import { masaBul } from "./masaIndeks";
import { Fincan, KirliFincan, Kutu, Silindir } from "./parca";
import { LEGEN_AGIZ, LEGEN_FINCAN } from "./esyaOlcu";
import { Kat2Personel } from "./Garson";

/** Masa üstündeki fincan ölçeği (ocaktaki hazır fincanla aynı). */
const MASA_FINCAN_S = 1.6;
/** Leğende çizilen en çok kirli (Kat 1 `LEGEN_GORUNEN`). */
const LEGEN_GORUNEN = 8;
const FLASH = 0.55;
/** Yıkama yerinin ölçeği: oyun kamerasından leğen + içindeki kirli seçilsin (ocak setiyle aynı iri ölçek). */
const LEGEN_S = 1.35;

/** Masa üstünün yüksekliği (okey çuhası / tavla tablası) — `Esya` çizimiyle aynı sayılar. */
function ustY(tur: Kat2MasaYeri["tur"], sv: number): number {
  if (tur === "okey") return (okeyGorunus(sv).cerceve ? 0.77 : 0.75) + 0.006;
  return 0.75 + (tavlaGorunus(sv).cila ? 0.016 : 0);
}

/**
 * Fincan yuvası: her oturağın önünde, oyuncunun SAĞINDA içilen, SOLUNDA kirli (ıstakaya/tavlaya değmez).
 * Kişiden fazlası (kirli birikmişse) bir halka içeri dizilir.
 */
function yuva(
  tur: Kat2MasaYeri["tur"],
  k: number,
  sag: boolean,
): [number, number] {
  const yerler = oturakYerleri(tur);
  const [ox, oz] = yerler[k % yerler.length];
  const L = Math.hypot(ox, oz) || 1;
  const dx = ox / L;
  const dz = oz / L;
  const icer = Math.floor(k / yerler.length) * 0.1;
  const d = (tur === "okey" ? 0.22 : 0.33) - icer;
  const p = (tur === "okey" ? 0.3 : 0.17) * (sag ? 1 : -1);
  return [dx * d - dz * p, dz * d + dx * p];
}

function MasaFincanlari({ yer, sv }: { yer: Kat2MasaYeri; sv: number }) {
  // Sayı seçiciler (her `set`te dizgi üretmez); masa `masaBul` ile tek haritadan.
  const ictigi = useGame((s) => masaBul(s.kat2Dunya.masalar, yer.id)?.ictigi ?? 0);
  const kirli = useGame((s) => masaBul(s.kat2Dunya.masalar, yer.id)?.kirli ?? 0);
  if (!ictigi && !kirli) return null;
  const boy = yer.tur === "okey" ? okeyGorunus(sv).boy : tavlaGorunus(sv).boy;
  const y = ustY(yer.tur, sv);
  const sinir = KAT2_KISI[yer.tur] * 2;
  return (
    <group position={[yer.x, 0, yer.z]}>
      <group scale={[boy, 1, boy]}>
        {Array.from({ length: Math.min(ictigi, sinir) }, (_, k) => {
          const [x, z] = yuva(yer.tur, k, true);
          return <Fincan key={`i${k}`} pos={[x, y, z]} s={MASA_FINCAN_S} />;
        })}
        {Array.from({ length: Math.min(kirli, sinir) }, (_, k) => {
          const [x, z] = yuva(yer.tur, k, false);
          return (
            <KirliFincan key={`k${k}`} pos={[x, y, z]} s={MASA_FINCAN_S} />
          );
        })}
      </group>
    </group>
  );
}

/** Açık masaların fincanları (içilen + kirli). */
export function MasaBulasiklari() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const masaSv = useMasaSvleri();
  return (
    <>
      {KAT2_MASALAR.filter((m) => padsDone.includes(m.id)).map((m) => (
        <MasaFincanlari key={m.id} yer={m} sv={masaSvOku(masaSv, m.id)} />
      ))}
    </>
  );
}

/** Leğen boşalınca (toplu yıkama) kısa su-mavisi halka — Kat 1 `DishSink.Yikama`, setState yok. */
function Yikama({ bekleyen, y }: { bekleyen: number; y: number }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  const son = useRef(bekleyen);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (bekleyen !== son.current) {
      if (son.current > 0 && bekleyen === 0) t.current = FLASH;
      son.current = bekleyen;
    }
    if (t.current <= 0) {
      if (g.visible) g.visible = false;
      return;
    }
    t.current = Math.max(0, t.current - dt);
    const k = t.current / FLASH;
    g.visible = true;
    const s = 0.5 + (1 - k) * 0.7;
    g.scale.set(s, 1, s);
    g.position.y = y + (1 - k) * 0.22;
    const mat = (g.children[0] as Mesh | undefined)?.material as
      MeshStandardMaterial | undefined;
    if (mat) mat.opacity = k * 0.75;
  });
  return (
    <group ref={ref} visible={false} position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.34, 20]} />
        <meshStandardMaterial
          color="#7fc7e8"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * YIKAMA YERİ: ön tezgâhın üstünde iki ocağın ortasında bakır leğen + yanında ibrik ve temiz fincan süzgeci.
 * Leğende bekleyen kirliler bakırın ÜSTÜNE halka dizilir (tepsiye bırakılmış gibi; sayıyla büyür, toplu yıkamada boşalır).
 */
export function YikamaYeri() {
  const legen = useGame((s) => s.kat2Dunya.legen ?? 0);
  const x = KAT2_YIKAMA_YER[0];
  const z = (KAT2_ON_TEZGAH.z0 + KAT2_ON_TEZGAH.z1) / 2;
  const y = FRONT_TOP_Y;
  const n = Math.min(legen, LEGEN_GORUNEN);
  return (
    <group position={[x, 0, z]}>
      <group position={[0, y, 0]} scale={LEGEN_S}>
        <group position={[0, -y, 0]}>
          {/* bakır leğen: geniş ağız, dar dip, kalın kenar */}
          <Silindir
            r1={0.36}
            r2={0.24}
            h={LEGEN_AGIZ}
            renk="#b87333"
            pos={[0, y + LEGEN_AGIZ / 2, 0]}
            seg={18}
          />
          <mesh position={[0, y + LEGEN_AGIZ + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.36, 0.025, 6, 20]} />
            <meshStandardMaterial
              color="#c98a4b"
              metalness={0.4}
              roughness={0.45}
            />
          </mesh>
          {Array.from({ length: n }, (_, i) => {
            const a = (i / Math.max(n, 1)) * Math.PI * 2;
            const r = n > 1 ? 0.19 : 0;
            return (
              <KirliFincan
                key={i}
                pos={[
                  Math.cos(a) * r,
                  y + LEGEN_FINCAN,
                  Math.sin(a) * r,
                ]}
                s={1.4}
              />
            );
          })}
          {/* ibrik (su) — leğenin solunda */}
          <group position={[-0.62, y, 0.02]}>
            <Silindir
              r1={0.07}
              r2={0.11}
              h={0.22}
              renk="#c9a227"
              pos={[0, 0.11, 0]}
              seg={12}
            />
            <Silindir
              r1={0.035}
              r2={0.06}
              h={0.1}
              renk="#c9a227"
              pos={[0, 0.27, 0]}
              seg={10}
            />
            <Silindir
              r1={0.012}
              r2={0.018}
              h={0.2}
              renk="#c9a227"
              pos={[0.11, 0.2, 0]}
              rot={[0, 0, -0.9]}
              seg={6}
            />
          </group>
          {/* süzgeç: yıkanan fincanların yeri (sabit süs — temiz havuzu sayıyla çizilmez) */}
          <group position={[0.66, y, 0]}>
            <Kutu
              w={0.42}
              h={0.03}
              d={0.3}
              renk="#8a6a4f"
              pos={[0, 0.015, 0]}
            />
            {[-0.12, 0.0, 0.12].map((dx) => (
              <Fincan key={dx} pos={[dx, 0.03, 0.04]} s={1.3} />
            ))}
          </group>
        </group>
      </group>
      <Yikama bekleyen={legen} y={y + 0.25} />
    </group>
  );
}

/** BULAŞIKÇI (Kat 1 `Dishwasher`): aynı KayKit gövdesi, taşıdığı kirli fincan küçük tepside. */
export function Kat2Bulasikci() {
  const acik = useGame((s) => s.kat2.padsDone.includes(KAT2_BULASIKCI_PAD));
  const kirli = useGame((s) => s.kat2Dunya.bulasikci?.kirli ?? -1);
  if (!acik || kirli < 0) return null;
  return (
    <Kat2Personel
      kind="dishwasher"
      oku={bulasikciOku}
      kahve={0}
      kirli={kirli}
    />
  );
}

function bulasikciOku(): { x: number; z: number } | null {
  return useGame.getState().kat2Dunya.bulasikci ?? null;
}
