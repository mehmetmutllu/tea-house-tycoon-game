/**
 * kat2/Bolme.tsx — SALONLAR ARASI BÖLMELER + geçitler (maket `Bolmeler`).
 * Bölme en az bir yanı açıksa çizilir; iki yanı açıksa geçit açık, değilse geçit tahta perdeli.
 *
 * D-190 (K2-S2, kullanıcı A'yı seçti — pano `docs/sprintler/kat2-S2/kareler/pano-bolme.png`): ALÇAK bölme
 * 1,2 (lambri + ince krem bant). Oyuncu ve masalar bölmenin arkasında da görünür, salonlar yine ayrı
 * okunur. Geçit dikmeleri 1,35'e kısaldı, lento yok. Çarpışma değişmedi: bölme `kat2Duvarlar`da katı.
 */
import { KAT2_BOLMELER } from '../../../game/kat';
import { PALETTE } from '../../../config/palette';
import { MaketTadilatPerde, MaketWall } from '../maketParts';

const BOY = 1.2;
const DIKME_H = 1.35;
type BolmeTanim = (typeof KAT2_BOLMELER)[number];

function Bolme({ b, acik }: { b: BolmeTanim; acik: boolean }) {
  const yatay = b.z1 === b.z2;
  const a0 = yatay ? Math.min(b.x1, b.x2) : Math.min(b.z1, b.z2);
  const a1 = yatay ? Math.max(b.x1, b.x2) : Math.max(b.z1, b.z2);
  const kapilar = [...b.kapilar].sort((p, q) => p[0] - q[0]);
  const parca: [number, number][] = [];
  let u = a0;
  for (const [ka, kb] of kapilar) {
    parca.push([u, ka]);
    u = kb;
  }
  parca.push([u, a1]);
  const P = (v: number) => (yatay ? ([v, b.z1] as const) : ([b.x1, v] as const));
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
            {/* kapalı salonun geçidi: tahta perde (kilitli obje = tadilat hâli) */}
            {!acik && <MaketTadilatPerde x1={-w / 2 + 0.11} x2={w / 2 - 0.11} z={0} h={DIKME_H - 0.05} />}
          </group>
        );
      })}
    </group>
  );
}

export function Bolmeler({ acikAlan }: { acikAlan: number }) {
  return (
    <group>
      {KAT2_BOLMELER.map((b, i) => {
        const [a1, a2] = b.alanlar;
        if (a1 >= acikAlan && a2 >= acikAlan) return null;
        return <Bolme key={i} b={b} acik={a1 < acikAlan && a2 < acikAlan} />;
      })}
    </group>
  );
}
