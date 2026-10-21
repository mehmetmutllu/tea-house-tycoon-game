/**
 * DEV PERFORMANS KOLU (F2 — telefon yükü turu).
 *
 * NEDEN AYRI DOSYA VE NEDEN SORGU DİZESİ: gölge takımı `<Canvas>`ın MONTAJ anında kurulur
 * (`shadows`, `shadow-mapSize`). Çalışırken açıp kapatmak gölge haritasını yeniden yaratır,
 * materyalleri yeniden derler ve ölçülen kare süresine o derleme sızar — yani canlı düğme
 * ölçmek istediğimiz şeyi bozar. Bu yüzden kol SAYFA YÜKLENMEDEN önce sorgu dizesinden okunur
 * ve her kol kendi yüklemesinde ölçülür. `devSandbox` (zustand) deseni burada kullanılmaz:
 * o panel çalışırken değişen sunum anahtarları içindir, bu ise montaj-zamanı yapılandırma.
 *
 * ÜRETİMDE ÖLÜ KOD: tüm okuyucular `import.meta.env.DEV` dalının içinde çağırır.
 *
 * Koşu:  ?f2golge=0      gölge kapalı
 *        ?f2golge=512    gölge açık, harita 512 (varsayılan 2048 — palette.ts LIGHTING)
 *        ?f2dpr=1        dpr tavanı 1 (varsayılan: PIXEL_BUDGET'ten türeyen değer)
 *        ?f2fps=0        kare-hızı tavanı KAPALI (K-A öncesi davranış — tavanın kazancı ölçülsün)
 *        ?f2fps=30       kare-hızı tavanı 30 (varsayılan: KARE_TAVANI_FPS)
 *        ?f2ad=G0        ham çıktıya yazılacak kol adı (ölçüm aracının damgası)
 *        ?kayitdpr=3     mağaza videosu (D-170): dpr bütçesiz ve tavanı aşarak bu değere çıkar
 * İkisi birlikte verilebilir: `?f2golge=0&f2dpr=1`.
 */

export interface PerfKol {
  /** Gölge açık mı (Canvas `shadows` bayrağı). */
  golge: boolean;
  /** Gölge haritası kenarı; 0 = dokunma (palette.ts LIGHTING.shadowMapSize). */
  golgeHarita: number;
  /** dpr tavanı; 0 = dokunma (çözünürlük bütçesi hesaplasın). */
  dprTavan: number;
  /** Kare-hızı tavanı (fps); `-1` = dokunma (üretim tavanı), `0` = tavan yok. */
  fpsTavan: number;
  /** Mağaza videosu kaydı: dpr bu değere sabitlenir (bütçe ve 2 tavanı yok sayılır); 0 = dokunma. */
  kayitDpr: number;
  /** Kol adı — ham çıktı damgası. */
  ad: string;
}

/** Sorgu dizesi bir kez okunur: her kare `location.search` ayrıştırmak gereksiz iş olurdu. */
let onbellek: PerfKol | null | undefined;

function oku(): PerfKol | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const golgeHam = q.get('f2golge');
  const dprHam = q.get('f2dpr');
  const fpsHam = q.get('f2fps');
  const kayitHam = q.get('kayitdpr');
  if (golgeHam === null && dprHam === null && fpsHam === null && kayitHam === null) return null;

  const golgeSayi = golgeHam === null ? -1 : Number(golgeHam);
  const dprSayi = dprHam === null ? 0 : Number(dprHam);
  const fpsSayi = fpsHam === null ? -1 : Number(fpsHam);
  return {
    // `f2golge=0` → kapalı. Verilmediyse (-1) üretim davranışı: açık.
    golge: golgeSayi !== 0,
    // 0/negatif/NaN → dokunma. Yalnız pozitif bir kenar haritayı değiştirir.
    golgeHarita: Number.isFinite(golgeSayi) && golgeSayi > 0 ? golgeSayi : 0,
    dprTavan: Number.isFinite(dprSayi) && dprSayi > 0 ? dprSayi : 0,
    // `f2fps=0` → tavan yok (ölçüm kolu). Verilmediyse/geçersizse -1: üretim tavanı kalır.
    fpsTavan: Number.isFinite(fpsSayi) && fpsSayi >= 0 ? fpsSayi : -1,
    kayitDpr: Number(kayitHam) > 0 ? Number(kayitHam) : 0,
    ad: q.get('f2ad') || 'kol',
  };
}

/** Etkin ölçüm kolu, yoksa null (üretim davranışı). */
export function devPerfKol(): PerfKol | null {
  if (onbellek === undefined) onbellek = oku();
  return onbellek;
}

/** Yalnız testler için: önbelleği boşalt (sorgu dizesi taklit edilebilsin). */
export function devPerfSifirla(): void {
  onbellek = undefined;
}
