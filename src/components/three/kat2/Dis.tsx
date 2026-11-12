/**
 * kat2/Dis.tsx — ARKA DUVARIN ÜSTÜ (gözlem: Kat 2 varış kadrajında arka duvarın üstü koyu boşluk;
 * Kat 1'de aynı yerde bahçe görünüyor). Kat 2 Kat 1'in 3,2 üstünde: duvarın üstünden bakan göz
 * dışarıyı YUKARIDAN görmeli.
 *
 * GÖSTER-SEÇ (`?k2gorsel=dis:X`):
 *  A · bahçe — Kat 1'in kendi bahçesi 3,2 aşağıda (çim + ağaç tepeleri): aynı dünya, üst kattan
 *  B · komşu çatılar — arka sokağın kiremit çatılı evleri (mahalle kahvesi hissi)
 *  C · ahşap kalkan — duvar üstünde binanın ahşap kaplı çatı kalkanı + kiriş uçları (iç mekân kapanır)
 *  D · açık gök — geometri yok; Kat 2'deyken boşluğun rengi koyu lacivert yerine açık gök tonu
 *      (kamera 45° aşağı bakar: duvarın üstünden geçen bakış hiçbir şeye çarpmaz, rengi görür)
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import { Bahce } from '../Bahce';
import { BAND, FLOOR_HALF } from '../../../game/layout';
import { WALL_H } from '../wallOlcu';
import { PALETTE } from '../../../config/palette';
import { K2_GORSEL, type DisAday } from './gorselSecim';
import { Kutu } from './parca';

const ARKA_Z = BAND.back - 0.5; // dış duvar hattı (Kat2.Duvarlar ile aynı kural)
const KAT = 3.2;

function BahceAsagida() {
  return (
    <group position={[0, -KAT, 0]}>
      {/* bahçenin ötesi de çim (arsanın dışı koyu kalmasın) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, ARKA_Z - 40]} receiveShadow>
        <planeGeometry args={[160, 80]} />
        <meshStandardMaterial color={PALETTE.plantAlt} />
      </mesh>
      <Bahce />
    </group>
  );
}

const SIVA = ['#e8d9bf', '#d9c3a0', '#efe3cf', '#cdb89a', '#e3cfae', '#d6c7b0'];
const KIREMIT = ['#b5532f', '#a4472a', '#c0603a'];

function Ev({ x, z, w, d, h, i }: { x: number; z: number; w: number; d: number; h: number; i: number }) {
  const cati = 1.3 + (i % 3) * 0.3;
  const pencere = Math.max(1, Math.floor(w / 2.2));
  return (
    <group position={[x, -KAT, z]}>
      <Kutu w={w} h={h} d={d} renk={SIVA[i % SIVA.length]} pos={[0, h / 2, 0]} />
      {/* beşik çatı: dört kenarlı koni = kırma çatı (low-poly, tek mesh) */}
      <mesh position={[0, h + cati / 2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w * 0.74, 1, d * 0.74]} castShadow>
        <cylinderGeometry args={[0.05, 1, cati, 4]} />
        <meshStandardMaterial color={KIREMIT[i % KIREMIT.length]} flatShading />
      </mesh>
      {/* pencere sırası */}
      {Array.from({ length: pencere }, (_, k) => (
        <Kutu key={k} w={0.7} h={0.9} d={0.05} renk="#5e7d93" pos={[(k - (pencere - 1) / 2) * 2.2, h - 1.6, d / 2 + 0.02]} golge={false} />
      ))}
    </group>
  );
}

function KomsuCatilar() {
  const evler = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    let x = -FLOOR_HALF - 14;
    let i = 0;
    while (x < FLOOR_HALF + 14) {
      const w = 5 + ((i * 37) % 4);
      // Komşular TEK katlı/alçak: damın tepesi bizim Kat 2 zemininin altında kalır → üstten görülür.
      out.push({ x: x + w / 2, z: ARKA_Z - 5.5 - (i % 2) * 1.2, w, d: 6, h: 2.6 + ((i * 53) % 3) * 0.5 });
      out.push({ x: x + w / 2 + 1.5, z: ARKA_Z - 13.5 - (i % 3) * 0.8, w: w + 0.5, d: 6, h: 3.4 + ((i * 29) % 3) * 0.5 });
      x += w + 0.4;
      i++;
    }
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -KAT - 0.02, ARKA_Z - 20]}>
        <planeGeometry args={[160, 45]} />
        <meshStandardMaterial color="#8d8a84" />
      </mesh>
      {evler.map((e, i) => (
        <Ev key={i} {...e} i={i} />
      ))}
    </group>
  );
}

function CatiKalkani() {
  const W = 2 * FLOOR_HALF + 1;
  const boy = 4.2;
  const tahta = Math.round(W / 0.55);
  return (
    <group position={[0, WALL_H, ARKA_Z - 0.02]}>
      {/* ahşap kaplama: dikey tahtalar, boşluğu tavana dek kapatır */}
      {Array.from({ length: tahta }, (_, k) => {
        const x = -W / 2 + (k + 0.5) * (W / tahta);
        const h = boy + 0.4 * Math.sin(k * 1.7) ** 2;
        return <Kutu key={k} w={W / tahta - 0.03} h={h} d={0.12} renk={['#7a5236', '#8a6242', '#6f4a30'][k % 3]} pos={[x, h / 2, 0]} golge={false} />;
      })}
      {/* duvar üstü kirişi + mertek uçları */}
      <Kutu w={W} h={0.24} d={0.4} renk="#4e3426" pos={[0, 0.1, 0.12]} />
      {Array.from({ length: 11 }, (_, k) => (
        <Kutu key={`m${k}`} w={0.22} h={0.22} d={0.6} renk="#4e3426" pos={[-15 + k * 3, 0.42, 0.3]} />
      ))}
      {/* çatı penceresi: koyu çerçeveli yuvarlak cam */}
      <mesh position={[0, 1.7, 0.08]}>
        <circleGeometry args={[0.75, 16]} />
        <meshStandardMaterial color="#4e3426" />
      </mesh>
      <mesh position={[0, 1.7, 0.09]}>
        <circleGeometry args={[0.58, 16]} />
        <meshStandardMaterial color={PALETTE.glass} emissive={PALETTE.glass} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

/** Açık gök tonu (Kat 1'in arka plan rengi yerine). Sis de aynı tona döner ki uzak bahçe kararmasın. */
const GOK = '#cfe3ee';

function AcikGok() {
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    const eskiArka = scene.background instanceof Color ? scene.background.clone() : null;
    const eskiSis = scene.fog?.color.clone();
    if (scene.background instanceof Color) scene.background.set(GOK);
    scene.fog?.color.set(GOK);
    return () => {
      if (eskiArka && scene.background instanceof Color) scene.background.copy(eskiArka);
      if (eskiSis) scene.fog?.color.copy(eskiSis);
    };
  }, [scene]);
  return null;
}

export function ArkaDuvarUstu({ aday = K2_GORSEL.dis }: { aday?: DisAday }) {
  if (aday === 'B') return <KomsuCatilar />;
  if (aday === 'C') return <CatiKalkani />;
  if (aday === 'D') return <AcikGok />;
  return <BahceAsagida />;
}
