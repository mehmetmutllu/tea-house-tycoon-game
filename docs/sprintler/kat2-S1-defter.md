# Kat 2 sprint S1 defteri — inşa + ölçüm (2026-11-13)

Plan: `kat2-S1-plan.md` · kararlar: D-185 · D-186 · D-187 · ajan notları: `kat2-S1/` (gorsel · kasa · tavla).
Commit'ler: `2f8a509` sözleşme · `8017868` C tavla+salonlar (ölçüm) · `5c2a87f` store salon yürüyüşü · `b269ec2` B kasa (ölçüm) ·
`ec11273` A görsel · `deede4a` karar paketi.
Doğrulama: vitest **1952/1952** · duman **77/77** · okey ölçüm çıktısı birebir · orkestratör mutasyonları C 3/3 (biri önce kaçtı →
test eklendi) · B 3/3 · store bağlama 1/1.

## Eski → yeni (oyuncunun göreceği — Kat 2 üretimde hâlâ kapalı)
| Konu | Eskiden | Şimdi |
|---|---|---|
| Kat 2 salonu | Boş merdiven salonu | Pad işareti → okey masası belirir → dörtlü grup merdivenden gelip oturur, okey oynar, kahve balonu çıkar |
| Cezve ocağı | Tadilat perdesinin arkası | Ocak açılınca perde kalkar, ocakta hazır fincanlar, oyuncu tepsiye kahve alır |
| Para | — | Oyun bitince masa önünde sikke kulesi, yaklaşınca toplanır |
| Ön salonlar | Kaba inşaat, girilmez | Okey salonu + tavla köşesi pad'le açılır (mantık + çizim); tam bölme, kemerli geçitten girilir; kapalı salonun geçidi tahta perdeli |
| Tavla | — | 2 kişilik masa, zar atılır; sayıları S2'de girecek (o zamana dek grup gelmez) |
| Arka duvar üstü | Koyu boşluk | Aşağıda bahçe |

## Görünmeyen davranış
- `economy.config.ts` S1'de değişmedi; tavla/kasa/çevrimdışı sayıları S2'de koda girer (D-185, D-186).
- Kat 1 parası Kat 2'deyken hâlâ sınırsız akıyor (kasa S2'de).
- Ajan A sözleşme dışı `Player.tsx`e dokundu (tepside kahve); Kat 1'de çizim birebir — kabul edildi.

## S2'ye devreden
- Kasa: `tick` oto-toplama → kasa (Kat 2'deyken) · dolunca müşteri doğmaz · `store`/`save` alanı · tezgâh ucunda boşaltma ·
  HUD "Kat 1: X ₺" sayacı · çevrimdışı Kat 2 oranı + tavan sıradaki Kat 2 pad'i · Kat 1'deyken Kat 2 tick'i.
- `economy.config.kat2.tavla` (T120U) · 2. cezve ocağı (yeri + mantık: `OCAK` tekil) · Kat 2 garsonu · zincir sırası + `kat2ZincirHatasi` config testi.
- Görsel: kaybeden adaylar silinir · bölme arkasında oyuncu görünmüyor (Kat 1 kilitli alan duvarıyla aynı; karar lazım) ·
  `yurume` 5 sn uzak masaya kısa (A görselde 8 sn'ye kadar erken çıkarıyor) · olaylara kalkan masa kimliği.
- K2-5 zincir ölçüm aracı → pad fiyatları karar paketi.

## Nasıl kontrol edersin (geliştirme sunucusunda)
1. `npm run dev` → tarayıcı konsolunda `__kat2(2)` → Kat 2'ye çıkarsın.
2. Sol öndeki işarette dur → dolar, okey masası belirir; ~20 sn sonra dört müşteri merdivenden gelip oturur.
3. Sıradaki işaret ocağın önünde: aç → perde kalkar; masada fincan balonu çıkınca ocağın önünden geç, masaya git → balon söner.
4. 3 dk sonra grup kalkar, masa önüne sikke kulesi düşer; yaklaşınca toplanır.
