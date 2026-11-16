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
 *  · Ön set = KÖZ MANGALI (kullanıcı seçti 2026-11-17); mutfak seviyesiyle büyür (`MANGAL_SEVIYE`).
 *  · Ortadaki adalar YOK — Kat 1 mutfağından farkı bu (kullanıcı 2026-11-17: "karmaşık duruyor").
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { KayTezgah, MutfakOdasi } from '../Kitchen';
import { FRONT_TOP_Y, kat2MutfakSeviyesi } from '../kitchenLook';
import { KAT2_ON_TEZGAH, type Kat2Ocak } from '../../../game/kat';
import { KayActor } from '../KayActor';
import { Fincan, Kutu, Silindir } from './parca';

/** Kat 2 mutfak zemini: koyu kahve + krem dama (kullanıcı 2026-11-17) — Kat 1'in klasik damasından ayrışır. */
const KAT2_ZEMIN = 'koyuKahve';

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

function Cezve({ x, z, y = 0, s = 1.4, renk = BAKIR }: { x: number; z: number; y?: number; s?: number; renk?: string }) {
  return (
    <group position={[x, y, z]} scale={s}>
      <Silindir r1={0.07} r2={0.095} h={0.16} renk={renk} pos={[0, 0.08, 0]} seg={10} />
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

/** Mangal ARKA yarıda (ustanın tarafı); yerel: tezgâh üstü y=0, ön +z. Köpük ilk cezvede. */
const ISITICI_Z = -0.1;
const DEMIR = '#3b3b3b';
const KALAY = '#cfd3d6';

/**
 * KÖZ MANGALI (kullanıcı 2026-11-17: ön setlerden mangal, büyüme yolu C "karma"). Seviyesi Kat 2 mutfağının
 * seviyesidir (`kat2MutfakSeviyesi`, 1-6) — mangalın kendi mekaniği yok, oda büyüdükçe o da büyür. Her basamakta
 * en az iki sinyal değişir (boy · cezve sayısı · malzeme · ayak · köz), `feedback_upgrade_legibility`.
 * Gövde koyu bakır: açık bakır turuncu tezgâhla karışıyordu.
 */
interface MangalGorunus {
  w: number;
  govde: string;
  kenar: string | null;
  ayak: boolean;
  cezve: number;
  cezveRenk: string;
  koz: number;
}

const KOYU_BAKIR = '#7a3e1f';

export const MANGAL_SEVIYE: readonly MangalGorunus[] = [
  { w: 0.7, govde: DEMIR, kenar: null, ayak: false, cezve: 2, cezveRenk: BAKIR, koz: 0.2 },
  { w: 0.7, govde: DEMIR, kenar: PIRINC, ayak: false, cezve: 2, cezveRenk: BAKIR, koz: 0.35 },
  { w: 0.85, govde: KOYU_BAKIR, kenar: PIRINC, ayak: false, cezve: 3, cezveRenk: BAKIR, koz: 0.5 },
  { w: 0.85, govde: KOYU_BAKIR, kenar: PIRINC, ayak: true, cezve: 3, cezveRenk: BAKIR, koz: 0.6 },
  { w: 1.0, govde: KOYU_BAKIR, kenar: PIRINC, ayak: true, cezve: 4, cezveRenk: KALAY, koz: 0.75 },
  { w: 1.0, govde: PIRINC, kenar: KOYU_BAKIR, ayak: true, cezve: 4, cezveRenk: KALAY, koz: 0.9 },
];

function Mangal({ g, pisiyor }: { g: MangalGorunus; pisiyor: boolean }) {
  const ayakH = g.ayak ? 0.06 : 0;
  const ust = ayakH + 0.2;
  const adim = g.cezve > 1 ? Math.min(0.26, (g.w - 0.28) / (g.cezve - 1)) : 0;
  const xler = Array.from({ length: g.cezve }, (_, i) => (i - (g.cezve - 1) / 2) * adim);
  return (
    <group position={[0.25, 0, ISITICI_Z]}>
      {g.ayak &&
        [-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <Kutu key={`${sx}${sz}`} w={0.05} h={ayakH} d={0.05} renk={g.kenar ?? KOYU} pos={[(sx * (g.w - 0.08)) / 2, ayakH / 2, (sz * 0.28) / 2]} golge={false} />
        )))}
      <Kutu w={g.w} h={0.2} d={0.36} renk={g.govde} pos={[0, ayakH + 0.1, 0]} />
      {g.kenar && <Kutu w={g.w + 0.02} h={0.035} d={0.38} renk={g.kenar} pos={[0, ust - 0.02, 0]} golge={false} />}
      <Kutu w={g.w - 0.1} h={0.03} d={0.28} renk={KOZ} pos={[0, ust, 0]} golge={false} />
      <mesh position={[0, ust + 0.016, 0]}>
        <boxGeometry args={[g.w - 0.14, 0.004, 0.24]} />
        <meshStandardMaterial color={KOZ} emissive={KOZ} emissiveIntensity={g.koz} />
      </mesh>
      {xler.map((dx) => <Cezve key={dx} x={dx} z={0} y={ust + 0.01} renk={g.cezveRenk} />)}
      <Kopuk pisiyor={pisiyor} pos={[xler[0], ust + 0.23, 0]} />
    </group>
  );
}

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
export function KahveSeti({ ocak, hazir, pisiyor, seviye }: { ocak: Kat2Ocak; hazir: number; pisiyor: boolean; seviye: number }) {
  return (
    <group position={[ocak.x, FRONT_TOP_Y, TEZGAH_CZ]} scale={SET_OLCEK}>
      <Mangal g={MANGAL_SEVIYE[Math.min(Math.max(seviye, 1), MANGAL_SEVIYE.length) - 1]} pisiyor={pisiyor} />
      <ServisTepsisi />
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
      <MutfakOdasi level={kat2MutfakSeviyesi(padsDone)} areasOpen={BANT_YERLESIMI} aspiratorsuz adasiz zeminTema={KAT2_ZEMIN} />
      <OnTezgah />
    </group>
  );
}
