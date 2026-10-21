# App Store tanıtım görselleri (Header + Search Results) — araştırma (2026-10-21)

Apple 2026-10-05'te açtı ("creative assets"). Yalnız **iOS 27 / iPadOS 27+** cihazlarda görünür; opsiyonel; ekran görüntüleri ve
app preview'ların yerine geçmez, onlara eklenir. Search asset yoksa arama kartında In-App Event / app preview / ekran görüntüleri çıkar.

## Ölçüler (resmî spesifikasyon)
| Yerleşim | Oran | Çözünürlük | Biçim |
|---|---|---|---|
| Header — görsel/video | 21:9 | 3840×1646 | görsel jpg/png · video mov/m4v/mp4 |
| Search — görsel/video | 3:2 | 1920×1280 … 3840×2560 | görsel jpg/png · video mov/m4v/mp4 |
| Universal (ikisi birden) | 16:9 | 5244×2950 | **yalnız PNG görsel** (video universal olmaz) |

- Video: **5–30 sn**, **30 veya 60 fps**, sürekli **döngü**; dikiş görünmemeli. Poster karesi Asset Library'de seçilir.
- Ses: Search'te hep sessiz (açılamaz); Header'da sessiz başlar, kullanıcı açabilir. Video sessiz anlaşılır olmalı.
- Görselde alfa/saydamlık yok. Odak ortada (cihaz/yönelime göre kırpılır; Apple şablonlarında güvenli alan var).

## İçerik kuralları (App Review)
4+ yaşa uygun (oyun derecesi ne olursa olsun) · fiyat/indirim/URL/© yok · doğrulanamaz iddia, ödül, Apple rozeti
(Editor's Choice vb.) yok · başka platform/mağaza logosu yok · metin varsa her dile yerelleştir · hızlı kesme yok.
Apple'ın tavsiyesi: Header = marka/hava/tek fikir; Search = "ne olduğu tek bakışta", oynanışı göster.

## Yükleme
ASC → uygulama → sürüm → **Product Page Information → Header and Search Results** → Header / Search Results → dosya veya
Browse Assets → Preview (iPhone/iPad, yönelim, dil) → incelemeye. **Asset Library**'den sürümsüz, tek başına incelemeye
gönderilebilir (son sürüme göre incelenir). Product Page Optimization ile A/B testlenebilir. Rol: Admin/App Manager/Marketing.

## Kaynaklar
- https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications/
- https://developer.apple.com/news/?id=ljpl7kyn
- https://developer.apple.com/app-store/asset-best-practices/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets

## Üretim (D-170, 2026-10-21)
Araç: `tools/magaza-video.mjs` + sahne dosyaları `magaza-video-header.mjs` · `magaza-video-search.mjs`.
`VIDEO=header node tools/magaza-video.mjs` · `VIDEO=search DIL=tr|en node tools/magaza-video.mjs` (her biri ~4 dk, RTX 3060).
- **Sanal saat:** rAF + performance.now + Date.now sayfa açılmadan sarılır, her kare tam 1/60 sn; CSS animasyonları
  `Animation.setPlaybackRate(0,08)` + kare başı 208 ms gerçek süre ile aynı hıza bağlanır → takılma yok.
- **Süper örnekleme:** 5760 px çizilir (`?kayitdpr=` dev kolu, PIXEL_BUDGET'i aşar), lanczos ile 3840'a iner; gölge 4096.
- **Döngü:** SURE+XF çekilir, sonun XF'i başa erir (xfade/acrossfade). Header kamerası SURE periyotlu sinüs → dikiş
  ölçüldü: son→ilk kare SSIM 0,880 = ardışık kare 0,884.
- **Header** 20 sn: geç oyun (üç salon dolu, Usta masalar, ceviz parke + bordo), yazısız, salon müziği −18 LUFS.
- **Search** 14 sn: oyuncu joystick girdisiyle (`__girdi`) ocaktan 5 çay → 3 masaya servis → "4. Masayı aç" (250) →
  masa belirir → mıknatıs parayı toplar → ocağa döner. Sahneleme: başta müşteriler çay bekler, garson tepsisi boş.
  Pad'ler görev sırasına bağlı: kart dikişte değişir, harman 0,6 sn.
- Çıktı (git dışı): `docs/magaza-video/` + Masaüstü `TeaHouseTycoon-AppStore-Video/`.
