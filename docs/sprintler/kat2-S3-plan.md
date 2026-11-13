# Kat 2 sprint planı — S3: masa yükseltmesi · ses · görev hattı + başarımlar

> Durum: **BAŞLADI (2026-11-13).** Kullanıcı "sıradan devam, sprint mantığında" dedi; ürün soruları soruldu:
> görev hattı **Kat 1 gibi** · başarım **5-6** · masa Sv kolu: "kazandırdığı para ideal şekilde artsın — grup hızı, kahve,
> masa ücreti; mantıklı kombinasyon ne ise" → **bütün kollar + karışımlar ölçülür, öneri en kaliteli kol**.
> Düzen S1/S2 ile aynı (`feedback_sprint_yontemi`): Claude orkestratör → bu sözleşme → 4 paralel Opus ajanı (commit YOK,
> rapor ≤ 25 satır, ara not `docs/sprintler/kat2-S3/<ajan>-notu.md`) → Claude birleştirir, test + ≥ 2 mutasyon/ajan →
> `kat2-S3-defter.md`. Üretimde kapı kapalı (`kat2Etkin`).

## Neden
Kat 2'nin son pad'i açılınca oyuncunun yapacak işi kalmıyor (masa Sv yok), Kat 2 sessiz, görev şeridi Kat 2'de susuyor,
başarım/analitik Kat 2'yi görmüyor. Bunlar 1.1'den (üretim kapısı açılışı) önceki son büyük parçalar.

## Varyant kapısı
- **Ölçülür, karar BOŞ (S3 karar paketi):** masa Sv'nin ne verdiği ve fiyatı (A). Config'e masa Sv sayısı YAZILMAZ;
  `Kat2Ayar.masaSv` opsiyonel (garson deseni): yoksa Sv tetiği çizilmez, oyun bugünküyle birebir.
- **Taslak (kapı kapalı, final zincir koşusunda ölçülür):** görev ödülleri (D) Kat 1'in ödül kuralıyla aynı ölçekte.
- Sv yükseltmesi Kat 1 dili: **obje-başı**, her masanın yanında ayrı ÇERÇEVE (D-121: tetik = çizilen dikdörtgen, dolum
  aynı dikdörtgen testi), altta dolan bar, durunca dolar (hareket-temelli). Altın halka / dünya-içi "L" yazısı YOK.

## Ortak sözleşme (A yazar — İLK İŞ olarak, imza + basit gövde; B/C/D okur)
`src/game/kat2Dongu.ts`:
- `Kat2Ayar.masaSv?: { okey: Kat2SvKol; tavla: Kat2SvKol }` — `Kat2SvKol = { fiyat: number[]; ucretCarpan: number[];
  kahveAralikCarpan: number[]; gelisAralikCarpan: number[] }` (indeks 0 = Sv1 = 1,0; uzunluk 5). A gerekirse alan
  ekleyebilir (opsiyonel), ad değiştirmez.
- `Kat2Girdi.masaSv?: Readonly<Record<string, number>>` (masa id → 1..5; yok = 1).
- `export function kat2SvTetikleri(ayar: Kat2Ayar, padsDone: readonly string[], masaSv: Readonly<Record<string, number>>):
  { id: string /* 'sv:' + masaId */; masaId: string; tur: MasaTuru; sv: number /* şimdiki */; fiyat: number; x: number;
  z: number; w: number; d: number }[]` — yalnız açık masalar, Sv < 5, `ayar.masaSv` varsa.
- Sv dolumu `padFill['sv:<masaId>']` (pad deseni); tamamlanınca `olay.svAtlayan: string[]` (masa id). `Kat2Cikti`'ye
  alan eklenir; Sv'yi `kat2Tick` artırmaz — store `kat2.masaSv`'yi günceller (pad tamamlanma deseniyle aynı yol).
`src/game/kat.ts`: `Kat2Kayit` additive: `masaSv?: Record<string, number>` · `gorev?: { idx: number; sayac: Record<string, number> }`
  (D'nin; A yalnız kayıt/göç/varsayılan + store alanını açar). `saveVersion` ARTMAZ (D-182 additive deseni).
Kat 2 olay sayaçları (D'nin görevleri + C'nin sesleri için) — A, `Kat2Cikti.olay`ı korur/genişletir; alanları rapora yazar.

Ortak kurallar: metin TR yazılır, EN rapora listelenir (`i18n/en.ts`e Claude ekler) · her ajan kendi testleri +
`npx tsc --noEmit -p .` + `npx eslint <dosyaların>` temiz · `npm run duman` ajan koşmaz · başkasının dosyasını düzeltme,
kırılırsa rapora yaz · ham sayı Number değil, para hesabı mevcut desenle (kat2 sim Number kullanıyor — aynı kalır).

## Ajanlar

| Ajan | İş | SENİN dosyaların | DOKUNMA | Kabul ölçütü |
|---|---|---|---|---|
| **A · Masa Sv mantığı + ölçüm** | Sözleşme (önce) · Sv etkisi tick'te (ücret × , kahve aralığı × , grup geliş aralığı ×) · tetik dikdörtgeni (masanın yanında, geçit/oturak/diğer pad'le çakışmaz; Kat 1 `tableUpgrade` çerçeve ölçüsü) · kayıt (`masaSv`, `gorev` alanları) + store eylemi (Sv tamamlanınca seviye + cüzdandan düşüm, pad deseni) · ölçüm aracı `tools/olcum-kat2-masasv.ts`: bitmiş Kat 2 zinciri + Sv kolları — **tek kol** (yalnız ücret · yalnız kahve · yalnız geliş) ve **karışımlar** (en az 3) × fiyat eğrisi (en az 2: ör. SB9 kuralı "o anki gelirin ~9 dk'sı" ve geometrik). Ölçülen: Sv başına coin/dk artışı, geri ödeme süresi (dk), bütün Sv'lerin bitiş süresi, okey/tavla dengesi, kahve servis yükü (oyuncu + garson yetişiyor mu — taşıma tavanı!), en uzun bekleyiş | `src/game/kat2Dongu.ts` · `src/game/kat.ts` · `src/game/store.ts` · `src/game/save.ts` · `tests/kat2-*.test.ts` (yeni: `kat2-masasv.test.ts`) · `tools/olcum-kat2-masasv.ts` · `docs/olcum-kat2-masasv.txt` · `docs/kat2-masasv-raporu-k2-s3.md` (§Bulgular dolu, §Karar BOŞ) | config (`economy.config.ts`) · `components/**` · audio · basarim/quest dosyaları | `ayar.masaSv` yokken bütün eski Kat 2 testleri + `olcum-kat2-akis` birebir · bekçi: Sv tetiği dikdörtgen=dolum, Sv5'te tetik yok, kayıt göçü (eski kayıt → Sv1) · araç kısa < 60 sn, tam damgalı (bot yürüdü, coin korunumu, varyant etkili) · her kolun sayı satırı · ÖNERİ satırı gerekçeli |
| **B · Masa Sv görseli + çerçeve** | Okey **yol G** ve tavla **yol A** Sv1-5 (D-181; kaynak `tools/kat2-esya.tsx` `?yol=`) oyuna: masa görünüşü `kat2.masaSv`den türer · Sv tetik çerçevesi (`kat2SvTetikleri`; Kat 1 tablo yükseltme çerçevesinin dili/bileşeni, fiyat + dolan bar) · Sv atlama anı: yerinde büyüme (hafif useFrame/damp) + toz/parıltı (Kat 1'in seviye juice'u varsa onu kullan) · seviye gözle okunur (çoklu sinyal: oturak tipi + renk + boyut, `feedback_upgrade_legibility`) · göz kareleri: her iki masa Sv1-5 aynı kadrajda + oyun mesafesinden bir salon kareleri (`__sinema`; Kat 2'de `__devCam`/`__teleport` kadrajı değiştirmiyor) | `src/components/three/Kat2.tsx` · `src/components/three/kat2/**` · yeni `tools/kat2-s3-kare.mjs` · `docs/sprintler/kat2-S3/kareler/` | `src/game/**` (A'nın) · Kat 1 sahnesi · audio | Kat 1 birebir · konsol hatası 0 · Sv yokken Kat 2 bugünkü görünüş · pano 1600 px (Sv1-5 × 2 masa + salon) · kare işi sayısı notta |
| **C · Kat 2 sesleri** | Mevcut ses motoru (D-096 kod sentezi + D-122 seçilmiş kaynak; önce oku: `grep -n "D-096\|D-122" memory-bank/decisions.md`) ile Kat 2: okey taşı takırtısı (oynayan masadan ara ara, yakınlığa göre kısık; sürekli değil) · tavla zarı · cezve fokurtu / kahve hazır · kahve servis · coin toplama Kat 1 ile aynı · Kat 1 kasa boşaltma · merdiven geçişi · duvar gömülme gümbürtüsü · Sv atlama · Kat 2 açılış ("yeni kat") anı. Her ses için **2 aday**; dinleme sayfası `tools/kat2-ses-dinle.html` (tek dosya, butonlu, kod sentezi tarayıcıda çalar) → kullanıcı seçer; oyuna şimdilik **aday 1** bağlanır. Bağlama: yeni `src/game/kat2Ses.ts` store'a abone olup durum farkından çalar (store'a dokunmadan) | `src/game/audio*.ts` · `src/game/music*.ts` (gerekirse) · yeni `src/game/kat2Ses.ts` · `tests/kat2-ses.test.ts` · `tools/kat2-ses-dinle.html` | store/save · components (bağlama tek satırı gerekiyorsa rapora yaz, Claude takar) | mevcut ses testleri yeşil · ses ayarı/sessiz + arka planda susma Kat 2'de de geçerli · takırtı sıklık sınırı bekçili · Kat 1'deyken Kat 2 sesi çalmaz |
| **D · Görev hattı + başarım + analitik** | **Kat 2 görev hattı** (~15-20 görev, Kat 1 şeridinin dili ve ödül kuralı; ilk görevler zincir sırasını izler: kahve servis et → okey masası aç → … → tavla köşesi → garson → Sv). Saf mantık `src/game/kat2Gorev.ts` (ilerleme `kat2.gorev`; sayaçlar A'nın `olay`larından) + HUD'da Kat 2'deyken görev şeridi Kat 2 görevini gösterir (Kat 1'deyken Kat 1). **5-6 başarım** (`basarim.ts` deseni; ör. ilk okey masası · 100 kahve · tavla köşesi · ilk Sv5 masa · Kat 2'yi bitir). **Analitik** olayları (kat geçişi · Kat 2 pad · Sv · Kat 2 görev). Play Games/Game Center kimlik listesi rapora (TR+EN ad, açıklama, puan) | yeni `src/game/kat2Gorev.ts` · `src/game/basarim.ts` · `src/game/analitik.ts` · config'te yalnız YENİ `kat2Gorevler` bloğu · görev şeridi bileşeni (HUD'daki; Kat 2 dalı) · `tests/kat2-gorev.test.ts` · başarım testleri | `kat2Dongu.ts` · `kat.ts` · store/save (gerekeni rapora yaz; Claude bağlar) · `components/three/**` | Kat 1 görev hattı birebir (mevcut testler) · görev listesi config bekçisi (her görev ulaşılabilir, sıra zincirle çelişmez) · başarımlar mevcut 19'u bozmaz · EN listesi rapor |

**Claude'da kalan:** bu sözleşme · `devHooks.ts` (`masaSv`, `gorev`, Sv dev kancası) · `i18n/en.ts` (ChatGPT mikrometin turu,
görev + başarım metinleri dahil) · `tools/duman.mjs` Kat 2 denetimleri · store'a D'nin görev bağlantısı + C'nin bağlama satırı ·
birleştirme, mutasyonlar, final tam koşular · S3 karar paketi · defter · hafıza.

## Sıra
1. Plan commit'i → 4 ajan paralel (A sözleşmeyi ilk iş yazar).
2. Biten ajan: tip + testleri + Claude ≥ 2 mutasyon. A'nın ölçümü = varyant kapısı commit #1 (karar boş).
3. Claude bağlar → `npm run test` + `npm run duman` (+EN) + `npm run build`.
4. **S3 karar paketi (tek mesaj, sade + örnekli):** ① masa Sv kolu + fiyat (A) ② ses adayları (C'nin dinleme sayfası)
   ③ görev listesi göz atma (D) · Game Center/Play başarım girişi.
5. S3b: kararlar koda (commit #2 + bekçi + final tam koşu) → üretim kapısı + 1.1 derlemesi ayrı tur.

## Kapsam dışı
Balkon (D-179 D adayı, hâlâ "düşünürüz") · kasa doluluğu görsel işareti (ChatGPT önerisi; S3b'de küçük iş) · Kat 3 · prestij.
