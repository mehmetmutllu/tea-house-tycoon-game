# S5 denge raporu — oyun testi 2026-11-20 (G-92 · 95 · 96 · 97 · 103 · 119 · 122 · 123 · 124 · 128)

Varyant kapısı (D-084) commit #1: araç + ham çıktı + rapor; **KARAR ve final sayılar en altta** (ikinci tur, 2026-11-21). `src/**` ve `economy.config.ts` bu turda değişmedi.
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

## İkinci tur §Bulgular (kullanıcı kararlarından sonra yeni kollar — `docs/olcum-s5-denge-2.txt`, tam, damgalar temiz)
Ölçülen kod: HEAD 0da05f3 + yalnız `kat2Dongu.ts` kancaları (config'de yoksa oyun birebir: TABAN izi 5eb3f5c2 kısa / 7,45 sa tam = birinci tur).
G96-BULASIK = kahve 12 sn içilir, içilip fincan kirlenince parası düşer (teslimde değil), masa ücreti kalkışta. ILK12 = yalnız 1 masa açıkken aralık 12 sn.

| kol | Kat 2 biter sa | Δ% | coin/dk | kaçan % | bekleme sn | ilk masada oyuncu boşta % |
|---|---|---|---|---|---|---|
| TABAN | 7,45 | — | 1.500 | 7,4 | 10,9 | 85,9 |
| G96-BULASIK | 7,45 | −0,0 | 1.502 | 6,7 | 10,7 | 86,0 |
| G97-S18 | 7,57 | +1,5 | 1.474 | 12,4 | 11,5 | 84,2 |
| G97-S18-ILK12 | 7,50 | +0,6 | 1.476 | 11,7 | 11,3 | **77,9** |
| G96 + S18 | 7,59 | +1,8 | 1.466 | 11,9 | 11,6 | 83,5 |
| G96 + S18 + ILK12 | 7,59 | +1,8 | 1.467 | 11,3 | 11,7 | 77,9 |

Masa dilimi (açık masa sayısı) — kaçan % · garson "yetişemez" payı (bekleyen fincan > yoldaki ve boş garson yok):

| dilim | TABAN | G97-S18 | G96+S18+ILK12 |
|---|---|---|---|
| 1 masa | 0,0 · 0,0 | 0,0 · 0,0 | 0,0 · 0,0 |
| 2-4 | 0,0 · 0,3 | 0,1 · 4,4 | 0,3 · 5,5 |
| 5-10 | 0,9 · 24,5 | 2,2 · 50,1 | 2,0 · 54,8 |
| 11-16 | 2,0 · 59,7 | 5,1 · 74,6 | 4,3 · 74,9 |
| 17-22 | **11,0 · 86,4** | **17,9 · 95,2** | **16,4 · 94,9** |

Okuma: kullanıcının endişesi doğru yerde — 18 sn'de kaçan kahve masa sayısıyla büyüyor; 17-22 masada garsonlar zamanın %95'inde yetişemiyor,
kaçan %11 → %16-18. Durma eşiğinin (%20 / Kat 2 +%10) altında; ayrı tur önerisi: garson tepsi/hız ya da geç-oyun istek aralığı ölçümü.
ILK12: ilk masada boşta %84 → %78, kaçan artmıyor (11,7 ≤ 12,4) → **uygulandı**.

## KARAR (kullanıcı, 2026-11-20)
- **G-96:** kahve parası içilip fincan kirlenince düşer (her kahve ayrı, `kahveIcme` 12 sn), masa ücreti kalkışta. Yorum: oyunda fincan önceden
  "sonraki teslimde" kirleniyordu; "içip bitirince" için içme süresi eklendi (teslimde para yok, ~12 sn sonra düşer).
- **G-97:** 18 sn (okey 7,2 · tavla 2,5) + ILK12 (yalnız 1 masa açıkken 12 sn). · **G-119/122:** K2T (`masaSvKapi`; Sv görevleri hattan düştü).
- **G-123** fiyatlar kalsın · **G-95 / G-103** değişiklik yok · **G-124** oto-toplama açık (zaten kodda) · **G-128** garson servisi sayılır.
- **G-108:** `docs/s5-npc/g108.patch` uygulandı, bekçi `tests/g108-garson-itmez.test.ts`. · **G-129 C:** tavla ikişerli blok (z 1,3/3,7 · 7,3/9,7 · 13,3/15,7).
- **G-92:** kararsız — dokunulmadı.

## Final (birleşik kod — `FINAL=1 OLCUM=tam KOLLAR=TABAN,KORUNUM` → `docs/olcum-s5-denge-final.txt`, damgalar temiz, KORUNUM = TABAN izi)
Kat 2 biter **7,82 sa (+%5,0)** · zincir 5,51 sa · **1.392 coin/dk** · kaçan **%11,3** · bekleme 10,9 sn · ilk Sv 1,57 sa (Sv2 okey3'ten sonra,
Sv3 5,54 sa = bütün masalar açılınca) · zincirden önce 21/88 Sv · k2_kahve40 1,5 dk · içilince düşen yığın 9.067 / kalkış 3.021 · 17-22 masada kaçan %17,5.
Dikkat: K2T'de Sv alımı zinciri uzatıyor — k2_s2okey4 görevi 54 dk, k2_s2okey6 26 dk (>15 dk görev 9 adet). Kayıt: masa yerleri/Sv kimlikle → saveVersion
gerekmedi; Sv görevinde/sonunda kalmış kayıt bitmiş hatta oturur (`kat2GorevKaydiCoz` D-205 sırasında geriye yürür).

Mutasyonlar (12/12 yakalandı): G-128 eski sayım · G-119 yarı kuralı yok / Sv görevleri hatta / kayıt geriye yürümez · G-129 blok 1,0 · G-96 para serviste /
içilince düşmez / kalkışta kaybolur / config kancası yok · G-97 ILK kancası yok / tavla aralığı 25 · G-108 yama geri.

### Önerilen D kayıtları (decisions.md'ye orkestratör yazar)
- **D-G96** Kat 2 kahve parası içilince: teslimde para yok; kahve `kahveIcme` 12 sn içilir, bitince fincan kirli + parası masanın önüne (her
  teslim ayrı; yenisi gelirse önceki o an biter). Kalkışta içilmekte olan + masa ücreti. Ölçüm G96-BULASIK: biter ±0, kaçan 7,4 → 6,7.
- **D-G97** İstek 25 → 18 sn, fiyat teorik kahve geliri sabit (okey 9→7,2, tavla 3→2,5); yalnız 1 masa açıkken 12 sn (ilk masada boşta 84→78 %).
  Bedel: 17-22 masada kaçan 11 → 17 %, garsonlar %95 yetişemiyor → geç-oyun taşıma kapasitesi ayrı tur.
- **D-G119** Kat 2 masa Sv kapısı zincirde (`masaSvKapi`): 3 okey → Sv2, bütün masalar → Sv3, yarısı Sv3 → Sv4, yarısı Sv4 → Sv5. D-142'nin Kat 2
  karşılığı (görev kapısı) ve Sv görevleri kalktı. Kat 1'e uygulanması ölçülmedi.
- **D-G128** Kat 2 'servis' görev sayacı oyuncu + garson servisini sayar.
- **D-G129** Kat 2 tavla düzeni C: ikişerli blok, okey sıralarının ±1,2 hizasında; 22 masa, sıra/fiyat/zincir aynı.
- **D-G108** Kat 1 garsonu oyuncuyu itmez (navStep'ten oyuncu/engel ayrışması çıktı).
- Final birleşik: Kat 2 7,45 → 7,82 sa (+%5,0), kaçan 7,4 → 11,3 %, 1.500 → 1.392 coin/dk.
