# Tarama 2026-11-18 · 2 — Kayıt / yükleme / göç / bulut kaydı

Kapsam: `save.ts` · `kalicilik.ts` · `bulut.ts` · `store.ts` (init / `kayitVerisi` / Kat 2 kayıt alanları) ·
`kasa.ts` (çevrimdışı) · `satinAlimUzlas.ts`. Referans: mağazadaki 1.0.7 = `72eba89` (iOS; Play AAB'si
aynı kod, kod değişikliği yok — `b5331d4`). Güncel kod = `8bfc8ba`.

Yöntem: güncel kodda geçici vitest (`tests/` içine kopyalandı, iş bitince silindi) + **1.0.7 kodu**
`git archive 72eba89` ile scratchpad'e çıkarılıp gerçek eski store/bulut koduyla koşturuldu (eski
cihaz simülasyonu). Ara dosyalar: `…/scratchpad/t2/` (`kat2-kayit.json`, `old-yazdi.json`, `old-v34.json`).

## Bulgular (doğrulanmış)

| # | önem | dosya:satır | bulgu | somut tetik | kanıt | önerilen düzeltme |
|---|---|---|---|---|---|---|
| 1 | **YÜKSEK** | `src/game/bulut.ts:184` (`bulutlaBirlestir`), `:328`; eski kod `72eba89:src/game/store.ts:247` (`kayitVerisi` = `...defaultSave()` + bilinen alanlar) | **1.0.7 cihazı Kat 2 ilerlemesini bulut üzerinden kalıcı olarak siler.** 1.0.7 Kat 2 kaydını okuyabiliyor (derin birleştirme bilinmeyen `kat2`'yi taşıyor), ama ilk periyodik yazımda `kayitVerisi` yalnız bildiği alanları yazdığından `kat`/`kat2`/`kasa`/`kasaOlcum` düşüyor. Bu kayıt daha ileriyse (toplam kazanç büyükse) buluta gidiyor; 1.1 cihazı açılışta onu "daha ileri" diye yüklüyor ve `bulutlaBirlestir` yalnız ayarları + satın alımları koruduğu için Kat 2 sıfırlanıyor (merdiven 9.400 + bütün Kat 2 pad'leri, Sv'ler, görev hattı). `save.ts:302-304` yorumundaki "eski sürüm de silmez" varsayımı yanlış. | Aynı Apple ID / Play hesabında iki cihaz: iPhone 1.1'e güncellenip Kat 2 açıldı, iPad 1.0.7'de kaldı. iPad açılır (bulut Kat 2'li kaydı yükler), 30 sn oynanır → iPad buluta Kat 2'siz kayıt yazar → iPhone açılır → Kat 2 gider. Çökme yok. | Eski kodla koşu: yükleme sonrası diskte `kat2` VAR → 30 sn tick + `saveNow` sonrası diskte `kat2` YOK, `bulutKaydet()` = true, bulut metninde `kat2` yok (lifetime 900000 → 900005). Güncel kodda bu bulut metni: `kayitIleriMi` = true, yükleme sonrası `kat2 = {acik:false,padsDone:[]…}` (önce `acik:true`, 5 pad, görev idx 4), `kat` 2 → 1. | 1.0.7 değiştirilemez → düzeltme 1.1 tarafında: `bulutlaBirlestir`/`esitle` Kat 2'yi **kat bazında** birleştirsin — ham bulut metninde `kat2` anahtarı yoksa ya da bulutun Kat 2'si yerelden gerideyse (`acik`, `padsDone.length`, `masaSv`, `yuk`, `gorev.idx`) yerelin `kat2`'si (+ `kat`) korunsun. Aynı kural yerel diskte de: kayıt Kat 2'siz ama önceki yerel kayıt/yedek Kat 2'li ise birleştir. Bekçi testi: "Kat 2'siz daha ileri bulut kaydı Kat 2'yi silmez". |
| 2 | **ORTA-YÜKSEK** | `src/game/kat2Dongu.ts:333-344` (`Kat2Dunya.padFill` "transient"), `store.ts:301` (`kayitVerisi` yalnız `s.kat2`'yi yazar), `store.ts:1035` (init `yeniKat2Dunya` → `padFill: {}`) | **Kat 2'de kısmi ödenmiş pad / masa Sv / ocak / lavabo yükseltmesi uygulama kapanınca yanar** — Kat 1'de G-78 (2026-09-18) ile kapatılan hatanın aynısı. Para dolarken cüzdandan anında düşüyor (`r.harcama`), düşmüş cüzdan kayda yazılıyor, dolum ise kaydedilmiyor. | Kat 2'de sıradaki pad'in (ör. `k2okey4`, 9.600) üstünde 1 sn dur → uygulamayı kapat/aç (ya da arka plana atıp OS öldürsün). Tavla Sv5 (6.250), okey Sv (9.750'ye kadar), pad'ler (16.700'e kadar) aynı şekilde. | Gerçek tick koşusu: `padFill.k2okey4 = 2743`, cüzdan 2.043 azaldı (aynı saniyede Kat 1 akışı +700) → `saveNow` + `init` → `padFill = {}`, cüzdan 497.957 (geri gelmedi). | `Kat2Kayit`'a additive `padFill: Record<string, number>` (Kat 1 `padFills` deseni); `kayitVerisi` yazsın, `init` `yeniKat2Dunya`'ya kelepçeli (`≤ bugünkü fiyat`) geri versin, `kayitDogrula` `sozluk(negatifsizSayiMi)` ile temizlesin. Bekçi: G-78 testinin Kat 2 karşılığı. |
| 3 | **ORTA** | `src/game/kat2Gorev.ts:160-177` (`kat2GorevHizala`), `store.ts:716` + `:830` (her yüklemede çağrılıyor) | **Kat 2 görev hattı her açılışta ödülsüz ileri atlanıyor.** Pad'ler görev hattına bağlı değil (`kat2SiradakiPad` görevi okumuyor); oyuncu bir sayaç görevindeyken (k2_kahve10, k2_grup5, k2_kahve40, k2_tavlaKahve) sonraki pad'leri alabiliyor. Canlı oyunda `kat2GorevIlerlet` sayaç dolunca o görevi + arkasındaki tamam pad görevlerini **ödüllü** geçiyor; ama yeniden açılışta `kat2GorevHizala` "en geç tamamlanmış durum görevinin ardına" atlıyor → arada kalan sayaç görevi ve pad görevleri **ödülsüz** geçiliyor, sayaç ilerlemesi sıfırlanıyor. Yani aynı oyun, kapatıp açınca ödül kaybediyor. | Kat 1 parasıyla Kat 2'ye çık, k2okey1 + k2okey3 + k2garson al, "10 kahve götür" 7/10'dayken uygulamayı kapat/aç. | Kayıt `gorev: {idx:3, sayac:{servis:7}}`, pad'lerde `k2garson` → `init` sonrası `{idx:5, sayac:{}}`, cüzdan Δ 0. Kaçan ödül: k2_kahve10 **1.350** + k2_garson **700** (+ 2 × görev XP'si). | Hizalamayı yalnız **eski/tutarsız** kayıtta uygula (ör. `gorev` alanı yoksa) ya da hizalarken atlanan görevlerin ödülünü ver; en temizi: yüklemede `kat2GorevIlerlet`'in kendisini boş olayla koştur (aktif görev sayaçsa ve dolmamışsa yerinde kalır, canlı oyunla aynı sonuç). Bekçi: "kaydet→yükle görev hattını değiştirmez". |
| 4 | **ORTA-DÜŞÜK** | `store.ts:250-253` (`kayitVerisi` yalnız Kat 1 `s.coins`'i cüzdana katar), `kat2Dongu.ts:343` (`paralar` transient) | **Kat 2'de yerde bekleyen para (masa ücreti / kahve yığınları) kapanışta yanar.** Kat 1 için K8 (D-146) "yerdeki para kayıtta cüzdandadır" kuralı Kat 2'ye uygulanmamış. Oyuncu Kat 1'deyken de Kat 2 masaları oynamaya devam edip yığın biriktiriyor (D-185). | Kat 2'de masa ücretini toplamadan kapat; ya da Kat 2 açıkken Kat 1'de oyna ve kapat. | Kat 1'de 120 sn → Kat 2 yerde **110**; `saveNow` cüzdanı 500.730 (yalnız Kat 1 parası eklendi) → `init` sonrası `paralar` boş. `kat2Dunya.paralar` elle 1.234 verildiğinde de cüzdana geçmedi. | `kayitVerisi`'nde `s.kat2Dunya.paralar` toplamını da `wallet` + `lifetime`'a ekle (Kat 1 deseni; yükleme yerde para üretmediği için çift sayım yok). |
| 5 | DÜŞÜK | `src/game/save.ts:674-679` + `:389` (`resetKeepingSettings`), `:743` | **`saveVersion` eksik / dizge / < 31 olan kayıt SESSİZCE sıfırlanıyor**: `resetKeepingSettings` boş kayıt döndürüyor, `red` boş → aday "sağlam" sayılıp seçiliyor, karantinaya alınmıyor, `kayitSorunu` null, 2 sn sonra üstüne yazılıyor. Sprint A'nın "sessiz sıfırlama yok" sözüne aykırı. Mağaza yazıcısı hep `34` yazdığı için bugün tetiklenmesi zor (elle düzenlenmiş/yarım yazılmış ama JSON'u geçerli kayıt, ya da çok eski geliştirme kaydı). | `{"saveVersion":"34","wallet":"777",…}` ya da `saveVersion` alanı olmayan kayıt. | `kayitCoz` → `wallet "777"` yerine `0`, `red: []`. | Göç zincirinden düşen (`resetKeepingSettings`'e giden) kayıt `red: ['saveVersion']` döndürsün → yedeğe düşülür / karantina + `onarildi` notu. |

## (a)–(f) özet

- **(a) 1.0.7 kaydı → güncel kod: TEMİZ.** Eski kodla üretilmiş dolu v34 kaydı (cüzdan 123.456.789, 💎 321,
  30 pad, masa/ocak seviyeleri, görevler, hedefler, Usta, kozmetik + dekor + kafe adı, satın alımlar
  `reklamsiz/baslangic/islenen/islemElmas/uzlasmaBasi/hakKimlik`, karakter/garson kademeleri, kısmi
  yükseltme dolumu) güncel `init` + `saveNow` sonrası **birebir aynı**; fark yalnız eklenen
  `kat:1`, `kat2` (varsayılan), `kasa:"0"`, `kasaOlcum`.
- **(b) Kat 2 ortası gidiş-dönüş:** tutarlı kayıt birebir döner (Bulgu 3 dışında: görev hattı pad'lerin
  önündeyse atlar). Kısmi dolum ve yerdeki Kat 2 parası kayda hiç girmiyor (Bulgu 2, 4).
- **(c) Kat 2 kaydı, Kat 2'siz derleme:** 1.1'in `VITE_KAT2` kapalı derlemesi `kat2`'yi olduğu gibi yazar
  (yalnız `kat` 2 → 1 olur; zararsız), çevrimdışı Kat 2 payı sayılmaz. **1.0.7** çökmez, kaydı açar ama
  Kat 2'yi siler ve buluta taşır (Bulgu 1). `saveVersion` artırılmadığı için yazma kilidi devreye girmiyor.
- **(d) Bozuk veri:** `Infinity`/`NaN`/`-1`/`abc`/`''` cüzdan → red (yedeğe düşer). `kat2: null` →
  varsayılan; `gorev.idx: 9999`, `yuk.* = 99`, `masaSv: 99`, bilinmeyen / tekrarlı Kat 2 pad'i → `init` +
  200 tick + kayıt çökmeden geçti.
- **(e) Çevrimdışı:** saat 30 gün geri → kazanç 0 (negatif yok); 5 yıl / 1e15 ms ileri → `baseCapHours`
  tavanında aynı tutar (11.040). Günlük görev saat geri alınınca dönmüyor (`rollDaily` D2). Sorun yok.
- **(f) saveVersion:** 1.0.7'den beri `save.ts`'teki tüm değişiklikler additive (`kat`, `kat2`, `kasa`,
  `kasaOlcum`; Kat 2 alt alanları). Kat 1 görev kimlikleri ve kademe anlamları değişmedi (config farkı:
  yalnız bir kicker metni + yeni `kasa`/`kat2` blokları) → artış gerekmiyordu. Ama "additive = eski sürüm
  korur" varsayımı Bulgu 1'de çöküyor.

## Şüpheler (doğrulanmadı / düşük olasılık)

- `kat2.yuk.*` ve `kat2.gorev.idx` üst sınıra kelepçelenmiyor (`save.ts:535-546`); 99 değerle çökme
  görülmedi ama UI'da "Seviye 100" gibi garip görünüm olabilir.
- `gecerliTutar` `'1e9e15'`, `'9e15e1'` gibi yarı geçerli dizgeleri kabul ediyor; bizim yazıcımız
  üretmez, etkisi doğrulanmadı.
- Bulut seçimi yalnız toplam kazanç/XP'ye bakıyor; 1.1 içinde iki cihaz arasında da "geride kalan cihazdaki
  Kat 2 ilerlemesi" Kat 1 ilerlemesiyle birlikte kaybedilir (tasarım gereği, ama Kat 2 kat-bazlı birleşim
  Bulgu 1'in düzeltmesiyle bunu da kapatır).
- `xp` bellekte NaN/Infinity olursa JSON `null` yazar → yüklemede sessizce 0 (red değil). Üretilme yolu
  bulunamadı.
