/**
 * kat2OnKurulum.ts — Kat 2 katmanının ÖN KURULUM kararı (tarama 2026-11-18 #6).
 *
 * Merdiven tamirliyse (`kat2.acik`) Kat 2 dünyası Kat 1'deyken arkada kurulur ve ısıtılır; ilk çıkışta yalnız
 * görünür olur (React kurulumu + program derleme + GPU yüklemesi ilk girişin karesine binmez). Merdiveni
 * açılmamış oyuncu hiçbir şey kurmaz (bellek bedeli yok). Başlangıç: tamir animasyonu (`MerdivenDonusum`,
 * ~0,9 sn) bittikten / açılıştan sonra, tarayıcı boştayken. Kurulum ve ısıtma birkaç kareye dilimlenir
 * (`kat2/kademeliMontaj.tsx`, `Scene.tsx` `Kat2Isitici`). Not: gizli `Activity`yi boşta önceliğinde önceden
 * render ettirmek işe yaramadı — her karedeki store güncellemesi o işi baştan başlatıyor, hiç bitmiyordu.
 */

/** Tamir anından (ya da açılıştan) ön kurulumun başlamasına kadar en az bekleme (ms) — tamir animasyonu biter. */
export const ONKURULUM_GECIKME_MS = 1500;
/** Tarayıcı hiç boşa düşmezse ön kurulum en geç bu kadar sonra yine başlar (ms). */
export const ONKURULUM_BOSTA_TAVAN_MS = 2000;

/**
 * Kat 2 katmanı ağaçta olsun mu: oyuncu Kat 2'deyse her zaman; Kat 1'deyken yalnız merdiven tamirliyse ve
 * ön kurulum zamanı geldiyse. Merdiven kapalıysa (yeni oyun, sıfırlama, eski kayıt) Kat 1'de hiç kurulmaz.
 */
export function kat2KatmanKurulsunMu(kat: number, acik: boolean, onKurulumZamani: boolean): boolean {
  return kat === 2 || (acik && onKurulumZamani);
}

/** `gecikme` ms sonra, tarayıcı boştayken `is`i bir kez çalıştırır; dönen işlev iptal eder. */
export function bostaCalistir(is: () => void, gecikme = ONKURULUM_GECIKME_MS): () => void {
  let bosta: number | undefined;
  const w = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  const zaman = setTimeout(() => {
    // iOS WKWebView'de `requestIdleCallback` yok → doğrudan çalıştır (kurulum yine boşta önceliğinde dilimlenir).
    if (w.requestIdleCallback) bosta = w.requestIdleCallback(is, { timeout: ONKURULUM_BOSTA_TAVAN_MS });
    else is();
  }, gecikme);
  return () => {
    clearTimeout(zaman);
    if (bosta !== undefined) w.cancelIdleCallback?.(bosta);
  };
}

/** Ön kurulumda ağacın oturması için çocuk sayısının sabit kalacağı kare (Suspense'li parçalar gelsin). */
export const ISITMA_OTURMA_KARE = 10;
/** Isıtmada kare başına ekran dışına çizilecek en fazla mesh (Kat 2 tam ≈ 1.400 mesh → ~25-45 kare). */
export const ISITMA_MESH_BUTCESI = 60;

/**
 * `Activity` görünür mü: Kat 2'de evet; Kat 1'de yalnız ön kurulum ısınana dek (efektler bir kez bağlansın,
 * ısıtma çizimi kurulmuş nesneleri görsün). Isındıktan sonra Kat 1'de gizli → useFrame/abonelik sökülü.
 */
export function kat2ActivityGorunur(kat: number, isindi: boolean): boolean {
  return kat === 2 || !isindi;
}

/** Isıtma dilimi: `bas`tan başlayarak mesh bütçesini aşmayan parçalar (en az bir parça) → [bas, son). */
export function isitmaDilimi(meshler: readonly number[], bas: number, butce: number): { bas: number; son: number } {
  let son = bas;
  let toplam = 0;
  while (son < meshler.length && (son === bas || toplam + meshler[son] <= butce)) toplam += meshler[son++];
  return { bas, son };
}

/** Bir alt ağaçtaki mesh sayısı (ısıtma bütçesi için). */
export function meshSayisi(kok: { traverse: (f: (n: { isMesh?: boolean }) => void) => void }): number {
  let n = 0;
  kok.traverse((o) => {
    if (o.isMesh) n++;
  });
  return n;
}

type Dugum = { isMesh?: boolean; children: Dugum[]; traverse: (f: (n: Dugum) => void) => void };

/**
 * Isıtma parçaları: kökün alt ağacını, her biri bütçeyi aşmayan (ya da bölünemeyen) alt ağaçlara ayırır.
 * Bütçeyi aşan grup çocuklarına iner; parçaların ataları yalnız taşıyıcıdır (kendi mesh'i parça olarak listede).
 */
export function isitmaParcalari<T extends Dugum>(kok: T, butce: number): T[] {
  const out: T[] = [];
  for (const c of kok.children as T[]) {
    if (c.children.length > 0 && meshSayisi(c) > butce) out.push(...isitmaParcalari(c, butce));
    else out.push(c);
  }
  return out;
}
