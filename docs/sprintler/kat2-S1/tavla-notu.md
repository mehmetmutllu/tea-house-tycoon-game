# Ajan C — tavla + salonlar (K2-3c) ara notu

Durum: BİTTİ (commit yok). Rapor `docs/kat2-tavla-raporu-k2-3c.md` · ham `docs/olcum-kat2-tavla.txt` (tam 8 sn, kısa 1 sn).

- Okey birebir: `OLCUM=tam npx tsx tools/olcum-kat2-dongu.ts | diff - docs/olcum-kat2-dongu-final.txt` boş.
- Yürüyüş: açık alanların birleşimi. Kenar yalnız kapalı alanlara bakıyorsa içeri çekilir (alan 1'de eski davranış aynen), bölmeler
  `kat2Duvarlar` ile katı. Geçit yalnız iki yanı açıksa açılır. Son satırdaki koruma: kelepçe ya da "içindeyse çık" duvarı delemez.
- Tavla sayıları yoksa masa açık durur, grup gelmez. `kat2ZincirHatasi` uyarır.
- Mutasyon 6/6 yakalandı: kapalı geçit açık · tavla→okey sayısı (ayar yokken) · son duvar koruması · tavla hep okey sayısı · etiket ·
  tavla engeli yok.
- en.ts'e 3 satır eklendi ("Tavla Masası", "Okey Salonu", "Tavla Köşesi"). i18n bekçisi yeşil kalsın diye eklendi, EN metni orkestratör düzeltebilir.
