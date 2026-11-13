/**
 * Kasa — D-185: Kat 1'in kasası, garson istasyonunun sol başında (servis tezgâhının ucu). Oyuncu
 * Kat 2'deyken Kat 1'in parası buraya birikir; kasanın açık gözündeki sikke yığını doluluğa göre
 * yükselir, dolunca hafifçe zıplar (aşağı çağırır). Zeminde, durulacak yerde sade düz halka (kasada
 * para varken). Boşalınca sikkeler oyuncuya uçar — Kat 1 para toplama dili.
 *
 * Low-poly ilkel (KayKit'te kasa yok): pirinç kutu + ahşap taban + düz sikke silindirleri.
 * Durum `getState()` ile useFrame'de okunur: kasa her karede değişebilir, bileşen yeniden çizilmez.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, MathUtils, MeshStandardMaterial, Object3D, type Group, type InstancedMesh, type Mesh } from 'three';
import { useGame, WAITER_STATION, waiterStationOpen } from '../../game/store';
import { merdivenTamirli } from '../../game/kat';
import { KASA_YER, kasaDoluluk, kasaSiniriOlcumden } from '../../game/kasa';
import { economyConfig } from '../../config/economy.config';
import { PALETTE } from '../../config/palette';
import { FRONT_TOP_Y } from './kitchenLook';

/** Tablanın üstü (garson istasyonu eşyaları bu yüksekliğe oturur). */
const TABLA_Y = FRONT_TOP_Y - 0.08;
/** Kasa tablanın ön kenarında, sürahilerin önünde (sürahiler istasyonun z +0,05'inde). */
const KASA_Z = WAITER_STATION.pos[2] + 0.33;
/** Kasa tabla eşyalarından bir tık iri: kamera yüksekte, gözdeki yığın okunsun. */
const OLCEK = 1.3;
/** Gözdeki sikke sütunları (2 × 3) ve sütun başına en çok sikke. */
const SUTUN: readonly [number, number][] = [[-0.1, -0.05], [0, -0.05], [0.1, -0.05], [-0.1, 0.05], [0, 0.05], [0.1, 0.05]];
const SUTUN_MAX = 5;
const SIKKE_H = 0.026;
const UCAN = 8;
const UCUS_SN = 0.55;

const SIKKE_GEO = new CylinderGeometry(0.045, 0.045, SIKKE_H * 0.9, 10);
const SIKKE_MAT = new MeshStandardMaterial({ color: '#ffd700', metalness: 0.7, roughness: 0.25, flatShading: true });
const UCAN_GEO = new CylinderGeometry(0.16, 0.16, 0.05, 12);

export function Kasa() {
  const acik = useGame((s) => merdivenTamirli(s.kat2) && waiterStationOpen(s.areasOpen));
  const govde = useRef<Group>(null);
  const yigin = useRef<InstancedMesh>(null);
  const halka = useRef<Mesh>(null);
  const ucan = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const an = useRef({ dolu: 0, onceki: 0, ucusT: -1, zip: 0 });

  useFrame((_, dtHam) => {
    const dt = Math.min(dtHam, 0.1);
    const s = useGame.getState();
    const a = an.current;
    const tutar = s.kasa.toNumber();
    const hedef = tutar > 0 ? Math.max(0.06, kasaDoluluk(s.kasa, kasaSiniriOlcumden(s.kasaOlcum, economyConfig.kasa))) : 0;
    // Kasa Kat 1'de boşaldı → sikkeler oyuncuya uçar.
    if (a.onceki > 0 && tutar === 0 && s.kat === 1) a.ucusT = 0;
    a.onceki = tutar;
    a.dolu = MathUtils.damp(a.dolu, hedef, 6, dt);

    const m = yigin.current;
    if (m) {
      const toplam = a.dolu * SUTUN.length * SUTUN_MAX;
      let n = 0;
      SUTUN.forEach(([x, z], i) => {
        const adet = Math.min(SUTUN_MAX, Math.max(0, Math.round(toplam - i * SUTUN_MAX)));
        for (let k = 0; k < adet; k++) {
          dummy.position.set(x, 0.05 + (k + 0.5) * SIKKE_H, z);
          dummy.rotation.set(0, (i * 7 + k) * 0.6, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          m.setMatrixAt(n++, dummy.matrix);
        }
      });
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }

    // Dolu kasa hafifçe zıplar (aşağı çağırır); doluyken de boşken de sakin.
    const g = govde.current;
    if (g) {
      a.zip = hedef >= 1 ? a.zip + dt : 0;
      const z = hedef >= 1 ? Math.abs(Math.sin(a.zip * 5)) * 0.05 : 0;
      g.position.y = MathUtils.damp(g.position.y, TABLA_Y + z, 12, dt);
    }
    if (halka.current) {
      halka.current.visible = tutar > 0;
      const t = performance.now() / 1000;
      halka.current.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
    }

    const u = ucan.current;
    if (u) {
      if (a.ucusT < 0) { u.count = 0; return; }
      a.ucusT += dt;
      const p = Math.min(1, a.ucusT / UCUS_SN);
      const [px, , pz] = s.player;
      for (let i = 0; i < UCAN; i++) {
        const q = MathUtils.clamp(p * 1.4 - i * 0.05, 0, 1);
        const e = 1 - (1 - q) * (1 - q);
        dummy.position.set(
          MathUtils.lerp(KASA_YER[0] + (i % 3 - 1) * 0.12, px, e),
          TABLA_Y + 0.2 + Math.sin(q * Math.PI) * 1.2,
          MathUtils.lerp(KASA_Z, pz, e),
        );
        dummy.rotation.set(Math.PI / 2, q * 9 + i, 0);
        dummy.scale.setScalar(q >= 1 ? 0 : 1 - q * 0.4);
        dummy.updateMatrix();
        u.setMatrixAt(i, dummy.matrix);
      }
      u.count = UCAN;
      u.instanceMatrix.needsUpdate = true;
      if (p >= 1) a.ucusT = -1;
    }
  });

  if (!acik) return null;
  return (
    <group>
      <group ref={govde} position={[KASA_YER[0], TABLA_Y, KASA_Z]} scale={OLCEK}>
        {/* ahşap taban */}
        <mesh castShadow position={[0, 0.025, 0]}>
          <boxGeometry args={[0.44, 0.05, 0.3]} />
          <meshStandardMaterial color={PALETTE.counterWood} flatShading />
        </mesh>
        {/* pirinç göz: dört alçak duvar, içi açık — sikke yığını görünsün */}
        {([[0, -0.135, 0.42, 0.03], [0, 0.135, 0.42, 0.03], [-0.205, 0, 0.03, 0.3], [0.205, 0, 0.03, 0.3]] as const).map(([x, z, w, d]) => (
          <mesh key={`${x}:${z}`} castShadow position={[x, 0.1, z]}>
            <boxGeometry args={[w, 0.1, d]} />
            <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.4} flatShading />
          </mesh>
        ))}
        {/* arka levha (kasa tuşluğu yerine sade pano) */}
        <mesh castShadow position={[0, 0.2, -0.13]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.36, 0.16, 0.04]} />
          <meshStandardMaterial color={PALETTE.copper} metalness={0.4} roughness={0.5} flatShading />
        </mesh>
        <instancedMesh ref={yigin} args={[SIKKE_GEO, SIKKE_MAT, SUTUN.length * SUTUN_MAX]} castShadow frustumCulled={false} />
      </group>
      {/* zeminde durulacak yer: sade düz halka (havada işaret yok) */}
      <mesh ref={halka} position={[KASA_YER[0], 0.02, KASA_YER[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[economyConfig.kasa.erisim - 0.12, economyConfig.kasa.erisim, 32]} />
        <meshBasicMaterial color={PALETTE.brass} transparent opacity={0.55} />
      </mesh>
      <instancedMesh ref={ucan} args={[UCAN_GEO, SIKKE_MAT, UCAN]} frustumCulled={false} />
    </group>
  );
}
