import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from 'three';
import { PALETTE } from '../../config/palette';
import { useGame } from '../../game/store';
import { MAX_AREAS } from '../../config/economy.config';
import { BAHCE, ZEMIN_YARI, bitkiler, cimAlanlari, cimTonu, citDirekleri, citParcalari } from './bahceLook';

/**
 * Bahce.tsx — AÇILMAMIŞ HER YER (R4 · D-129). Ölçüler ve yerleşim `bahceLook.ts`te; burada
 * tek koordinat yok, yalnız çizim.
 *
 * Kullanıcı R4 karar paketinden C2'yi seçti ama kapsamını değiştirdi: *"alan olarak açmadığım
 * her yer öyle olsun, açtıklarım zaten oynanabilir olacak."* Bu yüzden bahçe `areasOpen`a
 * bağlı ve her şey `binaAyakIzi`nin tümleyeninden TÜRÜYOR — alan açılınca çim, çit ve bitkiler
 * birlikte geri çekilir, güncellenecek ikinci bir liste yok.
 *
 * ÜÇ ŞEY BİLEREK BÖYLE:
 *
 *  1. **Çim tek renk değil.** Bu turun kendi bulgusu, zeminin sapması 1,39 / 11 ayrık renkti ve
 *     "yapılmamış asset" hissinin sayısı oydu. Düz bir yeşil düzlem aynı kusuru yeşile boyardı;
 *     her çim parçası konumundan türeyen bir ton alıyor (`cimTonu`).
 *  2. **Çalı gölge DÖKMEZ, ağaç döker.** Gölge haritası ±30 ortografik ve bahçe onun kenarına
 *     kadar uzanıyor; yüzlerce küçük gövdeyi haritaya çizmenin görsel karşılığı yok. Ağaç
 *     gölgesi çimde okunuyor, çalınınki kendi gövdesinin altında kalıyor.
 *  3. **`frustumCulled={false}`.** Instans yığınının sınır küresi origin'de kalır; uzak salona
 *     odaklanınca bütün batch toptan kırpılırdı (floorPattern/Tables/WallPanels ile aynı sınıf
 *     hata, üçünde de aynı çözümle kapandı).
 */

// Birim geometriler + BEYAZ materyal: gerçek renk per-instance (instanceColor diffuse ile
// çarpılır). Modül seviyesinde paylaşılır — her mount'ta yeniden kurulmaz.
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_CONE = new ConeGeometry(1, 1, 7);
const UNIT_BLOB = new IcosahedronGeometry(1, 0);

type Kutu = { x: number; y: number; z: number; w: number; h: number; d: number; renk: string };

function Yigin({
  geometri,
  parcalar,
  golge,
}: {
  geometri: BoxGeometry | ConeGeometry | IcosahedronGeometry;
  parcalar: Kutu[];
  golge: boolean;
}) {
  const material = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', flatShading: true }), []);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || parcalar.length === 0) return;
    const d = new Object3D();
    const c = new Color();
    for (let i = 0; i < parcalar.length; i++) {
      const p = parcalar[i];
      d.position.set(p.x, p.y, p.z);
      d.scale.set(p.w, p.h, p.d);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.set(p.renk));
    }
    mesh.count = parcalar.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [parcalar]);

  if (parcalar.length === 0) return null;
  return (
    <instancedMesh
      key={parcalar.length}
      ref={ref}
      args={[geometri, material, parcalar.length]}
      castShadow={golge}
      receiveShadow
      frustumCulled={false}
    />
  );
}

/** Rengi çarpanla tonla — `Color` her çağrıda yeniden kurulmaz diye modül seviyesinde tek örnek. */
const _ton = new Color();
const tonla = (renk: string, k: number): string => '#' + _ton.set(renk).multiplyScalar(k).getHexString();

/**
 * `binaTam`: Kat 2'nin dışarısı (`kat2/Dis`) — Kat 2 binanın TAM ayak izinin üstünde durur; bahçe Kat 1'in açılmamış
 * alanlarına ağaç dikerse 3,2'den uzun ağaçlar Kat 2'nin zemininden taşar. Orada bahçe hep "bina tam" hâliyle çizilir.
 */
export function Bahce({ binaTam = false }: { binaTam?: boolean } = {}) {
  const kat1Alan = useGame((s) => s.areasOpen);
  const areasOpen = binaTam ? MAX_AREAS : kat1Alan;

  const cim = useMemo(() => cimAlanlari(areasOpen), [areasOpen]);

  const { govdeler, yapraklar, calilar } = useMemo(() => {
    const govdeler: Kutu[] = [];
    const yapraklar: Kutu[] = [];
    const calilar: Kutu[] = [];
    for (const b of bitkiler(areasOpen)) {
      if (b.tur === 'cali') {
        calilar.push({
          x: b.x,
          y: b.boy * 0.78,
          z: b.z,
          w: b.boy,
          h: b.boy,
          d: b.boy,
          renk: tonla(PALETTE.plantAlt, b.ton),
        });
        continue;
      }
      const govdeH = b.boy * 0.42;
      govdeler.push({ x: b.x, y: govdeH / 2, z: b.z, w: 0.34, h: govdeH, d: 0.34, renk: PALETTE.planter });
      // İki koni: alttaki geniş, üstteki dar — tek koni "yeşil külah" gibi duruyordu.
      yapraklar.push({
        x: b.x,
        y: govdeH + b.boy * 0.3,
        z: b.z,
        w: 1.25,
        h: b.boy * 0.6,
        d: 1.25,
        renk: tonla(PALETTE.plant, b.ton),
      });
      yapraklar.push({
        x: b.x,
        y: govdeH + b.boy * 0.62,
        z: b.z,
        w: 0.95,
        h: b.boy * 0.5,
        d: 0.95,
        renk: tonla(PALETTE.plantAlt, b.ton),
      });
    }
    return { govdeler, yapraklar, calilar };
  }, [areasOpen]);

  // Çit arsanın kenarında ve `areasOpen`dan bağımsız: arsa büyümüyor, bina onun İÇİNDE büyüyor.
  const cit = useMemo(() => {
    const out: Kutu[] = [];
    for (const k of citParcalari())
      for (const y of [0.3, 0.68])
        out.push({ x: k.x, y, z: k.z, w: k.w, h: BAHCE.citKorkuluk, d: k.d, renk: PALETTE.fenceWood });
    for (const d of citDirekleri())
      out.push({
        x: d.x,
        y: BAHCE.citBoy / 2,
        z: d.z,
        w: BAHCE.citDirek,
        h: BAHCE.citBoy,
        d: BAHCE.citDirek,
        renk: PALETTE.fenceWood,
      });
    return out;
  }, []);

  return (
    <group>
      {cim.map((r, i) => (
        <mesh
          key={`${i}-${r.minX}-${r.minZ}`}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(r.minX + r.maxX) / 2, BAHCE.cimY, (r.minZ + r.maxZ) / 2]}
        >
          <planeGeometry args={[r.maxX - r.minX, r.maxZ - r.minZ]} />
          <meshStandardMaterial color={tonla(PALETTE.lawn, cimTonu(r))} />
        </mesh>
      ))}
      <Yigin geometri={UNIT_BOX} parcalar={govdeler} golge />
      <Yigin geometri={UNIT_CONE} parcalar={yapraklar} golge />
      <Yigin geometri={UNIT_BLOB} parcalar={calilar} golge={false} />
      <Yigin geometri={UNIT_BOX} parcalar={cit} golge />
    </group>
  );
}

/** Bahçenin dış sınırı — duman testi ve bekçi aynı sayıyı okusun diye yeniden dışa veriliyor. */
export { ZEMIN_YARI };
