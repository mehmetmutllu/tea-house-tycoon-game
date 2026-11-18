# Son tarama 2026-11-18 — özet (D-203)

6 Opus tarama ajanı (1 Kat 2 mantık · 2 kayıt · 3 performans · 4 oynanış botu · 5 arayüz/metin · 6 reklam/IAP/derleme)
→ 5 düzeltme ajanı (W1-W5, dosya sahipliği) + orkestratör bağlantıları. Ayrıntı: `1-…6-*.md` (bulgular), `duzeltme-W*.md` (yapılan).

## Düzeltildi
- **Kayıt (W1):** 1.0.7 cihazı bulut üzerinden Kat 2'yi silemez (kat bazında birleşim) · Kat 2 kısmi dolum (`padFill`) ve yerdeki
  para kayda girer · Kat 2 görev hattı yüklemede ödülsüz atlamaz · bozuk `saveVersion` sessiz sıfırlamaz · tick dışı XP seviye ekranını açar.
- **Kat 2 yol (W2):** garson/bulaşıkçı tüm 22 masaya ulaşır (tavla 9/10/11 + bulaşıkçı 1/3 takılıyordu) · nokta başına tek para
  yığını · tavla parası yürünür yere · tek tepsi iki kat (orkestratör: store + `tick.ts` `digerTepsi`, `emptyTray('kahve')`).
  Kat 2 bitişi 8,11 → **8,06 sa** (tam koşu `docs/olcum-kat2-isleyis-final-tarama.txt`, denge değişmedi).
- **Performans (W3):** Kat 2 girişinde GPU doku sızıntısı (40 geçiş 71→780 doku → 140'ta sabit) · gizli katın matris/animasyonu
  durur · Kat 2 ikinci girişte takılma 1,0-1,4 sn → 0,06-0,13 sn · Kat 2 kare ort 34-42 → 29-34 ms (4× CPU).
- **Arayüz (W4):** yatay geri bildirim penceresi · görev sayacı kesik · "++" · ₺ → coin/para · Kat 2 garson birimi · KÜNYE yatay ·
  paket rozeti · ölü anahtarlar · Kat 1 sonu → merdiven yönlendirmesi + ok · Kat 2 ok + Görevler listesi + bitiş kutlaması ·
  kat değişince panel kapanır · ödüllü video soğumayı başlatır · iptal satın alma reklamsız · geri bildirimde Kat 2 · analitik.
- **Yayın (W5):** Capacitor 8.4.0 → 8.6.2 (kritik GHSA-rvm3-566m-v7fv) · `npm audit` 0 · Codemagic + `play-hazir-mi` `VITE_KAT2=1`
  + bekçiler (bayrak var, deneme düğmesi yok) · lint yeşil · `firestore.rules` alan sınırları (**deploy edilmedi**) ·
  `denemeKat1Bitir` yalnız deneme/dev derlemesinde çalışır.

## Kullanıcı kararı bekleyenler (kod YOK — varyant kapısı / ürün)
1. Kat 2'de pad / masa Sv / kahve servisi / yıkama XP versin mi (Kat 1 veriyor) — denge.
2. Kat 2 eylemleri günlük görevlere + Hedefler'e sayılsın mı — denge.
3. Çevrimdışı Kat 2 oranı masa Sv + lavabo L2-L6'yı saysın mı · çevrimdışı "İzle" eki kasa tavanıyla kırpılsın mı — denge.
4. "Tavla köşesini doldur" tek bantta 7 pad ~70 dk — bölünsün mü.
5. Gölge: en büyük perf kazancı (13-36 ms) ama görüntüyü değiştirir.
6. Kat 2 ilk giriş takılması ~0,6 sn: Kat 1'deyken arkada önceden kurulsun mu (bellek).
7. Metin turu (ChatGPT): 5-arayuz-metin.md #8, #10-19, #21 + yeni metinler ("Merdiveni onar, Kat 2'yi aç" · "Kat 2 görevleri
   tamamlandı — salon senin." · "Kahveleri bırak" · "Tek seferlik").
8. Play Console başarım açıklamalarında "₺" → "para" elle · `firestore.rules` deploy.
