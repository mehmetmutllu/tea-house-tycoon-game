# K2-S3 — KAT 2 MASA SEVİYESİ (Sv1-5): ne artsın, ne kadar tutsun (ölçüm)

> Araç: `tools/olcum-kat2-masasv.ts` → `docs/olcum-kat2-masasv.txt` (tam koşu, 764 sn, damgalar temiz).
> Kol değerleri koda/config'e YAZILMADI (D-084): `Kat2Ayar.masaSv` araçta kurulur; config'te yok (damgalı).
> Mantık kodda (`kat2Dongu.ts`): Sv tetiği, dolum, çarpanlar; `ayar.masaSv` yokken oyun birebir (bekçi + akış aracı diff'i).

## §Soru

Kat 2 zinciri bitince oyuncunun yapacak işi kalmıyor. Masa Sv1-5 (obje-başı, Kat 1 dili) **neyi** artırsın ve
**kaça** satılsın? Kullanıcı: *"kazandırdığı para ideal şekilde artsın — grup hızı, kahve, masa ücreti; mantıklı
kombinasyon ne ise."* Tuzak: kahve kolu servis yükünü artırır; oyuncu + garson yetişemezse kazanç yalnız kâğıtta.

## §Yöntem

- **Başlangıç:** Kat 2 zinciri BİTMİŞ (config D-192: 22 masa = 10 okey + 12 tavla, 2 ocak, lavabo, garson D-189),
  Kat 1 bitmiş, izi kasaya akar (81,5 coin/dk, sınır 1.620, D-185); bot karakter son kademe, akış aracının botu.
- **Kollar** (Sv1 = bugünkü masa). Tek kollar doğal aralıkta; **karışımlar kâğıtta aynı tavana normalize**: Sv k =
  taban × (1 + 0,25·(k−1)), **Sv5 ×2** — ücret çarpanı öteki kaldıraçlar sabitken çözülür. Böylece karışımlar arası
  fark yalnız "kâğıttaki para gerçekte gelir mi" farkıdır.

| kol | ne artar (Sv1→Sv5) | kâğıt Sv5 (okey · tavla) |
|---|---|---|
| U | yalnız masa ücreti (okey ×3,8 · tavla ×2,45) | ×2,00 · ×2,00 |
| K | yalnız kahve sıklığı (aralık ×0,4) | ×1,89 · ×1,24 |
| G | yalnız geliş (boş kalma ×0,05) | ×1,08 · ×1,11 |
| O | yalnız oyun süresi — grup hızı (×0,5) | ×1,33 · ×1,54 |
| F | yalnız kahve fiyatı (×3) | ×2,07 · ×1,33 |
| UK | ücret + kahve sıklığı (×0,6) | ×2 (normalize) |
| UG | ücret + geliş (×0,15) | ×2 |
| UKG | ücret + kahve + geliş (kullanıcının üç kaldıracı) | ×2 |
| UF | ücret + kahve fiyatı (aynı çarpan; ₺/müşteri bütünüyle) | ×2 |
| UOG | ücret + kısa oyun (×0,72) + geliş | ×2 |

- **§A Plato:** bütün masalar Sv k (1..5), bot + garson oynar, Sv almaz: 5 dk ısınma + 30 dk ölçüm.
- **§B İlerleme:** bütün masalar Sv1, cüzdan 0 → **88 Sv alımı** (22 × 4), bot en ucuz tetiği önce alır, Kat 1 izi
  + kasa inişleri dahil, ufuk 30 sa. Fiyat eğrileri (satın alma başına, iki tür aynı fiyat — T hariç):
  **SB9** o anki gelirin 9 dk'sı (D-188/192 kuralı) · **SB3** aynı kural 3 dk (zincirde 26 alım vardı, burada 88) ·
  **SB3T** SB3 toplamı, tür payına göre (masanın kendi artışıyla orantılı) · **GEO** ×1,5 geometrik (Sv2 = SB3'ün Sv2'si).
  Örnek (U): SB9 9.600/12.000/14.000/16.000 · SB3 3.200/3.900/4.700/5.400 · SB3T okey 4.300→7.300 | tavla 2.300→3.800 ·
  GEO 3.200/4.800/7.200/11.000.
- **Damgalar:** bot yürüdü · takılmadı · coin korunumu (Kat 2, cüzdan, kasa) · plato Sv sabit kaldı · varyant etkili
  (her kolun Sv5 platosu tabandan ayrı) · config'te masaSv yok.
- **Mutasyon (kısa koşu, 2/2 yakalandı):** `SV_MUT=almaz` → ilerleme parmak izi kollar arasında aynı (damga kırıldı) ·
  `SV_MUT=carpansiz` → 4 plato + ilerleme varyant damgası kırıldı. Kod bekçisi 4/4 (tetik ×2, Sv5 tetiği, ücret
  çarpanı, çerçeve boşluğu).

## §Bulgular

### Bulgu 1 — Plato: kâğıttaki artışın ne kadarı gerçek? (bütün masalar Sv5, tam koşu)
| kol | Sv1 → Sv5 gerçek coin/dk | gerçek × | kâğıt × | kâğıt artışının gerçekleşen payı | okey/masa | tavla/masa |
|---|---|---|---|---|---|---|
| **U** | 750 → 1.739 | **×2,32** | ×2,00 | **%100** | 42,0 → 102,5 | 27,5 → 59,5 |
| K | 750 → 763 | ×1,02 | ×1,64 | %2 | 42,0 → 42,9 | 27,5 → 27,8 |
| G | 750 → 807 | ×1,08 | ×1,09 | %63 | 42,0 → 44,8 | 27,5 → 29,9 |
| O | 750 → 1.237 | ×1,65 | ×1,41 | %120 | 42,0 → 66,6 | 27,5 → 47,5 |
| F | 750 → 1.046 | ×1,39 | ×1,78 | %38 | 42,0 → 67,8 | 27,5 → 30,7 |
| UK | 750 → 1.411 | ×1,88 | ×2,00 | %67 | 42,0 → 73,6 | 27,5 → 56,2 |
| **UG** | 750 → 1.730 | **×2,31** | ×2,00 | **%100** | 42,0 → 103,4 | 27,5 → 58,0 |
| UKG | 750 → 1.365 | ×1,82 | ×2,00 | %62 | 42,0 → 71,1 | 27,5 → 54,5 |
| UF | 750 → 1.501 | ×2,00 | ×2,00 | %76 | 42,0 → 83,0 | 27,5 → 55,9 |
| **UOG** | 750 → 1.721 | **×2,29** | ×2,00 | **%99** | 42,0 → 100,8 | 27,5 → 59,4 |

- **Kahve kolu taşıma tavanına çarpıyor — kazancı kâğıtta kalıyor.** Zincir bittiğinde Sv1'de bile istenen kahvenin
  yalnız **%61**'i servis ediliyor (34,4 istek/dk, 13,5 kaçan/dk; bot zamanının %81'i servis+ocak, boş %7). İki ocak
  (30 fincan/dk) ve tek garson zaten dolu. K Sv5'te istek 52,1/dk'ya çıkıyor, servis %44'e düşüyor: **+%64 kâğıt, +%2
  gerçek.** Kahve içeren her karışım bu kadar kaybediyor (UK %67, UKG %62); kahve fiyatı bile (F) %38'de kalıyor,
  çünkü pahalanan kahvenin %39'u hiç masaya gitmiyor.
- **Ücret kolu (₺/müşteri) bütünüyle gerçekleşiyor (%100)** — taşıma yükü değişmiyor (U Sv5'te servis %61, boş %7,
  tabanla aynı). Gerçek × kâğıttan BÜYÜK (×2,32 > ×2,00): kâğıt taban kahveyi tam sayıyor, gerçekte kaçan kahve
  tabanı küçültüyor; ücret artışı ise kaçmıyor.
- **Geliş tek başına zayıf** (G Sv5 ×1,08): grup 15 sn boş kalıyor, oyun 180 sn — tavanı ~%9. Ücretle karışınca (UG)
  ücret kolu kadar gerçekleşiyor (%100) ve bot biraz daha meşgul (boş %7 → %3), servis %58.
- **Kısa oyun (O, "grup hızı")** kâğıttan fazla getiriyor (%120): daha çok grup, aynı kahve isteği/dk; bot boşalıyor
  (Sv5 boş %18). Ama masa ücretinin sık düşmesi = daha çok yığın; ücretle karışınca (UOG) U ile aynı (%99).

### Bulgu 2 — İlerleme: 88 alımın süresi ve bekleyişi (tam koşu)
| kol / eğri | toplam fiyat | bitiş | medyan bekleyiş | en uzun (#) | p90 | son saat coin/dk |
|---|---|---|---|---|---|---|
| U/SB9 | 1.135.200 | 14,36 sa | 9,9 dk | 13,7 (#1) | 10,5 | 1.924 |
| **U/SB3** | 378.400 | **4,83 sa** | 3,3 dk | 5,1 (#1) | 4,2 | 1.742 |
| K/SB3 | 334.400 | 6,78 sa | 4,6 | 6,7 (#73) | 6,0 | 832 |
| G/SB3 | 290.400 | 6,13 sa | 4,3 | 5,1 (#1) | 4,7 | 774 |
| O/SB3 | 312.400 | 5,46 sa | 3,7 | 5,1 (#1) | 4,1 | 1.160 |
| F/SB3 | 358.600 | 6,17 sa | 4,0 | 6,3 (#68) | 5,6 | 1.058 |
| UK/SB3 · SB3T · GEO · SB9 | 378.400 · 378.400 · 576.400 · 1.135.200 | 5,37 · 5,42 · 7,83 · 15,91 sa | 3,5 · 3,5 · 5,0 · 10,6 | 5,1 · 6,4 · 8,6 · 13,7 | 4,7 · 4,8 · 8,2 · 12,3 | 1.494 · 1.549 · 1.478 · 1.490 |
| **UG**/SB3 · SB3T · GEO · SB9 | aynı | **5,08 · 5,32** · 7,33 · 15,17 sa | 3,4 · 3,5 · 5,0 · 10,2 | 5,1 · 5,0 · 7,6 · 13,7 | 4,3 · 4,5 · 6,9 · 11,4 | 1.743 · 1.628 · 1.686 · 1.690 |
| UKG/SB3 · SB3T · GEO · SB9 | aynı | 5,71 · 5,73 · 8,37 · 17,02 sa | 3,9 · 3,7 · 5,6 · 11,7 | 5,1 · 5,6 · 8,8 · 13,7 | 4,5 · 5,3 · 8,5 · 12,6 | 1.318 · 1.351 · 1.362 · 1.255 |
| UF/SB3 · SB3T · GEO · SB9 | aynı | 5,34 · 5,34 · 7,73 · 15,73 sa | 3,4 · 3,4 · 4,9 · 10,3 | 5,1 · 5,9 · 8,6 · 13,7 | 4,7 · 4,7 · 7,9 · 12,3 | 1.546 · 1.616 · 1.561 · 1.599 |
| **UOG**/SB3 · SB3T · GEO · SB9 | aynı | 5,10 · 5,28 · 7,35 · 15,16 sa | 3,4 · 3,5 · 5,0 · 10,2 | 5,1 · 4,8 · 7,5 · 13,7 | 3,9 · 4,4 · 6,9 · 11,3 | 1.656 · 1.673 · 1.709 · 1.667 |

- **SB9 Sv için çok uzun:** 88 alım × ~10 dk = **14-20 sa** (zincir 26 pad'de 4,9 sa'ti). SB3 aynı ritmi (alım başına
  medyan 3,3-3,9 dk, en uzun ≤ 6,7 dk) **4,8-5,7 sa**'te bitiriyor — zincirle aynı boyda ikinci bir hedef.
- **GEO (×1,5)** sonları uzatıyor: en uzun bekleyiş son alımlarda 7,5-8,8 dk, toplam 7,3-8,4 sa; sonda hiçbir şey
  kazandırmıyor (son saat gelirleri SB3 ile aynı bantta).
- Bekleyiş düz: SB kuralında en uzun bekleyiş ilk alım (cüzdan 0'dan) ya da sonlar; medyanın ≤ 1,9 katı.

### Bulgu 3 — Okey/tavla dengesi + geri ödeme (plato ölçüsüyle, Sv k fiyatı / masanın gerçek coin/dk artışı)
| kol | okey Sv2→Sv5 (SB3) | tavla Sv2→Sv5 (SB3) | okey (SB3T) | tavla (SB3T) |
|---|---|---|---|---|
| U | 212 / 258 / 311 / 357 dk | 400 / 488 / 589 / 675 dk | 284 / 351 / 417 / 483 | 288 / 350 / 414 / 475 |
| UG | 250 / 326 / 230 / 333 | 446 / 594 / 457 / 830 | 336 / 443 / 308 / 451 | 321 / 427 / 321 / 584 |
| UOG | 291 / 207 / 411 / 309 | 391 / 450 / 591 / 758 | 391 / 282 / 551 / 417 | 281 / 323 / 415 / 533 |
| UF | 313 / 381 / 459 / 528 | 451 / 549 / 662 / 761 | 420 / 518 / 615 / 713 | 324 / 394 / 465 / 535 |
| UK | 326 / 384 / 528 / 2.023 | 384 / 578 / 694 / 782 | 438 / 521 / 707 / 2.734 | 276 / 415 / 487 / 550 |

- **Aynı fiyatla tavla Sv'si okeyin iki katı geç ödüyor** (tavla masası okeyin ~yarısını kazanıyor: 27,5 · 42,0).
  SB3T (tür payına göre fiyat: okey 4.300→7.300, tavla 2.300→3.800) iki türü **eşitliyor** (U: 284-483 · 288-475 dk),
  toplam süre +0,05-0,25 sa.
- **Geri ödeme saatlerle ölçülüyor (3,5-8 sa)** — 88 objeye bölünmüş ×2'nin doğası: toplam harcama (378.400) / toplam
  gerçek artış (~990 coin/dk) ≈ 6,4 sa. Tek alımı "kendini ödüyor mu" diye değil, katın geliri saatte nasıl büyüyor
  diye okumak gerek: U/SB3'te 897 → 1.117 → 1.331 → 1.515 coin/dk (saat başı +%17-20).
- O (kısa oyun) kolunda SB3T fiyatı zikzaklı (1.300 / 5.900): kâğıt formülünde kahve sayısı tam sayıya yuvarlanıyor,
  türün payı basamaklı. Kendi başına seçilirse fiyat düzleştirilmeli.

## §Öneri

**UG + SB3T** — Sv ücreti ve gelişi birlikte artırır (masa ücreti okey ×3,44 · tavla ×2,18; boş kalma ×0,15 Sv5'te),
fiyat tür payına göre "o anki gelirin ~3 dk'sı" (okey 4.300→7.300 · tavla 2.300→3.800 coin; Claude kesin sayıyı karar
sonrası config'e yazarken yeniden hesaplar).

Gerekçe (sayılar):
- **Gerçekleşen para en yüksek grupta:** UG ×2,31 (%100) — U ×2,32 ve UOG ×2,29 ile aynı; kahve içeren her kol %62-76'da,
  kahve tek başına %2. Ocak + garson + oyuncu zaten %61 serviste: kahveyi büyüten Sv **taşıma tavanına** gider.
- **"Yükseltme throughput artırsın" kuralını tutan, para kaybetmeyen tek karışım:** U yalnız ₺/müşteri; UG masanın
  boş kalışını kısaltır (grup daha çabuk gelir — gözle görülen hız) ve servis yükünü yalnız biraz artırır (boş %7 → %3,
  servis %61 → %58). Kat 1'de throughput kolu tükenmişti; Kat 2'de de kahve throughput'u tükenik — kalan throughput
  kolu geliş, gerisi ücret.
- **SB3T:** 5,32 sa (U/SB3 4,83 · UG/SB3 5,08), alım başına medyan 3,5 dk, en uzun 5,0 dk; okey/tavla geri ödemesi eşit
  (321-584 · 336-451 dk) — oyuncu hangi masayı yükseltirse yükseltsin aynı değeri alır. SB9 15 sa (çok uzun), GEO sonu
  uzatıp hiçbir şey kazandırmıyor.
- Alternatif (en sade): **U + SB3T** — aynı para, 0,2-0,5 sa daha kısa; ama Sv yalnız "daha pahalı masa" olur, hızı yok.

Açık sorular (karar paketine):
1. Sv5 tavanı ×2 (kâğıt) benim normalizasyonum; ×1,5 ya da ×3 bütün geri ödeme/sürelerini ölçekler (ayrı kol koşmadım).
2. Sv tetiği masa açılır açılmaz mı görünsün (bugünkü kod), yoksa zincir bitince mi? Ölçüm zincir bitmiş hâlde; zincir
   sürerken Sv görünürse oyuncu pad ile Sv arasında bölünür (D-124 Kat 1'de "tek hedef" kuralı vardı).

## §Karar

_(boş — S3 karar paketinde kullanıcı seçer)_
