import { useRef } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import { useGame } from '../../game/store';
import { useActorTransform } from './actorTransform';
import { PALETTE } from '../../config/palette';
import { trayCapacityFor } from '../../config/economy.config';
import { KAY_TEPSI_KAYMA } from '../../config/actor';
import { KayActor } from './KayActor';
import { tepsiGorunum, type TepsiGorunum } from '../../config/kozmetik';
import { gecerliKiyafet, gecerliTepsi } from '../../game/vitrin';
import { Fincan } from './kat2/parca';

/** Askılı tepsinin halkası tabanın bu kadar üstünde — tepsi elden bu kadar aşağı sarkar (F4c). */
export const ASKI_HALKA_Y = 0.5;

/**
 * Tepsinin ELE göre çapası (S16 `KAY_TEPSI_KAYMA`). Askılı tepsi halkasından tutulur: taban halka
 * yüksekliği kadar aşağıda sarkar. Oyun ve karakter paneli AYNI fonksiyondan okur.
 */
export function tepsiKaymasi(tepsi: string): [number, number, number] {
  if (tepsiGorunum(tepsi).tip !== 'aski') return KAY_TEPSI_KAYMA;
  return [KAY_TEPSI_KAYMA[0], KAY_TEPSI_KAYMA[1] - ASKI_HALKA_Y, KAY_TEPSI_KAYMA[2]];
}

/** Askılı tepsi tek elde, kol yanda taşınır (`ASKI_KOL`). Oyun ve karakter paneli aynı sorudan okur. */
export const tepsiTekEl = (tepsi: string): boolean => tepsiGorunum(tepsi).tip === 'aski';

const metalMat = { metalness: 0.55, roughness: 0.35 } as const;

/** Askı kolu: tabanın kenarından (açı a, yarıçap r) halkaya uzanan çubuk. */
function askiKolu(a: number, rx: number, rz: number) {
  const alt = new Vector3(Math.cos(a) * rx, 0.02, Math.sin(a) * rz);
  const ust = new Vector3(0, ASKI_HALKA_Y, 0);
  const donus = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), ust.clone().sub(alt).normalize());
  return { orta: alt.clone().lerp(ust, 0.5), donus, boy: alt.distanceTo(ust) };
}

/**
 * TEPSİ TABANI (F4c 💎 vitrini). Ölçü ızgaradan gelir (kapasite kadar büyür); yuvarlak tepsiler
 * ızgaranın kutusuna oturan ovale çizilir. Askılı tepsi üç kolla halkaya bağlanır ve elden ASILI taşınır.
 */
function TepsiTabani({ g, w, d, cx, cz }: { g: TepsiGorunum; w: number; d: number; cx: number; cz: number }) {
  const m = g.metal ? metalMat : {};
  if (g.tip === 'kutu') {
    return (
      <mesh castShadow position={[cx, 0, cz]}>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color={g.renk} {...m} />
      </mesh>
    );
  }
  // Yuvarlak tepsi ızgaranın kutusuna OVAL oturur: daire ızgaradan derin kalıp gövdeye giriyordu
  // (F4c karesi — tepsinin arka yarısı karnın içindeydi). Kalınlık ölçeklenmesin diye yalnız z.
  const r = w / 2 + 0.01;
  const oz = (d / 2 + 0.01) / r;
  const kollar = g.tip === 'aski' ? [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI / 2) : [];
  return (
    <group position={[cx, 0, cz]}>
      <group scale={[1, 1, oz]}>
        <mesh castShadow>
          <cylinderGeometry args={[r, r * 0.93, 0.03, 24]} />
          <meshStandardMaterial color={g.renk} {...m} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.016, 6, 28]} />
          <meshStandardMaterial color={g.kenar ?? g.renk} {...metalMat} />
        </mesh>
        {g.desen &&
          Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * (r - 0.05), 0.017, Math.sin(a) * (r - 0.05)]} rotation={[0, a + Math.PI / 4, 0]}>
                <boxGeometry args={[0.045, 0.005, 0.045]} />
                <meshStandardMaterial color={g.desen} />
              </mesh>
            );
          })}
      </group>
      {kollar.map((a) => {
        const k = askiKolu(a, r, r * oz);
        return (
          <mesh key={a} position={k.orta} quaternion={k.donus}>
            <cylinderGeometry args={[0.008, 0.008, k.boy, 6]} />
            <meshStandardMaterial color={g.renk} {...metalMat} />
          </mesh>
        );
      })}
      {g.tip === 'aski' && (
        <mesh position={[0, ASKI_HALKA_Y, 0]}>
          <torusGeometry args={[0.06, 0.012, 6, 16]} />
          <meshStandardMaterial color={g.renk} {...metalMat} />
        </mesh>
      )}
    </group>
  );
}

/** Dolu çay bardağı: klasikte düz silindir, vitrin tepsilerinde ince belli + tabak. */
function CayBardagi({ g, position }: { g: TepsiGorunum; position: [number, number, number] }) {
  const cay = { color: '#c0392b', roughness: 0.5, emissive: '#7a1f17', emissiveIntensity: 0.25 } as const;
  if (!g.belli) {
    return (
      <mesh castShadow position={[position[0], 0.1, position[2]]}>
        <cylinderGeometry args={[0.05, 0.04, 0.14, 8]} />
        <meshStandardMaterial {...cay} />
      </mesh>
    );
  }
  return (
    <group position={[position[0], 0.02, position[2]]}>
      {g.tabak && (
        <mesh position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.07, 0.06, 0.014, 12]} />
          <meshStandardMaterial color={g.tabak} {...(g.tabak === g.kenar ? metalMat : {})} />
        </mesh>
      )}
      <mesh castShadow position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.034, 0.041, 0.06, 10]} />
        <meshStandardMaterial {...cay} />
      </mesh>
      <mesh castShadow position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.049, 0.034, 0.08, 10]} />
        <meshStandardMaterial {...cay} />
      </mesh>
      {g.kenar && (
        <mesh position={[0, 0.155, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.048, 0.006, 5, 14]} />
          <meshStandardMaterial color={g.kenar} {...metalMat} />
        </mesh>
      )}
    </group>
  );
}

// Çaycı karakter v2 (2026-06-11 kullanıcı isteği: "kollar bacaklar falan güzel olsun"): PARÇALI
// gövde (Faz 6 animasyon iskeletine hazırlık — her uzuv ayrı mesh). AYRI bacaklar + ayakkabılar,
// iki simetrik kol (gömlek kollu + ten rengi eller, tepsiye uzanır), gözler + burun.
// Kasket + krem gömlek + bordo önlük + bıyık; flat low-poly (D-013).
// EXPORT: karakter paneli (v20) mini Canvas'ta aynı gövdeyi 3/4 açıdan gösterir.
const SHOE = '#2e2a26';
export function OwnerBody() {
  return (
    <group>
      {/* bacaklar + ayakkabılar (ayrı uzuvlar) */}
      {[-0.11, 0.11].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.24, 0]}>
            <capsuleGeometry args={[0.085, 0.24, 4, 8]} />
            <meshStandardMaterial color={PALETTE.pants} />
          </mesh>
          <mesh castShadow position={[0, 0.05, 0.04]}>
            <boxGeometry args={[0.15, 0.09, 0.27]} />
            <meshStandardMaterial color={SHOE} />
          </mesh>
        </group>
      ))}
      {/* kalça (pantolon üstü) */}
      <mesh castShadow position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.24, 0.26, 0.18, 12]} />
        <meshStandardMaterial color={PALETTE.pants} />
      </mesh>
      {/* gömlek gövde + omuz hattı */}
      <mesh castShadow position={[0, 0.67, 0]}>
        <cylinderGeometry args={[0.27, 0.24, 0.32, 12]} />
        <meshStandardMaterial color={PALETTE.shirt} />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.29, 0.27, 0.12, 12]} />
        <meshStandardMaterial color={PALETTE.shirt} />
      </mesh>
      {/* önlük (göğüsten dize) + bel bağı */}
      <mesh castShadow position={[0, 0.55, 0.235]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color={PALETTE.apron} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.255, 0.255, 0.05, 12]} />
        <meshStandardMaterial color={PALETTE.apron} />
      </mesh>
      {/* kollar: omuzdan ÖNE-YUKARI tepsiye uzanır; uçta ten rengi eller (tepsi kenarlarını tutar) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.3, 0.86, 0.04]} rotation={[-1.9, 0, s * -0.12]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.065, 0.26, 4, 8]} />
            <meshStandardMaterial color={PALETTE.shirt} />
          </mesh>
          <mesh castShadow position={[0, -0.33, 0]}>
            <sphereGeometry args={[0.072, 10, 8]} />
            <meshStandardMaterial color={PALETTE.skin} />
          </mesh>
        </group>
      ))}
      {/* baş + yüz (gözler, burun, bıyık) */}
      <mesh castShadow position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.21, 14, 12]} />
        <meshStandardMaterial color={PALETTE.skin} />
      </mesh>
      {[-0.072, 0.072].map((x) => (
        <mesh key={x} position={[x, 1.115, 0.185]}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color="#2b2118" />
        </mesh>
      ))}
      <mesh position={[0, 1.07, 0.205]}>
        <sphereGeometry args={[0.032, 8, 6]} />
        <meshStandardMaterial color="#d49a55" />
      </mesh>
      <mesh position={[0, 1.018, 0.183]}>
        <boxGeometry args={[0.16, 0.045, 0.04]} />
        <meshStandardMaterial color={PALETTE.mustache} />
      </mesh>
      {/* kasket: tepe + öne vizör */}
      <mesh castShadow position={[0, 1.24, 0]}>
        <cylinderGeometry args={[0.2, 0.23, 0.1, 12]} />
        <meshStandardMaterial color={PALETTE.cap} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0.2]}>
        <boxGeometry args={[0.3, 0.03, 0.18]} />
        <meshStandardMaterial color={PALETTE.cap} />
      </mesh>
    </group>
  );
}

// Bardakları ellerin ÖNÜNDEKİ tek tepside 3×2 ızgaraya dizer (Faz 2f): max 6 bardak taşmaz,
// Tek ön tepsi, PAYLAŞIMLI kapasite: önce temiz çaylar (kırmızı), sonra kirliler (gri) ardışık dizilir →
// karışık taşımada üst üste binmez (tea + dirty aynı ızgarayı sırayla paylaşır). count 0 ise hiçbir şey çizilmez.
// cap (v20): tepsi TABANI kapasiteyle büyür (karakter yükseltmesinin gözle görülür ödülü).
// EXPORT: karakter paneli canlı tepsi önizlemesi aynı bileşeni kullanır.
export function CupTray({
  tea,
  dirty,
  food = 0,
  dirtyFood = 0,
  cap = 6,
  gorunum = 'klasik',
  kahve = 0,
}: {
  tea: number;
  dirty: number;
  food?: number;
  /** Kirli TABAK (tost bulaşığı; turu-5 m.11 — bardak değil yayvan tabak çizilir). */
  dirtyFood?: number;
  cap?: number;
  /** 💎 vitrini tepsi kimliği (F4c) — yalnız sahibin tepsisi; garson/panel klasikte kalır. */
  gorunum?: string;
  /** K2-3b: Kat 2'nin Türk kahvesi (fincan) — ızgaranın başına dizilir. Kat 1'de hep 0. */
  kahve?: number;
}) {
  const g = tepsiGorunum(gorunum);
  const total = kahve + tea + food + dirty + dirtyFood;
  if (total <= 0) return null;
  const colSpacing = 0.16;
  const rowSpacing = 0.15;
  const cols = Math.min(Math.max(cap, total, 1), 3);
  const rows = Math.ceil(Math.min(Math.max(cap, total, 1), 6) / 3);
  return (
    <group position={[0, 1.0, 0.45]}>
      {/* tepsi tabanı (kapasitenin ızgarasını taşıyacak boyut; ızgaranın gerçek merkezine oturur) */}
      <TepsiTabani
        g={g}
        w={cols * colSpacing + 0.1}
        d={rows * rowSpacing + 0.14}
        cx={((cols - 1) / 2 - 1) * colSpacing}
        cz={((rows - 1) / 2 - 0.5) * rowSpacing}
      />
      {Array.from({ length: total }).map((_, k) => {
        // Sıra: (Kat 2 kahvesi) → çaylar (kırmızı) → tostlar (kızarmış dilim, M3) → kirli bardaklar (gri) →
        // kirli tabaklar (yayvan disk); aynı ızgara paylaşılır.
        const i = k - kahve;
        if (i < 0) {
          return <Fincan key={k} pos={[((k % 3) - 1) * colSpacing, 0.03, (Math.floor(k / 3) - 0.5) * rowSpacing]} s={1.35} />;
        }
        const isFood = i >= tea && i < tea + food;
        const isDirty = i >= tea + food && i < tea + food + dirty;
        const isDirtyPlate = i >= tea + food + dirty;
        const col = k % 3; // 0..2 → x: -1,0,1
        const row = Math.floor(k / 3); // 0..1 → z: arka/ön
        const px = (col - 1) * colSpacing;
        const pz = (row - 0.5) * rowSpacing;
        if (isFood) {
          return (
            <mesh key={k} castShadow position={[px, 0.06, pz]}>
              <boxGeometry args={[0.14, 0.05, 0.11]} />
              <meshStandardMaterial color={PALETTE.toast} roughness={0.7} />
            </mesh>
          );
        }
        if (isDirtyPlate) {
          // Kirli tabak: yayvan disk + üstünde kırıntı (bardak silüetinden net ayrışır).
          return (
            <group key={k} position={[px, 0.05, pz]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.075, 0.06, 0.03, 10]} />
                <meshStandardMaterial color="#b3a896" roughness={0.9} />
              </mesh>
              <mesh position={[0.015, 0.025, 0.01]}>
                <boxGeometry args={[0.05, 0.02, 0.04]} />
                <meshStandardMaterial color={PALETTE.toastDark} roughness={0.9} />
              </mesh>
            </group>
          );
        }
        if (!isDirty) return <CayBardagi key={k} g={g} position={[px, 0, pz]} />;
        return (
          <mesh key={k} castShadow position={[px, 0.1, pz]}>
            <cylinderGeometry args={[0.05, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8d8276" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

// Oyuncunun anlık x/z'si (modül seviyesinde sabit fonksiyon → useActorTransform'un bağımlılığı değişmez).
function readPlayerXZ(): readonly [number, number] {
  const p = useGame.getState().player;
  return [p[0], p[2]] as const;
}

// (WP5: baş üstü radial KALDIRILDI — tek dolum göstergesi = dünya-içi pad halkası; feedback §D18.)

// Sahip karakteri (primitive çaycı = nihai stil, D-013). Taşıma tek ön tepside
// (karışık taşıma → çakışmaz).
export function Player() {
  const tray = useGame((s) => s.tray);
  const trayFood = useGame((s) => s.trayFood);
  const carriedDirty = useGame((s) => s.carriedDirty);
  const carriedDirtyFood = useGame((s) => s.carriedDirtyFood);
  const trayTier = useGame((s) => s.charUpgrades.tray);
  const kiyafet = useGame(gecerliKiyafet);
  const tepsi = useGame(gecerliTepsi);
  // K2-3b: Kat 2'de tepsi Kat 2'nin kahvesini taşır; Kat 1'in tepsisi (yukarıda kalan) çizilmez.
  const kat2 = useGame((s) => s.kat === 2);
  const kahve = useGame((s) => (s.kat === 2 ? s.kat2Dunya.tepsi : 0));
  const outerRef = useRef<Group>(null);
  const ref = useRef<Group>(null);
  /** Elinde bir şey var mı: temiz ürün ya da toplanmış kirli. Taşıma pozunu bu tetikler. */
  const eldeVar = kat2 ? kahve > 0 : tray + trayFood + carriedDirty + carriedDirtyFood > 0;
  // P0 perf: oyuncu konumu store'dan her karede OKUNUR, React'e prop olarak girmez — eskiden
  // `useGame((s) => s.player)` yürürken her kare Player alt ağacını yeniden render ediyordu.
  useActorTransform(outerRef, ref, readPlayerXZ);
  return (
    <group ref={outerRef}>
      {/* S14/D-112: gövde artık KayKit karakteri — kendi ölçeğini `KayActor` taşır (iskelet
          sabit, gövdeler aynı ölçekte). Tepsi gövdenin ÖLÇEĞİNİN DIŞINDA: bardaklar dünya
          ölçüsünde yazılı (yarıçap 0,05 = 5 cm) ve gövde ölçeğine bağlanırsa onunla büyür.
          `KAY_TEPSI_KAYMA` CupTray'in kendi çapasını KayKit elinin yerine taşır. */}
      <group ref={ref}>
        {/* S16: tepsi artık ELE takılı — `KayActor` çapayı her kare iki `handslot` kemiğinin
            ortasından alır ve taşırken üst gövde `Holding_A`ya geçer. Eskiden tepsi gövdenin
            yanında SABİT bir noktadaydı ve kollar boşta sallanıyordu (ölçüm: çapa y 0,953,
            eller 0,66 — tepsi ellerin 29 cm üstünde, göğse yapışık). */}
        <KayActor kind="owner" kiyafet={kiyafet} tasiyor={eldeVar} tekEl={tepsiTekEl(tepsi)}>
          <group position={tepsiKaymasi(tepsi)}>
            <CupTray
              tea={kat2 ? 0 : tray}
              food={kat2 ? 0 : trayFood}
              dirty={kat2 ? 0 : carriedDirty}
              dirtyFood={kat2 ? 0 : carriedDirtyFood}
              kahve={kahve}
              cap={trayCapacityFor(trayTier)}
              gorunum={tepsi}
            />
          </group>
        </KayActor>
      </group>
    </group>
  );
}
