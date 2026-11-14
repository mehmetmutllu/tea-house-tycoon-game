/**
 * kat2/Mutfak.tsx — KAT 2 MUTFAĞI (D-198, oyun testi G2 2026-11-14).
 *
 * Kullanıcı: "Aşağıyı kopyala direkt. Önde tezgâh olsun, arkada ocak vesaire olsun … öndeki tezgâhın
 * üzerine o kahve şeyini koyarsın. Aspiratör olmasına gerek yok. Sadece öndeki set farklı olsun."
 *  · ARKA: Kat 1'in mutfak odası (`Kitchen.MutfakOdasi`) — aynı koordinat, aynı modeller, Kat 2'nin
 *    kendi ilerlemesiyle büyür (`kat2MutfakSeviyesi`). Aspiratör (davlumbaz) YOK — kullanıcı istemedi.
 *  · ÖN: bandın solunu kapatan servis tezgâhı (`kat.KAT2_ON_TEZGAH`, katı gövde). Her cezve ocağının
 *    (`OCAKLAR`) yerinde tezgâhın üstünde KAHVE SETİ: arka yarıda ısıtıcı + cezveler (sap ustaya dönük),
 *    ön kenarda servis tepsisi + hazır fincanlar. Arkada kahveci usta hazırlar, oyuncu/garson tepsiden alır.
 *  · Ön setin biçimi aday karşılaştırmasında (`ON_SETLER`); seçilince kaybedenler silinir.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { KayTezgah, MutfakOdasi } from '../Kitchen';
import { FRONT_TOP_Y, kat2MutfakSeviyesi } from '../kitchenLook';
import { KAT2_ON_TEZGAH, type Kat2Ocak } from '../../../game/kat';
import { useSandbox } from '../../../game/devSandbox';
import { KayActor } from '../KayActor';
import { Fincan, Kutu, Silindir } from './parca';

/** Kat 2'de servis hep bantta — Kat 1'in son yerleşimi (adalar o koridora göre durur). */
const BANT_YERLESIMI = 3;

const BAKIR = '#b87333';
const PIRINC = '#c9a227';
const KOYU = '#5d4037';
const KUM = '#d8b98a';
const KOZ = '#ff7a2f';

/** Ön tezgâhın modül eni (Kat 1'in KayKit tezgâh oranı; tek parçaya gerilip çekmeceler uzamasın). */
const TEZGAH_PARCA = 7;
const T = KAT2_ON_TEZGAH;
const TEZGAH_W = T.x1 - T.x0;
const TEZGAH_D = T.z1 - T.z0;
const TEZGAH_CZ = (T.z0 + T.z1) / 2;

function OnTezgah() {
  const w = TEZGAH_W / TEZGAH_PARCA;
  return (
    <group>
      {Array.from({ length: TEZGAH_PARCA }, (_, i) => (
        <group key={i} position={[T.x0 + w * (i + 0.5), 0, TEZGAH_CZ]}>
          <KayTezgah
            model="kitchencounter_straight_A"
            w={w}
            d={TEZGAH_D}
            topY={FRONT_TOP_Y}
            fallback={<Kutu w={w} h={FRONT_TOP_Y} d={TEZGAH_D} renk="#a0522d" pos={[0, FRONT_TOP_Y / 2, 0]} />}
          />
        </group>
      ))}
      {/* pirinç bant — Kat 1 tezgâhının "kafenin yüzü" detayı */}
      <Kutu w={TEZGAH_W} h={0.05} d={0.03} renk={PIRINC} pos={[(T.x0 + T.x1) / 2, FRONT_TOP_Y - 0.04, T.z1 + 0.01]} golge={false} />
    </group>
  );
}

function Cezve({ x, z, y = 0, s = 1.4 }: { x: number; z: number; y?: number; s?: number }) {
  return (
    <group position={[x, y, z]} scale={s}>
      <Silindir r1={0.07} r2={0.095} h={0.16} renk={BAKIR} pos={[0, 0.08, 0]} seg={10} />
      {/* sap ARKAYA (−z): tezgâhın öbür yanındaki usta tutar, oyuncu önden fincanı alır (oyun testi 2026-11-15) */}
      <Silindir r1={0.016} r2={0.016} h={0.28} renk={KOYU} pos={[0, 0.13, -0.17]} rot={[Math.PI / 2.4, 0, 0]} seg={5} />
    </group>
  );
}

/** Pişen cezvenin köpüğü — `pisiyor` iken hafif kabarır (eski ocağın davranışı). */
function Kopuk({ pisiyor, pos }: { pisiyor: boolean; pos: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((st) => {
    const k = ref.current;
    if (!k) return;
    k.visible = pisiyor;
    if (pisiyor) k.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(st.clock.elapsedTime * 2.6));
  });
  return (
    <group ref={ref} position={pos} visible={false}>
      <Silindir r1={0.13} r2={0.13} h={0.06} renk="#c9a27a" pos={[0, 0.03, 0]} seg={10} golge={false} />
    </group>
  );
}

/** Setin ısıtıcısı + üstündeki cezveler (yerel: tezgâh üstü y=0, ön +z). Köpük ilk cezvede. Isıtıcı ARKA yarıda (ustanın tarafı). */
const ISITICI_Z = -0.1;
type IsiticiCiz = (pisiyor: boolean) => React.ReactNode;

const kumOcagi: IsiticiCiz = (p) => (
  <group position={[0.25, 0, ISITICI_Z]}>
    <Kutu w={0.9} h={0.12} d={0.36} renk={BAKIR} pos={[0, 0.06, 0]} />
    <Kutu w={0.82} h={0.02} d={0.28} renk={KUM} pos={[0, 0.125, 0]} golge={false} />
    {[-0.25, 0, 0.25].map((dx) => <Cezve key={dx} x={dx} z={0} y={0.07} />)}
    <Kopuk pisiyor={p} pos={[-0.25, 0.07 + 0.22, 0]} />
  </group>
);

const mangal: IsiticiCiz = (p) => (
  <group position={[0.25, 0, ISITICI_Z]}>
    <Kutu w={0.8} h={0.2} d={0.36} renk="#3b3b3b" pos={[0, 0.1, 0]} />
    <Kutu w={0.7} h={0.03} d={0.28} renk={KOZ} pos={[0, 0.2, 0]} golge={false} />
    {[-0.2, 0.2].map((dx) => <Cezve key={dx} x={dx} z={0} y={0.21} />)}
    <Kopuk pisiyor={p} pos={[-0.2, 0.21 + 0.22, 0]} />
  </group>
);

const tupOcak: IsiticiCiz = (p) => (
  <group position={[0.25, 0, ISITICI_Z]}>
    <Kutu w={0.85} h={0.1} d={0.36} renk="#9e9e9e" pos={[0, 0.05, 0]} />
    {[-0.2, 0.2].map((dx) => (
      <group key={dx}>
        <Silindir r1={0.12} r2={0.12} h={0.02} renk="#2b2b2b" pos={[dx, 0.11, 0]} seg={12} golge={false} />
        <Cezve x={dx} z={0} y={0.12} />
      </group>
    ))}
    <Kopuk pisiyor={p} pos={[-0.2, 0.12 + 0.22, 0]} />
  </group>
);

const ispirto: IsiticiCiz = (p) => (
  <group position={[0.25, 0, ISITICI_Z]}>
    {[-0.22, 0.22].map((dx) => (
      <group key={dx}>
        <Silindir r1={0.11} r2={0.13} h={0.16} renk={PIRINC} pos={[dx, 0.08, 0]} seg={10} />
        <Cezve x={dx} z={0} y={0.16} />
      </group>
    ))}
    <Kopuk pisiyor={p} pos={[-0.22, 0.16 + 0.22, 0]} />
  </group>
);

/** Kahve değirmeni (pirinç, el çevirmeli) — setin süsü. */
function Degirmen({ x }: { x: number }) {
  return (
    <group position={[x, 0, -0.15]}>
      <Silindir r1={0.09} r2={0.1} h={0.42} renk={PIRINC} pos={[0, 0.21, 0]} seg={10} />
      <Silindir r1={0.1} r2={0.09} h={0.05} renk={KOYU} pos={[0, 0.45, 0]} seg={10} />
      <Kutu w={0.18} h={0.02} d={0.02} renk={KOYU} pos={[0.08, 0.5, 0]} golge={false} />
    </group>
  );
}

/** Bakır cezve askısı — arka kenarda iki dikme + çubuk, üç asılı cezve. */
function Aski({ x }: { x: number }) {
  return (
    <group position={[x, 0, -0.3]}>
      {[-0.35, 0.35].map((dx) => <Kutu key={dx} w={0.04} h={0.7} d={0.04} renk={KOYU} pos={[dx, 0.35, 0]} />)}
      <Kutu w={0.74} h={0.03} d={0.03} renk={PIRINC} pos={[0, 0.68, 0]} golge={false} />
      {[-0.22, 0, 0.22].map((dx) => <Cezve key={dx} x={dx} z={0.02} y={0.4} s={1.1} />)}
    </group>
  );
}

/** Lokum fanusu (cam kubbe + pembe-beyaz küpler). */
function Lokum({ x }: { x: number }) {
  return (
    <group position={[x, 0, -0.1]}>
      <Silindir r1={0.16} r2={0.16} h={0.02} renk={PIRINC} pos={[0, 0.01, 0]} seg={12} />
      {[[-0.05, 0], [0.05, 0.03], [0, -0.05]].map(([dx, dz], i) => (
        <Kutu key={i} w={0.06} h={0.06} d={0.06} renk={i % 2 ? '#f6c1d0' : '#f4efe4'} pos={[dx, 0.05, dz]} golge={false} />
      ))}
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#cfe8ef" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Ön set adayları (D-198 karşılaştırma). Seçilen kalır, kaybedenler silinir. */
export const ON_SETLER = {
  kum: { ad: 'Kum ocağı', isitici: kumOcagi, sus: null },
  mangal: { ad: 'Köz mangalı', isitici: mangal, sus: null },
  tup: { ad: 'İki gözlü ocak', isitici: tupOcak, sus: null },
  ispirto: { ad: 'Pirinç ispirto ocakları', isitici: ispirto, sus: null },
  kumDegirmen: { ad: 'Kum ocağı + değirmen + lokum', isitici: kumOcagi, sus: 'degirmen' },
  kumAski: { ad: 'Kum ocağı + bakır askı', isitici: kumOcagi, sus: 'aski' },
} as const;
export type OnSetId = keyof typeof ON_SETLER;
export const ON_SET_VARSAYILAN: OnSetId = 'kum';

/** Set büyütmesi — tezgâh üstündeki tek "kahve buradan" işareti; uzak kadrajdan da okunmalı (G2 "nereden alacağım belli değil"). */
const SET_OLCEK = 1.5;

/**
 * SERVİS TEPSİSİ (oyun testi 2026-11-15: "masadan ben kahveleri alıp dağıtıma çıkacağım veya garson"): usta
 * pişeni tezgâhın ön kenarındaki pirinç tepsiye bırakır; oyuncu/garson oradan alır. Tepsi boşken de durur —
 * "kahve buradan alınır" işareti. Hazır fincanlar tepside, oyuncuya en yakın sıra.
 */
const TEPSI = { x: 0.15, z: 0.17, w: 1.1, d: 0.2 } as const;
const FINCAN = { x: 0.15, z: 0.17, adim: 0.2, s: 1.3 } as const;

function ServisTepsisi() {
  return (
    <group position={[TEPSI.x, 0, TEPSI.z]}>
      <Kutu w={TEPSI.w} h={0.015} d={TEPSI.d} renk={PIRINC} pos={[0, 0.0075, 0]} />
      {[-1, 1].map((k) => <Kutu key={`z${k}`} w={TEPSI.w} h={0.03} d={0.012} renk={PIRINC} pos={[0, 0.015, (k * TEPSI.d) / 2]} golge={false} />)}
      {[-1, 1].map((k) => <Kutu key={`x${k}`} w={0.012} h={0.03} d={TEPSI.d} renk={PIRINC} pos={[(k * TEPSI.w) / 2, 0.015, 0]} golge={false} />)}
    </group>
  );
}

/** Bir ocağın tezgâh üstü seti. `hazir` fincan ön kenarda bekler; `pisiyor` iken cezve köpürür. */
export function KahveSeti({ ocak, hazir, pisiyor }: { ocak: Kat2Ocak; hazir: number; pisiyor: boolean }) {
  const secim = useSandbox((s) => s.kat2OnSet) as OnSetId | null;
  const set = ON_SETLER[secim && secim in ON_SETLER ? secim : ON_SET_VARSAYILAN];
  return (
    <group position={[ocak.x, FRONT_TOP_Y, TEZGAH_CZ]} scale={SET_OLCEK}>
      {set.isitici(pisiyor)}
      <ServisTepsisi />
      {set.sus === 'degirmen' && (
        <>
          <Degirmen x={-0.75} />
          <Lokum x={1.0} />
        </>
      )}
      {set.sus === 'aski' && <Aski x={-0.55} />}
      {Array.from({ length: hazir }, (_, i) => (
        <Fincan key={i} pos={[FINCAN.x + i * FINCAN.adim - ((hazir - 1) * FINCAN.adim) / 2, 0.015, FINCAN.z]} s={FINCAN.s} />
      ))}
    </group>
  );
}

/**
 * KAHVECİ USTA — Kat 1 çaycısının (Scene `KitchenHand`, D-023) karşılığı: tezgâhın arkasında, setinin başında
 * oyuncuya dönük durur; cezve pişerken çalışır. SALT GÖRSEL (kahve mekaniği `kat2Dongu`'da).
 */
export function KahveUsta({ ocak, pisiyor }: { ocak: Kat2Ocak; pisiyor: boolean }) {
  return (
    <group position={[ocak.x + 0.25 * SET_OLCEK, 0, T.z0 - 0.45]}>
      <KayActor kind="kitchenHand" hal={pisiyor ? 'calis' : 'dur'} />
    </group>
  );
}

/** Mutfak odası (Kat 1'in kopyası) + ön tezgâh. Setler `Kat2.Ocak` ile ocak başına çizilir. */
export function Kat2Mutfak({ padsDone }: { padsDone: readonly string[] }) {
  return (
    <group>
      <MutfakOdasi level={kat2MutfakSeviyesi(padsDone)} areasOpen={BANT_YERLESIMI} aspiratorsuz />
      <OnTezgah />
    </group>
  );
}
