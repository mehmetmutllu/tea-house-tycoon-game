# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-17 — D-200 Kat 2 ocak/garson yükseltmesi kodda · deneme APK yenilenecek · yayın kullanıcının geri bildiriminden sonra)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Yayın:** iOS **1.0.7 App Store'da YAYINDA** (2026-11-13 kullanıcı bildirdi; derleme 6; 1.0.5 atlandı). Play zip
masaüstünde `TeaHouseTycoon-1.0.7-vc10007-GooglePlay.zip` (+ ayrık `…-vc10007.aab`, 2026-11-16) → kullanıcı Play'e atıyor (Kat 2 YOK).
Play üretim erişimi formu (`TeaHouse-Uretim-Erisimi-Formu.txt`) gönderildi, cevap bekleniyor · onay → rehber 9B (Production →
Add from library) · ret → e-postayı iste, cevaplar güçlendirilir. Mediation (D-173): Liftoff + Unity bidding'de.
Firebase (D-178): geri bildirim kutusu + yerel analitik yayında; Firestore'da `geribildirim/deneme-…` elle silinecek.

## ✅ Kat 2 sprint S2 kapandı (2026-11-13) · D-188 · D-189 · D-190 — üretimde kapı kapalı
- Kodda: kasa + çevrimdışı (D-185) · tavla/2. ocak/garson mantığı (D-186) · **pad fiyatları SB9** (D-188, config, bekçi
  "config = SB9") · **garson hız 3 · tepsi 2 · tek** (D-189) · **alçak bölme 1,2** (D-190; B/C/D silindi, perde `h` parametreli).

## ✅ KAT 2 AKIŞ TURU (D-191) + K2-6 MANTIK (D-192) + GÖRSEL (D-193) — kodda, üretimde kapı kapalı
- Mantık: `kat.ts` N7 · geçitsiz duvar · 2. ocak x −13,2 · `KAT2_LAVABO_YER` · `MERDIVEN_PAD_YER` · config `kat2.hazir`,
  zincir SB9-L1 (4,90 sa), lavabo L1, merdiven 9.400 · rapor `docs/kat2-akis-zincir-raporu-k2-6.md`.
- Görsel (D-193): `kat2/Bolme.tsx` tam boy duvar gömülür/yükselir · `MaketTadilatPerde` P3 + `simge` (okey/lavabo/mutfak) ·
  `Kat2Lavabo` (perde+kaba inşaat ↔ `MaketLavaboBlock seviye=2`) · `kat2/MerdivenDonusum.tsx` (yıkık → toz → tamir).
- Bekçiler: `tests/kat2-akis.test.ts` · `tests/kat2-yol.test.ts` (oturak yerleri artık `kat2/yol.ts`te).
- Dev: `__kat2()` kat açar · `__kat2Pad(id)` Kat 2 pad'ini parasız bitirir · geniş kare `__devCam({distMul:2.2})`.

## ✅ KAT 2 SPRINT S3 (D-195) — defter `docs/sprintler/kat2-S3-defter.md` · üretimde kapı kapalı
- Masa Sv1-5 = ücret + geliş (UG/SB3T, config `kat2.masaSv`), Kat 1 kuralı: tek hedef (D-124) + görev kapısı (D-142) ·
  tavla Sv4 koyu cila · Kat 2 sesleri (takırtı + ilk çıkış Aday 2) · görev hattı 18+2 + Kat 1 kutlama ritmi · 6 başarım ·
  analitik. **Kural: Kat 2 = Kat 1 uyarlaması, seçenek sorulmaz** (hafıza feedback_kat2_kat1_uyarla).
- Dev: `__kat2Sv(id, sv)` · `__game().kat2.{masaSv,gorev}` · Kat 2 karesi `__sinema({pos,bak,fov})` (`__devCam`/`__teleport` Kat 2'de etkisiz).

## ⏭️ SIRADAKİ ADIM (yeni chat) — TUR: "KAT 2 İŞLEYİŞİ = KAT 1" (kullanıcı 2026-11-17, kesin ilke)
**Kullanıcının cümlesi:** "Birinci kat ve ikinci kat işleyiş olarak aynı olsun. Sadece içerik farklı (altta çay masası,
üstte okey masası). Neden alışkanlığı değiştiriyoruz?" → Kat 2'de Kat 1'den farklı İŞLEYİŞ kalmayacak.
Yapılacaklar (ÖLÇ → karar paketi → uygula, D-084; `tools/olcum-kat2-ocak-garson.ts` temel alınır):
  a. **İlk garson ERKEN, pad ile** (Kat 1: 3. adım, 130 coin). Bugün Kat 2'de 14. adım (~2,5 sa garsonsuz).
  b. **2. ve 3. garson zincirde PAD** (Kat 1 `waiter2`/`waiter3` gibi). D-200'ün panelden 2. garson alımı (`garsonSayi`) KALKAR.
     Garson hız/tepsi panelde KALIR (Kat 1'de de panel).
  c. **Lavabo seviye yükseltmesi** Kat 1 gibi (Kat 2 lavabosu bugün seviyesiz L1).
  d. **Bulaşık döngüsü Kat 2'de de** (kullanıcı "Evet, Kat 1 gibi"): kirli fincan · yıkama yeri · bulaşıkçı PAD'i;
     garson boşken kirli taşır (Kat 1 `idleDishCarry`). Kat 1'de bulaşıkçı VAR (`dishwasher` pad 900, 2. salon;
     G-69 yalnız tezgâh görünüşünü kaldırmıştı) — kullanıcı "yok" sanıyordu, düzeltildi.
  e. Ocak yükseltmesi 4. okeyden sonra KALIR (kullanıcı "öyle kalsın").
  Ölçülecek: garson pad yerleri (zincirde nerede) × fiyat; 3 garson; bulaşık açık/kapalı; Kat 2 süresi + en uzun bekleyiş.
  Karar paketinde sade tablo (memory feedback_plain_decision_package). Yer/yerleşim için görsel kare göster.
0. **ÖNCEKİ OTURUM (D-200):** garson her masaya + ocak 5 / garson hız·tepsi yükseltmesi (yarım fiyat), mangal ocak
   seviyesiyle; Kat 2 9,55 sa, kahve servisi %71 · `docs/kat2-ocak-garson-raporu.md` · kareler `node tools/_kat2-yuk-kare.mjs <klasör>`.
   Açık: 2 yeni metin ChatGPT turu bekliyor · Kat 2 görev hattına ocak/garson görevi yok · yeni deneme APK alınmadı.
1. Kullanıcı deneme APK ile Kat 1 + Kat 2'yi oynuyor (D-197; Ayarlar → "Deneme: Kat 1'i bitir"). Geri bildirim →
   `docs/geribildirim-oyun-testi-<tarih>.md` (G-numaralı) → tur planı. Kat 2'de kalan opsiyoneller: balkon (kullanıcı emin
   değil) · Kat 2 temaları (kullanıcı: Kat 1 ile aynı olabilir) · Kat 1 merdiven sarı-siyah bant (kalsın) · Usta "0/7" (fark etmez).
2. **Yeni sürüm ŞİMDİLİK GÖNDERİLMEZ** (kullanıcı 2026-11-13). Kullanıcı derse 1.1 yayını: `VITE_KAT2=1` · Game Center 6 başarım (ASC) · Play listesi + zip arkadaşa · "Yenilikler".

## KULLANICIYA HATIRLAT
- 2026-11-13 kontrol: a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri → Ayarlar → "Reklam kaynaklarını otomatikman
  reklam iş ortağı olarak ekle" kutusu ✅ 2026-11-13 Claude işaretledi + Kaydet (yenileyince kalıcı) · b) Unity: Chrome'da oturum kapalı, kontrol
  edilemedi (Monetization → Settings → Developer website = `https://mehmetmutllu.github.io`).
- Play üretim erişimi: 2026-11-13 hâlâ ses yok; kullanıcı haber verecek.
- Play'de yayına girince: Liftoff + Unity Android uygulamalarına Play bağlantısı; AdMob Android'i bağla.
- 1.0.7 iOS yayında (2026-11-13): AdMob iOS "Güncellemeleri kontrol edin"; ~2026-11-16 Liftoff/Unity dolum oranı; Firebase olayları.

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
- Duman 2026-11-13'te bir kez 75/76 (`waitForSelector` 5 sn zaman aşımı istisnası, hangi denetim yakalanmadı); sonraki iki koşu 77/77.
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak.
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
