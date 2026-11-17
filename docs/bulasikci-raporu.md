# Bulaşıkçı yıkama kuralı — rapor (2026-11-17)

**Soru:** Bulaşıkçı elindeki kapasite DOLMADAN yıkamaya gitmiyor (`tick.ts` dishwasher · `kat2Dongu.bulasikciAdim`). D-201 ölçümünde
(Bulgu 5) Kat 2'de son kademe (leğen 8 · hız 2,8) tabandan kötüydü. Tavan, temiz bardak havuzunu kurutuyor mu; hangi kural düzeltir?

**Araçlar:** `tools/olcum-bulasikci.ts` (Kat 1: oyunun kendi `tick()`i, oyuncu parkta = işi yalnız personel yapar; T8 kurulumu) ·
`tools/olcum-kat2-isleyis.ts` `IS_TUR=2 IS_DW=1` (Kat 2: D-201 config + bulaşıkçı son kademe). Kural config kancasından
(`dishwasher.yikamaKurali`, null = bugün; Kat 1 ve Kat 2 ortak `rules.yikamayaGit`). Ham çıktı `docs/olcum-bulasikci.txt` ·
`docs/olcum-bulasikci-kat2.txt` (ikisi de TAM).

**Kollar:** T0 taban kademe (leğen 2 · hız 2,0) · Y tavan, bugünkü kural (dolunca git) · E4 tavan, 4 kirliyle git · K0 tavan, temiz
bitince elindekini götür · K2 tavan, temiz ≤ 2 olunca elindekini götür.

## Bulgular

**Kat 1** (oyuncu parkta, 2 tohum, 7 dk kayıt):

| dünya | kol | servis/dk | temiz ort | temiz = 0 payı | masada kirli ort | bulaşıkçı elinde ort |
|---|---|---|---|---|---|---|
| W8 Salon 2 dolu (26 bardak) | T0 taban | 9,8 | 5,8 | %16,9 | 11,8 | 1,0 |
| | **Y tavan bugün** | **8,3** | 10,5 | **%22,5** | 6,5 | 1,9 |
| | E4 | 8,9 | 10,4 | %18,5 | 6,6 | 1,7 |
| | K0 | 9,8 | 11,7 | %5,1 | 3,6 | 2,1 |
| | **K2** | **9,8** | 11,7 | **%2,2** | 4,0 | 1,8 |
| W20 geç oyun (42 bardak) | T0 taban | 8,4 | 7,4 | %30,4 | 23,1 | 0,8 |
| | Y tavan bugün | 9,2 | 24,2 | %0 | 1,4 | 3,2 |
| | E4 | 8,3 | 15,6 | %28,0 | 13,7 | 2,0 |
| | K0 / K2 | 9,2 | 24,2 | %0 | 1,4 | 3,2 |

W20'de K0/K2 Y ile birebir aynı ("varyant etkili" damgası bu yüzden kırık): temiz orada hiç 2'ye inmiyor, kural tetiklenmez —
etkisizlik bulgunun kendisi. Korunum (leğen dahil) iki dünyada da temiz.

**Kat 2** (D-201 config; tam koşu, damgalar temiz):

| kol | Kat 2 biter | zincir | servis % | kirli masa % | temiz yok % | plato coin/dk (Sv1) |
|---|---|---|---|---|---|---|
| D-201 config (bulaşıkçı taban) | 8,11 sa | 4,91 sa | %84 | %0 | %0 | — |
| Y son kademe bugün | 8,10 sa | 4,91 sa | %86 | %0 | %0 | 1.738 |
| E4 | 8,10 sa | 4,90 sa | %85 | %0 | %0 | 1.732 |
| K0 / K2 | 8,10 sa | 4,91 sa | %86 | %0 | %0 | 1.738 |

**Bulgu 1 · Kat 2'de sorun kalmadı:** D-201'de garson kahveyi getirirken boşu alıyor; kirli masa ve temiz fincan sıkıntısı her kolda
%0, Kat 2 süresi kollar arasında ±1 dk. D-201 Bulgu 5'teki "son kademe tabandan kötü" garson boşu ALMAZKEN ölçülmüştü.

**Bulgu 2 · Sorun Kat 1'in ortasında:** W8'de (Salon 2 dolu) tavan bulaşıkçı bugünkü kuralla tabandan KÖTÜ — servis 9,8 → 8,3/dk
(−%15), temiz bardak zamanın %22,5'inde sıfır. 8'i doldurmaya çalışırken topladığı bardaklar elinde bekliyor.

**Bulgu 3 · "Temiz azalınca götür" düzeltiyor, başka yeri bozmuyor:** K2 W8'de servisi tabana geri getiriyor (9,8), temiz sıfır
%22,5 → %2,2, masadaki kirli 6,5 → 4,0. W20'de ve Kat 2'de hiç tetiklenmediği için oralarda değişiklik yok. K0 da düzeltiyor
ama temiz sıfır %5,1 (geç kalıyor). E4 kısmi (8,9) ve W20'de kötü (temiz sıfır %0 → %28) — kapasite yükseltmesini anlamsızlaştırıyor.

## Karar

**D-202 (kullanıcı 2026-11-17): B** — bulaşıkçı kapasite dolunca ya da toplanacak kalmayınca gider; ayrıca TEMİZ bardak 2'ye inince
elindekini hemen yıkamaya götürür. Kat 1 ve Kat 2 aynı kural (`rules.yikamayaGit`). Gerekçe (kullanıcı): temiz bardak yok oranı
en düşük olan. Kullanıcının sorusu: döngü kapalı mı? — evet: sabit bardak havuzu, temiz yoksa ocak çay koyamaz, kirli yıkanıp
dönmeden yeni çay çıkmaz (Kat 2'de fincan/cezve aynı).

## Uygulama (2026-11-17)

Config `dishwasher.yikamaKurali = { temizEnFazla: 2 }`. Bekçi `tests/bulasikci-kurali.test.ts` (config = B · kural · Kat 2
bulaşıkçısı aynı kuralı okur); mutasyon 2/2 (config null → 4 test düşer, Kat 2 dahil · `<=` → `<` → 1 test düşer).

**Final tam koşu** (`docs/olcum-bulasikci-final.txt`, `BULASIK_FINAL=1`: config olduğu gibi):

| dünya | kol | servis/dk | temiz = 0 payı | masada kirli ort |
|---|---|---|---|---|
| W8 | eski kural, tavan | 8,3 | %22,5 | 6,5 |
| W8 | **config (B), tavan** | **9,8** | **%2,2** | 4,0 — ölçümdeki K2 ile birebir |
| W8 | config (B), taban kademe | 10,9 | %9,4 | 11,0 — taban da kazandı (eski 9,8 · %16,9) |
| W20 | config (B), tavan | 9,2 | %0 | 1,4 — değişmedi (kural tetiklenmez; "varyant etkili" damgası bu yüzden kırık) |

Kat 2 final (`IS_TUR=2`, config): 8,11 sa · zincir 4,91 sa — D-201 ile aynı, damgalar temiz. vitest 2145 · duman 78/78 + EN 4/4.
