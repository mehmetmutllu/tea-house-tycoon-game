# S5 OLCUM — devir notu (2026-11-20, oturum kapanışında kesildi)

`src/**` ve `economy.config.ts` DEĞİŞMEDİ. Rapor `docs/s5-denge-raporu.md` HENÜZ YAZILMADI.

## Hazır ve ölçülen
- **G-92 (Kat 1 tepsi)** — `tools/olcum-s5-kat1.ts`. **TAM koşu bitti, damgalar temiz** → `docs/olcum-s5-kat1.txt`
  (gerçek tick + T9b botu, 8 tohum × 20 dk; ayrıca simulate.ts modeli). Kollar TABAN 30 · F25 · F25·X80 · F25·X60 · F25·X40 (başvuru).
  Bulgu: q_charTray1 açılınca cüzdan HEP 11 coin (table2 + ödül sonrası) → 25 de 30 da "her zaman yetmez"; görev bekleme
  30,6 sn (TABAN) → 23,9 (F25) → 17,7 (X80) → 9,2 (X60) → 0,3 (X40). D-079: ilk alım 19,5 sn ✓, garson ~8,2-8,4 dk ✓ hepsinde;
  garsona kadar en uzun boşluk ~3,9 dk ✗ (2 dk hedefi) AMA bu boşluk `pad waiter` — tepsi kollarından bağımsız. Model (idealize) en uzun 1,55 dk ✓.
  Mutasyon `MUT=x0` doğrulandı (6 damga kırıldı). İkinci mutasyon yapılmadı.

## Araçta hazır, yalnız KISA koşuldu (kısa — rapora girmez)
- `tools/olcum-s5-denge.ts` (Kat 2, U0, kol başına alt süreç): TABAN · KORUNUM · G95-ESKI · G96-KALKIS · G97-S18 · G97-S12 ·
  G103-BULASIKSIZ · SV-EMU0 · G119-K2 · G119-K2T · G128-SAY. Bölümler: ilerleme, tempo (ilk istek/ilk servis/bekleme/kaçan),
  darboğaz payları, Sv kapısı, biriktirme pencereleri (>10 dk, tavla pad'leri), görev süreleri. Mutasyonlar `say0` `cap` `aninda` yazıldı, KOŞULMADI.
- Kısa yön (1,5 sa ufuk): bugün ilk istek oturur oturmaz (0,1 sn; `kat2.ilkKahve: 0`), ilk servis ~2,7 sn; G95-ESKI 27 sn ·
  kahve parası bugün serviste düşüyor (`kahveAninda: true`; G96-KALKIS'te servis yığını 0 ✓) · G97: S18 bekleme 2,8→4,5 sn,
  S12 7,6 sn + %2,9 kaçan, coin/dk ~aynı (451 ↔ 448) · G-103: bekleyen fincan-sn'nin ~%96'sı "tepside" (taşıma), bulaşık ~%0 ·
  G-128: bugün `servis` sayacı yalnız oyuncu (`kat2Gorev.kat2GorevArtisi`: servis − garsonServis); SAY kolunda k2_kahve40 3,1→1,8 dk.
- Bugün Sv görevleri (k2_sv2/k2_sv5) hattın SONUNDA → Sv noktası ancak k2_tavla12'den sonra canlanıyor (`kat2SvCanli`).

## Açık sorunlar (sıradaki oturum önce bunlar)
1. **Determinizm:** aynı TABAN iki ayrı koşuda farklı parmak izi verdi (b8ba9f6a ↔ 5eb3f5c2). KORUNUM = TABAN aynı koşuda tuttu.
   Kaynak bulunmalı (Date.now? kayıt zaman damgası?) — yoksa SV-EMU0 ±%2 damgası ve varyant damgaları güvenilmez.
2. G-103'e "oyuncu kahve taşımaz (yalnız garson)" kolu eklenmeli — bot kusursuz oyuncu, kullanıcının "geç geliyor"u yavaş oyuncuda çıkar.
   "Tepside" payı oyuncu/garson tepsisi diye ikiye bölünmeli.
3. G-119 K3 (kuralın Kat 1'e uygulanması) BAŞLANMADI — Kat 1 masa seviyeleri D-142 görev kapısında (`rules.upgradeSpotLive`);
   gerçek tick botuyla (`olcum-s5-kat1.ts` botu) tam Kat 1 zinciri gerekir.
4. Rapor `docs/s5-denge-raporu.md` yazılmadı (≤25 satır, Karar BOŞ).

## Sıradaki komutlar
```
OLCUM=tam npx tsx tools/olcum-s5-denge.ts > docs/olcum-s5-denge.txt     # arka planda; 11 koşu paralel
MUT=cap   OLCUM=tam KOLLAR=TABAN,G119-K2 npx tsx tools/olcum-s5-denge.ts
MUT=say0  KOLLAR=TABAN,G128-SAY npx tsx tools/olcum-s5-denge.ts
MUT=aninda KOLLAR=TABAN,G96-KALKIS npx tsx tools/olcum-s5-denge.ts
```
