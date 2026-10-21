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
- **Header** 24 sn (tur 2): drone turu — kapalı Catmull-Rom yol (6 anahtar kare), alçak uçuşta duvar üstü
  koyu boşluk yerine gök rengi (`__sinema({ gok })`, yalnız kayıt). Geç oyun, Klasik Parke zemin (kullanıcı:
  "başlangıç zemini"; krem fayans reddedildi), çay yeşili duvar, bordo masa. Döngü: SURE+1 sn çekilir, son 1 sn
  başa erir; dikiş ölçüldü (son→ilk SSIM ≈ ardışık kare). Salon müziği −18 LUFS, acrossfade ile döner.
- **Search** 24 sn (tur 2, kesmeli — kullanıcı: "sahne kese kese, full senaryo"): tek geç-oyun dünyasında 6 çekim
  (çay al · servis · mıknatısla para · masa yükselt · yeni masa · geniş plan); dünya çekimden çekime sürer.
  Oyuncu yumuşatılmış joystick girdisiyle (`__girdi`) yürür. Sahneleme: başlangıç paketi teklifi gösterilmiş
  sayılır, servis masalarında müşteri çay bekler. Kesmeler sert, döngü de kesme → harman yok.
- Çıktı (git dışı): `docs/magaza-video/` + Masaüstü `TeaHouseTycoon-AppStore-Video/`.

## Araştırma — header nasıl olmalı (2026-10-21, kullanıcı tur 2'den memnun değil)
- **Güvenli alan küçük ve ortada:** Apple'ın şablonunda header "ART SAFE AREA" 3840×1646 tuvalin ortasında **1646×661**
  (genişliğin ~%43'ü, yüksekliğin ~%40'ı, alanın %17'si) — blakecrosley.com, Sketch şablonundan ölçülmüş. Telefon dikeyde
  kenarlar kırpılabilir: odak bu dikdörtgenin içinde kalmalı. Tur 2'nin drone turu ilgi noktasını kenarlarda gezdiriyordu.
- **Tek fikir, ilk kez gelen için:** Apple: "Focus on a single, clear idea"; oyunlar için "oynanış ya da ilginç karakterler".
  Kolaj/çok sahne, temsil etmeyen sinematik kaçınılır; "readable motion loop" önerilir.
- **Hareket:** güçlü başla · hızlı kesme ve hızlı hareket yok · dikişsiz döngü · poster karesi tek başına anlatmalı · sessiz çalışmalı.
- **Search ile tutarlılık:** Apple header ile search'te aynı görsel dili (universal varlık) öneriyor.
- **Kesin kırpma ancak ASC Preview'da görülür** (iPhone/iPad, dikey/yatay) ve PPO ile A/B denenebilir. Ölçülmüş dönüşüm verisi yok.
**Sonraki tur için yönler (karar kullanıcının):** A) ortada tek kahraman an: çaycı tepsiyle dolu salonda, kamera yavaş
yaklaşıp uzaklaşır (döngü) · B) diorama: tüm kıraathane ortada, minyatür gibi çok yavaş yörünge · C) hareketsiz ana görsel
(universal PNG) + search videosu. Önce Apple şablonu indirilip güvenli alan kareye bindirilerek denenmeli.
Kaynak: https://blakecrosley.com/blog/app-store-product-page-marketing-2026 · https://www.applaunchflow.com/blog/app-store-header-examples · https://developer.apple.com/videos/play/wwdc2026/205/

## Tur 3 (2026-10-21, kullanıcının tarifi)
- **Header 15 sn:** çaycı tezgâhtan dolu tepsiyle çıkar, drone ÖNÜNDEN takip eder ve yürüdükçe geri/yukarı açılır
  (ön 4,8 → 7,6 br, yükseklik 2,8 → 5,0) · masaya köşeden yanaşır (müşterinin içine girmez) · varıştan sonra genel
  plana yükselir · döngü 1,2 sn harman. Garsonlar sağ yarıda dolu tepsiyle başlar (boş tepsiyle tezgâha yürüyen garson
  takip kadrajını kapatıyordu).
- **Search 21,4 sn, 6 çekim 3-4 sn:** çay al 3 · servis 3,6 · para 3,6 (4×100 sikke, mıknatıs bu çekimde r 3,4 →
  istifler sırayla akar, sayaç ~14,9 bin → ~28,9 bin) · yükselt 3,8 (nokta %55 ödenmiş başlar) · yeni masa 4,2 (pad
  %50) · geniş plan 3,2. Geciken kare 0.
- **Tur 3b (kullanıcı: "aralarda bekleme var", "görev çubuğu çok sağda"):** çekimler eylem bitince kesilir (yürütücü
  `true` döner; `sure` artık üst sınır) → çay al 2,1 · servis 3,0 · para 3,4 · yükselt 2,8 · yeni masa 3,5 · geniş 3,2
  = **18,0 sn**. Kamera oyunun kendi kadrajı (uzaklık çarpanı 1). **Oyun hatası bulundu:** geniş ekranda bant
  `transform: translateX(-50%)` ile ortalanıyordu, `bandDone` animasyonu transform'u ezip bandı yarı eni kadar sağa
  kaydırıyordu → `translate: -50% 0` + bekçi `tests/bant-ortalama.test.ts` (2 mutasyon yakalandı). Bant ile nav arası
  8 px açıldı (78 → 86; üstündeki yığın/bildirim/ipuçları da +8).
