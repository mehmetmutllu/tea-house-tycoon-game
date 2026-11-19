# Kat 2 çarpan + Usta + görev bölme — ara notlar (ölçüm ajanı, 2026-11-19)

- Kat 1 görev ödülü `collectionMult` ile ÇARPILMIYOR (`tick.ts` ~1571 `wallet.add(qReward)`) → Kat 2 görev ödülü de çarpılmaz.
- Kat 2 `kahveAninda: true` → kahve parası serviste masanın yığınına HEMEN düşer; kalkış yığınında `birikim` hep 0.
  Yani masa yığını = iki ayrı `yiginaEkle` çağrısı: kalkışta ücret (`masaUcreti × ucretCarpan[sv]`), serviste kahve (`n × kahveFiyat`).
- Emülasyon yolu: ESM modül bağı değiştirilemez (`type: module`), `kat2Tick` sarılamaz. `kat2Tick` `paralar`ı `slice()`/`filter()`
  ile kopyalar → Array alt sınıfı (Symbol.species) korunur, yığın nesneleri paylaşılır. Araç `paralar`ı `IzliParalar`
  (push kancalı) ile, her yığının `miktar`ını erişimci (setter) ile sarar: `yiginaEkle`nin her eklemesi (yeni yığın = push,
  var olan = `miktar +=`) kancadan geçer, kol çarpanı orada uygulanır. Ücret/kahve ayrımı tutardan: ücret = config'in
  `masaUcreti × ucretCarpan[sv]`'si birebir (kahve 9n/3n ile çakışmaz).
- Korunum: kanca kimlik çarpanla kurulu koşu (KORUNUM) TABAN'la aynı parmak izi vermeli.
- Kat 1 Usta yüzdesi (U-ESIT): servis L6'da müşteri başı fiyat = 0,65×5 + 0,35×25 = 12; L4 bahşiş = 2×4 = 8;
  Usta +0,5×8 = 4 → 4/20 = **+%20**. (Servis ≤L4'te 5+8 → +%30,8; lavabo L6 dahil edilirse 67,3 → +%5,9.)
- 💎: kur() sonunda hedeflerden 200 (U0) / 250 (U20) 💎 birikmiş; gerçek oyuncu bunu Kat 1 Usta'ya harcamış olabilir
  (Kat 1 Usta kuyruğu 20×25 = 500 💎). Bütçe kararı: başta 100 💎 (iki kolda aynı) + Kat 2'de hedeflerden gelen + günlük
  10 💎/gün oranlı; ayrıca DOYGUN kolu (her Sv5 masaya anında Usta) üst sınır.
- Araç: `tools/olcum-kat2-carpan-usta.ts` — kol×senaryo başına alt süreç (paralel); kısa koşu ~80 sn, damgalar temiz.
  MUT=carpan1 kısa koşuda 2 damga kırdı (K2-CARPAN bonusu > 0 · varyant etkili) ✓.
- TABAN tam (görev süreleri, dk): U0 >15 dk = 4 (k2_s2okey6 37,9 · k2_tavla1 17,1 · k2_tavla6 54,7 · k2_tavla12 59,6);
  U20 = 5 (+ k2_s2okey2 16,1). k2_tavla1 tek pad → bölünemez. "k2_garson3 öncesi 38 dk" (tarama) = k2_s2okey6.
  → B-HEPSI = s2okey2 / s2okey6 / tavla6 / tavla12 ikiye; ikiye bölünen tavla görevleri hâlâ ~27-30 dk olacağı için B-UCLU (tavla üçe) eklendi.
- Çevrimdışı: Kat 2 bitince kat2Oran 2.888 coin/dk, Kat 1 ~10.750; 1 sa ham ~409k, para tavanı 19.205 → tavan HER kolda bağlar
  (çarpan/Usta çevrimdışı ödemeyi değiştirmez; yalnız tavanın altındaki kısa dönüşlerde fark eder — 1 sa'de değil).
- Tam koşu (23 koşu, 12 paralel, 1.666 sn): damgalar temiz. Mutasyonların tam koşusu: kahve · sv4 · gorev, üçü de beklenen damgayı kırdı (rapor sonu).
- U-UCRET aslında Kat 1'den cömert: Sv5 okey yığınının ~%67'si ücret → masa geliri +%33 (Kat 1 Usta +%20). Usta başına ≈ 40 coin/dk (U-UCRET) / 21 (U-ESIT); Kat 1 Usta arka planda ≤ ~7.
