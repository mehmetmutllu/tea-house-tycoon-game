import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, Vector3, BufferGeometry, BoxGeometry, Float32BufferAttribute, DoubleSide, MeshStandardMaterial, Object3D, type Group, type InstancedMesh, type PerspectiveCamera } from 'three';
import { cameraViewYaz } from '../../game/cameraView';
import { useGame, questFocusPos, LAYOUT, LAVABO, BAND, BAND_SHELL, FLOOR_HALF, wallSpans, servicePlace, stationSoftMaxLevel, stationUpgradeCostAt, stationUpgradeUnlocked, tableSoftMaxLevel, tableUpgradeTarget, gateOf, tableNextCost, openServices, doorX as doorAt, entranceAt, BANKET, WAITER_STATION, waiterStationOpen } from '../../game/store';
import { economyConfig, lavaboUpgradeCost } from '../../config/economy.config';
import { areaOfTable, THE_SERVICE } from '../../game/world';
import { masterId, masterCost, masterUnlockedForTable, dishStationVisible, cardQuestIndex, upgradeSpotLiveNow } from '../../game/rules';
import { SceneLights } from './lights';
import { devPerfKol } from '../../game/devPerf';
import { KARE_TAVANI_FPS } from '../../game/kareTavani';
import { Tabela } from './Tabela';
import { KareTavani } from './KareTavani';
import { cihazSinifiOku, cihazSinifiYaz, golgeAcikMi, sinifBelirle, ISINMA_KARE, ORNEK_KARE } from '../../game/cihazSinifi';
import { dwellState, ustaKaresi } from '../../game/dwell';
import { Bahce } from './Bahce';
import { GroundMarker } from './GroundMarker';
import { OgreticiIz } from './OgreticiIz';
import { ogreticiAdimi, ogreticiHedefi } from '../../game/onboarding';
import { fmt } from '../../game/decimal';
// Etiketler ve işaret yarıçapı `markerFrame`ten gelir: çerçeve genişliği YAZIDAN çözülüyor
// ve aynı çerçeveyi `tick.ts` tetik olarak test ediyor (D-121). Buraya düz metin yazmak
// çizilen kutu ile tetikleyen kutuyu sessizce ayırır — S24'ün kapattığı kusur tam buydu.
import { ETIKET_LAVABO, ETIKET_SERVIS, ETIKET_USTA, MASA_ISARET_R, masaEtiketi } from '../../game/markerFrame';
import { FloorPattern } from './floorPattern';
import { DOOR, SOVE_W, WALL_H, WALL_T_BODY, WallPanels, type WallSlab } from './wallPanel';
import { BAND_SHELL_RUNS, WALL_M, WALL_RUNS, pencereBosluklari, wallPieces } from './wallLook';
import { VITRIN, cepheBosluklari, vitrinGozleri } from './cepheLook';
import { KayWalls } from './KayWalls';
import { Model } from './Model';
import {
  ASFALT,
  CITY_S,
  KALDIRIM,
  STREET_PROPS,
  STREET_Z0,
  TENTE,
  cityBoyut,
  propX,
} from './streetLook';
import { PALETTE, FLOOR_THEMES, WALL_THEMES, LIGHTING } from '../../config/palette';
import { KayActor } from './KayActor';
import { Player } from './Player';
import { Waiter } from './Waiter';
import { Dishwasher } from './Dishwasher';
import { Dishes } from './Dishes';
import { Tables } from './Tables';
import { ServicePoint } from './ServicePoint';
import { Customers } from './Customers';
import { Coins } from './Coins';
import { Pad } from './Pad';
import { Decor } from './Decor';
import { VitrinDekor } from './VitrinDekor';
import { DekorCekimi } from './DekorCekimi';
import { Kitchen, KayTezgah } from './Kitchen';
import { onHatGovdeleri } from './kitchenLook';
import { DishSink } from './DishSink';
import { FRONT_TOP_Y } from './kitchenLook';
// S20 · D-118 — E2 (mutfağın sınırı) ve Ç1 (çaycının temposu) ölçü katmanından okunur.
import { CAYCI_TEMPO, cayBekleyenSayisi, cayciHali, cayciHizCarpani, sinirBolmeleri } from './kitchenLook';
import {
  MaketCrates,
  MaketDuba,
  MaketIskele,
  MaketLavaboBlock,
  MaketMerdivenHarap,
  MaketMoloz,
  MaketTadilatPerde,
  MaketUyariSeridi,
  MaketWall,
} from './maketParts';
import { banketKademe, banketSutunlari, type BanketSutun } from './banketLook';
import { banketAdaGeo } from './banketGeo';
import { CAMERA_FOCUS_MUL, CAMERA_FOV, CAMERA_ZOOM_OUT_MUL, cameraDistance } from '../../config/camera';
import { perf, olcumAcik, perfPenceresiAc } from '../../game/perf';
import { sahneOrtulu } from './sahneOrtusu';
import { cekimBuKare } from './DekorCekimi';
import { sahneKaresiSay } from './KareTavani';
import { devCam, devTimeScale, devTopDown, useSandbox } from '../../game/devSandbox';
import { screenPointer } from '../../game/screenPointer';
import { activeStep } from '../../game/activeStep';
import { CAMERA_LOOK_Y } from '../../config/actor';
import { useProgress } from '@react-three/drei';
import { yuklemeOkuyucusuKaydet } from '../../game/yukleme';

// Açılış ekranı ilerlemeyi buradan OKUR (abone olmaz — `yukleme-dongusu` bekçisi). Kayıt modül
// düzeyinde: bu parça indiği anda — `Tables`ın preload'ları zaten başlamış olarak — ekran görür.
yuklemeOkuyucusuKaydet(() => useProgress.getState());

/** GEÇİCİ (2026-09-07 ölçümü): maketle aynı ton eşlemesi (kapalı) — bkz. Canvas'taki not. */
// Simülasyonu her karede ilerlet (tek kaynak; __advanceTime aynı tick'i çağırır).
// DEV'de sandbox hız çarpanı uygulanır; üretimde `import.meta.env.DEV` false → dal ölü kod.
function Simulation() {
  const tick = useGame((s) => s.tick);
  useFrame((_, dt) => tick(import.meta.env.DEV ? dt * devTimeScale() : dt));
  return null;
}

// AKTİF ADIMIN EKRAN İZDÜŞÜMÜ (plan §9 — Tek Odak'ın görsel kanalı). Aktif görevin dünya hedefi
// kameraya izdüşürülür; ekran dışındaysa HUD kenarda ok gösterir. Store'a YAZMAZ (her kare render
// tetiklemesin) — `perf` gibi singleton'a yazar, HUD ~20Hz okur.
// C2: aynı hedefi `activeStep`e de yazar — DÖRDÜNCÜ kanal (dünyadaki işaret) de buradan türesin
// diye. Böylece bant · kamera · kenar oku · zemin işareti dördü de TEK `questFocusPos` çağrısından
// besleniyor; iki kanalın ayrı hesaplayıp ayrışması yapısal olarak mümkün değil (D-038).
function QuestPointer() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const g = useGame.getState();
    // G-59: kenar oku da KARTIN görevini gösterir — eskiden kutlama penceresinde ok yeni hedefe
    // atlıyor, kart hâlâ biten görevi yazıyordu (D-038'in dört kanalı ayrışıyordu).
    const qi = cardQuestIndex(g);
    const def = qi < economyConfig.quests.length ? economyConfig.quests[qi] : null;
    // E5: öğretici süresince hedef görevin genel noktası değil O ANKİ somut şey (çay bekleyen
    // müşteri · yerdeki para) — `ogreticiHedefi` yalnız bu iki adımda ayrışır, yoksa null.
    const ogretici = ogreticiHedefi(ogreticiAdimi({ kartIndex: qi, atlandi: g.ogreticiAtlandi, yurudu: true }), g);
    const target = g.quest && def ? ogretici ?? questFocusPos(def.target, g.tableLevels, g.tables, g.areasOpen, def.area ?? 0, tableUpgradeTarget(gateOf(g))) : null;
    if (!target) {
      screenPointer.active = false;
      activeStep.has = false;
      return;
    }
    activeStep.has = true;
    activeStep.x = target[0];
    activeStep.z = target[2];
    v.set(target[0], 0.9, target[2]);
    screenPointer.dist = Math.hypot(target[0] - g.player[0], target[2] - g.player[2]);
    v.project(camera);
    const behind = v.z > 1;
    let x = (v.x * 0.5 + 0.5) * size.width;
    let y = (-v.y * 0.5 + 0.5) * size.height;
    if (behind) {
      x = size.width - x;
      y = size.height - y;
    }
    // Kenar payı: bant/nav'ın altında kalmasın diye üstte 90, altta 170 px korunur.
    const m = 34;
    const minY = 90;
    const maxY = size.height - 170;
    const inside = !behind && x > m && x < size.width - m && y > minY && y < maxY;
    screenPointer.active = true;
    screenPointer.onScreen = inside;
    if (!inside) {
      const cx = size.width / 2;
      const cy = (minY + maxY) / 2;
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      // Merkezden hedefe doğru ışın, güvenli dikdörtgenin kenarına kırpılır.
      const sx = Math.abs(dx) > 0.001 ? (size.width / 2 - m) / Math.abs(dx) : Infinity;
      const sy = Math.abs(dy) > 0.001 ? (maxY - cy) / Math.abs(dy) : Infinity;
      const s = Math.min(sx, sy);
      screenPointer.x = cx + dx * s;
      screenPointer.y = cy + dy * s;
      screenPointer.angle = (Math.atan2(dy / len, dx / len) * 180) / Math.PI;
    } else {
      screenPointer.x = x;
      screenPointer.y = y;
    }
  });
  return null;
}

// FPS / render bütçesi probe'u (FPS Tier 2). gl.info.render = r3f'de kare başı otomatik resetlenir
// (autoReset true) → calls/triangles ANLIK kare maliyeti. 0.5sn pencerede FPS ortalanır (anlık
// dt gürültüsünü bastırır). Sonuç perf singleton + window.__perf'e yazılır; render YOK (overlay HUD'da).
function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const acc = useRef({ frames: 0, time: 0 });
  // ÜRETİMDE ÖLÇÜM (Sprint A): `localStorage['kiraathane-olcum']==='1'` ise `window.__perf` açılır —
  // cihazda `chrome://inspect` ile kare işi okunabilsin. DEV'de kanca zaten `devHooks`ta.
  useEffect(() => {
    if (!import.meta.env.DEV && olcumAcik()) perfPenceresiAc();
  }, []);
  useFrame((_, dt) => {
    const a = acc.current;
    a.frames += 1;
    a.time += dt;
    if (a.time >= 0.5) {
      perf.fps = Math.round(a.frames / a.time);
      perf.calls = gl.info.render.calls;
      perf.tris = gl.info.render.triangles;
      a.frames = 0;
      a.time = 0;
      // DEV teşhis: sahne/kamera/renderer'ı dışa aç (draw-call dağılımı analizi).
      if (import.meta.env.DEV) (window as unknown as { __three?: unknown }).__three = { gl, scene, camera };
    }
  });
  return null;
}

// ÇÖZÜNÜRLÜK BÜTÇESİ (P0 perf, 2026-09-06). Fragment (piksel) maliyeti doğrudan arka tamponun
// piksel sayısıyla ölçeklenir. `dpr={[1,2]}` telefonda doğru ama PC'de TAM EKRAN + Windows ekran
// ölçeklemesi (%125-150 çok yaygın) tamponu 1920×1080 yerine 2400×1350 / 2880×1620 yapıyordu —
// aynı sahne için 1,6-2,25 kat piksel. Burada toplam piksel sayısına tavan konur: küçük tuvalde
// (telefon, UI önizlemeleri) hiçbir şey değişmez, büyük tuvalde dpr 1'e kadar iner. 1'in ALTINA
// İNMEZ — bulanıklık görsel bir karardır, ölçüm kararı değil.
/**
 * SAHNEYİ ÇİZEN TEK YER (Sprint A · perf #2a). Önceliği > 0 olan bir `useFrame` varken r3f
 * kendiliğinden `gl.render` ÇAĞIRMAZ; çizimi bu abone yapar ve öncelik 1 olduğu için bütün
 * öncelik-0 aboneler (tick, kamera, müşteri, `DekorCekimi`) ondan ÖNCE koşar — sıra eskisiyle aynı.
 *
 * Opak panel (`Sheet`) açıkken çizim ATLANIR, simülasyon sürer. İki istisna:
 *  · `scene.updateMatrixWorld()` yine koşar — drei `Merged` örnek matrislerini yalnız ilk
 *    birkaç karede okur (`frames={3}`); panel açıkken bir alım masayı değiştirirse matrisler
 *    bayat kalmasın.
 *  · `DekorCekimi` bu karede tuvalin köşesine çektiyse tam kare de çizilir: tampon köşe
 *    çekimiyle sunulup panel kapanınca bir kare yarım görünmesin (saniyede ~2 kez, yalnız
 *    dekor sekmesinde).
 */
function SahneCizimi() {
  useFrame((st) => {
    const cekim = cekimBuKare();
    if (sahneOrtulu() && !cekim) {
      st.scene.updateMatrixWorld();
      return;
    }
    st.gl.render(st.scene, st.camera);
    if (import.meta.env.DEV) sahneKaresiSay();
  }, 1);
  return null;
}

/**
 * GÖLGE ANAHTARI CANLI ÇEVRİLİNCE MATERYALLERİ TAZELER (F2 · D-125).
 *
 * `gl.shadowMap.enabled` değiştiğinde three.js yeni gölge durumuna göre shader programlarını
 * yeniden derlemek zorundadır; `shadowMap.needsUpdate` yalnız HARİTAYI tazeler, materyalin
 * derlenmiş programını değil. Bu satır olmadan cihaz "zayıf" ilan edilip gölge kapatıldığında
 * sahne, gölgesiz ışıkla ama HÂLÂ gölge örnekleyen shader'larla çizilir: maliyet düşmez,
 * yani ölçümün vaat ettiği %40 gelmez ve kusur ekranda görünmez.
 */
function GolgeTazele({ acik }: { acik: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.shadowMap.enabled = acik;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((o) => {
      const m = (o as { material?: unknown }).material;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m]) {
        (mat as { needsUpdate?: boolean }).needsUpdate = true;
      }
    });
  }, [acik, gl, scene]);
  return null;
}

/**
 * CİHAZ SINIFI ÖLÇER (F2 · D-125). İlk kareleri atar, sonraki pencerede kare süresini
 * örnekler ve cihazı bir kez sınıflandırıp `localStorage`a yazar. Ölçüm BİR KEZ yapılır:
 * sınıf yazılıysa bileşen hiç iş yapmaz.
 *
 * Neden burada ve neden `perf` singleton'ından okumuyor: `PerfProbe` yarım saniyelik
 * ORTALAMA FPS tutuyor; sınıflandırma ortancaya bakmalı (tek bir yükleme takılması ortalamayı
 * bozar, ortancayı bozmaz). İki ölçüm iki soruya bakıyor, ortak sayaç yanlış olurdu.
 */
function CihazSinifiOlcer({ onSonuc }: { onSonuc: (zayif: boolean) => void }) {
  const durum = useRef({ atlanan: 0, ornekler: [] as number[], bitti: cihazSinifiOku() !== 'bilinmiyor' });
  useFrame((_, dt) => {
    const d = durum.current;
    if (d.bitti) return;
    if (d.atlanan < ISINMA_KARE) { d.atlanan += 1; return; }
    d.ornekler.push(dt * 1000);
    if (d.ornekler.length < ORNEK_KARE) return;
    d.bitti = true;
    const sinif = sinifBelirle(d.ornekler);
    if (sinif !== 'bilinmiyor') {
      cihazSinifiYaz(sinif);
      onSonuc(sinif === 'zayif');
    }
  });
  return null;
}

const PIXEL_BUDGET = 2_300_000; // ~1920×1200

function AdaptiveResolution() {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    const area = Math.max(1, width * height);
    const budgetDpr = Math.sqrt(PIXEL_BUDGET / area);
    let dpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, budgetDpr));
    // DEV — F2 ölçüm kolu piksel tavanını AŞAĞI çekebilir (yukarı asla: bütçe kuralı kalır).
    if (import.meta.env.DEV) {
      const kol = devPerfKol();
      if (kol?.dprTavan) dpr = Math.min(dpr, kol.dprTavan);
      if (kol?.kayitDpr) dpr = kol.kayitDpr; // mağaza videosu (D-170): bütçe bilerek aşılır
    }
    setDpr(dpr);
  }, [width, height, setDpr]);
  return null;
}

// Kamera sahip karakterini yumuşak takip eder (omuz-üstü izometrik).
// Ekran oranına göre çerçeveler: portrait (dar) → kamera geri çekilir; landscape → normal.
// Yön kilidi yok; çevirince otomatik uyum sağlar.
// D-017 §6 (kamera sallanması fix): eski kod konumu kare-hızına BAĞLI lerp'lerken lookAt'ı TAM oyuncuya
// nişanlıyordu → konum geriden gelirken bakış yönü dalgalanıp dünya SALLANIYORDU. Çözüm: kare-hızı BAĞIMSIZ
// damping (1-exp(-k·dt)) AYNI katsayıyla hem konuma hem lookAt hedefine uygulanır → kamera↔hedef offset'i
// rijit kalır (sallanma yok) + dt clamp (hitch sıçramaz) + fit/d YALNIZ gerçek resize'da (her kare size
// okuması mobil viewport titremesini kameraya taşırdı).
/** DEV ölçüm kolu fov'u değiştirebilsin diye ayrı fonksiyon (kamera nesnesine yazma tek yerde). */
function setFov(cam: PerspectiveCamera, fov: number) {
  if (cam.fov === fov) return;
  cam.fov = fov;
  cam.updateProjectionMatrix();
}

function CameraRig() {
  const { camera, size, scene } = useThree();
  const desired = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []); // pürüzsüzleştirilmiş lookAt hedefi (oyuncuyla aynı damping)
  const tmp = useMemo(() => new Vector3(), []);
  const st = useRef({ d: 0, w: 0, h: 0, ready: false });
  useFrame((_, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 0.05); // clamp: kare atlamasında kamera sıçramasın
    const g = useGame.getState();
    const p = g.player;
    // DEV — ÜSTTEN PLAN: kamera oyuncuyu bırakır, katın merkezine dik tepeden bakar (maketi
    // üstten çevirmenin oyun içi karşılığı). Mesafe fov + en-boy oranından hesaplanır, yani
    // portrede de landscape'te de 34 × 34'ün TAMAMI kadraja sığar. Üretimde bu dal ölü kod.
    if (import.meta.env.DEV) {
      const td = devTopDown();
      if (td) {
        const cam = camera as PerspectiveCamera;
        const aspect = size.width / Math.max(1, size.height);
        const vt = Math.tan((cam.fov * Math.PI) / 360); // dikey yarım-açının tanjantı
        const pad = 1.04; // kenarda ince pay: duvarın dış yüzü de görünsün
        const h = (pad * Math.max(FLOOR_HALF / vt, FLOOR_HALF / (vt * aspect))) / td.zoom;
        camera.position.set(0, h, 0.001); // z'de kıl payı: tam dikeyde lookAt yönü belirsiz kalır
        look.set(0, 0, 0);
        camera.lookAt(look);
        st.current.ready = false; // plandan çıkınca takip kamerası sıçramadan yeniden yerleşir
        return;
      }
    }
    if (import.meta.env.DEV) {
      const sn = useSandbox.getState().sinema;
      if (sn) {
        setFov(camera as PerspectiveCamera, sn.fov);
        // Alçak kamerada duvarın üstü görünür; oyunda hiç görünmeyen koyu boşluk yerine gök.
        if (sn.gok) {
          if (scene.background instanceof Color) scene.background.set(sn.gok);
          scene.fog?.color.set(sn.gok);
        }
        camera.position.set(...sn.pos);
        look.set(...sn.bak);
        camera.lookAt(look);
        st.current.ready = false;
        camera.updateMatrixWorld();
        cameraViewYaz(camera.projectionMatrix.elements, camera.matrixWorldInverse.elements);
        return;
      }
    }
    // DEV — KAMERA ÖLÇÜM KOLU (BM adım 4): fov ve mesafe çarpanı dışarıdan verilebilir, böylece
    // aynı noktadan fov 50 ↔ 34 karesi alınıp maketle yan yana konabilir. Üretimde ölü kod.
    let measureMul = 1;
    if (import.meta.env.DEV) {
      const dc = devCam();
      if (dc) {
        if (dc.fov) setFov(camera as PerspectiveCamera, dc.fov);
        measureMul = dc.distMul;
      }
    }
    // fit/d YALNIZ ekran boyutu gerçekten değişince (resize/orientation) hesaplanır.
    if (size.width !== st.current.w || size.height !== st.current.h) {
      st.current.w = size.width;
      st.current.h = size.height;
      // Mesafe/clamp `src/config/camera.ts`te (D-072 katman 1 — dondurulmus ankraj).
      st.current.d = cameraDistance(size.width / Math.max(1, size.height));
    }
    // KAMERA ODAĞI (quest sistemi): odak varken hedefe kay + hafif zoom; girdi gelince store odağı
    // iptal eder → buradaki damping kendiliğinden oyuncuya geri süzülür (ek durum makinesi yok).
    const focus = g.camFocus;
    const zoomMul = g.camZoomOut ? CAMERA_ZOOM_OUT_MUL : 1; // B ↔ C kademesi (8,5 ↔ 11,5) — D-061
    const d = (focus ? st.current.d * CAMERA_FOCUS_MUL : st.current.d) * zoomMul * measureMul;
    if (focus) {
      desired.set(focus.pos[0], d, focus.pos[2] + d);
      tmp.set(focus.pos[0], CAMERA_LOOK_Y, focus.pos[2]);
    } else {
      desired.set(p[0], d, p[2] + d);
      tmp.set(p[0], CAMERA_LOOK_Y, p[2]);
    }
    if (!st.current.ready) {
      camera.position.copy(desired); // ilk kare: anında yerleş (başlangıç lerp sıçraması olmasın)
      look.copy(tmp);
      st.current.ready = true;
    } else {
      // Kare-hızı bağımsız damping (konum + lookAt AYNI k → sallanma yok). Odak panı biraz yavaş (süzülme hissi).
      const a = 1 - Math.exp(-(focus ? 5 : 8) * dt);
      camera.position.lerp(desired, a);
      look.lerp(tmp, a);
    }
    camera.lookAt(look);
    // H1/K2: görev panı "hedef zaten ekranda mı?" diye soruyor ve bunu ancak GERÇEK izdüşüm
    // yanıtlayabiliyor (eğik kamerada görüş yarıçapı yöne göre 4,25-24,50 br arasında değişiyor).
    // Matris burada, kamera yerleştikten SONRA yazılır; `tick` okur.
    camera.updateMatrixWorld();
    cameraViewYaz(camera.projectionMatrix.elements, camera.matrixWorldInverse.elements);
  });
  return null;
}

// SERVİS NOKTASI (B2: kat çapında TEK obje). Ön yüz salona bakar.
// B3-1 (D-062): 1-2. Alan'da ilk salonun sol duvarında, 3. Alan açılınca ARKA BANDIN servis
// bloğunda — aynı obje, aynı seviye, farklı yer (maket v13 adım 3).
function Stations() {
  const level = useGame((s) => s.stationLevels[THE_SERVICE]);
  const readyTea = useGame((s) => s.ready.tea);
  const readyTost = useGame((s) => s.ready.tost);
  const areasOpen = useGame((s) => s.areasOpen);
  const place = servicePlace(areasOpen);
  const p = place.station;
  return (
    <group position={[p[0], 0, p[2]]} rotation={[0, place.rot, 0]}>
      <ServicePoint position={[0, 0, 0]} areasOpen={areasOpen} level={level} readyTea={readyTea} readyTost={readyTost} />
    </group>
  );
}

// Çaycı NPC (D-023; kullanıcı tarifi: "duvar ile tezgah arasında çalışan biri"). SALT GÖRSEL —
// mekaniğe dokunmaz: kendi ocağının arkasındaki koridorda yürür, durup tezgâha dönüp "iş yapar".
// D-025: her açık SERVİSİN ocağı kendi duvarında → yeni alan açılınca onun da çaycısı belirir (aynalı).
function KitchenHand({ service }: { service: number }) {
  const ref = useRef<Group>(null);
  // B3-1: çaycının yolu artık ŞABLONDAN değil servisin KENDİ yerinden gelir (`staffWalk`) —
  // sol duvar döneminde tezgâhın arkasındaki koridor, arka bant döneminde bloğun içi.
  const areasOpen = useGame((s) => s.areasOpen);
  const place = servicePlace(areasOpen);
  void service;
  const backWall = place.rot === 0;
  const faceIn = place.staffWalk.face;
  const wa = place.staffWalk.a;
  const wb = place.staffWalk.b;
  // useMemo: her render yeni dizi üretirse aşağıdaki kayıt effect'i boşuna yeniden koşar.
  const start = useMemo(() => [wa[0], 0, wa[2]] as const, [wa]);
  /**
   * Ç1 (S20 · D-118) — ÇAYCININ YÜKÜ: çay bekleyen müşteri sayısı. Ölçüm çaycının başının
   * oyuncunun 234 duruşunun %100'ünde göründüğünü, buna karşılık mekanik okumasının 0
   * olduğunu gösterdi (`docs/olcum-mutfak.txt` §Ç). Okuma SALT GÖRSEL: hiçbir sayı üretmez,
   * hiçbir sayı tüketmez — D-023'ün "mekaniğe dokunmaz" kuralı yerinde duruyor.
   */
  const bekleyen = useGame((s) => cayBekleyenSayisi(s.npcs));
  /**
   * FAZ BİRİKTİRİLİR, `elapsedTime × çarpan` DEĞİL. Çarpanı doğrudan geçen zamanla çarpsaydık
   * salon dolduğu anda `t` sıçrar, çaycı yolun ortasında ışınlanırdı.
   */
  const faz = useRef(0);
  // B2: "tost ustası" ayrı bir kişi değil — kat tek servisten döndüğü için tek çaycı var.
  useFrame((st, dt) => {
    const grp = ref.current;
    if (!grp) return;
    const calisiyor = bekleyen > 0;
    faz.current += dt * CAYCI_TEMPO.temelHiz * cayciHizCarpani(bekleyen);
    const t = faz.current;
    const u = (Math.sin(t) + 1) / 2;
    // Yol = staffWalk doğru parçası; yürüme yönü parçanın kendi ekseninden okunur.
    grp.position.x = wa[0] + u * (wb[0] - wa[0]);
    grp.position.z = wa[2] + u * (wb[2] - wa[2]);
    const walkRot = backWall
      ? (Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (Math.cos(t) > 0 ? 0 : Math.PI);
    // Rota ucunda durup tezgâha dönüp "iş yapar" (eğilme); arada yürür (hafif zıplama).
    // Yük yokken faz donduğu için çaycı olduğu yerde kalır ve tezgâha döner: dinleniyor.
    const duruyor = !calisiyor || Math.abs(Math.cos(t)) < 0.25;
    grp.rotation.y = duruyor ? faceIn : walkRot;
    grp.position.y = !calisiyor
      ? -0.04
      : duruyor
        ? -0.04 + Math.sin(st.clock.elapsedTime * 3) * 0.02
        : Math.abs(Math.sin(st.clock.elapsedTime * 7)) * 0.04;
  });
  return (
    <group ref={ref} position={[start[0], 0, start[2]]}>
      {/* S14/D-112: ilkel kutu gövde yerine KayKit karakteri (ak sakallı usta). Ölçeği
          `KayActor` kendi taşır. S20/Ç1: klip artık sabit değil — yük varken `calis`
          (tezgâh başında iş), yük yokken `dur`. Yürüyüş klibi hâlâ kullanılmıyor: bu aktör
          bir yol boyunca gidip geliyor ama işi tezgâhta, yürüyüş klibi yanıltırdı. */}
      <KayActor kind="kitchenHand" hal={cayciHali(bekleyen)} />
    </group>
  );
}

function KitchenStaff() {
  const areasOpen = useGame((s) => s.areasOpen);
  // Her açık SERVİSİN kendi çaycısı (M2: konum/yön areaPoint şablonundan).
  return (
    <>
      {openServices(areasOpen).map((sv) => (
        <KitchenHand key={sv} service={sv} />
      ))}
    </>
  );
}

// Rezerve servis odaları (floorplan-master.md; D-023): DEPO sol-arka + TUVALET sağ-arka (bina arkasına
// bitişik ek odalar) + MERDİVEN ön-sağ köşe (Faz 3b üst kat). Salt görsel greybox rezerv.
// (ReservedRooms KALDIRILDI — B3-2.) Eski 2×2 ızgaranın "rezerv arka-sol arsa"sındaki DEPO ve
// TUVALET kutuları B3-1'de arsa kalkınca sahipsiz kaldı: ikisi de z ≈ −1,6'ya, yani arka yarının
// (a2) tam ortasına düşüyordu — hem KİLİTLİ alanın içinde çiziliyorlardı (D-057'ye aykırı), hem de
// B3-2'nin orta şeridinin üstünde duruyorlardı. Gerçek karşılıkları arka bantta: lavabo ve depo
// B4'te bandın içi açılınca gelecek.

/**
 * BANKET ADALARI (B3-2 → T7/D-141): orta şeridin sırt sırta oturma bankları. Ada masayla büyür
 * (her masa kendi yüzünü getirir, iç sütundan dışa) ve TEK kademe taşır — kural `banketLook`,
 * parçalar `banketGeo`. Ada başına tek mesh; geometri yalnız biçim/kademe değişince kurulur.
 */
function BanketAdasi({ sutunlar, kademe }: { sutunlar: BanketSutun[]; kademe: number }) {
  const imza = `${kademe}|${sutunlar.map((s) => `${s.col}${+s.yuz[0]}${+s.yuz[1]}`).join(',')}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => banketAdaGeo(sutunlar, kademe), [imza]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} position={[0, 0, BANKET.z]} castShadow>
      <meshStandardMaterial vertexColors />
    </mesh>
  );
}

function BanketIslands() {
  const tables = useGame((s) => s.tables);
  const levels = useGame((s) => s.tableLevels);
  const sutunlar = banketSutunlari(tables);
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <BanketAdasi
          key={side}
          sutunlar={sutunlar.filter((s) => s.side === side)}
          kademe={banketKademe(tables, levels, side)}
        />
      ))}
    </group>
  );
}

/**
 * GARSON SERVİS İSTASYONU (B3-2): tezgâhın sağ ucunda, servis bloğunun ön yüzünde duran aktarma
 * tezgâhı — sürahiler, peçetelik, temiz bardak istifi, uçta kirli bardak tepsisi.
 * Bugün YALNIZ obje + collision: garson tepsisini hâlâ ana tezgâhtan alır (kullanıcı kararı).
 */
function WaiterStation() {
  const areasOpen = useGame((s) => s.areasOpen);
  if (!waiterStationOpen(areasOpen)) return null;
  const [hx, hz] = WAITER_STATION.half;
  const govde = onHatGovdeleri(areasOpen).waiter;
  return (
    <group position={WAITER_STATION.pos}>
      {/* GÖVDE (S3): KayKit tezgâhı, collision kutusunun TAM ölçüsünde. */}
      {/* S4: gövde ÖN HATTIN birleşik genişliğinden (üç tezgâh tek banko okunsun). */}
      <KayTezgah
        model="kitchencounter_straight_B"
        w={govde.w}
        d={govde.d}
        dx={govde.dx}
        topY={FRONT_TOP_Y}
        fallback={
          <mesh castShadow position={[0, 0.45, 0]}>
            <boxGeometry args={[hx * 2, 0.9, hz * 2]} />
            <meshStandardMaterial color={PALETTE.counterWood} />
          </mesh>
        }
      />
      {/* S3: elle çizilen pirinç tabla KALKTI — KayKit gövdesinin kendi tablası var ve ikisi
          üst üste binince ayrı bir levha gibi okunuyordu. Üstteki eşyalar o tablanın üst
          yüzüne (0,98) göre yazılıydı; grup 0,08 indirilince hepsi yeni tablaya (0,90) oturur
          ve tek bir koordinat elle değişmez. */}
      <group position={[0, -0.08, 0]}>
      {/* sürahiler */}
      {[-0.95, -0.62].map((x) => (
        <group key={x} position={[x, 0, 0.05]}>
          <mesh castShadow position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.34, 10]} />
            <meshStandardMaterial color={PALETTE.plate} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 0.06, 8]} />
            <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* peçetelik */}
      <mesh castShadow position={[-0.26, 1.08, 0.14]}>
        <boxGeometry args={[0.26, 0.2, 0.2]} />
        <meshStandardMaterial color={PALETTE.brass} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* temiz bardak istifi (2 sıra × 4) */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} castShadow position={[0.12 + (i % 4) * 0.19, 1.03, -0.14 + Math.floor(i / 4) * 0.22]}>
          <cylinderGeometry args={[0.05, 0.062, 0.1, 8]} />
          <meshStandardMaterial color={PALETTE.plate} />
        </mesh>
      ))}
      {/* uçta kirli bardak tepsisi */}
      <mesh castShadow position={[1.0, 1.0, 0.02]}>
        <boxGeometry args={[0.52, 0.035, 0.38]} />
        <meshStandardMaterial color={PALETTE.copper} metalness={0.4} roughness={0.5} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} castShadow position={[0.86 + (i % 3) * 0.16, 1.07, -0.08 + Math.floor(i / 3) * 0.2]}>
          <cylinderGeometry args={[0.055, 0.045, 0.11, 8]} />
          <meshStandardMaterial color={PALETTE.plateDirty} />
        </mesh>
      ))}
      </group>
    </group>
  );
}

// Mekânsal ocak-yükseltme noktaları (SERVİS BAŞINA; ocağın önünde). Üstünde dur → dolum yayı ilerler.
function StationUpgradeSpots() {
  const stationLevels = useGame((s) => s.stationLevels);
  const upgradeFills = useGame((s) => s.upgradeFills);
  const areasOpen = useGame((s) => s.areasOpen);
  const wallet = useGame((s) => s.wallet);
  const padsDone = useGame((s) => s.padsDone);
  const tables = useGame((s) => s.tables);
  const lifetime = useGame((s) => s.lifetime);
  const gate = { padsDone, tables, stationLevel: stationLevels[THE_SERVICE], lifetime: lifetime.toNumber() };
  const level = stationLevels[THE_SERVICE];
  const upPos = servicePlace(areasOpen).upgradeSpot;
  const canli = useGame((s) => upgradeSpotLiveNow(s, 'station'));
  if (!canli) return null; // D-142: nokta yalnız kendi görevinde
  if (level >= stationSoftMaxLevel()) return null;
  if (!stationUpgradeUnlocked(gate)) return null;
  const cost = stationUpgradeCostAt(THE_SERVICE, level);
  // KALAN tutar (2026-06-11 feedback: kısmi dolum düşülmüş hali yazsın).
  const remaining = Math.max(0, Math.ceil(cost - upgradeFills[THE_SERVICE]));
  return (
    <GroundMarker
      pos={upPos}
      // G-11 (2026-09-09): her yükseltme noktası AYNI sözü söyler; hangi obje olduğunu metin değil
      // KONUM anlatır (mekânsal tycoon). Eskiden 'Çay Yükselt' / 'Tezgâhı Yükselt' ayrımı vardı.
      label={ETIKET_SERVIS}
      arrow
      sub={fmt(remaining)}
      pip="coin"
      tint="#ffce54"
      progress={upgradeFills[THE_SERVICE] / cost}
      afford={wallet.toNumber() >= remaining}
    />
  );
}

// Bulaşık noktaları (Faz 2e; SERVİS BAŞINA, D-022): kirli bardaklar burada yıkanır.
// (Havadaki etiket KALDIRILDI — lavabo görseli zaten ne olduğunu anlatır; D-017 §2 sadelik.)
// D-025 rev. A: modül kendi ocağının bitişiğinde, yan duvara paralel (rotasyon ocakla aynı).
// S4: gövde + kirli/temiz döngüsü `DishSink.tsx`e taşındı (kullanıcı isteği; sunum katmanı).
// G-69 (2026-09-18) — BULAŞIK MEKANİĞİ AÇILMADAN TEZGÂH SAHNEDE DURMAZ.
// Kullanıcı: *"bulaşık daha açılmadan, bulaşık tezgâh var, o da olmasın."* Kirli bardak zaten
// `q_wash` görevinden itibaren doğuyor (`tick.ts`, WASH_QUEST_INDEX) — yani ondan öncesi boyunca
// tezgâh hiçbir işe yaramayan, ne olduğu anlaşılmayan bir gövdeydi ve oyuncuya öğretmediği bir
// mekaniğin sözünü veriyordu. Aynı görev tezgâhı da getirir: mekanik ile obje aynı anda doğar.
// (`feedback_locked_object_renovation` burada geçerli DEĞİL — o kural "açık alandaki KİLİTLİ
//  obje" içindi; bu kilitli bir obje değil, oyunun henüz tanıtmadığı bir mekanik. Kullanıcı
//  seçenekler arasından "hiç olmasın"ı seçti.)
function DishStation() {
  const areasOpen = useGame((s) => s.areasOpen);
  const bulasikAcik = useGame((s) => dishStationVisible(s.questIndex));
  const place = servicePlace(areasOpen);
  if (!bulasikAcik) return null;
  return <DishSink pos={place.dish} rot={place.dishRot} areasOpen={areasOpen} />;
}

// Masa-başı yükseltme işaretleri (Faz 2h + D-018 §1 KENAR-YERLEŞİM): her AÇIK masanın DUVAR-KENARI tarafında
// kesik-köşeli kart ("Masa N" + Lvl + ₺maliyet). Orta koridor boş kalır; dwell ile para hemen gitmez.
function TableUpgradeMarkers() {
  const tables = useGame((s) => s.tables);
  const tableLevels = useGame((s) => s.tableLevels);
  const tableUpgradeFills = useGame((s) => s.tableUpgradeFills);
  const wallet = useGame((s) => s.wallet);
  const padsDone = useGame((s) => s.padsDone);
  const stationLevel = useGame((s) => s.stationLevels[0]);
  const lifetime = useGame((s) => s.lifetime);
  // D-124: `tableLevels` gate'e GİRER — tek-hedef kuralı seviyeleri okur. (Eskiden verilmiyordu;
  // alan kapısı seviyeye bakmadığı için fark etmiyordu.)
  const gate = { padsDone, tables, stationLevel, lifetime: lifetime.toNumber(), tableLevels };
  const cash = wallet.toNumber();
  // D-124: aynı anda TEK masanın noktası canlı. Tetik (tick.ts) aynı çağrıyı yapar — çizilen ile
  // tetiklenen tek kaynaktan türer (H1'in dersi).
  const canli = useGame((s) => upgradeSpotLiveNow(s, 'table')); // D-142
  const hedefMasa = canli ? tableUpgradeTarget(gate) : null;
  return (
    <>
      {LAYOUT.tables.slice(0, tables).map((t, i) => {
        if (i !== hedefMasa) return null;
        const lvl = tableLevels[i] ?? 0;
        // D8: ₺ tavanında işaret KAYBOLMAZ — `TableMasterSpots` aynı yerde 💎 kimliğiyle devralır.
        if (lvl >= tableSoftMaxLevel()) return null;
        const cost = tableNextCost(lvl, areaOfTable(i));
        const remaining = Math.max(0, Math.ceil(cost - (tableUpgradeFills[i] ?? 0)));
        return (
          <GroundMarker
            key={i}
            pos={t.upgradeSpot}
            /* G-18 (kullanıcı kararı 2026-09-14): "masaya tıklayınca seviye görünsün mü?"
               sorusunun cevabı HAYIR — dünyaya yüzen yeni bir arayüz öğesi girmiyor
               (`feedback_interaction_model`). Seviye masanın KENDİ mekânsal noktasında
               okunuyor: yukarı ok zaten "yükselt" diyor, yazı artık nereden yükselttiğini
               söylüyor. `feedback_upgrade_legibility`in istediği ÇOKLU sinyalin sayı kanalı. */
            label={masaEtiketi(lvl)}
            arrow
            sub={fmt(remaining)}
            pip="coin"
            tint="#ffce54"
            radius={MASA_ISARET_R}
            progress={(tableUpgradeFills[i] ?? 0) / cost}
            afford={cash >= remaining}
          />
        );
      })}
    </>
  );
}

/**
 * USTA NOKTALARI (D8 · D-093'ün etkileşimi) — kullanıcı kararı: "aynı nokta, 💎 kimliği".
 *
 * Masa ₺ TAVANINA varınca yükseltme noktası kaybolmaz, aynı yerde ELMAS kimliğine döner
 * (mavi halka + dörtgen pul + "Usta"). Yeni bir görsel dil açılmadı: oyuncunun zaten bildiği
 * mekânsal yükseltme noktasının para birimi değişti.
 *
 * SATIN ALMA DWELL İLE OLMAZ. ₺ noktaları üstünde durunca dolar; 💎 tek seferde 25'lik bir
 * PREMİUM harcamadır ve yürürken kazara gitmemeli. Bu yüzden nokta yalnız YAKINLIK bildirir,
 * onayı HUD'un alt bandı alır (`MasterBar`). Yakınlık `useFrame` içinde ölçülür ve store'a
 * yalnız hedef DEĞİŞİNCE yazılır — oyuncu konumuna abone olmak HUD'u 60 fps yeniden çizerdi.
 */
/** Bu hızın altı "duruyor" sayılır (br/sn). Joystick'in ölü bölgesinden yüksek, yürüyüşten düşük. */
const DURMA_HIZI = 0.35;

function TableMasterSpots() {
  const tables = useGame((s) => s.tables);
  const tableLevels = useGame((s) => s.tableLevels);
  const mastersOwned = useGame((s) => s.mastersOwned);
  const diamonds = useGame((s) => s.diamonds);
  const setNearMaster = useGame((s) => s.setNearMaster);

  const adaylar = useMemo(() => {
    const sahip = new Set(mastersOwned);
    return LAYOUT.tables.slice(0, tables).flatMap((t, i) => {
      const id = masterId('table', i);
      if (sahip.has(id) || !masterUnlockedForTable(tableLevels[i] ?? 0)) return [];
      return [{ id, pos: t.upgradeSpot }];
    });
  }, [tables, tableLevels, mastersOwned]);

  const son = useRef<string | null>(null);
  const oncekiPos = useRef<[number, number]>([0, 0]);
  /**
   * G-79 ② — DWELL KENAR-TETİKLİ: oyuncu bir kez HAREKET edene kadar dolum başlamaz.
   *
   * Kullanıcı 2026-09-18: *"oyun ilk açıldığında… o an bir usta padi üzerinde durduğu için
   * otomatik ekrana direk o modal geliyor; ya doğum yeri değişsin ya da o düzelsin."*
   * Kök neden doğum yeri DEĞİL, tetiğin tanımı: dolum "duruyor" koşuluna bakıyordu ve yüklemenin
   * ilk karesinde oyuncu tanım gereği duruyor. Yani noktanın üstünde AÇILMAK, oraya YÜRÜMEKLE
   * aynı sayılıyordu. `feedback_interaction_model`: etkileşim HAREKET-temellidir.
   *
   * Doğum yerini kaydırmak yanlış çözüm olurdu — nokta gezici (masa Usta olunca doğar), yani
   * bugün temiz olan doğum yeri yarın yine bir noktanın üstünde kalabilirdi. Kelepçe tetikte
   * olmalı: en ufak bir hareket kolu kurar, ondan sonra davranış birebir eskisi gibidir.
   */
  const kuruldu = useRef(false);
  useFrame((_, dt) => {
    const g = useGame.getState();
    const p = g.player;

    // G-14 ② — MODAL YAKLAŞINCA DEĞİL, DURUNCA AÇILIR (kullanıcı 2026-09-09).
    // Yalnız yakınlık yeterli sayılınca oyuncu masanın yanından geçerken bile modal açılıyordu.
    // Artık noktanın kalın çerçevesi oyuncu HAREKETSİZKEN dolar; dolunca modal açılır. Hareket
    // ölçüsü kare-başı yer değiştirme: joystick bırakılınca sıfırlanır, yürürken dolum sıfırlanır.
    const hiz = Math.hypot(p[0] - oncekiPos.current[0], p[2] - oncekiPos.current[1]) / Math.max(dt, 1e-4);
    oncekiPos.current = [p[0], p[2]];
    if (hiz >= DURMA_HIZI) kuruldu.current = true; // G-79 ②: ilk hareket kolu kurar
    const duruyor = kuruldu.current && hiz < DURMA_HIZI;

    // K4: tetik ÇİZİLEN çerçeve, kapatılan nokta çıkılana kadar kilitli (`ustaKaresi`).
    const k = ustaKaresi(adaylar, p[0], p[2], duruyor, dt, { p: dwellState.p, kapali: g.ustaKapali });
    dwellState.p = k.p;
    dwellState.id = k.id;
    if (k.kapali !== g.ustaKapali) useGame.setState({ ustaKapali: k.kapali });

    // React'e yalnız EŞİK geçilince dokunulur — her kare setState = 60 render/sn.
    if (k.acik !== son.current) { son.current = k.acik; setNearMaster(k.acik); }
  });

  const fiyat = masterCost();
  const yeter = diamonds.toNumber() >= fiyat;
  return (
    <>
      {adaylar.map((a) => (
        <GroundMarker
          key={a.id}
          pos={a.pos}
          // G-11: "Usta" yazısı kalktı — söz her yerde aynı, kimliği 💎 pulu taşıyor.
          // G-14 ②: biçim öteki yükseltme noktalarıyla AYNI (kullanıcı: "yuvarlak yapma").
          // Tek fark dolumun kaynağı: ₺ değil BEKLEME, ve rengi yeşil — dolunca modal açılır.
          label={ETIKET_USTA}
          arrow
          sub={String(fiyat)}
          pip="gem"
          tint="#4fc3f7"
          dwellId={a.id}
          radius={MASA_ISARET_R}
          afford={yeter}
        />
      ))}
    </>
  );
}

// (v29: WaiterUpgradeMarker kalktı — garson hızı karakter panelinden satın alınır.)

function Ground() {
  // Tüm alanları kapsayan AHŞAP zemin (DÜZ renk — canvas-tile geri alındı, kullanıcı 2026-06-11:
  // "zemin iğrenç oldu"). WP6 kozmetik teması KORUNUR: alan overlay'i temanın DÜZ base rengi
  // (+dama temasında quad satranç deseni). KİLİM KALDIRILDI (kullanıcı 2026-06-11: "ortadaki halıya
  // gerek yok, daha soft bir zemin") — alan zemini tek yumuşak düz renk.
  const floorThemeByArea = useGame((s) => s.floorThemeByArea);
  // Kilitli ALANIN zemini ÇİZİLMEZ (2026-06-11: karanlık örtü kalktı — kapalı salon "boş arsa";
  // taban ahşap düzlem dışarıda her yerde zaten görünür, kilitli bölge de onunla aynı kalır).
  const areasOpen = useGame((s) => s.areasOpen);
  return (
    <group>
      {/* B3-1: taban düzlemi katın tamamını (34 × 34) + arka bandı kaplar. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FLOOR_HALF * 2 + 1.2, FLOOR_HALF * 2 + 1.2]} />
        <meshStandardMaterial color={PALETTE.floorWood} />
      </mesh>
      {LAYOUT.areaBounds.slice(0, areasOpen).map((za, z) => {
        // Overlay DUVARA KADAR uzar (DIŞ/kilitli kenarlarda +0.55) — duvar dibinde eski renk şerit
        // kalmaz (kullanıcı bug'ı 2026-06-11). AÇIK komşuya bakan kenar tam sınırda biter (M2:
        // üst üste binen overlay z-fighting yapardı).
        // B3-1: kenarın duvara mı yoksa AÇIK komşuya mı baktığı ızgara sorgusuyla değil
        // geometriyle bulunur — o kenarda duvar parçası varsa (wallSpans boş değilse) overlay
        // duvarın dibine kadar uzar, yoksa tam sınırda biter (üst üste binen overlay z-fighting yapar).
        const ext = (side: 'left' | 'right' | 'front' | 'back') =>
          // Arka yarının ARKA kenarında duvar yok (bant kendi zeminini çiziyor, BM adım 3) →
          // 0,55 uzatılırsa iki zemin düzlemi üst üste biner ve z-fighting yapar.
          side === 'back' && za.minZ === BAND.front
            ? 0
            : wallSpans(z, side, areasOpen).length > 0
              ? 0.55
              : 0;
        const x0 = za.minX - ext('left');
        const x1 = za.maxX + ext('right');
        const z0 = za.minZ - ext('back');
        const z1 = za.maxZ + ext('front');
        const theme = FLOOR_THEMES[floorThemeByArea[z] ?? 'parke'] ?? FLOOR_THEMES.parke;
        return (
          <group key={z}>
            {/* y: taban(0) < tema tabanı(0.004) < desen(0.006) < GroundMarker(0.02).
                G2: plank/tile temada bu düzlem DERZ'dir — tahtaların arasından görünen koyu alt
                katman. Düz/dama temada eskisi gibi zeminin kendi rengi. */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.004, (z0 + z1) / 2]}>
              <planeGeometry args={[x1 - x0, z1 - z0]} />
              <meshStandardMaterial color={theme.grout ?? theme.base} />
            </mesh>
            <FloorPattern theme={theme} x0={x0} x1={x1} z0={z0} z1={z1} />
          </group>
        );
      })}
    </group>
  );
}

// Duvarlar yalnız AÇIK ALANLARI sarar (2026-06-11 telefon feedback'i: karanlık örtü hacmi mobilde
// AYDINLIK göründü + alan sınırındaki kelepçe "görünmez engel" hissi verdi → örtü KALDIRILDI, bina
// kilitliyken 1. alanı 4 GERÇEK duvarla biter; sağ duvar alan sınırına oturur = kelepçe duvar olur).
// 2. alan kilitliyken HİÇ ÇİZİLMEZ (yanı düz "boş arsa"); pad açılınca bina sağa uzar (kamera panı var).
/**
 * VİTRİN — cephenin cam bandı (S6/②, D-105). Ölçüler `cepheLook.ts`te, çizim burada.
 *
 * ÜÇ ŞEY BİLEREK BÖYLE:
 *  1. **Camın ARKASINDA panel YOK.** `Decor.Pencere` yan duvarda camın arkasına opak bir
 *     "dışarısı gündüz" paneli koyar; cephede o panel camı delik olmaktan çıkarır, kapalı bir
 *     renk şeridine çevirirdi. Ölçüm camın ardında gösterilecek şeyin ZATEN VAR olduğunu
 *     söylüyor (giriş holü, z 14,88…17,39, 10 dekor öğesi).
 *  2. **İki InstancedMesh** (kasa + cam), göz başına ayrı mesh değil. Rapor §Ş 4 göz/yarı için
 *     40 ek çizim çağrısı saymıştı; instanslanınca bedel **2** oluyor.
 *  3. **Gölge yok.** `Decor.Pencere`nin dersi: ince doğrama çubukları gölge atınca cam kirleniyor.
 */
function Vitrin({ areasOpen }: { areasOpen: number }) {
  const gozler = useMemo(() => vitrinGozleri(areasOpen), [areasOpen]);
  const boy = VITRIN.ust - VITRIN.kaide;
  const t = VITRIN.kasa;
  /** Doğramanın dört çubuğu, göz başına — [x ofseti, y, en, boy]. */
  const kasalar = useMemo(
    () =>
      gozler.flatMap((g) => [
        [g.x, VITRIN.ust - t / 2, g.z, g.en, t] as const,
        [g.x, VITRIN.kaide + t / 2, g.z, g.en, t] as const,
        [g.x - g.en / 2 + t / 2, VITRIN.kaide + boy / 2, g.z, t, boy] as const,
        [g.x + g.en / 2 - t / 2, VITRIN.kaide + boy / 2, g.z, t, boy] as const,
      ]),
    [gozler, boy, t],
  );
  const kutu = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const kasaMat = useMemo(() => new MeshStandardMaterial({ color: PALETTE.glassFrame }), []);
  const camMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: PALETTE.glass,
        emissive: PALETTE.glass,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.34,
      }),
    [],
  );
  const kasaRef = useRef<InstancedMesh>(null);
  const camRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const d = new Object3D();
    const km = kasaRef.current;
    if (km) {
      kasalar.forEach(([x, y, z, w, h], i) => {
        d.position.set(x, y, z);
        d.scale.set(w, h, WALL_T_BODY);
        d.updateMatrix();
        km.setMatrixAt(i, d.matrix);
      });
      km.count = kasalar.length;
      km.instanceMatrix.needsUpdate = true;
    }
    const cm = camRef.current;
    if (cm) {
      gozler.forEach((g, i) => {
        d.position.set(g.x, VITRIN.kaide + boy / 2, g.z);
        d.scale.set(g.en - 2 * t, boy - 2 * t, 0.04);
        d.updateMatrix();
        cm.setMatrixAt(i, d.matrix);
      });
      cm.count = gozler.length;
      cm.instanceMatrix.needsUpdate = true;
    }
  }, [kasalar, gozler, boy, t]);

  if (gozler.length === 0) return null;
  return (
    <group>
      {/* frustumCulled=false: batch'in sınır küresi origin'de kalır (WallPanels ile aynı gerekçe) */}
      <instancedMesh key={`k${kasalar.length}`} ref={kasaRef} args={[kutu, kasaMat, kasalar.length]} receiveShadow frustumCulled={false} />
      <instancedMesh key={`c${gozler.length}`} ref={camRef} args={[kutu, camMat, gozler.length]} frustumCulled={false} />
    </group>
  );
}

// TEK KAPI (1. alanın ortası; D-023 — tüm müşteriler buradan girer/çıkar). Açıkken İÇ BÖLME DUVARI YOK.
function Walls() {
  const areasOpen = useGame((s) => s.areasOpen);
  const kabuk = useGame((s) => s.kabuk);
  // WP6: duvar teması ALAN başına (wallThemeByArea persist). M2: duvarlar alan-kenarı başına üretilir →
  // tema bölmesi kendiliğinden doğru (her parça kendi ALANININ temasını giyer).
  const wallThemeByArea = useGame((s) => s.wallThemeByArea);
  const themeOf = (z: number) => WALL_THEMES[wallThemeByArea[z] ?? 'krem'] ?? WALL_THEMES.krem;
  const h = WALL_H; // BM: yükseklik + katmanlar wallPanel.tsx'te (mağaza önizlemesiyle ortak)
  const doorHalf = DOOR.half;
  // TEK KAPI. B3-2: 2. Alan açılınca cephenin ortasına kayar (maket v13 adım 2) → `doorAt`.
  const dx0 = doorAt(areasOpen);
  // S4: parça listesi `wallLook.WALL_RUNS`ta — GEOMETRİ oradan gelir, tema burada giydirilir.
  // Liste Scene'in içindeyken vitest'te import edilemiyordu (`recolor` → `Image`), yani hiç
  // bekçilenemedi: "hat kaç metre, KayKit modülüne bölünüyor mu" sorusu koda bakmadan
  // yanıtlanamıyordu. `kitchenLook.ts` (S3) aynı deseni mutfak için kurmuştu.
  const runs = WALL_RUNS(areasOpen);
  // S6/E3: pencere artık duvarın YÜZEYİNE yapışan bir levha değil, duvarda GERÇEK boşluk.
  // Hangi hattın nerede delineceği `wallLook.pencereBosluklari` ile `config/decor.ts`ten TÜRER
  // (pencere yeri iki dosyaya ayrı ayrı yazılmaz — D-015). Bölme saf fonksiyonda, bekçisi var.
  // NOT: `kabuk === 'kaykit'` kolu bölünmemiş listeyi kullanır; o kol D-100'de reddedildi ve
  // yalnız geri dönüş için duruyor.
  // S6/② (D-105): CEPHE VİTRİNİ aynı mekanizmaya biniyor — vitrin gözleri de birer duvar
  // açıklığı. Pencereyle tek fark, açıklığın nereden TÜREDİĞİ: pencere `config/decor.ts`ten,
  // vitrin `cepheLook`tan. İkisi de aynı `wallPieces`a giriyor, yani cam bandında hiç duvar
  // üretilmemesi ayrı bir kod yolu değil.
  const pieces: WallSlab[] = wallPieces(runs, [...pencereBosluklari(areasOpen), ...cepheBosluklari(areasOpen)]).map((r) => ({
    x: r.x,
    z: r.z,
    w: r.w,
    d: r.d,
    theme: themeOf(r.area),
    y0: r.y0,
    h: r.h,
  }));
  const frontEdgeZ = LAYOUT.areaBounds[0].maxZ + WALL_M; // kapı sövesi referansı
  return (
    <group>
      {/* S4: iki kabuk kipi YAN YANA durur — maket duvarı silinmedi (kullanıcı: "beğenmezsek
          eskisine dönebilir olalım"). Geri dönüş `config/kabuk.ts`in tek satırı. */}
      {kabuk === 'kaykit' ? <KayWalls runs={runs} theme={themeOf(0)} /> : <WallPanels slabs={pieces} />}
      <BackBand areasOpen={areasOpen} />
      <Vitrin areasOpen={areasOpen} />
      <LavaboFront />
      {/* ANA GİRİŞ — maket v13'ün giriş bloğunun transkripsiyonu (BM adım 1).
          Sıra aşağıdan yukarı: iki söve (0…2,65) · lento (2,65) · ALINLIK (2,65…3,20) · üst kordon.
          Alınlık olmadan kapı boşluğu duvarla birlikte 3,2'ye uzuyor ve cephe tepesinden "kesik"
          okunuyordu. Söve/lento/kordon duvarın önünde (z + 0,22) → z-fighting yok; alınlık ise
          duvar HATTINDA ve gövde kalınlığında, çünkü o duvarın kendi devamı. */}
      <group>
        <mesh position={[dx0, (DOOR.height + h) / 2, frontEdgeZ]} castShadow receiveShadow>
          <boxGeometry args={[doorHalf * 2 + 0.4, h - DOOR.height, 0.18]} />
          <meshStandardMaterial color={themeOf(0).cream} />
        </mesh>
        <mesh position={[dx0, DOOR.height + 0.08, frontEdgeZ + 0.22]}>
          <boxGeometry args={[doorHalf * 2 + 0.6, 0.16, 0.34]} />
          <meshStandardMaterial color={PALETTE.lintel} />
        </mesh>
        <mesh position={[dx0, h - 0.05, frontEdgeZ + 0.22]}>
          <boxGeometry args={[doorHalf * 2 + 0.6, 0.1, 0.34]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
        <mesh position={[dx0 - doorHalf, DOOR.height / 2, frontEdgeZ + 0.22]}>
          <boxGeometry args={[SOVE_W, DOOR.height, 0.42]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
        <mesh position={[dx0 + doorHalf, DOOR.height / 2, frontEdgeZ + 0.22]}>
          <boxGeometry args={[SOVE_W, DOOR.height, 0.42]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * ARKA BANT — servis köşesi · merdiven kovası · lavabo (maket v13; üçü de z = −9,8'de biter).
 *
 * **BM adım 3 (D-070/D-072): bant KÜTLE olmaktan çıktı, maketin ODALARI oldu.**
 * B3-1'de bant üç düz krem kutuydu; gerekçesi "kamera 45°'den tepesini görüyor, boş zemin
 * bırakılamaz"dı ve duvar 1,2 iken makul bir kesitti. Duvar 3,2'ye çıkınca o üç kutu kadrajın
 * beşte birini kaplayan bomboş bir krem yüzeye dönüştü (`docs/b6b-arka-bant.html` bulgu 3).
 * Maketin çözümü zaten hazırdı: bant bir kütle değil, **binanın arka odaları**.
 *
 * Kuruluş (maketin `buildFloor1`'i):
 *  - **Bina kabuğu** — arka duvar + iki yan duvarın bandı saran parçaları, salonun duvarıyla
 *    aynı dilde (3,2 · `WallPanels` · alanın duvar teması). Bandı KAPATAN şey artık bu.
 *  - **Ara duvarlar 2,2** (`MaketWall`, x = ∓4,6) — maketin kendi gerekçesi: *"kamera içeri
 *    görsün"*. Üç blok üstten de birbirinden ayrılır.
 *  - **Servis köşesi** (x −17…−4,6): fayans zemin + arka duvarda hazırlık hattı (cezve ocağı ·
 *    tezgâh · raflar), sol duvarda bulaşık, doğu ucunda depo (kasalar · damacana rafı). Salona
 *    bakan yüzü AÇIK — oyunun servis tezgâhı zaten bandın önünde (`PLACE_BACK_BAND`), maket de
 *    ön tezgâhı bandın ağzına koyuyor.
 *  - **Merdiven kovası** (x ∓4,6): maketin `merdivenHarap`'ı + uyarı şeridi + dubalar. Perde YOK
 *    (maketin kendi notu: perde orayı yeni bir oda gibi gösterir; üst kat olduğu görünsün).
 *  - **Lavabo** (x 4,6…17): açıkken `MaketLavaboBlock`, kapalıyken maketin `tadilatPerde`'si.
 *
 * BANT HÂLÂ YÜRÜNMEZ: alanlar z = −9,8'de biter (`clampToOpenAreas`), burada değişen tek şey
 * GÖRÜNTÜ. Duvarlar zaten collision değil (`activeSolids`), o yüzden nav/denge etkilenmez.
 */
function BackBand({ areasOpen }: { areasOpen: number }) {
  const lavaboOpen = useGame((s) => s.padsDone.includes('lavabo'));
  const kabuk = useGame((s) => s.kabuk);
  const wallThemeByArea = useGame((s) => s.wallThemeByArea);
  const floorThemeByArea = useGame((s) => s.floorThemeByArea);
  if (areasOpen < 3) return null; // arka yarı açılmadan bant görünmez (kilitli alan çizilmez, D-057)

  const theme = WALL_THEMES[wallThemeByArea[2] ?? 'krem'] ?? WALL_THEMES.krem;
  const floor = FLOOR_THEMES[floorThemeByArea[2] ?? 'parke'] ?? FLOOR_THEMES.parke;
  const zf = BAND.front; // −9,8
  const zb = BAND_SHELL.back; // −17,4 (duvar hattı)
  const xl = BAND_SHELL.left;
  const xr = BAND_SHELL.right;
  // Bina kabuğu — salonun duvarıyla AYNI bileşen, yani aynı kip ve aynı tema.
  const shellRuns = BAND_SHELL_RUNS();
  const shell: WallSlab[] = shellRuns.map((r) => ({ x: r.x, z: r.z, w: r.w, d: r.d, theme }));
  // Servis köşesinin fayans zemini (maket: floorPatch(−10,8 · −13,35 · 12,2 × 7,0 · floorTile)) —
  // oyunda oda 0,5 daha geniş olduğu için ölçü duvarın İÇ YÜZLERİNDEN türetilir.
  const sx0 = BAND_SHELL.innerLeft;
  const sx1 = BAND.service.maxX - 0.1;
  const sz0 = BAND_SHELL.innerBack;
  const sz1 = zf - 0.05;
  // Yıkık merdiven bandın 0,4 içinden başlar: sahanlığı arka duvarın iç yüzüne değmesin
  // (14 × 0,46 + 0,3 + 0,3 = 7,04 derinlik, bandın derinliği 7,6).
  const stairZ = zf - 0.4;

  return (
    <group>
      {kabuk === 'kaykit' ? <KayWalls runs={shellRuns} theme={theme} /> : <WallPanels slabs={shell} />}
      {/* bandın zemini: salonunkiyle aynı tema (maket de arka yarının tamamını tek ahşapla döşer) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(xl + xr) / 2, 0.004, (zb + zf) / 2]}>
        <planeGeometry args={[xr - xl, zf - zb]} />
        <meshStandardMaterial color={floor.grout ?? floor.base} />
      </mesh>
      <FloorPattern theme={floor} x0={xl} x1={xr} z0={zb} z1={zf} />
      {/* servis köşesinin fayansı (mutfak zemini — ahşabın üstünde ince bir kat) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[(sx0 + sx1) / 2, 0.012, (sz0 + sz1) / 2]}>
        <planeGeometry args={[sx1 - sx0, sz1 - sz0]} />
        <meshStandardMaterial color="#d9cdb4" />
      </mesh>

      {/* ara duvarlar (2,2): servisin doğusu · lavabonun batısı — ikisi de merdiven kovasının yüzü */}
      <MaketWall x1={BAND.service.maxX} z1={zb} x2={BAND.service.maxX} z2={zf} h={BAND_SHELL.roomH} />
      <MaketWall x1={BAND.wc.minX} z1={zb} x2={BAND.wc.minX} z2={zf} h={BAND_SHELL.roomH} />

      {/* SERVİS KÖŞESİ (S3) — arka duvarda 7 modüllük KayKit hattı, doğu ucunda depo.
          Yerleşimin TEK kaynağı `kitchenLook.KITCHEN_UNITS`; buraya koordinat yazılmaz. */}
      <Kitchen />

      {/* MUTFAĞIN SINIRI (S20 · E2 · D-118) — ön hattın İKİ UCUNDAKİ açıklığı kapatır.
          Ölçüm batıda 2,81 br, doğuda 1,70 br boşluk buldu; ikisi de geçiş eşiğinin (0,94)
          üstünde ve oyuncu odanın 0,05 br yanında durup oradan giremiyordu — yanlış vaat.
          SALT GÖRSEL: collision yok, kelepçe zaten geçirmiyor. Ölçü `sinirBolmeleri`nden. */}
      {sinirBolmeleri(areasOpen).map((b) => (
        <group key={b.uc} position={[b.x, 0, b.z]}>
          <KayTezgah
            model="kitchencounter_straight_B"
            w={b.w}
            d={b.d}
            topY={FRONT_TOP_Y}
            fallback={
              <mesh castShadow receiveShadow position={[0, FRONT_TOP_Y / 2, 0]}>
                <boxGeometry args={[b.w, FRONT_TOP_Y, b.d]} />
                <meshStandardMaterial color={PALETTE.counterWood} />
              </mesh>
            }
          />
        </group>
      ))}

      {/* MERDİVEN KOVASI — yıkık merdiven + uyarı şeridi + dubalar (hepsi bandın İÇİNDE:
          oyuncu z = −9,8'de duruyor, salona taşan hiçbir parça olmasın diye maketin
          salon tarafındaki dubaları kovanın içine alındı). */}
      <MaketMerdivenHarap pos={[0, 0, stairZ]} />
      <MaketUyariSeridi x1={-4.2} x2={4.2} z={zf - 0.1} />
      {[-3.6, 0, 3.6].map((x) => (
        <MaketDuba key={x} pos={[x, 0, zf - 0.25]} />
      ))}

      {/* LAVABO — açıkken oda, kapalıyken TADİLAT (kilitli obje çizilmez değil, yıkık durur) */}
      {lavaboOpen ? (
        <MaketLavaboBlock />
      ) : (
        <group>
          {/* Maketin `s === 3` bloğu: perdenin ARKASI boş kalmaz — tadilat sürüyor.
              Perde 2,4, kabuk 3,2 → kamera perdenin üstünden içeriyi görüyor; iskele ve moloz
              olmasaydı "kapalı oda" değil "boş oda" okunurdu. */}
          <MaketTadilatPerde x1={BAND.wc.minX} x2={BAND_SHELL.innerRight} z={zf} />
          <MaketIskele len={4.4} pos={[12.0, 0, -12.4]} />
          <MaketMoloz pos={[7.0, 0, -13.6]} />
          <MaketCrates pos={[BAND_SHELL.innerRight - 1.27, 0, sz0 + 1.07]} />
        </group>
      )}
    </group>
  );
}


/**
 * LAVABO'nun ön yüzü (B4) — bandın `wc` bloğunun salona bakan yüzünde kapı.
 *
 * İki hâli var ve ikisi de KARAR: kapalıyken **tadilat hâli** (tahta perde + uyarı bandı —
 * "kilitli obje çizilmez" DEĞİL, "kilitli obje yıkık durur"), açıldıktan sonra gerçek kapı.
 * Seviye ÜÇ ayrı sinyalle okunur (tek sinyal yetmez): kapı üstündeki nokta sayısı · fayans
 * şeridinin genişlemesi · kapı kanadının açılıp koyulaşan iç boşluğu.
 * Odanın İÇİ (kabinler, ayna, tavan ışığı) ve yıkık merdiven **B4b**'nin işi.
 */
function LavaboFront() {
  const areasOpen = useGame((s) => s.areasOpen);
  const padsDone = useGame((s) => s.padsDone);
  const level = useGame((s) => s.lavaboLevel);
  const fill = useGame((s) => s.lavaboFill);
  const wallet = useGame((s) => s.wallet);
  const canli = useGame((s) => upgradeSpotLiveNow(s, 'lavabo')); // D-142
  if (areasOpen < 3) return null; // bant görünmüyorsa kapısı da yok
  const open = padsDone.includes('lavabo');
  const cost = lavaboUpgradeCost(level);
  const remaining = cost != null ? Math.max(0, Math.ceil(cost - fill)) : 0;
  // AÇIKKEN kapının kendisini `MaketLavaboBlock` çiziyor (gerçek boşluk + lento + WC levhası).
  // S6/③'ten sonra burada duvara çizilen HİÇBİR ŞEY kalmadı; yalnız yükseltme noktası duruyor.
  return (
    <group>
      {/* KAPALIYKEN buraya hiçbir şey çizilmez: tadilat hâlini (tahta perde + iskele + moloz)
          artık `BackBand` maketin `tadilatPerde`'siyle kuruyor. Buradaki eski üç düzlem 1,2'lik
          bandın ölçüsündeydi; 3,2'lik bandın önünde oyuncak gibi kalıyordu ve perdeyle ÇAKIŞIYORDU. */}
      {open && (
        <group>
          {/* ÇİNİ BORDÜR KALDIRILDI (2026-09-07). Seviye sinyali olsun diye kapının iki yanına
              açık mavi şerit koymuştum; maketle yan yana konunca görüldü ki maketin ön duvarındaki
              kesintisiz 0,9 birimlik KOYU LAMBRİ kuşağı kadrajın en güçlü yatay çizgisi ve şeritler
              onu tam ortadan bölüyordu. Maketin duvarında böyle bir kaplama yok.
              (Bu açık kalem S7'de kapandı: sinyal artık odanın İÇİNDE ve iki koldan okunuyor.) */}
          {/* SEVİYE NOKTALARI KALDIRILDI (S6/③, kullanıcı isteği). Lentonun hizasında (y = 2,14)
              seviye kadar sarı daire çiziliyordu; kullanıcı iki turda da onları işaret etti
              ("kapı üstündeki sarı daireler"). İlk turda ben yanlış parçayı — lentonun KENDİSİNİ —
              kaldırmıştım; lento geri geldi, noktalar gitti.

              KAPANDI (S7/L · D-104): o noktalar seviyenin TEK sinyaliydi ve kalkınca seviye
              hiçbir yerden okunmaz olmuştu. Yerine geçen sinyal MEKÂNSAL ve ÇİFT: seviye
              arttıkça hem lavabo hem kabin kapısı SAYISI büyüyor (`wcLook.LAVABO_SAYI_BY_LEVEL`
              + `KABIN_SAYI_BY_LEVEL`). Ölçüm neden ikisi birden olduğunu söylüyor: doğu duvarı
              6 lavabo almıyor (7,40 br, en çok 5) ve en öndeki slot %0 görünür —
              `docs/wc-odasi-raporu-s7.md` §L. */}
        </group>
      )}
      {/* Yükseltme noktası: pad bitince AYNI yerde belirir (obje-başı yükseltme). */}
      {open && canli && cost != null && (
        <GroundMarker
          pos={LAVABO.spot}
          label={ETIKET_LAVABO}
          sub={fmt(remaining)}
          pip="coin"
          tint="#ffce54"
          progress={fill / cost}
          afford={wallet.toNumber() >= remaining}
        />
      )}
    </group>
  );
}

// Dış dünya (D-017 kullanıcı isteği): ön duvarın DIŞINDA sokak + kaldırım + karşı binalar → müşterilerin
// kapıdan girip çıktığı "dış dünya" hissi. Salt görsel (collision yok); low-poly stilize (D-013).
function Street() {
  const areasOpen = useGame((s) => s.areasOpen);
  const e = entranceAt(areasOpen);
  const z1 = STREET_Z0; // ön duvar hattı — sayı `streetLook`ta (Scene'de gömülü duruyordu)
  // z-fighting fix (kullanıcı: "sokakta/kapıda hareket ederken parazitlenme"): sokak düzlemleri zemin (y=0) ile
  // EŞ-DÜZLEM olunca titriyordu (asfalt zemin kenarıyla çakışıyordu). Net y ayrımı (≥0.02) + polygonOffset →
  // kamera hareket ederken titreme biter. Sokak düzlemleri opak → altındaki zemini kapatır (boşluk görünmez).
  //
  // S6 — KARŞI BİNALAR SİLİNDİ. Ölçüm (rapor §V): kamera oyuncunun +z'sinde durup −z'ye baktığı
  // için z > 25,50 hiçbir kadrajda yok; binalar 26,5'teydi ve üç kamera kipinde de görünürlükleri
  // %0 çıktı (tepeleri dahil). Gölgeleri de görünür şeride ulaşmıyor (güneş 14/26/16 → 7 boyunda
  // kütlenin gölgesi z ≈ 22,2, görünür şerit z ≤ 20,5). KayKit `building_A…H` de bu yüzden
  // GİRMEDİ: 10.389 üçgen, %0 karşılık. Bütün harcama görünen kaldırım bandına (z 17,5…20,5) yapıldı.
  return (
    <group>
      {/* kaldırım şeridi (TÜM cephe boyu — alanların kapıları da buraya açılır) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[KALDIRIM.x, 0.04, KALDIRIM.z]}>
        <planeGeometry args={[KALDIRIM.w, KALDIRIM.d]} />
        <meshStandardMaterial color="#9e9e9e" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* asfalt cadde — ortası kadrajda yok ama ÖN KENARI (z 20,0) %3–8 görünüyor, o yüzden kalıyor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[ASFALT.x, 0.02, ASFALT.z]}>
        <planeGeometry args={[ASFALT.w, ASFALT.d]} />
        <meshStandardMaterial color="#37424a" polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      {/* yol orta çizgileri */}
      {[-8, -4, 0, 4, 8, 12, 16, 20].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, ASFALT.z]}>
          <planeGeometry args={[1.4, 0.18]} />
          <meshStandardMaterial color="#c9b458" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>
      ))}
      {/* KALDIRIM MOBİLYASI (S6) — yerleşim `streetLook.STREET_PROPS`ta, burada tek koordinat yok.
          Hepsi salt görsel; `.gltf` gelmezse `StreetFallback` ilkel şekle düşer (greybox-first). */}
      {STREET_PROPS.map((p, i) => {
        const x = propX(p, e[0]);
        return (
          <Model
            key={`${p.model}${i}`}
            src={`/assets/models/kaykit-city-builder-bits/${p.model}.gltf`}
            scale={CITY_S}
            position={[x, 0, p.z]}
            rotation={[0, p.rot ?? 0, 0]}
            fallback={<StreetFallback model={p.model} pos={[x, 0, p.z]} rot={p.rot ?? 0} />}
          />
        );
      })}
      {/* KAPI ÖNÜ (görsel kimlik): TENTE + alınlık tabelası + kaldırımda bahçe masaları + saksılar.
          Salt görsel (collision yok); müşteri yolu (kapı hizası) boş bırakıldı. */}
      {(
        <group key={e[0]}>
          {/* TENTE — maket v13, birebir (S6/F1 kullanıcı kararı). Bedeli ölçüldü ve kabul edildi:
              kapı eşiği kameradan %77 konumda görünmez. Alternatif arandı, yükseklik × derinlik
              düzleminde %0 veren hücre YOK (rapor §F). */}
          <mesh castShadow position={[e[0], TENTE.y, TENTE.z]} rotation={[TENTE.rotX, 0, 0]}>
            <boxGeometry args={[TENTE.w, TENTE.h, TENTE.d]} />
            <meshStandardMaterial color={PALETTE.awning} flatShading />
          </mesh>
          {/* fırfır: tentenin ön kenarından sarkan açık şerit (dikey → kadraja eklediği bir şey yok) */}
          <mesh
            position={[
              e[0],
              TENTE.y - (TENTE.d / 2) * Math.sin(TENTE.rotX) - 0.14,
              TENTE.z + (TENTE.d / 2) * Math.cos(TENTE.rotX),
            ]}
          >
            <boxGeometry args={[TENTE.w, 0.26, 0.05]} />
            <meshStandardMaterial color={PALETTE.awningStripe} />
          </mesh>
          {/* ALINLIK TABELASI (F4c-3 · D-156): alınlığı dolduran levha, lento/kordonun ÖNÜNDE; kafe adı yazar. */}
          <Tabela x={e[0]} />
          {/* bahçe masaları (kapının iki yanı, kaldırımda) + tabureler */}
          {[-2.3, 2.3].map((dx) => (
            <group key={dx} position={[e[0] + dx, 0, z1 + 1.15]}>
              <mesh castShadow position={[0, 0.42, 0]}>
                <cylinderGeometry args={[0.36, 0.36, 0.06, 12]} />
                <meshStandardMaterial color={PALETTE.outdoorTable} />
              </mesh>
              <mesh castShadow position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.06, 0.09, 0.4, 8]} />
                <meshStandardMaterial color={PALETTE.tableLeg} />
              </mesh>
              {[-0.55, 0.55].map((sx) => (
                <mesh key={sx} castShadow position={[sx, 0.17, 0]}>
                  <cylinderGeometry args={[0.13, 0.15, 0.34, 8]} />
                  <meshStandardMaterial color={PALETTE.stool} />
                </mesh>
              ))}
            </group>
          ))}
          {/* saksı bitkiler (duvar dibi, kapının iki yanı) */}
          {[-1.7, 1.7].map((dx) => (
            <group key={`p${dx}`} position={[e[0] + dx, 0, z1 + 0.42]}>
              <mesh castShadow position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.16, 0.12, 0.36, 8]} />
                <meshStandardMaterial color={PALETTE.planter} />
              </mesh>
              <mesh castShadow position={[0, 0.46, 0]}>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshStandardMaterial color={PALETTE.plant} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Sokak parçasının GREYBOX yedeği (CLAUDE.md greybox-first). Ölçüsü modelin kendi dünya
 * kutusundan gelir (`cityBoyut`), elle yazılmaz — model gelmese de sokak aynı hacimde durur.
 */
function StreetFallback({ model, pos, rot }: { model: (typeof STREET_PROPS)[number]['model']; pos: [number, number, number]; rot: number }) {
  const b = cityBoyut(model);
  const renk =
    model === 'bush' ? PALETTE.plant : model === 'car_taxi' ? '#d9b23a' : model === 'firehydrant' ? '#b53a2f' : '#8a8f94';
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh castShadow position={[0, b.h / 2, 0]}>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={renk} flatShading />
      </mesh>
    </group>
  );
}

/**
 * DEV — ÖLÇÜ IZGARASI. Zemine seçilen adımda (örn. maket duvarı 3,20 ↔ KayKit modülü 4,00)
 * kırmızı çizgi ağı çizer; katın kenarı ızgaraya oturmuyorsa artan şerit gözle görülür
 * (34 ÷ 4 = 8,5 modül → sağda/önde yarım modül kalır). Yalnız `import.meta.env.DEV`'de
 * render edilir, üretim ağacına hiç girmez.
 */
function MeasureGrid() {
  const step = useSandbox((s) => s.gridStep);
  const geo = useMemo(() => {
    if (!step) return null;
    const H = FLOOR_HALF;
    const W = 0.07; // çizgi kalınlığı (WebGL'de lineWidth çalışmaz → ince şeritler çizilir)
    const pos: number[] = [];
    const quad = (x0: number, z0: number, x1: number, z1: number) => {
      pos.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1);
    };
    for (let x = -H; x <= H + 1e-6; x += step) quad(x - W, -H, x + W, H);
    for (let z = -H; z <= H + 1e-6; z += step) quad(-H, z - W, H, z + W);
    // katın kendi kenarları: ızgaranın son çizgisi kenara denk gelmiyorsa artan şerit gözükür
    quad(H - W * 2, -H, H, H);
    quad(-H, H - W * 2, H, H);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return g;
  }, [step]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh position={[0, 0.05, 0]} geometry={geo} renderOrder={999}>
      <meshBasicMaterial color="#ff1744" transparent opacity={0.9} side={DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export function Scene() {
  // DEV — F2 ÖLÇÜM KOLU (telefon yükü turu): gölge ve dpr MONTAJ anında sorgu dizesinden
  // gelebilir (`?f2golge=0&f2dpr=1`). Gerekçe `game/devPerf.ts`te: gölgeyi çalışırken açıp
  // kapatmak materyal yeniden derlemesini ölçüme sızdırır. Üretimde `devPerfKol()` çağrılmaz.
  const olcumKolu = import.meta.env.DEV ? devPerfKol() : null;
  // GÖLGE (D-125): oyuncunun tercihi + bu cihazın ölçülmüş sınıfı. DEV ölçüm kolu ikisini de
  // ezer — F2 kolları saf gölge maliyetini ölçebilsin diye.
  const golgeTercihi = useGame((g) => g.settings.golge);
  const [zayifCihaz, setZayifCihaz] = useState(() => cihazSinifiOku() === 'zayif');
  const golgeAcik = olcumKolu ? olcumKolu.golge : golgeAcikMi(golgeTercihi, zayifCihaz ? 'zayif' : 'guclu');
  // K-A: tavan üretimde sabit; DEV ölçüm kolu (`?f2fps=0`) tavansız davranışı geri getirir.
  const fpsTavan = olcumKolu && olcumKolu.fpsTavan >= 0 ? olcumKolu.fpsTavan : KARE_TAVANI_FPS;
  return (
    // GÖLGE AÇIK (D-073 — D-054 kullanıcı tarafından geri alındı, 2026-09-07): maket üstten
    // görüldü ve *"maketteki ışık ve gölgeler baya iyiymiş, gölgeleri tekrar istiyorum"* dendi.
    // Gölge takımı maket v13'ün değerleri (palette.ts LIGHTING): PCF (`shadows="percentage"`) ·
    // 2048 harita · bias/normalBias duvar kalınlığına göre · ortografik ±30. Bedeli ölçülmüştü
    // (kare süresi ~+0,6 ms); Faz 7'de telefonda yeniden ölçülecek.
    <Canvas
      // `percentage` = PCF. Eskiden `soft` (PCFSoft) yazıyordu ama three r184 onu kullanımdan
      // kaldırdı ve ilk gölge karesinde PCF'ye çeviriyor (konsol uyarısıyla) — çizilen gölge
      // birebir aynı, yalnız uyarı ve tür değişimi gidiyor.
      shadows={golgeAcik ? 'percentage' : false}
      // K-A (D-136): r3f'in kendi döngüsü kapalı — kareyi `KareSurucusu` tavanlı sürer.
      frameloop="never"
      camera={{ position: [0, 9, 11], fov: CAMERA_FOV }}
      gl={{ antialias: true, toneMappingExposure: LIGHTING.exposure }}
      dpr={olcumKolu?.kayitDpr ? [1, olcumKolu.kayitDpr] : olcumKolu?.dprTavan ? [1, olcumKolu.dprTavan] : [1, 2]}
    >
      {/* IŞIK (G0) — renkler palette.ts LIGHTING'te, gerekçe orada yazılı.
          NOT: tone mapping ZATEN ACESFilmic (r3f varsayılanı, `flat` verilmedi) — bu yüzden
          burada yeniden atanmıyor, yalnız exposure ile değer aralığı açılıyor. */}
      <KareTavani fps={fpsTavan} olc />
      <AdaptiveResolution />
      <CihazSinifiOlcer onSonuc={setZayifCihaz} />
      <GolgeTazele acik={golgeAcik} />
      <color attach="background" args={[LIGHTING.background]} />
      <fog attach="fog" args={[LIGHTING.background, LIGHTING.fogNear, LIGHTING.fogFar]} />
      {/* Işık takımı `three/lights.tsx`te TEK tanım — mağaza önizlemeleri de aynı bileşeni
          kullanır, böylece kartta gördüğün renk salondakiyle birebir aynı olur.
          Yönlü ışık gölge DÖKMEZ; yalnız yüzey yönüne göre aydınlatma (hacim hissi) verir. */}
      <SceneLights shadows={golgeAcik} />
      <Ground />
      {/* BAHÇE (R4 · D-129) — açılmamış her yer. `Ground`dan SONRA çizilir: çim kilitli alanların
          çıplak ahşabını örter; açılan alan bahçeden düşer ve oynanabilir zemine döner. */}
      <Bahce />
      <Street />
      <Walls />
      <Decor />
      <VitrinDekor />
      <DekorCekimi />
      <BanketIslands />
      <WaiterStation />
      <Stations />
      <KitchenStaff />
      <DishStation />
      <Tables />
      <Customers />
      <Coins />
      <Dishes />
      <Player />
      <Waiter />
      <Dishwasher />
      {/* Zemin işaretleri drei <Text> kullanır; troika fontu ilk Text mount olunca yüklenir ve SUSPEND eder.
          Yalnız bu marker'ları ayrı Suspense'e al → font yüklenirken SADECE küçük işaret yazısı bekler,
          DÜNYA (masa/oyuncu/mutfak) hiç kararmaz (kullanıcı bug'ı: "table2 açılınca sahne kararıyor"). */}
      <Suspense fallback={null}>
        <Pad />
        <StationUpgradeSpots />
        <TableUpgradeMarkers />
        <TableMasterSpots />
      </Suspense>
      {import.meta.env.DEV && <MeasureGrid />}
      <CameraRig />
      <Simulation />
      <QuestPointer />
      <OgreticiIz />
      <PerfProbe />
      <SahneCizimi />
    </Canvas>
  );
}
