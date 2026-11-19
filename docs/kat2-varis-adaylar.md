# Kat 2 varış — merdiven adayları (2026-11-19)

Kullanıcının sorusu: "Merdiven salona mı dönük olsa? Çıkınca duvar dibinde çıkıyorum, salona yürümem
gerekiyor; görüntü de düzgün değil. İnmek için 'Kat 1'e in' düğmesi ya da bekleme olabilir."

- **Panolar:** `docs/kareler/kat2-varis-pano.png` (geniş, kat genişliği boydan boya) ·
  `docs/kareler/kat2-varis-pano-oyun.png` (varış anı, oyunun kendi kamerası + iniş tetikleri T1-T3)
- **Ham kareler:** `docs/tasarim/kat2-varis/` · **Araç:** `tools/kat2-varis.tsx` + `tools/kat2-varis-cek.mjs`
  (çalışan oyuna aday kuyuyu ekler; masa, mutfak, garson, oyuncu ve HUD oyunun kendisi. `src/**` değişmedi.)
- Kurulum her karede aynı: Kat 2'nin bütün pad'leri açık, masalar boş, oyuncu varış noktasında, yüzü salona dönük.

## Ölçü (kareden ve koddan)

| | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| Varış karesinde salon zemini (oyun alanının %'si, piksel sayımı) | **20** | 53 | 57 | 54 | 49 | 53 | 53 |
| Aynı karede duvar dışı, ağaç/çim (%) | **24** | 0 | 0 | 0 | 3 | 0 | 0 |
| Varıştan salonun kenarına (z −9,8), m | **6,0** | 0 | 0 | 0 | 0,8 | 0 | 0 |
| Varıştan 1. ocağın alma noktasına (−7,4; −9,2), m | **10,9** | 7,5 | 8,0 | 7,5 | 12,0 | 5,5 | 7,5 |
| Varıştan en yakın okey masasının erişimine, m | **11,8** | 8,4 | 7,7 | 8,4 | 6,5 | 6,4 | 8,4 |

Mesafeler köşeli (Manhattan) yol. Hız 4,5 br/sn (kademe 0): A'nın 6 m'si ≈ 1,3 sn. Sorun karede açık: A'da kameranın üst dörtte biri arka duvarın üstü ve dışarıdaki ağaçlar, oyuncu kuyunun
korkuluğu ile duvar arasındaki 2,3 m'lik koridorda duruyor.

## Adaylar

**A — Bugün (referans).** Ağız arkada, varış sahanlığın solunda (−3,1; −15,8), iniş: sahanlıkta kuyuya doğru (+z) itmek.

**B — Ters kuyu (180°).** Kuyu yerinde ama basamakların üst ucu salon tarafında (z −11,0); arkada ve iki yanda korkuluk,
ağız salona açık. Varış (0; −9,3), yüz salona. İniş: ağza doğru (−z) yürümek.
- Kat 1 ile tutarlı mı: **hareket aynı**: Kat 1'de çıkmak için merdivene (−z) yürünüyor, B'de inmek için de (−z) yürünür.
  Fiziksel olarak tersi (Kat 1 merdiveni arkaya doğru yükseliyor). Geçiş karartmalı olduğu için oyuncu bunu görmez.
- Yerleşim: masa/pad **kaymaz**. Garson pad'leri (z −6, çerçeve −6,85'e kadar) varış noktasının 2,4 m önünde, ocak yükseltme
  noktası (−5,2; −8,8) kovanın dışında kalıyor.
- Kod: `kat.ts` → `AGIZ` (ağız tarafı), `KUYU`, `VARIS[2]`, `merdivenTetik` (Kat 2 dalı: −z, z ≤ ağız+pay) ·
  `Kat2.tsx` → `MerdivenAgzi` + `Zemin` (delik parçaları) · `kat2/yol.ts` → `merdivenY` ters, `grupYolu`nun ilk 4 noktası
  (grup artık ağızdan doğrudan salona çıkar, kuyunun yanından dolaşmaz; yol kısalır) · `Garson.tsx`/`siparisBalonu.ts`
  kuyuya bakıyorsa · bekçiler: `kat2-altyapi`, `kat2-yol`, `kat2-akis`, `kat2-kat1-esit`, `kasa-oyun`, `tarama-w1-kayit` (VARIS/tetik sayıları).
- Risk: düşük. Eski kayıt "Kat 2'deyim" diyorsa `VARIS[2]` yeni noktadan açılır; kayıt şeması değişmez.

**C — B + "Kat 1" zemin pad'i.** B'nin kuyusu 0,6 m kısaltılır (ağız −11,6), ağzın önünde düz zemin işareti "Kat 1 ↓"
(Kat 1'in pad dili, `GroundMarker`). Üstünde durunca dolar ve iner. Varış (0; −8,6), pad'in salon tarafında. Varış pad'in üstüne düşmemeli,
yoksa oyuncu çıkar çıkmaz geri iner.
- Kat 1 ile tutarlılık: Kat 1'de çıkış itmeyle. C seçilirse Kat 1'e de aynı pad konmalı ("Kat 2 = Kat 1 uyarlaması"): `MERDIVEN_PAD_YER` zaten orada.
- Yerleşim: masa kaymaz. Pad çerçevesi (−11,4…−9,7) kovanın içinde, ocak/garson çerçevelerine değmiyor.
- Kod: B + `kat2Dongu`'da iniş pad'i (dolum, `padCercevesi`) + Kat 1 tarafında aynısı.

**D — Kuyu yerinde, varış önde.** Yalnız `VARIS[2]` (0; −9,3) olur. İniş bugünkü gibi arkadan yapılır.
- Ucuz (tek sayı), ama oyuncu merdivenin hiç çıkmadığı bir yerde belirir. İnmek için yine 6 m geri yürünür, yani sorunun yarısı kalır.

**E — 90° yan kuyu.** Kuyu kova boyunca yatay (x −4,0…1,6), ağız doğuda; varış kovanın sağ ağzında (3,2; −10,6).
- Karede merdiven yandan görünüyor, ağzın önü 2,6 m'lik dar bir cep. Salona hâlâ 0,8 m yürünür.
- Kat 1 ile tutarlılık en zayıf aday bu: ne yön ne hareket Kat 1'e benziyor. Yerleşimi bozmuyor.

**F — U dönüşlü (çift kol + ara sahanlık).** Kuyu 8 m genişler (x ±4,0). Sol kol salondan arkaya iner, arkada ara sahanlık var,
sağ kol öne dönüp Kat 1'e iner. Varış (−2,0; −9,3).
- Kat 1 ile **en tutarlı** aday: alt kol Kat 1 merdiveninin ayağının olduğu öne iniyor. İniş hareketi B ile aynı (−z).
- Bedel: kovanın yan koridorları kalkar (0,6 m kalır, yürünmez), çizim iki kol + ara duvar ister. Kat 1'deki merdiven tam kat yüksekliğine
  çıkıyor; tam tutarlılık için Kat 1'e de ara sahanlık gerekir (isteğe bağlı).
- Yerleşim: masa kaymaz. Kod: B'ninkilerle aynı, artı `MerdivenAgzi` iki kol.

**G — Geniş ters kuyu (8 m).** B'nin kova genişliğinde hâli: büyük, gösterişli bir merdiven başı. Kod ve risk B ile aynı, yan koridorlar F'deki gibi kalkar.

## İniş nasıl tetiklenir (B/C geometrisinde, oyuncu ağzın önünde)

- **T1 İtme (bugün):** ağza doğru yürümeye devam edince iner. Ek nesne yok, Kat 1'deki çıkışla aynı. B'de ağzın önü salona açık, yani
  salonda dolaşırken yanlışlıkla inme riski bugünkünden fazla. Bunun için tetik yalnız ağzın 1 m'lik şeridinde ve −z itmede çalışmalı (bugünkü kuralın aynısı).
- **T2 Zemin pad'i "Kat 1":** durunca dolar. Mekânsal tycoon diline uyuyor (havada buton yok, düz zemin işareti), yanlışlıkla inme olmaz.
  Bedeli 1 sn kadar bekleme ve Kat 1'e de pad konması.
- **T3 HUD düğmesi "↓ Kat 1":** ağza yaklaşınca belirir. En hızlısı, ama HUD'a yeni bir öğe ekliyor ve dünyadaki işaret dilinin dışında kalıyor
  (hafıza: havada/ekranda buton yerine mekânsal).

## Önerim: **B + T1**, yanlışlıkla inme sorun olursa **T2** (C)

- Gözle görülen fark: varış karesinde salon zemini %20'den %53'e çıkıyor, karedeki dış/ağaç payı %24'ten %0'a iniyor.
  Varışta salonun kenarındasın (6 m ≈ 1,3 sn yürüyüş kalkıyor), ilk ocağa yol 10,9'dan 7,5 m'ye iniyor.
- Hiçbir masa ya da pad kaymıyor. Kuyu aynı ayak izinde (x ±2,3) kaldığı için kovanın yan koridorları ve N7 düzeni olduğu gibi duruyor.
  Değişiklik merdiven ağzının yönü, varış ve tetikle sınırlı.
- Kat 1 ile aynı hareket: "merdivene doğru yürü" iki katta da −z.
- F daha tutarlı ve daha güzel bir merdiven ama iki kat fazla çizim istiyor ve yan koridorları kapatıyor. Kazanç (fiziksel tutarlılık)
  karartmalı geçişte görünmüyor. G de aynı şekilde B'den büyük ama karede ek bir şey kazandırmıyor.
- T1'de kalma gerekçem: Kat 1'de çıkış itmeyle ve ek nesne istemiyor. Oyun testinde yanlışlıkla inme görülürse C'ye (pad) geçmek
  yalnız ekleme; B'nin geometrisi aynen kalır.
