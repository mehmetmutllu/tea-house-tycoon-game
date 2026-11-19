import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import type { Vec3 } from '../../game/types';
import { KayTezgah } from './Kitchen';
import { SERVIS_SABIT_YERLER, onHatGovdeleri, servisIsareti, servisIsaretiVar } from './kitchenLook';
import { FRONT_TOP_Y } from './kitchenLook';
import { PALETTE } from '../../config/palette';
import { isCounter, sellsTost } from '../../game/world';

// Seviyeye göre semaver rengi (greybox görsel değişim).
const LEVEL_COLOR = ['#b08d57', '#c9a063', '#d4af37', '#e0b94a', '#ffd700', '#ffea00'];

// Semaver buharı (Faz 2f juice): tek bir buhar topu yükselip solar, döngüye girer.
function Puff({ baseY, phase }: { baseY: number; phase: number }) {
  const ref = useRef<Mesh>(null);
  const RANGE = 0.6;
  useFrame((st) => {
    const m = ref.current;
    if (!m) return;
    const t = (st.clock.elapsedTime * 0.5 + phase) % 1; // 0→1 döngü
    m.position.y = baseY + t * RANGE;
    m.position.x = Math.sin((t + phase) * Math.PI * 2) * 0.06;
    const s = 0.5 + t * 0.8;
    m.scale.setScalar(s);
    (m.material as MeshStandardMaterial).opacity = (1 - t) * 0.45;
  });
  return (
    <mesh ref={ref} position={[0, baseY, 0]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}

/**
 * TÜRK TOST MAKİNESİ (T8b · G-90 · D-143). Kullanıcı: *"şu an sanki kendi çizdiğin var gibi ve o da
 * kötü duruyor"*. KayKit'in dokuz paketinde, Kenney Food Kit'te ve Kenney Furniture Kit'te pres tipi
 * makine YOK (Furniture Kit'in `toaster`ı dikey ekmek kızartma makinesi) — Türk'e özgü obje kendi
 * ilkelimizden çizilir (çay bardağı gibi). Aday kartı: `docs/gorsel/ss/t8b-tost-aday.png` (D → E).
 *
 * Paslanmaz gövde + nervürlü alt plaka + 35° açık kapak + kalın siyah kol. `genis` (L6) ikinci presin
 * yerine plakayı genişletir: seviye bir kutu daha değil, makinenin kendisi büyür. Hazır tost
 * AÇIK PLAKANIN üstünde bekler (kapak kalkık, dilim içinde).
 */
function TostMakinesi({ genis, hazir }: { genis: boolean; hazir: number }) {
  const W = genis ? 0.9 : 0.56;
  const D = 0.46;
  const dilim = Math.min(hazir, genis ? 3 : 2);
  return (
    <group>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color={PALETTE.tostCelik} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.11, 0.01]}>
        <boxGeometry args={[W - 0.06, 0.02, 0.38]} />
        <meshStandardMaterial color={PALETTE.griddle} metalness={0.5} roughness={0.45} />
      </mesh>
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.125, i * 0.05]}>
          <boxGeometry args={[W - 0.1, 0.012, 0.018]} />
          <meshStandardMaterial color={PALETTE.tostKol} />
        </mesh>
      ))}
      {/* kapak: arka menteşeden açık */}
      <group position={[0, 0.12, -D / 2 + 0.03]} rotation={[-0.62, 0, 0]}>
        <mesh castShadow position={[0, 0.035, 0.21]}>
          <boxGeometry args={[W, 0.07, 0.42]} />
          <meshStandardMaterial color={PALETTE.tostCelik} metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh castShadow position={[0, 0.03, 0.46]}>
          <boxGeometry args={[W * 0.7, 0.035, 0.05]} />
          <meshStandardMaterial color={PALETTE.tostKol} />
        </mesh>
      </group>
      {/* çalışıyor ışığı */}
      <mesh position={[W / 2 - 0.07, 0.07, D / 2 + 0.005]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshStandardMaterial color="#e53935" emissive="#e53935" emissiveIntensity={0.6} />
      </mesh>
      {Array.from({ length: dilim }).map((_, i) => (
        <group key={i} position={[(i - (dilim - 1) / 2) * 0.24, 0.16, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.05, 0.18]} />
            <meshStandardMaterial color={PALETTE.toast} />
          </mesh>
          <mesh position={[0, 0.027, 0]}>
            <boxGeometry args={[0.2, 0.006, 0.03]} />
            <meshStandardMaterial color={PALETTE.toastDark} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * SERVİS NOKTASI (B2 — D-060): katın TEK üretim objesi. **Tek merdiven, iki kimlik** (plan §4):
 *   L0-L3  derme çatma ÇAY OCAĞI — tezgâh + semaver; semaver seviyeyle büyür/ısınır.
 *   L4+    TEZGÂH — gövde kaplanır (koyu tezgâh ahşabı + pirinç bant), arkaya cezve ocağı gelir.
 *          Obje YER DEĞİŞTİRMEZ, seviye SIFIRLANMAZ: aynı nokta kimlik değiştirir.
 *   L5+    TOST açılır — Türk tost makinesi + ekmek kasası (D-143); L6'da makinenin plakası genişler.
 *          Ayrı istasyon değil, aynı tezgâhın üst basamağı: tezgâhın sol ucu "tost yeri"dir (G-85 A).
 * Hazır ürünler tezgâhın sol yarısında: çay ÖN sırada (bardak), tost makinenin açık plakasında.
 * Faz 6'da .glb takılır; B3'te maket ölçeğinde arka banda taşınacak.
 */
export function ServicePoint({
  position,
  level = 0,
  readyTea = 0,
  readyTost = 0,
  areasOpen,
}: {
  position: Vec3;
  /** Ön hattın birleşik gövdesi açık-alan sayısından türer (`onHatGovdeleri`). */
  areasOpen: number;
  level?: number;
  /** Tezgâhta bekleyen hazır çay (D-011 hazır-kuyruk) — ön sırada bardak olarak çizilir. */
  readyTea?: number;
  /** Tezgâhta bekleyen hazır tost — arka sırada dilim olarak çizilir. */
  readyTost?: number;
}) {
  const bodyH = 0.7 + level * 0.12;
  const color = LEVEL_COLOR[Math.min(level, LEVEL_COLOR.length - 1)];
  const counter = isCounter(level); // L4: ocak → TEZGÂH
  const tost = sellsTost(level); // L5: tost açılır
  const govde = onHatGovdeleri(areasOpen).station;
  // R2/C2 (D-127): seviyenin BİÇİM işaretleri. Hangi basamakta neyin açıldığı `kitchenLook`ta;
  // burası yalnız çizer. Yerleşim tablanın serbest sağ ucunda (semaverin doğusu) ve sol ucunda.
  const tepsi = servisIsaretiVar('tepsi', level);
  const istif = servisIsaretiVar('bardakIstifi', level);
  const surahi = servisIsaretiVar('surahi', level);
  const ikinciSemaver = servisIsaretiVar('ikinciSemaver', level);
  const ikinciPres = servisIsaretiVar('ikinciPres', level);
  /** Konumlar `kitchenLook.SERVIS_ISARETLERI`ten — burada elle koordinat yazılmaz (bekçi aynı
   *  kaydı okuyor; ayrı yazılsaydı bir eşyayı kaydırmak bekçiyi hiç uyandırmazdı). */
  const yer = servisIsareti;
  const SEMAVER_X = SERVIS_SABIT_YERLER[0].x;
  return (
    <group position={[position[0], 0, position[2]]}>
      <group>
        {/* GÖVDE (S3): KayKit tezgâhı, eski kutunun TAM ölçüsüne çekilmiş (2,2 × 0,8, tabla 0,90).
            L4'ün kimlik değişimi gövdenin RENGİNDEN değil artık pirinç banttan okunur — model
            tek dokulu olduğu için seviye rengi yedeğe (greybox) kaldı. */}
        {/* S4: gövde ÖN HATTIN birleşik genişliğinden gelir (`onHatGovde`) — üç tezgâh tek
            banko okunsun diye komşusuyla arasındaki boşluğun ortasına kadar uzar. Collision
            kutusu DEĞİŞMEDİ; elle yazılı 2,2 × 0,8 de kalktı, ölçü kutudan türüyor. */}
        <KayTezgah
          model="kitchencounter_straight_A"
          w={govde.w}
          d={govde.d}
          dx={govde.dx}
          topY={FRONT_TOP_Y}
          fallback={
            <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
              <boxGeometry args={[2.2, 0.9, 0.8]} />
              <meshStandardMaterial color={counter ? PALETTE.counterWood : '#795548'} />
            </mesh>
          }
        />
        <group>
            {counter && (
              <>
                {/* pirinç bant (tezgâhın yüzünü "kafenin yüzü" yapan detay) */}
                <mesh position={[0, 0.86, 0.41]}>
                  <boxGeometry args={[2.2, 0.05, 0.03]} />
                  <meshStandardMaterial color={PALETTE.brass} metalness={0.7} roughness={0.3} />
                </mesh>
                {/* arka cezve ocağı (hazırlık tarafı — tezgâhın arkasına geçer) */}
                <group position={[-0.15, 0, -0.55]}>
                  <mesh castShadow position={[0, 0.35, 0]}>
                    <boxGeometry args={[0.9, 0.7, 0.35]} />
                    <meshStandardMaterial color={PALETTE.wainscot} />
                  </mesh>
                  <mesh position={[0, 0.72, 0]}>
                    <boxGeometry args={[0.86, 0.04, 0.31]} />
                    <meshStandardMaterial color={PALETTE.griddle} metalness={0.5} roughness={0.5} />
                  </mesh>
                </group>
              </>
            )}
            {/* Semaver tezgâhın SAĞ yanında; hazır ürünler sol yarıda (gövdeyle kesişmez).
                Konum `SERVIS_SABIT_YERLER` — çakışma denetimi semaveri de saymalı. */}
            <group position={[SEMAVER_X, 0, 0]}>
              <mesh castShadow position={[0, 0.9 + bodyH / 2, 0]}>
                <cylinderGeometry args={[0.28, 0.34, bodyH, 16]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh castShadow position={[0, 0.9 + bodyH + 0.12, 0]}>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
              </mesh>
              {/* musluk */}
              <mesh position={[0, 0.9 + bodyH * 0.4, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
                <meshStandardMaterial color="#5d4037" />
              </mesh>
              <Puff baseY={0.9 + bodyH + 0.28} phase={0} />
              <Puff baseY={0.9 + bodyH + 0.28} phase={0.5} />
            </group>

            {/* ---- R2/C2 (D-127): SEVİYENİN BİÇİM İŞARETLERİ ----
                Her basamakta tablaya renk DIŞI bir şey eklenir; seviye tek bir sinyale (semaverin
                rengine) bağlı kalmaz. Hepsi tablanın (yerel ±1,6 x · ±0,5 z) içinde ve birbirinin
                ayak izine girmeden yerleşir — ölçüden sonra kimse üst üste binmesin diye aralıkları
                `tests/mutfak-r2.test.ts` denetliyor. */}

            {/* L1 — SERVİS TEPSİSİ: ilk yükseltmenin işareti. Tabla üstünde, sağ uçta. Üstündeki iki beyaz
                bardak kaldırıldı (kullanıcı 2026-09-23: *"2 tane beyaz bardak gibi bir şey var o ne kaldır"*). */}
            {tepsi && (
              <group position={[yer('tepsi').x, 0.93, yer('tepsi').z]}>
                <mesh castShadow>
                  <boxGeometry args={[0.4, 0.03, 0.28]} />
                  <meshStandardMaterial color={PALETTE.brass} metalness={0.5} roughness={0.45} />
                </mesh>
              </group>
            )}

            {/* L2 — TEMİZ BARDAK İSTİFİ: üç bardak üst üste, kapasite hissi. */}
            {istif && (
              <group position={[yer('bardakIstifi').x, 0.93, yer('bardakIstifi').z]}>
                {[0, 1, 2].map((k) => (
                  <mesh key={k} position={[0, 0.05 + k * 0.08, 0]}>
                    <cylinderGeometry args={[0.07, 0.055, 0.1, 8]} />
                    <meshStandardMaterial color={PALETTE.plate} />
                  </mesh>
                ))}
              </group>
            )}

            {/* L3 — SÜRAHİ: tablanın arka sırasında, servis istasyonununkiyle aynı biçim. */}
            {surahi && (
              <group position={[yer('surahi').x, 0.9, yer('surahi').z]}>
                <mesh position={[0, 0.17, 0]}>
                  <cylinderGeometry args={[0.12, 0.14, 0.32, 10]} />
                  <meshStandardMaterial color={PALETTE.plate} />
                </mesh>
                <mesh position={[0, 0.36, 0]}>
                  <cylinderGeometry args={[0.055, 0.09, 0.06, 8]} />
                  <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.4} />
                </mesh>
              </group>
            )}

            {/* L6 — İKİNCİ SEMAVER (küçük): en pahalı basamağın işareti. Ölçüm L5→L6'da ayırt
                edilir sinyali 0 bulmuştu — iki renk dizisi de L5'te son üyesine varıyor.
                Sol uçta, tost sacının (x −1,05…−0,15) batısında. */}
            {ikinciSemaver && (
              <group position={[yer('ikinciSemaver').x, 0, yer('ikinciSemaver').z]}>
                <mesh castShadow position={[0, 0.9 + bodyH * 0.34, 0]}>
                  <cylinderGeometry args={[0.17, 0.2, bodyH * 0.68, 14]} />
                  <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0.9 + bodyH * 0.68 + 0.08, 0]}>
                  <sphereGeometry args={[0.11, 10, 10]} />
                  <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
                </mesh>
                <Puff baseY={0.9 + bodyH * 0.68 + 0.18} phase={0.75} />
              </group>
            )}

            {/* L5: TÜRK TOST MAKİNESİ (D-143) — tezgâhın SOL ucunda, ARKA sırada; eski sacın ayak izi
                (x −1,05…−0,15) içinde: tekli 0,56, L6'da geniş 0,90 = tam o aralık. */}
            {tost && (
              <group position={[-0.6, 0.91, -0.12]}>
                <TostMakinesi genis={ikinciPres} hazir={readyTost} />
                <Puff baseY={0.3} phase={0.25} />
              </group>
            )}
            {/* Ekmek kasası: arkadaki hazırlık modülünün üstünde (yalnız tost açıkken). */}
            {tost && (
              <group position={[SEMAVER_X, 0, -0.55]}>
                <mesh castShadow position={[0, 0.82, 0]}>
                  <boxGeometry args={[0.42, 0.2, 0.3]} />
                  <meshStandardMaterial color={PALETTE.breadCrate} />
                </mesh>
                {[-0.1, 0.04, 0.18].map((bx, i) => (
                  <mesh key={i} position={[bx - 0.04, 0.94, (i % 2) * 0.1 - 0.05]}>
                    <sphereGeometry args={[0.06, 8, 6]} />
                    <meshStandardMaterial color={PALETTE.bread} />
                  </mesh>
                ))}
              </group>
            )}

            {/* HAZIR ÇAY — ÖN sıra (oyuncunun aldığı yüz), en çok 4 bardak çizilir. */}
            {Array.from({ length: Math.min(readyTea, 4) }).map((_, i) => (
              <mesh key={`t${i}`} position={[-1.0 + i * 0.24, 0.96, 0.24]}>
                <cylinderGeometry args={[0.06, 0.05, 0.16, 8]} />
                <meshStandardMaterial color="#c0392b" emissive="#7a1f17" emissiveIntensity={0.25} />
              </mesh>
            ))}
        </group>
      </group>
    </group>
  );
}
