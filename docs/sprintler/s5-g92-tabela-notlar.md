# S5 — G-92 ilk tepsi + kafe adı tabelası (2026-11-21)

## G-92 (F25·X40 üretimde)
- `economy.config` Kat 1: `character.tray.costs[0]` 30 → 25 · `tray.ilkTamamla = { gorev: 'q_charTray1', oran: 0.4 }`.
  Kural tek yerde: `charTamamlanir()` (economy.config) — `store.buyCharUpgrade` (cüzdan sıfırlanır) ve `CharacterPanel`
  (düğme açık, "eksik" satırı yok; ek metin yok) aynı fonksiyonu okur. Oyun en çok 25 × 0,6 = 15 coin öder.
- Bekçi `tests/g92-ilk-tepsi.test.ts` (6). Mutasyon 3/3 yakalandı: kural kapalı · cüzdan sıfırlanmaz · görev koşulu yok.
- Final `docs/olcum-s5-kat1-final.txt` (`OLCUM=tam KOLLAR=TABAN`, damgalar temiz): bekleme 0,3 sn (0,6) · ilk alım 19,5 ·
  garson 8,03 dk — rapordaki F25·X40 ile tohum tohum aynı. Araç: `KOLLAR=` süzgeci eklendi.
- `tools/simulate.ts` kuralı BİLMİYOR (25'i tam biriktirir). Eklenince `meta-pencere` §5 (H/R/E yığın bekçisi, 1 sn'lik
  eşleşmeler) kırıldı → geri alındı; modelin kuralı öğrenmesi ayrı karar.
- Test güncel: `logic.test` (25, 200−25 = 175), `zincir-t8a` (25).

## Kafe adı tabelası (D-156'nın yeni yeri)
- `streetLook.KEMER/TABELA`: direk başlıklarından (1,40) iki koyu dikme → kiriş y 2,55 → levha 3,4 × 0,46 iki askıyla sarkar,
  0,22 rad kameraya eğik, alt ucu 1,95 (insan 1,75 altından geçer). `Tabela.tsx` kemeri de çizer; `Scene.Street` `<Tabela x={e[0]} />`.
  `ALINLIK_ORTUCU_ON_Z` silindi (alınlık yok). TENTE ölçüleri duruyor, çizilmiyor.
- `tests/tabela-f4c3` geometri bölümü yeni yere göre (5 denetim); "store'dan okur" denetimi kaldı. Mutasyon 3/3:
  Scene'den sil · levha 1,9'a in · eni 4,4.
- Kareler `docs/kareler/s5-tabela-{kisa,uzun}-*.png` (araç `tools/s5-tabela-kare.mjs`, port 4181). 20 harf
  ("Çınaraltı Kıraathane") taşmıyor. BEDEL: oyuncu kapının ~0,8-2,0 m içindeyken gövdesi levhanın arkasında kalıyor
  (baş ve ayak görünür: `*-oyun-ic-bos`, `*-oyun-ic2-bos`); kapı paspası ve giriş açık.
