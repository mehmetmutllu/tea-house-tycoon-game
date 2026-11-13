/**
 * maketParts.tsx — MAKET v13'ÜN PARÇALARININ BİREBİR TRANSKRİPSİYONU.
 *
 * Kullanıcı kararı (2026-09-07): *"maket artifactiyle birebir istiyorum … boyutlara kadar aynı
 * olmak zorunda"*. Bu dosyanın kuralı tek cümle: **`docs/maket/maket-v13.html`'deki fonksiyon ne
 * yazıyorsa o.** Ölçek çarpanı YOK, "kameraya sığsın diye" kısaltma YOK, yeniden kompozisyon YOK.
 * Bir sayı maketten farklıysa hemen yanında NEDEN farklı olduğu yazar ve sebebi ancak şunlardan
 * biri olabilir: (a) oyunun oynanışa bağlı bir koordinatı (pad/işaret yeri), (b) maketin kendi
 * dosyasında zaten parametre olan bir değer.
 *
 * NEDEN BU DOSYA VAR: B6b'nin ilk denemesinde maketin PROGRAMI alındı ama ölçüleri ×0,72 ile
 * küçültülüp 1,15'lik banda kırpıldı (kabin 2,00 → 1,00 · kapı 1,95 → 0,95 · ayna 1,75 → 0,88).
 * Sonuç kabin gibi değil kanat gibi okundu; kullanıcı reddetti ve iş geri alındı. Ders: maketten
 * TRANSKRİPSİYON yapılır, maketten esinlenilmez.
 *
 * MATERYAL: maket `MeshLambertMaterial` kullanıyor, oyun `meshStandardMaterial`. Renkler ve
 * `flatShading` birebir; materyal sınıfı oyunun ışık kurulumuyla (SceneLights) uyumlu kalsın diye
 * oyununki. Geometri segment sayıları maketin kendi önbelleğinden alındı (küre 10 × 8).
 */
import { BAND, BAND_SHELL, LAVABO, useGame } from '../../game/store';
import { Model } from './Model';
import {
  AYNA_GOZ, AYNA_S, AYNA_Y, AYNA_Z,
  KABIN_ADIM, KABIN_ARALIK_ACI, KABIN_BANT, KABIN_BOLME, KABIN_KAPI, KABIN_MENTESE_ORTA, KABIN_RAY_Y, KABIN_RENK, KABIN_X_OFSET,
  LAVABO_DUVAR_PAYI, LAVABO_DZ, LAVABO_GOZ, LAVABO_SCALE, kabinSayisi, lavaboSayisi, lavaboSlotOfset, wcSeviye,
} from './wcLook';
import { STEP_D, STEP_H, STEP_N } from './wallLook';

/** KayKit restaurant-bits kökü — `Kitchen.tsx` ile aynı yol. */
const KAY_REST = '/assets/models/kaykit-restaurant-bits/';
/** KayKit furniture-bits kökü — ayna oradan (`Decor.tsx` ile aynı yol). */
const KAY_FURN = '/assets/models/kaykit-furniture-bits/';

/** Maketin `C` paleti — yalnız bu dosyanın kullandığı girdiler, maketteki hex değerleriyle. */
const MC = {
  wallCream: '#e6d7b8',
  wain: '#6d4c41',
  doorWood: '#5d4037',
  floorTile: '#d9cdb4',
  brass: '#d4af37',
  board: '#2f3a33',
  boardFrame: '#4e342e',
  chalk: '#f3ecd9',
  plant: '#3f7d44',
  plant2: '#2f6b3a',
  planter: '#7a5230',
  sink: '#8d9499',
  wc1: '#d9cdb4',
  porcelain: '#f7f3ea',
  steel: '#b0bec5',
  mirror: '#cfe3ea',
  bin: '#546e7a',
  tableWood: '#9c6f4a',
  copper: '#b87333',
  cupTea: '#d98a3a',
} as const;

/**
 * ODA DUVARI = 2,2 (maketin `lavaboBlock` sabiti; kendi yorumu: *"ara duvarlar 2.2 — kamera içeri
 * görsün"*). BİNA duvarı 3,2 ve o artık bandın KABUĞU olarak `Scene.BackBand`'de çiziliyor —
 * bu dosyadaki odalar yalnız kendi ara duvarlarını çizer. (Eski `localStorage.maketShellH` A/B
 * kancası kalktı: bina duvarı D-073'le 3,2'de dondu, seçilecek bir şey kalmadı.)
 */
const ROOM_H = 2.2;

/** Maketin `wall(x1,z1,x2,z2,h)` fonksiyonu — gövde + lambri kuşağı + üst çıta, birebir. */
export function MaketWall({
  x1,
  z1,
  x2,
  z2,
  h,
}: {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  h: number;
}) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  return (
    <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, Math.atan2(dx, dz), 0]}>
      <mesh position={[0, 0.9 + (h - 0.9) / 2, 0]} receiveShadow>
        <boxGeometry args={[0.18, h - 0.9, len]} />
        <meshStandardMaterial color={MC.wallCream} />
      </mesh>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[0.22, 0.9, len]} />
        <meshStandardMaterial color={MC.wain} />
      </mesh>
      <mesh position={[0, 0.94, 0]} receiveShadow>
        <boxGeometry args={[0.26, 0.08, len]} />
        <meshStandardMaterial color={MC.doorWood} />
      </mesh>
    </group>
  );
}

/**
 * WC LAVABOSU — S6/G1: gövde KayKit'in GRİ musluklu modeli, ayna elle çizim olarak kalıyor.
 *
 * Kullanıcı 2026-09-10: *"lavabodaki musluklar var ya … pakette gri renkli hali var, onu kullan."*
 * Aday `kitchentable_sink` ADINDAN değil ATLAS GÖZÜNDEN seçildi (tek göz #828c91, doygunluk
 * 0,11 = gri); mutfaktaki `kitchencounter_sink` turuncu ahşap gövdeli olduğu için elendi.
 * Ölçü/ölçek/gerekçe `wcLook.ts`te — burada tek sayı yok.
 *
 * AYNA MODELDE YOK: paketin hiçbir lavabosunda ayna yok, elle çizim taşıyordu. O yüzden ayna
 * (çerçeve + cam) burada KALIYOR — model gelse de gelmese de duvarda duruyor.
 *
 * GREYBOX-FIRST: `.gltf` gelmezse `MaketSinkGovde` (maketin `sink()`'inin gövde/çanak/musluk
 * kısmı, birebir) çizilir; oynanış kodu ve yerleşim değişmez.
 */
export function MaketSink({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Model
        src={`${KAY_REST}kitchencounter_sink.gltf`}
        scale={LAVABO_SCALE}
        position={[0, 0, LAVABO_DZ]}
        esleme={LAVABO_GOZ}
        fallback={<MaketSinkGovde />}
      />
      {/* AYNA — pakette "mirror" modeli yok; `pictureframe_medium`in TUVALİ cam mavisine
          taşınıyor (gerekçe ve ölçü `wcLook.ts`te). Sırtı duvarın yüzünde. */}
      <Model
        src={`${KAY_FURN}pictureframe_medium.gltf`}
        scale={AYNA_S}
        position={[0, AYNA_Y, AYNA_Z]}
        esleme={AYNA_GOZ}
        fallback={<MaketAyna />}
      />
    </group>
  );
}

/**
 * KABİN KANADI (T7/D-141): düz laminat levha + kol + dolu/boş göstergesi. Menteşe grubunun
 * İÇİNDE çizilir (origin = menteşe), aralık kapı gerçek menteşeden döner. Ölçüler `wcLook`ta.
 */
function KabinKanadi({ dolu }: { dolu: boolean }) {
  const h = KABIN_BANT.ust - KABIN_BANT.alt;
  const kolX = KABIN_MENTESE_ORTA * 2 - 0.16;
  return (
    <group>
      <mesh castShadow position={[KABIN_MENTESE_ORTA, KABIN_BANT.alt + h / 2, 0]}>
        <boxGeometry args={[KABIN_KAPI.w, h, KABIN_KAPI.kalinlik]} />
        <meshStandardMaterial color={KABIN_RENK.laminat} />
      </mesh>
      <mesh position={[kolX, KABIN_KAPI.kolY, KABIN_KAPI.kalinlik / 2 + 0.03]}>
        <boxGeometry args={[0.16, 0.035, 0.035]} />
        <meshStandardMaterial color={KABIN_RENK.metal} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[kolX, KABIN_KAPI.kolY + 0.13, KABIN_KAPI.kalinlik / 2 + 0.012]}>
        <boxGeometry args={[0.09, 0.045, 0.02]} />
        <meshStandardMaterial color={dolu ? KABIN_RENK.dolu : KABIN_RENK.bos} emissive={dolu ? KABIN_RENK.dolu : KABIN_RENK.bos} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/** Maketin aynası — model yüklenmezse çizilen yedek (çerçeve + cam). */
function MaketAyna() {
  return (
    <group position={[0, AYNA_Y, AYNA_Z]}>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.9, 0.7, 0.04]} />
        <meshStandardMaterial color={MC.boardFrame} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[0.8, 0.6, 0.05]} />
        <meshStandardMaterial color={MC.mirror} />
      </mesh>
    </group>
  );
}

/** Maketin `sink()` gövdesi — model yüklenmezse çizilen yedek (ayna dışarıda, o hep çiziliyor). */
function MaketSinkGovde() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.3, 0.8, 0.6]} />
        <meshStandardMaterial color={MC.wc1} flatShading />
      </mesh>
      <mesh position={[0, 0.83, 0]}>
        <boxGeometry args={[1.36, 0.06, 0.66]} />
        <meshStandardMaterial color="#f1ece0" />
      </mesh>
      <mesh position={[0, 0.9, 0.04]} scale={[1.35, 1, 1]}>
        <cylinderGeometry args={[0.24, 0.19, 0.12, 12]} />
        <meshStandardMaterial color={MC.porcelain} flatShading />
      </mesh>
      <mesh position={[0, 0.98, -0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.22, 6]} />
        <meshStandardMaterial color={MC.steel} />
      </mesh>
      <mesh position={[0, 1.08, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.16, 6]} />
        <meshStandardMaterial color={MC.steel} />
      </mesh>
    </group>
  );
}

/** Maketin `wcSign()` — koyu plaka + çerçeve + iki beyaz figür. Birebir. */
export function MaketWcSign({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh>
        <boxGeometry args={[0.5, 0.34, 0.04]} />
        <meshStandardMaterial color={MC.board} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[0.54, 0.38, 0.03]} />
        <meshStandardMaterial color={MC.boardFrame} />
      </mesh>
      {[-0.1, 0.1].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 0.09, 0.03]}>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color={MC.chalk} />
          </mesh>
          {i ? (
            <mesh position={[x, -0.03, 0.03]}>
              <cylinderGeometry args={[0.03, 0.07, 0.14, 6]} />
              <meshStandardMaterial color={MC.chalk} flatShading />
            </mesh>
          ) : (
            <mesh position={[x, -0.03, 0.03]}>
              <boxGeometry args={[0.06, 0.14, 0.03]} />
              <meshStandardMaterial color={MC.chalk} />
            </mesh>
          )}
          <mesh position={[x - 0.015, -0.13, 0.03]}>
            <boxGeometry args={[0.02, 0.06, 0.02]} />
            <meshStandardMaterial color={MC.chalk} />
          </mesh>
          <mesh position={[x + 0.015, -0.13, 0.03]}>
            <boxGeometry args={[0.02, 0.06, 0.02]} />
            <meshStandardMaterial color={MC.chalk} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Maketin `plant(big)` — saksı + iki yaprak kümesi. Birebir. */
export function MaketPlant({ pos, big = false }: { pos: [number, number, number]; big?: boolean }) {
  const r = big ? 0.34 : 0.24;
  return (
    <group position={pos}>
      <mesh position={[0, big ? 0.25 : 0.18, 0]}>
        <cylinderGeometry args={[r, r * 0.78, big ? 0.5 : 0.36, 10]} />
        <meshStandardMaterial color={MC.planter} flatShading />
      </mesh>
      <mesh position={[0, big ? 0.85 : 0.6, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[big ? 0.46 : 0.32, 10, 8]} />
        <meshStandardMaterial color={MC.plant} flatShading />
      </mesh>
      <mesh position={[big ? 0.28 : 0.18, big ? 1.2 : 0.85, 0.1]}>
        <sphereGeometry args={[big ? 0.3 : 0.2, 10, 8]} />
        <meshStandardMaterial color={MC.plant2} flatShading />
      </mesh>
    </group>
  );
}

/**
 * Maketin `lavaboBlock(x1, x2, zBack, zFront, doorX)` — arka duvarda dört kabin, doğu duvarında
 * üç lavabo, ön duvarda tek kapı boşluğu; ara duvarlar 2,2 ("kamera içeri görür"), zemin fayans.
 * Maketin çağrısı: `lavaboBlock(4.6, 16.9, -16.87, -9.8, 13.2)`.
 *
 * OYUNA BAĞLI TEK FARK: `doorX` 13,2 değil **13,4** — kapı noktası aynı zamanda pad'in, yükseltme
 * noktasının ve müşterinin hedefi (`LAVABO.spot`) ve o x, masa 12'nin yükseltme noktasına 2,55 br
 * kalsın diye B4a'da ölçülerek seçilmişti. Geri kalan her sayı maketin.
 *
 * BM adım 3: **binanın kabuğu (arka + doğu duvarı, 3,2) ve merdiven kovasıyla ortak batı duvarı
 * artık burada çizilmiyor** — ikisi de bandın tamamına ait olduğu için `Scene.BackBand`'e taşındı
 * (lavabo kapalıyken de duruyorlar; eskiden kapalıyken kütle vardı, şimdi bina var). Bu fonksiyona
 * ODANIN KENDİSİ kaldı: ön duvar + kapı + kabinler + lavabolar + zemin.
 *
 * Odanın dikdörtgeni maketin sabitlerinden değil `BAND_SHELL`'in İÇ YÜZLERİNDEN türetilir: oyunun
 * dış duvarı kat kenarından 0,5 dışarıda durduğu için oda maketinkinden ~0,5 daha geniş/derin;
 * mobilya duvara yaslı kalsın diye ölçü duvardan okunur, maketten kopyalanmaz.
 */
/** `seviye`: verilirse store yerine bu seviye çizilir (Kat 2 lavabosu seviyesiz — D-192). */
export function MaketLavaboBlock({ seviye }: { seviye?: number } = {}) {
  // Oda yalnız pad bitince ÇİZİLİYOR; etkin seviye o yüzden `wcSeviye`den türer (gerekçe orada).
  const kat1 = useGame((st) => wcSeviye(st.lavaboLevel, st.padsDone.includes('lavabo')));
  const level = seviye ?? kat1;
  const H = ROOM_H; // maketin lavaboBlock'undaki sabit (2,2)
  const x1 = BAND.wc.minX; // 4,6 — maketle aynı
  const x2 = BAND_SHELL.innerRight; // doğu duvarının İÇ yüzü (maketin 16,9'unun oyundaki karşılığı)
  const zBack = BAND_SHELL.innerBack; // arka duvarın İÇ yüzü (maket −16,87)
  const zFront = BAND.front; // −9,8 — maketle aynı
  const doorX = LAVABO.door[0]; // 13,4 (oynanışa bağlı; maket 13,2)

  const p0 = x1 + KABIN_X_OFSET;
  const zp = zBack + 0.8;
  const zd = zBack + 1.6;

  // S7/L (G-36) — SEVİYE MEKÂNSAL OKUNUYOR: sayılar `wcLook`taki iki diziden gelir, buraya
  // sayı yazılmaz. Her yükseltme ikisinden TAM BİRİNİ büyütür, yani hiçbir seviye "ekranda
  // hiçbir şey değişmedi" bırakmaz. Gerekçe ve ölçüm: `docs/wc-odasi-raporu-s7.md` §L.
  const kabinN = kabinSayisi(level);
  const lavaboN = lavaboSayisi(level);

  return (
    <group>
      {/* ön duvar, kapı boşluğunun iki yanı + lento */}
      <MaketWall x1={x1} z1={zFront} x2={doorX - 0.7} z2={zFront} h={H} />
      <MaketWall x1={doorX + 0.7} z1={zFront} x2={x2} z2={zFront} h={H} />
      {/* LENTO ŞERİDİ — maketin kendi parçası. S6/②'de kaldırılmıştı (kullanıcı "üstteki şeridi
          kaldır" dedi) ama S6/③'te GERİ İSTENDİ: kaldırılması gereken şey bu değilmiş, kullanıcı
          kapının üstündeki SARI DAİRELERİ kastediyormuş (bkz. `LAVABO.coinSpot` istifi).
          Yanlış parçayı kaldırmışım; şerit geri geldi. */}
      <mesh position={[doorX, H - 0.06, zFront]}>
        <boxGeometry args={[1.6, 0.12, 0.3]} />
        <meshStandardMaterial color={MC.doorWood} />
      </mesh>

      {/* fayans zemin (maketin floorPatch'i: 0,2 kalınlığında kutu, üstü y'de) */}
      <mesh position={[(x1 + x2) / 2, 0.012 - 0.1, (zBack + zFront) / 2]}>
        <boxGeometry args={[x2 - x1 - 0.2, 0.2, zFront - zBack - 0.2]} />
        <meshStandardMaterial color="#cfd8dc" />
      </mesh>

      {/* KABİNLER (T7/D-141): bölme sayısı kabin + 1; bölmeler de kanat da yerden 0,16 açık,
          1,80'de biter; önlerini alüminyum ray bağlar. Sayı SEVİYEDEN gelir (S7/L). */}
      {Array.from({ length: kabinN + 1 }, (_, i) => (
        <group key={`p${i}`} position={[p0 + i * KABIN_ADIM, 0, zp]}>
          <mesh castShadow position={[0, (KABIN_BANT.alt + KABIN_BANT.ust) / 2, 0]}>
            <boxGeometry args={[KABIN_BOLME.kalinlik, KABIN_BANT.ust - KABIN_BANT.alt, KABIN_BOLME.derin]} />
            <meshStandardMaterial color={KABIN_RENK.bolme} />
          </mesh>
          <mesh position={[0, KABIN_BANT.alt / 2, KABIN_BOLME.derin / 2 - 0.08]}>
            <cylinderGeometry args={[0.025, 0.03, KABIN_BANT.alt, 8]} />
            <meshStandardMaterial color={KABIN_RENK.metal} metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {kabinN > 0 && (
        <mesh position={[p0 + (kabinN * KABIN_ADIM) / 2, KABIN_RAY_Y, zd + 0.02]}>
          <boxGeometry args={[kabinN * KABIN_ADIM + KABIN_BOLME.kalinlik, 0.05, 0.05]} />
          <meshStandardMaterial color={KABIN_RENK.metal} metalness={0.5} roughness={0.35} />
        </mesh>
      )}
      {Array.from({ length: kabinN }, (_, i) => {
        const cx = p0 + KABIN_ADIM / 2 + i * KABIN_ADIM;
        const ajar = i === Math.min(2, kabinN - 1); // maket: bir kapı aralık, içeride klozet görünür
        return (
          <group key={`c${i}`}>
            <group position={[cx - KABIN_MENTESE_ORTA, 0, zd]} rotation={[0, ajar ? KABIN_ARALIK_ACI : 0, 0]}>
              <KabinKanadi dolu={!ajar && i % 2 === 0} />
            </group>
            {ajar && (
              <group>
                <mesh position={[cx, 0.2, zBack + 0.65]}>
                  <cylinderGeometry args={[0.2, 0.16, 0.4, 10]} />
                  <meshStandardMaterial color={MC.porcelain} flatShading />
                </mesh>
                <mesh position={[cx, 0.6, zBack + 0.3]}>
                  <boxGeometry args={[0.4, 0.4, 0.18]} />
                  <meshStandardMaterial color={MC.porcelain} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      {/* doğu duvarı boyunca lavabolar — SAYI SEVİYEDEN (S7/L). Slotlar arka duvardan başlar ve
          bitişik dizilir (aralık = gövde eni): ölçüm eski 1,70'lik aralığın duvara yalnız dört
          tane sığdırdığını, öne eklenen beşincinin ise %0 görünür kaldığını gösterdi. */}
      {Array.from({ length: lavaboN }, (_, k) => (
        <group key={`s${k}`}>
          <MaketSink pos={[x2 - LAVABO_DUVAR_PAYI, 0, zBack + lavaboSlotOfset(k)]} rot={-Math.PI / 2} />
          {k === 1 && (
            <mesh position={[x2 - 1.0, 0.9, zBack + lavaboSlotOfset(k)]}>
              <cylinderGeometry args={[0.05, 0.05, 0.14, 8]} />
              <meshStandardMaterial color="#f1ece0" />
            </mesh>
          )}
        </group>
      ))}

      {/* çöp kovaları, levha, saksı */}
      <mesh position={[x2 - 1.2, 0.18, zBack + 0.7]}>
        <cylinderGeometry args={[0.14, 0.12, 0.36, 8]} />
        <meshStandardMaterial color={MC.bin} />
      </mesh>
      <mesh position={[doorX - 1.4, 0.18, zFront - 0.6]}>
        <cylinderGeometry args={[0.14, 0.12, 0.36, 8]} />
        <meshStandardMaterial color={MC.bin} />
      </mesh>
      <MaketWcSign pos={[doorX - 1.3, 1.85, zFront + 0.16]} />
      <MaketPlant pos={[doorX + 1.5, 0, zFront - 0.7]} />
    </group>
  );
}

/**
 * Maketin `rnd()` yerine SABİT sözde-rastgele: React her render'da yeniden çağırdığı için
 * `Math.random()` moloz taşlarını her karede zıplatırdı. Aynı index hep aynı sayıyı verir.
 */
function prnd(i: number, lo: number, hi: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return lo + (x - Math.floor(x)) * (hi - lo);
}


/**
 * Maketin `merdivenHarap()` — YIKIK MERDİVEN, birebir.
 *
 * Kullanıcı kuralı (D-057'nin obje hâli): kilitli ALAN çizilmez ama açık alandaki kilitli OBJE
 * **yıkık durur**. Maket burada bilerek tahta perde ÇEKMİYOR — kendi yorumu: *"perde orayı yeni
 * bir oda gibi gösteriyor; üst kat olduğu görünsün diye açık kalıyor."* Basamak tahtaları yer yer
 * eksik (2 · 5 · 9 · 12), her dördüncüsü kırık, korkuluktan üç dikme kalmış, basamaklarda moloz.
 *
 * Merdiven 2,90 yükselir; 1,2'lik eski bant bunu taşımıyordu (B6b raporunun 4. bulgusu) — duvar
 * 3,2'ye çıkınca bandın kabuğunun İÇİNDE kaldı.
 */
export function MaketMerdivenHarap({ pos }: { pos: [number, number, number] }) {
  const w = 4.6;
  const eksik = [2, 5, 9, 12];
  const L = STEP_N * STEP_D;
  return (
    <group position={pos}>
      {Array.from({ length: STEP_N }, (_, i) => {
        const kirik = i % 4 === 1;
        return (
          <group key={i}>
            <mesh position={[0, STEP_H / 2 + i * STEP_H, -STEP_D / 2 - i * STEP_D]} castShadow receiveShadow>
              <boxGeometry args={[w, STEP_H, STEP_D]} />
              <meshStandardMaterial color="#6d6155" flatShading />
            </mesh>
            {!eksik.includes(i) && (
              <mesh position={[kirik ? 0.7 : 0, (i + 1) * STEP_H - 0.0175, -STEP_D / 2 - i * STEP_D]} castShadow>
                <boxGeometry args={[w - (kirik ? 1.4 : 0), 0.035, STEP_D]} />
                <meshStandardMaterial color="#8a7b68" flatShading />
              </mesh>
            )}
          </group>
        );
      })}
      {/* sahanlık */}
      <mesh position={[0, 1.45, -L - 0.3]} castShadow receiveShadow>
        <boxGeometry args={[w, 2.9, 0.6]} />
        <meshStandardMaterial color="#6d6155" flatShading />
      </mesh>
      <mesh position={[0, 2.9 - 0.0175, -L - 0.3]} castShadow>
        <boxGeometry args={[w, 0.035, 0.6]} />
        <meshStandardMaterial color="#8a7b68" flatShading />
      </mesh>
      {/* kırık korkuluk: iki yanda üçer dikme kalmış */}
      {([-1, 1] as const).map((sgn) =>
        [0, 4, 11].map((k) => (
          <mesh
            key={`${sgn}-${k}`}
            position={[sgn * (w / 2 - 0.1), (k + 1) * STEP_H + 0.5, -STEP_D / 2 - k * STEP_D]}
            castShadow
          >
            <boxGeometry args={[0.08, 1.0, 0.08]} />
            <meshStandardMaterial color="#6b5442" />
          </mesh>
        )),
      )}
      {/* tek kalan küpeşte parçası (eğimi merdivenin eğimi) */}
      <mesh position={[-(w / 2 - 0.1), 1.35, -1.3]} rotation={[Math.atan2(2.9, L), 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.09, 3.2]} />
        <meshStandardMaterial color="#6b5442" />
      </mesh>
      {/* basamaklarda moloz */}
      {Array.from({ length: 11 }, (_, i) => {
        const st = Math.floor(prnd(i * 3 + 1, 0, STEP_N));
        return (
          <mesh
            key={`m${i}`}
            position={[prnd(i * 3 + 2, -1.9, 1.9), (st + 1) * STEP_H + 0.04, -STEP_D / 2 - st * STEP_D]}
            rotation={[0, prnd(i * 3 + 3, 0, 3), 0]}
            castShadow
          >
            <boxGeometry args={[prnd(i * 5 + 1, 0.14, 0.3), 0.06, prnd(i * 5 + 2, 0.12, 0.22)]} />
            <meshStandardMaterial color={i % 2 ? '#cfd8dc' : '#b0bec5'} />
          </mesh>
        );
      })}
      {/* dayalı kalas + kova */}
      <mesh position={[-1.5, 0.42, -1.5]} rotation={[Math.atan2(2.9, L), 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.07, 3.0]} />
        <meshStandardMaterial color="#8a7b68" flatShading />
      </mesh>
      <mesh position={[1.7, 0.16, -0.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.32, 8]} />
        <meshStandardMaterial color="#546e7a" flatShading />
      </mesh>
    </group>
  );
}

/** Maketin `duba()` — turuncu trafik dubası (taban + koni + beyaz bant). */
export function MaketDuba({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[0.44, 0.05, 0.44]} />
        <meshStandardMaterial color="#c0451a" />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.18, 0.64, 8]} />
        <meshStandardMaterial color="#e0611f" flatShading />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.1, 8]} />
        <meshStandardMaterial color="#f1ece0" />
      </mesh>
    </group>
  );
}

/**
 * Maketin `uyariSeridi(x1, x2, z)` — iki dikme arasına gerili sarı-siyah bant.
 * Tahta perde DEĞİL: arkası görünür kalır (merdivenin yıkık olduğu okunsun).
 */
export function MaketUyariSeridi({ x1, x2, z }: { x1: number; x2: number; z: number }) {
  const len = x2 - x1;
  const n = Math.max(1, Math.round(len / 0.5));
  const st = len / n;
  return (
    <group>
      {[x1, x2].map((x, i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.06, 8]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[0, 0.53, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.05, 6]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[0, 1.08, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#e0b13a" />
          </mesh>
        </group>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <group key={`b${i}`} position={[x1 + st / 2 + i * st, 0, z]}>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[st - 0.02, 0.13, 0.02]} />
            <meshStandardMaterial color={i % 2 ? '#e0b13a' : '#2f2a24'} />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[st - 0.02, 0.13, 0.02]} />
            <meshStandardMaterial color={i % 2 ? '#2f2a24' : '#e0b13a'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Kilitli OBJENİN önünde tahta perde (D-191 P3): bantsız tahta + ortada yuvarlak levha — levhadaki simge
 * arkada ne olduğunu söyler. Kural (maketin kendi yorumu): *"kilitli ALAN hiç çizilmez; açık alanın içindeki
 * kilitli obje tadilat hâlinde durur."* Sarı-siyah bant beğenilmedi (2026-11-13), kalktı.
 */
export type PerdeSimge = 'okey' | 'lavabo' | 'mutfak';

const LEVHA_ZEMIN = '#f1e6cc';
const SU = '#3d8fd1';
const CAY = '#b3322b';

/** Levha düzlemi XY'de (perde yüzü +z'ye bakar); simgeler levhanın önünde ince kabartma. */
function PerdeLevhasi({ r, simge }: { r: number; simge: PerdeSimge }) {
  const on = 0.06;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r + 0.05, r + 0.05, 0.03, 20]} />
        <meshStandardMaterial color={MC.doorWood} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
        <cylinderGeometry args={[r, r, 0.04, 20]} />
        <meshStandardMaterial color={LEVHA_ZEMIN} />
      </mesh>
      {simge === 'okey' && (
        <>
          <mesh position={[0, 0, on - 0.015]}>
            <boxGeometry args={[r * 0.75, r * 1.05, 0.02]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, r * 0.1, on]}>
            <cylinderGeometry args={[r * 0.17, r * 0.17, 0.02, 12]} />
            <meshStandardMaterial color={CAY} />
          </mesh>
        </>
      )}
      {simge === 'lavabo' && (
        <>
          {/* su damlası: alt yuvarlak + yukarı sivrilen koni */}
          <mesh position={[0, -r * 0.16, on - 0.01]} scale={[1, 1, 0.25]}>
            <sphereGeometry args={[r * 0.36, 16, 10]} />
            <meshStandardMaterial color={SU} />
          </mesh>
          <mesh position={[0, r * 0.26, on - 0.01]} scale={[1, 1, 0.25]}>
            <coneGeometry args={[r * 0.31, r * 0.52, 16]} />
            <meshStandardMaterial color={SU} />
          </mesh>
        </>
      )}
      {simge === 'mutfak' && (
        <>
          {/* ince belli çay bardağı (iki kesik koni) + tabak */}
          <mesh position={[0, r * 0.2, on - 0.01]} scale={[1, 1, 0.25]}>
            <cylinderGeometry args={[r * 0.3, r * 0.17, r * 0.42, 14]} />
            <meshStandardMaterial color={CAY} />
          </mesh>
          <mesh position={[0, -r * 0.2, on - 0.01]} scale={[1, 1, 0.25]}>
            <cylinderGeometry args={[r * 0.17, r * 0.28, r * 0.4, 14]} />
            <meshStandardMaterial color={CAY} />
          </mesh>
          <mesh position={[0, -r * 0.46, on - 0.01]}>
            <boxGeometry args={[r * 0.75, r * 0.08, 0.02]} />
            <meshStandardMaterial color={MC.doorWood} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** `h`: perde boyu (varsayılan 2,4) · `simge`: levhadaki işaret (arkadaki obje). */
export function MaketTadilatPerde({
  x1,
  x2,
  z,
  h = 2.4,
  simge = 'okey',
}: {
  x1: number;
  x2: number;
  z: number;
  h?: number;
  simge?: PerdeSimge;
}) {
  const k = h / 2.4;
  const len = x2 - x1;
  const cx = (x1 + x2) / 2;
  const n = Math.max(1, Math.round(len / 0.62));
  const st = len / n;
  const r = Math.min(0.42, h * 0.22);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[x1 + st / 2 + i * st, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[st - 0.05, h, 0.1]} />
          <meshStandardMaterial color={['#8a6242', '#9c6f4a', '#7d5b40'][i % 3]} flatShading />
        </mesh>
      ))}
      {[0.4, 2.05].map((y) => (
        <mesh key={y} position={[cx, y * k, z + 0.03]}>
          <boxGeometry args={[len, 0.13, 0.16]} />
          <meshStandardMaterial color={MC.doorWood} />
        </mesh>
      ))}
      <group position={[cx, h * 0.6, z + 0.08]}>
        <PerdeLevhasi r={r} simge={simge} />
      </group>
    </group>
  );
}

/** Maketin `counter(len, c)` — gövde + tezgâh başlığı. Servis köşesinin hazırlık hattının temeli. */
export function MaketCounter({
  len,
  pos,
  rot = 0,
  color = MC.tableWood,
}: {
  len: number;
  pos: [number, number, number];
  rot?: number;
  color?: string;
}) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.9, 0.85]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.93, 0]} castShadow>
        <boxGeometry args={[len + 0.12, 0.08, 0.95]} />
        <meshStandardMaterial color={MC.doorWood} />
      </mesh>
    </group>
  );
}

/** Maketin `wallShelf(w)` — iki raf, uçlarında konsol, üstünde bardak dizisi. */
export function MaketWallShelf({
  w,
  pos,
  rot = 0,
}: {
  w: number;
  pos: [number, number, number];
  rot?: number;
}) {
  const n = Math.max(1, Math.floor((w - 0.3) / 0.19));
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[0, -0.55].map((dy) => (
        <group key={dy}>
          <mesh position={[0, dy, 0.16]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.06, 0.32]} />
            <meshStandardMaterial color={MC.tableWood} flatShading />
          </mesh>
          {[-w / 2 + 0.1, w / 2 - 0.1].map((x) => (
            <mesh key={x} position={[x, dy - 0.14, 0.13]}>
              <boxGeometry args={[0.05, 0.22, 0.26]} />
              <meshStandardMaterial color={MC.doorWood} />
            </mesh>
          ))}
          {Array.from({ length: n }, (_, i) => (
            <mesh key={i} position={[-(n - 1) * 0.095 + i * 0.19, dy + 0.085, 0.16]} castShadow>
              <cylinderGeometry args={[0.045, 0.062, 0.11, 8]} />
              <meshStandardMaterial color={dy ? MC.cupTea : '#dfe6ea'} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Maketin `crates()` — dört ahşap kasa, ikisi üstte; deponun okunan işareti. */
export function MaketCrates({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  const boxes: [number, number, number, number][] = [
    [0.7, -0.38, 0, 0],
    [0.7, 0.4, 0.05, 0.08],
    [0.7, -0.3, 0.02, -0.12],
    [0.55, 0.45, -0.02, 0.2],
  ];
  const y = [0, 0, 0.5, 0.5];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {boxes.map(([w, x, , z], i) => (
        <group key={i} position={[x, y[i], z]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.5, 0.55]} />
            <meshStandardMaterial color={MC.tableWood} flatShading />
          </mesh>
          {[0.12, 0.38].map((dy) => (
            <mesh key={dy} position={[0, dy, 0]}>
              <boxGeometry args={[w + 0.02, 0.06, 0.57]} />
              <meshStandardMaterial color={MC.doorWood} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Maketin `waterRack()` — iki katlı çelik raf, altı damacana. */
export function MaketWaterRack({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[0.05, 0.75].map((y) => (
        <mesh key={y} position={[0, y, 0]} receiveShadow>
          <boxGeometry args={[1.3, 0.05, 0.5]} />
          <meshStandardMaterial color="#546e7a" />
        </mesh>
      ))}
      {([[-0.62, -0.22], [0.62, -0.22], [-0.62, 0.22], [0.62, 0.22]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.75, z]}>
          <boxGeometry args={[0.05, 1.5, 0.05]} />
          <meshStandardMaterial color="#546e7a" />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => {
        const x = -0.4 + (i % 3) * 0.4;
        const y = i < 3 ? 0.08 : 0.78;
        return (
          <group key={`d${i}`}>
            <mesh position={[x, y + 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.5, 10]} />
              <meshStandardMaterial color="#74b9e6" flatShading />
            </mesh>
            <mesh position={[x, y + 0.55, 0]}>
              <cylinderGeometry args={[0.07, 0.12, 0.1, 8]} />
              <meshStandardMaterial color="#74b9e6" flatShading />
            </mesh>
            <mesh position={[x, y + 0.62, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.05, 8]} />
              <meshStandardMaterial color="#f1ece0" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Maketin `cezveStation()` — tezgâh + kum ocağı + dört cezve + fincanlar (hazırlık hattı). */
export function MaketCezveStation({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <MaketCounter len={2.6} pos={[0, 0, 0]} />
      <mesh position={[-0.4, 1.04, 0]} castShadow>
        <boxGeometry args={[1.5, 0.14, 0.55]} />
        <meshStandardMaterial color="#d9c9a3" flatShading />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          <mesh position={[-0.85 + i * 0.32, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.13, 0.17, 8]} />
            <meshStandardMaterial color={MC.copper} flatShading />
          </mesh>
          <mesh position={[-0.85 + i * 0.32, 1.16, 0.2]} rotation={[Math.PI / 2.4, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 4]} />
            <meshStandardMaterial color={MC.doorWood} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 4 }, (_, j) => (
        <mesh key={`p${j}`} position={[0.75 + (j % 2) * 0.22, 1.0, -0.18 + Math.floor(j / 2) * 0.24]}>
          <cylinderGeometry args={[0.07, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#ece4d4" />
        </mesh>
      ))}
    </group>
  );
}

/** Maketin `dishSink()` — bulaşık tezgâhı, çelik çanak, musluk, kirli bardaklar. */
export function MaketDishSink({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <MaketCounter len={2.2} pos={[0, 0, 0]} color="#7d5b40" />
      <mesh position={[-0.3, 0.94, 0]} castShadow>
        <boxGeometry args={[1.2, 0.2, 0.62]} />
        <meshStandardMaterial color={MC.sink} flatShading />
      </mesh>
      <mesh position={[-0.3, 1.2, -0.24]}>
        <cylinderGeometry args={[0.04, 0.04, 0.42, 6]} />
        <meshStandardMaterial color={MC.steel} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.62 + (i % 3) * 0.16, 0.99 + Math.floor(i / 3) * 0.11, 0.05]}>
          <cylinderGeometry args={[0.055, 0.045, 0.11, 8]} />
          <meshStandardMaterial color="#9aa0a6" />
        </mesh>
      ))}
    </group>
  );
}

/** Maketin `iskele(len)` — dikmeler + kuşaklar + kalas platform + çapraz. Tadilatın iskelesi. */
export function MaketIskele({ len, pos, rot = 0 }: { len: number; pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[-len / 2 + 0.2, len / 2 - 0.2].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.5, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 3.0, 6]} />
            <meshStandardMaterial color="#8d9499" />
          </mesh>
        )),
      )}
      {[1.0, 2.4].map((y) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${y}-${z}`} position={[0, y, z]}>
            <boxGeometry args={[len, 0.07, 0.07]} />
            <meshStandardMaterial color="#8d9499" />
          </mesh>
        )),
      )}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.06, -0.32 + i * 0.32]} castShadow receiveShadow>
          <boxGeometry args={[len - 0.4, 0.06, 0.3]} />
          <meshStandardMaterial color={MC.tableWood} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.7, -0.5]} rotation={[0, 0, Math.atan2(1.4, len)]}>
        <boxGeometry args={[Math.hypot(len, 1.4), 0.06, 0.06]} />
        <meshStandardMaterial color="#8d9499" />
      </mesh>
    </group>
  );
}

/** Maketin `moloz()` — kum yığını + kırık fayans + istiflenmiş kalaslar + kova. */
export function MaketMoloz({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.85, 0.55, 9]} />
        <meshStandardMaterial color="#bfae90" flatShading />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          position={[prnd(i * 7 + 1, -0.9, 0.9), 0.03, prnd(i * 7 + 2, 0.5, 1.2)]}
          rotation={[0, prnd(i * 7 + 3, 0, 3), 0]}
        >
          <boxGeometry args={[0.24, 0.06, 0.2]} />
          <meshStandardMaterial color={i % 2 ? '#cfd8dc' : '#b0bec5'} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`k${i}`} position={[1.9, 0.04 + i * 0.075, -0.2 + (i % 2) * 0.05]} castShadow>
          <boxGeometry args={[2.2, 0.07, 0.28]} />
          <meshStandardMaterial color={MC.tableWood} flatShading />
        </mesh>
      ))}
      <mesh position={[-1.2, 0.16, 0.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.32, 8]} />
        <meshStandardMaterial color="#546e7a" flatShading />
      </mesh>
    </group>
  );
}
