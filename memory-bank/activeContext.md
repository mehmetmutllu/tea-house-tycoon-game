# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-10-21 — App Store tanıtım videoları · D-170 · D-171)

**Kural:** Play Console'u Claude KULLANMAZ (kullanıcı/arkadaş yükler). iOS gönderimi ASC API ile (anahtar özel senkron deposunda,
kalıp: scratchpad `asc.mjs`/`gonder.mjs` — Git Bash'te `MSYS_NO_PATHCONV=1` şart, yoksa `/v1/...` yolu bozulur).
**Çalışma düzeni:** kullanıcı önce SEÇENEK ister; görsel kararlar ekran görüntüsüyle gösterilir.

**Bu tur:** Apple'ın yeni "Header and Search Results" yerleşimleri araştırıldı (ölçü/kural: `docs/magaza-tanitim-video-raporu.md`).
Kayıt aracı yazıldı: sanal saat + kare kare 5760 px çekim + ffmpeg (`VIDEO=header|search DIL=tr|en node tools/magaza-video.mjs`).
Tur 1 (salınım header + tek planlı search) → kullanıcı: zemin koyu, search hareketleri saçma, masa açılınca oyuncu ışınlanıyor.
Tur 2: header 24 sn drone turu (Klasik Parke — krem fayans REDDEDİLDİ "başlangıç zemini olsun"), search 6 çekimli kesmeli
(çay al · servis · para · yükselt · yeni masa · geniş), masa açılışında oyuncu kayar (`actorTransform.ts`, D-171).
**Kullanıcı tam memnun değil** ("içime çok sinmedi") → header nasıl olmalı, önce internet araştırması (kısa not raporda).

## ⏭️ SIRADAKİ ADIM
0. Header araştırma notunu kullanıcıyla konuş (rapor §Araştırma) → yön seçilsin, sonra yeniden çek.
   Search TR/EN tur 2 İŞLENMEDİ (bellek yetmedi, iş durduruldu): `VIDEO=search DIL=tr …` ve `DIL=en` TEK TEK, paralel test YOK.
   Kapanışta duman ayrı koşuldu: 74/74 (ilk koşu bilinen q_coin kararsızlığıyla 16/23 düştü, ikinci temiz).
   Çıktılar git dışı: `docs/magaza-video/` (header.mp4 hazır) · Masaüstü `TeaHouseTycoon-AppStore-Video/` ESKİ tur 1.
1. iOS 1.0.3 inceleme sonucunu izle (ASC). Onayda otomatik yayın.
2. Play üretim sürümü 1.0.3 (arkadaş yükler) → yayına girince AdMob'u mağazaya bağla.
3. iOS'ta iCloud kayıt gerçek cihazda denenmedi.
4. Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç · duman "q_coin" ara sıra · lint: `src/game/ads.ts` 2 hata
   (no-useless-assignment, bu turdan değil).

## AÇIK KALEMLER
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- Deyimix 1.0.1 "Pending Developer Release" — kullanıcı Release diyecek.
- AdMob "ABD eyalet yönetmelikleri" mesajı bakılmadı · ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı).
- `i18n/baslat` Preferences'tan önce okuyor (küçük).
