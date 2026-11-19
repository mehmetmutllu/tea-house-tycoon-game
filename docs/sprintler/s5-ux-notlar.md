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

## Yarım
- **G-107** yeni nokta panı: mantık + birim testi var (`kat2Noktalar`, `kat2YeniNokta`, HUD `useKat2Rehber`), ama CANLI karede (araç birden çok pad'i aynı anda açıyor: nokta kümesi `pad:k2okey1` → `pad:k2garson2, ocak:k2ocakYuk`) 3,5 sn içinde ne `camFocus` ne ocak bildirimi görüldü. Sıradaki adım: `useKat2Rehber` nokta efektine log koy; şüpheliler (a) görev idx aynı karede ilerleyip `ilerledi` → erteleme, kutlama ise HUD'da hiç başlamıyor olabilir (idx birden çok atladı); (b) `kat2Bildir` kuyruğu tick'in `noticeQueue` yazımıyla eziliyor olabilir. Aracı tek pad açarak da dene.

## Ölçüm (G-124)
- ÖNCE (bu değişiklikten önce, `FINAL=1 OLCUM=tam`): `docs/olcum-s5-ux-g124-once.txt` — U0: Kat 2 biter 7,40 sa · iz 8f5788f8; U20: 7,74 sa · iz ad92f37d. Damgalar temiz.
- SONRA: **yeniden koşulacak** (`FINAL=1 OLCUM=tam npx tsx tools/olcum-kat2-carpan-usta.ts`). Beklenti: bot Kat 2'de yığınları zaten topluyor → iz büyük olasılıkla aynı. **Risk/denge:** araç oyuncunun Kat 1'deyken Kat 2'nin arka planda biriken yığınlarını ölçmüyor; oto-toplama artık bunları cüzdana katıyor (Kat 1 kuralının aynısı, ama Kat 2 garsonlu → arka plan geliri). Karar paketine "Kat 2 arka plan oto-toplaması açık mı" sorusu olarak girmeli.

## Bilinen riskler
- `kat2Dongu.ts` / `store.ts` NPC ajanıyla ortak dosya; düzenlemelerim para bölümü ve kat2Tick girdileri ile sınırlı.
- Oto-toplanan yığın `kat2/Para.tsx`'te oyuncuya uçar + "+X" yazar (ESYA'nın dosyası; öneri denetim #20).
- `useKat2Rehber` ipucu panı `hedefEkranda` kapısından geçer; hedef ekrandaysa kamera kıpırdamaz (Kat 1 H1).

## ChatGPT turuna (TR → EN, `src/i18n/en.ts` sonu)
"Oyun Salonu — okey ve tavla masaları" · "Kahveleri buradan al" · "Bulaşıkları buraya koy" · "Yeni: Cezve ocağını yükseltebilirsin ☕"
