# S5 tasarım adayları (TASARIM ajanı, 2026-11-20) — kareler, kod değil

Araç: `tools/s5-tasarim.tsx` (adaylar, çalışan oyunun sahnesine eklenir) + `tools/s5-tasarim-cek.mjs` (çeker, pano yapar)
+ `tools/s5-tasarim-gorev.html` (G-120 maket parçaları). Ham kareler `docs/tasarim/s5/`. `src/**` değişmedi.
Koşu: `SORU=G102,G111 node tools/s5-tasarim-cek.mjs` (port `S5_PORT`, varsayılan 5163).
Durum: **7 sorunun hepsi çekildi** (2026-11-20, ikinci koşu 0 hata). Kareler kontrol edildi, yeniden çekim gerekmedi.

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

## G-112 · Kat 1 mutfak zemini — pano `docs/kareler/s5-tasarim-g112-zemin.png`
- Kat 1 mutfağı: `kitchenTheme` (mağazada satılan kozmetik), varsayılanı `klasik` (KayKit siyah #343434 + beyaz #d5dcdf). Kullanıcının "siyah beyaz" dediği bu.
- Kat 2 mutfağı: `kat2/Mutfak.KAT2_ZEMIN = 'koyuKahve'` (#6b5d53 + krem #e8ceb4, aynı KayKit karo). Kat 2 salonu düz parke (#b98a5a).
- Yorum 2 (Kat 1 mutfağı = Kat 2 mutfağı, koyuKahve) **çok daha olası**: konu "mutfağın zemini" ve kullanıcı Kat 2 mutfağını 2026-11-17'de kendisi seçti. Yorum 1 (parke) mutfak için karo dilini kaybettiriyor.
- Dikkat: `kitchenThemes` mağazada `klasik` (ücretsiz) ve `kahve` (10.000) olarak satılıyor. Varsayılanı koyuKahve yaparsak satılan tema listesi (`economy.config` cosmetics) ile kayıttaki seçim nasıl uyuşacak, buna karar gerekir.
- Pano: REF Kat 2 mutfağı bugün, ardından Kat 1 mutfağında 4 aday (aynı kadraj).
  - **A** bugün: siyah-beyaz dama. · **B** Kat 2 mutfağının koyu kahve-krem daması. · **C** Kat 2 salonunun düz ahşap parkesi, karo yok.
  - **D** mağazada satılan "Kahve Dama" (kızıl kahve-bej), B ile karışmasın diye eklendi.
- Öneri: **B**. Karede REF ile birebir aynı görünen tek aday bu. C'de mutfak salondan ayrılmıyor, D de REF'ten belirgin biçimde kızıl.

## G-114 · Ön duvar oyuncuyu örtüyor — pano `docs/kareler/s5-tasarim-g114-on-duvar.png`
- Kanıt `docs/tasarim/s5/kesif-k2-on-orta.png`, `kesif-k2-on-sol.png`: Kat 2'de ön duvar düz 3,2 m ve camı yok, duvar dibindeki oyuncu **tamamen** görünmüyor.
  Kat 1'de (`kesif-k1-on-*.png`) aynı yerde vitrin camı var, oyuncu camın arkasından görünüyor.
- Ölçü: portre kamerada d = 11,05 (yükseklik ve geri çekilme). Duvara en yakın oyuncu duvardan 0,88 m uzakta. 3,2 m'lik duvarda oyuncunun başı ancak duvardan **1,72 m**, ayağı **3,2 m** uzaklaşınca görünür.
  Duvar 1,0 m olsa ayak 1,0 m'de görünür, baş her zaman görünür.
- Pano: Kat 2'de 6 aday, Kat 1'de 4 aday. Oyuncu duvarın dibinde, oyun kamerasıyla çekildi.
  - **A** bugün: Kat 2'de oyuncu hiç görünmüyor.
  - **B** duvar 1,0 m'ye iner: oyuncu ve masa tam görünür, duvar lambri bandı olarak kalır.
  - **C** yalnız oyuncunun önündeki 5 m iner: oyuncu görünür ama duvarda bir çentik açılır.
  - **D** duvar %30 saydam olur: soluk bir perde gibi durur.
  - **E** duvar kalkar: salonun kenarı kaybolur.
  - **F** duvar aynen kalır, oyuncu sarı siluet olarak görünür.
  - Kat 1'de: bugün vitrin camının ardından oyuncu yarım seçiliyor. B'de vitrin ve kapı alınlığı temizce kesiliyor.
- Etkilenen dosya: `Kat2.tsx` `Duvarlar` (ön kenar). Kat 1 için `Scene.Walls` + `wallLook` (vitrin ve kapı alınlığı bu duvarda).
- Öneri: **iki katta da B**. En temiz kare bu, D-198'deki "kameraya bakan bölme alçak" diliyle de aynı. İki kat aynı kuralla çalışır. Kat 1 vitrinini korumak istenirse yedek: Kat 1 A + Kat 2 B.

## G-115 · Kat 2'de bina dışı boş — pano `docs/kareler/s5-tasarim-g115-alt-kat.png`
- Kanıt `kesif-k2-on-orta.png`, `kesif-k2-kose-uzak.png`: ön duvarın dışı/altı arka plan rengi (koyu lacivert boşluk). Yalnız arka ve yanlarda 3,2 m aşağıda çim var (`kat2/Dis.tsx`).
- Pano: 5 aday (sol geniş kadraj, sağ uzaklaşmış oyun kamerası).
  - **A** bugün: duvarın altı lacivert boşluk.
  - **B** alt katın cephesi aşağı iner (sıva ve koyu camlar), ama gövdenin dibi yine boş kalır.
  - **C** B'ye ek olarak dipte gri sokak zemini.
  - **D** B'ye ek olarak duvar dibinde kiremit saçak ve çim. Saçak karede düz kırmızı bir şerit gibi okunuyor.
  - **E** gövde yok, yalnız aşağıda çim. Bina havada duruyor gibi görünüyor.
  Etkilenen dosya: `kat2/Dis.tsx`.
- Öneri: **C**. Kullanıcının "alt kat duvar olsun" dediği gövde var, boşluk da tümüyle kapanıyor. Sokak, Kat 1'in kaldırımıyla aynı dilde. B'de gövdenin altında boşluk sürüyor.

## G-129 · Masa dağılımı — pano `docs/kareler/s5-tasarim-g129-dagilim.png`
- Bugün (N7): sağ arka sırada 2 okey, altında 12 tavla sık sıra halinde (2,4 m adım), sol baştan sona okey.
- B taraf ayrımı: sağ arka okeyler yerine 4 tavla (okey −2, tavla +4 → **denge**, varyant kapısı). C blok ritmi: tavla ikişerli, bloklar okey sıralarıyla aynı hizada.
  D 3×4 ızgara. E: B + C birlikte.
- Etkilenen dosyalar: `kat.ts` (`N7_TAVLA_Z`, `KAT2_MASALAR`, B/E'de `OKEY_YER`), `kat2/yol.ts`, bekçiler `kat2-*`. Koridor sayısı panoda (`koridor()`).
- Pano ölçüleri (`docs/tasarim/s5/olcum.json`):

| Aday | Masa | Okey / Tavla | 0,5 m'den dar geçit sayısı | En dar geçit | Orta yol |
|---|---|---|---|---|---|
| A | 22 | 10 / 12 | 10 | 0,26 m | 10,55 m |
| B | 24 | 8 / 16 | 12 | 0,26 m | 10,55 m |
| C | 22 | 10 / 12 | 6 | 0,26 m | 10,55 m |
| D | 22 | 10 / 12 | 0 | 1,66 m | 9,05 m |
| E | 24 | 8 / 16 | 8 | 0,26 m | 10,55 m |

  - **A** bugün: sağ arkada 2 okey, altında sık dizilmiş tavla sırası.
  - **B** sağ arkadaki okeyler tavla olur, yani sol taraf hep okey, sağ taraf hep tavla. Sık sıra yerinde kalır.
  - **C** tavlalar ikişerli bloklar halinde dizilir ve okey sıralarıyla aynı hizaya oturur.
  - **D** tavlalar 3 sütun ve 4 sıradan oluşan eşit ızgaraya dizilir. Dar geçit kalmaz.
  - **E** B ile C birlikte: sağ taraf baştan sona ikişerli tavla blokları.
- Öneri: **E**. Kullanıcının şikâyet ettiği simetri hatasını tam kapatan tek aday bu: sol baştan sona okey, sağ baştan sona tavla, aynı ritimde.
  Masa sayısını 22'den 24'e çıkardığı için **denge** konusu ve varyant kapısından geçer. Denge değişmesin istenirse yedek **C** (sayılar aynı, dar geçit 10'dan 6'ya iner).

## G-120 · Görev arayüzü — pano `docs/kareler/s5-tasarim-g120-gorev.png` (tek tek: `s5-tasarim-gorev-*.png`)
- `tools/s5-tasarim-gorev.html`: M1 bant karta büyür (ilerleme, ödül, "sırada") · M2 Görevler sekmesinde hat önce, günlük alta · M3 yol haritası (yükseltme durakları ayrı düğüm) ·
  M4 ödül = yükseltme ("5 masa aç → açık masalar Sv2", ödül kartı). M4 yeni bir ödül tipi, yani **denge** konusu ve varyant kapısından geçer.
- Panoda bugünkü hâl 3 kareyle (bant, Görevler sekmesi, Hedefler sekmesi) ve 4 aday 5 kareyle var.
  - **M1** alttaki bant büyük karta dönüşür: ilerleme çubuğu, ödül ve "sırada" bilgisi.
  - **M2** Görevler sekmesi aktif görevle açılır, ardından sıradaki 3 görev gelir, günlükler en alta tek satıra iner.
  - **M3** Görevler sekmesi dikey bir yola dönüşür: geçilen adımlar yeşil, şimdiki adım büyük, yükseltme durakları mor.
  - **M4** görevin ödülü yükseltme olur: "5 masa aç" görevi bitince açık masalar Sv2'ye çıkar ve ödül kartı gösterilir.
- Öneri: **M1 + M2 birlikte**. Kullanıcının iki derdini doğrudan karşılıyor: görev ekranda öne çıkıyor ve sekmede ilk sırada yer alıyor. Ekran yükü de en az bunlarda.
  M4'ün yükseltme durağı fikri M2'nin sırasına sarı kart olarak zaten giriyor. Ödülü gerçekten yükseltme yapmak (M4) denge konusu, varyant kapısından geçer.
