# Kat 2 · süre ölçümü + ocak/garson yükseltmesi (Kat 1 karşılığı) — ölçüm raporu

Soru (kullanıcı 2026-11-17, "önerinle ilerleyelim"): Kat 2 bugün kaç saat sürüyor? (D-192'deki 4,9 sa ölçümü,
D-198 kasa kaldırma + G5 + D-195 masa Sv'den önceydi.) Kat 1'deki **ocak** ve **garson** yükseltmesinin Kat 2
karşılığı ne getirir?

Araç: `tools/olcum-kat2-ocak-garson.ts` · ham çıktı: `docs/olcum-kat2-ocak-garson.txt` (`OLCUM=tam`, damgalar temiz).
Mutasyonlar (ilk koşu): `OG_MUT=etkisiz` (yükseltme ayara işlenmez → 2 varyant damgası kırıldı) · `OG_MUT=kat1yok`
(Kat 1 parası akmaz → "Kat 1 parası cüzdana aktı" damgası kırıldı). `economy.config.ts` değişmedi.

## Kollar (Kat 1'den aynen uyarlama)

- **Ocak 5 kademe:** mutfak seviyesi 1→6 (mangal görseli D-199 zaten 6 basamak). Her kademede iki ocağın demlemesi
  ×1,35 hızlanır, hazır kuyruğu +1 olur. Kaynak: Kat 1 `service.upgrade.outputMult` + `brew.queuePerLevel`.
  Kademeler zincirde şu pad'lerden sonra açılır: okey4 → 2. ocak → lavabo → garson → tavla6.
- **Garson 3 alım:** hız 3→4 (Kat 1'de 1,5→2,0, aynı ×1,33 oran) · tepsi 2→3→4 (Kat 1 eğrisi). Kat 1 gibi panelden
  anında alınır. Açılış: tavla2 · tavla5 · tavla10. **2. garson** (D-189 adayı) tavla8'den sonra, ayrı kol.
- **Fiyat:** her kademe, onu açan zincir pad'inin fiyatı × f (f = 1 ya da ½).
- **Bot:** son kademe karakter, "en ucuz açık hedef önce". Kat 1 parası Kat 2'deyken doğrudan cüzdana akar (D-198 G1).

## §Bulgular (tam koşu)

**A · Plato** (bütün zincir açık; 30 dk; gerçek Kat 2 coin/dk = masa + lavabo)

| kurulum | Sv | coin/dk | servis | okey | tavla | ocak kuyruğu dolu | ocak boş | oyuncu boş |
|---|---|---|---|---|---|---|---|---|
| taban | 1 | **785** | %45 | %35 | %60 | %38 | %17 | %1 |
| ocak 6 | 1 | 853 (+%9) | %64 | %57 | %73 | %79 | %0 | %1 |
| garson son kademe | 1 | 788 (±0) | %49 | %34 | %69 | %33 | %18 | %0 |
| ocak 6 + garson | 1 | 836 (+%6) | %64 | %49 | %84 | %79 | %0 | %1 |
| ocak 6 + garson + 2. garson | 1 | 828 (+%5) | %64 | %44 | %89 | %79 | %0 | %1 |
| taban | 5 | **1.717** | %44 | %38 | %53 | %35 | %17 | %1 |
| ocak 6 | 5 | 1.755 (+%2) | %58 | %47 | %73 | %80 | %0 | %1 |
| ocak 6 + garson | 5 | 1.754 (+%2) | %61 | %43 | %85 | %79 | %0 | %0 |
| ocak 6 + garson + 2. garson | 5 | 1.760 (+%3) | %64 | %44 | %90 | %77 | %0 | %1 |

**B · İlerleme** (Kat 2'ye ilk çıkış → zincir 26 pad → 88 masa Sv → kolun yükseltmeleri)

| kol | yükseltmelerin toplam fiyatı | zincir biter | **Kat 2 biter** | tabana göre | en uzun bekleyiş | servis | tavla |
|---|---|---|---|---|---|---|---|
| TABAN (bugün) | — | 4,71 sa | **9,86 sa** | — | 12,2 dk | %37 | %47 |
| O-½ ocak, yarım fiyat | 12.600 | 4,88 sa | 9,93 sa | +4 dk | 11,7 dk | %46 | %54 |
| O-1 ocak | 25.200 | 5,26 sa | 10,27 sa | +25 dk | 12,1 dk | %49 | %56 |
| G-1 garson | 22.500 | 5,29 sa | 10,40 sa | +32 dk | 12,2 dk | %40 | %60 |
| G2-1 garson + 2. garson | 30.700 | 5,48 sa | 10,61 sa | +45 dk | 12,3 dk | %43 | %72 |
| OG-½ ocak + garson, yarım | 23.850 | 5,15 sa | 10,19 sa | +20 dk | 11,9 dk | %48 | %59 |
| OG-1 ocak + garson | 47.700 | 5,78 sa | 10,80 sa | +56 dk | 11,7 dk | %50 | %64 |
| OG2-1 + 2. garson | 55.900 | 5,98 sa | 11,00 sa | +68 dk | 11,7 dk | %53 | %78 |

**Bulgu 1 · Kat 2 bugün 9,9 saat sürüyor:** zincir 4,7 sa, masa Sv'leri 5,2 sa daha. Son saatte Kat 2 1.588 coin/dk getiriyor.
D-192'deki 4,9 sa yalnız zinciri ölçüyordu; zincir kısmı 4,7 sa ile aynı yerde.

**Bulgu 2 · Ocak servis oranını artırıyor, parayı pek artırmıyor:** ocak 6'da kahvelerin %45'i yerine %64'ü servis ediliyor,
ama para Sv1'de yalnız %9, Sv5'te %2 artıyor. Sebep: darboğaz ocak değil, oyuncunun kendisi. Oyuncu her koşulda neredeyse
hiç boş kalmıyor (%0-1). Yığın toplama ve okey servisi onun işi. Paranın çoğu masa ücretinden ve lavabodan geliyor,
kahvenin payı küçük.

**Bulgu 3 · Garson tavlayı rahatlatıyor, parayı artırmıyor:** tavla servisi %60 → %69-89. Ama tavla kahvesi 3 coin, para
neredeyse aynı kalıyor (±%1). 2. garson ocaktan fincan alıyor; okey servisi %35 → %25 düşüyor.

**Bulgu 4 · Her yükseltme kolu Kat 2'yi uzatıyor:** harcanan para, getirdiği paradan fazla. En hafifi **O-½** (+4 dk,
fiyat ~12.600), en ağırı OG2-1 (+68 dk). Bekleyiş ritmi bütün kollarda aynı: en uzun ~12 dk, medyan ~4,5 dk.

## §Bulgular 2 — Kat 1 mantığı: garson HER masaya (tam koşu, aynı araç)

Kullanıcı (2026-11-17): *"Garson yükseltince daha hızlı olur, elinde daha fazla kahve tutar; ocağı yükseltince kapasite ve
hız artar; siparişi garsonlar iletir — birinci katta bu mantığı kurmadık mı? İkincisinde niye yok?"* → Kat 2 garsonu
D-186'dan beri yalnız tavlaya gidiyordu. Kod seçmeli ayar aldı: `Kat2GarsonAyar.herMasa` (verilmezse oyun bugünkü).

| kurulum (plato) | Sv | coin/dk | servis | okey | tavla | garson payı |
|---|---|---|---|---|---|---|
| H: garson her masaya | 1 | 822 (+%5) | %50 | %54 | %44 | %28 |
| H + ocak 6 + garson son kademe | 1 | 905 (+%15) | %74 | %77 | %68 | %37 |
| H + ocak 6 + garson + 2. garson | 1 | 918 (+%17) | %80 | %78 | %84 | %60 |
| H: garson her masaya | 5 | 1.745 (+%2) | %47 | %51 | %39 | %30 |
| H + ocak 6 + garson + 2. garson | 5 | 1.846 (+%8) | %77 | %78 | %76 | %63 |

| kol (ilerleme) | yükseltmelerin toplamı | zincir biter | **Kat 2 biter** | tabana göre | en uzun bekleyiş | servis |
|---|---|---|---|---|---|---|
| TABAN (bugün) | — | 4,71 sa | 9,86 sa | — | 12,2 dk | %37 |
| H yükseltmesiz | — | 4,57 sa | 9,46 sa | −24 dk | 11,9 dk | %46 |
| HOG-½ ocak 5 + garson 3, yarım | 23.850 | 4,93 sa | 9,75 sa | −7 dk | 11,0 dk | %58 |
| HOG-1 aynısı, tam fiyat | 47.700 | 5,54 sa | 10,28 sa | +25 dk | 10,8 dk | %61 |
| **HOG2-½ + 2. garson, yarım** | 27.950 | 4,96 sa | **9,55 sa** | −19 dk | 11,0 dk | **%71** |
| HOG2-1 aynısı, tam fiyat | 55.900 | 5,68 sa | 10,26 sa | +24 dk | 10,8 dk | %72 |

**Bulgu 5 · Garson her masaya gidince yükseltmeler karşılığını veriyor:** 2 garson + ocak 6 ile kahvelerin %80'i
servis ediliyor (bugün %45), para Sv1'de +%17. Yarım fiyatta Kat 2 bugünden 19 dk KISA bitiyor; tam fiyatta 24 dk uzun.
Kahve paranın küçük payı olduğu için (masa ücreti + lavabo baskın, grup kahve gelse de gelmese de aynı süre oturur)
etki Kat 1'deki kadar büyük değil; Sv5'te +%8.

(Bulgular 2'deki ilerleme satırları FİNAL koşudan: ocak noktası oyundaki yerinde, `KAT2_OCAK_YUK_YER`. §Bulgular 1'in
O-½/OG-½ satırları ölçüm aracının ilk noktasıyla; final koşuda 9,92 / 10,12 sa — fark ≤ 4 dk.)

## Karar (2026-11-17, D-200)

Kullanıcı ilk paketi (A-D, garson yalnız tavla) "yükseltme nasıl işe yaramaz" diye geri çevirdi; mantığın Kat 1'deki gibi
olmasını istedi (garson her masaya, ocak/garson yükseltmesi). İkinci pakette **1 · 2 garson, yarım fiyat (HOG2-½)** seçti.

- Config `kat2.garson.herMasa = true` · `kat2.yukseltme` (ocak 5 · garson hız 1 · tepsi 2 · ek garson 1; fiyat açan pad ×½).
- Ocak noktası ocağın sağında (`KAT2_OCAK_YUK_YER`), Kat 1 servis noktası dili; mutfak/mangal görseli ocak alımından türer.
- Garson alımları karakter panelinde, Kat 2'deyken "Garson" sekmesi (Kat 1 garson/bulaşıkçı sekmeleri Kat 1'de).
- Kayıt additive `kat2.yuk` (saveVersion değişmedi).
- **Final tam koşu (CONFIG kolu, oyun mantığı):** Kat 2 **9,55 sa** (bugün 9,86) · zincir 4,96 sa · en uzun bekleyiş 11,0 dk ·
  kahve servisi %71 · damgalar temiz, "config = HOG2-½" ve "araç = oyun kuralı" bekçileri yeşil.
- Bekçi `tests/kat2-yukseltme.test.ts` (17 test) · mutasyon 3/3 yakalandı (herMasa yok · açan pad kontrolü yok · demleme hızlanmaz).
