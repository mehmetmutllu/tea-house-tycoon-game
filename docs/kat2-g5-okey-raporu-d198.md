# Kat 2 · G5 — okey masasının ilk dakikaları (D-198 ölçüm raporu)

Kaynak: oyun testi 2026-11-14 G5 (`docs/geribildirim-oyun-testi-2026-11-14.md`).
Kullanıcı: *"Okey masasına oturuyor. 1 dakika 2 dakika gitmiyor. Kahve servisi hemen gelmiyor. Ne yapacağımı bilmiyorum."*
Seçilen yön (2026-11-14): **tam paket** — oturunca hemen kahve · kahve parası anında · kısa oyun + düşük masa ücreti · ilk grup çabuk.

Araç: `tools/olcum-kat2-g5.ts` · ham çıktı: `docs/olcum-kat2-g5.txt` (`OLCUM=tam`, damgalar temiz).
Kod: `kat2Dongu` üç seçmeli ayar aldı (`ilkKahve` · `kahveAninda` · `ilkGelis`); verilmezse oyun bugünkünün AYNISI.
`economy.config.ts` değişmedi.

## Kollar

Her kolda masa ücreti, 4 okeyde ÖLÇÜLEN geliri tabanla (52,6 coin/dk/masa) eşit tutacak şekilde kalibre edildi:
"getiri düşer" yığın başına, dakika başına değil. Zincir fiyatları (SB9) bu gelire bağlı, o yüzden kaymaz.

| kol | oyun süresi | sonraki grup | ilk grup | ilk kahve | masa ücreti (bugün 72) |
|---|---|---|---|---|---|
| G0 taban | 180 sn | 15 sn | 15 sn | 25 sn sonra | 72 |
| G1 yalnız his | 180 sn | 15 sn | 3 sn | hemen | 62 |
| G2 | 90 sn | 10 sn | 3 sn | hemen | 38 |
| G3 | 60 sn | 8 sn | 3 sn | hemen | 28 |
| G4 | 45 sn | 6 sn | 3 sn | hemen | 18 |

G1–G4'te kahvenin parası teslim edildiği anda masanın önüne düşer (fincan 9 coin).

## §Bulgular (tam koşu)

**A · Varış** (Kat 2'ye ilk çıkış, hazır okey masası, son kademe oyuncu; ilk kademe oyuncuda aynı tablo ±1)

| kol | ilk kahve isteği | ilk para | ilk 3 dk para olayı | ilk 3 dk en uzun parasız aralık |
|---|---|---|---|---|
| G0 | 45 sn | **3 dk içinde yok** | **0** | **180 sn** |
| G1 | 8 sn | 9 sn | 7 | 26 sn |
| G2 | 8 sn | 9 sn | 8 | 26 sn (ilk kademe 37) |
| G3 | 8 sn | 9 sn | 7 | 33 sn |
| G4 | 8 sn | 9 sn | 10 | 26 sn |

**B · Durağan 4 okey** (ilk 4 dk sayılmaz)

| kol | coin/dk/masa | tabana göre | para olayları arası | yığın ort. | servis |
|---|---|---|---|---|---|
| G0 | 52,6 | — | 50 sn | 176 | %100 |
| G1 | 52,6 | %0 | 5,8 sn | 20 | %100 |
| G2 | 52,4 | %0 | 6,5 sn | 23 | %100 |
| G3 | 52,8 | %0 | 6,1 sn | 21 | %100 |
| G4 | 53,1 | +%1 | 5,1 sn | 18 | %100 |

Tek masada (varış hâli) G1 +%4 · G2 −%3 · G3 −%4 · G4 +%7 (bir masada kalkış anı denk gelişi; 4 masada eşit).

**C · Tavla 4 masa** — bayraklar tavlaya da işler (tavla sayıları değişmeden): G0 26,6 → G1 27,5 coin/dk/masa (+%3),
para olayları arası 34 → 7 sn.

### Okuma
1. Asıl sorun süre değil **ilk ödülün yokluğu**: bugün varıştan sonra 3 dakika boyunca tek para düşmüyor. Dört kolun hepsi
   bunu 9. saniyeye çekiyor — fark "hemen kahve + anında para"dan geliyor (G1 bile yetiyor).
2. Oyun süresini kısaltmak gelir için nötr (ücret kalibre), ama **masanın ne sıklıkla boşalıp dolduğunu** değiştirir:
   G4'te grup 45 sn oturur, okeyin "uzun oturan dörtlü" kimliği zayıflar; G1'de 3 dk oturur, kimlik aynı kalır.
3. Kat 1 hissi (çay → para, ~6-10 sn) G1–G4'ün hepsinde var: para olayları arası 5–7 sn (4 masada).

## Karar
_(boş — kullanıcı seçimi bekleniyor)_
