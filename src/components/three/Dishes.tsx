import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, BoxGeometry, MeshStandardMaterial, Object3D, type Group, type InstancedMesh } from 'three';
import { useGame, LAYOUT, dirtyTables } from '../../game/store';
import { PALETTE } from '../../config/palette';

// FPS Tier 2 (2026-06-13): kirli kaplar InstancedMesh'e. Statik (dönüş/animasyon yok) → matris yalnız
// konum. Bardak 1 instanced mesh; TABAK 2 (disk + kırıntı, kırıntı d.pos'a göre sabit ofset). Görsel
// BİREBİR (aynı geo/mat, aynı dünya konumları). "Koku bulutu" DÜŞÜK sayıda (≤kirli masa) + saydam
// (sıralama) → olduğu gibi bırakıldı.
const CUP_GEO = new CylinderGeometry(0.06, 0.05, 0.16, 8);
const CUP_MAT = new MeshStandardMaterial({ color: '#8d8276', roughness: 0.9 });
const PLATE_GEO = new CylinderGeometry(0.11, 0.09, 0.03, 10);
const PLATE_MAT = new MeshStandardMaterial({ color: PALETTE.plateDirty, roughness: 0.9 });
const CRUMB_GEO = new BoxGeometry(0.05, 0.02, 0.04);
const CRUMB_MAT = new MeshStandardMaterial({ color: PALETTE.toastDark, roughness: 0.9 });
const DISH_CAP = 256; // kirli kap birikimi masa-eşikleriyle sınırlı; bol pay.

// Masalarda bekleyen kirli kaplar (Faz 2e + M3): çay = lekeli ince-belli bardak (gri-kahve silindir),
// tost = kirli TABAK (yayvan disk + kırıntı). Oyuncu/bulaşıkçı toplayınca kaybolur.
// P0 perf (2026-09-06): kap listesi useFrame'de `getState()` ile okunur (her kare yeni referans ->
// abonelik her kare render ederdi). JSX'in ihtiyaci olan tek turev "kirli masa" isareti; o da
// `dishes`in KIMLIGI degil ICERIGI degisince guncellenmeli -> ayri, kucuk bir secici kullanilir.
export function Dishes() {
  // Kirli masa esigini gecen masalarin imzasi (nadiren degisir) — secici ciktisi string oldugundan
  // referans degil DEGER karsilastirilir, ayni imzada render tetiklenmez.
  const dirtyKey = useGame((s) => [...dirtyTables(s.dishes, s.tableLevels)].join(','));
  const cupRef = useRef<InstancedMesh>(null);
  const discRef = useRef<InstancedMesh>(null);
  const crumbRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  // Kirli masalar (D-019): eşiği aşan masaların ÜSTÜNDE alçak primitive "koku" işareti.
  // Y2: eşik koltukla ölçeklenir → görsel işaret de mantıkla aynı imzayı kullanır.
  const dirty = useMemo(() => (dirtyKey ? dirtyKey.split(',').map(Number) : []), [dirtyKey]);
  useFrame(() => {
    const cup = cupRef.current;
    const disc = discRef.current;
    const crumb = crumbRef.current;
    if (!cup || !disc || !crumb) return;
    const dishes = useGame.getState().dishes;
    let nc = 0; // bardak sayısı
    let np = 0; // tabak sayısı (disk + kırıntı ortak)
    const total = Math.min(dishes.length, DISH_CAP);
    for (let i = 0; i < total; i++) {
      const d = dishes[i];
      if (d.kind === 'plate') {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.position.set(d.pos[0], d.pos[1], d.pos[2]);
        dummy.updateMatrix();
        disc.setMatrixAt(np, dummy.matrix);
        // kırıntı: eski grup-yerel ofset [0.03, 0.025, -0.02] (dönüş yok → düz toplama)
        dummy.position.set(d.pos[0] + 0.03, d.pos[1] + 0.025, d.pos[2] - 0.02);
        dummy.updateMatrix();
        crumb.setMatrixAt(np, dummy.matrix);
        np++;
      } else {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.position.set(d.pos[0], d.pos[1], d.pos[2]);
        dummy.updateMatrix();
        cup.setMatrixAt(nc, dummy.matrix);
        nc++;
      }
    }
    cup.count = nc;
    disc.count = np;
    crumb.count = np;
    cup.instanceMatrix.needsUpdate = true;
    disc.instanceMatrix.needsUpdate = true;
    crumb.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {/* bardak, tabak, kırıntı gölge DÖKMEZ — küçük prop (S4, `golgeKurali.ts`) */}
      <instancedMesh ref={cupRef} args={[CUP_GEO, CUP_MAT, DISH_CAP]} frustumCulled={false} />
      <instancedMesh ref={discRef} args={[PLATE_GEO, PLATE_MAT, DISH_CAP]} frustumCulled={false} />
      <instancedMesh ref={crumbRef} args={[CRUMB_GEO, CRUMB_MAT, DISH_CAP]} frustumCulled={false} />
      {dirty.map((i) => (
        <StinkCloud key={i} pos={LAYOUT.tables[i].table} />
      ))}
    </>
  );
}

// Kirli masa işareti (D-019): masanın hemen üstünde ALÇAK, primitive yeşilimsi "koku" bulutu
// (havada UI/rozet DEĞİL — sade obje işareti, feedback_interaction_model). Hafif yukarı-aşağı süzülür.
function StinkCloud({ pos }: { pos: readonly [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = 1.15 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
  });
  return (
    <group ref={ref} position={[pos[0], 1.15, pos[2]]}>
      {/* küçük yeşilimsi, yarı saydam kabarcıklar (koku) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#9ccc65" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0.12, 0.12, 0.04]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#aed581" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={[-0.1, 0.16, -0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#c5e1a5" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}
