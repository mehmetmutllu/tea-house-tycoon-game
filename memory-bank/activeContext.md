# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-24 — tam oyun testi + düzeltmeler T1-T9 bitti, main'de · sıradaki: YENİ deneme APK → kullanıcının Kat 2 testi)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Yayın:** iOS **1.0.7 App Store'da YAYINDA** (2026-11-13 kullanıcı bildirdi; derleme 6; 1.0.5 atlandı). Play zip
masaüstünde `TeaHouseTycoon-1.0.7-vc10007-GooglePlay.zip` (+ ayrık `…-vc10007.aab`, 2026-11-16) → kullanıcı Play'e atıyor (Kat 2 YOK).
Play üretim erişimi formu (`TeaHouse-Uretim-Erisimi-Formu.txt`) gönderildi, cevap bekleniyor · onay → rehber 9B (Production →
Add from library) · ret → e-postayı iste, cevaplar güçlendirilir. Mediation (D-173): Liftoff + Unity bidding'de.
Firebase (D-178): geri bildirim kutusu + yerel analitik yayında; Firestore'da `geribildirim/deneme-…` elle silinecek.

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

## ✅ KAT 2 SPRINT S4 (2026-11-19) — plan `docs/sprintler/kat2-S4-plan.md`
- D-206: hedef çarpanı + Usta (+%20, `k2:<masaId>`) Kat 2'de · uzun görevler üçe bölündü (en uzun 19,8 dk) · Kat 2 7,40/7,74 sa.
- D-207: Kat 2 varışı kuyunun önünde (aday D; iniş arkadan itme, şikâyet gelirse T2 zemin "Kat 1" / T3 HUD düğmesi).
- D-208: küçük proplar gölgesiz (Kat 2 gölge çağrısı −%35) · zayıf cihazda 1024, oto = kapalı kalır · Kat 2 merdiven açıkken arkada kurulur.
- Metin turu (ChatGPT) uygulandı `docs/metin-turu-2026-11-19.md` · Firestore kuralı Firebase konsolunda yayınlandı (2026-11-19).
- Play Console ELLE (kullanıcı/arkadaş): `docs/play/basarim-duzeltme-2026-11-19.txt` (₺ → para + EN adlar).

## ✅ KAT 2 SPRINT S5 (2026-11-20/21) — oyun testi G-92…G-130 · D-209 denge · D-210 görsel · main 75bdccc+
- Denge: bulaşıkta para + kalkışta ücret · istek 18 sn (tek masa 12) · K2T Sv kapısı · garson hız ×1,25 + 4. garson · >20 dk görevler
  bölündü · G-92 tepsi 25 + %40 tamamlama · Kat 2 7,78 sa, kaçan %2,1, en uzun görev 16,9 dk. Rapor `docs/s5-denge-raporu.md`.
- Görsel: alçak duvarlar (bölme 0,6, ön duvar 1,0 iki kat, mutfak-kova 1,0) · tabela kapı kemerinde · Kat 2 bina altı cephe+sokak ·
  bakır leğen · Kat 1 mutfak koyu kahve dama · görev kartı M1+M2 · karar sayfası https://claude.ai/artifact/VA8jVDpqSMGMFaf2cdUYNm
- vitest 2445 · duman 79/79 · EN 4/4. Deneme APK: masaüstü `TeaHouse-deneme-tam-2026-11-21.apk` (VITE_KAT2+DENEME).

## ✅ TAM TEST + DÜZELTME (2026-11-24) · D-211 · `docs/tam-test-2026-11-24.md`
- Kilit yok · Kat 2 kadraj kapısı (`kat2/gorusKapisi`, yavaş cihazda 21-24 → 46 fps girişte; kalabalıkta 66 → 37 ms dev) · iPad hedef oku ·
  Usta ✕ · ipucu · bardak · sokak boşluğu. Görev kartı satır kırması REDDEDİLDİ (kart büyümez). vitest 2451 · duman 79/79 · EN 4/4.
- Yalnız yayındaki 1.0.7'yi de ilgilendirenler: iPad oku, Usta/video ✕, bardak, çip, merdiven, sokak (acil değil; 1.1'e binmesi önerildi).

## ⏭️ SIRADAKİ ADIM — yeni deneme APK + kullanıcının Kat 2 testi
- **Oturum açılışında:** (1) YENİ APK derle (21 Kasım APK'sında düzeltmeler YOK): google-services.json'a geçici `.deneme` istemcisi +
  `VITE_KAT2=1 VITE_DENEME=1 npm run apk`, sonra geri al · (2) `npm run dev` + adresi ver. Geri bildirim →
  `docs/geribildirim-oyun-testi-<tarih>.md` (G-131…) → S6. Yayın yolu: test → "nihai" → 1.1 paketi → iOS + Play zip.
- **Öneri (kullanıcıya söylendi, kararı bekliyor):** ayrı canlı yama yok, düzeltmeler 1.1 ile çıkar; Kat 2 testi ~2 haftayı aşarsa 1.0.8.
- Açık: `q_stationMax` temposu (bot 15 dk'da bitiremedi; denge kararı, ölçülmeden dokunma) · kalabalık Kat 2 gerçek telefonda ölçülmedi.
- Açık (sonraki tur, kullanıcıya sorulmadı): siyah-beyaz mutfak teması mağazaya geri konsun mu · Kat 1 oto-toplanan sikkede
  "+X" çıkıyor (Kat 2'de sessiz) · `tools/simulate.ts` G-92 %40 kuralını bilmiyor · Kat 2 Sv5'te 124 gövde/26 ms (gölge kısma önerisi) ·
  uzak masaya ilk grup hızlı yürür · `kameraBakanBolme`/`cepheLook` artık kullanılmıyor (temizlik) · G-120 "sonra değişebilir".
- Ajan dersi: worktree silmek `node_modules` bağlantısını siler → ajanlara worktree yasak; derleme kontrolü `npx tsc -b` (noEmit -p . kaçırıyor).
- Bu makinede Android SDK `F:/Android/Sdk` (local.properties düzeltildi, git dışı).
- **Yayına kullanıcı "nihai" deyince** (2026-11-18). 1.1 listesi: `VITE_KAT2=1` · Game Center 6 başarım · "Yenilikler" TR+EN · iOS Codemagic + Play zip · tam test + eski kayıt açılışı.

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
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
