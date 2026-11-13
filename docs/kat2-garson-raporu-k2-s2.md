# K2-S2 — KAT 2 GARSONU: hız · tepsi · kaç garson

> Araç: `tools/olcum-kat2-garson.ts` → `docs/olcum-kat2-garson.txt` (tam koşu ~6 sn; damgalar temiz: bot yürüdü · bot takılmadı · garson yürüdü ·
> ₺ korunumu · kalkış = yığın · varyant etkili · zincir yapısı tutarlı). Mantık: `src/game/kat2Dongu.ts` (garson) + `src/game/kat.ts`
> (`OCAKLAR`, `KAT2_GARSON_PAD`, yol ağı). `economy.config.ts`te garson sayısı YOK (`Kat2Ayar.garson` opsiyonel; yoksa garson gelmez).
> Okey davranışı birebir: `OLCUM=tam npx tsx tools/olcum-kat2-dongu.ts | diff - docs/olcum-kat2-dongu-final.txt` boş.

## §Soru

D-186: tavla köşesi açılınca **Kat 2 garsonu** gelir. Yalnız kahve taşır, yalnız tavla masalarına. Oyuncu okeye kahve taşır ve bütün
para yığınlarını toplar (oto-toplayıcı yok). Garsonun hızı ne olsun, tepsisi kaç fincan alsın, bir garson mu iki garson mu?

## §Kollar

- **Bütün zincir açık:** 22 masa (10 okey + 12 tavla), iki cezve ocağı, garson pad'i. Tavla T120U (config). Süre 20 dk, ilk 4 dk sayılmaz.
- **Hız** Kat 1 garsonundan türetildi. Kat 1'in son kademesi **2,0** ve onun 1,5 katı **3,0**. İkisi de oyuncunun tabanından (4,5) yavaş:
  garson yardımcıdır, oyuncunun yerini almaz (D-014).
- **Tepsi** Kat 1'in tabanı **2** ve tavanı **4**. **Garson sayısı** 1 / 2. Toplam 8 kol, artı **"garson yok"** (oyuncu her şeyi yapar).
- Oyuncu: son kademe (hız 4,95 · tepsi 6 · mıknatıs 5) ve ilk kademe (4,5 · 2 · 2,6; yalnız 1 garsonlu kollar).
- Bot ve garson aynı yol ağıyla yürür: bölmeler katı, salonlar arası yalnız geçitten, masa ve ocak gövdeleri katı. K2-3c'deki bot masaların
  içinden geçiyordu, bu yüzden sayılar o raporla bire bir karşılaştırılamaz.
- Garson kuralı: tepsi boşsa ve karşılanmamış tavla isteği varsa en yakın ocağa gider, **ihtiyaç kadar** alır (tepsiyi doldurup oyuncunun
  kahvesini tüketmez). Sonra sabrı en az kalan tavla masasına götürür. İş yoksa evine (pad'in yeri) döner. Aynı anda oyuncu ve garson
  ocaktaysa önce oyuncu alır.

## §Bulgular

Teorik kahve talebi: okey 36,0 + tavla 20,6 fincan/dk. İki ocağın tavanı 30 fincan/dk. Yani zincirin sonunda **ocak, okey salonlarına bile
tek başına yetmiyor**.

### Son kademe oyuncu (₺/dk = toplanan · servis % = getirilen ÷ istenen)

> Tam koşu S2 kapanışı (2026-11-13), yol ağı düzeltmesinden sonra: ızgara görüşü kapı pervazındaki yürüyeni "açık" sayıyordu,
> bot/garson duvara itip kalıyordu (ilk ölçümde iki kolda ₺/dk 0, garsonsuz kolda da gizli takılma). Araca "bot takılmadı" damgası
> eklendi (≥ 10 sn kesintisiz itme kırar). Eski tablo git'te; aşağıdaki sayılar düzeltilmiş ağla.

| kol | ₺/dk | okey ₺/dk | tavla ₺/dk | okey servis % | tavla servis % | kaçan fincan | garson servis | garson meşgul | ocak boş | ocak dolu |
|---|---|---|---|---|---|---|---|---|---|---|
| garson yok | 550 | 273 | 277 | %41 | %55 | 278 | — | — | %0 | %11 |
| hız 2,0 · tepsi 2 · 1 garson | 594 | 313 | 278 | %58 | %56 | 233 | 88 | %98 | %1 | %5 |
| hız 2,0 · tepsi 4 · 1 garson | 591 | 314 | 277 | %56 | %53 | 248 | 90 | %99 | %2 | %4 |
| hız 3,0 · tepsi 2 · 1 garson | 589 | 307 | 282 | %53 | %68 | 226 | 118 | %96 | %2 | %2 |
| hız 3,0 · tepsi 4 · 1 garson | 586 | 304 | 282 | %54 | %65 | 234 | 116 | %96 | %2 | %3 |
| hız 2,0 · tepsi 2 · 2 garson | 597 | 305 | 284 | %56 | %71 | 212 | 130 | %92 | %5 | %2 |
| hız 2,0 · tepsi 4 · 2 garson | 597 | 305 | 284 | %56 | %71 | 212 | 130 | %91 | %5 | %2 |
| hız 3,0 · tepsi 2 · 2 garson | 584 | 290 | 290 | %47 | %83 | 214 | 168 | %89 | %7 | %2 |
| hız 3,0 · tepsi 4 · 2 garson | 584 | 290 | 290 | %47 | %83 | 214 | 168 | %89 | %7 | %2 |

### İlk kademe oyuncu

| kol | ₺/dk | okey ₺/dk | tavla ₺/dk | okey servis % | tavla servis % | kaçan fincan | garson servis | ocak dolu |
|---|---|---|---|---|---|---|---|---|
| garson yok | 527 | 250 | 272 | %26 | %39 | 339 | — | %39 |
| hız 2,0 · tepsi 2 · 1 garson | 569 | 283 | 278 | %43 | %56 | 273 | 99 | %16 |
| hız 2,0 · tepsi 4 · 1 garson | 565 | 282 | 280 | %44 | %61 | 262 | 106 | %13 |
| hız 3,0 · tepsi 2 · 1 garson | 564 | 278 | 282 | %42 | %69 | 252 | 123 | %10 |
| hız 3,0 · tepsi 4 · 1 garson | 566 | 277 | 285 | %43 | %72 | 242 | 137 | %10 |

- **Bulgu 1: garsonun parası tavladan değil, oyuncuyu serbest bırakmasından geliyor.** Tavla kahvesi 3 ₺ (T120U ücret ağırlıklı). Garson
  tavla servisini %55'ten %83'e çıkarsa bile tavla ₺/dk yalnız 277 → 290. Asıl kazanç okeyde: oyuncu tavlaya koşmuyor, okey servisi
  %41 → %53-58 (1 garson). Son kademede toplam kazanç **+34…+47 ₺/dk (%6-9)**.
- **Bulgu 2: zayıf oyuncuda da kazanç benzer: +37…+42 ₺/dk (%7-8).** İlk ölçümdeki "+%28" takılan botun eseriydi (garsonsuz bot da
  pervazda itiyordu); düzeltilmiş ağla garsonsuz ilk kademe de yığınların hepsini topluyor. Garsonun zayıf oyuncuya asıl katkısı
  tavla servisi: %39 → %56-72.
- **Bulgu 3: hız ve sayı tavla servisini belirliyor, toplam parayı değil.** 1 yavaş garson tavlanın %56'sını, 1 hızlı %68'ini, 2 hızlı
  %83'ünü karşılıyor. Toplam ₺/dk bütün kollarda 584-597, çünkü **ocak darboğaz**: iki hızlı garson ocakta daha sık bekliyor (ocak boş
  %7) ve oyuncunun okey kahvesini azaltıyor (okey servisi %58 → %47; toplam 594 → 584).
- **Bulgu 4: tepsi 4 hiçbir kolda kazandırmıyor.** Garson ihtiyaç kadar alıyor, tavlada aynı anda nadiren 2'den fazla istek açık:
  2 garsonda tepsi 2 ile 4 birebir aynı, 1 hızlı garsonda tepsi 4 %68 → %65 (gürültü).
- **Bulgu 5: 2. ocak açıkken bile okey salonları kahve sıkıntısında.** Okey talebi 36 fincan/dk, iki ocak 30 pişiriyor. Garsonsuz oyuncu
  okeyin %41'ini getiriyor. Bu garsonun sorusu değil (ocak sayısı / pişme hızı), ama garson geldikçe görünür oluyor.

## §Kullanıcıya gidecek sorular (sade · öneri: en kaliteli)

1. **Tavla köşesinin garsonu ne kadar hızlı olsun?** Öneri: **Kat 1 garsonunun en hızlısından biraz hızlı (3,0).** Örnek: tavla köşesinde
   12 masada kahve istenirken yavaş garson (2,0) yarısından biraz fazlasına yetişiyor, hızlı garson üçte ikisine. Oyuncu yine okeyde koşturuyor.
   Hızlı garson daha çok iş görüyor ama oyuncunun yerine geçmiyor.
2. **Bir garson mu, iki garson mu?** Öneri: **önce bir garson, ikincisi sonra bir yükseltme olarak.** Örnek: iki garsonla tavla
   müşterilerinin beşte dördü kahvesini alıyor, birle üçte ikisi. Kasaya giren para hemen hemen aynı (584'e 589 ₺/dk), çünkü iki garson
   ocağın önünde sıra bekliyor. İkinci garson parayı değil köşenin "dolu ve canlı" görünmesini artırıyor. Bu yüzden ilerideki bir
   yükseltme olarak daha anlamlı.
3. **Garsonun tepsisi:** Öneri: **2 fincan.** Tavla müşterisi bir seferde tek fincan istiyor, 4'lük tepsi neredeyse hiç dolmuyor.
   Kat 1'deki tepsi yükseltmesinin bir karşılığı burada yok.
4. **(Bilgi, ayrı karar)** Zincirin sonunda iki ocak okey salonlarına bile yetmiyor (36 fincan istek, 30 pişiyor). Ocağın pişirme hızını
   artıran bir yükseltme ya da üçüncü bir ocak, zincir (K2-5) kararında konuşulmalı.

## §Karar

_(boş — S2 karar paketi)_
