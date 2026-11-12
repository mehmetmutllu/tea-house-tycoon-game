# Kat 2 sprint planı — S2: kararlar koda + ölçümler

> Durum: **BAŞLADI (2026-11-13).** Kullanıcı "başla" dedi. Düzen S1 ile aynı (`kat2-S1-plan.md`, `feedback_sprint_yontemi`):
> Claude orkestratör → bu sözleşme → 4 paralel Opus ajanı (commit YOK, rapor ≤ 25 satır, ara not
> `docs/sprintler/kat2-S2/<ajan>-notu.md`) → Claude birleştirir, test + ≥ 2 mutasyon/ajan, faz commit'i → `kat2-S2-defter.md`.
> Kaynaklar: D-185 · D-186 · D-187 · `kat2-S1-defter.md` §S2'ye devreden · `docs/kat2-kasa-raporu-k2-4.md` §S2 dikişleri ·
> `docs/kat2-tavla-raporu-k2-3c.md`.

## Varyant kapısı
- **Uygulanır (sayısı raporda, karar alındı):** D-185 kasa 20 dk · dolunca Kat 1 durur · tezgâh ucu (−10,8; −9,3) yürüyünce boşalır ·
  Kat 1'deyken Kat 2 işler · çevrimdışı iki kat + tavan sıradaki Kat 2 pad'i. D-186 tavla T120U
  `{ oturum: 120, kahveAralik: 25, istekAdet: 1, kahveFiyat: 3, masaUcreti: 51 }` · 2. cezve ocağı · zincir sırası.
- **Ölçülür, karar BOŞ (S2 karar paketi):** Kat 2 garsonunun sayıları (hız, tepsi, kaç garson) · pad fiyatları (K2-5 zincir) ·
  bölme arkasında oyuncu görünmüyor (göster-seç kareleri).
- Garson **yalnız kahve** taşır (tavla masalarına). Yığınları oyuncu toplar — `feedback_active_play_no_overautomation`
  (oto-toplayıcı YOK). D-186'daki "tavla yığın toplama" = oyuncunun işi.
- Yeni pad fiyatları TASLAK (mevcut zincirin deseni: dolum ~3,5 sn); üretimde kapı kapalı, K2-5 sonu karar paketinde değişir.

## Ortak sözleşme (ajanlar DEĞİŞTİRMEZ; ihtiyacı rapora yazar)
**B yazar, A/C/D okur:**
- `kat.ts`: `OCAKLAR: readonly { id; x; z; al: [x, z]; erisim }[]` — `[0]` bugünkü `OCAK` (id `k2cezve`, yer aynı; `OCAK` adı
  `OCAKLAR[0]` olarak kalır), `[1]` id **`k2cezve2`** okey salonunda (alan 1; yeri B seçer, masa ayak izleri + geçitlerle
  çakışmaz). `KAT2_GARSON_PAD = 'k2garson'` (yeri B seçer: tavla köşesinin geçidinin merdiven salonu tarafı ya da köşenin içi).
- `kat2Dongu.ts`:
  - `Kat2Dunya.ocaklar: { id: string; hazir: number; demT: number }[]` (sıra `OCAKLAR`; kapalı ocak hazir 0). `ocakHazir` ve
    `demT` alanları **kalkar**.
  - `Kat2Dunya.garson: Kat2Garson | null` — `{ x; z; tepsi: number; hedef: string | null /* masa ya da ocak id */ }`;
    pad'i yoksa ya da `Kat2Ayar.garson` yoksa `null`.
  - `Kat2Ayar.garson?: { hiz: number; tepsi: number; sayi?: number }` OPSİYONEL (tavla deseni): yoksa garson pad'i açılsa
    da garson gelmez; `kat2ZincirHatasi` uyarır. Config'e S2'de **yazılmaz** (ölçülmedi).
  - `olay.kalkan: string[]` (bu adımda kalkan masa kimlikleri).
  - `Kat2Girdi` alanları **değişmez** (store A'nın; yeni alan gerekirse opsiyonel).
  - Okey davranışı birebir: `OLCUM=tam npx tsx tools/olcum-kat2-dongu.ts | diff - docs/olcum-kat2-dongu-final.txt` boş.
- `economy.config.ts`: **B yalnız `kat2` bloğu**, **A yalnız yeni `kasa` bloğu** (+ gerekirse `offline`). Başka blok yok.
- Metin TR yazılır; EN karşılığını rapora listelersin, `src/i18n/en.ts`e Claude ekler.
- Her ajan: kendi testleri + `npx tsc --noEmit -p .` + `npx eslint <dosyaların>` temiz. `npm run duman` ajan koşmaz.
- Aynı çalışma ağacında 4 ajan var: başkasının dosyasını düzeltme, kırılırsa rapora yaz.

## Ajanlar

| Ajan | İş | SENİN dosyaların | Kabul ölçütü |
|---|---|---|---|
| **A · Kasa + çevrimdışı** (D-185) | Kat 2'deyken Kat 1'in oto-toplaması kasaya · kasa sınırı = ölçülen Kat 1 geliri × 20 dk (oran kaynağı `incomeRate` DEĞİL: çalışan ölçüm, ör. kayan pencere/EMA; kaynağı rapora yaz) · kasa doluyken Kat 1'de müşteri doğmaz · Kat 1'de kasanın erişimine yürüyünce cüzdana boşalır · `kasa` kayda (saveVersion + göç, eski kayıt → 0) · Kat 1'deyken `kat2Tick` de koşar (oyuncu Kat 2'den uzakta; pad dolmaz, servis olmaz, masalar oynar, yığınlar bekler) · çevrimdışı: Kat 2 payı + Kat 1 bitmişse tavan sıradaki Kat 2 pad'i; Kat 2'de kapattıysa Kat 1 payı kasaya, sınırda kesilir · HUD Kat 2'de "Kat 1: X ₺" sayacı + doluluk · Kat 1 sahnesinde kasa objesi (KayKit/ilkel, tezgâh ucunda, dolulukla değişen görünüş) | `src/game/kasa.ts` · `tick.ts` · `store.ts` · `save.ts` · `rules.ts` (yalnız çevrimdışı) · config `kasa` bloğu · yeni `src/components/ui/KasaSayaci.tsx` + HUD'a takma satırı · yeni `src/components/three/Kasa.tsx` + `Scene.tsx` Kat 1 dalına takma satırı · `tests/kasa*.test.ts` · kayıt göç testleri · `tools/olcum-kat2-kasa.ts` · `docs/kat2-kasa-raporu-k2-4.md` (§Uygulama + final tam koşu) | Kat 1 tek başına birebir (Kat 2 kapalı oyuncunun tick'i aynı; mevcut vitest yeşil) · bekçi: dolunca doğum durur, boşaltma, kayıt göçü, çevrimdışı tavan ihlali 0 · final tam koşu damgalı |
| **B · Kat 2 mantığı** (D-186 + garson ölçümü) | Config `kat2.tavla` = T120U · zincir D-186 sırasıyla config'e (taslak fiyat): okey1 → cezve → okey2-4 → k2salon2 → k2s2okey1-2 → k2cezve2 → k2s2okey3-6 → k2salon3 → k2garson → k2tavla1-12 · `kat2ZincirHatasi` config bekçisi · çok ocak (`OCAKLAR`, `ocaklar`) · garson mantığı (ocaktan kahve alır, tavla isteğine götürür; yürüme Kat 2 yürüme alanı + engellerle) · `olay.kalkan` · `kat2PadEtiket` garson + cezve2 · ölçüm aracı garson kolları (hız 2 × tepsi 2 × garson 1/2; bütün zincir açık, son kademe oyuncu okeyde) → rapor §Bulgular, §Karar BOŞ | `src/game/kat2Dongu.ts` · `src/game/kat.ts` (S1 sözleşme bölümü HARİÇ; yeni sabitler eklenebilir) · config `kat2` bloğu · `tests/kat2-*.test.ts` · `tools/olcum-kat2-dongu.ts` · `tools/olcum-kat2-tavla.ts` · yeni `tools/olcum-kat2-garson.ts` · `docs/olcum-kat2-garson.txt` · yeni `docs/kat2-garson-raporu-k2-s2.md` | okey birebir · tavla grubu gelir (config var) · 2. ocak açılınca iki ocak pişirir, oyuncu ikisinden de alır · garson sayısız → gelmez, sayılı → tavla kahvesi taşır · araç kısa < 60 sn, tam damgalı (korunum, varyant etkili) |
| **C · K2-5 zincir ölçümü** | `tools/olcum-kat2-zincir.ts`: bitmiş Kat 1'den Kat 2 sonuna bot oyuncu (Kat 1 arkada `runTick` + kasa muhasebesi — `olcum-kat2-kasa.ts` kalıbı; Kat 2 bot `olcum-kat2-tavla.ts` kalıbı). Kollar: pad fiyat eğrileri (ör. geometrik ×1,35 / ×1,5 / ×1,7 + düz) × başlangıç fiyatı; ölçülen: her pad'in açılış dakikası, toplam süre (hedef **4-6 sa** aktif), en uzun pad bekleyişi, Kat 1'e iniş sayısı, ₺/dk eğrisi. Garson kolu `Kat2Ayar.garson` verilince çalışır (B'nin API'si; B bitmeden sayısız koşar, final koşuyu Claude birleştirmeden sonra alır). Önerilen eğri + gerekçe → rapor §Bulgular, §Karar BOŞ | yeni `tools/olcum-kat2-zincir.ts` · `docs/olcum-kat2-zincir.txt` · yeni `docs/kat2-zincir-raporu-k2-5.md` · `docs/sprintler/kat2-S2/zincir-notu.md` | araç kısa < 60 sn · tam koşu damgalı (bot yürüdü, ₺ korunumu, varyant etkili) · her kolun sayı satırı · fiyatlar KODA yazılmaz |
| **D · Kat 2 görseli** | 2. cezve ocağı (KayKit cezve 7, okey salonunda B'nin yeri; ocak başına hazır fincanlar) · garson figürü (Kat 1 garson gövdesi/dili, tepside kahve; `kat2Dunya.garson`dan TÜRER) · kalkış animasyonu `olay.kalkan`/durum geçişi ile sağlam · kaybeden S1 adayları silinir (`gorselSecim.ts` adaysız; D-187 A/A/A kalır) · `?k2gorsel` kalkar · **bölme göster-seç**: oyuncu bölmenin arkasındayken 3-4 aday (ör. alçak bölme 1,2 · kesik/kemerli üst · oyuncu yakınken bölme saydamlaşır · oyuncu silüeti) aynı kadrajda kareler + pano | `src/components/three/Kat2.tsx` · `src/components/three/kat2/**` · `Scene.tsx` YALNIZ Kat 2 dalı · yeni `tools/kat2-s2-kare.mjs` (S1 aracından) · `docs/sprintler/kat2-S2/kareler/` | Kat 1 sahnesi birebir · konsol hatası 0 · döngü kareleri (2 ocak, garson taşıyor, kalkış) · bölme panosu 1600 px · kare işi sayısı notta |

**Claude'da kalan:** bu sözleşme · `devHooks.ts` (`ocaklar`, `garson`, `kasa` anlık görüntüsü) · `i18n/en.ts` · `tools/duman.mjs`
Kat 2 + kasa denetimleri · birleştirme, mutasyonlar, final tam koşular · S2 karar paketi · defter · hafıza.

## Sıra
1. Sözleşme commit'i → 4 ajan paralel.
2. Biten ajan: tip + testleri + Claude ≥ 2 mutasyon. A ve B uygulama + bekçi; B'nin garson ölçümü ve C = varyant kapısı commit #1.
3. Claude bağlar (devHooks/duman/en) → C'nin aracı birleşik ağaçta final tam koşu → `npm run test` + `npm run duman` (+EN) + `npm run build`.
4. **S2 karar paketi (tek mesaj, sade + örnekli):** ① pad fiyat eğrisi (C) ② garson sayıları (B) ③ bölme görünürlüğü (D'nin kareleri).

## S3 (taslak) — cila + 1.1
Kararlar koda (fiyatlar, garson) · ses (okey taşı, zar, cezve) · TR/EN ChatGPT mikrometin · başarımlar · görev hattı ·
merdiven tamir pad'i + fiyatı · uzak masaya yürüme süresi · masa Sv2-5 · üretim kapısı (`VITE_KAT2`) · 1.1 derlemesi.

## Kapsam dışı (S2)
Masa yükseltme seviyeleri · ses · başarımlar · görev hattı · merdiven tamir pad'i · balkon · uzak masa yürüme süresi
(okey birebir şartını bozar → S3'te varyantla).
