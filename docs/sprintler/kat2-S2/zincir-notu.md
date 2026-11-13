# Ajan C — K2-5 zincir ölçümü notu

- Araç `tools/olcum-kat2-zincir.ts` · çıktı `docs/olcum-kat2-zincir.txt` (OLCUM=tam, 63 sn, damgalar temiz) · rapor `docs/kat2-zincir-raporu-k2-5.md` (§Karar boş).
- Kısa koşu ~10 sn. Mutasyonlar: `ZINCIR_MUT=fiyat2` (G1.15-500 3 sa'te 22 → 15 pad) · `ZINCIR_MUT=kahvesiz` (Kat 2 3. saat 471 → 243 ₺/dk, bot yürüdü damgası kırılır).
- Kat 1 arkada = gerçek store'un 60 dk izi (81,5 ₺/dk), çevrimli çalınır; kasa muhasebesi araçta (`kasa.ts` saf fonksiyonları), sınır 20 dk = 1.620 ₺.
  Store'da `kasa` alanı varsa (A) her adım sıfırlanır: sınırı araç uygular. A birleşince istenirse kasa doğrudan store'dan okunabilir.
- Uyum katmanı: `OCAKLAR`, `ocaklar[].hazir`, `olay.garsonServis`, `k2cezve2`/`k2garson` yeri yoksa yedek nokta + araç parayı düşer. Final koşuda hepsi B'nin gerçek API'siyle koştu ("Araçta düşülen pad: yok").
- Gelişim sırasında ortak ağaç B'nin ara hâlinde kırıktı (`garsonAyir is not defined`); geliştirme HEAD anlık görüntüsünde (scratchpad) yapıldı, tam koşu ortak ağaçta.
- Orkestratöre dikişler:
  1. Birleştirmeden sonra `OLCUM=tam npx tsx tools/olcum-kat2-zincir.ts > docs/olcum-kat2-zincir.txt` yeniden (garson sayıları B'den seçilince `GARSON_ORNEK` o sayıya çekilir).
  2. Seçilen eğri config'e yazılırken fiyatlar §B'den (SB9 sütunu) birebir; `fillRate = round(cost / 3,5)`.
  3. Bot ocağın başında beklerken garsonun fincan bulması B'nin "oyuncu önce alır" sırasına bağlı. Ölçümde garson 369-449 fincan taşıdı. Erken bir kısa koşuda 0 göründü; B'nin o anki ara hâliydi, finalde tekrar bakılmalı.
  4. Çevrimdışı ihlalin kaynağı kasanın Kat 1 payı (1.620 ₺); SB9'da 2/27 (zincirin ilk 20 dk'sı). Kararı rapor §Sorular 4.
