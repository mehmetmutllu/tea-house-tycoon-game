# S5 TASARIM — devir notu (2026-11-20, oturum kapanışında durduruldu)

**Biten:** G-102 → `docs/kareler/s5-tasarim-g102-sag-duvar.png` · G-111 → `docs/kareler/s5-tasarim-g111-birlesim.png`.
Bunların ilk koşusunda sağ duvar gizlenmemişti; YAPI ajanı duvarı z −17,4'e uzatmıştı. Kutu düzeltildi ve ikinci koşu yapıldı. G-111 panosu kontrol edildi (duvar kırpma/gizleme çalışıyor). G-102 panosuna bir kez bak.
**Keşif kareleri** (G-114/G-115 kanıtı): `docs/tasarim/s5/kesif-*.png`.

**Kalan:** G-112, G-114, G-115, G-129, G-120. Adayların hepsi araçta yazılı ama hiçbiri koşulmadı. Sıradaki komut:
`SORU=G112,G114,G115,G129,G120 node tools/s5-tasarim-cek.mjs` (yaklaşık 10 dk, port 5163)

Koşudan sonra yapılacaklar:
1. Panolara bak. Özellikle G-114'te kırpma düzleminin (`onKirp`) Kat 1 vitrin/kapı parçalarını doğru kestiğini, F'de siluetin (`siluet()`, GreaterDepth) çıktığını kontrol et.
2. G-120'de `.botnav > :nth-child(n)` tıklamaları Görevler/Hedefler'i açmalı; açmazsa seçiciyi düzelt.
3. G-129: `masaKlonla` masanın bütün ağlarını kopyalar. Klonlar ışık/gölgeyi doğru alıyor mu bak. Koridor sayıları `docs/tasarim/s5/olcum.json`'a yazılır.
4. `docs/s5-tasarim-adaylar.md`'de "çekilmedi" yazan bölümleri pano yollarıyla güncelle.

Notlar:
- Başka ajanlar `src/`'yi değiştiriyor (Kat2.tsx, Mutfak.tsx, maketParts). Kutu süzgeçleri koordinata bağlı, kırılırsa önce `SORU=yokla` ile ağ listesine bak.
- `src/**`'ye dokunulmadı.
