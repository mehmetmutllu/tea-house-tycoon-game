# S5 TASARIM — devir notu (2026-11-20, bitti)

**Durum:** 7 sorunun hepsi çekildi. Panolar `docs/kareler/s5-tasarim-g{102,111,112,114,115,120,129}-*.png`, adaylar ve öneriler `docs/s5-tasarim-adaylar.md`'de.
İkinci koşu: `SORU=G112,G114,G115,G129,G120 node tools/s5-tasarim-cek.mjs`, 0 hata. Sunucuda HMR ve izleme kapalı, yani başka ajanların `src/` değişiklikleri koşu sırasında kareleri bozmadı.

**Kontroller (hepsi tamam):** G-114'te kırpma Kat 1 vitrinini ve kapıyı temiz kesiyor, F'de siluet çıkıyor. G-120'de alt menü tıklamaları Görevler'i ve Hedefler'i açıyor. G-129'da klonlar ışık ve gölgeyi doğru alıyor, koridor sayıları `docs/tasarim/s5/olcum.json`'da. G-102 panosuna bakıldı, sorun yok.

**Sıradaki:** orkestratör karar paketine panoları koyar. G-129 E ve G-120 M4 denge konusu, varyant kapısından geçer.
`src/**`'ye dokunulmadı. Sahne değişip bir kutu süzgeci kırılırsa önce `SORU=yokla` ile bak.
