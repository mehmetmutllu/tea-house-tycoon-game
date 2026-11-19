import { useCallback, useRef } from 'react';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { useActorTransform } from './actorTransform';
import { PALETTE } from '../../config/palette';
import { KAY_GARSON_TEPSI_KAYMA } from '../../config/actor';
import { KayActor } from './KayActor';
import { CarriedDirty } from './carriedDirty';

/**
 * Garson tepsisi (Y3: kapasite yükseltilebilir → taşınan HER birim çizilir; baş üstü değil elde).
 * B2: tepsi KARIŞIK olabilir — tek servis noktası hem çay hem tost verdiği için bir garson ikisini
 * birden taşıyabilir (çaylar solda, tostlar sağda; genişlik toplam adetle büyür).
 */
function WaiterTray({ tea, food }: { tea: number; food: number }) {
  const count = tea + food;
  if (count <= 0) return null;
  const w = Math.max(0.3, 0.14 + count * 0.13); // tepsi taşınan adetle genişler
  return (
    <group position={[0, 0.95, 0.4]}>
      <mesh castShadow>
        <boxGeometry args={[w, 0.04, 0.24]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      {Array.from({ length: count }, (_, i) => {
        const x = (i - (count - 1) / 2) * 0.13;
        return i < tea ? (
          <mesh key={i} position={[x, 0.1, 0]}>
            <cylinderGeometry args={[0.045, 0.036, 0.13, 8]} />
            <meshStandardMaterial color="#c0392b" emissive="#7a1f17" emissiveIntensity={0.25} />
          </mesh>
        ) : (
          <mesh key={i} position={[x, 0.06, 0]}>
            <boxGeometry args={[0.11, 0.05, 0.12]} />
            <meshStandardMaterial color={PALETTE.toast} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

// Tek garson gövdesi (hook'lar per-unit kalsın diye ayrı bileşen).
// B2: "Tostçu Garson" kıyafeti (hardal önlük + beyaz kep) KALKTI — tek havuzda tür yok, hepsi
// aynı yeşil önlüklü çaycı. Ne taşıdığı tepsisinden okunur, üstünden değil.
function WaiterUnit({ index, tea, food, dirty, dirtyFood }: {
  index: number; tea: number; food: number; dirty: number; dirtyFood: number;
}) {
  const outerRef = useRef<Group>(null);
  const ref = useRef<Group>(null);
  // Konum store'dan HER KARE okunur ve doğrudan three'ye yazılır (React prop'u değil) — bkz.
  // useActorTransform açıklaması.
  const read = useCallback(() => {
    const w = useGame.getState().waiters[index];
    return w ? ([w.pos[0], w.pos[2]] as const) : null;
  }, [index]);
  useActorTransform(outerRef, ref, read);
  return (
    <group ref={outerRef}>
      {/* D-076: kapsül 0,55'teydi ve yarı-boyu 0,62'ydi → tabanı 0,07 zeminin ALTINDA kalıyordu.
          Artık merkez boyun tam yarısında: taban 0, tepe `AUTHORED_HEIGHT.waiter`. Mount ölçeği
          bunu 1,75'e taşır; yarıçap ölçekten SONRA 0,30 (kapsül enine şişmez, bkz. actor.ts). */}
      <group ref={ref}>
        {/* D-083: boşta kalan garson bulaşık toplar. Taşıdığı kirli, BULAŞIKÇIYLA AYNI çizimle
            görünür (`carriedDirty.tsx`) — elinde ne olduğu tepsisinden okunur. Ürün ile kirli
            AYNI ANDA taşınmaz: garson elinde kirli varken tezgâha yüklemeye gitmez, önce leğene
            boşaltır (tick.ts'teki yükleme dalının koşulu). Bu yüzden iki tepsi üst üste binmez.
            S16: tepsi ELE takılı, taşırken üst gövde `Holding_A` oynar. */}
        <KayActor kind="waiter" tasiyor={tea + food + dirty + dirtyFood > 0}>
          <group position={KAY_GARSON_TEPSI_KAYMA}>
            <WaiterTray tea={tea} food={food} />
            <CarriedDirty cups={dirty} plates={dirtyFood} />
          </group>
        </KayActor>
      </group>
    </group>
  );
}

// GARSON HAVUZU (B2: kat çapında, en çok MAX_WAITERS kişi). Greybox: yeşil önlüklü kapsül.
// Faz 6'da waiter.glb takılır.
export function Waiter() {
  // P0 perf: garson KONUMU React'e girmez (her kare değişir). Bu seçici yalnız AYRIK durumu okur:
  // kaç garson var + her birinin tepsisinde kaç çay/tost. Çıktı string → Zustand referansı değil
  // DEĞERİ karşılaştırır; tepsi değişmedikçe render yok.
  const key = useGame((s) =>
    s.waiters.map((w) => `${w.tray}.${w.trayFood}.${w.dirtyCarry ?? 0}.${w.dirtyCarryFood ?? 0}`).join(','),
  );
  const trays = key ? key.split(',') : [];
  return (
    <>
      {trays.map((t, i) => {
        const [tea, food, dirty, dirtyFood] = t.split('.').map(Number);
        return <WaiterUnit key={i} index={i} tea={tea} food={food} dirty={dirty} dirtyFood={dirtyFood} />;
      })}
    </>
  );
}
