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

## K2-2 — KAT ALTYAPISI ✅ (D-182 · D-183) — kod girdi, sürüme ÇIKMADI (üretimde kapı kapalı)
- K2-2a: `src/game/kat.ts` (geometri · `kat2Adim` · `merdivenTetik` · `kat2Etkin()`), kayıt `kat` + `kat2` additive (sürüm 34),
  Kat 2'deyken Kat 1 işler (`KAT1_DISI`), `Kat2.tsx` boş merdiven salonu, `KatPerdesi`. Dev: `__kat2()` aç · `__kat2(2)` geç.
- K2-2b: Kat 1'de `MerdivenTamir` (kırmızı yolluklu — kullanıcı onayladı, kareler artifact 5urr3ut2YGwzVNrwigG1MU) · Kat 2'de kat bandı
  (`data-testid="kat-bandi"`) + Kat 1 ipuçları susar · `__devPlan` sis düzeltmesi. `__game().merdivenTamirli`.
- Bekçi `tests/kat2-altyapi.test.ts` 19 test · duman 77/77 + 4/4 · vitest 1904.
- Göz aracı: `node tools/_kat-kare.mjs <klasör> x '[["kat2"],["gec"],["tp",x,z],["js","..."],["kare","ad",ms]]'`.
- Kat 2 metni EN dahil yayından önce ChatGPT mikrometin turuna girer.

## ✅ Kat 2 sprint S1 bitti (2026-11-13) · D-185 · D-186 · D-187 — üretimde kapı kapalı
- Plan `docs/sprintler/kat2-S1-plan.md` · defter `docs/sprintler/kat2-S1-defter.md` (S2'ye devreden tam liste orada).
- Kodda: Kat 2 döngüsü çiziliyor (pad, okey/tavla, ocak, grup, balon A, tepside kahve, sikke kulesi A, bahçe A) · salonlar +
  geçit yürüyüşü store'a bağlı · `kasa.ts` saf modül (bağlı DEĞİL) · tavla mantığı (`Kat2Ayar.tavla?` yok → grup gelmez).
- Raporlar: `docs/kat2-tavla-raporu-k2-3c.md` · `docs/kat2-kasa-raporu-k2-4.md` (§Karar dolu, final koşu S2'de).

## 🔧 Kat 2 sprint S2 — 4 ajan bitti, YARIM KAPANIŞ (2026-11-13 gece, kullanıcı uyudu)
Plan `docs/sprintler/kat2-S2-plan.md` · ajan notları `docs/sprintler/kat2-S2/` (kasa · garson · zincir · gorsel).
- A kasa (D-185) KODDA: kasa.ts ölçüm (EMA 600 sn, soğuk 120 sn = sınırsız, taban 300), tick/store/save (additive, sürüm 34),
  Kat 1'deyken Kat 2 işler, çevrimdışı, `KasaSayaci.tsx`, `three/Kasa.tsx`, bekçi `tests/kasa-oyun.test.ts`.
  **EKSİK:** final tam koşu yarıda kesildi (`docs/olcum-kat2-kasa-s2.txt` yalnız başlık) · rapor §Uygulama yazılmadı · A'nın
  mutasyonlarını ben doğrulamadım.
- B Kat 2 mantığı (D-186) KODDA: T120U, zincir config'te (yeni fiyatlar TASLAK), `OCAKLAR`/`ocaklar`, garson (yalnız tavla kahvesi,
  config'te sayı YOK), `olay.kalkan`. Okey birebir. Mutasyon 2/2 (ben). Ben 2. ocak kutusunu çizime eşitledim ([1,8; 1,03], al z 2,70)
  → **garson ölçümü (`docs/olcum-kat2-garson.txt`) bu değişiklikten önce; tam koşu yeniden alınmalı.**
- C zincir ölçümü: öneri SB9 (5,02 sa, en uzun bekleyiş 13,3 dk) · `docs/kat2-zincir-raporu-k2-5.md` · birleşik ağaçta final koşu tekrar.
- D görsel: 2 ocak, garson, kalkış, aday temizliği, bölme panosu `docs/sprintler/kat2-S2/kareler/pano-bolme.png` (`?k2bolme=A|B|C|D`).
- Durum: vitest 1986/1986 · tsc temiz · EN duman 4/4 · ana duman sayısı görülmedi (koşu durduruldu) → yarın ilk iş.

## ⏭️ SIRADAKİ ADIM (yarın)
1. `npm run duman` (ana sayı) · A için 2 mutasyon · `OLCUM=tam` kasa (`tools/olcum-kat2-kasa.ts` → `-s2.txt`) + rapor §Uygulama.
2. Garson + zincir tam koşuları yeniden (`tools/olcum-kat2-garson.ts`, `tools/olcum-kat2-zincir.ts`).
3. `npm run build` → S2 commit #2 → S2 karar paketi (tek mesaj, sade): ① pad eğrisi (C öneri SB9) ② garson sayıları (B tablosu)
   ③ bölme A/B/C/D (D panosu) + D'nin iki küçük sorusu (salondaki ocak davlumbazsız kalsın mı · 2. ocak açılmadan tadilat perdesi).
4. Defter `docs/sprintler/kat2-S2-defter.md` + D-188…

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
- Duman 2026-11-13'te bir kez 75/76 (`waitForSelector` 5 sn zaman aşımı istisnası, hangi denetim yakalanmadı); sonraki iki koşu 77/77.
- Wordmaster oturumu Kaktus'a Unity'yi S17 sonrası kendi kuracak.
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- iOS'ta iCloud kayıt gerçek cihazda denenmedi · AdMob "ABD eyalet yönetmelikleri" bakılmadı.
- Ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı) · `i18n/baslat` Preferences'tan önce okuyor (küçük).
