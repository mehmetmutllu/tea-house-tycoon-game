# Tarama 1 — Kat 2 oyun mantığı (2026-11-18)

Kapsam: `kat2Dongu.ts` · `kat.ts` (yol ağı) · `kat2Gorev.ts` · `store.ts` (Kat 2 dalları + kayıt) · `tick.ts` (Kat 2 kapıları) ·
`kasa.ts` · `rules.ts` (çevrimdışı) · `economy.config.kat2` · `kat2/yol.ts` · `kat2/masaSv.ts`. Taban `main` @ 8bfc8ba.
Kod değiştirilmedi. Kanıt betikleri (vitest, `--dir` ile koşulur):
`C:\Users\MEHMET~1\AppData\Local\Temp\claude\5a746b45b37b7b61\4c613c20-4a0b-4fa3-b1a0-232531579c18\scratchpad\t1\` (`r1`…`r5.test.ts`).

## Bulgular (doğrulandı)

| # | önem | dosya:satır | bulgu | nasıl tetiklenir (somut) | kanıt | önerilen düzeltme |
|---|---|---|---|---|---|---|
| 1 | **yüksek** | `kat2Dongu.ts:686` (`garsonMasaNoktasi`), `:701/:719/:730/:810/:820` (kullanımlar), `kat.ts:697-700` (`nokta` → `enYakin`) | **Garson ve bulaşıkçı bazı tavla masalarına HİÇ ulaşamıyor, olduğu yerde takılıyor.** Yaklaşma noktası masanın +z önü (`z + 0,6 + 0,47 + 0,13`); tavla sıraları 2,4 aralıklı → iki sıra arasındaki serbest şerit 1,2 − 2×0,47 = **0,26 br**, yol ızgarası hücresi 0,30. Hedef hücre kapalı, `enYakin` en yakın açık hücreyi seçiyor; dış sütunda bu hücre duvar dibindeki (x 14,95) şerit, uzaklık alanı orada 0 → `nokta()` aktörün kendi yerini döndürüyor, aktör kımıldamıyor. O noktada `masaErisimde` dx = 1,95 > 1,9 (tavla erişimi) → servis/toplama da olmuyor. | Tam zincir, yalnız 1 garson, tek istek `k2tavla9` (ya da 10/11): garson (14,95; 8,64)'te durur, 120 sn'de servis yok. Bulaşıkçı tek kirli `k2tavla1/3/9/10/11`: (4,75; 3,84) / (14,95; y)'de durur. Tam oyunda garson tepsideki kahveyle istek sabrı bitene (25 sn) dek takılı kalır, sonra sıradaki en az sabırlı isteğe gider — öbür masalara da kahve gecikir. | `r3.test.ts` (R7): garson `k2tavla9/10/11: ULAŞAMADI`, bulaşıkçı `k2tavla1, 3, 9, 10, 11: ULAŞAMADI`; `ag.uzunluk((14,95;13,44)→(13;13,3)) = 0`. `r4.test.ts` (R8, oyuncusuz 1 sa, tam yükseltme): tavla 1-8/12 servis 61-85 · kaçan 5-19; **tavla 9/10 servis 26 · kaçan 54**, tavla 11 36/44. `r2.test.ts` (R5): bulaşıkçı 167 sn, garsonlar 13-21 sn kesintisiz durgun. | Yaklaşma noktasını "masanın erişim kutusu içindeki ve ızgarada AÇIK bir hücre" olarak seç (ör. `enYakin(g, …, i => !blocked[i] && masaErisimde(yer, merkez(i)))`, yoksa iç sütun tarafı `m.x − s·(TAVLA_YARI[0]+PR+0,1)`). Bekçi: her masa için tek garson/bulaşıkçı ≤ 30 sn'de servis/toplama. Not: ölçüm araçları aynı kodu koştuğu için D-200/D-201 sayıları bu kusuru içeriyor. |
| 2 | **yüksek** | `store.ts:246-253` (`kayitVerisi` yalnız Kat 1 `s.coins`), `kat2Dongu.ts:343` (`paralar` transient), `kat2Dongu.ts:1110-1112` | **Kat 2'de yerdeki para kapanışta yanar ve oyuncu Kat 1'deyken sınırsız birikir** (D-146 K8 kuralı Kat 2'ye uygulanmamış). `2-kayit.md` #4 ile aynı kök; buradaki ek ölçü büyüklüğü gösteriyor: | Kat 2 açık (tam zincir), oyuncu 1 sa Kat 1'de oynar, uygulamayı kapatır. | `r1.test.ts` (R3): 1 sa sonra Kat 2 yerde **47.156 coin, 665 yığın** (23 farklı noktada). R1: `paralar` 5.000 iken `kayitVerisi().wallet = '100'`, `init` sonrası yığın yok, cüzdan 100. | `kayitVerisi`'nde `kat2Dunya.paralar` toplamını `wallet` + `lifetime`'a kat (Kat 1 deseni). |
| 3 | **yüksek** | `kat2Dongu.ts:344` (`padFill` transient), `store.ts:1035` (init → `padFill: {}`) | **Kat 2 pad / masa Sv / ocak / lavabo yükseltmesine kısmi dökülen para kapanışta yanar** (Kat 1'de G-78 ile kapatılan hatanın aynısı; `2-kayit.md` #2 ile aynı). Cüzdan anında düşer ve kaydedilir, dolum kaydedilmez. | 5.000 coin'le 8.600'lük `k2okey1` pad'inde dur (5.000 akar) → uygulamayı kapat/aç. | R2: `padFill = {k2okey1: 5000, 'sv:k2okey2': 3000, k2ocakYuk: 1000}` → `saveNow` + `init` → `padFill = {}`, cüzdan geri gelmedi. | `Kat2Kayit`'a additive `padFill`; `init` kelepçeli (≤ bugünkü fiyat) geri yüklesin. |
| 4 | orta | `kat2Dongu.ts:1110-1112` (kalkış her seferinde YENİ yığın), `:513-516` (kahve en eski yığına eklenir), `components/three/kat2/Para.tsx:134` | **Yığın listesi sınırsız büyür (performans).** Kalkış yığını aynı noktadaki mevcut yığınla birleşmiyor; oyuncu Kat 1'deyken toplanmayan her kalkış yeni eleman. Her karede `paralar.filter` + her kahvede `find` O(n); `Para.tsx` seçicisi her store güncellemesinde bütün kimlikleri `join` ediyor ve her yığın ayrı kule çiziliyor (aynı noktada üst üste ~29 kule). | Kat 2 açık, Kat 1'de 1 sa → 665 yığın; 3 sa → ~2.000. Kat 2'ye dönünce hepsi çizilir. | R3: 665 eleman / 23 nokta (ölçüm). Çizim yükü kod okuması. | Kalkışta da aynı noktadaki yığına ekle (`kahveOde`'deki `find` deseni) → nokta başına tek yığın, liste ≤ 23 + lavabo. |
| 5 | düşük | `store.ts:1100-1116` (Kat 2 dalı), karşılaştır `tick.ts:1340` (`perPad`), `:1409/:1455/:1498` (`perUpgrade`) | **Kat 2 pad'i ve masa Sv'si XP vermiyor**; aynı katta ocak/lavabo yükseltmesi ve panel garson alımı `perUpgrade` veriyor, Kat 1'de pad `perPad`, masa yükseltmesi `perUpgrade` veriyor. Kahve servisi / yıkama da XP'siz (Kat 1'de `perTeaServed`/`perDishWashed`). "Kat 2 = Kat 1 uyarlaması" kuralıyla çelişiyor; seviye ödülü (₺) Kat 2'de yavaşlar. | Kat 2'de 29 pad + 88 Sv alımı → 0 XP. | Kod okuması (`r.olay.padBitti` / `svAtlayan` dalında `xp` artışı yok). | `padBitti` → `xp += C.xp.perPad`; `svAtlayan.length × perUpgrade`; tasarım teyidiyle servis/yıkama XP'si. |
| 6 | düşük | `rules.ts:806-818` (`kat2Oran`) | **Çevrimdışı Kat 2 oranı alınmış yükseltmeleri görmüyor**: masa Sv çarpanları (ücret ×3,44'e, geliş ×0,15'e kadar) ve lavabo L2-L6 (`yukseltme.lavabo`) hesaba girmiyor, her zaman L1 + Sv1. Tavan (sıradaki pad × 1,2) çoğu dönüşte bağladığı için yalnız kısa/orta yoklukta düşük öder. | Kat 2 bitmiş, bütün masalar Sv5, ~10-20 dk kapalı kal → ödeme Sv1 oranından. | Kod okuması (`kat2Oran` `C.kat2`'yi yükseltmesiz okur; `kat2.masaSv`/`yuk` parametre değil). | `kat2Oran(padsDone, masaSv, yuk)` → `kat2EtkinAyar` + Sv çarpanları; çağıran `s.kat2`'yi geçsin. |

## Doğrulanmamış şüpheler (kısa)

- **İzle eki Kat 1 kesintisini bilmiyor** (`store.ts:677` `offlineWatchExtra` · `:690` `cevrimdisiDagit`): oyuncu Kat 2'de kapattıysa
  Kat 1 payı ölçülen gelir × 20 dk'ya kesiliyor ama "İzle" eki kesilmemiş ham tutardan hesaplanıyor. Yalnız tavan bağlamadığı VE kesinti
  devreye girdiği dar durumda fark doğar; sayıyla tetiklemedim.
- **Çevrimdışı Kat 1 tavanı bayat ölçüme dayanabilir** (`kasa.ts:90-105`): `kasaOlcum` yalnız oyuncu Kat 2'deyken güncelleniyor; uzun
  süre Kat 1'de kalıp Kat 1'i yükselten oyuncunun tavanı eski (düşük) ölçümden gelir. Ölçmedim.
- `kat2HavuzHedef` (`kat2Dongu.ts:842`) `yuk.ocak`'ı üstten kelepçelemiyor (`kat2EtkinAyar` kelepçeliyor); bozuk/bulut kaydında
  `ocak: 99` → havuza +198 fincan. `kayitDogrula` yalnız ≥ 0 tutuyor. Pratikte yalnız elle bozulmuş kayıtta.

## Kontrol edilip temiz bulunanlar

- Fincan korunumu: tam zincir + tam yükseltme, oyuncusuz 2 sa (`r1.test.ts` R4) — temiz + ocak + tepsiler + masa (içilen/kirli) + leğen +
  personel toplamı hiç değişmedi; negatif/NaN yok.
- Para akışı: pad/Sv/ocak/lavabo dolumu aynı karede `g.cuzdan − harcama` ile sınırlı (çifte harcama yok); arka plan Kat 2 tick'i cüzdan 0 +
  uzak konum, kazancı okunmuyor (sızıntı yok). Kat 2'deyken Kat 1 parası `akisSn` sonra bir kez cüzdana (çift sayım yok, kayıtta yerdeki
  Kat 1 parası doğru katılıyor).
- Görev hattı: config hattı `kat2GorevHatasi` kurallarına uyuyor; Sv görevleri (`k2_sv2` okey, `k2_sv5`) tek-hedef sırası `k2okey2`'yi
  seçtiği için ulaşılabilir. Sv tetikleri 22 masa × Sv1-4 için oyuncu tarafından erişilebilir (`r2.test.ts` R6: 0 ulaşılamayan).
- Kat geçişi: varış noktaları geri tetiklemiyor (Kat 2 varışı x −3,07, tetik |x| ≤ 2,0); merdiven pad'i yalnız `!kat2.acik` iken.
- Oyuncunun elinde Kat 1 kirli bardağıyla Kat 2'ye çıkması Kat 1 akışını ölçülebilir düşürmüyor (`r5.test.ts` R9: 10 dk'da 700 vs 692).
