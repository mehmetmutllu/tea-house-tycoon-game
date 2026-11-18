# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-18 — **Google Play'de YAYINDA** (kullanıcı bildirdi) · Kat 1 masa duyarlılığı ölçüldü · lint 4 düzeldi · sıradaki: kullanıcının oyun testi)

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

## ⏭️ SIRADAKİ ADIM — D-201 bitti (Parça 1 mantık + Parça 2 görsel, 2026-11-17; rapor `docs/kat2-isleyis-raporu.md` §Uygulama)
Kodda: config = K-Bt2 · zincirde garson ×3 + bulaşıkçı · bulaşık (masada fincan/telveli kirli, ön tezgâhta bakır leğen, bulaşıkçı
NPC, tepsilerde kirli) · lavabo L1-L6 seviyeyle büyür + "Yükselt" noktası · pad etiketleri Kat 1 (Garson Tut / 2. Garson / 3. Garson /
Bulaşıkçı Tut). Bekçi `tests/kat2-isleyis.test.ts` · final `docs/olcum-kat2-isleyis-final.txt` (8,11 sa) · kareler
`docs/kareler/kat2-isleyis-gorsel-*.png`. **Deneme APK hazır** (D-201 dahil): masaüstü `TeaHouse-deneme-Kat2-2026-11-17b.apk` (2026-11-17). **Sıradaki:** kullanıcının oyun testi geri bildirimi.
Not: Kat 2 lavabosu L1'de artık Kat 1 L1 gibi 2 lavabo (D-193 karesi sabit seviye 2'ydi).
**Yan bulgu ölçüldü (2026-11-18):** Kat 1 masaları L0/L2/L4 → Kat 2 8,11 / 7,26 / 6,69 sa · zincir 4,91 / 4,27 / 3,86 sa (rapor §Yan bulgu). Karar gerekmez.
- Önceki açıklar: 2 metin ChatGPT turu (D-200) · yeni deneme APK alınmadı · kullanıcı deneme APK ile oynuyor (D-197).
- **Yeni sürüm ŞİMDİLİK GÖNDERİLMEZ** (2026-11-13). 1.1 yayını: `VITE_KAT2=1` · Game Center 6 başarım · Play zip · "Yenilikler".

## ✅ TUR — BULAŞIKÇI YIKAMA KURALI (D-202, 2026-11-17) · rapor `docs/bulasikci-raporu.md`
Bulaşıkçı temiz bardak ≤ 2 olunca elindekini götürür (Kat 1 + Kat 2). Bekçi `tests/bulasikci-kurali.test.ts`. Araç
`tools/olcum-bulasikci.ts` (`BULASIK_FINAL=1` = config) · Kat 2 `IS_DW=1`. Deneme APK (masaüstü …-17b) bu kuralla yeniden derlendi.

## KULLANICIYA HATIRLAT
- 2026-11-13 kontrol: a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri → Ayarlar → "Reklam kaynaklarını otomatikman
  reklam iş ortağı olarak ekle" kutusu ✅ 2026-11-13 Claude işaretledi + Kaydet (yenileyince kalıcı) · b) Unity: Chrome'da oturum kapalı, kontrol
  edilemedi (Monetization → Settings → Developer website = `https://mehmetmutllu.github.io`).
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
- Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · lint: `tools/kat2-*.tsx` 46 (dev araçları, react-refresh kuralı).
- Tam vitest bir kez 1 kararsız düşüş verdi (hangisi yakalanmadı; sonraki koşular yeşil).
- Duman 2026-11-13'te bir kez 75/76 (`waitForSelector` 5 sn zaman aşımı istisnası, hangi denetim yakalanmadı); sonraki iki koşu 77/77.
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak.
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
