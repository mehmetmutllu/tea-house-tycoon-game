# Kat 2 sprint planı — S1 (ayrıntılı) · S2 · S3 (taslak)

> Durum: **BAŞLADI (2026-11-13).** Kullanıcı "sprint planını yaz, sonra S1'i başlat" dedi.
> Düzen (`feedback_sprint_yontemi`): Claude orkestratör → sözleşme (bu dosya + `kat.ts` §SÖZLEŞME) → 3 paralel Opus ajanı
> (commit yok, rapor ≤ 25 satır, ara not `docs/sprintler/kat2-S1/<ajan>-notu.md`) → Claude birleştirir, test + ≥ 2 mutasyon,
> faz commit'i → `kat2-S1-defter.md`. Fazlar arası "devam edeyim mi" sorulmaz.
> Kaynaklar: `docs/kat2-plan.md` · D-174 · D-179…D-184 · `docs/kat2-dongu-raporu-k2-3.md`.

## Neden sprint
Sıralı gidişte Kat 2'nin kalanı 6-9 oturumdu. Görsel, kasa/çevrimdışı ve tavla birbirinden bağımsız → paralel.
İki yer paralelleşmez: **varyant kapısı** (ölç → sor → uygula; karar paketi tek) ve **K2-5 zincir ölçümü** (bütün
mekanikler kodda olmalı). Bu yüzden 3 sprint: S1 inşa + ölçüm → karar · S2 uygulama + zincir ölçümü → karar · S3 cila + 1.1.

## Ortak sözleşme (Claude yazdı — ajanlar DEĞİŞTİRMEZ, ihtiyacı rapora yazar)
- `src/game/kat.ts` §"SPRINT K2-S1 SÖZLEŞMESİ": `KAT2_SALON_PAD` (`k2salon2` okey salonu · `k2salon3` tavla köşesi) ·
  `kat2AcikAlan(padsDone)` (açık alan TÜRER) · `KAT2_BOLMELER` (tam bölme + kemerli geçitler) · `MasaTuru` ·
  `KAT2_MASALAR` (22 masa: 4 + 6 okey · 12 tavla; kimlik = pad kimliği; ilk dördü `OKEY_YER` sırası).
- `economy.config.ts` S1'de **DEĞİŞMEZ** (varyant kapısı). Yeni sayılar `Kat2Ayar`'ın **opsiyonel** alanları ya da ölçüm
  aracının kollarıdır. `tick.ts` / `rules.ts` değişmez.
- `kat2Tick` okey davranışı **birebir** korunur: `OLCUM=tam npx tsx tools/olcum-kat2-dongu.ts` çıktısı
  `docs/olcum-kat2-dongu-final.txt` ile aynı kalmalı (bekçi `tests/kat2-dongu.test.ts` yeşil).
- Metin TR yazılır, EN karşılığı `src/i18n/en.ts`e Claude ekler (ajan rapora listeler); ChatGPT turu S3'te.
- Her ajan: kendi testleri + `npx tsc --noEmit -p .` + `npx eslint <dosyaları>` temiz. `npm run duman` ajan koşmaz (port).

## Ajanlar (paralel; dosya sahipliği ayrı)

| Ajan | İş | SENİN dosyaların | DOKUNMA | Kabul ölçütü |
|---|---|---|---|---|
| **A · Görsel** (K2-3b) | Kat 2 sahnesi döngüyü göstersin: pad işaretleri (Kat 1 `GroundMarker` dili, `kat2PadYeri`+`padCercevesi(kat2PadEtiket)` çerçevesi) · okey masası D-181 yol G Sv1 · tavla masası yol A Sv1 (KAT2_MASALAR'daki her tür, açıksa) · cezve ocağı 7 (KayKit restoran, ölçek 0,9) + ocak açılınca sol tadilat perdesi kalkar · ocakta hazır fincanlar · dörtlü grup (KayKit müşteri, merdiven sahanlığından masaya yürür → oturur → okey oynar hissi) · kahve balonu (istek sayısı) · oyuncunun tepsisinde kahve · masa önünde para yığını + toplama juice · `kat2AcikAlan`a göre duvar/zemin/bölme+geçit · arka duvar üstü koyu boşluk düzeltmesi · **göster-seç kare seti** (`?k2gorsel=` dev parametresiyle 3-4 aday: kahve balonu, para yığını, arka duvar üstü) | `src/components/three/Kat2.tsx` · yeni `src/components/three/kat2/**` · `Scene.tsx`'in YALNIZ Kat 2 dalı (`Kat2Katman`/`Kat2Sahne` çağrısı) · `tools/_kat-kare.mjs` · yeni `tools/kat2-s1-kare.mjs` | `store.ts` `kat.ts` `kat2Dongu.ts` `tick.ts` `economy.config.ts` `save.ts` HUD/UI | Kat 2'de `__kat2(2)` → pad'de durunca dolar, masa belirir, grup oturur, balon çıkar, kahve alınır/götürülür, yığın düşer ve toplanır (kareler kanıt) · Kat 1 sahnesi birebir · konsol hatası yok · kare işi Kat 1'den kötü değil (sayı notta) |
| **B · Kasa + çevrimdışı** (K2-4, yalnız ÖLÇÜM) | Kat 2'deyken Kat 1 parası bugün 180 sn'de cüzdana kendiliğinden akıyor (sınırsız). D-174 ②: "kasada birikir, kasa dolunca durur". Saf `kasa.ts` (birikim, sınır, boşaltma) + ölçüm aracı: kollar = kasa sınırı (yok / Kat 1 gelirinin 10 · 20 · 40 dk'sı) × Kat 2 arkada (donuk / döner, yığınlar yerde bekler) × çevrimdışı Kat 2 payı (yok / Kat 1 oranıyla). Gerçek `runTick` (bitmiş Kat 1) + `kat2Tick`; senaryo: oyuncu Kat 2'de N dk, sonra Kat 1'e iner. Ölçülen: toplam ₺/dk, kasa taşması (kayıp ₺), Kat 1'e iniş sıklığı, çevrimdışı tavan ihlali | yeni `src/game/kasa.ts` · `tests/kasa.test.ts` · `tools/olcum-kat2-kasa.ts` · `docs/olcum-kat2-kasa.txt` · `docs/kat2-kasa-raporu-k2-4.md` (§Karar BOŞ) | `tick.ts` `store.ts` `economy.config.ts` `rules.ts` `kat.ts` `kat2Dongu.ts` · sahne | araç kısa < 60 sn, tam koşu damgalı (bot yürüdü · ₺ korunumu · varyant etkili) · rapor §Bulgular her kolun sayı satırı · kasanın Kat 1'deki YERİ için 2-3 aday (yalnız yer/ölçü; görsel S2) |
| **C · Tavla + salonlar** (yeni aşama K2-3c) | `kat2Dongu` masa türünü bilsin: tavla 2 kişi, daha kısa oyun, kendi ücret/kahve sayıları (`Kat2Ayar.tavla?` opsiyonel) · masalar `KAT2_MASALAR`dan · salon pad'leri (`KAT2_SALON_PAD`) açılınca alan açılır · `kat2YurumeAlani` açık alanların birleşimi + bölme duvarı KATI, yalnız geçitten geçilir · `kat2Engeller` tavla ayak izini de bilsin · ölçüm aracı: tavla kolları (oyun 60/90/120 sn × kahve ağır/ücret ağır) + 22 masada tek oyuncunun yetişme sınırı (servis %, meşgul) → **Kat 2 garsonu gerekir mi** sorusunun sayısı · zincir sırası önerisi (fiyatsız) | `src/game/kat2Dongu.ts` · `src/game/kat.ts` (sözleşme bölümü HARİÇ) · `tests/kat2-dongu.test.ts` · `tests/kat2-altyapi.test.ts` · yeni `tests/kat2-salon.test.ts` · `tools/olcum-kat2-dongu.ts` · yeni `tools/olcum-kat2-tavla.ts` · `docs/olcum-kat2-tavla.txt` · `docs/kat2-tavla-raporu-k2-3c.md` (§Karar BOŞ) | `store.ts` `economy.config.ts` `tick.ts` sahne/UI | okey çıktısı birebir (yukarıdaki sözleşme) · geçitsiz bölmeden geçilmez, geçitten geçilir · kapalı salona girilmez · tavla döngüsü bekçili · rapor §Bulgular sayı satırları |

**Claude'da kalan (orkestratör):** sözleşme · `store.ts` (kat2AcikAlan → kat2Adim, salon pad'leri, tavla masaları) ·
`devHooks.ts` · `economy.config.ts` (S2'de) · `i18n/en.ts` · duman Kat 2 denetimleri (`tools/duman.mjs`) · birleştirme,
mutasyonlar, karar paketi, defter, hafıza.

## Sıra ve birleştirme (S1)
1. Sözleşme commit'i → üç ajan paralel.
2. Biten ajan: tip + kendi testleri + Claude ≥ 2 mutasyon → commit (B ve C ölçüm commit'leri = varyant kapısının commit #1'i).
3. Claude bağlar (store/devHooks/duman) → `npm run test` + `npm run duman` (+EN) + `npm run build`.
4. **S1 karar paketi (tek mesaj):** ① kasa sınırı · Kat 2 arkada · çevrimdışı (B'nin sayıları) ② tavla oyun süresi/para
   kaynağı + Kat 2 garsonu (C'nin sayıları) ③ görsel adaylar (A'nın kareleri, göstererek). → `kat2-S1-defter.md`.

## S2 (taslak) — uygulama + zincir ölçümü
A: S1 kararlarını koda (kasa store/tick + çevrimdışı · tavla config) · B: Kat 2 garsonu (karar evetse) + seçilen görseller ·
C: K2-5 zincir ölçüm aracı (bitmiş Kat 1'den Kat 2 sonuna; pad fiyat kolları, hedef 4-6 sa) → karar paketi: pad fiyatları.

## S3 (taslak) — cila + 1.1
Fiyatlar koda · ses (okey taşı, zar, cezve) · TR/EN ChatGPT mikrometin · başarımlar · görev hattı (kat bandının yerine) ·
merdiven tamir pad'i + fiyatı · üretim kapısı açılır (`VITE_KAT2`) · 1.1 derlemesi.

## Kapsam dışı (S1)
Pad fiyatları (K2-5) · ses · başarımlar · görev hattı · merdiven tamir pad'i · balkon (D-179 açık) · masa yükseltme
seviyeleri (Sv2-5 görünüşleri D-181'de hazır, mekanik S2/S3) · Puanla.

## Riskler
- A ile C aynı geometriye bakar (bölme/geçit, masa yerleri) → tek kaynak sözleşme; A çizer, C yürütür.
- C `kat2Dongu`yu genelleştirirken okey sayıları kayabilir → birebir çıktı şartı + bekçi.
- B gerçek `runTick`le bitmiş Kat 1 kurar → araç `bitmisKat1` kalıbını `tests/kat2-altyapi.test.ts`ten alır.

## Toplu sorular
Şimdi yok. Bütün sorular S1 sonundaki karar paketinde.
