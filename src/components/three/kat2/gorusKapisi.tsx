/**
 * kat2/gorusKapisi.tsx — KAT 2 GÖRÜNÜRLÜK KAPISI (tam test 2026-11-24, T1): kamerada ne gövdesi ne gölgesi
 * olabilecek masa/müşteri kare başına İŞ YAPMAZ. three'nin kendi kırpması yalnız ÇİZİMİ atlar; ağaç dolaşması,
 * kemik matrisleri ve animasyon dolu Kat 2'de (4.600 nesne, 2.200 kemik) yavaş cihazda kareyi uzatıyordu.
 * Kat 1 karşılığı: `Customers` `ANIM_KURE_R`. Yalnız görüntü — mantık `tick`te sürer.
 *
 * Kapı kamera hareket ettikten SONRA, çizimden ÖNCE koşar (`KAPI_ONCELIK` ∈ (0, 1); çizim `SahneCizimi` 1):
 * kırpma bu karenin kamerasıyla yapılır, kamera birden dönse de eksik kare olmaz.
 */
import { useMemo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Group, Matrix4, Sphere, type Camera } from 'three';
import { LIGHTING } from '../../../config/palette';
import { gorusKuresi } from './gorusKure';

export const KAPI_ONCELIK = 0.5;

const m = new Matrix4();
const frustum = new Frustum();
const kure = new Sphere();
let damga = -1;

/** `boy` yüksekliğinde, `yari` yatay yarıçaplı nesne ya da gölgesi bu karede kamerada olabilir mi. `an` = kare saati. */
export function gorusteMi(kamera: Camera, an: number, x: number, y: number, z: number, boy: number, yari: number): boolean {
  if (an !== damga) {
    damga = an;
    kamera.updateMatrixWorld();
    m.multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m);
  }
  const k = gorusKuresi(x, y, z, boy, yari, LIGHTING.sunPos);
  kure.center.set(k[0], k[1], k[2]);
  kure.radius = k[3];
  return frustum.intersectsSphere(kure);
}

/** Grubu gizliyken matris dolaşmasından çıkarır; yeniden görününce alt ağaç bir kez zorla tazelenir. */
export function gizliykenBedava<T extends Group>(g: T): T {
  let atlandi = false;
  g.updateMatrixWorld = function (force?: boolean) {
    if (!this.visible) {
      atlandi = true;
      return;
    }
    Group.prototype.updateMatrixWorld.call(this, force || atlandi);
    atlandi = false;
  };
  return g;
}

/** Alt ağacı kadraj dışındayken gizler ve matris dolaşmasını atlar. */
export function GorusKapisi({ x, z, boy, yari, children }: { x: number; z: number; boy: number; yari: number; children: ReactNode }) {
  const kok = useMemo(() => gizliykenBedava(new Group()), []);
  useFrame((st) => {
    kok.visible = gorusteMi(st.camera, st.clock.elapsedTime, x, 0, z, boy, yari);
  }, KAPI_ONCELIK);
  return <primitive object={kok}>{children}</primitive>;
}
