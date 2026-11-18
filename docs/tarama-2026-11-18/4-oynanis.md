# 4 — Uçtan uca oynanış taraması (Kat 1 → Kat 2 sonu) · 2026-11-18

> Tur tipi **tarama**: `src/` ve config değişmedi, commit yok. Sunucu: `VITE_KAT2=1 VITE_DENEME=1 vite --port 4401`.
> Araçlar (geçici, repo dışı): `scratchpad/t4/` → `kat1.mjs` (T9b botu + merdiven + kat geçişi), `k2bot.js` + `kat2.mjs`
> (Kat 2 botu), `gecis.mjs` (paneller + kat geçişi denemeleri), `istat.mjs`, `ulasim.mjs`, `etiket.mjs`.

## Yöntem

- **Kat 1:** taze kayıt (390×844 dokunmatik, `tr-TR`), kafe adı girildi → T9b botu (`tools/tarama-botu-t9b.txt`, gerçek `tick` +
  klavye girdisi + çarpışma) görev hattını sonuna dek oynadı. 15 sim-dk ilerlemeyen görevde pad'se eksik para verildi, değilse
  `__setQuest` ile atlandı (botun kuralı "cüzdan ≥ TAM fiyat" olduğundan 10 kez para verildi; 2 atlama, aşağıda).
- **Merdiven:** hat bitince oyuncu merdiven pad'ine konup durduruldu → Kat 2 açıldı → merdivenin ağzında −z'ye **gerçek girdiyle**
  itilerek (`merdivenTetik`) Kat 2'ye çıkıldı. Kayıt bırakıldı, Kat 2 koşusu bu kayıttan **yeniden yüklenerek** başladı.
- **Kat 2:** yeni bot (`k2bot.js`): `kat2YolAgi().nokta` ile yürür (gerçek `kat2Adim` duvarları), sıradaki pad'i parası yetince
  doldurur, ocaktan kahve alır, istekli masaya götürür, para/kirli toplar, leğene bırakır; ocak/lavabo yükseltmesini ve Kat 2 garson
  yükseltmelerini (Çaycı paneli yolu `kat2GarsonYukAl`) pad'i geciktirmiyorsa alır. 20 sn ilerleyemezse hedefe ışınlanır (`isin`).
  Her 60 sim-sn: cüzdan DOM ↔ `fmt(durum)`, bant `data-gorev` ↔ hat idx, garson konumu, kirli-kapalı masa, DOM'da NaN/undefined,
  konsol. Üç koşu: **TR yardımlı**, **TR saf (hiç para verilmeden — zaman çizelgesi bundan)**, **EN yardımlı**.
- **EN:** `en-US` yerel ayarla Kat 1 + Kat 2 aynı yol; her dilimde ekran metninde Türkçe harf arandı; 4 panel + Çaycı sekmeleri +
  3B pad/Sv etiketleri ayrıca döküldü.
- Bot süreleri **tempo ölçüsü değildir** (bot hedef seçimi kusurlu; Kat 2'de yürüme bilerek gerçekçi ama karar basit).

## Zaman çizelgesi (sim dakikası; görevin BAŞLADIĞI an)

| Kat 1 (TR, yardımlı) | dk | | Kat 2 (TR saf, yardımsız) | dk |
|---|---|---|---|---|
| ilk görev `q_pickup` | 0 | | Kat 2'ye varış · `k2_kahve1` | 0 |
| `q_waiter` (garson) | 4,3 | | `k2_garson` | 1,0 |
| `q_zone2` (2. salon) | 20,8 | | `k2_okey4` (merdiven salonu) | 2,9 |
| `q_zone3` (3. salon) | 66,6 | | `k2_garson2` | 15,1 |
| `q_tost` | 112,3 | | `k2_salon2` (okey salonu) | 24,7 |
| `q_tost5` → **atlandı** (bkz. #14) | 116,4 | | `k2_s2okey2` | 37,5 |
| `q_stationMax` → **atlandı** (bkz. #14) | 153,3 | | `k2_bulasikci` | 53,2 |
| `q_waiter3` | 170,1 | | `k2_cezve2` | 57,6 |
| `q_lavabo` | 211,6 | | `k2_kahve40` | 69,1 |
| `q_z3table12` (son görev) | 355,0 | | `k2_s2okey6` (4 pad) | 73,9 |
| **Kat 1 hattı bitti** | **367,2** | | `k2_garson3` | 111,9 |
| merdiven pad'i (9.400, 5 sn) → Kat 2 açık | 367,3 | | `k2_lavabo` | 122,5 |
| merdivenden gerçek girdiyle Kat 2 | 367,3 | | `k2_salon3` (tavla köşesi) | 133,3 |
| | | | `k2_tavla1` · `k2_tavlaKahve` | 142,7 · 152,3 |
| | | | `k2_tavla6` · `k2_tavla12` (7 pad) | 164,7 · 204,8 |
| | | | `k2_sv2` · `k2_sv5` | 275,1 · 286,5 |
| | | | **Kat 2 hattı bitti (23/23)** | **328,2** |

Kat 2 yardımlı koşular: TR 290,4 dk · EN 279,3 dk (8-10 kez pad parası verildi). Kat 2'deyken Kat 1 arkada cüzdana
**~1.067 coin/dk** akıttı (geç Kat 1; ölçüm `gecis.mjs` D7) — Kat 2 temposunun önemli bir kısmı bu.

## Bulgular

Önem: **Y** yüksek · **O** orta · **D** düşük · **B** bilgi.

| # | önem | ne oldu | nasıl tetiklenir | kanıt (konsol/kare/durum) | şüpheli dosya |
|---|---|---|---|---|---|
| 1 | **Y** | **Kat 1 hattı bitince Kat 2'ye hiçbir yönlendirme yok.** Bant 5 sn "Tamamlandı" der, sonra yerine günlük görev bandı gelir ("520 ₺ kazan · ÖDÜLÜNÜ AL"); kenar oku yok; Görevler paneli "Görev hattı tamamlandı — mekân senin." yazar. Merdiven pad'i yalnız zeminde, oyuncunun merdivenin önüne kendiliğinden gitmesi gerekiyor. v1.1'in yeni içeriği oyuncudan saklı kalıyor | Kat 1'in 50. görevini (`q_z3table12`) bitir, merdivenden uzakta dur | durum: `questIndex 50 · edgeArrow false · kat2Acik false · cüzdan 12.931 (merdiven 9.400)`; TR ve EN aynı; kare `kareler/4-tr-kat1-hat-sonu.jpg` | `HUD.tsx:545-560` (quest null → Kat 1 bandı yok) · `Scene.tsx:119` (`QuestPointer` yalnız `g.quest`) · `economy.config.ts:886` (hat merdivende değil `q_z3table12`de bitiyor) · Görevler panelinin "MEKÂN" metni |
| 2 | **O** | **Görevler paneli Kat 2'de Kat 1'in hattını gösteriyor.** Kat 2'nin 23 görevi hiçbir listede yok; Kat 2 görevi sürerken panel "Görev hattı tamamlandı — mekân senin" + Kat 1'in 50 tamamlanmışını listeliyor | Kat 2'de alt menü → Görevler | panel metni (`gecis-tr.json` `panel.kat2.quests`); kare `kareler/4-tr-kat2de-gorevler-paneli.jpg`; EN'de aynı ("Task line complete — the place is yours.") | `HUD.tsx` Görevler ekranı (~1300-1330, `quest-active`) — `kat2GorevGorunumu`nu yalnız bant kullanıyor |
| 3 | **O** | **Kat 2'de yapılan iş Hedefler'e ve günlük görevlere sayılmıyor.** 5 sim-dk Kat 2 oyunu: `teasServed`, `teaPickups`, `dishesWashed`, `coinsCollected` **0 arttı** (yalnız Kat 1 garsonlarının `waiterServed`ı arttı). Günlük "Ocaktan 12 çay al" / "23 para topla" Kat 2'de ilerlemez; Hedefler "Mekân 24/…" Kat 2'nin 31 pad'ini saymaz; "Temizlik" Kat 2 leğenini saymaz | Kat 2'de servis/yıkama/para topla, Hedefler'e bak | `istat.mjs`: önce `{teas 680, washed 2527, coins 5684}` → 300 sn Kat 2 → aynı; günlükler değişmedi | `store.ts:1069-1140` (Kat 2 olayı `k2olay` yalnız `kat2GorevIlerlet`e gidiyor, `stats`a yazılmıyor) · `goals.ts` · `dailyQuests.ts` (`dailyCountersOf`) |
| 4 | **O** | **Kat 2'de kenar oku hiç çıkmıyor.** Hedef pad (ör. tavla köşesinin uzak masaları) ekran dışındayken Kat 1'deki pirinç ok yok; tek yol banda dokunmak (`kat2GorevOdak`) | Kat 2'de hedef pad'den uzaklaş | 3 koşuda 929 dilimin **0**'ında `edge-arrow`; kod: hedef yalnız `g.kat === 1` | `Scene.tsx:119` (`QuestPointer`), `HUD.tsx:412,972` (`EdgeArrow`) |
| 5 | **O** | **Tepsi iki kat arasında karışıyor (kapasite ikiye katlanıyor, HUD yanlış katın tepsisini gösteriyor).** Kat 1'de 4 çay al → Kat 2'ye çık → Kat 2'de 4 kahve daha alınır (kapasite 4, elde 8). Kat 2'de HUD'daki tepsi sayacı ve "tepsiyi boşalt" düğmeleri **Kat 1'in** çayını/tostunu gösterir ve boşaltır (3 çay → 0, kahve 4 kalır); Kat 2 kahvesini boşaltan düğme yok. Tersine: Kat 2 kahvesi (4) Kat 1'e inince görünmeden taşınır, dönünce yerinde | Kat 1'de çay al, merdivenden çık, ocaktan kahve al | `gecis-tr.json` D2: `{kat1Cay 4, k2Kahve 4, cap 4}`; D7 boşalt: `tray 3→0, k2 4→4`; kare `kareler/4-tr-kat2de-kat1-tepsisi.jpg` (Kat 2'de sağda "3" ve "1" rozetli Kat 1 düğmeleri) | `kat2Dongu.ts:1003` (alım `tepsiKap − tepsi − tepsiKirli`, Kat 1 tepsisi yok sayılıyor) · `HUD.tsx:440-470` (`s.tray`/`s.trayFood` katsız) · `Player.tsx:339-341` |
| 6 | **O** | **Kat 2'nin sonu boş.** Son görev (`k2_sv5`) bitince bant kalıcı olarak "Kat 2 — Oyun Salonu" boş hapı olur: kutlama yok, "sırada ne var" yok, ok yok. Oysa 20 masa Sv5'e, ocak 5. kademeye, lavabo L2-L5'e daha açık; oyuncu bunları göremez. (Ara not: `k2_tavla12`nin lakabı "KAT 2 TAMAM" ama ardından 2 görev daha var — lakap ekranda görünmüyor, şimdilik zararsız) | 23. görevi bitir | `kat2-*.json` `bitis`: `band "Kat 2 — Oyun Salonu"`, `edge false`, `notice null`; kare `kareler/4-tr-kat2-hat-sonu.jpg`; EN "Floor 2 — Game Hall" | `HUD.tsx:545-551` · `economy.config.ts:1346-1370` (`kat2Gorevler`) |
| 7 | **D** | **Uzun çok-adımlı pad görevleri** (softlock değil — bant `x/7` sayacı ilerliyor): `k2_tavla12` 7 pad **70 dk** tek bantta, `k2_s2okey6` 38 dk, `k2_tavla6` 41 dk, `k2_garson3` öncesi 38 dk. Saf koşuda 15-dk eşiği 11 kez aşıldı; 9'u bu görevler, 2'si `k2_sv5` (Sv2→Sv5 = 33.000) | Saf koşu | `kat2-tr-saf.json` `takilma` + `qTimes` | tempo → varyant kapısı (`economy.config.ts` `kat2.padler` / `kat2Gorevler`) |
| 8 | **D** | Hedefler ekranı Kat 2'deyken "Usta masalar — 4 masa hazır — yanındaki mavi noktaya git" diyor; mavi nokta Kat 1'de, Kat 2'de Usta yok | Kat 2'de Hedefler | `gecis-tr.json` `panel.kat2.goals` | `HUD.tsx:1459` (`usta-strip`) |
| 9 | **D** | Panel ya da video kartı açıkken kat geçişi olursa panel/kart açık kalır; Görevler paneli geçişte içerik değiştirmeden durur (zaten Kat 1 içerikli, #2) | `video-btn` → kart açık → kat değişimi (programla; dokunmatikte backdrop yürümeyi keser, klavyede mümkün) | `gecis-tr.json` D3/D4: `kart true` geçişten sonra | `HUD.tsx` (sheet/video-kart durumu `kat`a bağlı değil) |
| 10 | **D** | Çaycı paneli Kat 2'de "Bulaşıkçı" sekmesini gizliyor (Kat 2'de bulaşıkçı var, yükseltmesi yok); Kat 1'deyken Kat 2 garson yükseltmeleri görünmüyor — oyuncu Kat 2 garson tepsisini yalnız Kat 2'deyken alabilir. Tasarım olabilir; tutarlılık için not | Çaycı paneli her iki katta | `gecis-tr.json` `charSekmeler` (Kat 2: Çaycı/Garson · Kat 1: Çaycı/Garson/Bulaşıkçı) | `CharacterPanel.tsx:378-387` |
| 11 | **D** | Tavla masalarının para yığını iki sıranın arasına düşüyor; oraya yürüyerek varılamıyor (oyuncu 1,75-1,95 br uzakta durur). Bugün mıknatıs (en düşük 2,6) topladığı için oyuncu etkilenmiyor; mıknatıs küçülürse para toplanamaz | Tavla masası kalksın, yığına yürü | `ulasim.mjs`: `k2tavla1-5` kalan 1,75 · `k2tavla7-11` kalan 1,95 | `kat.ts:385,399` (`TAVLA_PARA_DZ`, `paraDusmeYeri`) |
| 12 | **B** | **Temiz çıkanlar:** softlock **yok** (saf koşu yardımsız 23/23); konsolda yalnız `THREE.Clock: This module has been deprecated` uyarısı (sayfa başına 1) — hata 0, `pageerror` 0, HTTP 4xx/5xx 0; DOM'da NaN/undefined 0; cüzdan DOM ↔ durum sapması 0 (~1.300 dilim, iki kat); bant `data-gorev` ↔ hat idx sapması 0; Kat 2 garsonu 5 dilim aynı yerde kalıp istek bekletme 0; kirli yüzünden kapanan masa 0; kayıttan yeniden yüklemede Kat 2'de açılıyor (`baslangicKati`); merdiven girdiyle iki yönde çalışıyor, ping-pong yok | — | `kat1-*.json`, `kat2-*.json`, `gecis-tr.json` D5 | — |
| 13 | **B** | **EN yerel ayarı temiz:** Kat 1 + Kat 2 HUD, bant, bildirim, 4 panel, Çaycı sekmeleri, 3B pad etiketleri ("Okey Table", "Backgammon Corner", "Coffee Station"…), Sv etiketi ("Lv 1"), 23 Kat 2 görev başlığı — Türkçe metin ya da ham anahtar **yok** | `en-US` ile aynı yol | `kat1-en.json`/`kat2-en.json` `trMetin: []`; `etiket.mjs` çıktısı | — |
| 14 | **B** (doğrulanmadı) | Kat 1'de iki atlama: `q_tost5` ("3 tost servis et") iki koşuda 17 dk'da 1/3 ve 0/3 kaldı; `q_stationMax`ta bot cüzdan 0 ile noktada bekledi. İkincisi bot kusuru (para kazanmaya gitmiyor); birincisinde de bot tostu hedeflemiyor olabilir — Kat 1 taramasında ayrıca bakılmalı (T9b A1'in yeri) | taze kayıt → T9b botu | `kat1-tr.json`/`kat1-en.json` `takilma` | `rules.ts` (`serveTost` sayacı) — yalnız şüphe |
| 15 | **B** | Ölçüm artefaktı (bulgu değil): Kat 2'deki "KAT 1: +38.158" satırı, ileri sarmada 3 sn'lik pencereye birkaç sim-dakikanın sığmasından; gerçek hızda dakikada ~1.067 | — | kare `4-tr-kat2-hat-sonu.jpg` | `Kat1Akis.tsx` |

## Bot sınırları

- Kat 2 botu 20 sn ilerleyemediğinde ışınlandı: saf koşu 13, TR 4, EN 19 kez — hepsi "para"/"servis" hedefinde tavla sıraları
  arasında (#11'in yan etkisi; mıknatıs para toplasa da bot hedefe "varmayı" bekledi). Oyun kusuru değil.
- Bot Sv/yükseltmeleri ancak sıradaki pad'in parası ayrıldıktan sonra alır; gerçek oyuncu farklı sıralayabilir.
- Kat 1 zaman çizelgesi 10 para yardımı + 2 atlama içerir, yalnız gösterge.
