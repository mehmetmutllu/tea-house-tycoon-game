# K2-S2 — KAT 2 GARSONU: hız · tepsi · kaç garson

> Araç: `tools/olcum-kat2-garson.ts` → `docs/olcum-kat2-garson.txt` (tam koşu ~6 sn; damgalar temiz: bot yürüdü · garson yürüdü ·
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

| kol | ₺/dk | okey ₺/dk | tavla ₺/dk | okey servis % | tavla servis % | kaçan fincan | garson servis | garson meşgul | ocak boş | ocak dolu |
|---|---|---|---|---|---|---|---|---|---|---|
| garson yok | 555 | 278 | 277 | %39 | %55 | 280 | — | — | %0 | %12 |
| hız 2,0 · tepsi 2 · 1 garson | 589 | 313 | 276 | %57 | %52 | 239 | 75 | %99 | %1 | %3 |
| hız 2,0 · tepsi 4 · 1 garson | 584 | 309 | 275 | %55 | %50 | 252 | 78 | %99 | %1 | %6 |
| hız 3,0 · tepsi 2 · 1 garson | 582 | 302 | 280 | %51 | %60 | 245 | 106 | %95 | %2 | %3 |
| hız 3,0 · tepsi 4 · 1 garson | 589 | 306 | 283 | %56 | %68 | 214 | 118 | %95 | %2 | %2 |
| hız 2,0 · tepsi 2 · 2 garson | 593 | 309 | 284 | %54 | %69 | 226 | 118 | %89 | %6 | %3 |
| hız 2,0 · tepsi 4 · 2 garson | 584 | 295 | 286 | %51 | %72 | 229 | 128 | %89 | %4 | %3 |
| hız 3,0 · tepsi 2 · 2 garson | 591 | 302 | 289 | %53 | %79 | 208 | 159 | %89 | %9 | %1 |
| hız 3,0 · tepsi 4 · 2 garson | 591 | 302 | 289 | %53 | %79 | 208 | 159 | %89 | %9 | %1 |

### İlk kademe oyuncu

| kol | ₺/dk | okey ₺/dk | tavla ₺/dk | okey servis % | tavla servis % | kaçan fincan | garson servis | ocak dolu |
|---|---|---|---|---|---|---|---|---|
| garson yok | 436 | 249 | 268 | %22 | %28 | 368 | — | %55 |
| hız 2,0 · tepsi 2 · 1 garson | 556 | 277 | 275 | %42 | %50 | 283 | 86 | %19 |
| hız 2,0 · tepsi 4 · 1 garson | 558 | 277 | 278 | %42 | %57 | 274 | 101 | %15 |
| hız 3,0 · tepsi 2 · 1 garson | 561 | 276 | 282 | %41 | %67 | 258 | 123 | %10 |
| hız 3,0 · tepsi 4 · 1 garson | 561 | 267 | 284 | %36 | %69 | 263 | 126 | %11 |

- **Bulgu 1: garsonun parası tavladan değil, oyuncuyu serbest bırakmasından geliyor.** Tavla kahvesi 3 ₺ (T120U ücret ağırlıklı). Garson
  tavla servisini %55'ten %79'a çıkarsa bile tavla ₺/dk yalnız 277 → 289 oluyor. Asıl kazanç okeyde: oyuncu artık tavlaya koşmuyor,
  okey servisi %39 → %51-57. Son kademede toplam kazanç **+27…+38 ₺/dk (%5-7)**.
- **Bulgu 2: zayıf oyuncuda garson çok daha değerli: +120…+125 ₺/dk (%28).** Garsonsuz ilk kademe oyuncu yığınları bile toplayamıyor
  (masalara 517 ₺/dk düşüyor, 436'sı toplanıyor). Garson gelince yığınların hepsi toplanıyor.
- **Bulgu 3: hız ve sayı tavla servisini belirliyor, toplam parayı değil.** 1 yavaş garson tavlanın %52'sini, 2 hızlı garson %79'unu
  karşılıyor. Toplam ₺/dk ise bütün kollarda 582-593 arasında, çünkü **ocak darboğaz**: iki garson ocakta daha sık kahve bekliyor
  (ocak boş %6-9) ve oyuncunun okey kahvesini azaltıyor (okey servisi %57 → %53).
- **Bulgu 4: tepsi 4 neredeyse fark etmiyor.** Garson ihtiyaç kadar aldığı ve tavlada aynı anda nadiren 2'den fazla istek açık olduğu için
  tepsi 4 ile 2 aynı sonucu veriyor (2 hızlı garsonda kollar birebir aynı). 1 garsonda tepsi 4 hızlı garsona +7 pt tavla servisi kazandırıyor.
- **Bulgu 5: 2. ocak açıkken bile okey salonları kahve sıkıntısında.** Okey talebi 36 fincan/dk, iki ocak 30 pişiriyor. Garsonsuz oyuncu
  okeyin %39'unu getiriyor. Bu garsonun sorusu değil (ocak sayısı / pişme hızı), ama garson geldikçe görünür oluyor.

## §Kullanıcıya gidecek sorular (sade · öneri: en kaliteli)

1. **Tavla köşesinin garsonu ne kadar hızlı olsun?** Öneri: **Kat 1 garsonunun en hızlısından biraz hızlı (3,0).** Örnek: tavla köşesinde
   12 masada kahve istenirken yavaş garson (2,0) yarısına yetişiyor, hızlı garson üçte ikisine. Oyuncu yine okeyde koşturuyor.
   Hızlı garson daha çok iş görüyor ama oyuncunun yerine geçmiyor.
2. **Bir garson mu, iki garson mu?** Öneri: **önce bir garson, ikincisi sonra bir yükseltme olarak.** Örnek: iki garsonla tavla
   müşterilerinin beşte dördü kahvesini alıyor, birle üçte ikisi. Kasaya giren para hemen hemen aynı (591'e 589 ₺/dk), çünkü iki garson
   ocağın önünde sıra bekliyor. İkinci garson parayı değil köşenin "dolu ve canlı" görünmesini artırıyor. Bu yüzden ilerideki bir
   yükseltme olarak daha anlamlı.
3. **Garsonun tepsisi:** Öneri: **2 fincan.** Tavla müşterisi bir seferde tek fincan istiyor, 4'lük tepsi neredeyse hiç dolmuyor.
   Kat 1'deki tepsi yükseltmesinin bir karşılığı burada yok.
4. **(Bilgi, ayrı karar)** Zincirin sonunda iki ocak okey salonlarına bile yetmiyor (36 fincan istek, 30 pişiyor). Ocağın pişirme hızını
   artıran bir yükseltme ya da üçüncü bir ocak, zincir (K2-5) kararında konuşulmalı.

## §Karar

_(boş — S2 karar paketi)_
