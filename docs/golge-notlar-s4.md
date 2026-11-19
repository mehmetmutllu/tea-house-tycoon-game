# S4 gölge turu — ara notlar

- Araç: `tools/golge-s4-kare.mjs` (kare / perf / envanter / pano kipleri). Envanter = sahnede GÖRÜNÜR ve
  `castShadow` taşıyan mesh'ler, dünya ölçüsü + konum + renk. Gölge çağrısı ≈ görünür gölge döken mesh sayısı
  (K1 taban: envanter 326 ↔ ölçüm 316–326; K2: 219 ↔ 220) — gölge kamerası (±30) bütün katı görüyor, kırpma yok.
- Taban envanterinde "küçük" (en uzun < 0,35 ya da ince < 0,075): K1 69 çağrı, K2 65 çağrı. Gerisi insan
  (skinned, kişi başı 3–6 mesh), masa/oturak, duvar, tezgâh.
- Kat 2'nin KayKit masa modelleri (`Model`) zaten gölge dökmüyor (Model.tsx `castShadow` atamıyor) — bu tur
  dokunulmadı; masa gölgesini Kat 2'de yalnız ilkel `Kutu` masalar (çerçeveli okey Sv4+) veriyor.
- İlk python düzenlemesi CRLF dosyada (lights.tsx) sessizce eşleşmedi → CRLF'e duyarlı yeniden yazıldı;
  bütün dokunulan dosyalarda CR sayısı HEAD ile aynı.
- Önce kareleri: worktree denemesi 403 verdi (gitignore'lu asset yok) → bunun yerine yalnız bu turun yaması
  geri alınıp (`git apply -R`) aynı ağaçta çekildi, sonra yeniden uygulandı.
- Istaka (0,62 × 0,05 × 0,11) boyut kuralına girmiyor (ne küçük ne ince) — Esya.tsx'te zaten `golge={false}`;
  bekçi kaynak taramasıyla tutuyor.
- Kalan küçük gölge dökenler `Scene.tsx`te (dokunulmadı, başka ajanın dosyası): tezgâh bardak/tabakları
  (`Scene.tsx:~601-629`, 8 + 5 + 2 çağrı) ve sokak saksıları (`Scene.tsx:~1332`, 4 çağrı) → raporda öneri.
- Zayıf kol gerçek yolda doğrulandı: localStorage `kiraathane-cihaz-sinifi-v2=zayif` + ayar `golge: 'acik'` →
  `light.shadow.map.width` 1024; `guclu` → 2048.
