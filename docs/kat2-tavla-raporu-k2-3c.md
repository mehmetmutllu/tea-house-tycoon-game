# K2-3c — KAT 2: TAVLA MASASI + SALONLAR + TEK OYUNCUNUN SINIRI

> Araç: `tools/olcum-kat2-tavla.ts` → `docs/olcum-kat2-tavla.txt` (tam koşu 8 sn, damgalar temiz: bot yürüdü · ₺ korunumu ·
> kalkış = yığın · varyant etkili · zincir tutarlı). Mantık: `src/game/kat2Dongu.ts` + `src/game/kat.ts` (saf, sayılar dışarıdan).
> `economy.config.ts` DEĞİŞMEDİ: tavla sayıları `Kat2Ayar.tavla` alanına gelecek, şu an yalnız ölçüm kolu.
> Okey davranışı birebir korundu: `OLCUM=tam npx tsx tools/olcum-kat2-dongu.ts` çıktısı `docs/olcum-kat2-dongu-final.txt` ile `diff` boş.

## §0 Soru

Kat 2'nin üç salonu var (D-179 B): arkada merdiven salonu (4 okey), solda okey salonu (6 okey), sağda tavla köşesi (12 tavla).
Aralarında tam bölme ve kemerli geçitler var (D-180). Tavlada 2 kişi oturur (D-181). Üç soru:
1. **Tavla oyunu ne kadar sürsün, para nereden gelsin?** Oyun 60 / 90 / 120 sn; gelirin %60'ı kahveden ya da yalnız %20'si.
2. **Kat 2 garsonu gerekir mi, kaçıncı masadan sonra?** Tek oyuncu 4'ten 22 masaya kadar ölçüldü.
3. **Zincir sırası** (fiyatsız): okey salonu tavladan önce mi bitsin, karışık mı gitsin?

## §Yöntem

- Bot ve süre K2-3'teki gibi (20 dk, ilk 4 dk sayılmaz, dt 0,1). Önce yığını toplar, tepside kahve varsa sabrı en az kalan masaya gider,
  yoksa ocağa döner. **Yeni:** bölme duvarı katı, bot kemerli geçitten geçer ve en kısa geçidi seçer. Masa gövdeleri K2-3'teki gibi yok sayıldı.
- Okey sayıları D-184'teki gibi, sabit: oyun 3 dk, 25 sn'de 2 fincan, ücret 72 ₺, kahve 9 ₺.
- **Tavla tavanı = kişi başına okeyle eşit: 27 ₺/dk/masa** (okeyde 54 ÷ 4 kişi × 2 kişi). Gerekçe: tavla köşesi (12 × 2) ile okey salonu
  (6 × 4) aynı büyüklükte birer oda ve ikisinde de 24 oturak var. Böylece iki salonun tavanı eşit çıkıyor (324 ₺/dk). Masa başına
  yarısı, ama masa sayısı iki katı. Kahve ritmi de kişi başına eşit: 25 sn'de 1 fincan (okeyde 2). Her kolun fiyatı bu tavana göre ayarlandı,
  yani kollar yalnız döngünün BİÇİMİNDE ayrışıyor (K2-3 kalıbı). Geliş 15 sn, yürüme 5 sn ve kahve sabrı 25 sn okeyle ortak.
- Ocak kolları: **gerçek** (4 sn/fincan, kuyrukta 4 fincan, en çok 15 fincan/dk) · **2×** (2 sn, kuyrukta 8) · **sınırsız**. Sınırsız ocakla
  kahve hızı devreden çıkar ve geriye yalnız oyuncunun yetişme sınırı kalır.
- İki oyuncu: son kademe (hız 4,95 · tepsi 6 · mıknatıs 5) ve ilk kademe (4,5 · 2 · 2,6).
- "Meşgul" = oyuncunun ocağın önünde boş beklemediği süre (K2-3 tanımı). "Bekleme" = bir kahve isteğinin ortalama bekleme süresi.

## §Bulgular

### ① Tavla kolları (son kademe oyuncu, gerçek ocak; yalnız tavla masaları açık)

| kol | ücret / kahve ₺ | yığın ort ₺ | 1 masa ₺/dk | 4 masa ₺/dk · meşgul | 12 masa ₺/dk · servis % · meşgul | 22 masa (karışık) ₺/dk · tavla payı |
|---|---|---|---|---|---|---|
| T60K (60 sn, kahve ağır) | 14 / 22 | 36 | 27 | 108 · %62 | 324 · %100 · %98 | 423 · 173 |
| T60U (60 sn, ücret ağır) | 29 / 7 | 36 | 27 | 108 · %62 | 324 · %100 · %98 | 526 · 276 |
| T90K (90 sn, kahve ağır) | 20 / 10 | 40 | 20 | 88 · %61 | 261 · %99 · %100 | 405 · 164 |
| T90U (90 sn, ücret ağır) | 41 / 3 | 47 | 24 | 103 · %61 | 308 · %99 · %100 | 522 · 281 |
| T120K (120 sn, kahve ağır) | 27 / 9 | 52 | 24 | 98 · %63 | 267 · %95 · %100 | 432 · 167 |
| T120U (120 sn, ücret ağır) | 51 / 3 | 59 | 26 | 106 · %63 | 304 · %95 · %100 | 534 · 268 |
| *kıyas: okey (D-184)* | 72 / 9 | 175 | 45 | 208 · %41 | — | — |

Teorik tavan (§A2): bütün tavla kolları 27 ₺/dk/masa, kişi başına 13,5 ₺/dk (okey 13,5). Kahve talebi 60 sn'de 0,8, 90 sn'de 1,6,
120 sn'de 1,7 fincan/dk/masa (okey 3,6).

- **Bulgu 1 — tavla "sık + küçük" para.** Yığın 36-59 ₺, okeyde 175 ₺. 4 tavla masası okeyin 4 masasından daha çok iş çıkarıyor
  (meşgul %61-63, okeyde %41) ama yarı gelir getiriyor (88-108 ₺/dk, okeyde 208). Sebep yürüyüş: daha çok ve daha küçük yığın toplanıyor.
- **Bulgu 2 — yük altında ücret ağır kol ~100 ₺/dk daha çok kazanıyor.** 22 masada (garsonsuz) kahvelerin %67-78'i kaçıyor. Ücret ağır
  kolda kaçan kahvenin bedeli az (T120U 534 ₺/dk, T120K 432). Yük yokken (12 tavla) fark küçük: 304'e 267.
- **Bulgu 3 — 60 sn'lik oyunda kahve neredeyse yok.** Oyun başına tek istek var. Tavana tam ulaşılıyor (324) ama tavla köşesinde kahve
  döngüsü hissedilmiyor. 120 sn'de oyun başına 4 istek var, 12 masada servis %95.

### ② Kat 2 garsonu: tek oyuncu kaçıncı masada tıkanıyor? (zincir A sırası, tavla T90K)

| oyuncu · ocak | 4 masa | 6 | 8 | 10 | 12 | 16 | 22 |
|---|---|---|---|---|---|---|---|
| son kademe · gerçek (servis % / meşgul / ₺/dk) | %100 / %41 / 208 | %97 / %94 / 257 | %79 / %97 / 303 | %69 / %98 / 351 | %61 / %98 / 363 | %43 / %99 / 392 | %22 / %100 / 405 |
| son kademe · 2× ocak | %100 / %41 / 208 | %100 / %62 / 289 | %100 / %93 / 388 | %97 / %99 / 455 | %92 / %100 / 455 | %65 / %100 / 451 | %37 / %100 / 447 |
| son kademe · sınırsız ocak | %100 / %41 / 208 | %100 / %62 / 289 | %100 / %83 / 393 | %100 / %99 / 465 | %89 / %100 / 446 | %65 / %100 / 451 | %37 / %100 / 447 |
| ilk kademe · gerçek | %100 / %54 / 203 | %92 / %93 / 253 | %79 / %97 / 301 | %64 / %100 / 344 | %54 / %100 / 346 | %33 / %100 / 359 | %17 / %100 / 385 |
| ilk kademe · sınırsız | %100 / %54 / 203 | %100 / %91 / 281 | %91 / %99 / 334 | %72 / %100 / 371 | %58 / %100 / 354 | %35 / %100 / 368 | %20 / %100 / 393 |

- **Bulgu 4 — önce OCAK tıkanıyor, sonra oyuncu.** Tek cezve en çok 15 fincan/dk pişiriyor, 4 okey masası 14,4 istiyor (D-184 bunun için
  seçilmişti). Gerçek ocakla 6. masada servis %97, 8. masada %79. Ocak 2× olunca 10 masa yetişiyor (%97). 22 masanın teorik talebi
  55,6 fincan/dk, yani tek ocağın 3,7 katı.
- **Bulgu 5 — ocak sınırsız olsa bile tek oyuncu 10. masada doluyor.** Son kademe oyuncu 10 masaya kadar bütün kahveleri yetiştiriyor ama
  boşluğu kalmıyor: 8. masada meşgul %83, 10. masada %99. 12. masadan sonra servis düşüyor (%89 → 22 masada %37). **Gelir ~450 ₺/dk'da
  duruyor** (10 masada 465, 22 masada 447). İlk kademe oyuncu 6 masada doluyor (meşgul %91), 8. masada servis %91.
- **Cevap (sayıyla):** Kat 2 garsonu GEREKİR. Garson olmazsa tavla köşesinin 12 masası geliri artırmıyor: sınırsız ocakta 465'ten 447'ye
  düşüyor, gerçek ocakta 351'den 405'e çıkıyor (masa başına ~4,5 ₺/dk). Tıkanma noktası son kademede 10. masadan sonra, ilk kademede
  6-8. masadan sonra, yani okey salonunun ortası ile sonu arası. Ocak darboğazı daha önce, 6. masada geliyor.

### ③ Zincir sırası (fiyatsız; son kademe, gerçek ocak, tavla T90K)

| zincir | 7 masa | 10 masa | 13 masa | 16 masa | 22 masa | masa başı artış |
|---|---|---|---|---|---|---|
| A: 4 arka okey → salon2 → 6 okey → salon3 → 12 tavla | 282 | 351 | 374 | 392 | 405 | okey salonu +11…+38 · tavla −9…+18 (ort. ~+5) |
| B: … salon2 → 3 okey → salon3 → 6 tavla → 3 okey → 6 tavla | 282 | 314 | 325 | 389 | 418 | tavla −7…+13 · okey +16…+27 |

- **Bulgu 6 — sıra sonucu değil, yolu değiştiriyor.** 22 masada iki zincir de aynı yere varıyor (405 / 418). Ara yerde A önde (13 masada
  374'e 325), çünkü oyuncunun yetiştiği bölgede okey masası, tavladan iki kat fazla getiriyor. 10. masadan sonra hangi masa eklenirse
  eklensin artış küçük: oyuncu dolu.

## Kullanıcıya gidecek sorular (öneri: en kaliteli · sade dil)

1. **Tavla nasıl oynansın?** Öneri **T120U**: oyun 2 dk, masa ücreti 51 ₺ + fincan başı 3 ₺. Neden: tavla köşesi okey salonundan farklı
   hissettirsin. Okeyde para kahveden gelir, oyuncu fincan taşır. Tavlada masalar çabuk döner, ~60 ₺'lik yığınları toplamak gerekir.
   İki salonun işi ayrışır. Yük altında en çok kazandıran da bu kol (22 masada 534 ₺/dk). Alternatif: T60K. Bunda yığın küçük (36 ₺),
   oyun başına tek kahve var, "para yağıyor" hissi verir ama kahve ortadan kalkar.
2. **Cezve yetmiyor: ikinci ocak mı, ocağı hızlandırmak mı?** 6. masada kahve kaçmaya başlıyor. Öneri: okey salonunun içine **ikinci bir
   cezve ocağı** (pad'iyle açılan). Mekânsal olduğu için oyuncu görür, yolu da kısaltır. Ocak hızını 2× yapan seçenek sayıda aynı işi görüyor
   (10 masada %97).
3. **Kat 2 garsonu:** Öneri: **tavla köşesine bakan garson**, köşe açıldıktan sonra gelen ilk pad. Oyuncu okeyde kahve taşımaya devam eder
   (aktif oynanış), tavlanın yığınlarını ve kahvesini garson taşır. Tek oyuncu tam 10 okey masasına (salon 1 + 2) yetişiyor, bu yüzden sınır
   salonların sınırıyla örtüşüyor. Garson sayısı S2'de ölçülecek.
4. **Zincir (fiyatsız) önerisi:** okey1 → cezve → okey2-4 → okey salonu → s2okey1-2 → *ikinci cezve* → s2okey3-6 → tavla köşesi →
   *Kat 2 garsonu* → tavla1-12. Gerekçe: Bulgu 4-6.

## Sözleşmeye / orkestratöre notlar

- `store.ts`: `kat2Adim(..., kat2AcikAlan(kat2.padsDone), kat2Engeller(kat2.padsDone))`. Bugün `undefined` → 1 alan, salonlara girilemez.
  `kat2Engeller` artık bütün açık masaları (okey + tavla) veriyor.
- `economy.config.kat2.tavla` yok → tavla masası açılsa da grup gelmez (seçim: **çalışmaz**). Okey sayılarına düşseydi 2 kişilik masa 4 kişilik
  ücreti yazar, ölçülmemiş para üretirdi. `kat2ZincirHatasi(ayar)` bunu ve "masa salonundan önce" hatasını yakalıyor. Config testine eklenmeli.
- Yeni dışa açılanlar `kat.ts`: `kat2Duvarlar` · `kat2AlanBul` · `masaGovdesi` · `masaErisimde` · `paraDusmeYeri` · `TAVLA_YARI` [1,2 · 0,6] ·
  `TAVLA_ERISIM` · `TAVLA_PARA_DZ` · `KAT2_KISI` · `KAT2_SALON_PAD_YER` (salon2 −8,85/−1,6 · salon3 8,85/−1,6). `kat2Dongu.ts`:
  `Kat2TavlaAyar` · `kat2MasaYeri` · `kat2ZincirHatasi` · `OkeyMasa.tur`.
- Bot ve oyunda mıknatıs duvardan geçer (mesafe ölçülür). Bugünkü yerleşimde en yakın yığın duvardan ≥ 4,75 uzakta, salon içinden
  toplanamaz. Masa yerleri değişirse bu yeniden kontrol edilmeli.
- Bu ölçümün sınırı: bot açgözlü (önce yığın). Tepsiyi biriktiren daha iyi bir oyuncu sınırı biraz öteler, sıra değişmez.

## §Karar

*(BOŞ — karar paketi S1 sonunda.)*
