# Ajan B — Kat 2 mantığı (D-186) + garson ölçümü — ara not

Durum: BİTTİ (commit yok). Rapor `docs/kat2-garson-raporu-k2-s2.md` · ham `docs/olcum-kat2-garson.txt` (tam ~6 sn, kısa ~1,5 sn).

- Config `kat2`: `tavla` = T120U (tavla aracı damgası "config.tavla = T120U" temiz) · zincir D-186 sırasıyla, `k2salon2`den sonrası TASLAK (K2-5).
- Zincir bekçisi ikiye ayrıldı: `kat2YapiHatasi` (bozuk zincir) + `kat2EksikSayi` (tavla/garson sayısı yok); `kat2ZincirHatasi` = ikisi.
  Config bekçisi: yapı null, eksik TAM "k2garson: garson sayıları (Kat2Ayar.garson) yok" (karar gelince null'a çevrilir).
- `OCAKLAR[1]` k2cezve2 (−4,5; 0,54), al (−4,5; 1,71); gövdesi `kat2Engeller`de katı. `KAT2_GARSON_PAD` k2garson, `KAT2_GARSON_YER` (4; 1,6).
- Yol: `kat2YolAgi(padsDone)` — nav.ts ızgarası (0,3, oyuncu yarıçapı) + Dijkstra uzaklık alanı (hedef başına önbellek) + görüş kestirmesi;
  adım `kat2Adim`. Hata bulundu/düzeltildi: Float32 uzaklık + Float64 öncelik → düğüm atlanıyordu (M3 bunu bekçiler).
- Mutasyon 5/5 yakalandı: garson okeye taşır · garson düz yürür · Float32 alan · 2. ocak gövdesi katı değil · 2. ocak pişirmez.
- Kırık (benim değil): `kat2-dongu.test` "Kat 1'deyken Kat 2 dünyası işlemez" (A'nın D-185'i bunu kasıtlı değiştirdi) · `i18n.test` (A'nın 3 metni).
