# activeContext — TUR KARTI

> **Bu dosya ÜZERİNE YAZILIR.** ≤ 80 satır, yalnız "şu an". Kural: `docs/oturum-akisi-mantik.md` (D-084).

## ŞU AN (2026-10-20 — iOS 1.0.0 YAYINDA · 1.0.3 iki platform · D-169)

**Kural:** Play Console'u Claude KULLANMAZ (kullanıcı/arkadaş yükler). iOS gönderimi ASC API ile (anahtar özel senkron deposunda,
kalıp: scratchpad `asc.mjs`/`gonder.mjs` — Git Bash'te `MSYS_NO_PATHCONV=1` şart, yoksa `/v1/...` yolu bozulur).
**Çalışma düzeni:** kullanıcı önce SEÇENEK ister; görsel kararlar ekran görüntüsüyle gösterilir.

**Bu tur:** Android ikon + açılış görseli Capacitor varsayılanıydı → gerçek ikon (`tools/android-ikon.py`, D-169). `ios-1.0.1` dalı
main'e birleşti; App ID'ye iCloud (ASC API). Sürüm 1.0.3 (10003). Codemagic iOS derlemesi yeşil → TestFlight → incelemeye gönderim
(releaseType AFTER_APPROVAL, sürüm notu TR+EN). Play: `Desktop/TeaHouseTycoon-1.0.3.aab` + `…-GooglePlay-1.0.3.zip`, sürüm notu
`docs/play/metin/*.txt` (notlar ChatGPT'ye danışılmadı — kullanıcı onayladı mı bak).

## ⏭️ SIRADAKİ ADIM
1. iOS 1.0.3 inceleme sonucunu izle (ASC). Onayda otomatik yayın.
2. Play ÜRETİM ERİŞİMİ ALINDI (2026-10-20). Üretim sürümü: 1.0.3 AAB (kapalı testte varsa Add from library), sürüm notu TR+EN
   `4-metinler/*.txt`, ülkeler üretimde ayrıca seçilir (rehber 9B). Arkadaş yükleyecek → yayına girince AdMob'u mağazaya bağla.
3. iOS'ta iCloud kayıt (sil-kur → ilerleme döner) gerçek cihazda denenmedi.
4. Küçükler: Usta kartındaki açık mavi "0/7" · küçük resimde zayıf üç (semaver, Restoran ≈ Krem fayans, Klasik Parke).
   Duman erken akışı ara sıra düşüyor ("q_coin") — kök sebep bulunmadı.

## AÇIK KALEMLER
- Play: servis hesabı JSON'u → RevenueCat; RC'de Android baslangic/reklamsiz = Non-consumable.
- Deyimix 1.0.1 "Pending Developer Release" — kullanıcı Release diyecek.
- AdMob "ABD eyalet yönetmelikleri" mesajı bakılmadı · ana görev ödülüne "video izle 2×" sorusu açık (varyant kapısı).
- `i18n/baslat` Preferences'tan önce okuyor (küçük).
