# S5 denge raporu — oyun testi 2026-11-20 (G-92 · 95 · 96 · 97 · 103 · 119 · 122 · 123 · 124 · 128)

Varyant kapısı (D-084) commit #1: araç + ham çıktı + rapor, **KARAR BOŞ**. `src/**` ve `economy.config.ts` bu turda değişmedi.
Kaynaklar (hepsi `OLCUM=tam`, damgalar temiz — istisna §G-124 FINAL notu):
- Kat 2: `tools/olcum-s5-denge.ts` → `docs/olcum-s5-denge.txt` (15 kol, 16 sa ufuk, dt 0,1, başlangıç D-205/D-206 `kur()` U0, 844 sn).
  Ölçülen kod = d2ef01d mantığı (koşu 4145a56 + yalnız görsel src farkıyla başladı; arada gelen commit yalnız görsel/HUD — oyun mantığı aynı).
- Kat 1: `tools/olcum-s5-kat1.ts` → `docs/olcum-s5-kat1.txt` (gerçek tick + bot, 8 tohum × 20 dk; + `simulate.ts` modeli).
- G-124 SONRA: `FINAL=1 OLCUM=tam tools/olcum-kat2-carpan-usta.ts` → `docs/olcum-s5-ux-g124-sonra.txt` (önce: `…-once.txt`).

## Determinizm (açık sorun 1) — ÇÖZÜLDÜ, rastgelelik değil kod değişikliği
- TABAN iki ayrı `OLCUM=kisa` koşuda iz **5eb3f5c2 = 5eb3f5c2** (eşzamanlı iki süreç); saat +12 sa ve +3 gün kaydırılınca da 5eb3f5c2.
- b8ba9f6a = S5 öncesi kod (4713156). 4713156'ya yalnız bugünkü `src/game/kat.ts` konunca → 5eb3f5c2. Sebep YAPI G-110:
  `OCAK_AL_DZ` 0,6 → 1,05 (ocak alma noktası kaydı → bot yolu değişir). src'de düzeltme gerekmez.
- Önlem (araçta): çıktıya `Kod:` satırı (HEAD + src farkının izi, koşu BAŞINDA alınır). İki çıktı yalnız aynı `Kod:` ile karşılaştırılır.

## §Bulgular (tam koşu sayıları)
Kat 2 biter = zincir + bütün masalar Sv5 + yükseltmeler. TABAN: **7,45 sa** · zincir 4,47 sa · 1.500 coin/dk · fincan başı bekleme 10,9 sn · kaçan fincan %7,4.

| G | kol | sayı satırı | takas |
|---|---|---|---|
| 92 | Kat 1 tepsi TABAN 30 | görev bekleme 30,6 sn (en uzun 39,4) · görev açılınca cüzdan hep 11 coin | — |
| 92 | F25 | 23,9 sn (34,6) | 25 de "her zaman yetmez" (cüzdan 11) |
| 92 | F25·X80 (cüzdan ≥ %80 ise tamamla) | 17,7 sn (25,6) · bağış 4 coin · 8/8 tohum tetik | küçük bağış |
| 92 | F25·X60 | 9,2 sn (17,8) · bağış 9 | |
| 92 | F25·X40 | 0,3 sn (0,6) · bağış 14 | fiilen "hep yeter" |
| 92 | (hepsi) | ilk alım 19,5 sn ✓ · garson 8,0-8,4 dk ✓ · garsona kadar en uzun boşluk 3,8-4,1 dk ✗ (2 dk hedefi; boşluk garson pad'i — tepsiden bağımsız) | |
| 95 | TABAN (oturur oturmaz ister) | ilk istek 0,1 sn · ilk servis ort 15,0 sn | |
| 95 | G95-ESKI (25 sn sonra ister) | ilk istek 25,0 sn · ilk servis 35,3 sn · biter 7,63 sa (+%2,4) · kaçan %4,8 | daha az kaçan, daha yavaş |
| 96 | TABAN (kahve parası serviste) | servis anında yığın 7.601 · yerden toplama 33,4 yığın/dk | |
| 96 | G96-KALKIS (bütün para kalkışta) | servis yığını 0 ✓ · toplama 11,9 yığın/dk · biter 7,34 sa (**−%1,5**) · kaçan %3,0 · bekleme 9,0 sn | anlık "kahve → para" ödülü kaybolur |
| 97 | G97-S18 (25→18 sn, fiyat 9→7,20 / tavla 3→2,50) | biter 7,57 sa (+%1,5) · 1.474 coin/dk · kaçan %12,4 · bekleme 11,5 sn | daha hareketli, daha çok kaçan |
| 97 | G97-S12 (→12 sn, 5,14 / 1,67) | biter 7,80 sa (+%4,7) · 1.404 coin/dk · kaçan **%18,2** · bekleme 12,9 sn | garson+oyuncu yetişemiyor |
| 103 | TABAN darboğaz | bekleyen fincan-sn: tepside %57,4 (= oyuncu %12,2 + garson %45,1) · ocakta hazır alınmadı %42,5 · **temiz fincan yok %0,0** · pişiyor %0,1 | bulaşık sebep DEĞİL |
| 103 | G103-BULASIKSIZ | biter 7,42 sa (−%0,5) · bekleme 10,2 sn · kaçan %5,8 | |
| 103 | G103-GARSON (yavaş oyuncu: garson gelince kahve taşımaz; G-128 sayımı açık) | biter 7,53 sa (+%1,0; G128-SAY'a +%0,9) · bekleme 11,8 sn · kaçan %10,1 · ocakta hazır alınmadı **%50,4** · oyuncu tepsisi %1,4 | gecikme = taşıyıcı kapasitesi |
| 119 | SV-EMU0 (emülasyon doğrulaması) | biter 7,48 sa (TABAN'a +%0,4 ✓ ±%2) · ilk Sv 4,50 sa | |
| 119/122 | G119-K2 (3 okey → Sv2, okey salonu dolu → Sv3, yarısı → Sv4/Sv5) | ilk Sv **1,56 sa** · zincir 8,38 sa · biter 8,47 sa (**+%13,2**) · k2_garson3 görevi 157 dk | Sv'ler zinciri tıkar |
| 119/122 | G119-K2T (Sv3 = bütün masalar açılınca) | ilk Sv **1,56 sa** · zincir 5,39 sa · biter 7,69 sa (+%2,8) · zincirden önce 21/88 Sv | erken Sv, küçük gecikme |
| 119 | K3 (Kat 1'e uygulanması) | **ölçülmedi** (Kat 1 görev kapısı D-142 + tam Kat 1 zinciri botu gerekir) | |
| 123 | TABAN tavla pad'leri 13.600-16.700 | her biri 6,1-8,9 dk biriktirme (o anki 1.732-2.867 coin/dk) · >10 dk pencere yalnız k2garson2 (10,1 dk) | |
| 123 | G119-K2'de | tavla pad'i başı 4,4-5,9 dk (Sv'li masalar daha çok kazandırır) | |
| 128 | TABAN (yalnız oyuncu servisi sayılır) | k2_kahve40 3,2 dk · hat 4,65 sa | |
| 128 | G128-SAY (garson servisi de sayılır) | k2_kahve40 **1,9 dk** · biter 7,46 sa (+%0,1) | ilerleme aynı |
| 124 | G124-ACIK (bugün; 20 dk Kat 2 / 10 dk Kat 1) | biter 7,51 sa · Kat 1'deyken **1.829 coin/dk = Kat 2'den 1.241 + Kat 1 588** · dönüşte yerde 1.798 coin | |
| 124 | G124-KAPALI (S5 öncesi) | biter 7,51 sa · Kat 1'deyken 582 coin/dk (Kat 2'den 0) · dönüşte yerde **14.134 coin** | para kaybolmaz, gecikir |
| 124 | G124-KAT2-KAPALI (sürekli Kat 2) | iz = TABAN (bot yığını 180 sn dolmadan topluyor → oto devreye girmiyor) | |
| 124 | FINAL önce → sonra (oyuncu hep Kat 2'de) | U0 biter 7,40 → 7,39 sa · Kat 1 arka plan 820 → 817 coin/dk · U20 7,74 → 7,67 · 717 → 730 | |

**G-124 FINAL notu:** `…-sonra.txt`'te "parmak izi = emülasyon" damgası kırık (cf9099f3 ≠ 8f5788f8; U20 28bcebdc ≠ ad92f37d). Bu damga S5
öncesi donmuş izle karşılaştırır; kod S5'te değişti (G-110 ocak noktası + G-124) → beklenen kırılma, sayılar geçerli.

## Mutasyonlar (araç, MUT=)
4/4 yakalandı: `say0` (kısa) → "G128-SAY: garson servisi sayaca girdi" + varyant etkili kırıldı · `aninda` (kısa) → "G96-KALKIS: servis
anında yığın yok" (140 yığın) + varyant etkili · `oto` (kısa) → "G124-KAPALI: Kat 1'deyken oto geliri = 0" (6.437) · `cap` (tam) →
"G119-K2: Sv2 ilk alımı k2s2okey3'ten sonra" + "Sv3 … k2s2okey6'dan sonra" kırıldı. Kat 1 aracı: `MUT=x0` (önceki tur, 6 damga).

## Karar paketi taslağı (sade dil — kullanıcıya böyle sorulur)
- **G-92 tepsi ilk fiyatı:** Tepsi görevi açıldığında cebinde hep 11 coin oluyor; 25 de 30 da hemen yetmiyor, 25'te ~24 sn,
  30'da ~31 sn bekliyorsun. "Cebinde fiyatın %40'ı varsa gerisini oyun tamamlasın" dersek görev anında biter (oyun 14 coin hediye eder).
  En kaliteli: **25 + %40 kuralı** — senin "param hep yetsin" isteğini birebir karşılıyor, hediye çok küçük.
- **G-95 ilk iş kahve:** Bugün zaten müşteri oturur oturmaz kahve istiyor (eskisi 25 sn sonraydı). Değişiklik gerekmiyor; eski hâle dönmek
  Kat 2'yi ~11 dk uzatıyor. En kaliteli: **bugünkü hâl kalsın**.
- **G-96 para ne zaman düşsün:** Bugün kahveyi götürünce masaya küçük bir para yığını çıkıyor. "Bütün para kalkışta" olursa masa başına tek
  yığın çıkar, yerden toplama üçte birine iner, Kat 2 ~7 dk erken biter, kaçan kahve %7'den %3'e düşer. Kaybı: kahve götürünce anında
  "para geldi" hissi yok. En kaliteli: **kalkışta tek yığın** (senin isteğin, sayılar da iyi).
- **G-97 daha sık istek, daha ucuz kahve:** 18 sn'de bir istek → daha hareketli ama kaçan kahve %12; 12 sn'de bir → %18 kahve kaçıyor ve
  Kat 2 ~20 dk uzuyor. Kazanç neredeyse aynı. En kaliteli: **18 sn** (tempo artar, kaçan kahve makul).
- **G-103 kahve neden geç geliyor:** Boş fincan yüzünden DEĞİL (bulaşık payı %0). Hazır kahve ocakta taşıyan bekliyor: garsona bırakan
  oyuncuda kahvelerin yarısı ocakta bekliyor, kaçan kahve %10'a çıkıyor. Bu bir denge değişikliği istemiyor; istersen garson tepsisi/hızı
  ayrı ölçülür. En kaliteli: **şimdilik değişiklik yok**, garson kapasitesi ayrı tur.
- **G-119/G-122 masa seviyesi ne zaman açılsın:** Bugün masa yükseltmesi Kat 2'nin sonunda (~4,5 sa) açılıyor. Senin önerin (3 okey masası →
  Seviye 2) bunu ~1,5 sa'e çekiyor. Ama "okey salonu dolunca Seviye 3" dersek herkes önce masaları yükseltip yeni masa açmayı bırakıyor,
  Kat 2 ~1 sa uzuyor. "Bütün masalar açılınca Seviye 3" dersek yükseltme yine erken başlıyor, Kat 2 yalnız ~13 dk uzuyor.
  En kaliteli: **3 masa → Sv2, bütün masalar açılınca → Sv3, yarısı → Sv4/Sv5** (G119-K2T). Kat 1'e uygulaması ölçülmedi.
- **G-123 tavla masası ~15K:** Her tavla masası için 6-9 dk biriktiriyorsun; 10 dk'yı geçen bekleme yok. Erken masa yükseltmesi seçilirse
  bu 4-6 dk'ya iner. En kaliteli: **fiyatlar kalsın** (G-119 kararıyla zaten kısalıyor).
- **G-124 Kat 2 paraları kendiliğinden toplansın mı:** Artık 3 dk yerde kalan Kat 2 parası kendiliğinden cebine giriyor. Kat 1'e indiğinde
  dakikada ~1.240 coin Kat 2'den akıyor; kapalıyken döndüğünde yerde ~14.000 coin seni bekliyordu. Bitiş süresi aynı. En kaliteli:
  **açık kalsın** (Kat 1 kuralıyla aynı; yalnız oto-toplanan paranın uçup "+X" yazması kaldırılmalı — UX notu).
- **G-128 garsonun servisi göreve sayılsın mı:** "40 kahve götür" görevi 3,2 dk'dan 1,9 dk'ya iner, oyunun geri kalanı değişmez.
  En kaliteli: **sayılsın** ("sen veya garsonların 40 kahve").

## KARAR
(boş — kullanıcı seçecek)
