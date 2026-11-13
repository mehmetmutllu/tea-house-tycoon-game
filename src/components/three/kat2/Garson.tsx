/**
 * kat2/Garson.tsx — KAT 2 GARSONU, yalnız ÇİZİM. Figür Kat 1 garsonunun kendisi (`KayActor`
 * kind="waiter": aynı KayKit gövde, yeşil önlük, tepsi ELDE + `Holding_A` üst gövde — `Waiter.tsx`).
 * Tepside Kat 2'nin kahve fincanları (`Fincan`, ocakta ve masada aynı nesne).
 *
 * Konum `kat2Dunya.garson`dan TÜRER (mantık yürütür, kendi saati yok); görüntü damp'la izler ki
 * tick adımı kare kare titremesin. Yürüme/idle klibini `KayActor` gövdenin dünyadaki hızından seçer.
 * Garson yoksa (`garson === null`: pad'i açılmadı ya da config'te sayısı yok) çizilmez; ek garsonlar
 * (`garsonEk`, sayı > 1) aynı figürle.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { useGame } from '../../../game/store';
import type { Kat2Dunya, Kat2Garson as GarsonDurum } from '../../../game/kat2Dongu';
import { KAY_GARSON_TEPSI_KAYMA } from '../../../config/actor';
import { KayActor } from '../KayActor';
import { Fincan } from './parca';

/** Konum yumuşatma (1/sn) ve dönüş yumuşatma — Kat 1 `useActorTransform` ile aynı his. */
const KONUM_K = 12;
const DONUS_K = 9;
/** Bu kadardan uzun sıçrama ışınlanmadır (kat girişi, dev enjeksiyonu): kaymadan yerine oturur. */
const ISINLANMA = 3;

function Tepsi({ adet }: { adet: number }) {
  if (adet <= 0) return null;
  const adim = 0.15;
  const w = Math.max(0.3, 0.12 + adet * adim);
  return (
    <group position={[0, 0.95, 0.4]}>
      <mesh castShadow>
        <boxGeometry args={[w, 0.04, 0.26]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      {Array.from({ length: adet }, (_, i) => (
        <Fincan key={i} pos={[(i - (adet - 1) / 2) * adim, 0.02, 0]} s={1.3} />
      ))}
    </group>
  );
}

const garsonu = (d: Kat2Dunya, i: number): GarsonDurum | null => (i === 0 ? d.garson : d.garsonEk?.[i - 1] ?? null);

function GarsonGovde({ i: no, tepsi }: { i: number; tepsi: number }) {
  const dis = useRef<Group>(null);
  const ic = useRef<Group>(null);
  const hazir = useRef(false);
  const yon = useRef(0);
  useFrame((_, dt) => {
    const o = dis.current;
    const g = garsonu(useGame.getState().kat2Dunya, no);
    if (!o || !g) return;
    const dx = g.x - o.position.x;
    const dz = g.z - o.position.z;
    if (!hazir.current || Math.hypot(dx, dz) > ISINLANMA) {
      o.position.set(g.x, 0, g.z);
      hazir.current = true;
    } else {
      o.position.x = MathUtils.damp(o.position.x, g.x, KONUM_K, dt);
      o.position.z = MathUtils.damp(o.position.z, g.z, KONUM_K, dt);
      if (dx * dx + dz * dz > 1e-4) yon.current = Math.atan2(dx, dz);
    }
    const i = ic.current;
    if (!i) return;
    let t = yon.current;
    while (t - i.rotation.y > Math.PI) t -= Math.PI * 2;
    while (t - i.rotation.y < -Math.PI) t += Math.PI * 2;
    i.rotation.y = MathUtils.damp(i.rotation.y, t, DONUS_K, dt);
  });
  return (
    <group ref={dis} userData={{ k2npc: true }}>
      <group ref={ic}>
        <KayActor kind="waiter" tasiyor={tepsi > 0}>
          <group position={KAY_GARSON_TEPSI_KAYMA}>
            <Tepsi adet={tepsi} />
          </group>
        </KayActor>
      </group>
    </group>
  );
}

export function Kat2Garson() {
  // Ayrık abonelik: kaç garson + tepsilerinde kaç fincan (konum her kare değişir, React'e girmez).
  const anahtar = useGame((s) => (s.kat2Dunya.garson ? [s.kat2Dunya.garson, ...(s.kat2Dunya.garsonEk ?? [])].map((g) => g.tepsi).join(',') : ''));
  if (!anahtar) return null;
  return (
    <>
      {anahtar.split(',').map((t, i) => (
        <GarsonGovde key={i} i={i} tepsi={Number(t)} />
      ))}
    </>
  );
}
