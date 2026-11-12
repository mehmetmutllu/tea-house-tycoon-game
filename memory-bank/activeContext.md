# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-12 — Kat 2 programı: K2-2 bitti · iOS 1.0.7 incelemede)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Yayın:** iOS **1.0.7 WAITING_FOR_REVIEW** (derleme 6, Codemagic `6af5df09007bc73c4ae4e059`; 1.0.5 atlandı). Play zip
masaüstünde `TeaHouseTycoon-1.0.7-vc10007-GooglePlay.zip` (`0-BU-SURUM.txt`: önce Data safety, sonra AAB) → arkadaşa.
Play üretim erişimi formu (`TeaHouse-Uretim-Erisimi-Formu.txt`) gönderildi, cevap bekleniyor · onay → rehber 9B (Production →
Add from library) · ret → e-postayı iste, cevaplar güçlendirilir. Mediation (D-173): Liftoff + Unity bidding'de.
Firebase (D-178): geri bildirim kutusu + yerel analitik yayında; Firestore'da `geribildirim/deneme-…` elle silinecek.

## 🆕 K2-2 — KAT ALTYAPISI ✅ (D-182 · D-183) — kod girdi, sürüme ÇIKMADI (üretimde kapı kapalı)
- K2-2a: `src/game/kat.ts` (geometri · `kat2Adim` · `merdivenTetik` · `kat2Etkin()`), kayıt `kat` + `kat2` additive (sürüm 34),
  Kat 2'deyken Kat 1 işler (`KAT1_DISI`), `Kat2.tsx` boş merdiven salonu, `KatPerdesi`. Dev: `__kat2()` aç · `__kat2(2)` geç.
- K2-2b: Kat 1'de `MerdivenTamir` (kırmızı yolluklu — kullanıcı onayladı, kareler artifact 5urr3ut2YGwzVNrwigG1MU) · Kat 2'de kat bandı
  (`data-testid="kat-bandi"`) + Kat 1 ipuçları susar · `__devPlan` sis düzeltmesi. `__game().merdivenTamirli`.
- Bekçi `tests/kat2-altyapi.test.ts` 19 test · duman 77/77 + 4/4 · vitest 1904.
- Göz aracı: `node tools/_kat-kare.mjs <klasör> x '[["kat2"],["gec"],["tp",x,z],["js","..."],["kare","ad",ms]]'`.
- Kat 2 metni EN dahil yayından önce ChatGPT mikrometin turuna girer.

## ⏭️ SIRADAKİ ADIM — K2-3: okey masası döngüsü + Türk kahvesi + cezve ocağı
- D-181 görünüşleriyle (okey yol G · cezve 7 KayKit restoran). Denge sayıları varyant kapısından (ölç → sor → uygula).
- Kat 2 görev hattı → kat bandının yerini alır. Merdiven tamir pad'i + fiyatı K2-5.
- Gözlem: Kat 2 varış kadrajında arka duvarın üstü koyu boşluk (Kat 1'de bahçe/sokak görünüyor) → dış manzara/çatı?
  K2-3'te göz kontrolüyle bak.

## KULLANICIYA HATIRLAT
- Play üretim erişimi sonucu ne oldu?
- İki hesap ayarı yapıldı mı (sınıflandırıcı Claude'u engelledi): a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri →
  Ayarlar → "Reklam kaynaklarını otomatikman reklam iş ortağı olarak ekle" ✓ · b) Unity → Monetization → Settings →
  Developer website = `https://mehmetmutllu.github.io`.
- Play'de yayına girince: Liftoff + Unity Android uygulamalarına Play bağlantısı; AdMob Android'i bağla.
- 1.0.7 yayına girince AdMob iOS "Güncellemeleri kontrol edin"; birkaç gün sonra Liftoff/Unity dolum oranı.
- Yayında Firebase olayları geliyor mu (DebugView/Realtime).

## SONRAKİ ÖZELLİK — Puanla (BEKLİYOR: kullanıcı "uygulama daha güzelken ekleyelim")
Kalıp: Wordmaster `js/puan.js` + `@capacitor-community/in-app-review` ~8.0.0. Sistem penceresi yalnız güzel anda (bölge/görev
bitişi; kurulumdan ≥1 gün, son denemeden ≥21 gün, başka pencere/reklam yok, ~1,5 sn gecikme). "Beğendin mi?" ön sorusu
YASAK (Play politikası, Apple 5.6.1). Ayarlar'da kalıcı "Uygulamayı puanla" → mağaza yorum sayfası (iOS
`apps.apple.com/app/id6816790079?action=write-review`, Play `details?id=com.mutlubadem.teahouse&showAllReviews=true`).
TR+EN metin (ChatGPT mikrometin). TestFlight'ta pencere çıkmaz; doğrulama yayında.

## AÇIK KALEMLER
- Kat 2: balkon (D-179 D adayı) hâlâ "düşünürüz" · bölme yürüme yolunu uzatır → K2-5'te ölç · okeyde 4 / tavlada 2 kişi sabit.
- Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · lint: `src/game/ads.ts` 2 + `tests/ekran-kabugu.test.ts` 2
  + `tools/kat2-*.tsx` 46 (dev araçları, react-refresh kuralı).
- `tools/olcum-bardak-t8.ts` korunum damgası kırık (W20 B0/B2 2 birim, Y1 8 birim) — K2-2'den ÖNCE de böyleydi, bakılmadı.
- Tam vitest bir kez 1 kararsız düşüş verdi (hangisi yakalanmadı; sonraki koşular yeşil).
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak.
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
