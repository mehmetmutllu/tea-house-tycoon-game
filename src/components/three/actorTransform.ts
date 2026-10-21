import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import type { Group } from 'three';

/** Görüntünün kayarak izlediği sıçrama aralığı (br) ve kayma süresi (sn). */
const ITME_EN_AZ = 0.8;
const ITME_EN_COK = 3;
const ITME_SN = 0.25;

/**
 * P0 perf (2026-09-06): yürüyen karakterin KONUMU React'ten çıkarıldı. Eskiden konum prop'tu
 * (`<group position={[x, 0, z]}>`) → store'daki konum her karede değiştiğinden bileşen ve
 * altındaki bütün mesh'ler her kare yeniden render ediliyordu (ölçüm: kare başına 3,2 React
 * commit). Artık hem konum hem yön doğrudan three nesnesine yazılır; React yalnız AYRIK
 * değişimlerde (tepsi adedi, kademe, personelin var/yok olması) çalışır.
 *
 * `read()` her karede store'dan güncel konumu döndürür (null → aktör yok, dokunma).
 * Dönüş matematiği useFacing ile BİREBİR aynı.
 */
export function useActorTransform(
  outerRef: React.RefObject<Group | null>,
  ref: React.RefObject<Group | null>,
  read: () => readonly [number, number] | null,
  lambda = 9,
) {
  const last = useRef<[number, number] | null>(null);
  const target = useRef(0);
  const kayma = useRef<{ x: number; z: number; t: number } | null>(null);
  useFrame((_, dt) => {
    const o = outerRef.current;
    if (!o) return;
    const p = read();
    if (!p) return;
    const [x, z] = p;
    const g = ref.current;
    if (last.current) {
      const dx = x - last.current[0];
      const dz = z - last.current[1];
      const adim = Math.hypot(dx, dz);
      // İTME (masa pad'i oyuncunun durduğu yerde açılır, tick onu masanın dışına koyar): mantık
      // konumu tek karede ~1,4 br sıçrar. Görüntü ışınlanmaz, eski yerinden KAYAR; yürüyüş bir
      // karede en çok ~0,5 br gider, ışınlanma (__teleport, doğum) ise ITME_EN_COK'tan uzaktır.
      if (adim > ITME_EN_AZ && adim < ITME_EN_COK) {
        const v = kayma.current ? o.position : { x: last.current[0], z: last.current[1] };
        kayma.current = { x: v.x, z: v.z, t: 0 };
      } else if (!kayma.current && dx * dx + dz * dz > 1e-5) target.current = Math.atan2(dx, dz);
    }
    last.current = [x, z];
    const k = kayma.current;
    if (k) {
      k.t += dt / ITME_SN;
      const e = 1 - (1 - Math.min(k.t, 1)) ** 3;
      o.position.set(k.x + (x - k.x) * e, 0, k.z + (z - k.z) * e);
      if (k.t >= 1) kayma.current = null;
    } else o.position.set(x, 0, z);
    if (!g) return;
    let t = target.current;
    while (t - g.rotation.y > Math.PI) t -= Math.PI * 2;
    while (t - g.rotation.y < -Math.PI) t += Math.PI * 2;
    g.rotation.y = MathUtils.damp(g.rotation.y, t, lambda, dt);
  });
}
