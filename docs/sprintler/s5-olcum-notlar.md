# S5 OLCUM — devir notu (2026-11-20, ikinci tur sonu)

`src/**` ve `economy.config.ts` DEĞİŞMEDİ. Rapor YAZILDI: `docs/s5-denge-raporu.md` (§Bulgular + karar paketi taslağı, KARAR BOŞ).

## Bitti
- **Determinizm:** rastgelelik değil — b8ba9f6a = 4713156 kodu; YAPI G-110 `kat.OCAK_AL_DZ` 0,6→1,05 izi 5eb3f5c2'ye çevirdi
  (4713156 + bugünkü kat.ts = 5eb3f5c2). TABAN iki kısa koşu + saat ±12 sa/±3 gün → aynı iz. Araç çıktısına `Kod:` satırı eklendi
  (koşu başında HEAD + src farkı izi).
- `tools/olcum-s5-denge.ts`: yeni kollar G103-GARSON (garson gelince oyuncu kahve/kirli taşımaz; G-128 sayımı açık) · G124-ACIK /
  G124-KAPALI (20 dk Kat 2 / 10 dk Kat 1 döngüsü, oto-toplama açık/kapalı) · G124-KAT2-KAPALI (bulgu damgası: iz = TABAN).
  §3 "tepside" = oyuncu + garson. Yeni mutasyon `MUT=oto`.
- TAM koşu `docs/olcum-s5-denge.txt` (15 kol, damgalar temiz, 844 sn) · G-124 SONRA `docs/olcum-s5-ux-g124-sonra.txt`
  (FINAL iz damgası beklenen kırık: donmuş S5-öncesi izle karşılaştırıyor) · mutasyon 4/4 yakalandı (say0, aninda, oto kısa; cap tam).

## Açık
- **G-119 K3** (Kat 1'e uygulanması) ÖLÇÜLMEDİ — Kat 1 masa Sv'leri D-142 görev kapısında (`rules.upgradeSpotLive`); `olcum-s5-kat1.ts`
  botuyla tam Kat 1 zinciri gerekir.
- G-103 bulgusu: gecikme taşıyıcı kapasitesinden (ocakta hazır bekleyen %42-50; bulaşık %0). Garson tepsi/hız kolu istenirse ayrı tur.
- UX notu (G-124): oto-toplanan Kat 2 yığını `kat2/Para.tsx`te hâlâ oyuncuya uçup "+X" yazıyor (UX ajanının açık maddesi).

## Komutlar
```
OLCUM=tam npx tsx tools/olcum-s5-denge.ts > docs/olcum-s5-denge.txt
MUT=cap OLCUM=tam KOLLAR=TABAN,G119-K2 npx tsx tools/olcum-s5-denge.ts
MUT=say0 KOLLAR=TABAN,G128-SAY · MUT=aninda KOLLAR=TABAN,G96-KALKIS · MUT=oto KOLLAR=TABAN,G124-KAPALI
```
