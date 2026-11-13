# K2-6 — D-191 AKIŞININ ZİNCİRİ: hazır başlangıç · lavabo pad'i · merdiven pad'i (ölçüm)

> Araç: `tools/olcum-kat2-akis.ts` → `docs/olcum-kat2-akis.txt` (tam koşu, 29 sn, damgalar temiz).
> Fiyat/sıra/lavabo mekaniği koda/config'e YAZILMADI (D-084): kollar araçta kurulur.
> Geometri D-191'e göre kodda (`kat.ts`): N7 düzen, geçitsiz duvar (yalnız kapalı alanın önünde),
> 2. ocak bantta (x −13,2), lavabo bandın sağ köşesinde (13,4; −8,6). Bu karar verilmişti; ölçüm onun üstünde.

## §Soru

D-191 Kat 2'nin akışını değiştirdi: kata çıkınca **bir okey masası + ocak hazır** gelir, zincire **Kat 2 lavabosu**
girer, Kat 1'de **merdiven pad'i** çıkar. Zincirin fiyatları (D-188 SB9) bu değişiklikle ne olur? Lavabo para
getirmeli mi (Kat 1'deki gibi), yoksa süs mü? Merdiven pad'i kaç ₺ olmalı?

## §Yöntem

- **K2-5 ile aynı düzenek** (`olcum-kat2-zincir`): bitmiş Kat 1 (yükseltmesiz, karakter son kademe), cüzdan 0, Kat 1
  oyuncu yokken gerçek store'da 60 dk koşturulup izi alınır (**81,5 ₺/dk**), iz kasaya akar (D-185, sınır 1.620 ₺),
  kasa politikası KARMA, garsonsuz. Kat 2'de `kat2Tick` + bot, D-191 geometrisinde (açık alanlar arası duvar yok → bot düz yürür).
- **D-191 zinciri (26 pad):** okey1 → okey3 → okey4 → salon2 → s2okey1-2 → cezve2 → s2okey3-6 → **lavabo** → salon3 →
  garson → tavla1-12. Hazır: `k2okey2` (merdivene en yakın iç masa) + `k2cezve`. Yapı bekçisi (`kat2ZincirHatasi`) tutarlı.
- **Lavabo iki varyant:** **L0** süs (gelir yok) · **L1** Kat 1 gibi: kalkan grubun her kişisi Kat 1 L1 oranıyla
  (%30 × 18 ₺ = 5,4 ₺/kişi, okey 4 · tavla 2 kişi) lavabonun önüne ayrı yığın bırakır; bot o yığını da toplar.
- **Merdiven pad'i:** Kat 1'in son pad'i (`z3table12`, 9.950 ₺) bitince çıkar. Oyuncu o an Kat 1'de → bekleme =
  fiyat / Kat 1 geliri. İki uç: aktif (idealize, her sikke toplanır: **1.040 ₺/dk**) · oyuncusuz (81,5 ₺/dk).
- **Damgalar:** bot yürüdü · takılmadı · ₺ korunumu (Kat 2 + lavabo yığını · kasa · cüzdan) · varyant etkili ·
  BUGUN = config · config = SB9 (yeni geometride de).
- **Mutasyon (kısa koşu, 2/2 yakalandı):** `AKIS_MUT=bedavasiz` → SB9-L0'da ilk servis 0,8 → 27,8 dk, ilk pad
  10,3 → 14,9 dk · `AKIS_MUT=lavaboyigin` (L1 yığını toplanmaz) → SB9-L1 lavabo ₺ 3.899 → 0.

## §Kollar

| kol | sıra | hazır | fiyat | lavabo |
|---|---|---|---|---|
| **BUGUN** (taban) | D-186 (27 pad) | yok | D-188 config | yok |
| ESKI-L0 | D-191 (26 pad) | okey2 + cezve | D-188'deki fiyatlar aynen, lavabo 5.600 | süs |
| SB9-L0 | D-191 | okey2 + cezve | SB9 yeniden (hazır masa gelire sayılır) | süs |
| SB9-L1 | D-191 | okey2 + cezve | SB9 yeniden (lavabo geliri dahil) | Kat 1 gibi |
| SB10-L1 | D-191 | okey2 + cezve | SB10 | Kat 1 gibi |
| merdiven | — | — | M-HEMEN 1.000 · M-9DK 9.400 · M-SONPAD 9.950 · M-15DK 15.500 · M-2xSONPAD 19.900 | — |

## §Bulgular

### Bulgu 1 — Zincir (tam koşu, 10 sa ufuk)
| kol | zincir ₺ | toplam | ilk servis | ilk ₺ | ilk pad | en uzun bekleyiş | medyan | kaçan fincan | lavabo ₺ |
|---|---|---|---|---|---|---|---|---|---|
| **BUGUN** | 130.800 | **5,03 sa** | **19,9 dk** | 13,5 dk | 10,2 dk | 13,4 dk (tavla10) | 11,2 dk | 1.738 | 0 |
| ESKI-L0 | 134.250 | 4,87 sa | **0,8 dk** | 3,3 dk | 6,9 dk | 13,1 dk (tavla9) | 11,7 dk | 1.756 | 0 |
| SB9-L0 | 134.700 | 4,94 sa | 0,8 dk | 3,3 dk | 10,3 dk | 13,3 dk (tavla11) | 11,6 dk | 1.811 | 0 |
| SB9-L1 | 145.600 | 4,91 sa | 0,8 dk | 3,3 dk | 10,3 dk | 13,0 dk (tavla10) | 11,3 dk | 2.046 | 14.947 |
| SB10-L1 | 162.200 | 5,39 sa | 0,8 dk | 3,3 dk | 11,5 dk | 14,4 dk (tavla9) | 13,2 dk | 2.095 | 16.319 |

- **Hazır başlangıç oyunun ilk 20 dakikasını değiştiriyor, toplam süreyi değil.** Bugün oyuncu Kat 2'ye çıkınca
  ilk masa 10 dk, ilk kahve servisi **20 dk** sonra geliyor. D-191'de ilk kahve **ilk dakikada**, ilk para 3 dk'da.
  Toplam süre 5,03 → 4,87-4,94 sa (−%2-3): iki pad bedava ama hazır masa ilk 10 dakikayı boş geçirmiyor.
- **Fiyatları değiştirmeye gerek az.** Eski fiyatları aynen bırakmak (ESKI-L0) ile SB9'u yeniden hesaplamak (SB9-L0)
  arasında fark 4 dk (4,87 · 4,94 sa). Tek fark ilk masa: eski 750 ₺ (6,9 dk'da), yeni 1.200 ₺ (10,3 dk'da).
- **Yeni geometri (N7, geçitsiz) tabanı az değiştirdi:** BUGUN 4,95 → 5,03 sa (+%1,6, K2-5 Bulgu 1'e göre).
  Masalar arka sırada (z −3,5) ve salonlar ocaktan biraz daha uzak; duvar kalktığı için kestirme yürünüyor.
- Bekleme düz kalıyor: her kolda en uzun bekleyiş medyanın ≤ 1,2 katı (SB'nin özelliği, K2-5'teki gibi).

### Bulgu 2 — Lavabo: süs mü, Kat 1 gibi mi?
| | L0 süs | L1 Kat 1 gibi |
|---|---|---|
| lavabonun getirdiği (zincir boyunca) | 0 | 14.947 ₺ (Kat 2 gelirinin ~%12'si) |
| son saat ₺/dk (Kat 2 · lavabo) | 515 · 0 | 498 · 107 |
| kaçan kahve | 1.811 | 2.046 (+%13) |
| toplam süre | 4,94 sa | 4,91 sa |

- **L1 lavabo yeni bir para kaynağı ama yürüme ekliyor.** Yığın bandın sağ köşesinde; oyuncu oraya gidip gelirken
  kahve isteklerinin %13'ü fazladan kaçıyor. Sonuç: gelir artıyor (+107 ₺/dk son saatte) ama SB9 fiyatları da o gelire
  göre yükseldiği için zincir süresi aynı (4,91 sa).
- **L0'da lavabo pad'i "boşa" bir pad:** 5.600 ₺ ödeniyor, karşılığı yalnız görüntü. L1'de pad kendi parasını
  ~1 saatte geri getiriyor (lavabo açıldıktan sonra ~65-107 ₺/dk).
- L1'in Kat 1'deki gibi seviyeleri (L2-L6) bu ölçümde YOK; yalnız L1 oranı. Seviye kolu istenirse ayrı ölçülür.

### Bulgu 3 — Merdiven pad'i (Kat 1'in son pad'i bitince)
| kol | fiyat | aktif oyuncu bekler | oyuncusuz bekler | Kat 2'nin ilk masasına oranı |
|---|---|---|---|---|
| M-HEMEN | 1.000 ₺ | 1,0 dk | 12,3 dk | ×0,8 |
| **M-9DK** | 9.400 ₺ | **9,0 dk** | 115 dk | ×7,8 |
| M-SONPAD | 9.950 ₺ | 9,6 dk | 122 dk | ×8,3 |
| M-15DK | 15.500 ₺ | 14,9 dk | 190 dk | ×12,9 |
| M-2xSONPAD | 19.900 ₺ | 19,1 dk | 244 dk | ×16,6 |

- Aktif Kat 1 geliri (1.040 ₺/dk) Kat 2'nin başındaki gelirden (~240 ₺/dk) 4 kat büyük. Bu yüzden merdiven Kat 2'nin
  masalarından çok pahalı görünse de (×8) aktif oyuncu için **Kat 1'in son pad'leri kadar** (~9-10 dk) sürüyor.
- Kat 1'in son pad'leri 8.650 → 9.950 ₺ basamaklanıyor; **M-9DK (9.400) ve M-SONPAD (9.950) bu ritme oturuyor.**
  M-15DK ve üstü Kat 1'in sonunda 15-20 dk'lık tek bir duvar yaratıyor.
- Kat 1 bitince oyuncunun alacağı yükseltmeler de var (yükseltmesiz ölçüldü); gerçek oyuncu merdivene biraz daha geç gelir.
- Oyuncusuz bekleme (offline / AFK) uzun ama çevrimdışı kuralı (D-185) zaten tavanlı; merdiven fiyatı onu değiştirmiyor.

## §Kullanıcıya gidecek sorular

1. **Kat 2 pad fiyatları değişsin mi?** Öneri: **hayır, bugünkü fiyatlar aynen kalsın** (ESKI-L0); yalnız lavabo zincire
   5.600 ₺ ile girsin. Örnek: oyuncu Kat 2'ye çıkıyor, hazır masada müşteri ilk dakikada kahve istiyor; ikinci masa
   (750 ₺) 7 dk'da, okey salonu 37 dk'da, son tavla 4,9 saatte açılıyor. SB9'u yeniden hesaplamak ilk masayı 1.200 ₺
   yapıyor ve 3 dk geciktiriyor, gerisi aynı.
2. **Kat 2 lavabosu para getirsin mi?** Öneri: **evet, Kat 1'deki gibi** (L1). Örnek: oyunu bitiren gruplardan bazıları
   lavaboya uğrar, köşede küçük bir para yığını birikir; oyuncu toplamaya gider. Lavabo açıldıktan sonra saatte ~5.000 ₺
   fazladan gelir. Takas: köşeye yürürken biraz daha kahve kaçıyor; süre değişmiyor. Süs olursa oyuncu 5.600 ₺'yi
   karşılıksız ödüyor.
3. **Merdiven pad'i kaç ₺?** Öneri: **9.400 ₺** (aktif oyuncu için ~9 dk; Kat 1'in son masaları 8.650-9.950 ₺ ritminde).
   Örnek: oyuncu Kat 1'in son masasını açıyor, merdivenin önünde yeni pad beliriyor; birkaç tur para toplayıp ~9 dakikada
   merdiveni açıyor ve Kat 2'ye çıkıyor. 15.500 ₺ (15 dk) "büyük an" hissi verir ama Kat 1'in sonunda tek uzun bekleme olur.

EN karşılığı gereken yeni metin: "Lavabo" (var: "Restroom"). Merdiven pad'inin etiketi görsel turda yazılacak.

## §Karar

(boş — karar paketinden sonra doldurulur)
