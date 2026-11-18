# Hedefler'de Kat 2 — Mekân + Usta + KÜNYE — rapor (2026-11-18)

**Soru:** Kullanıcı 2026-11-18: *"kat1de olan 2de de olsun"* + *"eklemek mantıklıysa ekle"*. D-204 Kat 2 servis/yıkama
sayaçlarını Hedefler'e ekledi; "Mekân" (`pads`, "Açılan masa · salon · personel") ve "Usta" (`masterTables`, "Son seviyeye
çıkardığın masa") Kat 1'de kaldı. İstatistik (KÜNYE) paneli yalnız Kat 1'i gösteriyor. Hedef ödülü KALICI gelir çarpanıdır
(D-089/D-090: 25 kademe × %0,4) → Kat 1 gelirine biner → varyant kapısından geçer.

**Kat 1 nasıl sayıyor (mirror kuralı):** `goalMetricsOf.pads = padsDone.length` — bedava başlangıç masası `padsDone`ta YOK
(sayılmaz); merdiven pad'i (D-192, 9.400 coin, ücretli) de `padsDone`a girmiyor (kat `kat2.acik` ile açılır) → bugün hiçbir
yerde sayılmıyor. `masterTables` = tavan seviyedeki Kat 1 masası, başlangıç masası DAHİL.

**Araç:** `tools/olcum-kat2-hedef.ts` — D-204 aracının botu ve başlangıcı (Kat 1 görev hattı sonu · karakter tavan · seviye 12 ·
Kat 2 ilk çıkış), oyunun KENDİ store'u. Bot toplanabilir hedefi hemen toplar. Hedeflerde Servis/Kazanç/Temizlik başta bitmiş
varsayılır (iki kolda aynı; kollar yalnız Mekân/Usta'da ayrışsın). Kat 1 masa seviyesi bilinmediği için üç senaryo: Kat 1'in
20 masasından **0 / 10 / 20'si** tavanda (L4), kalanı L0. Ham çıktı `docs/olcum-kat2-hedef.txt` (TAM, damgalar temiz).

**Kollar:**
- **TABAN** — kod olduğu gibi.
- **HEDEF-K2** — Mekân += merdiven pad'i (1) + Kat 2'nin ücretli pad'leri (`kat2.hazir` hariç — Kat 1 başlangıç masası gibi);
  Usta += Sv5'teki açık Kat 2 masası (hazır masa dahil — Kat 1 başlangıç masası gibi). KÜNYE'ye Kat 2 satırları (dengeye
  dokunmaz). Araçta emüle: ödül `claimGoalReward` (oyunun tek karar yeri) + store'un yaptığının aynısı (💎 · XP).

## §Bulgular

Kaynak: `docs/olcum-kat2-hedef.txt` (OLCUM=tam, damgalar temiz).

| ölçü | TABAN · U0 | HEDEF-K2 · U0 | TABAN · U10 | HEDEF-K2 · U10 | TABAN · U20 | HEDEF-K2 · U20 |
|---|---|---|---|---|---|---|
| **Kat 2 biter** (zincir) | 7,91 sa (4,72) | 7,91 sa (4,72) | 8,44 sa (5,12) | 8,44 sa (5,12) | 8,34 sa (5,03) | 8,34 sa (5,03) |
| Usta kademe: baş → Kat 2 sonu | 0 → 0 | 0 → **5** | 3 → 3 | 3 → **5** | 5 → 5 | 5 → 5 |
| Mekân kademe: baş → Kat 2 sonu | 5 → 5 | 5 → 5 | 5 → 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| Usta kademesi Kat 2'de alındığı saat | — | 4,91 · 5,29 · 6,25 · 7,06 · 7,70 | — | 5,93 · 7,08 | — | — |
| **kalıcı gelir çarpanı** baş → Kat 2 sonu | +%8,0 → +%8,0 | +%8,0 → **+%10,0** | +%9,2 → +%9,2 | +%9,2 → **+%10,0** | +%10,0 | +%10,0 |
| 💎 (hedeflerden, Kat 2 süresince) | 0 | 50 | 0 | 34 | 0 | 0 |
| Kat 1 arka plan geliri (coin/dk, Kat 2 süresince ort.) | 817 | 816 | 705 | 707 | 722 | 722 |
| Kat 2 geliri (coin/dk) | 1.380 | 1.381 | 1.352 | 1.352 | 1.362 | 1.362 |
| XP (Kat 2 süresince) | 30.416 | 30.281 | 30.630 | 30.773 | 30.471 | 30.471 |

**Bulgu 1 · Mekân kolu sayıda etkisiz:** Kat 1'in 24 omurga pad'i merdivenden ÖNCE bitmek zorunda (`kat1OmurgaBitti`) ve son
Mekân kademesi 24 → Kat 2'ye çıkan herkes Mekân'ı 5/5 bitirmiş durumda. Kat 2 sayılsa da (metrik 24 → 54) toplanacak kademe yok.
Etkisi yalnız görünür sayaçta ("54/24").

**Bulgu 2 · Usta kolu Kat 2'nin ikinci yarısında 0-5 kademe verir:** Kat 1 masalarının hiçbiri tavanda değilse beş Usta kademesi
Kat 2'de 4,9-7,7 sa arasında açılır (+%2,0 kalıcı gelir, 50 💎); yarısı tavandaysa iki kademe (+%0,8, 34 💎); hepsi tavandaysa
(20 masa = son kademe) hiçbiri. Son kademe (20) Kat 1'in 20 masasıyla zaten ulaşılabilir — kol tavanı aşmaz, yalnız oyuncuyu
oraya Kat 1 masalarını yükseltmeden de götürür. Toplam koleksiyon tavanı (+%10) değişmez.

**Bulgu 3 · Tempoya etki yok:** Kat 2 bitişi üç senaryoda da aynı (7,91 / 8,44 / 8,34 sa). Kat 1 arka plan geliri −%0,1 / +%0,3
(gürültü içinde: kademeler Kat 2'nin son üçte birinde geliyor, çarpan Kat 1 kişi başı ücrete biniyor; arka plan Kat 1'i garson
taşımasıyla sınırlı). Kat 2 geliri değişmiyor — hedef çarpanı bugün Kat 2 gelirine binmiyor (aşağıda "Birebir olmayan").

**Bulgu 4 · XP:** her kademe `perQuest` (25) XP; U0'da 5 kademe = 125 XP — seviye eşiğinin yanında gürültü (30.416 → 30.281
fark yol farkından).

**Not (senaryo, karar dışı):** U10'da Kat 1 arka plan geliri U0'dan düşük (705 vs 817) — Kat 1 masalarının L4'te büyüyen grubu arka
plan garsonunun taşımasını aşıyor; iki kolda aynı, bu turun konusu değil.

**ChatGPT turuna (yeni TR+EN metin, `src/i18n/en.ts`):**
- "Kat 2 · servis edilen kahve" / "Floor 2 · Coffee Served"
- "Kat 2 · yıkanan fincan" / "Floor 2 · Cups Washed"
- "Kat 2 · açılan nokta" / "Floor 2 · Points Unlocked"

## §Karar

(boş — karar paketi bekliyor)
