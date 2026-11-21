# S5 · GORSEL-B — devir notu (2026-11-21)

Pano `docs/kareler/s5-gb-pano.png` · kareler `docs/kareler/s5-gb-{once,sonra}-*.png` · araç `tools/s5-gb-kare.mjs` (port 4161, HMR kapalı).
Bekçi: `tests/s5-gorsel-b.test.ts` (G-112, G-124) + `tests/esya-s5.test.ts` G-127 bloğu. Mutasyon 9/9 yakalandı (script scratchpad `gb/mut.py`).

## G-127 bakır leğen — BİTTİ
- `kat2/Bulasik.tsx`: su diski (#8fc9d9) kalktı; kirli fincanlar bakır kapağın üstüne oturur (`LEGEN_FINCAN = LEGEN_AGIZ`), gövde boyu aynı sabitten (`h={LEGEN_AGIZ}`). Kenar halkası tepsi dudağı gibi kalır. `LEGEN_SU` silindi (`esyaOlcu.ts`).
- Toplu yıkamanın geçici mavi halkası (`Yikama`, Kat 1 `DishSink.Yikama` deseni) korundu — yüzey değil, anlık efekt.
- Kat 1: karşılığı KayKit lavabo masası (`DishSink`, bakır leğen yok) → değişiklik gerekmedi.

## G-112 Kat 1 mutfak zemini — BİTTİ
- Seçilen çözüm: tema kimliği `klasik` aynen kaldı, yalnız GÖZLERİ Kat 2 mutfağının koyu kahve-krem daması oldu (`kitchenLook.ZEMIN_TEMALARI.klasik = KOYU_KAHVE_KREM`; `koyuKahve` aynı nesne, tek kaynak).
- Gerekçe: kayıt şeması / `ownedCosmetics` / mağaza listesi değişmez → migrasyon yok, `saveVersion` aynı (34). Kaydında `klasik` olan herkes (eski + yeni) koyu kahve-krem görür; `kahve` (10.000) satın alanlar kendi seçimini korur, iki tema ekranda belirgin ayrı (pano).
- `temaNative` artık kimliğe değil gözlere bakıyor (klasik klonlanır). Eski siyah-beyaz `siyahBeyaz` adıyla tanımlı ama mağazada YOK.
- Mağaza önizlemesi: `tools/kucuk-resim.tsx` da `temaNative`e geçti, `public/assets/thumbs/mutfak-klasik.webp` yeniden çekildi (kontakt `docs/tasarim/sprint-B/kucuk-resimler.png` de güncellendi). Etiket "Klasik Dama / Classic Check" hâlâ uyuyor.
- Öneri (karar): siyah-beyaz satılsın mı? İsterse `economy.config` `kitchenThemes`e `{ id: 'siyahBeyaz', label: 'Siyah Beyaz Dama', cost: 10_000 }` + i18n EN satırı + küçük resim (`--yalniz=mutfak-siyahBeyaz`) yeter; DENGE/UX dosyası olduğu için dokunulmadı.

## G-124 oto-toplanan yığın — BİTTİ
- `kat2/Para.tsx`: kaybolan yığın `otoToplandi` ile ayrılır. `kat2Dongu` değişmedi: döngü yığın nesnesinin `yas`ını yerinde artırıp `otoTopla`yı aşanı çıkarıyor → bileşen store'daki nesneyi tutar, son `yas ≥ autoCollectAfter` ⇔ oto. Yedek (nesne kopyalanmışsa): oyuncu mıknatıs + 1 br dışındaysa oto.
- Oto: yerinde 0,35 sn'de küçülüp söner, uçuş ve "+X" yok; bildirim store'un `autoCollectSum` toplu bildirimi (Kat 1 deseni). Elle: aynen uçar + "+X".
- Canlı ölçüm (`.floater` sayısı, 1,2 sn pencere): önce oto 1 / elle 1 → sonra oto 0 / elle 1.
- Not: Kat 1 `Coins.tsx` kaybolan her sikke için floater üretiyor (oto dahil) — "Kat 1 sessiz" varsayımı Kat 1 kodunda tam doğru değil; ayrı iş olarak bakılabilir.

## Testler
- tsc temiz. `esya-s5`, `s5-gorsel-b`, `logic` (kayıt/tema), `zincir-t8a`, `s5-ux`, kayıt testleri yeşil.
- `kat2-gorev` (2), `kat2-masasv` (1), `kat2-carpan-usta` (1) KIRMIZI: görev hattı config/`kat2Gorev.ts` değişikliği (DENGE'nin çalışan değişikliği); GORSEL-B dosyalarına dokunmuyor.
- `npm run duman` koşulmadı.
