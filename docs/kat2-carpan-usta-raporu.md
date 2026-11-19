# Kat 2: hedef çarpanı + Usta + uzun görevleri bölme — ölçüm raporu (D-084 varyant kapısı · commit #1)

Araç: `tools/olcum-kat2-carpan-usta.ts` · ham çıktı: `docs/olcum-kat2-carpan-usta.txt` (OLCUM=tam, 23 koşu, damgalar temiz) ·
ara notlar: `docs/kat2-carpan-usta-notlar.md`. `src/**` ve `economy.config.ts` DEĞİŞMEDİ.

## Soru

Kullanıcı 2026-11-19 üç karara "evet" dedi. Formülü sayıları görüp seçecek:

- **(a)** Hedef koleksiyon çarpanı (`collectionMult`, D-090, tavanı +%10) Kat 2 gelirine de binsin mi? Bugün yalnızca Kat 1'deki müşteri ödemesine ve lavabo ücretine biniyor (`tick.ts` ~535 · ~606).
- **(b)** Usta Kat 2 masalarında da olsun (masa Sv5'e çıkınca 25 💎). Kat 2'de bahşiş yok, bu yüzden iki formül ölçüldü:
  - **U-UCRET:** Usta masanın ücret yığını × 1,5. Kahve parası çarpılmaz.
  - **U-ESIT:** Usta masanın bütün yığını (ücret + kahve), Kat 1'de Usta'nın tavandaki bir masaya kattığı yüzde kadar artar.
- **(c4)** Uzun pad görevleri bölünsün mü (tarama 2026-11-18 · 4-oynanış #7)?

## Yöntem

- **Başlangıç.** D-205 aracının `kur()`u birebir kullanıldı:
  - Kat 1 görev hattı sonu, karakter tavanda, seviye 12, Kat 2'ye ilk çıkış.
  - Hedeflerden Servis, Kazanç, Temizlik ve Mekân bitmiş.
  - Kat 1 masa senaryosu **U0** (tavanda masa yok) ve **U20** (20 masanın hepsi L4'te).
  - Bot D-205 botunun aynısı. Kat 2'nin bitişi = zincir + bütün masalar Sv5 + yükseltmeler.
- **Emülasyon (src'ye dokunmadan).**
  - `kat2Tick` dünyayı `paralar: d0.paralar.slice()` ile kopyalıyor. Array alt sınıfı `slice`/`filter` sırasında korunuyor (Symbol.species) ve yığın nesneleri paylaşılıyor.
  - Araç `kat2Dunya.paralar`ı `IzliParalar` ile sarıyor. Her yığının `miktar` alanını bir erişimciyle (setter) değiştiriyor.
  - Böylece `yiginaEkle`nin her eklemesi aracın kancasından geçiyor: yeni yığın `push` ile, var olan yığın `miktar +=` ile. Çarpan, paranın **yaratıldığı yerde** uygulanıyor; bu, commit #2'nin değiştireceği yerin aynısı.
- **Ücret / kahve ayrımı.** `kahveAninda: true` olduğu için kalkış yığınında `birikim` hep 0. Ücret tutarı birebir `masaUcreti × ucretCarpan[sv]`; kahve tutarı `n × kahveFiyat` ve ikisi çakışmıyor.
- **Görev bölme.** `C.kat2Gorevler` bellekte değiştirildi; store bu listeyi her karede okuyor.
- **Doğrulama (damgalar, hepsi temiz).**
  - **KORUNUM kolu:** kanca kurulu ama çarpan 1. Parmak izi ve bitiş TABAN ile birebir aynı.
  - Kanca korunumu: Σ çıkış = yığın değişimi + toplanan para.
  - Ücret sınıflaması = kalkış sayısı. Kalkış, kancadan bağımsız olarak masa durumu `oyunda → değil` geçişinden sayıldı.
  - U-UCRET bonusu = ½ × Usta masalarının kalkış ücreti (bağımsız toplam).
  - Her Usta Sv5 masada alındı; 💎 hiç eksiye düşmedi.
  - Bölünmüş hat `kat2GorevHatasi` = null.
  - Çevrimdışı kopya formülü = `kat2Oran`; tavanlı taban hesabı = `offlineEarnedSplit`.
  - Bütün kollarda varyant etkili.
- **💎 kuralı.**
  - Başta 100 💎, bütün kollarda aynı. Üstüne Kat 2 süresince hedeflerden gelen 💎 ve günlük 10 💎/gün oranlı eklendi.
  - Bot Kat 1 deseniyle alıyor (`tools/usta-kollari.ts`): uygun masa varsa ve 💎 yetiyorsa hemen alıyor, karede en fazla bir alım.
  - **·DOY** kolu = sınırsız 💎, Sv5 olan her masa anında Usta (üst sınır).
- **U-ESIT yüzdesi.** Kat 1 L4 masa, servis L6 için:

  ```
  p = tableTip(L4) × (tipMult − 1) / (fiyat karışımı(servis L6) + tableTip(L4))
    = 8 × 0,5 / (0,65×5 + 0,35×25 + 8) = 4 / 20 = +%20
  ```

  Servis ≤L4 iken +%30,8 olurdu; Kat 1 lavabo L6 da hesaba katılırsa +%5,9. Kat 1 Usta lavaboya binmediği için lavabo hariç tutuldu.

## §Bulgular

Kat 2 bitişi saat (sa) cinsinden. Tablo OLCUM=tam damgalı, hepsi `docs/olcum-kat2-carpan-usta.txt` dosyasından.

| kol | Kat 2 biter U0 | Δ% U0 | Kat 2 biter U20 | Δ% U20 | Kat 2 coin/dk U0 · U20 | Usta (💎 harcanan) U0 · U20 | not |
|---|---|---|---|---|---|---|---|
| TABAN | 7,91 | — | 8,34 | — | 1.370 · 1.355 | — | 4 görev >15 dk (U20: 5) |
| K2-CARPAN | 7,55 | **−4,5** | 7,94 | **−4,7** | 1.458 · 1.460 | — | yığın +%8,8 / +%10,0 |
| U-UCRET | 7,75 | −2,0 | 8,20 | −1,7 | 1.408 · 1.389 | 6 (150) · 4 (100) | ilk Usta 4,91 / 5,24 sa |
| U-ESIT | 7,82 | −1,2 | 8,26 | −0,9 | 1.389 · 1.372 | 6 (150) · 4 (100) | Usta masası +%20 |
| U-UCRET·DOY | 7,61 | −3,8 | 8,04 | −3,6 | 1.448 · 1.433 | 21 (525) | üst sınır |
| U-ESIT·DOY | 7,74 | −2,1 | 8,18 | −1,9 | 1.411 · 1.395 | 21 (525) | üst sınır |
| A+U-UCRET | 7,42 | **−6,2** | 7,81 | **−6,4** | 1.501 · 1.495 | 6 · 4 | |
| A+U-ESIT | 7,49 | **−5,4** | 7,88 | **−5,4** | 1.481 · 1.479 | 6 · 4 | |
| B-TAVLA | 7,87 | −0,6 | 8,31 | −0,4 | 1.374 · 1.355 | — | en uzun görev 54,7 dk (k2_tavla6) · ödül +2.400 |
| B-HEPSI | 7,73 | −2,3 | 8,30 | −0,5 | 1.392 · 1.374 | — | en uzun 31,1 / 33,6 dk · ödül +7.800 |
| B-UCLU | 7,72 | −2,4 | 8,20 | −1,7 | 1.407 · 1.383 | — | en uzun **19,6 / 21,7 dk** · ödül +12.300 |

**Görevler (§4).** TABAN'da 15 dk'yı aşan görevler (U0):

| görev | süre (dk) | not |
|---|---|---|
| k2_s2okey6 | 37,9 | 4 pad. Taramadaki "k2_garson3 öncesi 38 dk" bu görev. |
| k2_tavla1 | 17,1 | Tek pad (13.600), bölünemez. |
| k2_tavla6 | 54,7 | 5 pad |
| k2_tavla12 | 59,6 | 6 pad |
| k2_s2okey2 | U20'de 16,1 | 2 pad |

Bölme kolları:

- **B-HEPSI:** bu dört çok pad'li görevi ikiye böler. Araya giren görevler `k2_s2okey1` · `k2_s2okey4` · `k2_tavla4` · `k2_tavla9`. Tavla yarıları hâlâ 25–34 dk sürüyor.
- **B-UCLU:** tavla görevlerini üçe böler (`k2_tavla3/5` · `k2_tavla8/10`). Bütün tavla görevleri 15,6–21,7 dk aralığına iniyor.
- **15 dk'yı aşan görev sayısı** böldükçe ARTIYOR: TABAN 4 → B-HEPSI 7 → B-UCLU 9. Sebep, uzun görevin parçalarının da 15 dk'yı geçmesi. Okunacak ölçüt **en uzun görev süresi**: 59,6 → 31,1 → 19,6 dk.
- **Tavla pad'leri tek başına ~9–10 dk sürüyor.** Bütün görevleri 15 dk altına indirmek ancak tek pad'lik görevlerle mümkün (+11 görev); bu ölçülmedi.

**Ödül kuralı.** Her ara görevin ödülü = referans pad × %15, 50'ye yuvarlı:

| ara görev | ödül |
|---|---|
| k2_s2okey1 | 1.500 |
| k2_s2okey4 | 1.750 |
| k2_tavla3 | 2.100 |
| k2_tavla4 | 2.150 |
| k2_tavla5 | 2.200 |
| k2_tavla8 | 2.350 |
| k2_tavla9 | 2.400 |
| k2_tavla10 | 2.400 |

Görev ödülü toplamı: 36.900 → 39.300 (B-TAVLA) / 44.700 (B-HEPSI) / 49.200 (B-UCLU). Bölme kollarında bitişi kısaltan şey tamamen bu ek ödüller.

**Çevrimdışı (§3).** Kat 2 bittiğinde `kat2Oran` 2.888 coin/dk. Kollara göre değişim:

| kol | çevrimdışı Kat 2 oranı |
|---|---|
| K2-CARPAN | ×1,10 → 3.177 |
| U-UCRET (6 Usta) | +%8,5 |
| U-ESIT (6 Usta) | +%4,8 |
| A+U-ESIT | +%15,3 |

Ama Kat 1 payıyla birlikte 1 saatlik ham tutar 409k–453k, para tavanı ise 19.205. Tavan ~170 sn'de doluyor, yani **bütün kollarda ödenen çevrimdışı tutar aynı kalıyor**. `kat2Oran`a çarpan/Usta eklemek bugün ödemeyi değiştirmez; yalnızca D-090'ın "kapatarak bonus kaybetme" tutarlılığı içindir.

**Kat 1 etkisi.** Kat 1'in arka plan geliri bütün kollarda TABAN'ın ±%3'ü içinde: U0'da 816 → 822–842, U20'de 722 → 712–730. Kollar Kat 1'e dokunmuyor; fark yalnızca zamanlama gürültüsü.

**Usta'nın gücü ve 💎 rekabeti.**

- **Usta başına Kat 2 kazancı.** U0'da Usta başına ≈ **40 coin/dk** (U-UCRET: 27.279 bonus / ~674 Usta-dk) veya ≈ **21 coin/dk** (U-ESIT: 14.326 / ~691).
- **Kat 1 Usta karşılaştırması.** Oyuncu Kat 2'deyken Kat 1 Usta'sının getirisi ≤ ~7 coin/dk. Masa başı arka plan payı ~36 coin/dk, bunun en fazla %20'si.
- **Botun Kat 2'yi seçmesi rasyonel.** Ama talep 41 hedef × 25 = 1.025 💎. Arz ise 250 hedef 💎 + 10 💎/gün. Hedef 💎'larını Kat 1 Usta'ya harcamış bir oyuncu Kat 2'ye ~0 💎 ile gelir. Gerçekçi bütçe 100 💎 ile U20'de 4, U0'da 6 Usta alındı.
- **U-UCRET Kat 1'den cömert.** Sv5 okey masasının yığınının ~%67'si ücret, bu yüzden ×1,5 ücret masa gelirini ≈ **+%33** artırıyor. Kat 1 Usta'sı aynı masaya +%20 getiriyor. U-ESIT Kat 1 vaadinin ("Usta masası +%20") birebir aynısı.

## Takaslar

- **K2-CARPAN.** Kat 2'yi tek başına %4,5–4,7 kısaltıyor. Karşılığında D-090'ın kuralı ("çarpan ₺'nin yaratıldığı yerde") iki katta tutarlı oluyor. Hedef ekranındaki "+%10 gelir" Kat 2'de de doğru hâle geliyor; bugün oyuncuya Kat 2'de yalan söylüyor.
- **U-UCRET mi U-ESIT mi?**
  - U-UCRET daha güçlü: −2,0 / −1,7; doygunda −3,8.
  - Ama Kat 1'den farklı bir sözü var: +%33 ve "kahve hariç". Usta modalında açıklaması zor.
  - U-ESIT Kat 1 ile aynı yüzdeyi veriyor (+%20, tek cümle). Zinciri neredeyse yemiyor: −1,2 / −0,9; doygunda −2,1.
- **A+U bileşimi.**
  - A+U-UCRET −6,2 / −6,4. Ödüllü video turunun %7 eleme eşiğine (D-150) yakın.
  - A+U-ESIT −5,4. Eşiğin rahat altında.
- **Görev bölme.**
  - B-TAVLA neredeyse etkisiz: k2_tavla6 54,7 dk kalıyor.
  - B-HEPSI en uzun görevi yarıya indiriyor ama 30 dk'lık tek bantlar bırakıyor.
  - B-UCLU en uzun görevi 19,6–21,7 dk'ya indiriyor. Bedeli +12.300 coin ödül ve Kat 2'de −2,4 / −1,7.
  - Bölmenin para etkisi K2-CARPAN ile birleşince toplanır (ayrı ölçülmedi). Kabaca A+U-ESIT + B-UCLU ≈ −7–8.

## Öneri

En kaliteli seçim: **K2-CARPAN + U-ESIT (A+U-ESIT, −%5,4) + B-UCLU.**

- **Çarpan:** hedef ekranının vaadini Kat 2'de de doğru kılar.
- **U-ESIT:** Usta'nın Kat 1'deki sözünü ("bu masa +%20 kazanır") aynen taşır. Kat 2 = Kat 1 uyarlaması kuralına uyar ve tek sayıyla anlatılır.
- **B-UCLU:** 60 dk'lık tek bantları ≤22 dk'ya indiren tek kol.

Birleşik etki ölçülmedi: Kat 2 ~7,9 → ~7,3 sa civarı beklenir. Final tam koşuda ölçülmeli.

## Karar

## Uygulama planı (commit #2 — seçilen kola göre)

1. **`src/game/kat2Dongu.ts`**
   - `Kat2Girdi`ye iki alan eklenir:
     - `gelirCarpan?: number` (varsayılan 1)
     - `ustaMasalar?: readonly string[]`
   - Kalkış yığını (~1133): `miktar = (ücret + birikim) × gelirCarpan × usta(m.id)`.
   - `kahveOde` (U-ESIT'te Usta çarpanı burada da) ve `lavaboyaUgra` (~574, yalnızca `gelirCarpan`) da aynı çarpanları alır.
   - Varsayılanlar 1 olduğu için taban birebir korunur.
2. **`src/game/store.ts`**
   - İki `kat2Tick` çağrısına (Kat 2'deyken ~1205, Kat 1'deyken arka plan) `gelirCarpan: c.incomeMult` ve `mastersOwned` içindeki `k2:` önekli kimlikler verilir.
   - `ustaAcilabilir`: `k2:<masaId>` = masa açık **ve** `masaSvOku ≥ KAT2_SV_MAX`.
   - `buyMaster` ve `buyMasterAd` değişmez.
3. **`src/game/rules.ts`**
   - `kat2Oran(padsDone, masaSv, yuk, mult = 1, ustaMasalar = [])`.
   - `cevrimdisiGelir` aynı parametreleri geçirir (D-090 tutarlılığı; bugün tavan bağladığı için ödeme değişmez).
   - Yeni `kat2UstaCarpan()` = yukarıdaki türetme (+%20). Sayı koda gömülmez, `master.tipMult` ve `tables.tipBase` alanlarından türetilir.
4. **`src/config/economy.config.ts`**
   - `kat2Gorevler`e B-UCLU'nun 8 ara görevi eklenir (ödüller yukarıdaki tabloda).
   - Ödül referansına dokunulmaz.
5. **Görsel.**
   - `src/components/three/kat2/SvIsaret.tsx`: Sv5'te Sv çerçevesi kayboluyor. Aynı yerde Kat 1 `TableMasterSpots` (`Scene.tsx` ~757) uyarlaması bir Kat 2 Usta noktası doğar. Kat 1 D8 kuralı: "tavanda işaret kaybolmaz, 💎 kimliğiyle devralır". Durunca dolar, modal açılır (G-79 kenar tetiği).
   - `HUD.tsx` `UstaModal` (~1198): Kat 2 kimliğinde metin "×1,5 bahşiş" yerine "+%20 masa geliri" olur (TR + EN, mikrometin ChatGPT'ye danışılır).
   - Künye sayacı (`HUD.tsx` ~1552, bugün `table:` süzgeci) `k2:` kimliklerini de saymalı. `basarim.ts` ve `audioBridge` zaten bütün listeyi sayıyor.
6. **Kayıt.**
   - `mastersOwned` additive kimlik listesi olarak kalır. `save.ts` `metinKumesi` her metni kabul ediyor → `'k2:<masaId>'` yüklemede korunur.
   - **saveVersion gerekmez** (D-093 deseni: yalnızca kimlik eklenir, çarpan ondan türer).
7. **Bekçi testleri** (`tests/kat2-usta.test.ts` + `kat2-gorev`):
   - `kat2Tick` `gelirCarpan` 1,1 ile ücret, kahve ve lavabo yığınlarını ×1,1 yapıyor mu?
   - Görev ödülü çarpılmıyor mu?
   - Usta olan Sv5 masada yığın ×1,2, Usta olmayan masada ×1 mi? Lavabo Usta'dan etkilenmiyor mu?
   - `buyMaster('k2:x')` Sv4 masada reddediliyor mu?
   - `kat2Oran(mult)` = ×mult mi?
   - Hat `kat2GorevHatasi` = null mu? Ara görev ödülleri %15/50 kuralına uyuyor mu?
   - **Mutasyonlar:** 1133'teki çarpanı silmek · Usta'yı lavaboya uygulamak · Sv eşiğini gevşetmek · `kahveOde`dan Usta'yı silmek.
   - **Final:** `OLCUM=tam` koşusu bu araçla (TABAN bitişi = seçilen kolun bu rapordaki bitişi ± %3).

## Araç mutasyonları (MUT=)

Dört mutasyonun dördü de beklenen damgayı kırdı.

| mutasyon | koşu | kırılan damgalar |
|---|---|---|
| `carpan1` | kısa | "K2-CARPAN bonusu > 0" ve "varyant etkili (K2-CARPAN)" |
| `kahve` | tam · TABAN + U-UCRET · U0 | "U-UCRET bonusu = ½ × Usta masası kalkış ücreti" (34.573 ≠ 27.017) |
| `sv4` | tam · TABAN + U-UCRET · U0 | "her Usta Sv5 masada" (k2okey1-4 Sv4'te alındı) |
| `gorev` | tam · TABAN + B-TAVLA · U0 | "hat uzunluğu = 24" (23) ve "varyant etkili (B-TAVLA)" |
