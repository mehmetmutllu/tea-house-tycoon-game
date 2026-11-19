# Gölge raporu — S4 (tarama 3-performans #1 · kollar a + c)

> Kullanıcının seçimi: (a) küçük prop'ların `castShadow`ı kapanır, masa/insan/duvar/büyük mobilya gölge
> vermeye devam eder · (c) zayıf cihaz sınıfında gölge haritası 1024. Gölge KAPATILMADI (D-073).
> Ara notlar: `docs/golge-notlar-s4.md` · Araç: `tools/golge-s4-kare.mjs` · Ham çıktı: `docs/kareler/golge-*.json`.

## Damga

| ayar | değer |
|---|---|
| Sunucu | Vite API, DEV, HMR + izleme kapalı (`tools/golge-s4-kare.mjs`, port 4310) |
| Görüntü | 440×956 @ dpr 2, `isMobile`, `hasTouch` |
| CPU | CDP 4× kısma (yalnız ölçüm penceresinde) · GPU RTX 3060 KISILMADI |
| Kare | `?f2golge=2048&f2fps=0` (tavansız) · `Math.random` tohumlu · oyunun takip kamerası |
| Durum | K1 = Kat 1 geç (24 pad, masalar L5, 240 sn sim) · K2 = K1 + Kat 2'nin 31 pad'i, 22 masa Sv5, yük dolu, 240 sn sim |
| Gölge çağrısı | `info.autoReset=false`; (gölge açık toplam − `shadowMap.autoUpdate=false` toplam) / kare |
| Gürültü | Makine paylaşımlı (başka ajanlar). ms'ler iki koşuda ±%10 oynadı; **çağrı sayısı kesin, ms gürültülü**. |

## §Bulgular — önce / sonra (iki koşu ortalaması)

| durum | | gölge çağrısı | ana çağrı | kare ms | iş p50 ms | gölge geçişi ms (kare − donuk gölge) |
|---|---|---|---|---|---|---|
| K1 Kat 1 geç | önce | **321** (326 · 316) | 199 | 76,8 | 67,5 | 31,6 (28,9 · 34,4) |
| | sonra | **277** (276 · 277) | 206 | 83,9 | 69,0 | 32,3 (35,7 · 28,9) |
| | fark | **−44 (−%14)** | | gürültü | gürültü | gürültü içinde |
| K2 Kat 2 tam | önce | **220** (220 · 220) | 155 | 57,1 | 50,1 | 16,5 (17,6 · 15,3) |
| | sonra | **142** (141 · 143) | 155 | 55,9 | 47,3 | 13,1 (12,7 · 13,5) |
| | fark | **−78 (−%35)** | 0 | −1,2 | −2,8 | **−3,4 (−%21)** |

Okuma:
- Kat 2'de gölge çağrısı artık ana geçişin ALTINDA (142 < 155; önce 220 > 155). Gölge geçişi ~−3,4 ms.
- Kat 1'de kazanç küçük: kalan 277 gölge çağrısının çoğu insan (skinned, kişi başı 3–6 mesh, ~31 NPC) ve
  masa/tezgâh; küçük prop'ların bir kısmı `Scene.tsx`te (aşağıda öneri). ms farkı gürültünün altında.
- Ana çağrı değişmedi (beklenen: aynı mesh'ler çiziliyor, yalnız gölge geçişinden düştüler).
- Zayıf cihaz kolu (1024) çağrı sayısını değiştirmez; doldurma işini ¼'e, haritayı 16 → 4 MB'a indirir. GPU
  kısılmadığı için bu makinede ms'si ölçülmedi — telefonda ölçülmeli.

## Ne kapatıldı

Kural tek yerde: `src/components/three/golgeKurali.ts` — en uzun kenar < 0,35 (**küçük**) ya da ikinci kenar
< 0,075 (**ince**: çubuk/şerit) → gölge yok. Masa ayağı (0,08) bilerek eşiğin üstünde.

| dosya | ne |
|---|---|
| `kat2/parca.tsx` | `Kutu`/`Silindir` varsayılanı artık boyuttan (`golgeVerir`) — fincan gövdesi, cezve gövdesi + sapı, pirinç/tabla parçaları kendiliğinden gölgesiz |
| `Kat2.tsx` | korkuluk dikmesi + boğumu (2 instancedMesh), merdiven babası topuzu, merdiven dikmeleri (`Silindir` → kural) |
| `VitrinDekor.tsx` | yerel `Kutu`/`Silindir` → kural (vitrin semaver fincanı vb.) |
| `maketParts.tsx` | duvar rafı bardakları (24), merdiven molozu |
| `ServicePoint.tsx` | semaver musluğu, temiz bardak istifi, sürahi, ekmekler, hazır çay bardakları |
| `Waiter.tsx` · `Player.tsx` · `carriedDirty.tsx` | tepsideki bardak/tost/kirli tabak (tepsinin kendisi gölge VERİR — taşıma okunurluğu) |
| `Dishes.tsx` | masadaki bardak + tabak instancedMesh'leri |
| `Decor.tsx` | portmanto direği/askıları/topuzu + şapka, TV ayağı |
| `lights.tsx` · `game/cihazSinifi.ts` | harita = `golgeHaritasi(sınıf, 2048)` → zayıf 1024; çalışırken kenar değişirse eski hedef atılır |

Gölge vermeye DEVAM eden: insanlar, masalar (tabla + ayak), oturaklar, duvar/bölme, tezgâh, semaver gövdesi,
ocak, bitki, tepsi, sikke yığını (instanced, tek çağrı).

## Kare panosu

`docs/kareler/golge-once-sonra.png` (1600 × 1876): her kadrajda sol önce / sağ sonra, altında kare ms + gölge
çağrısı; son sıra zayıf kol (1024). Tek tek kareler `docs/kareler/golge-{once,sonra,zayif1024}-kat{1,2}-{genis,yakin}.png`.
Görüntü: geniş kadrajlarda fark seçilmiyor; yakın kadrajda yalnız fincan/bardak altındaki birkaç teksellik
lekeler gitti. 1024 kolu panoda 2048 ile ayırt edilmiyor (yakın kadrajda da); telefonda gözle bakılmalı.

## Test

- Bekçi: `tests/golge-s4.test.ts` (31 test) — küçük prop listesi (ölçüler kaynaktan) gölgesiz, büyükler gölgeli;
  `Kutu`/`Silindir` varsayılanı kurala bağlı; ıstaka elle kapalı; zayıf 1024 / güçlü + ölçülmemiş 2048 /
  küçük taban büyümez; `lights.tsx` haritayı `golgeHaritasi`ndan alır.
- Mutasyonlar (hepsi yakalandı): ince eşiği 0,06 → 4 kırmızı · harita hep taban → 1 · `Kutu` varsayılanı `true`
  → 1 · küçük eşiği 0,2 → 1.
- Gerçek yol: localStorage sınıfı `zayif` + ayar "açık" → `light.shadow.map.width` 1024; `guclu` → 2048.
- `npx vitest run` 126 dosya / 2288 test yeşil · `DUMAN_PORT=4000 npm run duman` 78/78 + İngilizce 4/4.

## Açık noktalar / öneri

1. **`Scene.tsx` (dokunulmadı)**: tezgâh bardak/tabakları (~satır 601–629: 8 + 5 + 2 çağrı) ve sokak saksıları
   (~1332: 4 çağrı) hâlâ gölge döküyor → `castShadow` kaldırılırsa Kat 1'de −19 çağrı daha.
2. **Zayıf + "oto" bugün gölgeyi KAPATIYOR** (D-125, `golgeAcikMi`). (c) kolu bu yüzden yalnız zayıf cihazda
   oyuncu gölgeyi elle "açık" yaptıysa etkili. Zayıf cihazın oto'da gölgeyi 1024'le AÇIK tutması isteniyorsa
   bu bir ürün kararı (D-125'i değiştirir) — tek satır: `golgeAcikMi` 'oto' + zayıf → true.
3. Kat 2'nin KayKit masa modelleri hiç gölge dökmüyor (`Model.tsx` `castShadow` atamıyor) — bu turun dışında.
