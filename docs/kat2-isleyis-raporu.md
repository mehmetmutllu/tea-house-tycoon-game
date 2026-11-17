# Kat 2 işleyişi = Kat 1 — garson pad'leri · lavabo seviyesi · bulaşık — ölçüm raporu

Soru (kullanıcı 2026-11-17): "Birinci kat ve ikinci kat işleyiş olarak aynı olsun. Sadece içerik farklı (altta çay masası,
üstte okey masası). Neden alışkanlığı değiştiriyoruz?" Kat 2'de Kat 1'den farklı işleyiş kalmasın:
a) ilk garson erken, pad ile · b) 2-3. garson zincirde pad (panelden 2. garson kalkar) · c) lavabo seviyesi ·
d) bulaşık döngüsü + bulaşıkçı pad'i + boştaki garson kirli taşır · e) ocak yükseltmesi kalır (D-200).

Araç: `tools/olcum-kat2-isleyis.ts` · ham çıktı: `docs/olcum-kat2-isleyis.txt` (`OLCUM=tam`, damgalar temiz, 2026-11-17).
Yerleşim planı (gerçek koordinatlar): `docs/kareler/kat2-isleyis-plan.png` (`npx tsx tools/_kat2-isleyis-plan.ts`).
Mutasyonlar: `IS_MUT=garsonyok` (garson pad'i açılır, garson gelmez) → "garson servis eder" damgası kırıldı · `IS_MUT=yikamaz`
(leğen temize döndürmez) → "yıkanan fincan temize döner" damgası kırıldı. İlk denemede ikisi de KAÇTI (damga yoktu); iki
damga eklendi. `economy.config.ts` değişmedi.

## Kodda ölçüm için eklenenler (config'te kapalı — oyun bugünküyle aynı)

- `kat.ts`: `KAT2_GARSON_PADLER` (k2garson · k2garson2 · k2garson3) — üçü de **merdiven salonunda** kova ağzının önünde
  (x −2,2 / 0 / 2,2 · z −6). 1. garson pad'i tavla köşesinden buraya taşındı (erken gelebilsin). `KAT2_YIKAMA_YER` (ön tezgâhta
  iki ocağın ortası) · `KAT2_BULASIKCI_PAD/YER` (yıkamanın önü) · `KAT2_LAVABO_YUK_YER` (lavabonun solu).
- `kat2Dongu.ts`: her açık garson pad'i bir garson · `Kat2Ayar.bulasik` (YOKSA bulaşık yok): temiz fincan havuzu, demleme
  temiz harcar, fincan bir sonraki teslimde / kalkışta kirli olur, `esik`ten fazla kirli masaya grup oturmaz, oyuncu tepsiyle
  paylaşımlı toplar, boştaki garson 1 taşır, bulaşıkçı, leğen 10 sn'de toplu yıkar. Lavabo seviyesi yalnız araçta.

## Kollar

- **Garson:** eski `k2garson` (14. adım) çıkar, üç garson pad'i araya girer. Fiyat = ardından gelen pad × f.
  G-K1 (Kat 1 karşılığı): 1. garson 3. okeyden sonra ½ (1.100) · 2. garson okey salonu kapısından önce ×1 (2.700) ·
  3. garson lavabodan önce ×1 (5.600). G-UCUZ (hepsi ½) · G-ERKEN (1. garson 1. okeyden sonra) · G-GEC (2-3 geç).
  Panelden 2. garson (`garsonSayi`) kalkar; hız/tepsi D-200 gibi panelde. D-200'ün 4. ocak alımı eski garson adımına bağlıydı → tavla köşesi kapısına.
- **Lavabo L2-L6** (Kat 1 `rooms.lavabo`: uğrama %30 → %55): açan salon3 · tavla2 · tavla5 · tavla8 · tavla11.
  LV½ = ücret Kat 1 (18 → 86), fiyat açan pad × ½ (3.100-4.500) · LVy = ücret yarı hızda (18 → 52), aynı fiyat ·
  LVK1 = ücret Kat 1, fiyat Kat 1 × 1,87 (7.450-21.450).
- **Bulaşık:** Kat 1 sayıları (eşik >2 · yıkama r 1,6 · leğen 10 sn · boştaki garson 1 · bulaşıkçı 2,0/2). Havuz: Bk1 = Kat 1
  kuralı (ocak başına 10 + yükseltme başına 2) · B = + açık masanın kişisi başına 1 fincan · h1,5 = kişi başına 1,5. e4 = eşik 4.
  Bulaşıkçı pad'i 2. okey salonu masasından sonra (½ = 1.800); "son" = Kat 1 son kademe (2,8/8), "erk" = merdiven salonu dolunca.
- **Bot:** son kademe karakter, "en ucuz açık hedef önce", kirliyi masaya değince alır, tepsi boşken yıkamaya uğrar.

## §Bulgular (tam koşu)

**A · Plato** (bütün zincir açık, 3 garson, ocak 6, garson 4/4, lavabo L6 Kat 1 ücreti; 30 dk)

| kurulum | Sv | coin/dk | servis | kirli masa bekler | temiz fincan yok |
|---|---|---|---|---|---|
| bulaşık yok | 1 | **2.395** | %87 | — | — |
| Bk1 havuz Kat 1 kuralı | 1 | 2.222 | **%49** | %1 | **%60** |
| B masa başına fincan | 1 | 1.432 (−%40) | %94 | **%45** | %0 |
| B bulaşıkçı yok | 1 | 1.253 | %95 | %51 | %1 |
| B bulaşıkçı son kademe | 1 | 1.262 | %97 | %51 | %2 |
| B eşik 4 | 1 | 1.742 (−%27) | %89 | %32 | %19 |
| B eşik 4 + havuz ×1,5 | 1 | 1.506 | %96 | %44 | %1 |
| bulaşık yok | 5 | **3.354** | %86 | — | — |
| B masa başına fincan | 5 | 1.826 (−%46) | %96 | %52 | %1 |
| B eşik 4 | 5 | 2.252 (−%33) | %87 | %35 | %17 |

**B · İlerleme** (ilk çıkıştan: zincir → 88 masa Sv → yükseltmeler; Kat 1 65,9 coin/dk cüzdana)

| kol | ilk garson | **Kat 2 biter** | tabana göre | en uzun bekleyiş | servis | kirli masa | son saat Kat 2 coin/dk |
|---|---|---|---|---|---|---|---|
| TABAN (bugün) | 147 dk | **9,62 sa** | — | 11,0 dk | %69 | — | 1.727 |
| G-K1 | **22 dk** | 9,23 sa | −23 dk | 10,1 dk | %84 | — | 1.799 |
| G-UCUZ | 22 dk | 9,09 sa | −32 dk | 9,7 dk | %83 | — | 1.746 |
| G-ERKEN | 14 dk | 9,22 sa | −24 dk | 10,3 dk | %83 | — | 1.815 |
| G-GEC | 22 dk | 9,23 sa | −23 dk | 10,3 dk | %84 | — | 1.834 |
| G + LV½ | 22 dk | **6,62 sa** | −3,0 sa | 10,1 dk | %86 | — | 3.219 |
| G + LVy | 22 dk | 7,47 sa | −2,2 sa | 10,1 dk | %86 | — | 2.610 |
| G + LVK1 | 22 dk | 9,38 sa | −14 dk | 10,1 dk | %84 | — | 2.391 |
| G + LV½ + Bk1 | 23 dk | 7,44 sa | −2,2 sa | 12,2 dk | %56 | %5 | 3.062 |
| G + LV½ + B | 22 dk | 8,86 sa | −46 dk | 10,4 dk | %99 | %45 | 1.813 |
| G + LV½ + B son kademe | 22 dk | 9,07 sa | −33 dk | 10,0 dk | %98 | %46 | 1.576 |
| G + LV½ + B erken bulaşıkçı | 22 dk | 8,88 sa | −44 dk | 10,0 dk | %98 | %45 | 1.785 |
| G + LV½ + B eşik 4 | 22 dk | 8,26 sa | −1,4 sa | 10,1 dk | %92 | %34 | 2.150 |
| G + LV½ + B bulaşıkçısız | 22 dk | 9,37 sa | −15 dk | 11,3 dk | %99 | %49 | 1.700 |
| **G + LVy + B eşik 4** | 22 dk | **9,41 sa** | −13 dk | 10,2 dk | %90 | %34 | 1.645 |
| G + LVy + B eşik 4 + havuz ×1,5 | 22 dk | 9,94 sa | +19 dk | 10,7 dk | %99 | %45 | 1.537 |

Garson alım dakikaları (G-K1): 1. garson 22 · 2. garson 44 · 3. garson 133. Bulaşıkçı 77. dk. Lavabo L2-L6 (LV½): 164-262. dk;
LVK1'de L2 222. dk, L3-L6 542-563. dk (Sv'ler bitince, en son alımlar).

**Bulgu 1 · Garson pad'leri saf kazanç:** ilk garson 147. dk yerine 22. dk, servis %69 → %84, Kat 2 23 dk kısalıyor. Pad yeri ve
fiyat kolları arasındaki fark ±10 dk — yerden çok "erken garson" etkili. En uzun bekleyiş 11,0 → 10,1 dk.

**Bulgu 2 · Lavabo Kat 1 ücretiyle Kat 2'nin en büyük geliri olur:** dörtlü grupta kişi başı 86 coin, masa ücretini (38 × Sv)
geçiyor. Kat 2 3 saat kısalıyor, son saat gelir ×1,8. Ücret yarı hızda büyüyünce (LVy, 18 → 52) kısalma 2,2 sa. Kat 1 fiyatı
oranlanınca (LVK1) L3-L6 o kadar pahalı ki ancak en sonda alınıyor (geç oyunun son 20 dakikası lavabo).

**Bulgu 3 · Kat 1'in fincan havuzu Kat 2'ye yetmiyor:** Kat 1 kuralıyla (ocak başına 10) ocak zamanının %60'ında temiz fincan
yok, servis %87 → %49. Sebep yapısal: Kat 2'de fincan grubun ÖNÜNDE oyun boyunca durur (Kat 1'de müşteri içip kalkar). Masa
başına kişi kadar fincan bu sıkıntıyı kapatıyor (%0).

**Bulgu 4 · Bulaşığın asıl bedeli kirli masa:** havuz yetince masalar zamanın %45-52'sinde "kirli, grup oturmaz" bekliyor; plato
geliri −%40/−%46. Darboğaz fincan sayısı değil, TOPLAMA: havuzu ×1,5 büyütmek beklemeyi azaltmıyor, büyütüyor (%32 → %44,
Kat 2 +32 dk) — daha çok fincan masada birikiyor. Eşik 4 (masa ancak 4'ten fazla kirliyle kapanır) beklemeyi %34'e indiriyor.

**Bulgu 5 · Bulaşıkçının etkisi küçük, son kademesi ters:** bulaşıkçısız 9,37 sa → bulaşıkçılı 8,86 sa (−31 dk). Son kademe
(2,8 hız · 8 taşıma) tabandan KÖTÜ (9,07 sa): 8'i doldurmadan yıkamaya gitmiyor, topladığı fincan uzun süre elinde kalıyor.
Kat 1 bulaşıkçısı da aynı kuralla çalışıyor. Kirlilerin çoğunu oyuncu topluyor (~9-13 fincan/dk).

**Bulgu 6 · Birleşim:** garson pad'leri + lavabo yarım ücret + bulaşık eşik 4 → Kat 2 **9,41 sa** (bugün 9,62), servis %90, en uzun
bekleyiş 10,2 dk. Yani Kat 1'in üç işleyişi birlikte gelince toplam süre bugünküyle aynı yerde kalıyor: lavabonun kazandırdığını
bulaşık geri alıyor.

## Karar

(boş — karar paketi sonrası)
