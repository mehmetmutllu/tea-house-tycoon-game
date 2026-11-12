import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { MathUtils, MeshBasicMaterial, Path, Shape, type Group, type Mesh } from 'three';
import { activeStep, markerTier } from '../../game/activeStep';
import { dwellState } from '../../game/dwell';
import { useGame } from '../../game/store';
import {
  ETIKET_PUNTO,
  ISARET_R,
  KENAR_PAYI,
  OK_BOSLUK,
  OK_GENIS,
  inFrame,
  markerFrame,
} from '../../game/markerFrame';
import type { Vec3 } from '../../game/types';

/** Oyun fontu (Baloo 2, OFL) — YEREL bundle; troika'nın CDN default fontu kullanılmaz
 * (D-018 dersi + offline APK'da zemin yazıları her zaman çalışsın). */
const GAME_FONT_3D = '/assets/fonts/Baloo2.ttf';

/**
 * ÖLÇEK ARTIK MESAFEYE GÖRE DEĞİŞMEZ (kullanıcı 2026-09-09: "yaklaşınca büyümesi çirkin duruyor").
 * Eskiden işaret uzaktayken 0,55 ölçekte duruyor, oyuncu yaklaştıkça 1,00'e doğru büyüyordu —
 * yani ekranda sürekli nefes alan bir şey vardı. Artık boy SABİT; yalnız oyuncu işaretin
 * ÜZERİNDEYKEN hafif bir kabarma olur. Tek Odak (D-080) katmanlaması ölçekten değil, YAZIDAN
 * devam ediyor: uzaktaki işaret hâlâ yazısız çizilir.
 */
const UZERINDE_BUYUME = 1.12;
/**
 * "ÜZERİNDE" ARTIK ÇERÇEVENİN KENDİSİ — daire değil (S24 · D-121).
 *
 * Eskiden bu test kendi dairesini kuruyordu (`hw × 1,35`) ve ölçüm onun da **%34,3**'ünün
 * çerçeve dışında olduğunu gösterdi: ekran *"buradasın"* diye kabarırken dolum başlamıyor,
 * ya da tersi oluyordu. Artık kabarma ile dolum AYNI kutuya bakıyor; geriye küçük bir pay
 * kalıyor, o da yalnızca kenarda duran oyuncunun kabarmayı kırpık görmemesi için.
 */
const UZERINDE_PAYI = 0.06;
/** Nabız: aktif adımın işareti yalnızca bu kadar oynar (hafif — `feedback_visual_polish`). */
const PULSE_AMP = 0.04;
const PULSE_HZ = 0.52;
/** Ses geçişi yumuşatma katsayısı (MathUtils.damp) — yaklaşınca "pat" diye açılmasın. */
const SAY_DAMP = 14;
/** Yazı bu ses seviyesinin üstünde çizilir. */
const TEXT_ON = 0.55;

/**
 * ÇERÇEVE ÖLÇÜSÜ ARTIK BURADA DEĞİL — `src/game/markerFrame.ts`te (S24 · D-121).
 *
 * S24 ölçümü çerçevenin ikinci bir tüketicisi olduğunu gösterdi: `tick.ts` oyuncunun dolum
 * başlatıp başlatmadığına karar verirken AYRI bir geometri (daire) kullanıyordu ve tetikleyen
 * alanın **%50,4'ü** bu çerçevenin dışında kalıyordu. Ölçü buraya ait olmaktan çıktı, çünkü
 * artık yalnız çizimin değil KURALIN da parçası. Sabitler aşağıda yeniden dışa aktarılıyor:
 * S23'ün bekçisi (`tests/arayuz-s23.test.ts`) onları bu modülden okuyor ve okumaya devam etsin.
 */
export { HARF_EM, ETIKET_PUNTO, OK_GENIS, OK_BOSLUK, KENAR_PAYI } from '../../game/markerFrame';
/** Okun boyu ve çizgi kalınlığı — ENİNE oranla (aday karesi O7'nin oranları). */
export const OK_YUKSEKLIK_ORAN = 0.75;
export const OK_KALINLIK_ORAN = 0.275;

/**
 * Çerçeve: KESİNTİSİZ BEYAZ KENARLIK (D-176, 1.0.7 — kullanıcı dokuz adaydan B'yi seçti; aday
 * aracı `tools/aday-pad.mjs`). Eskiden dört köşe parantezdi, kenar ortaları boştu. Kenarlık
 * kalınlığı · dış köşe yarıçapı yarı-yüksekliğe orandır. Renk (yeşil = aç, sarı = yükselt)
 * artık dolumda okunur; kenar her zeminde belli olsun diye beyaz.
 */
export const CERCEVE = 0.13;
export const KOSE_R = 0.3;
/** İç zeminin çerçeveden içeri kaçtığı pay — kenarlığın DIŞINA taşmasın. */
export const ZEMIN_ICE = 0.055;

/* İşaretin zemin düzlemindeki YEREL ekseni: `rotation=[-PI/2,0,0]` sonrası yerel +Y dünyada
   −Z'ye bakar; yani "yukarı" = kameradan uzağa. Yazı, ok ve dolum bu eksende kurulur. */

/** Elmas silüeti — eski "mavi kare" pulun yerine gerçek taş kesimi (G-08). */
function gemShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.42, 0.34);
  s.lineTo(0.42, 0.34);
  s.lineTo(0.6, 0.1);
  s.lineTo(0, -0.56);
  s.lineTo(-0.6, 0.1);
  s.closePath();
  return s;
}

/**
 * Yuvarlak köşeli dikdörtgen — işaretin İÇ ZEMİNİ.
 *
 * Önce düz `planeGeometry` idi: parantezlerin köşesi yuvarlaktı ama içteki koyu kare keskin
 * kalıyor ve kenarları parantezlerin dışına TAŞIYORDU (kullanıcı 2026-09-09: "etrafındaki
 * çizgilere border radius geldi ama içindeki kareye gelmedi... üstteki çizgilerin etrafından
 * taşıyor"). Zemin artık hem yuvarlak köşeli hem de çerçevenin İÇİNE gömülü (`ZEMIN_ICE`).
 */
function roundedRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + rr);
  s.lineTo(hw, hh - rr);
  s.quadraticCurveTo(hw, hh, hw - rr, hh);
  s.lineTo(-hw + rr, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - rr);
  s.lineTo(-hw, -hh + rr);
  s.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
  s.closePath();
  return s;
}

/**
 * YÜKSELTME OKU — kalın tek chevron (S23 · D-120, aday karesinde O7).
 *
 * Kullanıcı sekiz adayı gerçek çerçeve ve gerçek boyda gördü (`docs/gorsel/ss/s23-ok-adaylari.png`)
 * ve bunu seçti: r = 0,60'lık küçük işarette dolu üçgenli ok bir lekeye dönüyor, tek kalın "^"
 * ise okunuyor ve sade kalıyor.
 *
 * ŞEKİL KENDİ ORİJİNİNDE ORTALIDIR — eski ok tabanından kuruluyordu ve yukarı doğru büyüyerek
 * üst parantezin bandına giriyordu. Ortalı şekil etiketin kendi dikey bandında kalır, yani
 * parantezlerle hiç karşılaşmaz.
 */
function okShape(en: number): Shape {
  const h = en * OK_YUKSEKLIK_ORAN;
  const k = en * OK_KALINLIK_ORAN;
  const s = new Shape();
  const alt = -h / 2;
  s.moveTo(-en / 2, alt);
  s.lineTo(0, alt + h);
  s.lineTo(en / 2, alt);
  s.lineTo(en / 2 - k, alt);
  s.lineTo(0, alt + h - k * 1.9);
  s.lineTo(-en / 2 + k, alt);
  s.closePath();
  return s;
}

/** Yazı · ok · pul zeminin, dolumun ve kenarlığın ÜSTÜNDE çizilir: hepsi saydam geçişte ve derinlik
 *  yazmıyor, sıra verilmezse kameraya uzaklığa göre karışıp ok ve pul soluk görünüyordu (D-176). */
const ON_KATMAN = 10;

/** Kesintisiz yuvarlak kenarlık: dış yuvarlak dikdörtgen − iç yuvarlak dikdörtgen. */
function halkaShape(w: number, h: number, r: number, k: number): Shape {
  const s = roundedRectShape(w, h, r);
  const ic = roundedRectShape(w - 2 * k, h - 2 * k, Math.max(0.01, r - k));
  s.holes.push(new Path(ic.getPoints(12).reverse()));
  return s;
}

/**
 * Sade zemin işareti (D-017 §2): havada rozet / iri disk+koni YOK. Yerde işaret + düz zemin
 * yazısı + maliyet.
 *
 * **TEK BİÇİM (G-10 → 2026-09-09 ikinci tur):** köşe parantezli, dış köşeleri yuvarlatılmış
 * çerçeve; kenar ortaları boş, dolum alttan üste. Usta noktası bir ara yuvarlak yapılmıştı;
 * kullanıcı *"yuvarlak yapma, direkt yükseltme gibi olsun"* dedi — biçim ayrımı kalktı, geriye
 * tek fark kaldı: Usta'da dolum ₺ değil **BEKLEME** ve rengi yeşil (`dwellId`).
 *
 * **C2 — KATMAN AYRIMI (D-038'in dördüncü kanalı).** Hepsi aynı ağırlıkta çizilince "hangisi şu
 * anki adım" okunmuyordu (ölçüm: ekranda ort. 7,8 / en çok 16 işaret). Nokta silinmez, sesi üç
 * kademeye ayrılır (`markerTier`): `aktif` · `konusan` · `sessiz`. Geçiş `useFrame` içinde
 * damp'lenir ve React'e DOKUNMAZ (her kare setState = 60 render/sn).
 */
export function GroundMarker({
  pos,
  label,
  sub,
  pip,
  tint,
  progress = 0,
  afford = false,
  radius = ISARET_R,
  arrow = false,
  dwellId,
}: {
  pos: Vec3;
  label: string;
  sub?: string;
  pip?: 'coin' | 'gem';
  tint: string;
  progress?: number;
  afford?: boolean;
  /** Ölçü tabanı: çerçevenin yarı-yüksekliği (genişlik yazıdan çözülür). */
  radius?: number;
  /** Yükseltme noktası mı — öyleyse yazının soluna düz yukarı ok çizilir (G-12). */
  arrow?: boolean;
  /** Verilirse: oyuncu üstünde DURDUKÇA işaret YEŞİL dolar; dolunca onay modali açılır.
   *  (Usta noktaları. Biçim ayrı değil — kullanıcı 2026-09-09: "yuvarlak yapma, yükseltme gibi olsun".) */
  dwellId?: string;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const r = radius;
  const punto = r * ETIKET_PUNTO;
  const okBlok = arrow ? (OK_GENIS + OK_BOSLUK) * r : 0;
  // ÇERÇEVE TEK YERDEN GELİR (D-121): burada yeniden hesaplanmaz, `tick.ts` de aynısını çağırır.
  const { hw, hh } = markerFrame(label, r, arrow);
  const yaziSol = -hw + KENAR_PAYI * r + okBlok;
  const okX = -hw + KENAR_PAYI * r + (OK_GENIS * r) / 2;

  const scaleRef = useRef<Group>(null);
  const speakRef = useRef<Group>(null);
  const fillRef = useRef<Mesh>(null);
  const say = useRef(0);
  const buyume = useRef(1);

  const bracketMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  const plateMat = useMemo(
    () => new MeshBasicMaterial({ color: '#14202a', transparent: true, opacity: 0.16, depthWrite: false }),
    [],
  );
  useEffect(() => () => { bracketMat.dispose(); plateMat.dispose(); }, [bracketMat, plateMat]);

  const gem = useMemo(() => gemShape(), []);
  const ok = useMemo(() => okShape(OK_GENIS * r), [r]);
  const kenar = useMemo(() => halkaShape(2 * hw, 2 * hh, hh * KOSE_R, hh * CERCEVE), [hw, hh]);
  // Zemin çerçeveden ZEMIN_ICE kadar içeride ve köşeleri parantezle AYNI yarıçapta.
  const zeminW = 2 * (hw - hh * ZEMIN_ICE);
  const zeminH = 2 * (hh - hh * ZEMIN_ICE);
  const zemin = useMemo(() => roundedRectShape(zeminW, zeminH, hh * KOSE_R), [zeminW, zeminH, hh]);

  useFrame((state, dt) => {
    const tier = markerTier(pos, activeStep, useGame.getState().player);
    say.current = MathUtils.damp(say.current, tier === 'sessiz' ? 0 : 1, SAY_DAMP, dt);
    const s = say.current;

    if (scaleRef.current) {
      const pulse = tier === 'aktif'
        ? 1 + PULSE_AMP * Math.sin(state.clock.elapsedTime * PULSE_HZ * Math.PI * 2)
        : 1;
      const pl = useGame.getState().player;
      const uzerinde = inFrame(pl[0], pl[2], pos, { hw, hh }, UZERINDE_PAYI);
      buyume.current = MathUtils.damp(buyume.current, uzerinde ? UZERINDE_BUYUME : 1, 12, dt);
      scaleRef.current.scale.setScalar(buyume.current * pulse);
    }
    if (speakRef.current) speakRef.current.visible = s > TEXT_ON;
    const loud = tier === 'aktif' ? 1 : afford ? 0.95 : 0.72;
    bracketMat.opacity = 0.45 + (loud - 0.45) * s;
    plateMat.opacity = 0.1 + ((afford ? 0.34 : 0.24) - 0.1) * s;
  });

  // Dolum: alttan üste (kare) — ölçekle birlikte kaydırılır ki alt kenara yapışsın.
  const fillH = zeminH * 0.9;
  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.scale.y = p;
      fillRef.current.position.y = -fillH / 2 + (fillH * p) / 2;
    }
  }, [p, fillH]);

  return (
    <group position={[pos[0], 0, pos[2]]} name={`isaret:${label}`} userData={{ olcum: { label, r, hw, hh, arrow } }}>
      <group ref={scaleRef} name="isaret-olcek">
        {/* şeffaf koyu zemin — yazı ve çerçeve açık ahşabın üstünde okunsun */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={plateMat}>
          <shapeGeometry args={[zemin]} />
        </mesh>

        {/* ₺ dolumu — ALTTAN ÜSTE */}
        {p > 0.001 && (
          <group position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh ref={fillRef}>
              <planeGeometry args={[zeminW * 0.9, fillH]} />
              <meshBasicMaterial color={tint} transparent opacity={0.42} depthWrite={false} />
            </mesh>
          </group>
        )}

        {/* BEKLEME dolumu (Usta) — aynı kare, aynı yön, YEŞİL. Oyuncu üstünde durdukça dolar,
            dolunca onay modali açılır. React'e dokunmaz: ölçek her karede `dwellState`ten yazılır. */}
        {dwellId && <DwellFill w={zeminW * 0.9} h={fillH} dwellId={dwellId} />}

        {/* kesintisiz beyaz kenarlık (D-176) */}
        <mesh name="kenar" position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={bracketMat}>
          <shapeGeometry args={[kenar]} />
        </mesh>

        {/* KONUŞAN katman: yazı + maliyet. Sessizken hiç çizilmez. */}
        <group ref={speakRef} visible={false}>
          {arrow && (
            /* Ok, YAZININ dikey bandında durur (ikisi de -hh·0,3'te ortalı). Eski hâl tabandan
               yukarı büyüyordu ve üst parantezin bandına 0,006 birim kalıyordu. */
            <mesh name="ok-uc" position={[okX, 0.05, -hh * 0.3]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ON_KATMAN}>
              <shapeGeometry args={[ok]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
            </mesh>
          )}
          <Text
            name="etiket"
            renderOrder={ON_KATMAN + 2}
            font={GAME_FONT_3D}
            fontWeight={800}
            letterSpacing={0.02}
            position={[arrow ? yaziSol : 0, 0.05, sub ? -hh * 0.3 : 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={punto}
            color="#ffffff"
            anchorX={arrow ? 'left' : 'center'}
            anchorY="middle"
            outlineWidth={punto * 0.1}
            outlineColor="#14202a"
            maxWidth={2 * hw - okBlok - KENAR_PAYI * r * 2}
            textAlign={arrow ? 'left' : 'center'}
          >
            {label}
          </Text>
          {sub && (
            <>
              {pip && (
                <group position={[-(0.12 + sub.length * 0.1) * r, 0.05, hh * 0.52]}>
                  {/* Elmas GERÇEK taş silüeti, para pulu YUVARLAK — renk körü bir oyuncu için de
                      iki para birimi biçimden ayrılır (feedback_upgrade_legibility). */}
                  {pip === 'gem' ? (
                    <>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[r * 0.5, r * 0.5, 1]} renderOrder={ON_KATMAN}>
                        <shapeGeometry args={[gem]} />
                        <meshBasicMaterial color="#0277bd" transparent depthWrite={false} />
                      </mesh>
                      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * 0.4, r * 0.4, 1]} renderOrder={ON_KATMAN + 1}>
                        <shapeGeometry args={[gem]} />
                        <meshBasicMaterial color="#81d4fa" transparent depthWrite={false} />
                      </mesh>
                    </>
                  ) : (
                    <>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={ON_KATMAN}>
                        <circleGeometry args={[r * 0.19, 20]} />
                        {/* `transparent`: saydam zemin saydam geçişte SONRA çizildiği için opak pul
                            onun altında kalıp soluk görünüyordu (D-176 aday turunda bulundu). */}
                        <meshBasicMaterial color="#ffc933" transparent depthWrite={false} />
                      </mesh>
                      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ON_KATMAN + 1}>
                        <ringGeometry args={[r * 0.14, r * 0.19, 20]} />
                        <meshBasicMaterial color="#b87400" transparent depthWrite={false} />
                      </mesh>
                    </>
                  )}
                </group>
              )}
              <Text
                renderOrder={ON_KATMAN + 2}
                font={GAME_FONT_3D}
                fontWeight={800}
                position={[pip ? 0.13 * r : 0, 0.05, hh * 0.52]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={r * 0.36}
                color="#ffe082"
                anchorX="center"
                anchorY="middle"
                outlineWidth={r * 0.026}
                outlineColor="#14202a"
              >
                {sub}
              </Text>
            </>
          )}
        </group>
      </group>
    </group>
  );
}

/**
 * Bekleme dolumu — `dwellState`i her karede okuyup yeşil dikdörtgeni alttan üste büyütür.
 * Ayrı bileşen ve `useFrame` içinde ölçek yazıyor, çünkü bunu React state'i ile yapmak saniyede
 * 60 render demekti (`activeStep`/`dwellState` deseni, D-038).
 */
function DwellFill({ w, h, dwellId }: { w: number; h: number; dwellId: string }) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const d = dwellState.id === dwellId ? dwellState.p : 0;
    m.visible = d > 0.005;
    if (!m.visible) return;
    m.scale.y = d;
    m.position.y = -h / 2 + (h * d) / 2;
  });
  return (
    <group position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={mesh} visible={false}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#5ddb6a" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}
