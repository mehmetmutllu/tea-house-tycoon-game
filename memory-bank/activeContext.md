# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-11-13 — Kat 2 S3 + metin turu bitti · KULLANICI TÜM OYUNU DENİYOR (deneme APK) · yayın onun geri bildiriminden sonra)

**Kural:** Play Console'u Claude KULLANMAZ. iOS: ASC API (wordmaster anahtarı `563U28X6GK`, istemci kalıbı
`dev-ortam/gizli/wordmaster/araclar/asc.js`); Codemagic API (kiraathane app `6aba443b9e5dcc12b726ba2b`, iş akışı `ios-yayin`,
token `dev-ortam/gizli/wordmaster/codemagic-api.md`). AdMob'u Chrome'da `?authuser=mutlubadem.dev@gmail.com` ile aç.

**Yayın:** iOS **1.0.7 WAITING_FOR_REVIEW** (derleme 6, Codemagic `6af5df09007bc73c4ae4e059`; 1.0.5 atlandı). Play zip
masaüstünde `TeaHouseTycoon-1.0.7-vc10007-GooglePlay.zip` (`0-BU-SURUM.txt`: önce Data safety, sonra AAB) → arkadaşa.
Play üretim erişimi formu (`TeaHouse-Uretim-Erisimi-Formu.txt`) gönderildi, cevap bekleniyor · onay → rehber 9B (Production →
Add from library) · ret → e-postayı iste, cevaplar güçlendirilir. Mediation (D-173): Liftoff + Unity bidding'de.
Firebase (D-178): geri bildirim kutusu + yerel analitik yayında; Firestore'da `geribildirim/deneme-…` elle silinecek.

## K2-2 — KAT ALTYAPISI ✅ (D-182 · D-183) — kod girdi, sürüme ÇIKMADI (üretimde kapı kapalı)
- K2-2a: `src/game/kat.ts` (geometri · `kat2Adim` · `merdivenTetik` · `kat2Etkin()`), kayıt `kat` + `kat2` additive (sürüm 34),
  Kat 2'deyken Kat 1 işler (`KAT1_DISI`), `Kat2.tsx` boş merdiven salonu, `KatPerdesi`. Dev: `__kat2()` aç · `__kat2(2)` geç.
- K2-2b: Kat 1'de `MerdivenTamir` (kırmızı yolluklu — kullanıcı onayladı, kareler artifact 5urr3ut2YGwzVNrwigG1MU) · Kat 2'de kat bandı
  (`data-testid="kat-bandi"`) + Kat 1 ipuçları susar · `__devPlan` sis düzeltmesi. `__game().merdivenTamirli`.
- Bekçi `tests/kat2-altyapi.test.ts` 19 test · duman 77/77 + 4/4 · vitest 1904.

## ✅ Kat 2 sprint S2 kapandı (2026-11-13) · D-188 · D-189 · D-190 — üretimde kapı kapalı
- Kodda: kasa + çevrimdışı (D-185) · tavla/2. ocak/garson mantığı (D-186) · **pad fiyatları SB9** (D-188, config, bekçi
  "config = SB9") · **garson hız 3 · tepsi 2 · tek** (D-189) · **alçak bölme 1,2** (D-190; B/C/D silindi, perde `h` parametreli).
- Hata bulundu/düzeldi: yol ağı görüşü kapı pervazındaki yürüyeni "açık" sayıyordu → bot/garson geçit ucunda itip kalıyordu.

## ✅ KAT 2 AKIŞ TURU (D-191) + K2-6 MANTIK (D-192) + GÖRSEL (D-193) — kodda, üretimde kapı kapalı
- Akış sayfası https://claude.ai/artifact/Xejd4pNeiebku7FsPmjM3T (`tools/kat2-akis.tsx`).
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
- Kareler `tools/kat2-s3-kare.mjs` · ses sayfası paketleme: esbuild ile `tools/kat2-ses-dinle.html` tek dosyaya.

## ⏭️ SIRADAKİ ADIM (yeni chat)
1. Kullanıcı masaüstündeki `TeaHouse-deneme-Kat2-2026-11-13.apk` ile Kat 1 + Kat 2'yi oynuyor (D-197; Ayarlar → "Deneme: Kat 1'i
   bitir"). Gelen geri bildirimler → `docs/geribildirim-oyun-testi-<tarih>.md` (G-numaralı, kullanıcının cümlesiyle) → tur planı.
   Yeni deneme APK: `VITE_KAT2=1 VITE_DENEME=1 npm run apk` (google-services.json'a geçici `.deneme` istemcisi — D-197).
2. Geri bildirim turu bitince 1.1 yayını: `VITE_KAT2=1` · Game Center 6 başarım (ASC) · Play listesi + zip arkadaşa · "Yenilikler".
3. Not: Kat 1'deki yıkık merdivende sarı-siyah bant var (hafıza: bantlar beğenilmemişti) — kullanıcı denemede söylerse ele al.
Göz aracı: `node tools/_kat-kare.mjs` · geniş kadraj karşılaştırma (feedback_show_dont_ask).

## KULLANICIYA HATIRLAT
- 2026-11-13 kontrol: a) AdMob → Gizlilik ve mesajlaşma → Avrupa tüzükleri → Ayarlar → "Reklam kaynaklarını otomatikman
  reklam iş ortağı olarak ekle" kutusu ✅ 2026-11-13 Claude işaretledi + Kaydet (yenileyince kalıcı) · b) Unity: Chrome'da oturum kapalı, kontrol
  edilemedi (Monetization → Settings → Developer website = `https://mehmetmutllu.github.io`).
- Play üretim erişimi: 2026-11-13 hâlâ ses yok; kullanıcı haber verecek.
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
- Duman 2026-11-13'te bir kez 75/76 (`waitForSelector` 5 sn zaman aşımı istisnası, hangi denetim yakalanmadı); sonraki iki koşu 77/77.
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak.
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
