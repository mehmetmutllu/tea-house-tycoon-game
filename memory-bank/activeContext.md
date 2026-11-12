# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-12 — Kat 2 programı: K2-2a bitti · iOS 1.0.7 incelemede)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Yayın:** iOS **1.0.7 WAITING_FOR_REVIEW** (derleme 6, Codemagic `6af5df09007bc73c4ae4e059`; 1.0.5 atlandı). Play zip
masaüstünde `TeaHouseTycoon-1.0.7-vc10007-GooglePlay.zip` (`0-BU-SURUM.txt`: önce Data safety, sonra AAB) → arkadaşa.
Play üretim erişimi formu (`TeaHouse-Uretim-Erisimi-Formu.txt`) gönderildi, cevap bekleniyor · onay → rehber 9B (Production →
Add from library) · ret → e-postayı iste, cevaplar güçlendirilir. Mediation (D-173): Liftoff + Unity bidding'de.
Firebase (D-178): geri bildirim kutusu + yerel analitik yayında; Firestore'da `geribildirim/deneme-…` elle silinecek.

## 🆕 K2-2a — KAT ALTYAPISI (D-182) ✅ — kod girdi, sürüme ÇIKMADI (üretimde kapı kapalı)
- `src/game/kat.ts`: Kat 2 geometrisi (3 alan D-179 · kova · merdiven ağzı `AGIZ` · `KUYU` katısı), `kat2Adim` yürüyüş,
  `merdivenTetik` (ağızda merdivene doğru it), `VARIS`, `GECIS_SN` 0,7, `kat2Etkin()` (dev/test açık, üretimde `VITE_KAT2=1`).
- Kayıt: `kat` + `kat2 {acik, padsDone}` additive (sürüm 34 kaldı). Store: `kat` · `kat2` · `katGecis`, `katDegistir` · `kat2Ac`.
- Kat 2'deyken Kat 1 işler; oyuncu Kat 1'e `KAT1_DISI`nda görünür (`tick.playerMoveSystem` tek kapı); kamera panı düşer.
- Sahne: `Kat1Gorunur` (gizli ama takılı) · `components/three/Kat2.tsx` boş merdiven salonu (parke, kaba inşaat ön salonlar,
  merdiven 2 korkuluğu, bandın iki yanı tadilat perdesi) · `ui/KatPerdesi.tsx` karartma · kamera katta anında oturur ·
  görev oku Kat 2'de çizilmez. Dev: `__kat2()` (aç) · `__kat2(2)` (geç) · `__game().kat`.
- Bekçi `tests/kat2-altyapi.test.ts` 16 test · mutasyon 5/5 · vitest 1901 · duman 76/76 + 4/4.
- Göz kontrolü aracı: `node tools/_kat2-bak.mjs <klasör>` (Kat 1 bitir → çık → kareler → in).

## ⏭️ SIRADAKİ ADIM — K2-2b (görsel/arayüz, mantık değil)
1. Kat 1'de merdiven açıkken **tamir edilmiş merdiven** (bugün yıkık + dubalar duruyor; oyuncu içinden çıkıyor). Görünüş
   seçimi gerekirse adaylarla göster (feedback_show_dont_ask).
2. Kat 2'de HUD: Kat 1 görev kartı ("Ocaktan çay al") Kat 2'de anlamsız → gizle ya da "Kat 2" kartı · kat göstergesi?
   Kat 1 kasa sayacı K2-4'ün işi.
3. Dev üstten plan (`__devPlan`) Kat 2'de boş çıkıyor (sis/kadraj) — dev aracı, küçük.
4. Sonra K2-3: okey masası döngüsü + Türk kahvesi + cezve ocağı (D-181 görünüşleriyle). Merdiven tamir pad'i + fiyatı K2-5.

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
