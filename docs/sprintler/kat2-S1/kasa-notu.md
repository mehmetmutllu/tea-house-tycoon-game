# Ajan B · kasa + çevrimdışı — ara not (K2-4, yalnız ölçüm)

- Kat 1 oyuncu yokken GERÇEK akış ~65-70 ₺/dk; `incomeRate` (çevrimdışı formülü) aynı dükkân için 1.040 ₺/dk
  (~15×). Kasa sınırı `incomeRate`e bağlanırsa hiç dolmaz → araç sınırı kalibrasyonla (ölçülen oran) kurar.
- Kasa ölçüm araçta MUHASEBE: Kat 2'deyken Kat 1'de kaybolan sikke (oto-toplama, 180 sn) kasaya yazılır;
  `tick.ts`/`store.ts` değişmedi. Kasa kolları aynı koşu üstünde paralel; dünyayı yalnız "Kat 2 döner" değiştirir.
- Bot tuzakları (damgalar yakaladı): bitmiş Kat 1'in karakter yükseltmeleri 0 (store tepsi/mıknatısı
  oradan okur) → araç son kademeye çeker · Kat 2 kovası yalnız kuyunun solundaki koridordan çıkılır ·
  okey masasının önü z −3,3'te gövdeye sürtünür → bot ön şeritte (z −3,05) yürür · Kat 1'de BFS
  (`getPlayerNavGrid` + `findNavPath`).
- Çalışma ağacında C ajanı `kat2Dongu.ts`/`kat.ts`'i genelleştiriyor; tam koşu o anki ağaçla alındı.
