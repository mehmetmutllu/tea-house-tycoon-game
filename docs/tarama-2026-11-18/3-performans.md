# Tarama 2026-11-18 · 3 — Performans (v1.1, Kat 2 dahil)

> Kapsam: yalnız ÖLÇÜM + aday listesi. `src/` ve config'e dokunulmadı, commit yok.
> Araçlar (repo dışında, geçici): `scratchpad/t3/olc.mjs` (A/B/C/D/E/F kipleri) · `scratchpad/t3/g.mjs` (doku sızıntısının kaynağı).
> Ham çıktı: `scratchpad/t3/sonuc-hepsi-1.json` (1. koşu, tüm kipler) · `sonuc-A.json` (2. koşu, ısınma 12 sn) · `sonuc-F.json`.

## Damga (bütün sayılar bu ayarla alındı)

| ayar | değer |
|---|---|
| Sunucu | `VITE_KAT2=1 npx vite --port 4301` (DEV derlemesi, HMR açık) |
| Görüntü | 412×915 @ dpr 2,625 → oyunun piksel bütçesi dpr'ı **2**'ye indirdi · `isMobile` · `hasTouch` |
| CPU | CDP `Emulation.setCPUThrottlingRate` **4×** |
| GPU | ANGLE / **RTX 3060 (D3D11), KISILMADI** → piksel doldurma maliyeti ölçülmedi, gerçek telefonda daha ağır olabilir |
| Kare | `?f2golge=2048&f2fps=0` → gölge 2048 açık (D0 tabanı), 60 fps tavanı KAPALI, vsync kapalı (`--disable-gpu-vsync`) → kare süresi işin kendisi |
| Tohum | `Math.random` tohumlu (12345 / 777), React commit sayacı DevTools kancasından |
| Gürültü | Makine paylaşımlıydı (başka ajanlar başka portlarda tarayıcı/vite koşturuyordu). Aynı durum iki koşuda ±%30 oynadı; tabloda iki koşu da yazılı. **Oran ve sıralama okunur, mutlak ms değil.** |

Durumlar:
- **S1 Kat 1 erken**: `__resetGame`, pad yok, 60 sn sim.
- **S2 Kat 1 geç**: Kat 1'in 24 pad'i, masalar L5 (`__setTableLevel 4`), görev hattı bitmiş, 240 sn sim (~31 NPC).
- **S3 Kat 2 tam**: S2 + `__kat2(2)` + Kat 2'nin 31 pad'inin tamamı (22 masa), bütün masalar Sv5, yük (ocak 5 · garsonHız 1 · tepsi 2 · lavabo 5), 240 sn sim. Kat 1 gizli ama takılı (`Kat1Gorunur`).

## §1 Kare maliyeti (durum başına)

`ort/p50/p95` = çizilen kareler arası süre (ms). `iş` = `__perf().isMs` (useFrame + `gl.render`). `çizim` = `gl.render` (gölge geçişi dahil). Çizim çağrısı ana geçiş + gölge geçişi ayrı (three, `info.reset()`i gölge geçişinden SONRA yapıyor; `__perf().calls` yalnız ana geçişi gösterir, yarıdan azını).

| durum | koşu | kare ort | p50 | p95 | fps | iş ort | iş p95 | çizim | gölge | çağrı ana + gölge | üçgen | sahne nesnesi / mesh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 Kat 1 erken | 2 (temiz) | 10,7–14,4 | 10,1–12,3 | 14,7–34,5 | 69–93 | 9,3–12,6 | 13–34 | 7,1–9,8 | 3,1–4,2 | 34 + 60 = **94** | 15,3 k | 325 / 150 |
| | 1 | 21,2–22,8 | 18,1–18,6 | 60 | 44–47 | 18,4–19,9 | 52–56 | 14,3–15,4 | 6,6–7,8 | | | |
| S2 Kat 1 geç | 2 (temiz) | 35,1–63,6 | 34,2–50,2 | 51–150 | 16–28 | 32,7–48,9 | 42–100 | 27,3–41,1 | 13,7–22,2 | 108 + 259 = **~367** | 74 k | 1.908 / 603 |
| | 1 | 47,8–72,8 | 42,2–57,3 | 70–105 | 14–21 | 40,9–58,1 | 51–100 | 34,1–49,6 | 17,4–23,8 | | | |
| S3 Kat 2 tam | 2 (temiz) | **37,4–39,3** | 37,0–38,6 | 51,5–60,6 | 25–27 | **35,9–37,1** | 45–48 | 26,2–28,2 | 10,4–11,4 | 163 + 222 = **~385** | 23 k | 4.342 / 1.993 (görünür 1.183) |
| | 1 (E/C dilimleri) | 42–66 | — | 48–103 | 15–24 | 40–63 | — | 31–39 | 13–17 | | | |

Okuma:
- **Kat 2 tam, Kat 1 geçten AĞIR DEĞİL**: iş ~36–49 ms vs ~33–58 ms (aynı bant). Üçgen ⅓ (23 k vs 74 k), çizim çağrısı benzer (~385 vs ~367), ama sahnedeki nesne **2,3×** (4.342 vs 1.908) — çünkü Kat 1 gizli hâlde ağaçta duruyor.
- Her iki geç durumda **karenin ~%75–80'i `gl.render`**, onun da **~%35–45'i gölge geçişi**. Simülasyon (`tick`) 3,4–5,0 ms (karenin ~%8–10'u).
- Gölge geçişi ana geçişten DAHA ÇOK çağrı yapıyor (S3: 222 vs 163; S2: 259 vs 108) — gölge kamerası (±30 orto) bütün katı görüyor, ana kamera bir kısmını.
- Telefon vekili 4× kısıkta geç oyun **25–28 fps** (temiz koşu), 60 fps tavanının altında; 60'a yaklaşmak için ~2× kazanç gerek.
- React commit kare başına 0,07–0,65 (S2'de en yüksek) — kare başına render yok, kimlik koruması tutuyor.

### Kare bölüşümü (E kipi, 1. koşu, kare başına ms, 4× kısık)

| kalem | S2 Kat 1 geç | S3 Kat 2 tam |
|---|---|---|
| `gl.render` (SahneCizimi, öncelik 1) | 50,4 | 38,2 |
| ↳ gölge geçişi | 24,2 | 16,7 |
| ↳ `scene.updateMatrixWorld` | 5,7 | **9,1** |
| `tick` (sim + zustand `set`) | 5,0 | 3,8 |
| Kat 1 müşteri useFrame (`Customers.tsx:383`) | 3,5 | 1,4 (Kat 2'deyken de koşuyor) |
| `mixer.update` (drei useAnimations, KayActor) | 1,1 (2,7 çağrı/kare) | 1,0 (9,3 çağrı/kare) |
| Kat 2 grup useFrame (`kat2/Grup.tsx:170`, 22 masa) | — | 0,6 |
| KayActor tepsi + yön useFrame'leri | 0,4 | 0,8 |
| geri kalan (useFrame abonesi: S2 55 · S3 199) | < 0,3 | < 0,4 |

Sim bölüşümü (`__olcum`, S3): findNavPath 0,64 · npcSystem 0,33 · dishwasher 0,32 · waiter 0,26 — tick'in kalan ~2 ms'si `set` + seçiciler (aşağıda F).

### Sayfa-içi deney kolları (aynı sayfa, sıra AB×3, kaynağa dokunmadan)

| kol | S2 iş (ms) | S3 iş (ms) | yorum |
|---|---|---|---|
| taban | 44–84 (gürültülü) · 51–58 | 47–76 | |
| **gölge dondur** (`shadowMap.autoUpdate=false`) | **24,6–34,2** (−13…−23) | **34,7–45,3** (−20…−36) | gölge geçişinin ÜST SINIRI; gölgeler donar, NPC gölgesi kalır |
| **Kat 1'i sahneden ayır** (yalnız Kat 2'de) | — | 41,2–44,6 vs takılı 47,0–49,8 (**−4…−6**) | `umw` 9,3 → 5,0–5,6 ms; çizim 33–38 → 31,6–33,5 |
| matris dondur (`matrixAutoUpdate=false`, tüm sahne) | 44–61 vs 51–84 | 42,6–49,9 vs 47–76 | `umw` S3 9,3 → 4,6–5,2 ms; toplamda gürültü içinde (−3…−5) |

### Zustand `set()` maliyeti (F kipi, 300 ardışık çağrı, 4×)

| | `setState` p50 | `tick(1/60)` p50 |
|---|---|---|
| S2 Kat 1 geç (Kat 1'de) | 0,2 ms | 0,4 ms |
| S3 Kat 2 tam (Kat 2'de) | **1,0 ms** | **1,5 ms** |

Kat 2 sahnesinin seçicileri her `set`te (her karede) ~0,8 ms ekliyor.

### Kata giriş takılması (D kipi)

| geçiş | en uzun kare | geçiş süresi (perde) |
|---|---|---|
| Kat 1 → Kat 2 | **1.511 ms** | ort 490 ms |
| Kat 2 → Kat 1 | 218 ms | |

`Kat2Katman` (`Scene.tsx:1402`) her girişte ~2.400 nesneyi baştan kuruyor (React mount + BoxGeometry/Cylinder üretimi + gövde klonları). Perde kapalıyken olsa da 4× kısıkta 1,5 sn donma = perde animasyonu takılır.

## §2 Sızıntı hükmü

| ölçüm | süre | JS heap (GC sonrası) | GPU geometri | GPU doku | program | sahne nesnesi | hüküm |
|---|---|---|---|---|---|---|---|
| B sim-zaman (S3, 20 × `__advanceTime(30)`) | 10 dk sim | 60,8 → 67,8 MB; 180. sn'den sonra 64–69 bandında | 379 → 286 (sabit) | 71 → 79 (sabit) | 29 | 3.971 → 4.445 (180. sn'de plato — grup gövdeleri tembel kuruluyor) | **SIZINTI YOK** |
| C gerçek zaman (S3, canlı) | 5 dk 15 sn | 65,7 → 71,7 MB; 97. sn'den sonra 67–72 bandında | 639 → 507 (sabit) | 76 (sabit) | 30 | 4.343 → 4.399 | **SIZINTI YOK**; iş 40–63 ms, kayma yok |
| **D kat geçişi** (40 tur 2→1→2) | ~4 dk | 61,6 → 62,9 MB | 380 → 511 (5. turdan sonra +21 / 35 tur) | **71 → 780** (5. turdan sonra **+16/tur**, doğrusal) | 29 | 4.013 → 4.341 (sabit) | **GPU DOKU SIZINTISI** |

**Kaynak (G probu, doğrulandı):** her Kat 2 girişinde doku sayısı tam olarak Kat 2'deki skinned iskelet sayısı kadar artıyor (tüm pad'ler açıkken **+40/giriş**: 54 − 14 = 40 iskelet dokusu) ve Kat 1'e dönünce hiç düşmüyor:

```
k2 tex 80 · k1 82 · k2 122 · k1 122 · k2 162 · k1 162 · k2 202 · k1 202 · k2 242
```

three, her `SkinnedMesh` iskeleti için bir `boneTexture` (float DataTexture) kuruyor; `SkeletonUtils.clone` ile klonlanan iskeletler (`kat2/Grup.tsx:59` grup gövdeleri, `KayActor.tsx:380` garson/bulaşıkçı/kahve ustası) unmount'ta `skeleton.dispose()` çağrılmadan bırakılıyor. Bayt olarak küçük (iskelet başına tahmini 4–16 KB → 100 geçişte ~2–6 MB), ama sınırsız büyüyor ve her biri bir GL nesnesi. Geometri artışı (+0,6/tur) küçük, kaynağı belirlenmedi.

JS heap'te sızıntı yok; olay dinleyicisi 227'de sabit (geçici 366 sıçramaları `<Html>` para yazıları).

## §3 Optimizasyon adayları (sıralı)

Etki: aynı damga (4× CPU, telefon görüntüsü) — "ölçülen" = deney kolu, "tahmini" = kod okumasından.

| # | etki | dosya:satır | öneri | risk |
|---|---|---|---|---|
| 1 | **ölçülen: gölge geçişi karenin %35–45'i**; dondurma üst sınırı S3 −20…−36 ms, S2 −13…−23 ms. Gölge çağrısı ana geçişten fazla (222 vs 163) | `lights.tsx:26-41` · `kat2/parca.tsx:24,32` (`Kutu`/`Silindir` `golge = true` varsayılan) | (a) küçük propların (fincan, cezve, ıstaka, pul, korkuluk dikmesi, dikmeler, Pirinç) `castShadow`ını kapat → gölge çağrısı ve geçiş süresi düşer, görüntü hemen hemen aynı; (b) gölge haritasını 2 karede bir tazele (`autoUpdate=false` + çift karede `needsUpdate`) → ~½ kazanç, hareketli gölge 1 kare gecikir; (c) zayıf cihaz sınıfında harita 1024. | **Görsel — kullanıcıya sorulmalı** (D-073 gölge kararı). (a) en düşük risk |
| 2 | **ölçülen: −4…−6 ms/kare Kat 2'de** (`updateMatrixWorld` 9,3 → 5,0 ms) + Kat 1 görsel useFrame'leri (müşteri 1,4 ms + Kat 1 mixer/tepsi ~0,5 ms) | `Scene.tsx:1397-1400` (`Kat1Gorunur`) · `Customers.tsx:383` | Kat 2'deyken Kat 1 grubunun `matrixWorldAutoUpdate`ını kapat (alt ağaç dolaşılmaz; dönüşte aç) + Kat 1'in GÖRSEL useFrame'leri (müşteri animasyonu, KayActor mixer'ları) `kat !== 1` iken erken dönsün. Sim (`tick`) etkilenmez. Not: müşteri anim kırpması frustum'a bakıyor; Kat 2'de kamera aynı yerde, gizli Kat 1 müşterileri "görüşte" sayılıyor | Düşük — dönüşte bir karelik bayat matris; geri dönüşte bir kez `updateMatrixWorld(true)` |
| 3 | **ölçülen: GPU doku sızıntısı +16…+40/Kat 2 girişi**, sınırsız | `kat2/Grup.tsx:58-115, 273` · `KayActor.tsx:380` | Klonlanan gövdeler için unmount temizliği: `skeleton.dispose()` (+ `mixer.stopAllAction(); mixer.uncacheRoot(kok)`); Grup'ta gövdeye özel `mat.dispose()` | Düşük. Bekçi: D kipi gibi 10 tur geçişte `info.memory.textures` sabit kalmalı |
| 4 | **ölçülen: Kat 2'ye girişte 1.511 ms tek kare** (çıkış 218 ms) | `Scene.tsx:1402-1405` (`Kat2Katman`) · `Kat2.tsx:452` | İlk girişten sonra Kat 2'yi Kat 1 gibi takılı-gizli tut (#2'deki kapılamayla birlikte, iki yönde de) ya da kurulumu perde boyunca dilimlere böl. Alternatif ucuz yol: Kat 2 açıkken Kat 1'deyken boşta bir kez arka planda ön-kur | Orta — takılı tutmak #2 yapılmadan Kat 1'i ağırlaştırır; bellek +2.400 nesne |
| 5 | **ölçülen: `umw` −4,1…−4,7 ms** (tüm sahne dondurma üst sınırı); toplamda −3…−5 ms (gürültüde) | `Kat2.tsx:184-211, 129-152, 294-322` (zemin/duvar/merdiven ağzı) · `kat2/Esya.tsx` masa gövdeleri | Statik kabuğu (zemin, duvar, merdiven ağzı, bölmeler, mobilya gövdesi) montajda `matrixAutoUpdate=false` + bir kez `updateMatrix()`; animasyonlu gruplar (Dogus, SvSekme, taş, zar) hariç | Orta — Dogus/SvSekme ölçek animasyonu ebeveyn gruptaysa çocukların matrixWorld'ü yine güncellenir; donmuş nesneye sonradan konum yazan yer kalmamalı |
| 6 | **tahmini: çizim çağrısı ve dolaşma** — Kat 2 tek başına ~2.400 nesne / ~1.400 mesh; sahnede 971 materyal, 1.713 geometri (her `Kutu`/`Silindir` kendi BoxGeometry'si) | `kat2/Esya.tsx:86-97` (`Pirinc` 4 mesh + satır içi materyal) · `kat2/Esya.tsx:287-300` (çuha, ıstaka×8, taş) · `kat2/Esya.tsx:322-330` (`Pullar` 12 silindir) · `Kat2.tsx:308-313` (14 basamak, her biri kendi materyali) | Masa başına statik parçaları `mergeGeometries` + vertex color ile tek mesh'e indir (Kat 1 `Merged`/instancing deseni), ya da 22 masada aynı parçayı instanced çiz. Satır içi `<meshStandardMaterial>` yerine `renkMat` önbelleği | Orta — Sv1-5 görünüşleri birleştirilmiş geometride Sv başına ayrı birleşik set ister |
| 7 | **ölçülen: `set()` p50 0,2 → 1,0 ms** (Kat 1 → Kat 2), tick 0,4 → 1,5 ms | `kat2/Balon.tsx:147` · `kat2/Bulasik.tsx:64-67` · `Kat2.tsx:386` · `kat2/Para.tsx:134` · `kat2/SvIsaret.tsx:102` (`kat2SvCanli` → her set'te `filter`) · `kat2/Grup.tsx:138-140` (her tick yeni `Map`) | Masa başına `.find` yapan 22×N seçiciyi tek seçiciye indir (ör. `masalar` dizisinden id → `istek/ictigi/kirli` anahtar dizgesi bir kez), `kat2SvCanli`yi `gorev.idx`e bağla, `useKalkisIzle`de yalnız `durum` değişince Map kur | Düşük |
| 8 | **ölçülen: 0,6 ms/kare** (22 grup useFrame) | `kat2/Grup.tsx:171` (`masalar.find` her kare) · `kat2/Grup.tsx:215` (`mat.color.set(string)` her kare, her gövde — CSS dizgesi ayrıştırma) | Masa nesnesini indeksle tut; gömlek rengini yalnız `ziyaret` değişince ata | Düşük |
| 9 | tahmini < 0,1 ms — küçük kare-başı ayırmalar | `Customers.tsx:395` (`URUNLER.map` her kare) · `kat2/Esya.tsx:275` (`oturakYerleri()` her kare yeni dizi, ~10 masa) · `kat2/Para.tsx:109` (`filter` her kare) | Modül sabitine/yerinde döngüye çevir | Çok düşük; yalnız GC gürültüsü |

### Öncelik notu
#1 ve #2 birlikte telefonda geç oyunu (Kat 1 ve Kat 2) en çok rahatlatacak ikili: gölgeye dokunmadan bile #2 + #5 + #7 + #8 Kat 2'de ~−9…−12 ms (≈ %20–25) eder. #3 bir hata düzeltmesidir (uzun oturumda kat geçişi yapan oyuncuda doku birikir) ve kapı gerektirmez. #1 görsel karar olduğu için kullanıcıya sorulmalı (`feedback_no_shadows` / D-073). Hiçbiri `economy.config.ts` / `tick.ts` / `rules.ts`e dokunmuyor (varyant kapısı dışı).

### Açık kalanlar
- GPU kısılmadı: dpr 2 dolum maliyeti, gölge haritası (2048²) bant genişliği gerçek Mali/Adreno'da ayrıca ölçülmeli (cihazda `localStorage['kiraathane-olcum']='1'` + `__perf()`).
- DEV derlemesi ölçüldü (React dev modu, `import.meta.env.DEV` dalları); üretim derlemesinde mutlak ms daha düşük çıkar, sıralama değişmemeli.
- Geometri sayacının kat geçişinde yavaş artışı (+0,6/tur) kaynağı bulunmadı.
