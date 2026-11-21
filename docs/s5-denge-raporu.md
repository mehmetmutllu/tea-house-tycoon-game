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
- **G-92:** F25·X40 uygulandı (kullanıcı onayı 2026-11-21) — `character.tray.costs[0]` 25 + `tray.ilkTamamla` (q_charTray1, %40). Final `OLCUM=tam KOLLAR=TABAN` → `docs/olcum-s5-kat1-final.txt`: görev bekleme 0,3 sn (en uzun 0,6) · ilk alım 19,5 · garson 8,03 dk · tohum başına ilk alım/garson/tepsi zamanları F25·X40 satırıyla birebir. Model (simulate) kuralı bilmiyor, 25'i tam biriktirir (garson 5,00 dk) — kural eklenince `meta-pencere` §5 bekçisi 1 sn'lik eşleşmelerden kırılıyor; ayrı karar.

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

## Üçüncü tur §Bulgular (taban = birleşik kod; `TUR=3 OLCUM=tam` → `docs/olcum-s5-denge-3.txt`, damgalar temiz, 1.587 sn)
Kod: 7edca73 (src temiz); koşu sırasında 912809b (G-92) geldi — mutasyon koşusunda 912809b'de TABAN izi a02827ea ve GB izi 2e2c1ba6
tam koşuyla BİREBİR → G-92 Kat 2 ölçümünü değiştirmiyor, 18 kol geçerli. TABAN = S5 final (7,82 sa · iz a02827ea), KORUNUM = TABAN izi.
G4 = 4. garson, k2tavla5'ten (15 masa) sonra zinciri bekletir, 15.000 coin (garson zinciri 4.800 · 10.100 · 13.000 deseni), alım 4,47-4,50 sa.
AD = istek aralığı 18 × (1 + k·max(0, masa − 10)) sn, kahve fiyatı SABİT (daha az istek = daha az kahve parası). GH+25 = garson 3 → 3,75,
hız yükseltmesi 4 → 5 (oyuncu Kat 2'de 6,04 — garson yine yavaş). "Yetişemez" = bekleyen fincan > yoldaki ve boş garson yok (meşguliyet).

| kol | Kat 2 sa | Δ% | coin/dk | kaçan % | 11-16: kaçan · yetişemez | 17-22: kaçan · yetişemez | en uzun görev dk | >15 · >20 dk |
|---|---|---|---|---|---|---|---|---|
| TABAN | 7,82 | — | 1.392 | 11,3 | 6,7 · 76,7 | **17,5 · 95,2** | k2_s2okey4 54,4 | 9 · 5 |
| GT3 (tepsi 3) | 7,83 | +0,1 | 1.398 | 9,3 | 4,5 · 65,5 | 14,1 · 91,0 | 54,2 | 9 · 5 |
| GH+25 (hız) | 7,78 | −0,6 | 1.412 | 5,2 | 2,7 · 70,7 | **7,9** · 95,7 | 53,9 | 9 · 5 |
| G4 (4. garson) | 7,90 | +1,0 | 1.409 | 6,4 | 5,9 · 72,7 | **8,4** · 88,9 | 54,4 | 9 · 5 |
| AD k 0,02 | 7,84 | +0,2 | 1.389 | 8,5 | 6,9 · 73,3 | 12,5 · 89,5 | 54,4 | 9 · 5 |
| AD k 0,04 (≤ %10 için en küçük k; 22 masada 26,6 sn) | 7,85 | +0,3 | 1.385 | 6,4 | 4,4 · 66,1 | **9,5** · 84,9 | 54,4 | 9 · 5 |
| AD k 0,06 | 7,89 | +0,9 | 1.380 | 5,1 | 4,3 · 58,5 | 7,0 · 75,3 | 54,4 | 9 · 5 |
| AD k 0,08 | 7,89 | +0,9 | 1.380 | 4,3 | 3,1 · 58,4 | 5,8 · 72,4 | 54,4 | 9 · 5 |
| GT3 + G4 | 7,89 | +0,9 | 1.407 | 5,6 | 3,7 · 61,8 | 7,5 · 81,7 | 54,2 | 9 · 6 |
| GT3 + GH25 | 7,69 | −1,7 | 1.421 | 3,3 | 1,4 · 65,6 | 4,8 · 92,3 | 54,2 | 8 · 5 |
| **GH25 + G4** (en iyi iki tek kol) | 7,80 | −0,3 | **1.419** | **2,2** | 2,2 · 64,7 | **2,4** · 84,9 | 53,9 | 9 · 6 |
| GB (görev bölme) | 7,83 | +0,1 | 1.390 | 11,4 | 7,0 · 75,9 | 17,5 · 94,2 | k2_s2okey4 **44,1** | 4 · 1 |
| GB + GT3 | 7,84 | +0,3 | 1.395 | 8,7 | 4,2 · 63,9 | 13,4 · 91,3 | 45,1 | 4 · 1 |
| GB + G4 | 7,92 | +1,3 | 1.405 | 6,7 | 5,9 · 73,6 | 9,0 · 88,4 | 44,1 (k2_tavla6 24,0) | 4 · 2 |
| GB + GT3 + G4 | 7,91 | +1,2 | 1.401 | 5,8 | 3,6 · 61,1 | 8,1 · 81,3 | 45,1 (k2_tavla6 23,8) | 4 · 2 |
| ICME8 | 7,85 | +0,4 | 1.392 | 11,1 | 7,2 · 74,7 | 16,8 · 93,9 | 54,3 | 9 · 5 |
| ICME12 = TABAN | 7,82 | — | 1.392 | 11,3 | 6,7 · 76,7 | 17,5 · 95,2 | 54,4 | 9 · 5 |
| ICME16 | 7,84 | +0,3 | 1.389 | 11,8 | 7,3 · 77,7 | 18,3 · 95,7 | 54,8 | 9 · 5 |

**GB neden k2_s2okey4'ü kısaltamadı** (GB'de pencerenin alım dökümü): 44,1 dk'nın içinde 7 masa Seviye 2 alımı var (47.250 coin; 4,7 · 10,3 ·
15,9 · 21,1 · 26,4 · 32,0 · 36,9. dk) ve ancak sonra 4. okey masası (44,1). Uzunluk pad'den değil, okey3'le açılan Seviye 2 yükseltmelerinden.
Diğer bölmeler çalıştı: k2_s2okey6 26,4 → 13,0 + 13,8; tavla görevleri hepsi ≤ 17,2 (tavla1 15,2 · tavla3 17,2 · tavla6 17,0; GB+G4'te
tavla6 24,0 çünkü 4. garson alımı o pencereye düşüyor — gerçekte 4. garson kendi görevi olur).
**GB-SV (aynı tam koşudan zaman çizelgesiyle — ödül zamanlaması hariç tahmin):** okey4 görevi üçe — "3 okey masasını Seviye 2'ye çıkar"
15,9 dk · "6 okey masasını Seviye 2'ye çıkar" 16,1 · "Okey salonunda 4 masa aç" 12,1 → en uzun görev **17,2 dk (k2_tavla3)**, >20 dk 0,
>15 dk 5. İkiye bölmek (4 masa Sv2 + aç) 21,1 + 23,0 → hedefi tutmuyor. Bu kol KOD ister: bugün `masaSvKapi` varken Sv görevleri hattan
düşüyor (`kat2Gorevleri`); Seviye görevi kapıyla birlikte hatta kalmalı (Kat 1 D-142 karşılığı).
**İçme süresi:** 8 / 12 / 16 sn arasında fark gürültü düzeyinde (Kat 2 ±%0,4, kaçan 11,1 / 11,3 / 11,8) — denge seçimi değil, his seçimi.

Mutasyonlar (3/3 yakalandı): `MUT=gt2` kısa → "varyant etkili (GT3)" kırıldı (iz = TABAN 781ef0aa) · `MUT=gbodul` kısa → "GB: ödül
toplamı korunur" kırıldı (49.550 ≠ 49.200) · `MUT=g4yok` tam → "G4: 4. garson alındı ve geldi" kırıldı (alım 4,48 sa · garson 3).

### Karar paketi taslağı (üçüncü tur — sade dil)
- **Garsonlar kalabalıkta yetişsin mi:** Bugün 17 masadan sonra her 100 kahveden ~18'i soğuyup gidiyor; garsonlar hiç boş kalmıyor.
  - *Garsonlar %25 hızlı yürüsün:* soğuyan kahve 100'de ~8'e iner, Kat 2 ~3 dk erken biter, dakikada ~20 coin fazla. Garson yine senden yavaş.
  - *4. garson (tavla köşesinde 5 masadan sonra, 15.000 coin):* 100'de ~8; Kat 2 ~5 dk uzar (garsonun parası), kazanç biraz artar.
  - *İkisi birden:* 100'de ~2 — neredeyse hiç kaçmaz, Kat 2 aynı sürede biter, kazanç en yüksek (dakikada +27 coin).
  - *Tepsi 3 fincan:* 100'de ~14 — tek başına yetmiyor. *Kalabalıkta müşteri daha seyrek istesin:* 100'de ~10, ama kahve parası azalır.
  - En kaliteli: **hız +%25 + 4. garson** — senin "bırakıp yenisini alıp yetişsin" isteğini tam karşılar, yeni bir garson alma anı da
    ekler. "%10 civarı kaçsın, biraz telaş kalsın" dersen tek başına **hız +%25** yeterli.
- **Uzun görevler:** Bugün "Okey salonunda 4 masa aç" görevi ~54 dk sürüyor; çünkü arada 7 masayı Seviye 2'ye çıkarıyorsun ve görev bunu
  hiç saymıyor. Sadece masa sayısıyla bölünce yine 44 dk kalıyor. Kat 1'deki gibi araya "3 okey masasını Seviye 2'ye çıkar" ve "6 okey
  masasını Seviye 2'ye çıkar" görevleri girerse her görev ~16 dk olur; tavla görevleri de tek masalık adımlara inince en uzun görev ~17 dk.
  Ödül toplamı aynı. En kaliteli: **Seviye ara görevleri + tek masalık tavla adımları**.
- **Kahve kaç saniyede içilsin (para ne zaman düşsün):** 8, 12 ya da 16 sn — oyunun hızına ve kazancına etkisi yok denecek kadar az.
  12 sn'de kahveyi bıraktıktan kısa bir süre sonra masada para belirir. En kaliteli: **12 sn kalsın** (ya da sen "para daha çabuk düşsün"
  dersen 8 sn — sayılar aynı).

### KARAR (üçüncü tur)
(boş — kullanıcı seçecek)
