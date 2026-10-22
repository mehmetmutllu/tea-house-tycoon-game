# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-10-22 — reklam mediation kuruldu · 1.0.5 hazır, gönderilmedi)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Bu tur (D-173, `docs/reklam-mediation-raporu.md`):** Liftoff + Unity AdMob bidding'e bağlandı (iOS+Android, 4 grup,
engelleme açık, app-ads.txt'ye Unity satırları). Adaptörler + SKAdNetwork 161 koda girdi. Sürüm **1.0.5 (10005)**:
iOS Codemagic derlemesi `6ada2671f0d579dfde534097` YEŞİL → ASC'ye yüklendi (TestFlight). Play zip masaüstünde:
`TeaHouseTycoon-1.0.5-vc10005-GooglePlay.zip` (kullanıcı arkadaşına atacak; web sitesi KÖK adres rehberde düzeltildi).

## ⏭️ SIRADAKİ ADIM — KULLANICIYA HATIRLAT
0. **iOS 1.0.5'i incelemeye GÖNDER** (kullanıcı istedi: "bir sonraki oturumda hatırlat"). Önce 1.0.4 durumu:
   `curl -s "https://itunes.apple.com/lookup?id=6816790079"` → version. 1.0.4 onaylandıysa ASC'de 1.0.5 sürüm kaydı aç,
   build 10005'i bağla, Yenilikler "Arayüzde iyileştirmeler ve küçük düzeltmeler yapıldı." / EN "UI improvements and
   small fixes.", incelemeye gönder. 1.0.4 hâlâ incelemedeyse GERİ ÇEKME (sıra sıfırlanır) — bekle.
1. Kullanıcının iki ayarı (hesap ayarı, sınıflandırıcı Claude'u engelledi) yapıldı mı sor:
   a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri → Ayarlar → "Reklam kaynaklarını otomatikman reklam iş ortağı
   olarak ekle" ✓ · b) Unity → Monetization → Settings → Developer website = `https://mehmetmutllu.github.io`.
2. Play'de yayına girince: Liftoff + Unity Android uygulamalarına Play mağaza bağlantısını ekle; AdMob Android'i bağla.
3. 1.0.4 yayına girince AdMob iOS "Güncellemeleri kontrol edin" (sellerUrl kök olur).
4. 1.0.5 yayından birkaç gün sonra: AdMob raporunda Liftoff/Unity dolum oranı (gerçek doğrulama).
5. Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · duman "q_coin" ara sıra · lint `src/game/ads.ts` 2 hata.

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
