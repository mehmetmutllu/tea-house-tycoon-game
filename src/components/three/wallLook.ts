/**
 * wallLook.ts — DUVAR HATLARININ ÖLÇÜ KATMANI (S4).
 *
 * NEDEN AYRI DOSYA: duvar parçalarının listesi `Scene.Walls`ın içinde, bir `for` döngüsünün
 * gövdesinde üretiliyordu. `Scene.tsx` vitest'te import EDİLEMEZ (`recolor` → `Image`), yani o
 * liste bugüne kadar ne bekçilenebildi ne ölçülebildi — "duvar hattı kaç metre, KayKit modülüne
 * bölünüyor mu" sorusu koda bakmadan yanıtlanamıyordu.
 *
 * S3 aynı sorunu mutfak için `kitchenLook.ts` ile çözmüştü (D-072 katman 1 · D-099). Duvar da
 * aynı deseni izler: GEOMETRİ burada (saf, React'siz, testli), ÇİZİM `Scene.tsx`te.
 *
 * BU DOSYA GÖRÜNTÜYÜ DEĞİŞTİRMEZ: `Scene.Walls`ın ürettiği parçaların birebir aynısını üretir
 * (aynı `m`, aynı `t`, aynı kapı kesmesi, aynı sıra). Tek fark, artık okunabilir olması.
 */
import { BAND, BAND_SHELL, LAYOUT, doorX, wallSpans, type AreaSide } from '../../game/layout';
import { decorItems } from '../../config/decor';
import { DOOR, WALL_M, WALL_H as WALL_H_REF } from './wallPanel';
import { ON_DUVAR_H } from './wallOlcu';

/** Duvar hattının alan kenarından dışarıdaki payı — sayı `wallPanel`de (döngü olmasın), burada yeniden dışa açılıyor. */
export { WALL_M } from './wallPanel';

/** Duvar parçasının taban kalınlığı. Katmanlar (gövde 0,18 · lambri 0,22 · çıta 0,26) `wallPanel`'de. */
export const WALL_T = 0.2;

/** Kenar sırası — parça listesinin sırasını belirler, birebir korunur. */
export const WALL_SIDES: readonly AreaSide[] = ['left', 'right', 'front', 'back'] as const;

/**
 * Bir duvar parçası: taban dikdörtgeni + hangi alanın hangi kenarından doğduğu.
 * Tema burada YOK — tema mağazadan gelen bir DURUM (`wallThemeByArea`), geometri değil;
 * `Scene` `area`ya bakıp temayı kendisi giydirir.
 */
export interface WallRun {
  x: number;
  z: number;
  w: number;
  d: number;
  area: number;
  side: AreaSide;
}

/** Parçanın dik mi (sol/sağ kenar) yatay mı (ön/arka kenar) olduğu. */
export const wallDikey = (r: WallRun): boolean => r.side === 'left' || r.side === 'right';

/** Parçanın HAT koordinatı: dik parçada x, yatayda z. */
export const wallSideLine = (r: WallRun): number => (wallDikey(r) ? r.x : r.z);

/** Parçanın uzunluğu (ince eksen kalınlık, kalın eksen uzunluk). */
export const wallUzunluk = (r: WallRun): number => Math.max(r.w, r.d);

/**
 * Açık alanları saran duvar parçaları — `Scene.Walls`ın gövdesinin birebir karşılığı.
 *
 * B3-1: duvarlar ızgara komşuluğundan değil GEOMETRİDEN gelir (`wallSpans`). Kapı boşluğu
 * parçadan ÇIKARILIR (içinde olmasını beklemek yetmiyor: kapı 2. Alan'da x = 0'a kayınca tam
 * iki ön duvar parçasının DİKİŞİNE düşüyor ve ikisi de "içimde değil" diyordu).
 * Arka yarının ARKA kenarı çizilmez — orası `BackBand`in programı (BM adım 3).
 */
export function WALL_RUNS(areasOpen: number): WallRun[] {
  const runs: WallRun[] = [];
  const dx0 = doorX(areasOpen);
  const cut: [number, number] = [dx0 - DOOR.half, dx0 + DOOR.half];
  for (let z = 0; z < areasOpen; z++) {
    const za = LAYOUT.areaBounds[z];
    for (const side of WALL_SIDES) {
      if (side === 'back' && za.minZ === BAND.front) continue;
      const vertical = side === 'left' || side === 'right';
      const line =
        side === 'left'
          ? za.minX - WALL_M
          : side === 'right'
            ? za.maxX + WALL_M
            : side === 'front'
              ? za.maxZ + WALL_M
              : za.minZ - WALL_M;
      for (const [s0, s1] of wallSpans(z, side, areasOpen)) {
        const a0 = s0 - WALL_M; // uçlar m taşar → köşeler kapanır
        const a1 = s1 + WALL_M;
        const segs: [number, number][] =
          side === 'front'
            ? [
                [a0, Math.min(a1, cut[0])],
                [Math.max(a0, cut[1]), a1],
              ]
            : [[a0, a1]];
        for (const [p0, p1] of segs) {
          if (p1 - p0 <= 0.01) continue;
          runs.push(
            vertical
              ? { x: line, z: (p0 + p1) / 2, w: WALL_T, d: p1 - p0, area: z, side }
              : { x: (p0 + p1) / 2, z: line, w: p1 - p0, d: WALL_T, area: z, side },
          );
        }
      }
    }
  }
  return runs;
}

/**
 * ARKA BANDIN BİNA KABUĞU — salonun duvarıyla aynı dilde üç parça (arka + iki yan).
 * `BackBand` çizer; buradan okur. Alan indeksi 2 (arka yarı), teması da onunki.
 */
export function BAND_SHELL_RUNS(): WallRun[] {
  const zf = BAND.front;
  const zb = BAND_SHELL.back;
  const xl = BAND_SHELL.left;
  const xr = BAND_SHELL.right;
  return [
    { x: (xl + xr) / 2, z: zb, w: xr - xl, d: WALL_T, area: 2, side: 'back' },
    { x: xl, z: (zb + zf) / 2, w: WALL_T, d: zf - zb, area: 2, side: 'left' },
    { x: xr, z: (zb + zf) / 2, w: WALL_T, d: zf - zb, area: 2, side: 'right' },
  ];
}

// ============================================================================================
//  PENCERE BOŞLUKLARI (S6/E3) — duvarda GERÇEK açıklık
// ============================================================================================
//
// KULLANICI ŞİKÂYETİ: *"pencere duvardan ayrı duruyor."* Ölçüm haklı çıkardı (rapor §E): pencere
// duvarın YÜZEYİNE yapışan bir levhaydı — doğrama duvar yüzünün 0,055 önünde, arkasında hiçbir
// boşluk yok. Yani duvarda pencere değil, duvara ASILMIŞ bir pencere resmi vardı.
//
// KayKit'in `wall_window_open` modülü ölçüldü ve SEÇİLMEDİ: deliği 1,28 × 1,28, oyunun pencere
// bandı ise 3,20 × 1,65 (pencere yarıya inerdi) ve modülün kendi yatay oluğu dünyada 1,60'ta,
// maketin lambrisi 0,94'te — yani D-100'de kullanıcının ekranda görüp reddettiği *"duvar 2'ye
// bölünük"* düzenine geri dönülürdü.
//
// Bu yüzden boşluk duvarın KENDİSİNDE açılıyor: pencerenin denk geldiği hat parçası dört alt
// parçaya bölünüyor (solu · sağı · denizlik altı · lento üstü) ve pencere bandında hiç duvar
// üretilmiyor. Kasa/cam/denizlik çizimi `Decor.Pencere`de.

/** Bir duvar hattındaki açıklık: hat boyunca `a…b`, yükseklikte `y0…y1`. */
export interface WallHole {
  /** Hattın koordinatı — dik parçada x, yatayda z (`wallSideLine` ile aynı). */
  line: number;
  dikey: boolean;
  a: number;
  b: number;
  y0: number;
  y1: number;
}

/** Parçanın y aralığı taşıyan hâli — `WallSlab.y0/h` buradan doldurulur. */
export interface WallPiece extends WallRun {
  y0?: number;
  h?: number;
}

/** Bir açıklık bu parçanın üstünde mi? (aynı hat + aynı eksen + örtüşen aralık) */
const holeOnRun = (r: WallRun, o: WallHole): boolean =>
  o.dikey === wallDikey(r) &&
  Math.abs(o.line - wallSideLine(r)) < 0.4 &&
  o.b > (wallDikey(r) ? r.z : r.x) - wallUzunluk(r) / 2 &&
  o.a < (wallDikey(r) ? r.z : r.x) + wallUzunluk(r) / 2;

/** Parçayı hat boyunca `[p0,p1]` aralığına kırpılmış bir kopyası olarak üretir. */
function dilim(r: WallRun, p0: number, p1: number, y0?: number, h?: number): WallPiece {
  const dikey = wallDikey(r);
  const orta = (p0 + p1) / 2;
  const uz = p1 - p0;
  return dikey
    ? { ...r, z: orta, d: uz, y0, h }
    : { ...r, x: orta, w: uz, y0, h };
}

/**
 * PENCERE PROGRAMINDAN açıklık listesi. Tek kaynak `config/decor.ts`: pencerenin nerede olduğu
 * orada yazılı, duvarın nerede delineceği buradan TÜREDİ — iki yere ayrı ayrı yazılmıyor (D-015).
 *
 * `line` pencerenin kendi x'i (duvar YÜZÜ, 17,32); duvar hattı 17,50. Eşleşme toleransla
 * yapılıyor çünkü dekor duvarın yüzüne, duvar ise kendi orta hattına göre konumlanır.
 */
export function pencereBosluklari(areasOpen: number): WallHole[] {
  return decorItems(areasOpen)
    .filter((d) => d.kind === 'pencere')
    .map((d) => {
      const dikey = Math.abs(Math.abs(d.rot) - Math.PI / 2) < 1e-6;
      const len = d.len ?? 3.0;
      const h = d.h ?? 0.48;
      const eksen = dikey ? d.pos[2] : d.pos[0];
      return {
        line: dikey ? d.pos[0] : d.pos[2],
        dikey,
        a: eksen - len / 2,
        b: eksen + len / 2,
        y0: d.pos[1] - h / 2,
        y1: d.pos[1] + h / 2,
      };
    });
}

/**
 * Duvar parçalarını açıklıklara göre böler. Açıklığı olmayan parça AYNEN döner (bugünkü
 * görüntü bozulmasın), olan parça dörde bölünür: açıklığın solu · sağı · altı · üstü.
 *
 * Kesişen iki açıklık desteklenmez — pencere programı (`config/decor.ts`) onları 4,8 br
 * aralıkla koyuyor, pencere eni 3,20; bekçi testi bu ayrımı denetler.
 */
export function wallPieces(runs: WallRun[], holes: WallHole[]): WallPiece[] {
  const out: WallPiece[] = [];
  for (const r of runs) {
    const dikey = wallDikey(r);
    const uz = wallUzunluk(r);
    const bas = (dikey ? r.z : r.x) - uz / 2;
    const son = bas + uz;
    const benim = holes.filter((o) => holeOnRun(r, o)).sort((p, q) => p.a - q.a);
    if (!benim.length) {
      out.push(r);
      continue;
    }
    let imlec = bas;
    for (const o of benim) {
      const a = Math.max(bas, o.a);
      const b = Math.min(son, o.b);
      if (a - imlec > 0.01) out.push(dilim(r, imlec, a)); // açıklığın solundaki tam parça
      if (b - a > 0.01) {
        if (o.y0 > 0.01) out.push(dilim(r, a, b, 0, o.y0)); // denizlik altı
        if (WALL_H_REF - o.y1 > 0.01) out.push(dilim(r, a, b, o.y1, WALL_H_REF)); // lento üstü
      }
      imlec = Math.max(imlec, b);
    }
    if (son - imlec > 0.01) out.push(dilim(r, imlec, son));
  }
  return out;
}

/**
 * KAT 1 SALON DUVARLARI (S5 G-114 B): pencereli parçalar + ÖN hat `ON_DUVAR_H`e iner.
 * Ön hatta vitrin açıklığı YOK — cam bandı (0,98…2,65) yeni duvarın tamamen üstünde kalıyor; kapı
 * boşluğu `WALL_RUNS`ın kesmesiyle zaten açık. Ön hattın zeminden başlamayan parçası (lento) üretilmez.
 */
export function kat1DuvarParcalari(areasOpen: number): WallPiece[] {
  return wallPieces(WALL_RUNS(areasOpen), pencereBosluklari(areasOpen)).flatMap((p) =>
    p.side !== 'front' ? [p] : (p.y0 ?? 0) > 0.01 ? [] : [{ ...p, y0: 0, h: Math.min(p.h ?? WALL_H_REF, ON_DUVAR_H) }],
  );
}

// ============================================================================================
//  MERDİVEN KOVASI — maketin `merdivenHarap`ının ÖLÇÜSÜ (çizimi `maketParts.tsx`te)
// ============================================================================================
//
// S6'da buraya TAŞINDI. Sebep somut: `MERDIVEN_DERINLIK` bir ÖLÇÜ sabiti ama bir R3F dosyasında
// (`maketParts.tsx`) duruyordu ve `tests/logic.test.ts` onu oradan import ediyordu. O dosya
// S6'da `Model`i (KayKit lavabosu için) import edince zincir `recolor` → `Image`e uzandı ve
// node ortamında ÇÖKTÜ — yani bir ÇİZİM değişikliği bir MANTIK testini kırdı. Ölçü katmanının
// varlık sebebi tam olarak bu (D-072 katman 1).

/** Maketin merdiven sabitleri: 14 basamak × 0,46 derinlik; toplam 2,90 yükselir. */
export const STEP_D = 0.46;
export const STEP_N = 14;
export const STEP_H = 2.9 / STEP_N;

/**
 * Yıkık merdivenin toplam derinliği: 14 basamak + sahanlık (0,3 boşluk + 0,6 derinlik, merkezi
 * `-L - 0.3` olduğu için arka yüzü `L + 0,6`). Bandın derinliğine sığdığı `logic.test` ile bekçili.
 */
export const MERDIVEN_DERINLIK = STEP_N * STEP_D + 0.6;

// ============================================================================================
//  KAYKIT KABUĞU (S4) — duvar hattı paketin modülleriyle döşenir
// ============================================================================================
//
// ÖLÇÜLER `docs/olcum-duvar.txt` / `docs/duvar-zemin-raporu-s4.md`'den; hiçbiri tahmin değil.
//
// MİMARİ ÖLÇEK 0,80: KayKit duvarı native 4,0 boyunda, oyununki `WALL_H` 3,2 → 3,2/4 = 0,80.
// Bu MOBİLYANIN 0,90'ı DEĞİLDİR (D-099 §1): mobilya insana göre, duvar odaya göre ölçeklenir.
//
// K4 EŞ DAĞITIM: hiçbir hat 3,20'ye tam bölünmüyor (18,00 · 15,30 · 10,80 · 7,60 · 6,80 · 35,00).
// Ölçülen dört koldan kazanan bu: n = yuvarla(L / 3,20) modül, HEPSİ aynı oranda gerilir.
// En kötü gerilme %18,7 · ortalama %6,1 — "tam modül + gerilmiş artık" kolunda aynı sayılar
// %87,5 / %42,8'di VE bozulma tek bir parçada toplanıp gözle "yama" olarak okunuyordu.
// Gerilme yalnız modülün DİKEY pahını etkiler (0,080 → en kötü 0,095); modülün YATAY oluğu
// yatay olduğu için hiç etkilenmez.

/** KayKit duvarının ham boyu — `tools/model-olc.mjs kaykit-restaurant-bits wall`. */
export const KAY_WALL_NATIVE = { w: 4, h: 4, d: 0.5 } as const;

/** Mimari ölçek: oyunun duvar yüksekliği / modelin boyu. */
export const KAY_S = WALL_H_REF / KAY_WALL_NATIVE.h;

/** Bir modülün gerilmemiş dünya eni. */
export const KAY_MODUL_W = KAY_WALL_NATIVE.w * KAY_S;

/** Bir modülün dünya kalınlığı (oyunun 0,20'lik hattından 0,20 kalın; ölçüm: kesişen katı 0). */
export const KAY_MODUL_T = KAY_WALL_NATIVE.d * KAY_S;

/** Bir hattın kaç modüle bölüneceği ve her modülün gerilme çarpanı (K4). */
export function esDagit(uzunluk: number): { n: number; adim: number; gerilme: number } {
  const n = Math.max(1, Math.round(uzunluk / KAY_MODUL_W));
  const adim = uzunluk / n;
  return { n, adim, gerilme: adim / KAY_MODUL_W };
}

/** Yerleştirilmiş tek modül: dünya konumu + y ekseni dönüşü + ölçek. */
export interface KayModul {
  x: number;
  z: number;
  /** y ekseni dönüşü (radyan). Dik hatlarda π/2. */
  rot: number;
  /** [en, boy, kalınlık] — en, K4 gerilmesini taşır. */
  scale: [number, number, number];
}

/**
 * Bir duvar hattını modüllere böler. Modüller hattın ÜSTÜNE ortalanır: ilk modülün dış kenarı
 * hattın başına, sonuncusununki sonuna değer — köşelerde boşluk kalmaz.
 */
export function kayModuller(r: WallRun): KayModul[] {
  const dikey = wallDikey(r);
  const uz = wallUzunluk(r);
  const { n, adim, gerilme } = esDagit(uz);
  const line = wallSideLine(r);
  const bas = (dikey ? r.z : r.x) - uz / 2;
  const out: KayModul[] = [];
  for (let k = 0; k < n; k++) {
    const orta = bas + adim * (k + 0.5);
    out.push({
      x: dikey ? line : orta,
      z: dikey ? orta : line,
      rot: dikey ? Math.PI / 2 : 0,
      scale: [KAY_S * gerilme, KAY_S, KAY_S],
    });
  }
  return out;
}

/** Bir parça listesinin tüm modülleri — çizim hattı bunu okur. */
export const kayDuvar = (runs: WallRun[]): KayModul[] => runs.flatMap(kayModuller);
