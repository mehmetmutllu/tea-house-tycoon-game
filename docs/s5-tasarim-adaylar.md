# S5 tasarım adayları (TASARIM ajanı, 2026-11-20) — kareler, kod değil

Araç: `tools/s5-tasarim.tsx` (adaylar, çalışan oyunun sahnesine eklenir) + `tools/s5-tasarim-cek.mjs` (çeker, pano yapar)
+ `tools/s5-tasarim-gorev.html` (G-120 maket parçaları). Ham kareler `docs/tasarim/s5/`. `src/**` değişmedi.
Koşu: `SORU=G102,G111 node tools/s5-tasarim-cek.mjs` (port `S5_PORT`, varsayılan 5163).
Durum: **G-102 ve G-111 çekildi.** G-112, G-114, G-115, G-129 ve G-120 için adaylar araçta hazır ama henüz çekilmedi (devir notu: `docs/sprintler/s5-tasarim-notlar.md`).

## G-102 · Kat 2 mutfağının sağ duvarı — pano `docs/kareler/s5-tasarim-g102-sag-duvar.png`
Bugün: kovanın sol ara duvarı (x −4,6, 2,2 m, lambri + sıva). Mutfağı merdiven kovasından ayırıyor.
Etkilenen dosya her adayda `Kat2.tsx` → `Duvarlar` (kova ara duvarı satırı). Masa etkilenmiyor.
- **A** bugün · **B** duvar yok · **C** alçak duvar 1,0 (D-198 alçak bölme dili) · **D** yarım duvar: arka yarısı 2,2, ön yarısı 1,0
- **E** merdiven korkuluğu (D-181) · **F** KayKit tezgâh ucu: ön tezgâh köşeden dönüp kenar boyunca uzanır, ayrıca `kat2/Mutfak.tsx` ve `kat.ts` `kat2Engeller` (gövde) değişir
- **G** KayKit `wall_orderwindow`: duvar kalır, ortasında tezgâh boyu bir pencere açılır
- Öneri: **C**. Kova tarafından ve oyun kamerasından mutfağın içi görünür (kullanıcının "boş daha hoş" sezgisi), kenar da belli kalır. Kat 2'deki alçak bölme diliyle aynı.
  B'de mutfak zemini kuyunun basamaklarına doğrudan açılıyor ve sınır kayboluyor. Kesin seçim kareden yapılmalı.

## G-111 · Ön tezgâh ile sağ duvarın birleşimi — pano `docs/kareler/s5-tasarim-g111-birlesim.png`
Bugün: tezgâh x −4,6'da bitiyor. Duvarın ekseni de aynı hatta, yani tezgâhın ucu duvarın yarı kalınlığına (0,09) gömülü ve duvarın çıtası tezgâhı kesiyor.
Etkilenen dosyalar: `Kat2.tsx` (duvar ucu) ve `kat2/Mutfak.tsx` (`OnTezgah` son modül). C ve D'de ek olarak `kat.ts` `KAT2_ON_TEZGAH`.
- **A** bugün · **B** pilastr: duvar ucunda 0,42 m'lik sıva ayak · **C** KayKit `kitchencounter_outercorner` son modül olur, duvar köşenin arkasında biter
- **D** tezgâh dönüşü (L): duvar boyunca 1,6 m döner · **E** duvarın son 0,8 m'si tezgâh boyuna iner, köşesinde ahşap dikme · **F** KayKit `pillar_A` köşe direği
- **G** tezgâhın ucu ahşap yan panelle kapanır, duvar geri çekilir
- Öneri: **E** (yedek D). Karede en temiz birleşim bunlar: duvar tezgâh hizasında kademeyle biter, tezgâhın ucu açıkta ve tek parça okunuyor.
  KayKit adayları karede kötü çıktı. C'de köşe modülünün çekmecesi tezgâhın önünden taşıyor. F'deki `pillar_A` yeşil kaideli bir direk, mutfakta yabancı duruyor.
  G-102'de C (alçak duvar) seçilirse birleşim sorunu kendiliğinden kalkar.

## G-112 · Mutfak zemini (çekilmedi, gerçekler kodda)
- Kat 1 mutfağı: `kitchenTheme` (mağazada satılan kozmetik), varsayılanı `klasik` (KayKit siyah #343434 + beyaz #d5dcdf). Kullanıcının "siyah beyaz" dediği bu.
- Kat 2 mutfağı: `kat2/Mutfak.KAT2_ZEMIN = 'koyuKahve'` (#6b5d53 + krem #e8ceb4, aynı KayKit karo). Kat 2 salonu düz parke (#b98a5a).
- Yorum 2 (Kat 1 mutfağı = Kat 2 mutfağı, koyuKahve) **çok daha olası**: konu "mutfağın zemini" ve kullanıcı Kat 2 mutfağını 2026-11-17'de kendisi seçti. Yorum 1 (parke) mutfak için karo dilini kaybettiriyor.
- Dikkat: `kitchenThemes` mağazada `klasik` (ücretsiz) ve `kahve` (10.000) olarak satılıyor. Varsayılanı koyuKahve yaparsak satılan tema listesi (`economy.config` cosmetics) ile kayıttaki seçim nasıl uyuşacak, buna karar gerekir.
- Kadro (araçta hazır): REF Kat 2 mutfağı · A klasik · B koyuKahve · C parke · D mağazadaki "kahve".

## G-114 · Ön duvar oyuncuyu örtüyor (kanıt: keşif kareleri, ölçü hesapla)
- Kanıt `docs/tasarim/s5/kesif-k2-on-orta.png`, `kesif-k2-on-sol.png`: Kat 2'de ön duvar düz 3,2 m ve camı yok, duvar dibindeki oyuncu **tamamen** görünmüyor.
  Kat 1'de (`kesif-k1-on-*.png`) aynı yerde vitrin camı var, oyuncu camın arkasından görünüyor.
- Ölçü: portre kamerada d = 11,05 (yükseklik ve geri çekilme). Duvara en yakın oyuncu duvardan 0,88 m uzakta. 3,2 m'lik duvarda oyuncunun başı ancak duvardan **1,72 m**, ayağı **3,2 m** uzaklaşınca görünür.
  Duvar 1,0 m olsa ayak 1,0 m'de görünür, baş her zaman görünür.
- Adaylar (araçta hazır, kırpma düzlemiyle): A bugün · B alçak 1,0 · C kesik (yalnız oyuncunun önündeki 5 m 0,9'a iner) · D %30 saydam · E duvarı kaldır · F oyuncunun sarı silueti.
  Kat 1 satırı: A, B, C, F.
- Etkilenen dosya: `Kat2.tsx` `Duvarlar` (ön kenar). Kat 1 için `Scene.Walls` + `wallLook` (vitrin ve kapı alınlığı bu duvarda).
- Öneri: **Kat 2'de B** (D-198 kuralı zaten "kameraya bakan bölme alçak" diyor, dış ön duvar da aynı kurala girer). Kat 1 vitrinle büyük ölçüde okunuyor; kare alınınca karar verilir.

## G-115 · Kat 2'de bina dışı boş (kanıt: keşif kareleri)
- Kanıt `kesif-k2-on-orta.png`, `kesif-k2-kose-uzak.png`: ön duvarın dışı/altı arka plan rengi (koyu lacivert boşluk). Yalnız arka ve yanlarda 3,2 m aşağıda çim var (`kat2/Dis.tsx`).
- Adaylar (araçta hazır): A bugün · B alt kat gövdesi (cephe 3,2 m aşağı iner, kat silmesi, koyu cam) · C B + sokak · D B + kiremit saçak + çim · E yalnız çim zemin.
  Etkilenen dosya: `kat2/Dis.tsx`.
- Öneri (kare bekliyor): **B**. Kullanıcının cümlesi "alt kat duvar olarak olabilir"in birebir karşılığı bu.

## G-129 · Masa dağılımı (araçta hazır, çekilmedi)
- Bugün (N7): sağ arka sırada 2 okey, altında 12 tavla sık sıra halinde (2,4 m adım), sol baştan sona okey.
- B taraf ayrımı: sağ arka okeyler yerine 4 tavla (okey −2, tavla +4 → **denge**, varyant kapısı). C blok ritmi: tavla ikişerli, bloklar okey sıralarıyla aynı hizada.
  D 3×4 ızgara. E: B + C birlikte.
- Etkilenen dosyalar: `kat.ts` (`N7_TAVLA_Z`, `KAT2_MASALAR`, B/E'de `OKEY_YER`), `kat2/yol.ts`, bekçiler `kat2-*`. Koridor sayısı panoda (`koridor()`).
- Hesaptan ön bulgu: C'de bloklar arası serbest şerit 0,26'dan **1,46 m**'ye çıkar (tavla sıraları arasından yürünür), blok içi 0,26'da kalır.

## G-120 · Görev arayüzü (maket hazır, çekilmedi)
- `tools/s5-tasarim-gorev.html`: M1 bant karta büyür (ilerleme, ödül, "sırada") · M2 Görevler sekmesinde hat önce, günlük alta · M3 yol haritası (yükseltme durakları ayrı düğüm) ·
  M4 ödül = yükseltme ("5 masa aç → açık masalar Sv2", ödül kartı). M4 yeni bir ödül tipi, yani **denge** konusu ve varyant kapısından geçer.
- Çıktı (koşunca): `docs/kareler/s5-tasarim-gorev-*.png` + `s5-tasarim-g120-gorev.png`.
