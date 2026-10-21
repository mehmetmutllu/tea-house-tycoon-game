/**
 * DEV SANDBOX durumu — yalnız geliştirmede kullanılır (kullanıcı isteği 2026-09-06:
 * "her şeyin seviyesini ayarlamam için ayar koy"). Oyun mantığına GİRMEZ: burada
 * tutulan tek şey sunum/hile anahtarları. `import.meta.env.DEV` false olduğunda
 * panel hiç import edilmez → üretim paketinde ölü kod.
 */
import { create } from 'zustand';

interface SandboxState {
  /** Panel açık mı. */
  open: boolean;
  /** Simülasyon hız çarpanı (tick dt × bu). 1 = normal. */
  timeScale: number;
  /** Açıkken cüzdan sürekli tepeye çekilir (yükseltmeler bedava denenebilsin). */
  infiniteMoney: boolean;
  /** Panel görünürken oyun HUD'ını gizle (temiz ekran görüntüsü için). */
  hideHud: boolean;
  /**
   * ÜSTTEN PLAN GÖRÜNÜMÜ (kullanıcı isteği 2026-09-07: "maketteki gibi üstten de görebileyim").
   * Açıkken kamera oyuncuyu bırakır, katın merkezine dik tepeden bakar — yerleşimi ölçmek için.
   */
  topDown: boolean;
  /** Plan görünümünde yakınlık: 1 = kat tam sığar; büyüdükçe yakınlaşır. */
  topDownZoom: number;
  /** Zemine çizilen ölçü ızgarasının adımı (dünya birimi). 0 = ızgara kapalı. */
  gridStep: number;
  /**
   * KAMERA ÖLÇÜM KOLU (BM adım 4). Oyunun fov'u 50, maketinki 34 — aynı kadrajı iki farklı
   * perspektif derinliğiyle kuruyorlar. Karşılaştırma karesi alabilmek için fov ve mesafe
   * çarpanı DEV'de dışarıdan verilebilir. 0 = dokunma (üretim davranışı).
   */
  camFov: number;
  camDistMul: number;
  /** Mağaza videosu (D-170): kamera oyuncuyu bırakır, kayıt aracının verdiği yoldan geçer. */
  sinema: { pos: [number, number, number]; bak: [number, number, number]; fov: number; gok?: string } | null;
  /**
   * MUTFAK ZEMİNİ KARŞILAŞTIRMA KOLU (S4). Karo boyu × renk çifti. Kullanıcı ekranda seçiyor;
   * seçim kesinleşince kaybeden kol koddan silinir.
   */
  fayansKaro: 'kucuk' | 'buyuk';
  fayansRenk: 'siyahbeyaz' | 'kahve';
  set: (patch: Partial<SandboxState>) => void;
}

export const useSandbox = create<SandboxState>((set) => ({
  open: false,
  timeScale: 1,
  infiniteMoney: false,
  hideHud: false,
  topDown: false,
  topDownZoom: 1,
  gridStep: 0,
  fayansKaro: 'kucuk',
  fayansRenk: 'siyahbeyaz',
  camFov: 0,
  camDistMul: 0,
  sinema: null,
  set: (patch) => set(patch),
}));

/** Simülasyon hız çarpanı — Scene'deki tick sürücüsü okur (DEV dışında hep 1). */
export function devTimeScale(): number {
  return useSandbox.getState().timeScale;
}

/**
 * Plan görünümü açıksa yakınlığı döner, kapalıysa null (kamera normal takip moduna kalır).
 * `devTimeScale` deseni: kamera her kare bunu getState ile okur, abone olmaz.
 */
export function devTopDown(): { zoom: number } | null {
  const s = useSandbox.getState();
  return s.topDown ? { zoom: s.topDownZoom } : null;
}

/**
 * Kamera ölçüm kolu: `{ fov, distMul }` — ikisi de 0 ise null (kamera üretim davranışında).
 * `devTopDown` ile aynı desen: kamera her kare getState ile okur, abone olmaz.
 */
export function devCam(): { fov: number; distMul: number } | null {
  const s = useSandbox.getState();
  if (!s.camFov && !s.camDistMul) return null;
  return { fov: s.camFov, distMul: s.camDistMul || 1 };
}
