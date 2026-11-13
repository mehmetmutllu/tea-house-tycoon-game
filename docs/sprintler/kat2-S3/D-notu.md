# Ajan D notu — Kat 2 görev hattı + başarımlar + analitik

## Dosyalar
- YENİ `src/game/kat2Gorev.ts` (saf) · YENİ `tests/kat2-gorev.test.ts` (31 test)
- `src/config/economy.config.ts`: yalnız YENİ `kat2Gorevler` bloğu (kat2'nin hemen altında)
- `src/config/playGames.config.ts` (başarım listesi burada; `basarim.ts` yalnız ölçer) · `src/game/basarim.ts` · `src/game/analitik.ts`
- `src/components/ui/HUD.tsx`: alt bant Kat 2 dalı (Kat 2'deyken Kat 2 görevi; hat bitince eski "Kat 2 — Oyun Salonu" bandı)

## Görev hattı (18 + 2 Sv) — ödül kuralı Kat 1 M1 bandı: referans pad'in %10-20'si (Kat 2: ~%15, 50'ye yuvarlı)
| # | id | lakap | başlık (TR) | EN önerisi | hedef | ödül |
|---|---|---|---|---|---|---|
| 1 | k2_kahve1 | İLK KAHVE | Okey masasına kahve götür | Bring coffee to the okey table | elle servis 1 | 200 |
| 2 | k2_okey1 | OKEY | Yeni okey masası aç | Open a new okey table | pad k2okey1 | 200 |
| 3 | k2_topla | MASA ÜCRETİ | Masanın bıraktığı parayı topla | Collect the table's coins | kazanç ≥ 1 | 250 |
| 4 | k2_kahve10 | KAHVECİ | 10 kahve götür | Serve 10 coffees | elle servis 10 | 250 |
| 5 | k2_okey4 | MERDİVEN SALONU | Merdiven salonunu doldur | Fill the stair hall | pad okey3→okey4 (0/2) | 350 |
| 6 | k2_salon2 | OKEY SALONU | Okey salonunu aç | Open the okey hall | pad k2salon2 | 400 |
| 7 | k2_grup5 | MİSAFİR | 5 grubu ağırla | Host 5 groups | kalkış 5 | 400 |
| 8 | k2_s2okey2 | OKEY SALONU | Okey salonu: 2 masa aç | Okey hall: open 2 tables | pad (0/2) | 500 |
| 9 | k2_cezve2 | İKİNCİ OCAK | 2. ocağı kur | Set up the 2nd stove | pad k2cezve2 | 550 |
| 10 | k2_kahve40 | KAHVECİ | 40 kahve götür | Serve 40 coffees | elle servis 40 | 550 |
| 11 | k2_s2okey6 | SALON DOLDU | Okey salonunu doldur | Fill the okey hall | pad (0/4) | 750 |
| 12 | k2_lavabo | LAVABO | Lavaboyu aç | (Kat 1'de var) | pad k2lavabo | 850 |
| 13 | k2_salon3 | TAVLA KÖŞESİ | Tavla köşesini aç | Open the backgammon corner | pad k2salon3 | 950 |
| 14 | k2_garson | GARSON | Garson tut | (Kat 1'de var — "Server") | pad k2garson | 950 |
| 15 | k2_tavla1 | TAVLA | İlk tavla masasını aç | Open the first backgammon table | pad k2tavla1 | 950 |
| 16 | k2_tavlaKahve | TAVLA | Tavlacılara 10 kahve | 10 coffees for backgammon players | tavla kahvesi 10 (garson dahil) | 1.000 |
| 17 | k2_tavla6 | TAVLA KÖŞESİ | Tavla: 6 masaya çık | Backgammon: reach 6 tables | pad (0/5) | 1.150 |
| 18 | k2_tavla12 | KAT 2 TAMAM | Tavla köşesini doldur | Fill the backgammon corner | pad (0/6) = zincir sonu | 1.400 |
| 19 | k2_sv2 | MASA SEVİYESİ | Bir okey masasını Seviye 2'ye çıkar | Upgrade an okey table to Level 2 | Sv (yalnız `masaSv` varken) | 1.000* |
| 20 | k2_sv5 | GÖZDE MASA | Bir masayı Seviye 5'e çıkar | Upgrade a table to Level 5 | Sv | 1.500* |

Lakap EN'leri: FIRST COFFEE · OKEY · TABLE FEE · COFFEE RUN · STAIR HALL · OKEY HALL · GUESTS · SECOND STOVE · HALL FULL ·
BACKGAMMON CORNER · BACKGAMMON · FLOOR 2 DONE · TABLE LEVEL · STAR TABLE (LAVABO/GARSON/MASA SEVİYESİ Kat 1'de varsa onlar).
*Sv ödülleri TASLAK: Sv fiyatı seçilince aynı %15 kuralıyla yeniden yazılır (bekçi o an `kat2GorevOdulReferansi` ile denetlenebilir).
Ulaşılabilirlik: `kat2GorevHatasi` (pad hedefleri zincir sırasında; sayaç hedefinin masası/ocağı/garsonu ÖNCEKİ görevlerle açık;
Sv kuyrukta). "Tavla kahvesi" garsonu da sayar (garson tavladan önce geliyor — elle sayılsa q_tost5 kilidi).

## Başarımlar (6 yeni; Kat 1'in 19'unun anahtar/ölçü/eşiği aynı). Play/Game Center girişi:
| anahtar | TR ad | EN ad | TR açıklama | EN açıklama | XP |
|---|---|---|---|---|---|
| kat2_ac | Yukarı Kat | Upstairs | Merdiveni onar, Kat 2'yi aç. | Repair the stairs and open Floor 2. | 20 |
| kat2_ilk_masa | Okey Başlasın | Let the Game Begin | Kat 2'de ilk yeni masanı aç. | Open your first new table on Floor 2. | 10 |
| kat2_tavla | Tavla Köşesi | Backgammon Corner | Tavla köşesini aç. | Open the backgammon corner. | 25 |
| kat2_gozde_masa | Gözde Masa | Star Table | Kat 2'de bir masayı Seviye 5'e çıkar. | Upgrade a Floor 2 table to Level 5. | 25 |
| kat2_gorev | Üst Kat Tamam | Floor 2 Complete | Kat 2'nin bütün görevlerini bitir. | Finish every Floor 2 task. | 30 |
| kat2_tamam | Dolu Salonlar | Full House | Kat 2'nin bütün masalarını aç. | Open every table on Floor 2. | 40 |
**XP tavanı 1000** (Play; Game Center da 1000): yeni 150 XP için Kat 1'in altı büyüğü 25'er indi — servis_6000 · mekan_24 ·
kazanc_600k · masa_20 · koleksiyon 100→75, gorev_hatti 75→50. Kimlikler henüz null (Console'a girilmemiş) → kayıpsız; giriş
yapılmışsa XP Console'da da güncellenmeli. `docs/play-games-kurulum.md` tablosu güncellenmedi (Claude). "100 kahve" başarımı
YOK: Kat 2'de kalıcı kahve sayacı yok (başarım durumdan türer, D-153) — istenirse `Kat2Kayit`a sayaç gerekir.

## Analitik (store farkından, `analitikOlaylari` içinde)
`kat2_acildi {gorev_sira}` · `kat_gecis {kat}` (yalnız perde sırasında — yükleme olay değil) · `kat2_nokta_acildi {nokta}`
(hazır pad'ler hariç) · `masa_sv {masa, sv}` · `kat2_gorev_tamam {gorev_id, gorev_sira}`. Toplu sıçrama (> 2) olay doğurmaz.

## CLAUDE BAĞLAR (store.ts)
1. Her `kat2Tick`ten sonra (Kat 2'de VE arka planda): `const g = kat2GorevIlerlet(kat2.gorev, { ...r.olay, kazanc: r.kazanc },
   { padsDone: kat2.padsDone, masaSv: kat2.masaSv }, economyConfig.kat2Gorevler, KAT2_AYAR)`; `g.kayit !== kat2.gorev` ise
   `kat2 = { ...kat2, gorev: g.kayit }`. `padsDone`/`masaSv` o adımın GÜNCEL hâli verilmeli (pad bitti + svAtla sonrası).
2. `g.odul > 0` → cüzdan + lifetime'a ekle (Kat 1 M1 yolu) · biten başına `xp.perQuest` XP · `notice` (Kat 1 görev toast'ı, `reward`).
3. Yüklemede (init + bulut) ve `kat2Ac`ta: `gorev = kat2GorevHizala(kat2.gorev, kat2, kat2Gorevler, KAT2_AYAR)` (ödülsüz).
4. `devHooks`: `__game().kat2Gorev = kat2.gorev`. HUD şeridi şimdilik düğme değil (Kat 2 kamera odağı yok) — istenirse `focusQuest`in
   Kat 2 karşılığı. Kutlama penceresi (Kat 1 `done` 1,3 sn) Kat 2'de yok: görev bitince şerit bir sonrakine geçer.
5. `i18n/en.ts`: yukarıdaki başlık + lakaplar (`i18n.test (b)` şu an bu 34 metin yüzünden KIRMIZI — beklenen).
6. Duman: Kat 2'de `[data-testid="kat-bandi"]` korunur (görevli bantta da), görev kimliği `data-gorev`da.
