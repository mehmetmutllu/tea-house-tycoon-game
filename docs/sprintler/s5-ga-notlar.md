# S5 GÖRSEL-A — notlar (2026-11-21)

Pano `docs/kareler/s5-ga-pano.png` (önce | sonra, 1600 px). Kareler `docs/kareler/s5-ga-{once,sonra}-*.png`
(araç `tools/s5-ga-kare.mjs`; "önce" HEAD 0da05f3'ün ayrı çalışma ağacından, aynı betik). Bekçi `tests/s5-gorsel-a.test.ts` 11/11.

| G | Ne | Dosya | Mutasyon |
|---|---|---|---|
| G-102 C | mutfak/kova duvarı alçak 1,0 (`AlcakBolme`, D-198 dili) | `kat2/yapiOlcu.MUTFAK_SAG_DUVAR`, `Kat2.Duvarlar`, `Bolme` (export) | duvar boyu `BAND.front`a → yakalandı |
| G-111 | duvarın ucu ön tezgâhın arka yüzünde biter; tezgâhın ucu açıkta | aynı; `Mutfak.OnTezgah` değişmedi | aralık 0,3 → yakalandı |
| G-114 B | ön duvar iki katta 1,0. Kat 1: vitrin + söve/lento/alınlık/kordon gitti, giriş 2 direk (1,3, başlıklı) | `wallOlcu.ON_DUVAR_H/KAPI_DIREK_H`, `wallLook.kat1DuvarParcalari`, `Scene.Walls`, `yapiOlcu.kenarBoyu`, `Kat2.hat` | ön→arka, h kırpma yok, `c === H` silindi → 3/3 yakalandı |
| G-115 C | alt kat gövdesi (sıva + silme + 6 koyu cam) + dipte gri sokak + asfalt | `kat2/Dis.AltKat`, `yapiOlcu.ALT_KAT/altKatCamlari` | z1 = H, cam y −0,3 → 2/2 yakalandı |

- G-111 varyantları: V1 duvar tezgâha değer (seçildi) · V2 0,3 aralık (`s5-ga-v2-k2-birlesim-yakin.png`): arada mutfak zemini görünüyor, kötü.
- Ön duvar kırpma (`onKirp`) gerekmedi: geometri doğrudan alçak.
- AÇIK: Kat 1 TENTE + ALINLIK TABELASI (D-156, kafe adı) dayanaksız kaldığı için çizilmiyor (`Scene.Street`). `tests/tabela-f4c3`
  "Scene'de `<Tabela x={e[0]} />`" satırı bu yüzden kırık → kafe adının yeni yeri kullanıcıya sorulmalı (kod `Tabela.tsx` duruyor).
- `Scene.Vitrin` silindi; `cepheLook` (ölçü + bekçisi) duruyor, artık çizimde kullanılmıyor.
- `kat.ts` değişmedi; çarpışma (`kat2Duvarlar`) kova hattında aynı (görüntü kısaldı, tezgâh gövdesi boşluğu kapatıyor).
