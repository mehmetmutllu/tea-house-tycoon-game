# K2-S2 · Ajan D (Kat 2 görseli) — ara not

## Değişenler
| Parça | Dosya | Not |
|---|---|---|
| Ocaklar `OCAKLAR`dan | `Kat2.tsx` `Ocak` · `kat2/Esya.tsx` `CezveOcagi` | Aynı bileşen (KayKit cezve 7, ölçek 0,9); yer + yön (`al` noktasına bakar) parametre. `ocaklar[i].hazir/demT` okunur. Salondaki ocak (`govde` var) KISA sıra: sol tezgâh (fincanlar) + ocak, davlumbaz yok (geri kayan davlumbaz bölmenin öbür yanına taşıyordu); sırtı bölmenin yüzüne oturur. |
| Doğuş | `kat2/Esya.tsx` `Dogus({pos})` | S1 hatası: ölçek dünya orijininden büyüyordu (eşya ortadan uçarak geliyordu). Artık `pos` çevresinde, yerinde büyür (masa + ocak). |
| Kat 2 garsonu | yeni `kat2/Garson.tsx` | `KayActor kind="waiter"` = Kat 1 garsonunun gövdesi/kıyafeti, tepsi ELDE (`KAY_GARSON_TEPSI_KAYMA`, `Holding_A`), tepside `Fincan`. Konum `kat2Dunya.garson` (+ `garsonEk`) → damp (k 12), dönüş damp (k 9), > 3 br sıçrama = ışınlanma. Yürü/dur klibini KayActor hızdan seçer. `garson === null` → çizilmez. |
| Kalkış | `kat2/Grup.tsx` `useKalkisIzle` | Geçiş karede değil `useGame.subscribe`te yakalanır (her store yazımı: `oyunda → başka`), masa başına an damgası; `MasaGrubu` damga değişince aradan geçen süreden başlar. Toplu tick (`__advanceTime(6)`) ve geç yüklenen gövdede de çalışıyor (kare `dongu-4c`). |
| Grup yolu | `kat2/yol.ts` | Okey koridoru masa merkezinden 2,5 → 1,9: okey salonundaki grup 2. ocağın tezgâhının içinden geçiyordu. |
| Kaybeden S1 adayları | `Balon.tsx` · `Para.tsx` · `Dis.tsx` · `gorselSecim.ts` silindi | D-187: balon A (fincan + ×N), para A (sikke kulesi), dış A (bahçe aşağıda) doğrudan kod; `?k2gorsel` yok. |
| Bölmeler | yeni `kat2/Bolme.tsx` (Kat2.tsx'ten taşındı) | Varsayılan bugünkü 2,2. DEV `?k2bolme=A|B|C|D` adayları (aşağıda). Kazanan seçilince öbürleri + `adayOku` silinir. |
| Kare aracı | yeni `tools/kat2-s2-kare.mjs` (S1 aracı silindi) | Vite API, HMR + izleme kapalı. Dünya oyunun `yeniKat2Dunya`sından kurulur; garson için sayfada config'e GEÇİCİ `kat2.garson = {hiz 2,2, tepsi 3}` (dosyaya yazılmaz) → kareler gerçek garson mantığıyla. `node tools/kat2-s2-kare.mjs [klasör] [dongu bolme perf]` |

## Bölme göster-seç (`kareler/pano-bolme.png`, 1600 px; sütun = aday, satır = oyuncu bölme arkasında · okey salonundan · merdiven salonundan)
- **Bugün** 2,2 tam bölme — oyuncu arkadayken görünmüyor.
- **A** alçak 1,2 (lambri + ince krem bant; geçit dikmeleri 1,35, lento yok).
- **B** pencereli: lambri dolu, üstü ~1,5 aralıklı dikme + 2,2'de kiriş (arası açık).
- **C** oyuncunun 2,4 yakınındaki, kameraya bakan bölme dilimleri lambri boyuna iner (1 m dilim, damp, instanced). Kat 1'de karşılığı yok: Kat 1'de alanlar arası duvar alan açılınca hiç çizilmiyor.
- **D** bölme aynı; duvarın arkasında kalan gövde sarı silüet (aynı iskelete bağlı ikinci mesh, `GreaterDepth`; oyuncu gövdesi silüetten sonra çizilir → kendi kolu silüet vermez). D kazanırsa oyuncuyu sahnede bulma yerine `Player.tsx`ten açık bir kanca gerekir.

## Döngü kanıtı kareleri (`kareler/`)
`dongu-1a-iki-ocak-ustten` · `dongu-1b-ikinci-ocak-oyun-kadraji` · `dongu-1c-ocak-buyuyor` · `dongu-2-garson-tepsiyle-tavlaya` ·
`dongu-3-garson-masaya-variyor` · `dongu-3b-garson-servis` · `dongu-4a-kalkis` · `dongu-4b-kalkis-yuruyor` · `dongu-4c-kalkis-toplu-tick` ·
`dongu-5-tum-kat`. Konsol hatası: 0.

## Kare maliyeti (headless, `__perf()` 5 sn ort., 440×956 @2x) — makine paralel ajanlarla YÜKLÜ: iş ms gürültülü, aynı koşudaki çift karşılaştırılır
| Sahne | S1 notu (iş ms · çizim · üçgen) | S2 koşusu |
|---|---|---|
| Kat 1 salon | 4,62 · 132 · 34 k | 9,12 · 132 · 34 k (gürültü ölçüsü: Kat 1'e dokunulmadı) |
| Kat 2 boş | 3,06 · 98 · 19 k | 5,78 · 98 · 19 k |
| Kat 2, 4 okey dolu | 5,03 · 185 · 72 k | 9,21 · 181 · 72 k |
| 22 masa üstten, S1 eşi (2. ocak + garson yok) | 8,06 · 359 · 226 k | 11,91 · 375 · 227 k |
| 22 masa üstten + 2. ocak + garson | — | 10,68 · 387 · 226 k (+12 çizim) |
| Tavla köşesi oyun kadrajı (garson ocakta, kadraj dışı) | — | 8,52 → 9,19 · 179 · 122 k |
Sonuç: garson + 2. ocak +12 çizim, üçgen ≈ 0; iş ms farkı gürültü içinde.

## Orkestratöre dikişler
1. **2. ocağın gövdesi çizimden küçük** (`kat.ts` B): `OCAK2_YARI` [1,0; 0,45] (2 × 0,9 m); KayKit tezgâh+ocak 0,9 ölçekte modül başına 1,8 × 2,06 m. Kısa sıra çizimi x [−6,3; −2,7], z [0,09; 2,15]; `al` (z 1,71) tezgâhın İÇİNDE. Öneri: gövde [1,8; 1,03] (merkez z 1,12), `al` ≈ z 2,75 (masa ayak izi 3,25 → oyuncu geçer). Yalnız çizime uyarsam modülü 0,44 ezmek gerekirdi.
2. `tests/kat2-dongu.test.ts` "Kat 1'deyken Kat 2 dünyası işlemez" kırık — A'nın D-185 değişikliği (Kat 1'deyken Kat 2 işler), görselle ilgisi yok.
3. `devHooks` `__game().kat2` henüz `ocaklar/garson` vermiyor; araç ham store'u (`/src/game/store.ts` dinamik import) okuyor.
4. Kat 2 açılışında ocak 2'nin pad'i önce, perde/tadilat hâli yok (masalar gibi yalnız pad) — istenirse "kilitli obje = tadilat" eklenir.
