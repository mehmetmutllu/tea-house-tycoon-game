# K2-S1 · Ajan A (Görsel, K2-3b) — ara not

## Ne yapıldı
Kat 2 sahnesi döngüyü gösteriyor; durum store'dan okunur, mantığa dokunulmadı.

| Parça | Dosya | Not |
|---|---|---|
| Sıradaki pad işareti | `three/kat2/PadIsaret.tsx` | `GroundMarker` + `padCercevesi(kat2PadEtiket)` çerçevesi, dolum `kat2Dunya.padFill`. Kat 2'de `activeStep` bu pad'e yazılır (Kat 1'in `QuestPointer`ı Kat 2'de kapatıyordu → yazı uzaktan okunmuyordu). |
| Okey G Sv1 · tavla A Sv1 · cezve 7 | `three/kat2/Esya.tsx` | `tools/kat2-esya.tsx`ten. Masa İD ile bulunur (`KAT2_MASALAR` + `masalar.find`). Oyunda: okeyde taş ıstakaya gider, tavlada zar atılır. Yeni açılan eşya yerinde büyür (`Dogus`). |
| Grup (gel → otur → oyna → kalk) | `three/kat2/Grup.tsx` · `three/kat2/yol.ts` | KayKit müşteri gövdesi (Kat 1 `yuvaKur`un sade hâli, gövde başına 2 çizim). Yol köşeli: merdiven dibi → sahanlık → kuyunun yanı → [geçit] → koridor → oturak. Konum durumdan TÜRER (`t`), kendi saati yok. Oturan: baş eğilir, gövde döner. Kalkış: `oyunda→bos` geçişinde görsel 5,5 sn geri yürür, merdivene yetişemezse söner. |
| Kahve balonu | `three/kat2/Balon.tsx` | Kat 1 balon dili (krem gövde, kalın kontur, kuyruk, billboard). 4 aday. |
| Para yığını + toplama juice | `three/kat2/Para.tsx` | Masa önünde YERDE (masada para yok). Düşüş + sekme; toplanınca sikkeler oyuncuya uçar + Kat 1'in `.floater` "+para" yazısı. 4 aday. |
| Tepside kahve | `three/Player.tsx` (en küçük dokunuş) · `three/kat2/parca.tsx` `Fincan` | `CupTray`e `kahve` sayısı eklendi; Kat 2'de tepsi yalnız kahveyi taşır. Kat 1'de `kahve=0` → birebir aynı. **Player.tsx sahiplik listemde değildi** — başka yoldan taşıma pozu (tutuş klibi) tetiklenemiyordu; orkestratör onaylamazsa geri alınır. |
| Duvar/zemin/bölme | `three/Kat2.tsx` | Açık alan `kat2AcikAlan(padsDone)`. Bina kabuğu sabit (dış kenarlar). Bölmeler `KAT2_BOLMELER`: en az bir yanı açıksa 2,2 duvar + kemer; iki yanı açıksa geçit açık, değilse geçit tahta perdeli (C'nin `kat2Duvarlar` kuralıyla aynı). Kapalı alan kaba inşaat. Ocak açılınca bandın sol perdesi kalkar, köşe raf/kasa/saksıyla dolar. Dış duvar dibindeki yarık (Kat 1'e bakan boşluk) çevre şeridiyle kapandı. |
| Arka duvar üstü | `three/kat2/Dis.tsx` | 4 aday (aşağıda). |
| Göster-seç anahtarı | `three/kat2/gorselSecim.ts` | `?k2gorsel=balon:B,para:C,dis:A` (yalnız DEV). Varsayılan A/A/A. |
| Kare aracı | `tools/kat2-s1-kare.mjs` | Vite'ı API ile, **HMR + izleme kapalı** kaldırır (paralel ajanların yazması sayfayı yeniden yüklüyordu). `node tools/kat2-s1-kare.mjs [klasör] [dongu balon para dis perf]` |

Ocak yönü yorumu: `kat.ts` "sırtı salona" diyor, D-181 "sırt duvarda". Oyuncu kahveyi `OCAK.al`dan (salon tarafı) aldığı için
ocağın ÖNÜ salona bakıyor; davlumbaz 0,75 geriye kaydırıldı (yerinde dursa 45° kamerada cezveleri örtüyordu).

## Aday panoları (her biri tek pano, 1600 px)
- Soru 1 kahve balonu: `docs/sprintler/kat2-S1/kareler/pano-balon.png` — A fincan + "×2" · B fincan adedi · C cezve + kırmızı rozet · D fincan + sayı + azalan sabır halkası
- Soru 2 para yığını: `docs/sprintler/kat2-S1/kareler/pano-para.png` — A sikke kulesi · B kese · C banknot destesi · D sikke tepesi
- Soru 3 arka duvar üstü: `docs/sprintler/kat2-S1/kareler/pano-dis.png` — A Kat 1 bahçesi 3,2 aşağıda · B komşu kiremit damlar · C ahşap kalkan + kiriş · D açık gök rengi (geometrisiz)

## Döngü kanıtı kareleri (`docs/sprintler/kat2-S1/kareler/`)
`dongu-1-pad-doluyor` · `dongu-2-masa-belirdi` · `dongu-3a-grup-merdivende` · `dongu-3b-grup-masaya` · `dongu-4-oturan-balon` ·
`dongu-5-ocak-tepsi` (ocakta 2 fincan, tepside 3) · `dongu-6-kalkis-yigin` · `dongu-7-toplama` (+150, uçan sikkeler) ·
`dongu-8-tum-kat` (22 masa, üstten) · `dongu-9-tavla-kosesi` · `dongu-10-okey-salonu` · `dongu-11-kapali-salonlar` (perdeli geçit + kaba inşaat).
Konsol hatası: 0.

## Kare maliyeti (headless Chromium, `__perf()` 5 sn ort., 440×956 @2x)
| Sahne | iş ms | çizim | üçgen |
|---|---|---|---|
| Kat 1 salon (120 sn ileri sarılmış) | 4,62 | 132 | 34 k |
| Kat 2 boş (varış) | 3,06 | 98 | 19 k |
| Kat 2, 4 okey dolu, oyun kadrajı | 5,03 | 185 | 72 k |
| Kat 2, 22 masa dolu, bütün kat üstten (üst sınır) | 8,06 | 359 | 226 k |

Yapılan perf işleri: kuyu korkuluğu dikmeleri instanced (~120 → 6 çizim; boş Kat 2 220 → 98), ıstaka taş noktaları + orta taşlar
instanced (masa başına ~30 → 2), gövdelerde kırpma küresi (Kat 1 `kirpmaKuresi` deseni), renk başına paylaşılan materyal.
Üçgenin çoğu skinned gövde × gölge geçişi; 22 masa (64 gövde) ancak bütün kat kadrajdayken görülür.

## Mantıktan istenenler (eklemedim)
1. **Kalkış olayı**: çıkış animasyonu `oyunda → bos` geçişini karede yakalayarak başlıyor. `Kat2Cikti.olay`a masa kimliği listesi (`kalkan: string[]`) daha sağlam olur.
2. **Yürüme süresi**: `yurume` 5 sn sabit; uzak masaya (tavla köşesi ~35 m) yetmiyor. Görsel, `bos`un son ≤ 8 sn'sinde merdivenden erken çıkıyor (mantık değişmedi); yine de uzak masada yürüyüş ~2,7 m/sn. K2-5'te masa başına süre ya da yola göre süre düşünülmeli.
3. **Store `kat2Adim`** hâlâ varsayılan `KAT2_ACIK_ALAN` (1) ile çağrılıyor → salon pad'i açılsa da oyuncu salona giremez; `kat2AcikAlan(padsDone)` geçirilmeli (orkestratör).
4. **Salon pad etiketi**: `kat2PadEtiket` ocak dışındaki her pad'e "Okey Masası" diyor; `k2salon2/3` ve tavla pad'leri kendi etiketini ister (C / orkestratör).
5. **Bölme oyuncuyu örtüyor**: 2,2'lik bölmenin hemen arkasında (z ≈ −0,5) duran oyuncu kameradan görünmüyor (kare `dongu-6`, `dongu-7`). Kat 1'deki kilitli alan duvarıyla aynı durum; karar konusu (bölme boyu / kesik duvar).

## Yeni oyuncu metni
Yok (balon sayısı "×2" / rakam; yazı yok). Pano başlıkları yalnız geliştirici kareleri.

## Bilinen eksikler
- Okey/tavla Sv2–Sv5 görünüşleri yok (mekanik S2/S3).
- Kalkan grup uzak masada merdivene yetişmeden söner (kısa çıkış).
- Kat 2'de çaycı (ocak başında personel) yok — mantıkta personel yok.
- Aday B (komşu damlar) ve C (ahşap kalkan) ilk turdur; seçilirse ölçü/renk cilası S2.
