# Kat 2 = Kat 1 eşitliği — rapor (2026-11-18)

**Soru:** Tarama 2026-11-18'in kullanıcı kararı bekleyen 1-3. kalemleri (`docs/tarama-2026-11-18/README.md`; ayrıntı
`1-kat2-mantik.md` #5 #6 · `6-reklam-iap-derleme.md` #5 #7 · `4-oynanis.md` #3): Kat 1'in verdiği XP, günlük görev/Hedefler
sayımı ve çevrimdışı kuralları Kat 2'de de olsun mu? Kollar dengeyi (XP → seviye ödülü + taşıma hızı, 💎 akışı, çevrimdışı coin)
değiştirdiği için varyant kapısından geçer.

**Araç:** `tools/olcum-kat2-esit.ts` — oyunun KENDİ store'u koşar: bot Kat 2'de (Kat 1 arkada kendi personeliyle, D-198 parası
cüzdana), seviye ekranı çıkınca ödülü izlemeden alır; başlangıç Kat 1 görev hattı sonu (ocak L6 · lavabo L6 · personel tavan) ·
karakter tavan · seviye 12 (varsayım, iki kolda aynı) · Kat 2 ilk çıkış. Çevrimdışı: oyunun `onPlanaDon`u (koşunun son durumu =
bitmiş Kat 2) + kolun formülü (araç formülü TABAN'da oyunla birebir — damga). Ham çıktı `docs/olcum-kat2-esit.txt` (TAM, damgalar temiz).

**Kollar:**
- **TABAN** — kod olduğu gibi.
- **K1-ESIT** (dördü birlikte) — 1) XP: Kat 2 pad `perPad` · masa Sv `perUpgrade` · elle kahve `perTeaServed` · garson kahvesi
  `perWaiterServed` · oyuncunun yıkadığı fincan `perDishWashed` (bulaşıkçınınki sayılmaz — Kat 1). 2) Günlük görev + Hedefler:
  elle/garson servisi, yığın toplama, yıkama, ocaktan alma Kat 1 metriğine (tost hariç); arka planda yalnız garson. 3) Çevrimdışı
  Kat 2 oranı masa Sv çarpanları + `kat2EtkinAyar` (lavabo L2-L6, ocak). 4) "İzle" eki gösterilen tutardan: ek ≤ (claimMult − 1) ×
  gösterilen. Araçta emüle: XP/sayaç store'un kare farkından, XP oyunun tick dışı yolu `xpBekleyen`'den.

## §Bulgular

Kaynak: `docs/olcum-kat2-esit.txt` (OLCUM=tam, 503 sn, damgalar temiz).

| ölçü | TABAN | K1-ESIT |
|---|---|---|
| Kat 2 zincir biter | 4,99 sa | 4,99 sa |
| **Kat 2 biter** (zincir + Sv5 + yükseltmeler) | **8,27 sa** | **8,22 sa** |
| seviye (baş → son) | 12 → 12 | 12 → 14 |
| Kat 2 süresince XP | 6.964 | 31.299 |
| seviye ödülü (coin, izlemeden) | 0 | 4.188 |
| günlük sayaç / sa: servis · elle · para · yıkama · ocaktan · garson | 757 · 0 · 0 · 0 · 0 · 757 | 2.763 · 407 · 1.586 · 392 · 407 · 2.356 |
| 1 sa Kat 2'de biten günlük görev (tost hariç 7 şablon) | 3/7 | 7/7 |
| beklenen 💎/gün (1 sa Kat 2 oyunu) | 4,3 | 10,0 |
| çevrimdışı Kat 2 oranı (bitmiş Kat 2, rateMult öncesi) | 1.043 coin/dk | 2.888 coin/dk |
| çevrimdışı dönüş, **Kat 2'de kapattı**: 10 dk / 1 sa / 8 sa (taban · İzle eki) | 16.920 · 0 (üçü aynı) | 19.205 · 0 (üçü aynı) |
| çevrimdışı dönüş, Kat 1'de kapattı: 10 dk / 1 sa / 8 sa | 19.205 · 0 | 19.205 · 0 |

**Bulgu 1 · XP tempoyu bozmuyor:** Kat 2 boyunca XP 4,5 kat (6.964 → 31.299), oyuncu 2 seviye atlıyor; seviye ödülü toplam
4.188 coin (Kat 2 süresince kazancın %0,4'ü). Kat 2 süresi 8,27 → 8,22 sa (−3 dk). TABAN'da Kat 2 oyuncusu 8 saatte HİÇ seviye
atlamıyor (XP yalnız görev/ocak/lavabo/panel + arkadaki Kat 1 garsonundan).

**Bulgu 2 · Günlük 💎 akışı Kat 2'de yarıdan tama:** TABAN'da Kat 2'de oynayan oyuncu yalnız "servis", "garson", "kazan"
görevlerini ilerletiyor (arkadaki Kat 1 garsonu + kazanç); "elle", "para topla", "yıkama", "ocaktan al" ∞. K1-ESIT'te yedisi de
≤ 7 dk'da biter (hedefler Kat 1 masa sayısına ölçekli). Para sayacı yığın başına 1 sayar; kahve parası anında yığına düştüğü için
(D-198) toplanan yığın ~ servis sayısı kadar — "80 para topla" 3 dk.

**Bulgu 3 · Çevrimdışı: bitmiş Kat 2'de tavan 10 dk'da bile bağlıyor.** Sv5 + lavabo L6 Kat 2 oranını 2,8 katına çıkarıyor
(1.043 → 2.888 coin/dk), ama para tavanı (19.205) her yoklukta bağlı. Etki tek yerde: Kat 2'de kapatan oyuncunun Kat 1 payı
ham paylarla orantılı bölündüğü için, Kat 2 payı büyüyünce Kat 1 kesintisi artık bağlamıyor → 16.920 → 19.205 (+%13,5), yani
Kat 1'de kapatanla aynı. Kat 1'de kapatanda değişiklik yok.

**Bulgu 4 · "İzle" eki bitmiş Kat 2'de zaten 0:** tavan ham tutarın altında olduğu için ek her üç süre için 0 (D-150 kuralı: düğme
çizilmez). Kırpma yalnız tavan bağlamayan kısa yoklukta + Kat 1 kesintisi bağlarken devreye girer; bekçi senaryosunda (Kat 1
bitmiş, Kat 2 başı, 60 sn, kesinti ~100 coin) TABAN eki gösterilenin 1,7 katı (546 vs 326) — izleyen 2× yerine ~2,7× alır.
K1-ESIT'te ek = gösterilen (tam 2×).

## §Karar

(boş — karar paketi bekleniyor)

## §Uygulama

(boş)
