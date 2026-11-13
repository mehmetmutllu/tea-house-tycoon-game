# K2-S3 · Ajan B notu — masa Sv görseli + çerçeve

Durum: BİTTİ (commit yok). tsc (app) + eslint temiz (tsc'deki tek hata D'nin `analitik.ts`/`basarim.ts`'i), `kat2-yol` bekçisi yeşil, kare koşusunda konsol hatası 0.

- **Görünüş:** `kat2/Esya.tsx` — `OkeyMasa`/`TavlaMasa` `sv` alır (yok = 1 → bugünkü çizim birebir). Okey G: tabure → `chair_A_wood` → `chair_A` → çerçeveli masa ×1,15 → `chair_C` + pirinç + çay. Tavla A: kutu → kakma → `chair_stool` → masa ×1,2 → pirinç + çay + zar (zar oyun yokken durur). Haneler tek instanced çizim.
- **Okuma:** `kat2/masaSv.ts` (store `kat2.masaSv`, A'nın `masaSvOku`'su). Masa, grup ve işaret buradan okur.
- **Oturak:** `yol.oturakYerleri(tur, sv)` — Sv4+'da oturaklar 0,09 dışarı açılır (araçtaki yol); `Grup` yeni oturağa yürür ve oturur. Sv1 yolu değişmedi (`kat2-yol` yeşil).
- **Çerçeve:** `kat2/SvIsaret.tsx` — `kat2SvTetikleri` ne verirse onu çizer, `GroundMarker` + ok + `MASA_ISARET_R` + `t.etiket` (Kat 1 `TableUpgradeMarkers` dili, sarı tint, kalan tutar, dolum `padFill['sv:<id>']`). Config'te `masaSv` yok → çizilmez.
- **Sv atlama anı:** `SvSekme` (Esya) — masa yerinde 0,82 → 1 sekme (easeOutBack, 0,45 sn) + ayakta 8 toz topu (merdiven dönüşümünün tozu). Kat 1 masasında seviye juice'u yok; dil Kat 2'nin `Dogus`u.
- **Kareler:** `node tools/kat2-s3-kare.mjs` → `kareler/pano-masa-sv.png` (13 kare + 1 pano; ilk koşu vite bağımlılık taraması yüzünden "Oyun durdu" verdi, ikinci koşu temiz).
