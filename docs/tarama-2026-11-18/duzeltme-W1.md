# Tarama 2026-11-18 · Düzeltme W1 — kayıt / bulut / seviye ekranı

Kaynak bulgular: `2-kayit.md` #1-#5 · `1-kat2-mantik.md` #2, #3 (kayıt #4, #2 ile aynı kök) · `6-reklam-iap-derleme.md` #3.
Dokunulan dosyalar: `src/game/save.ts`, `src/game/bulut.ts`, `src/game/store.ts`. Yeni test: `tests/tarama-w1-kayit.test.ts` (13 test).
Denge sayısı değişmedi (`economy.config.ts` / `tick.ts` / `rules.ts` dokunulmadı). `saveVersion` artmadı (hepsi additive).

## Değişiklikler

| # | ne | nerede |
|---|---|---|
| kayıt #1 | **Kat 2 kat bazında birleşir.** `kat2IleriMi` (sıra: açık > pad sayısı > görev idx > Sv toplamı > yükseltme toplamı) + `kat2Koru(gelen, eldeki)`: gelen kaydın Kat 2'si gerideyse eldeki `kat2` + `kat` korunur. Bulut: `bulutlaBirlestir` sonucu `kat2Koru`dan geçer (1.0.7'nin yazdığı Kat 2'siz kayıt default Kat 2 olarak çözülür → geride sayılır). Yerel: ham kayıtta `kat2` anahtarı yoksa (1.0.x yazdı) öbür sağlam adaylardan (ana/yerel kopya, yedek.0-2) en ileri Kat 2 korunur. | `save.ts:323-350` · `save.ts:883-890` (`loadSave`) · `bulut.ts:197` |
| kayıt #2 / mantık #3 | **Kat 2 kısmi dolum kayda gider.** Disk tipi `Kat2KayitDisk = Kat2Kayit & { padFill? }` (canlı `Kat2Kayit` ve `kat.ts` değişmedi). `kayitVerisi` `kat2Dunya.padFill`i yazar; `init` `kat2DolumYukle` ile geri koyar: her anahtar BUGÜNKÜ fiyatına kelepçeli (`kismiDolum`, Kat 1 G-78 deseni) — sıradaki pad / Sv tetiği / ocak / lavabo tetiği; artık geçerli olmayan nokta düşer. `kayitDogrula` `sozluk(negatifsizSayiMi)` ile temizler (alan yoksa eklenmez). | `store.ts:310` · `store.ts:751-770` · `store.ts:1087` · `save.ts:683` |
| kayıt #4 / mantık #2 | **Kat 2'de yerdeki para kayıtta cüzdandadır** (K8/D-146 aynen): `kat2Dunya.paralar` toplamı yazılan `wallet` + `lifetime`a eklenir. `init` yığın üretmez → çift sayım yok (testte kaydet → yükle → kaydet aynı tutar). | `store.ts:254` |
| kayıt #3 | **Görev hattı yüklemede ödülsüz atlamaz.** `kat2Hizali`: hat kaydı VARSA yalnız `kat2GorevIlerlet` boş olayla koşar (canlı oyunla aynı; tutarlı kayıt değişmez). Hizalama yalnız hat kaydı OLMAYAN Kat 2'de: kat açılışında `gorev` yok ya da yüklenen ham kayıtta `kat2.gorev` anahtarı yok (S3 öncesi) — `save.ts` bunu `kat2GorevKaydiYok()` ile bildirir (veri katmanının "görev baştan" sözleşmesi korunur). | `store.ts:733-746` · `save.ts:790, 811-816, 880` |
| kayıt #5 | **Sürümü eksik/dizge/tanınmayan kayıt sessizce sıfırlanmaz:** göç zincirinden `resetKeepingSettings`e düşen kayıt `red: ['saveVersion']` → yedeğe düşülür; yedek yoksa karantina + `onarildi` notu. | `save.ts:708-723` |
| reklam #3 | **Tick dışı XP seviye ekranını açar, bir kez.** Yeni transient alan `xpBekleyen` (kayda yazılmaz, `init` 0). Panel alımları / hedef (`xpEkle`, 10 yer) ve Kat 2 görev / ocak / lavabo XP'si (`xpBekleyen: xp - c.xp`, kare sonu) onu artırır; sonraki karede `levelNoticeSystem`in kıyas tabanı (`c.s.xp`) bekleyen kadar geri alınır, `c.xp` aynı kalır → ekran tek hesapla (aynı ödül formülü, `tick.ts` dokunulmadı) çıkar, bekleyen sıfırlanır. Tick içi XP'nin yolu değişmedi; yükleme / bulut yüklemesi ekran doğurmaz. | `store.ts:473, 673-674, 1112, 1305` |

Not (gözlem, düzeltilmedi): Kat 2'de `kahveAninda: false` olsaydı masadaki `birikim` de kapanışta yanardı; bugünkü config `true`, kapsam dışı.

## Bekçi testleri — `tests/tarama-w1-kayit.test.ts`

1. Kat 2'siz (1.0.7 biçimi) DAHA İLERİ bulut kaydı yüklenir (lifetime 900000) ama yereldeki Kat 2 (pad'ler, görev idx, `kat: 2`) silinmez — gerçek `bulutBaslat` + sahte KVS.
2. Bulutun Kat 2'si ilerideyse bulutunki gelir; aynı pad sayısında Sv farkı ileri sayılır.
3. Yerel: ana kayıt Kat 2'siz, yedek.0 Kat 2'li → yedekteki Kat 2 korunur, not yok.
4. Kısmi dolum kaydet → yükle: pad 2743 geri gelir, Sv dolumu fiyata kelepçelenir, bilinmeyen / alınmış pad anahtarı düşer.
5. Doğrulama bozuk dolumu (−1, NaN, dizge) atar.
6. Kat 2 yerde 5.234 → kayıtta cüzdan 5.334, lifetime +5.234; yükle → yığın yok, cüzdan 5.334; yeniden kayıt da 5.334 (çift sayım yok).
7. `k2_kahve10` 7/10'dayken `k2garson` alınmış kayıt: kaydet → yükle görev `{idx, sayac:{servis:7}}` aynen.
8. Görev kaydı olmayan eski Kat 2 kaydı hâlâ hizalanır (`k2_grup5`).
9. `saveVersion: '34'` ve sürümsüz kayıt → `red` `saveVersion` içerir.
10. Bozuk sürümlü ana + sağlam yedek → yedekten (`yedekten`); yedek yok → `onarildi` + karantinada ham veri.
11. Kat 2 görev XP'si seviye 5→6 → ödül ekranı `level 6`; alındıktan sonra 20 karede yeniden çıkmaz.
12. Kat 1 panel alımı (`upgradeStation`) seviye atlatır → ekran; 20 kare sonra tutar aynı (çift tetik yok), `xpBekleyen` 0.
13. Yüklemede (kayıttaki yüksek XP) seviye ekranı doğmaz.

## Mutasyon sonuçları (her biri geçici uygulandı → test koştu → geri alındı)

| mutasyon | yakalayan test(ler) |
|---|---|
| 1a `bulutlaBirlestir` `kat2Koru`suz | 1, 2 |
| 1b `kat2IleriMi` karşılaştırması ters | 1, 2, 3 |
| 1c yerel `kat2Yok` dalı kapalı | 3 |
| 2a `kayitVerisi` padFill yazmaz | 4 |
| 2b `init` padFill geri koymaz | 4 |
| 2c fiyat kelepçesi yok | 4 |
| 4a Kat 2 yığınları sayılmaz | 6 |
| 4b yalnız ilk yığın sayılır | 6 |
| 3a her yüklemede hizala (eski davranış) | 7 |
| 3b eski kayıt işaretlenmez | 8 |
| 3c eski işaret yok sayılır | 8 |
| 5a `red.push('saveVersion')` yok | 9, 10 |
| 5b `surumYok` atanmaz | 9, 10 |
| 6a kıyas tabanı geri alınmaz | 11, 12 |
| 6b panel XP'si bekleyene yazılmaz | 12 |
| 6c Kat 2 XP'si bekleyene yazılmaz | 11 |
| 6d bekleyen sıfırlanmaz (çift tetik) | 11, 12 |

16/16 mutasyon yakalandı. Araç: scratchpad `w1/mut.py` (geçici).

## Tam koşu

`npx tsc --noEmit` temiz. `npx vitest run`: 121 dosya, 2228 test — **1 başarısız, W1 dışı**:
`tests/kat2-salon.test.ts` › "tavla masası … yığın = ücret + servis × tavla fiyatı" — yığın koordinatı beklenen
`(6.5, 3.45)`, gelen `(4.7, 2.5)`; eşzamanlı düzenlenen `kat.ts` / `kat2Dongu.ts` (yığın yeri / birleştirme) kaynaklı,
W1 dosyalarına dokunmuyor. Bu tur sırasında W1 kaynaklı iki kırılma (`kat2-altyapi` boş `padFill` alanı,
`kat2-masasv` eski kayıtta `gorev` beklentisi) çıktı ve düzeltildi.
