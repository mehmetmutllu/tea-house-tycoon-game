# S5 · ESYA — devir notu (2026-11-20)

## Biten (kod + bekçi `tests/esya-s5.test.ts`, 17 test; mutasyonların beşi de yakalandı)
- **G-98** para yığını: `kat2/Para.tsx` — ölçek 1,35 → 1, yani Kat 1 sikkesi (r 0,22). Tavan 3 sütun × en çok 5 sikke (eskiden 4 × 11).
- **G-105** pad: `GroundMarker.tsx` + `markerFrame.ts` (`yuvarlakDikdortgen`, `dolumKesiti`). Nabız ve "üstündesin" kabarması
  kalktı; dolum kenarlığın iç çevresinin kesiti: boşluk yok, köşe yuvarlak. Bekleme (Usta) dolumu da aynı. Kat 1 ve Kat 2 aynı bileşeni kullanıyor.
  `tests/tetik-s24.test.ts` test 6 güncellendi: kabarma artık yok.
- **G-126** hazır kahve: `kat2/Mutfak.tsx` + `kat2/esyaOlcu.ts`. Mangalın solunda 3 sütunluk, sağında 2 sütunluk tepsi var,
  fincanlar ikişerli diziliyor. 10 yer var, kuyruk tavanı 9. 2. ocağın sağ tepsisiyle leğenin ibriği arasında yalnız 0,01 br pay kaldı (bekçi ölçüyor).
- **G-127** "ortadaki tepsi" = iki ocak arasındaki bakır leğen. Gövdesi kapalı silindir olduğu için fincanlar kapağa gömülüyordu.
  Su artık görünüyor, fincan su yüzünde duruyor: `kat2/Bulasik.tsx` + `esyaOlcu.ts` (`LEGEN_*`). Kullanıcıya teyit edilmeli.
- **G-130** tavla: `kat2/Esya.tsx` + `esyaOlcu.ts` (`HANE_SADE` / `HANE_KAKMA`). Her seviyede 24 üçgen hane var. Sv1 sade
  ahşap boyalı, Sv2+ kırmızı/koyu. Sv4 cilası (D-195) olduğu gibi kaldı.
- Kareler: `docs/kareler/s5-esya/{once,sonra}-*.png`, pano `docs/kareler/s5-esya-pano.png` (araç `tools/s5-esya-kare.mjs`).

## Açık / riskler
- `npm run duman` KOŞULMADI (oturum kapanıyor), yeniden koşulacak.
- Tam vitest: 1 kırmızı. `tests/kasa-oyun.test.ts` ("Kat 2'deyken Kat 1'de düşen para"), store/kat2Dongu tarafında,
  ESYA dosyalarında değil; başka ajanın değişikliği. tsc'de de başkasının hatası var: `Grup.tsx:220`, `Kat2.tsx` TozDonusumu.
- `Bulasik.tsx` sahiplik tablosunda kimseye yazılı değildi; yalnız leğen fincanı ve su yüksekliği değişti.
- Panoya son kez bakılmadı. "Sonra" karelerinin her biri ayrı ayrı kontrol edildi.
