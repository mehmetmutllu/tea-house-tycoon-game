import { Suspense, lazy, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { HUD } from './components/ui/HUD';
import { Joystick } from './components/ui/Joystick';
import { SplashScreen } from './components/ui/SplashScreen';
import { kayitVerisi, useGame } from './game/store';
import { sesiBagla } from './game/audioBridge';
import { analitigiBagla } from './game/analitik';
import { reklamAbone, reklamBaslat, reklamEkranda, reklamYenidenKur } from './game/ads';
import { sesDuraklat } from './game/audioWeb';
import { HataSiniri, SahneKurtarici } from './components/ui/HataSiniri';
import { magazaYenile, satinAlmaBaslat, uzlasmaDinle } from './game/iap';
import { bulutBaslat, bulutDongusu, bulutKaydet } from './game/bulut';
import { kayitSorunu, kayitSorunuGoruldu, type KayitSorunu } from './game/save';
import { t } from './i18n';

/** Kayıt açılırken sorun çıktıysa oyuncuya BİR KEZ söylenir (Sprint A P3: sessiz sıfırlama yok). */
const KAYIT_SORUNU: Record<KayitSorunu, string> = {
  yedekten: 'Kayıt sorunu oluştu. Yedekten devam ediyorsun.',
  onarildi: 'Kayıt düzeltildi. İlerlemen korundu.',
  sifirdan: 'Kayıt okunamadı. Yeni oyun başladı. Eski kaydın cihazda duruyor; destekten yardım alabilirsin.',
};

const KEY_MAP: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

// Prototip mobilya sayfası: ?proto ile oyun yerine açılır. import.meta.env.DEV üretimde false'a
// derlendiği için hem bu dal hem de dinamik import ölü kod olur — sayfa üretim paketine hiç girmez.
const IS_PROTO =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('proto');

const FurniturePrototype = import.meta.env.DEV
  ? lazy(() =>
      import('./components/three/FurniturePrototype').then((m) => ({ default: m.FurniturePrototype })),
    )
  : null;

// 3D SAHNE AYRI PARÇADA (Faz F kod-bölme): three · r3f · drei ilk paketin ~%70'iydi. İlk paket artık
// React + arayüz + oyun mantığı; açılış ekranı hemen çizilir, sahne arkasından iner. Ekran sahnenin
// yükleyicisini `game/yukleme` üzerinden bekler — parça inmeden "hazır" demez.
const Scene = lazy(() => import('./components/three/Scene').then((m) => ({ default: m.Scene })));

// Geliştirici sandbox'ı (her şeyin seviyesini elle ayarla) — yalnız dev; üretimde import edilmez.
const DevSandbox = import.meta.env.DEV
  ? lazy(() => import('./components/ui/DevSandbox').then((m) => ({ default: m.DevSandbox })))
  : null;

export default function App() {
  useEffect(() => {
    if (IS_PROTO) return;
    useGame.getState().init();
    const sorun = kayitSorunu();
    if (sorun) {
      useGame.setState({ notice: { text: t(KAYIT_SORUNU[sorun]), ttl: 8, kind: 'reveal' } });
      kayitSorunuGoruldu();
    }
    // F3: reklam SDK'sı + rıza (UMP). Başarısız olursa oyun reklamsız devam eder.
    void reklamBaslat();
    // F4a + Sprint A (P2): mağazanın her müşteri bilgisi (açılış · dinleyici · geri yükleme) kayda uzlaşır —
    // işlenmemiş işlem bir kez ödenir, reklamsız asimetrik eşitlenir. Okunamazsa kayıttaki önbellek geçerli.
    const uzlasmaCoz = uzlasmaDinle((m) => useGame.getState().magazaUzlasUygula(m));
    void satinAlmaBaslat();
    // F4b: Play Games — açılışta sessiz giriş; bağlıysa bulut eşitlenir (daha ileri kayıt kazanır).
    void bulutBaslat({
      yerel: () => kayitVerisi(useGame.getState()),
      yukle: (d) => useGame.getState().bulutKaydiYukle(d),
    });
    const bulutCoz = bulutDongusu();
    // Hile kancaları (__game/__addMoney/__setState...) yalnız geliştirmede yüklenir.
    if (import.meta.env.DEV) void import('./game/devHooks').then((m) => m.installDevHooks());

    const pressed = new Set<string>();
    const apply = () => {
      let x = 0;
      let z = 0;
      for (const code of pressed) {
        const v = KEY_MAP[code];
        if (v) {
          x += v[0];
          z += v[1];
        }
      }
      const mag = Math.hypot(x, z) || 1;
      useGame.getState().setKeyboardInput(x / mag, z / mag);
    };
    const down = (e: KeyboardEvent) => {
      // Yazı kutusunda (kafe adı) WASD oyuncuyu yürütmesin.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (KEY_MAP[e.code]) {
        pressed.add(e.code);
        apply();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (pressed.delete(e.code)) apply();
    };
    const blur = () => {
      pressed.clear();
      apply();
    };
    const onHide = () => useGame.getState().saveNow();
    // Ses (E3a): store'a abone olur, olayları durum FARKINDAN türetir. `init()`ten SONRA
    // bağlanır — ilk kesit kıyas noktasıdır ve hiçbir ses çalmaz, yoksa açılışta yüklenen
    // kaydın bütün geçmişi bir anda çalardı.
    const sesiCoz = sesiBagla();
    // Analitik (1.0.7): aynı desen — ilk kesit kıyas noktası, yalnız yerel uygulamada gönderir.
    const analitigiCoz = analitigiBagla();

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('beforeunload', onHide);
    // ARKA PLAN / ÖN PLAN — tek giriş noktası; yeni tetikler (mağaza yenileme vb.) bu iki fonksiyona eklenir.
    // A3 (T9c): mobilde en sık yol arka plandan SICAK dönüş — sayfa yeniden yüklenmez, `init`
    // çalışmaz; çevrimdışı gelir dönüşte ayrıca sayılır.
    const arkaPlanda = () => {
      sesDuraklat('gizli', true);
      // Kayıt HER durumda yazılır. Tam ekran reklam WebView'u gizler — o süre "arka plan" değil:
      // çevrimdışı saat başlatılmaz (dönüşte `onPlanaDon` gizlenme anı olmadığı için hiçbir şey saymaz).
      if (reklamEkranda()) useGame.getState().saveNow();
      else useGame.getState().arkaPlanaGec();
      void bulutKaydet();
    };
    const onPlanda = () => {
      sesDuraklat('gizli', false);
      useGame.getState().onPlanaDon();
      // Açılışta rıza/SDK kurulamadıysa (ağ yok) dönüşte yeniden dener; kuruluysa bir şey yapmaz.
      void reklamYenidenKur();
      void magazaYenile('onPlan');
    };
    // İki kaynak, tek durum: Android WebView'u ana ekrana dönüşte `visibilitychange`i güvenilir
    // vermiyor (müzik arka planda çalmaya devam ediyordu); Capacitor'ın `appStateChange`i native
    // yaşam döngüsünden gelir. İkisi birden tetiklenince ikincisi bir şey yapmaz.
    let gizli = false;
    const gorunurluk = (g: boolean) => {
      if (g === gizli) return;
      gizli = g;
      if (g) arkaPlanda();
      else onPlanda();
    };
    const onVisibility = () => gorunurluk(document.visibilityState === 'hidden');
    const durumDinleyici = Capacitor.isNativePlatform()
      ? CapApp.addListener('appStateChange', ({ isActive }) => gorunurluk(!isActive))
      : null;
    // Reklam ekrandayken müzik/sesler susar, kapanınca döner.
    const reklamSesCoz = reklamAbone(() => sesDuraklat('reklam', reklamEkranda()));
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      void durumDinleyici?.then((d) => d.remove());
      sesiCoz();
      analitigiCoz();
      bulutCoz();
      reklamSesCoz();
      uzlasmaCoz();
    };
  }, []);

  if (IS_PROTO && FurniturePrototype) {
    return (
      <div className="app">
        <Suspense fallback={null}>
          <FurniturePrototype />
        </Suspense>
      </div>
    );
  }

  return (
    <HataSiniri>
      <div className="app">
        <SahneKurtarici>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </SahneKurtarici>
        <HUD />
        <Joystick />
        <SplashScreen />
        {DevSandbox && (
          <Suspense fallback={null}>
            <DevSandbox />
          </Suspense>
        )}
      </div>
    </HataSiniri>
  );
}
