# S5 · UX ajanı — devir notu (2026-11-20, oturum kapanışı)

Commit yok (brif). tsc temiz; ilgili 8 test dosyası yeşil (144). Tam `vitest` koşusunda kalan tek kırmızı `tetik-s24` (GroundMarker — ESYA'nın). Duman KOŞULMADI.

## Biten
- **G-93** tepsi düğmesi nabzı: `CharacterPanel.tsx` (`vurgu` prop, yalnız `.char-buy` sınıfı) · `HUD.tsx` (charStat görevinde verir) · `hud.css` `.char-buy.vurgu`. Kare `s5-ux-tepsi-vurgu.png` (sınıf doğrulandı).
- **G-94** tanıtım bandı: `onboarding.ts` `kat2TanitimAni` + HUD `useKat2Rehber`. Karede çıktı (`s5-ux-tanitim.png`).
- **G-104** ipuçları: `onboarding.ts` `kat2IpucuAdimi/Hedefi`, HUD öğretici kanalı Kat 2'de bunu çizer + kamera hedefe. Karede ikisi de çıktı.
- **G-106** para zinciri: `kat2Ses.ts` `paraZinciriEkle` + `audioKat2.ts` `PARA_ZINCIR {adet 4, aralik 0,09}`.
- **G-124** oto-toplama: `kat2Dongu.ts` (`ParaYigini.yas`, `Kat2Girdi.otoTopla`, `Kat2Cikti.otoKazanc`) + `store.ts` (iki kat2Tick çağrısı, `autoCollectSum`). Ses yalnız elle toplamada (`stats.kat2Para`).
- **G-125** ortam zamanlayıcısı kalktı (`kat2Ses.ts`, `audioKat2.ts`); adaylar katalogda duruyor.
- Ek: Kat 2'de `purchase` (ocak/lavabo yük.) ve `quest` (görev bitti) sesleri.
- Testler: yeni `tests/s5-ux.test.ts`; `tests/kat2-ses.test.ts` güncellendi; `tests/ogretici-e5.test.ts` regex Kat 2 koluna genişledi. Mutasyon 7/7 yakalandı (script: scratchpad `s5ux-mut.py`; liste: oto kapalı · store arka plan okumaz · zincir tek tık · oto sesli · ipucu sırası · tanıtım yüklemede · purchase yok).
- Denetim tablosu: `docs/s5-ux-denetim.md`. Kare aracı: `tools/s5-ux-kare.mjs` (port 5167).

## G-107 (devam turu 2026-11-20) — BİTTİ
- **Kök neden:** `kat2YeniNokta` aynı karede beliren noktalardan YALNIZ İLKİNİ döndürüyordu. `k2okey4` iki nokta açar (`pad:k2garson2` + `ocak:k2ocakYuk`); Map sırasında pad önde → ocak bildirimi hiç kuyruğa girmiyordu. Şüpheler (a) idx çoklu atlama ve (b) kuyruk ezilmesi canlı logla ELENDİ: kutlama idx 0→5 atlamada da açılıyor, `kat2Bildir` kuyruğu korunuyor (tick aynı kuyruğu kopyalayıp geri yazıyor, eşzamanlı). Eski aracın pan görmemesi aracın kendisinden (çok pad + `hedefEkranda`).
- **Düzeltme:** `onboarding.ts` `kat2YeniNoktalar` (hepsi) + `kat2NoktaTepkisi` (her bildirim + kamera hedefi: bildirimli nokta önce). HUD `useKat2Rehber` bunları kullanır. Geçici loglar silindi.
- **Canlı kanıt** (`tools/s5-ux-g107.mjs`, gerçek satın alma: oyuncu k2okey4 pad'inde durur): pad +0 sn → görev bandı · +1,2–1,4 sn camFocus (0,-6) = yeni görev hedefi (Kat 1 G-44 sırası) · +3,6 sn "Yeni: Cezve ocağını yükseltebilirsin ☕". Kareler `docs/kareler/s5-ux-g107-{a-bitti,b-pan,c-bildirim}.png`.
- **Bekçi:** `tests/s5-ux.test.ts` "tek pad iki nokta açınca…" + "bildirimsiz tek nokta". Mutasyon 3/3 (yalnız ilk nokta · tepki ilk bildirim · kamera hep ilk).

## Açık (ESYA'ya öneri)
- G-124 oto-toplanan yığın `kat2/Para.tsx`te oyuncuya uçar + "+X" yazar — oto-toplamada uçuş/yazı olmamalı (Kat 1 toplu bildirim). Dokunulmadı.

## Ölçüm (G-124)
- ÖNCE (bu değişiklikten önce, `FINAL=1 OLCUM=tam`): `docs/olcum-s5-ux-g124-once.txt` — U0: Kat 2 biter 7,40 sa · iz 8f5788f8; U20: 7,74 sa · iz ad92f37d. Damgalar temiz.
- SONRA: **yeniden koşulacak** (`FINAL=1 OLCUM=tam npx tsx tools/olcum-kat2-carpan-usta.ts`). Beklenti: bot Kat 2'de yığınları zaten topluyor → iz büyük olasılıkla aynı. **Risk/denge:** araç oyuncunun Kat 1'deyken Kat 2'nin arka planda biriken yığınlarını ölçmüyor; oto-toplama artık bunları cüzdana katıyor (Kat 1 kuralının aynısı, ama Kat 2 garsonlu → arka plan geliri). Karar paketine "Kat 2 arka plan oto-toplaması açık mı" sorusu olarak girmeli.

## Bilinen riskler
- `kat2Dongu.ts` / `store.ts` NPC ajanıyla ortak dosya; düzenlemelerim para bölümü ve kat2Tick girdileri ile sınırlı.
- Oto-toplanan yığın `kat2/Para.tsx`'te oyuncuya uçar + "+X" yazar (ESYA'nın dosyası; öneri denetim #20).
- `useKat2Rehber` ipucu panı `hedefEkranda` kapısından geçer; hedef ekrandaysa kamera kıpırdamaz (Kat 1 H1).

## ChatGPT turuna (karar paketi; şu anki hâl `src/i18n/en.ts` 504-507)
| TR (anahtar) | EN (şimdiki) | Nerede |
|---|---|---|
| Oyun Salonu — okey ve tavla masaları | Game Hall — okey and backgammon tables | G-94 ilk çıkış bandı |
| Kahveleri buradan al | Pick up coffee here | G-104 ipucu |
| Bulaşıkları buraya koy | Drop dirty cups here | G-104 ipucu |
| Yeni: Cezve ocağını yükseltebilirsin ☕ | New: You can upgrade the Coffee Station ☕ | G-107 bildirim |

## S5 uygulama turu (2026-11-21) — G-120 M1+M2 · G-128 metni
- **Mantık** `src/components/ui/gorevPano.ts` (saf: `kat1Hat`/`kat2Hat` · `kartVerisi` · `sekmeDuzeni` · `gunlukOzeti`). **Kart** `GorevKarti.tsx` (Kat 1 + Kat 2 + Kat 2 kutlaması aynı bileşen; testid'ler aynen). Geri almak = bu iki dosya + HUD'daki 3 `<GorevKarti>` + `QuestsSheet`.
- **M1:** "GÖREV n/N" (Kat 2: "KAT 2 · GÖREV n/N") · başlık · ödül / çubuk / SIRADA 2 çip; yükseltme durağı (Kat 1 seviye hedefleri, Kat 2 `masaSv`) amber çip. Kart boyu `--bant-ek` ile ölçülür → sağ yığın, bildirim, tepsi/karakter ipucu kartla yükselir (4 kural). Telefon kart 111 px (hap 48), tablet 153 px (zoom 1,4, en 602).
- **M2:** aktif → SIRADA 3 (numaralı; yükseltme amber + "YÜKSELTME") → TAMAMLANAN (katlı) → BUGÜN · GÜNLÜK tek satır (dokun → liste + reklamsız hediye + not). Düzen `data-bolum` ile DOM'da.
- **G-128:** yalnız garson tutulduktan sonraki çoklu kahve görevi: "Garsonlarınla 40 kahve götür" / "Serve 40 coffees with your servers" (`economy.config.ts` yalnız `title` — DENGE'nin dosyası, tek satır). `k2_kahve10` garsondan ÖNCE → metni değişmedi. `k2_tavlaKahve` zaten garsonu sayıyordu, metne dokunulmadı.
- **Bekçi** `tests/s5-ux2.test.ts` (15); mutasyon 6/6 (günlük üstte · sırada aktifi alır · no 0 tabanlı · yüzde kelepçesiz · tamamlanan sırası · sekme 2). Güncellenen eski testler: `ekran-kabugu` #6, `tarama-w4-rehber` (yapı GorevKarti'ye taşındı).
- **Duman:** `smoke.mjs` sekme sırasını denetler + günlüğü açıp sayar; `smoke-en.mjs` katlı satırları açıp tarar. Kareler `docs/kareler/s5-ux2-{telefon,tablet}-{kat1,kat2}-*.png` (araç `tools/s5-ux2-kare.mjs`, port 4171, konsol hatası yok).
- ChatGPT turuna yeni metinler: GÖREV {1}/{2} · KAT 2 · GÖREV {1}/{2} · YÜKSELTME · BUGÜN · GÜNLÜK · {1} günlük görev (· {2} ödül hazır) · Garsonlarınla 40 kahve götür.
