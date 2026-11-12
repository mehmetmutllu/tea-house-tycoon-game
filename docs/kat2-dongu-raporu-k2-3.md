# K2-3 — KAT 2 DÖNGÜSÜ: okey masası + Türk kahvesi + cezve ocağı

> Araç: `tools/olcum-kat2-dongu.ts` → `docs/olcum-kat2-dongu.txt` (tam koşu, damgalar temiz).
> Mantık: `src/game/kat2Dongu.ts` (saf modül, sayılar `Kat2Ayar` ile dışarıdan). Commit #1 denge dosyasına dokunmadı.

## §0 Soru

Kat 2'nin döngüsü kat2-plan §2'de anlatıldı. Dörtlü grup okey masasına oturur, oyun sürerken ara ara Türk
kahvesi ister, kalkarken masa ücretini ve içtiği kahvelerin parasını **tek yığın** olarak bırakır ("seyrek ama
büyük para"). Soru şu: **oyun ne kadar sürsün, kahve ne sıklıkla ve ne ağırlıkta istensin?** Bu bir HİS
sorusu. ₺ düzeyi K2-5'te zincirle birlikte ölçülecek.

## §Yöntem

- `kat2Tick`i bir bot sürdü (20 dk, ilk 4 dk ısınma sayılmadı, dt 0,1). Botun önceliği sırasıyla:
  para yığınını toplamak, tepside kahve varsa sabrı en az kalan masaya götürmek, yoksa ocağın önünde beklemek.
- Masalar merdiven salonunun dört okey yeri (maket B). Pad'ler bu ölçümde yok: masalar ve ocak baştan açık,
  döngüler eşit aralıkla kaydırılmış (gerçekte pad'ler ayrı anlarda açılır).
- **Normalizasyon:** her kolun fiyatları aynı teorik tavana (her istek servis edilirse 54 ₺/dk/masa) çekildi.
  Kollar yalnız döngünün BİÇİMİNDE ayrışıyor.
- Ortak sabitler: grup 15 sn'de gelir, 5 sn'de oturur, kahve sabrı 25 sn, cezve 4 sn/fincan, ocakta 4 hazır.
- İki oyuncu: son kademe (hız 4,95 · tepsi 6 · mıknatıs 5) ve ilk kademe (4,5 · 2 · 2,6).
- Damgalar: bot yürüdü · ₺ korunumu (düşen = toplanan + yerde kalan) · varyant etkili. Hepsi temiz.

## §Bulgular

Son kademe oyuncu, 4 masa (ham çıktı 1 ve 2 masayı da içerir):

| kol | biçim | ücret / kahve ₺ | ₺/dk | yığın ort ₺ | yığın aralığı | servis % | meşgul |
|---|---|---|---|---|---|---|---|
| **V0** | 3 dk oyun · 40 sn'de 2 kahve · gelirin %60'ı kahve | 68 / 14 | 189 | 159 | 50 sn | %100 | %29 |
| V1 | KISA oyun 90 sn | 39 / 30 | 217 | 99 | 28 sn | %100 | %27 |
| V2 | UZUN oyun 300 sn | 120 / 12 | 182 | 264 | 80 sn | %100 | %26 |
| V3 | ÜCRET ağır: gelirin %20'si kahve | 140 / 5 | 205 | 173 | 50 sn | %100 | %29 |
| V4 | SIK kahve: 25 sn'de 2 fincan | 72 / 9 | 208 | 175 | 50 sn | %100 | %41 |
| V5 | SEYREK kahve: 60 sn'de 1 fincan | 72 / 54 | 214 | 180 | 50 sn | %100 | %22 |

İlk kademe oyuncu, 4 masa: servis yine her kolda %100. Meşguliyet V0 %32 · V1 %33 · V2 %37 · V3 %32 ·
**V4 %54** · V5 %25.

Tek masa (Kat 2'nin ilk dakikaları): ilk yığın V0/V3/V4/V5'te 200 sn'de bir, V1'de 110 sn'de, V2'de 320 sn'de bir düşüyor.

**Bulgu 1 — kahve sabrı bağlamıyor.** 6 kol × 2 oyuncu × 4 masanın hepsinde servis %100, kaçan 0. Ocak
masanın dibinde ve tek oyuncu dört masaya rahat yetişiyor. Kahvenin oyuna kattığı şey kayıp riski değil,
**iş**: oyuncuyu yürütüyor.

**Bulgu 2 — kolları ayıran meşguliyet.** Oyuncunun boşta kalmadığı süre seyrek kahvede (V5) %22, sık kahvede
(V4) %41. İlk kademe oyuncuda bu fark %25'e karşı %54. Kat 2'deyken Kat 1 de arkada işliyor (K2-4), yani boş
zaman "aşağı inip Kat 1'i toplama" zamanı da olabilir.

**Bulgu 3 — oyun süresi = bekleme süresi.** V2'de (5 dk) yığın büyük (264 ₺) ama Kat 2'nin ilk masası açılınca
ilk para 5 dk 20 sn sonra geliyor. V1'de (90 sn) yığın 99 ₺ ve 28 sn'de bir düşüyor. Bu Kat 1'in "sık küçük
para" hissine yakın, yani planın "seyrek + büyük" farkı kayboluyor.

**Bulgu 4 — normalize tavan ölçülenden düşük.** V0'da 189, tavan 216. Sebep kaçan kahve değil, gecikmiş
servis: istek sayacı servis gelince yeniden başlıyor, böylece oturum başına istek azalıyor. Kahvesi ağır
kolda (V0) bu fark ₺'ye yansıyor, ücreti ağır kolda (V3) yansımıyor.

Kıyas: Kat 1 geç oyun 127-144 ₺/dk (garsonlu, 20 masa; `olcum-izdiham-t6.txt`). Bütün kolların 4 masada
verdiği ~180-217 ₺/dk normalizasyondan geliyor. Bu bir hedef değil, K2-5'te zincirle ayarlanacak.

## §Karar

**D-184 (2026-11-13) — kullanıcı üç soruda da öneriyi seçti → kol V4:** oyun 3 dk · 25 sn'de 2 fincan · gelirin %60'ı
kahveden → `economy.config.kat2`: ücret 72 ₺ · kahve 9 ₺ (diğer sabitler §Yöntem'deki gibi).

- Final tam koşu `docs/olcum-kat2-dongu-final.txt`: config = V4 damgası temiz. 4 masada 208 ₺/dk · yığın ort 175 ₺ ·
  50 sn'de bir · servis %100 · meşgul %41 (ilk kademe oyuncuda %54). Taban koşusundan tek fark servis 218 → 220:
  durum geçişleri artık taşan kesri koruyor (bekçi testi dt hassasiyetini yakaladı).
- Pad zinciri okey1 → cezve → okey2 → okey3 → okey4. Fiyatlar (500 / 800 / 1.500 / 2.500 / 4.000) **TASLAK, ölçülmedi**:
  K2-5'te zincirle birlikte ölçülecek.
- Bekçi `tests/kat2-dongu.test.ts`: 16 test, mutasyon 6/6 yakalandı.
