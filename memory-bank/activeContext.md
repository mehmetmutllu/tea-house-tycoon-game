# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-10-21 gece — mağaza videoları tur 3 bitti · 1.0.4 hazırlanıyor)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`).

**Bu tur:** header 15 sn (çaycıyı önden takip → açılan kamera → genel plan) + search 18 sn TR/EN (beklemesiz, oyun kadrajı)
kullanıcı onayladı. Oyun hatası: geniş ekranda görev bandı `bandDone` animasyonuyla sağa kayıyordu → `translate` (bekçi
`tests/bant-ortalama.test.ts`) + nav arası 8 px. **iOS 1.0.3 YAYINDA.**
**1.0.4 (10004):** ASC sürüm kaydı açıldı (`3402024e…`), pazarlama adresi kökte `https://mehmetmutllu.github.io`
(AdMob app-ads.txt: alt dizinli sellerUrl doğrulamayı düşürüyor — Wordmaster'da da kök adresle çözüldü), Asset Library'ye 3
video yüklendi ve TR/EN sayfalara header + search olarak yerleşti. Codemagic derlemesi `6ad92685d91cc581d464e106`.

## ⏭️ SIRADAKİ ADIM
0. **1.0.4 incelemede** (2026-10-22, build 4, gönderim `0029aae2…`, Yenilikler "Arayüzde iyileştirmeler…"). Onayda otomatik yayın.
1. 1.0.4 yayına girince sellerUrl kök olur → AdMob'da "Güncellemeleri kontrol edin" (≈24 sa). Lookup:
   `curl -s "https://itunes.apple.com/lookup?id=6816790079"` → sellerUrl.
2. **Play'e 1.0.4 gönderilecek (kullanıcı: "sonra göndericez")** — 1.0.3 henüz yüklenmediyse atlanır, doğrudan 1.0.4
   (versionCode 10004; görev bandı düzeltmesi Android tablet/yatayda da geçerli). Sırası gelince `npm run play` → AAB + teslim
   zip'i masaüstüne; Yenilikler "Arayüzde iyileştirmeler ve küçük düzeltmeler yapıldı." / EN aynısı. Arkadaş Play kaydında web
   sitesini KÖK `https://mehmetmutllu.github.io` yapmalı (AdMob Android doğrulaması, D-172). Yayından sonra AdMob'u bağla.
3. iOS'ta iCloud kayıt gerçek cihazda denenmedi.
4. Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · duman "q_coin" ara sıra · lint `src/game/ads.ts` 2 hata.

## AÇIK KALEMLER
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- Deyimix 1.0.1 "Pending Developer Release" — kullanıcı Release diyecek.
- AdMob "ABD eyalet yönetmelikleri" mesajı bakılmadı · ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı).
- `i18n/baslat` Preferences'tan önce okuyor (küçük).
