# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-11 — Play kapalı test bitti, üretim erişimi formu arkadaşta · iOS 1.0.5 gönderilmedi)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Bu tur (D-173, `docs/reklam-mediation-raporu.md`):** Liftoff + Unity AdMob bidding'e bağlandı (iOS+Android, 4 grup,
engelleme açık, app-ads.txt'ye Unity satırları). Adaptörler + SKAdNetwork 161 koda girdi. Sürüm **1.0.5 (10005)**:
iOS Codemagic derlemesi `6ada2671f0d579dfde534097` YEŞİL → ASC'ye yüklendi (TestFlight). Play zip masaüstünde:
`TeaHouseTycoon-1.0.5-vc10005-GooglePlay.zip` (kullanıcı arkadaşına atacak; web sitesi KÖK adres rehberde düzeltildi).

**2026-10-28:** Play kapalı testi 14 gün daha sürecek; "aktif" sayılması için **1.0.6 (10006)** üretildi (kod değişikliği yok).
Zip masaüstünde `TeaHouseTycoon-1.0.6-vc10006-GooglePlay.zip` → arkadaş KAPALI TEST kanalına yükleyecek. Sonraki iOS derlemesi 1.0.6 olur.

**2026-11-11:** Kapalı test 2. tur BİTTİ. Üretim erişimi formu cevapları masaüstünde `TeaHouse-Uretim-Erisimi-Formu.txt`
(8 soru, EN metin + TR açıklama) → arkadaş girecek. Not: 10-20'de "erişim alındı" yazılmıştı ama test uzatıldı → ilk başvuru
muhtemelen reddedildi; ret gerekçesi gelirse cevaplar ona göre güçlendirilir. Onayda: Production → Add from library 1.0.6 (rehber 9B).

## 🆕 2026-11-12 — 1.0.7 ARAYÜZ TURU (D-175 · D-176 · D-177) — kod girdi, sürüm ÇIKMADI
Yöntem: adaylar canlı oyuna enjekte edilip aynı kadrajda çekiliyor (`tools/aday-gorev-karti.mjs` · `aday-pad.mjs` ·
`aday-ekran.mjs`), artifact'ta gösterilip kullanıcı eliyor. Seçilenler: görev kartı **B ince hap** (sağda ödül, lakap/fiyat
yok, uzun başlık 2 satır) · zemin işareti **B kesintisiz beyaz kenarlık** (pul artık solmuyor) · menüler **F alt menü açık**
(sol üstte ✕, açık sekme de kapatır; Ayarlar'da geri oku). Kalan arayüz: istenirse başka ekranlar (Usta, ödül/teklif pencereleri).
✅ **Firebase (D-178) koda girdi:** proje `tea-house-tycoon` (Firebase hesabı mutlubadem4456 · `u/1`), Ayarlar → Geri
bildirim kutusu (Firestore'a yalnız ekleme; mesajlar konsol → Firestore → `geribildirim`), yerel analitik (`gorev_tamam` ile
bırakılan adım). Android debug APK Firebase'le derlendi; iOS Codemagic'te `firebase_ios` değişkeni + plist adımı hazır (derlenmedi).
Konsolda silinecek: `geribildirim/deneme-…` (kurulum deneme belgesi).
**Sıradaki — 1.0.7 YAYIN ÖNCESİ (kullanıcıya SOR, dışa dönük):** ① gizlilik politikası (`mehmetmutllu/tea-house-tycoon`
`privacy.html` "kendi analitiğimiz yok / sunucumuz yok" diyor → Firebase Analytics + geri bildirim bölümü, TR+EN) ② ASC App
Privacy: Ürün etkileşimi + Diğer kullanıcı içeriği + Cihaz kimliği (izlemede değil, kimliğe bağlı değil) ③ Play Veri
güvenliği rehberi arkadaşa ④ package.json 1.0.7 → Codemagic iOS + `npm run play` zip.
**Puanla (5 yıldız / sistem penceresi) BEKLİYOR** — kullanıcı: "uygulama daha güzelken ekleyelim".
Sonra 1.0.7 derlemesi (iOS + Play zip) → K2-1 Kat 2 maketi.
✅ 2026-11-12 (2.): Duman "q_coin" kararsızlığı ÇÖZÜLDÜ — ürün hatası değil, test yarışı. Duman beklerken gerçek döngü
akıyor; ilk müşterinin sabrı bitince yerine oturan 2. müşteri 8 sn penceresinin sonunda servis ediliyor, 4 sn içme bitmeden
oyuncu ışınlanıyor → para yerde. Eski denetim `lifetime`'a bakıyordu (görev ödülü dolduruyor, toplamayı kanıtlamıyordu).
`tools/smoke.mjs`: coinsCollected>0 olana dek saniye saniye sar (≤20 sn) + kutlama için 1 sn. 18/18 yeşil · 2 mutasyon yakalandı.

## ⏭️ SIRADAKİ ADIM — KULLANICIYA HATIRLAT
-1. Play üretim erişimi başvurusu sonucu ne oldu? (onay → 9B ile 1.0.6 üretime; ret → e-postayı iste)
0. **iOS 1.0.5'i incelemeye GÖNDER?** 2026-11-12'de soruldu, cevap gelmedi (1.0.4 2026-10-30'da yayına girdi, engel
   yok). 1.0.7 yakınsa 1.0.5'i atlayıp 1.0.7'yi göndermek de seçenek — kullanıcıya sor. Önce 1.0.4 durumu:
   `curl -s "https://itunes.apple.com/lookup?id=6816790079"` → version. 1.0.4 onaylandıysa ASC'de 1.0.5 sürüm kaydı aç,
   build 10005'i bağla, Yenilikler "Arayüzde iyileştirmeler ve küçük düzeltmeler yapıldı." / EN "UI improvements and
   small fixes.", incelemeye gönder. 1.0.4 hâlâ incelemedeyse GERİ ÇEKME (sıra sıfırlanır) — bekle.
1. Kullanıcının iki ayarı (hesap ayarı, sınıflandırıcı Claude'u engelledi) yapıldı mı sor:
   a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri → Ayarlar → "Reklam kaynaklarını otomatikman reklam iş ortağı
   olarak ekle" ✓ · b) Unity → Monetization → Settings → Developer website = `https://mehmetmutllu.github.io`.
2. Play'de yayına girince: Liftoff + Unity Android uygulamalarına Play mağaza bağlantısını ekle; AdMob Android'i bağla.
3. 1.0.4 yayına girince AdMob iOS "Güncellemeleri kontrol edin" (sellerUrl kök olur).
4. 1.0.5 yayından birkaç gün sonra: AdMob raporunda Liftoff/Unity dolum oranı (gerçek doğrulama).
5. Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · lint `src/game/ads.ts` 2 hata.

## 🆕 SONRAKİ ÖZELLİK — Puanla + geri bildirim (kullanıcı istedi 2026-10-22, 1.0.4 + Play yayına girince)
Kaynak kalıp: Wordmaster `js/puan.js` (+ `@capacitor-community/in-app-review` ~8.0.0). Oradaki kurallar:
- Sistem penceresi (iOS requestReview / Play In-App Review) yalnız GÜZEL ANDA otomatik (bizde: bölge/görev
  tamamlama, prestij yok). Şart: kurulumdan ≥1 gün, birkaç anlamlı ilerleme, son denemeden ≥21 gün, aynı anda başka
  pencere/reklam/teklif yok, ~1,5 sn gecikme. Apple yılda 3 kez gösterir, sonuç bize DÖNMEZ.
- Önce "beğendin mi?" diye sormak YASAK (Play politikası, Apple 5.6.1) → filtreli 5-yıldız akışı yok.
- Ayarlar'da kalıcı "Uygulamayı puanla" satırı → mağaza yorum sayfası (iOS `apps.apple.com/app/id6816790079?action=
  write-review`, Play `details?id=com.mutlubadem.teahouse&showAllReviews=true`); düğmeye sistem penceresi BAĞLANMAZ.
- Ek istek: Ayarlar'da "Geri bildirim gönder / gelişmemize yardım et" satırı. **Sorulacak:** hedef ne — e-posta
  (mailto, cihaz/sürüm bilgisiyle) mi, form mu? Wordmaster'da "Hata var" düğmesi hedefsiz kalmıştı.
- TR+EN metin (ChatGPT mikrometin), Wordmaster deneyimi: 3 haftada 0 oy → şartları çok sıkı tutma.
- TestFlight'ta Apple pencereyi göstermez; doğrulama yayında.

## AÇIK KALEMLER
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak (talimat + Android SDK tuzağı iletildi).
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi.
- AdMob "ABD eyalet yönetmelikleri" bakılmadı · ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı).
- `i18n/baslat` Preferences'tan önce okuyor (küçük).
