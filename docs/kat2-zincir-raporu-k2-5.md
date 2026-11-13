# K2-5 — KAT 2 AÇILIŞ ZİNCİRİ: PAD FİYATLARI (yalnız ölçüm)

> Araç: `tools/olcum-kat2-zincir.ts` → `docs/olcum-kat2-zincir.txt` (tam koşu, 63 sn, damgalar temiz).
> Fiyatlar koda/config'e YAZILMADI (D-084): kollar araçta üretilir, `Kat2Ayar` araçta kurulur.
> Tam koşu, S2'nin ortak ağacında alındı (B'nin zinciri + 2. ocak + garson API'si, A'nın store'u ara hâlde).
> Birleştirmeden sonra orkestratör final tam koşuyu yeniden alır.

## §Soru

Kat 2'nin 27 pad'i (D-186 sırası: okey1 → cezve → okey2-4 → salon2 → s2okey1-2 → cezve2 → s2okey3-6 →
salon3 → garson → tavla1-12) hangi fiyat eğrisiyle **4-6 saatte** (aktif) biter? En uzun bekleyiş ne olur?
Oyuncu kasayı boşaltmak için Kat 1'e kaç kez iner? Çevrimdışı (D-185 kuralı) art arda iki pad açtırıyor mu?

## §Yöntem

- **Başlangıç:** bitmiş Kat 1 (bütün pad'ler, yükseltmesiz, karakter son kademe; `olcum-kat2-kasa` kalıbı),
  merdiven açık, Kat 2 boş, **cüzdan 0**. Gerekçe: Kat 1'in son pad'i ve (S3'te) merdiven tamiri cüzdanı boşaltır.
  Gerçekçi en kötü başlangıç bu. Kat 2'nin ilk parası kasadan gelir.
- **Kat 1 arkada:** gerçek store (`runTick`) oyuncu yokken 60 dk koşturuldu (5 dk ısınma, tohum 7). Kendiliğinden
  toplanan her sikkenin ₺'si adım adım bir İZE yazıldı: **81,5 ₺/dk**. Uzun ufukta bu iz çevrimli çalındı. Oyuncu
  yokken Kat 1 Kat 2'den bağımsızdır ve durağandır. Kasa D-185'e göre işler: sınır = 20 dk × 81,5 = **1.620 ₺**,
  doluyken Kat 1 durur (iz ilerlemez). Muhasebe araçta tutuldu, saf fonksiyonlar `src/game/kasa.ts`'ten.
- **Kat 2:** `kat2Tick` + bot (`olcum-kat2-tavla` kalıbı: bölmeden geçitle geçer, masa gövdeleri yok sayılır).
  Öncelik sırası: sıradaki pad (cüzdan yetiyorsa) → kasa politikası (Kat 1'e in) → yığın → kahve servisi
  (sabrı en az kalan) → hazır kahvesi olan en yakın ocak. Pad dolumu 3,5 sn (config taslağının deseni).
- **Kat 1 ziyareti:** bot merdivene yürür (Kat 2'de, kova koridorundan). Sonra geçiş 0,7 sn + varıştan tezgâh
  ucundaki kasaya (−10,8; −9,3) gidiş-dönüş + geçiş 0,7 sn gelir (düz çizgi, son kademe hız). Bu sırada Kat 2 de işler (D-185).
- **Tavla** T120U (D-186) · okey D-184 (config). **Ufuk** 10 sa: bitmeyen kol "bitmedi n/27" yazılır.
- **Damgalar:** bot yürüdü (≥ 30 br/dk) · ₺ korunumu üç denklemde (Kat 2: düşen = toplanan + yerde; kasa: giren =
  boşalan + kasada; cüzdan: Kat 2 + kasa + Kat 1 doğrudan − harcama = son cüzdan) · varyant etkili (her kol tabandan
  ayrışır) · zincir bekçisi (`kat2ZincirHatasi`) tutarlı.
- **Mutasyonla doğrulama** (kısa koşu): `ZINCIR_MUT=fiyat2` (bütün fiyatlar ×2) → G1.15-500 3 saatte 22 → 15 pad.
  `ZINCIR_MUT=kahvesiz` (bot kahve taşımaz) → Kat 2'nin 3. saati 471 → 243 ₺/dk ve bot yürüdü damgası kırıldı (bot boşta).
  İkisinde de araç değişikliği yakaladı.

## §Kollar

| kol | eğri |
|---|---|
| G1.15-500 (taban) · G1.10-500 · G1.20-500 | geometrik: pad i = ilk fiyat × oran^i |
| G1.10-1500 · G1.15-1500 | aynı eğri, ilk fiyat 1.500 ₺ |
| G1.35-500 · G1.50-500 · G1.70-500 | sözleşmede örnek verilen dik eğriler |
| T1.15-500 · T1.12-500 | geometrik + tür çarpanı: ocak ×1,5 · salon ×2,5 · garson ×2 |
| SB8 · SB9 · SB10 · SB12 | **sabit bekleyiş**: pad fiyatı = o anki teorik gelirin (Kat 1 + açık Kat 2 masaları) N dakikası |
| DUZ3000 | düz: her pad 3.000 ₺ |
| politika (SB9 üstünde) | KARMA (taban: kasa %80 dolunca **ya da** sıradaki pad için açığı kasa kapatıyorsa iner) · P80 · P100 (dolunca) · IHT (yalnız gerekince) |
| garson (SB9 üstünde) | örnek sayı `{ hiz 2, tepsi 2, sayi 1 }` (B'nin ölçümü gelmeden). İki kip: oyuncu her isteğe koşar · oyuncu yalnız okeyde |

Fiyatlar yuvarlandı (< 1.000 → 50'lik, < 10.000 → 100'lük, sonrası 500'lük). Her kolun pad-pad fiyatı ve açılış
dakikası: çıktı §B.

## §Bulgular

### Bulgu 1 — Kollar (tam koşu, 10 sa ufuk, politika KARMA, garsonsuz)
| kol | zincir ₺ | toplam | en uzun bekleyiş (pad) | medyan bekleyiş | Kat 1'e iniş | çevrimdışı ihlal |
|---|---|---|---|---|---|---|
| G1.15-500 (taban) | 142.350 | **4,72 sa** | **29,6 dk** (tavla12) | 7,0 dk | 32 | 9/27 |
| G1.10-500 | 60.700 | 2,29 sa | 9,4 dk (tavla12) | 4,5 dk | 27 | 13/27 |
| G1.10-1500 | 182.000 | 6,71 sa | 28,3 dk (tavla12) | 13,4 dk | 38 | 0/27 |
| G1.15-1500 | 425.300 | bitmedi 23/27 | 56,4 dk (tavla8) | 17,1 dk | 46 | 0/27 |
| G1.20-500 | 339.750 | bitmedi 26/27 | 75,4 dk (tavla11) | 10,6 dk | 50 | 7/27 |
| G1.35-500 | 4.715.200 | bitmedi 17/27 | 122,6 dk (tavla2) | 15,0 dk | 45 | 4/27 |
| G1.50-500 | 56.821.050 | bitmedi 13/27 | 140,0 dk (s2okey6) | 20,0 dk | 43 | 3/27 |
| G1.70-500 | 1.191.218.550 | bitmedi 10/27 | 154,1 dk (s2okey3) | 26,0 dk | 41 | 2/27 |
| T1.15-500 | 153.100 | 5,16 sa | 29,6 dk (tavla12) | 9,5 dk | 32 | 7/27 |
| T1.12-500 | 92.700 | 3,39 sa | 15,5 dk (tavla12) | 6,8 dk | 27 | 9/27 |
| SB8 | 116.150 | 4,40 sa | 11,8 dk (tavla7) | 9,9 dk | 27 | 3/27 |
| **SB9** | **130.800** | **5,02 sa** | **13,3 dk** (tavla11) | **11,3 dk** | 27 | **2/27** |
| SB10 | 145.400 | 5,52 sa | 14,7 dk (tavla9) | 13,0 dk | 27 | 0/27 |
| SB12 | 174.500 | 6,58 sa | 16,9 dk (tavla9) | 14,1 dk | 32 | 0/27 |
| DUZ3000 | 81.000 | 4,46 sa | 37,4 dk (okey1) | 6,7 dk | 31 | 0/27 |

- **Dik geometrik eğriler (×1,35 / ×1,5 / ×1,7) 10 saatte bitmiyor.** 27 pad'lik zincirde gelir masa sayısıyla
  doğrusal büyüyor (Bulgu 4), fiyat ise katlanarak. ×1,35'te tavla2 61.000 ₺, tavla12 1,2 milyon ₺. Kat 1'in kısa
  zincirlerinde işleyen oranlar burada çalışmıyor.
- **Geometrik ×1,15 süreyi tutturuyor (4,72 sa) ama bekleyiş sona yığılıyor.** İlk pad'ler 4-5 dk, son tavlalar
  20-30 dk. Medyan 7 dk iken en uzun bekleyiş bunun 4 katı.
- **Sabit bekleyiş eğrisi düz bir tempo veriyor.** SB9'da en uzun bekleyiş (13,3 dk) medyanın (11,3 dk) yalnız
  1,2 katı. Süre N ile neredeyse doğrusal: 8 → 4,40 · 9 → 5,02 · 10 → 5,52 · 12 → 6,58 sa.
- **İlk fiyat 1.500 olunca ilk masa 18,8 dk sonra açılıyor.** Cüzdan 0'da ilk para yalnız kasadan gelir (81 ₺/dk;
  para 3 dk yerde bekledikten sonra kasaya akar). 500 ₺ → 6,3 dk · SB9'un 750 ₺'si → 10,2 dk · düz 3.000 → 37,4 dk.
- **Tür çarpanı** (salon ×2,5) toplamı az değiştiriyor. Salon önündeki bekleyişi uzatıyor (T1.15: salon3 7.700 ₺)
  ve hemen sonraki masa ucuzladığı için tempo zikzak oluyor.

### Bulgu 2 — Önerilen eğri SB9: pad fiyatları ve açılış dakikası (tam koşu)
| pad | ₺ | açılış dk | | pad | ₺ | açılış dk |
|---|---|---|---|---|---|---|
| okey1 | 750 | 10,2 | | salon3 | 5.600 | 140,9 |
| cezve | 950 | 19,5 | | garson | 5.600 | 152,2 |
| okey2 | 1.200 | 28,4 | | tavla1 | 5.600 | 164,2 |
| okey3 | 1.700 | 38,6 | | tavla2 | 5.800 | 175,6 |
| okey4 | 2.200 | 48,5 | | tavla3 | 6.100 | 187,9 |
| salon2 | 2.700 | 57,1 | | tavla4 | 6.300 | 200,5 |
| s2okey1 | 2.700 | 67,0 | | tavla5 | 6.600 | 212,0 |
| s2okey2 | 3.200 | 77,2 | | tavla6 | 6.800 | 224,6 |
| cezve2 | 3.600 | 87,5 | | tavla7 | 7.100 | 237,2 |
| s2okey3 | 3.600 | 97,4 | | tavla8 | 7.300 | 249,1 |
| s2okey4 | 4.100 | 107,6 | | tavla9 | 7.500 | 261,6 |
| s2okey5 | 4.600 | 117,9 | | tavla10 | 7.800 | 274,6 |
| s2okey6 | 5.100 | 129,0 | | tavla11 | 8.000 | 287,9 |
| | | | | tavla12 | 8.300 | 300,9 |

Salon, ocak ve garson pad'i SB'de masadan pahalı değil: fiyat yalnız o anki gelire bakıyor. Salon2 2.700 ₺ =
s2okey1 2.700 ₺. Salonların pahalı olduğu kol T1.12/T1.15. Bu kollar süreyi tutturuyor ama tempoyu zikzaklatıyor (Bulgu 1).

### Bulgu 3 — Kasaya iniş politikası (SB9)
| politika | toplam | iniş | en uzun bekleyiş | Kat 1 durdu | kasa taşan |
|---|---|---|---|---|---|
| **KARMA** (taban) = IHT | 5,02 sa | 27 | 13,3 dk | 0 dk | 0 ₺ |
| P80 (yalnız %80'de) | 5,10 sa | 19 | 17,0 dk (okey1) | 0 dk | 0 ₺ |
| P100 (yalnız dolunca) | 5,23 sa | 15 | 20,1 dk (okey1) | 1,0 dk | 90 ₺ |

- KARMA ile IHT birebir aynı çıktı. Kasa hiç %80'e varmıyor, çünkü oyuncu her pad için zaten iniyor.
  **27 iniş / 5 sa ≈ 11 dk'da bir.** Her pad'in son parası kasadan geliyor.
- Kasa yalnız dolunca boşaltılırsa ilk masa 20 dk bekliyor ve zincir %4 uzuyor. Kasa sınırı (20 dk) zincirin
  temposunda hiç bağlamıyor: KARMA'da Kat 1 hiç durmadı.

### Bulgu 4 — ₺/dk eğrisi: Kat 1 payı / Kat 2 payı (SB9, saat başına)
| saat | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| toplam ₺/dk | 171 | 362 | 484 | 545 | 611 |
| Kat 1 · Kat 2 | 81 · 89 | 81 · 281 | 81 · 402 | 81 · 464 | 81 · 530 |
| Kat 1 payı | %47 | %22 | %17 | %15 | %13 |

- Tam zincirin teorik tavanı 864 ₺/dk. Tek oyuncu garsonsuz son saatte ~530 alıyor (%61). Kaçan kahve 1.588
  fincan, servis edilen 4.753 (SB9). Masa ücreti kaçmıyor, eksik kalan kahve parası.

### Bulgu 5 — Garson kolu (SB9, örnek sayılar `{ hiz 2, tepsi 2, sayi 1 }`)
| kip | toplam | en uzun bekleyiş | servis oyuncu / garson | kaçan |
|---|---|---|---|---|
| garsonsuz | 5,02 sa | 13,3 dk | 4.753 / 0 | 1.588 |
| garson, oyuncu her isteğe koşar | 4,96 sa | 12,8 dk | 4.648 / 449 | 1.319 |
| garson tavlada, oyuncu okeyde | 4,91 sa | 11,9 dk | 4.691 / 369 | 1.291 |

- Garson zinciri %1-2 kısaltıyor. Sebep: tavla T120U ücret ağırlıklı (kahve 3 ₺) ve garson 150. dakikada geliyor.
  Garsonun asıl etkisi kaçan kahvede (−%17-19), sürede değil. Garson sayıları B'nin ölçümünden seçilince
  **garsonlu final koşu birleştirmeden sonra** alınır.

### Bulgu 6 — Çevrimdışı (D-185 kuralı: Kat 1 → kasa ≤ 1.620 ₺ + Kat 2 payı ≤ sıradaki Kat 2 pad'i × 1,15)
- Tavan kuralı Kat 2 payını tutuyor. İhlalin kaynağı **kasaya giren Kat 1 payı (1.620 ₺)**: bu para ucuz ilk pad'leri tek
  başına art arda aldırıyor.
- SB9: 2/27 ihlal. 1 ve 2 pad açıkken oyunu 1 saat kapatan oyuncu dönüşte 2 pad (cezve + okey2 ya da okey2 + okey3)
  alabiliyor, Kat 2'nin ilk ~20 dakikasında. SB10, SB12, düz ve 1.500 başlangıçlı kollar 0/27. Ucuz başlangıçlı
  geometrikler 7-13/27, en çok 3 pad.

## §Kullanıcıya gidecek sorular

1. **Kat 2'nin pad'leri nasıl pahalanssın?** Öneri: **her pad'in fiyatı o anki kazancın ~9 dakikası** (SB9).
   Örnek: oyuncu Kat 2'ye çıkıyor, ilk okey masasını ~10 dk'da açıyor. Sonra her yeni masa, ocak ya da salon
   10-13 dakikada bir geliyor. Okey salonu 1. saatte, tavla köşesi 2,5. saatte açılıyor, son tavla masası
   5. saatte. Bekleme süresi baştan sona aynı kalıyor. Alternatif "her pad %15 pahalı" baştaki masaları 4-5 dk'da,
   sondaki tavlaları 20-30 dk'da açtırıyor: son saat sıkıcı uzuyor. Sözleşmedeki ×1,35 ve üstü 10 saatte bitmiyor.
2. **Salon/ocak/garson pad'leri masadan pahalı olsun mu?** Öneri: **hayır, aynı ölçüyle** (o anki kazancın 9 dk'sı).
   Örnek: okey salonu 2.700 ₺, ilk salon masası da 2.700 ₺. Salon 2,5 kat pahalı olunca salon önünde bekleme
   uzuyor, hemen ardındaki masa ucuz geliyor ve tempo zikzak oluyor. Toplam süre aynı kalıyor.
3. **Kat 2 daha kısa mı uzun mu?** Öneri **~5 saat** (SB9; botla 5,0 sa, gerçek oyuncu biraz daha uzun sürer). Kısa
   istersen 8 dk → 4,4 sa, uzun istersen 10 dk → 5,5 sa. 10 dk'lık eğri çevrimdışı açığını da sıfırlıyor (soru 4).
4. **Çevrimdışı küçük açık:** Kat 2'nin ilk 20 dakikasında oyunu 1 saat kapatan oyuncu dönüşte kasadaki ~1.600 ₺ ile
   iki ucuz pad birden alabiliyor (cezve + 2. masa). Kabul mü, yoksa kasanın çevrimdışı payı küçülsün mü? Öneri: **kabul**.
   Yalnız zincirin başında oluyor, kazancı ~10 dk ve "döndüm, iki şey açtım" anı oyuncuya iyi geliyor.

EN karşılığı gereken yeni metin yok (rapor dışı oyun metni üretilmedi).

## §Karar

_(boş — S2 karar paketinde)_
