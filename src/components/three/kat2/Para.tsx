/**
 * kat2/Para.tsx — MASA ÖNÜNDEKİ PARA YIĞINI (`kat2Dunya.paralar`). Grup kalkınca masa ücreti +
 * kahve parası TEK yığın olarak masanın salona bakan önüne, YERE düşer (masada para görünmez —
 * kumar yok). Oyuncu mıknatıs yarıçapına girince toplanır: sikkeler oyuncuya uçar, başının
 * üstünde Kat 1'in "+para" yazısı (`.floater`) belirir. G-124 (kullanıcı 2026-11-21): yerde `autoCollectAfter` sn kalıp
 * KENDİLİĞİNDEN toplanan yığın uçmaz, yazı çıkmaz — yerinde sessizce söner; toplamı Kat 1'in TOPLU bildirimi söyler
 * (`store` → `autoCollectSum`). Ayrım `kat2Dongu`nun çıktısından OKUNUR, döngü değişmez (`otoToplandi`).
 *
 * Yığın = sikke kuleleri (D-187 para A: Kat 1'in sikkesi, 1-3 sütun üst üste). Boy miktarla büyür
 * (kademeli), düşerken zıplar. G-98 (oyun testi 2026-11-20: "silindir yığınlar çok büyük"): sikke Kat 1'in
 * yerdeki/uçan sikkesiyle BİREBİR aynı boyda (ölçek 1); yığının tavanı 3 sütun × en çok 5 sikke.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CylinderGeometry, MeshStandardMaterial, Object3D, type Group, type InstancedMesh } from 'three';
import { useGame } from '../../../game/store';
import { fmt } from '../../../game/decimal';
import { attractRadiusFor, economyConfig } from '../../../config/economy.config';
import type { ParaYigini } from '../../../game/kat2Dongu';

// Kat 1'in sikkesiyle aynı geometri/materyal (Coins.tsx) — iki katta para aynı görünür.
const SIKKE_GEO = new CylinderGeometry(0.22, 0.22, 0.06, 16); // = SIKKE_R
const SIKKE_MAT = new MeshStandardMaterial({ color: '#ffd700', metalness: 0.7, roughness: 0.25 });
const UCAN_EN_COK = 64;
/** G-98: sikke Kat 1'inkiyle aynı boyda (eski 1,35 yığını masanın yanında iri bir silindir gibi okutuyordu). */
export const YIGIN_OLCEK = 1;
/** Sikke yarıçapı ve kalınlığı (Kat 1 `Coins.COIN_GEO` ile aynı). */
export const SIKKE_R = 0.22;
const SIKKE_H = 0.062;

/** Elle toplama anında oyuncu mıknatıs yarıçapındaydı; tick ile efekt arasında yürüyebileceği pay (br). */
const MIKNATIS_PAY = 1;
/** Oto-toplanan yığının yerinde sönme süresi (sn). */
const SONME_SN = 0.35;

/**
 * G-124: kaybolan yığın OTO mu toplandı? `kat2Dongu` önce mıknatısa bakar, sonra yığının `yas`ını YERİNDE artırır ve
 * `otoTopla`yı aşanı çıkarır — yani çıkan yığının son `yas`ı ≥ `otoTopla` ⇔ oto. Yığın nesnesi bir yerde kopyalanmışsa
 * (`yas` bayat) yedek: oyuncu mıknatıs yarıçapının (pay ile) dışındaysa elle toplanmış olamaz.
 */
export function otoToplandi(
  p: { x: number; z: number; yas?: number },
  oyuncu: readonly number[],
  miknatis: number,
  otoTopla: number,
): boolean {
  if (otoTopla > 0 && (p.yas ?? 0) >= otoTopla) return true;
  return Math.hypot(oyuncu[0] - p.x, oyuncu[2] - p.z) > miknatis + MIKNATIS_PAY;
}

/** Yığının "kademesi" 1..4 — boy miktarla büyür ama sınırlı (yığın masayı ezmesin). */
export function kademe(miktar: number): number {
  return miktar < 90 ? 1 : miktar < 130 ? 2 : miktar < 180 ? 3 : 4;
}

/** Bir yığının sikke yerleri (yerel): sütun sayısı ve boyu kademeyle HAFİF büyür (tavan 3 sütun × 5 sikke). */
export function sikkeYerleri(k: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const sutun = [[0, 0], [0.22, 0.1], [-0.19, 0.13]].slice(0, Math.min(3, k));
  sutun.forEach(([x, z], i) => {
    const boy = Math.min(5, 1 + k) - i;
    for (let j = 0; j < boy; j++) out.push([x + ((j * 7) % 3) * 0.01, 0.03 + j * SIKKE_H, z, j * 0.7]);
  });
  return out;
}

function Sikkeler({ yerler }: { yerler: [number, number, number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    yerler.forEach(([x, y, z, a], i) => {
      d.position.set(x, y, z);
      d.rotation.set(0, a, 0);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.count = yerler.length;
    m.instanceMatrix.needsUpdate = true;
  }, [yerler]);
  return <instancedMesh key={yerler.length} ref={ref} args={[SIKKE_GEO, SIKKE_MAT, yerler.length]} castShadow receiveShadow />;
}

/** Tek yığın: yerine düşer (yukarıdan, sekerek), sonra hafif parlar. */
function Yigin({ x, z, miktar }: { x: number; z: number; miktar: number }) {
  const k = kademe(miktar);
  const yerler = useMemo(() => sikkeYerleri(k), [k]);
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    t.current = Math.min(1, t.current + dt * 2.6);
    const u = t.current;
    // düşüş + iki sekme
    const y = u < 0.55 ? 1.6 * (1 - (u / 0.55) ** 2) : 0.18 * Math.abs(Math.sin(((u - 0.55) / 0.45) * Math.PI * 2)) * (1 - u);
    g.position.y = y;
    g.rotation.y = Math.sin(st.clock.elapsedTime * 0.8 + x) * 0.08;
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={ref} position={[0, 1.6, 0]} scale={YIGIN_OLCEK}>
        <Sikkeler yerler={yerler} />
      </group>
    </group>
  );
}

/** Oto-toplama: yığın yerinde küçülüp söner (uçuş/yazı yok). */
function SonenYigin({ x, z, miktar, bitti }: { x: number; z: number; miktar: number; bitti: () => void }) {
  const yerler = useMemo(() => sikkeYerleri(kademe(miktar)), [miktar]);
  const ref = useRef<Group>(null);
  const t = useRef(0);
  const son = useRef(bitti);
  son.current = bitti;
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / SONME_SN);
    g.scale.setScalar(YIGIN_OLCEK * Math.max(0.001, 1 - t.current));
    if (t.current >= 1) son.current();
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={ref} scale={YIGIN_OLCEK}>
        <Sikkeler yerler={yerler} />
      </group>
    </group>
  );
}

/** Toplama anı: yığının sikkeleri oyuncuya uçar (yay çizer, küçülür). */
type Ucus = { x: number; z: number; t: number; n: number; tohum: number };

function UcanSikkeler({ ucuslar }: { ucuslar: MutableRefObject<Ucus[]> }) {
  const ref = useRef<InstancedMesh>(null);
  const d = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const p = useGame.getState().player;
    let n = 0;
    for (const u of ucuslar.current) {
      u.t += dt * 2.4;
      for (let i = 0; i < u.n && n < UCAN_EN_COK; i++) {
        const gec = Math.min(1, Math.max(0, u.t - i * 0.06));
        if (gec >= 1) continue;
        const a = u.tohum + i * 2.4;
        const sx = u.x + Math.cos(a) * 0.25;
        const sz = u.z + Math.sin(a) * 0.25;
        d.position.set(sx + (p[0] - sx) * gec, 0.2 + Math.sin(gec * Math.PI) * 1.4 + gec * 0.9, sz + (p[2] - sz) * gec);
        d.rotation.set(Math.PI / 2, gec * 9 + a, 0);
        d.scale.setScalar(1 - gec * 0.6);
        d.updateMatrix();
        m.setMatrixAt(n++, d.matrix);
      }
    }
    ucuslar.current = ucuslar.current.filter((u) => u.t < 1 + u.n * 0.06);
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[SIKKE_GEO, SIKKE_MAT, UCAN_EN_COK]} frustumCulled={false} />;
}

function Yazi({ x, z, deger, bitti }: { x: number; z: number; deger: number; bitti: () => void }) {
  const ref = useRef(bitti);
  ref.current = bitti;
  useEffect(() => {
    const t = setTimeout(() => ref.current(), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <group position={[x, 1.9, z]}>
      <Html center distanceFactor={9} pointerEvents="none" zIndexRange={[5, 0]}>
        <div className="floater">+{fmt(deger)}</div>
      </Html>
    </group>
  );
}

export function ParaYiginlari() {
  // Liste kimliği her tick değişir; abonelik yalnız yığın KÜMESİ değişince render eder.
  const anahtar = useGame((s) => s.kat2Dunya.paralar.map((p) => p.id).join(','));
  const paralar = useMemo(() => {
    void anahtar;
    return useGame.getState().kat2Dunya.paralar.map((p) => ({ ...p }));
  }, [anahtar]);
  // Store'daki yığın NESNESİNİN kendisi tutulur: `yas` döngüde yerinde artar, kaybolduğu anki son değeri ayrımı verir.
  const onceki = useRef(new Map<number, ParaYigini>());
  const ucuslar = useRef<Ucus[]>([]);
  const sira = useRef(0);
  const [yazilar, setYazilar] = useState<{ id: number; x: number; z: number; deger: number }[]>([]);
  const [sonenler, setSonenler] = useState<{ id: number; x: number; z: number; miktar: number }[]>([]);

  // Kat 2 katmanı gizlenince (Kat 1'e iniş, `Activity`) efektler sökülür; dönüşte yeniden bağlanan efektler
  // (ve store'un yetişen ilk render'ı) aradaki farkı toplanmış sanıp uçuş + yazı üretmesin: dönüşün ilk
  // anında yalnız yeni durum kaydedilir. Oyuncu merdivenden yeni çıktı — o anda gerçek toplama olmaz.
  const donus = useRef(false);
  useEffect(() => {
    const t = donus.current ? setTimeout(() => (donus.current = false), 250) : undefined;
    return () => {
      clearTimeout(t);
      donus.current = true;
    };
  }, []);
  useEffect(() => {
    const st = useGame.getState();
    const canli = () => new Map(st.kat2Dunya.paralar.map((p) => [p.id, p]));
    if (donus.current) {
      onceki.current = canli();
      return;
    }
    const simdi = new Set(paralar.map((p) => p.id));
    const pl = st.player;
    const miknatis = attractRadiusFor(st.charUpgrades.magnet);
    let toplam = 0;
    const sonen: { id: number; x: number; z: number; miktar: number }[] = [];
    for (const [id, p] of onceki.current) {
      if (simdi.has(id)) continue;
      if (otoToplandi(p, pl, miknatis, economyConfig.money.autoCollectAfter)) {
        sonen.push({ id: ++sira.current, x: p.x, z: p.z, miktar: p.miktar });
        continue;
      }
      toplam += p.miktar;
      ucuslar.current.push({ x: p.x, z: p.z, t: 0, n: 4 + kademe(p.miktar) * 2, tohum: id * 1.3 });
    }
    onceki.current = canli();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- store olayına (toplama) tepki; türetilebilir durum değil
    if (sonen.length) setSonenler((s) => [...s, ...sonen]);
    if (toplam > 0) {
      const id = ++sira.current;
      setYazilar((y) => [...y, { id, x: pl[0], z: pl[2], deger: toplam }]);
    }
  }, [paralar]);

  return (
    <group>
      {paralar.map((p) => (
        <Yigin key={p.id} x={p.x} z={p.z} miktar={p.miktar} />
      ))}
      {sonenler.map((y) => (
        <SonenYigin key={y.id} x={y.x} z={y.z} miktar={y.miktar} bitti={() => setSonenler((ys) => ys.filter((q) => q.id !== y.id))} />
      ))}
      <UcanSikkeler ucuslar={ucuslar} />
      {yazilar.map((y) => (
        <Yazi key={y.id} x={y.x} z={y.z} deger={y.deger} bitti={() => setYazilar((ys) => ys.filter((q) => q.id !== y.id))} />
      ))}
    </group>
  );
}
