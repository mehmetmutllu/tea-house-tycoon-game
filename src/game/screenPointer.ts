/**
 * Aktif adımın EKRAN İZDÜŞÜMÜ (plan §9: "sahnenin üstünde yalnız aktif adımın işareti
 * + ekran kenarı oku (işaret dışarıdaysa)").
 *
 * Sahne tarafı (R3F `useFrame`) her karede buraya yazar, HUD ~20Hz okur. Store'a yazılsaydı
 * her kare React render'ı tetiklerdi — `perf` singleton'uyla aynı kalıp.
 */
import { economyConfig } from '../config/economy.config';
import { izdusur } from './cameraView';
import { MERDIVEN_PAD_YER, OCAKLAR, merdivenPadAcik, type Kat2Kayit } from './kat';
import { kat2PadYeri, kat2SiradakiPad, kat2SvCanliTetik, type Kat2Ayar } from './kat2Dongu';
import { kat2Gorevleri } from './kat2Gorev';
import { kat1OmurgaBitti } from './rules';

export interface ScreenPointer {
  /** Hedef VAR mı (aktif adımın dünya konumu biliniyor mu). */
  active: boolean;
  /** Hedef ekranda görünüyor mu (true ise ok gösterilmez). */
  onScreen: boolean;
  /** Ekran kenarındaki ok konumu (px, viewport). */
  x: number;
  y: number;
  /** Okun bakış açısı (derece; 0 = sağ). */
  angle: number;
  /** Oyuncudan hedefe uzaklık (dünya birimi) — bantta "12 m" gibi gösterilebilir. */
  dist: number;
}

export const screenPointer: ScreenPointer = {
  active: false,
  onScreen: true,
  x: 0,
  y: 0,
  angle: 0,
  dist: 0,
};

/* ── REHBER HEDEFİ (tarama 2026-11-18 · 4-oynanis #1/#4) ─────────────────────────────────────
   Scene'in `QuestPointer`ı yalnız Kat 1 görev hattının hedefini izdüşürür. Hat bitince (merdiven)
   ve Kat 2'deyken (Kat 2 görevi) kenar oku susuyordu. Bu iki hedef burada TÜRETİLİR — kamera
   matrisi `cameraView`dan okunur (CameraRig her iki katta da yazar), HUD aynı oku çizer. */

export interface RehberDurumu {
  kat: number;
  /** Kat 1 görev hattının aktif görevi (bitti ise null). */
  quest: unknown;
  padsDone: readonly string[];
  kat2: Kat2Kayit;
}

const K2 = economyConfig.kat2 as Kat2Ayar;

/** Kat 1 hattı bitti, merdiven pad'i açık → oyuncu merdivene çağrılır (Kat 1'in hat-sonu yönü). */
export function merdivenRehberi(s: RehberDurumu, etkin?: boolean): boolean {
  return s.kat === 1 && s.quest == null && merdivenPadAcik(kat1OmurgaBitti(s.padsDone), s.kat2, etkin);
}

/**
 * Kat 2 görevinin dünya hedefi — store'un `kat2GorevOdak`ıyla AYNI kural (pad → sıradaki pad ·
 * masaSv → canlı Sv noktası · sayaç → açık ilk ocak). Hat bittiyse null.
 */
export function kat2GorevHedefi(kat2: Kat2Kayit, ayar: Kat2Ayar = K2): [number, number] | null {
  const g = kat2Gorevleri(economyConfig.kat2Gorevler, ayar)[kat2.gorev?.idx ?? 0];
  if (!g) return null;
  if (g.hedef.tip === 'pad') {
    const sira = kat2SiradakiPad(ayar, kat2.padsDone);
    return sira ? kat2PadYeri(sira.id) : null;
  }
  if (g.hedef.tip === 'masaSv') {
    const t = kat2SvCanliTetik(ayar, kat2.padsDone, kat2.masaSv ?? {}, true)[0];
    return t ? [t.x, t.z] : null;
  }
  const o = OCAKLAR.find((x) => kat2.padsDone.includes(x.id));
  return o ? [o.al[0], o.al[1]] : null;
}

/** HUD'un rehber hedefi: Kat 1 hat sonunda merdiven, Kat 2'de Kat 2 görevi. Kat 1 hattı sürerken null (Scene çizer). */
export function rehberHedefi(s: RehberDurumu, etkin?: boolean): [number, number] | null {
  if (s.kat === 2) return kat2GorevHedefi(s.kat2);
  return merdivenRehberi(s, etkin) ? [MERDIVEN_PAD_YER[0], MERDIVEN_PAD_YER[1]] : null;
}

/**
 * NDC → kenar oku (saf). Scene `QuestPointer`ın kuralı: üstte 90, altta 170 px korunur, 34 px kenar
 * payı; hedef güvenli dikdörtgenin dışındaysa ok merkezden hedefe giden ışının kenarına oturur.
 */
export function kenarOku(ndc: readonly [number, number], w: number, h: number): Omit<ScreenPointer, 'active' | 'dist'> {
  const x = (ndc[0] * 0.5 + 0.5) * w;
  const y = (-ndc[1] * 0.5 + 0.5) * h;
  const m = 34;
  const minY = 90;
  const maxY = h - 170;
  if (x > m && x < w - m && y > minY && y < maxY) return { onScreen: true, x, y, angle: 0 };
  const cx = w / 2;
  const cy = (minY + maxY) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const sx = Math.abs(dx) > 0.001 ? (w / 2 - m) / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 0.001 ? (maxY - cy) / Math.abs(dy) : Infinity;
  const k = Math.min(sx, sy);
  return { onScreen: false, x: cx + dx * k, y: cy + dy * k, angle: (Math.atan2(dy / len, dx / len) * 180) / Math.PI };
}

/** Rehber hedefinin kenar oku (kamera yoksa / hedef yoksa null). Yükseklik Scene'deki gibi 0,9. */
export function rehberOku(hedef: readonly [number, number] | null, w: number, h: number) {
  if (!hedef) return null;
  const ndc = izdusur(hedef[0], 0.9, hedef[1]);
  return ndc ? kenarOku(ndc, w, h) : null;
}
