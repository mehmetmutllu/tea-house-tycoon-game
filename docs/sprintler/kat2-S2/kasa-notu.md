# Ajan A · kasa + çevrimdışı — ara not (S2, D-185 uygulaması)

- Oran kaynağı: `kasaOlcum {para, sn}` — oyuncu Kat 2'deyken Kat 1'de DÜŞEN paranın (yeni sikke kimlikleri,
  `tick.coinSystem`) yansız üstel ortalaması (600 sn); kasa doluyken ölçülmez. Kayda gider. Soğuk başlangıç
  (ölçüm < 120 sn) = sınırsız: para yerde 180 sn yaşlanmadan kasaya girmez, kasa o sürede dolamaz. Taban 300 ₺.
- Kasa doluyken sığmayan sikke yerde bekler (değeri kalan kısma iner) — para yanmaz; doğum kapısı sayaç 0'da bekler
  (boşalınca art arda grup yok).
- `lifetime` kasaya GİRDİĞİ an sayılır (para o an kazanıldı; `gelirIzi`/seviye ödülü düzgün akar), boşaltma yalnız yer değiştirir.
- Kayıt additive (sürüm 34 kaldı; `kat`/`kat2` emsali). Kat 2'deyken kaydedilirse yerdeki Kat 1 parası kasaya yazılır.
- Kırılan (başkasının) test: `kat2-dongu.test.ts` "Kat 1'deyken Kat 2 dünyası işlemez" — D-185 bunu tersine çevirdi;
  yeni davranışın bekçisi `tests/kasa-oyun.test.ts`. i18n: 3 yeni metin (en.ts orkestratörde).
- Ölçüm aracı ham çıktısı: `docs/olcum-kat2-kasa-s2.txt` (K2-4 tabanı `docs/olcum-kat2-kasa.txt` korunur).
