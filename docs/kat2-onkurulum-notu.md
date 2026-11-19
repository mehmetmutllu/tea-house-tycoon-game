# Kat 2 ön kurulum — not (2026-11-19)

Kaynak: `docs/tarama-2026-11-18/README.md` #6 + `3-performans.md` §1 "Kata giriş takılması". Kullanıcı kararı:
merdiven tamirliyse (`kat2.acik`) Kat 2 Kat 1'deyken arkada önceden kurulsun; Kat 2'yi açmamış oyuncu bedel ödemesin.
Denge/mantık değişikliği yok (`src/game/*`, config dokunulmadı).

## Ne yapıldı

1. **Kurulum kararı** (`src/components/three/kat2OnKurulum.ts`, saf): `kat2KatmanKurulsunMu(kat, acik, onKurulumZamani)`
   = Kat 2'deyse hep; Kat 1'de yalnız merdiven tamirli **ve** ön kurulum zamanı geldiyse. Zaman: tamirden/açılıştan
   1,5 sn sonra, `requestIdleCallback` (yoksa doğrudan — iOS WKWebView).
2. **Kademeli kurulum** (`kat2/kademeliMontaj.tsx`): ön kurulumda Kat 2 parçaları kare başına bir sıra açılır
   (kabuk → mutfak → personel → 22 masa). Öğe kendi kapısına abonedir; açılan öğe listeyi yeniden render etmez.
   Kat 2'deyken kapı yok. `Kat2.tsx`: yalnız montaj — `KademeliOge` sarmalayıcıları + masa satırı `memo` (`MasaSatiri`).
3. **Isıtma** (`Scene.tsx` `Kat2Isitici`): ağaç oturunca (mesh sayısı 10 kare sabit) materyaller dilim dilim
   `compileAsync` ile (ekranın ışık/sis/ton eşlemesiyle, bloklamadan) derlenir; sonra kare başına ≤ 60 mesh,
   varsayılan tampona 1×1 makasla çizilir (tampon/VAO/iskelet dokusu/gölge derinlik materyali). Ana çizim aynı
   karede tamponu baştan çizer → ekrana sızmaz. Bitince `Activity hidden` (useFrame/abonelik sökülü — Kat 1'e kalıcı yük yok).

Denenip bırakılanlar: (a) gizli `Activity`yi boşta önceliğinde önceden render ettirmek — her karedeki store
güncellemesi o render'ı baştan başlattığı için 4× kısıkta **hiç bitmedi**, giriş 2.200 ms'ye çıktı; (b) tek seferde
kurmak — Kat 1'de 1,6–1,8 sn'lik kare; (c) ekran dışı render hedefine ısıtma — ton eşlemesi/renk uzayı farklı olduğu
için **başka** programlar derlendi (+9 program, 1,4 sn senkron `getProgramInfoLog`); (d) tek seferde `compileAsync` —
~1.000 materyalin hazırlığı Kat 1'de 0,27–0,36 sn'lik kare.

## Yöntem

Playwright + `VITE_KAT2=1 npx vite` (DEV), 412×915 @ dpr 2,625, mobil, **CPU 4× kısık**, `?f2golge=2048&f2fps=0`
(gölge açık, fps tavanı kapalı), vsync kapalı. Kol A = eski davranış (geçici `onkur=0` anahtarı, ölçümden sonra
silindi), kol B = ön kurulum; **ABAB** sırayla, her tur yeni bağlam. Araç: scratchpad `sen.mjs` (repo dışı).
- **Y (kayıtla açılış)**: Kat 2 tam (31 pad, Sv5) + açık kayıt → sayfa yeniden açılır → 15 sn Kat 1 → ilk Kat 2 girişi.
- **R (oyunda tamir)**: Kat 2 yalnız hazır pad'ler → `__kat2()` (tamir) → 8 sn Kat 1 → ilk Kat 2 girişi.
Kare = rAF aralığı (ms). "en uzun / ikinci" = penceredeki en uzun iki kare. Bellek = `renderer.info.memory`.

## Sayılar (önce A → sonra B, tur aralığı)

| ölçü | A (önce) | B (sonra) |
|---|---|---|
| **Y — ilk Kat 2 girişi, en uzun kare** | 851–892 | **658–722** |
| Y — ilk giriş, ikinci en uzun kare | 349–390 | **98–129** |
| Y — Kat 1'de kurulum/ısıtma, en uzun kare (açılıştan +4,7…+9 sn) | — (kurulum yok) | 147–203 (son kod, 2 tur); öncesi tek `compileAsync` ile 266–357 |
| Y — Kat 1 kare ort, ısıtma sonrası | 11,7–12,7 | 12,0–13,6 (aynı bant) |
| **R — ilk Kat 2 girişi, en uzun / ikinci** | 279–361 / 261–297 | **101–117 / 63–64** |
| R — tamir penceresi (8 sn) Kat 1 en uzun kare | 47–48 | 144–146 |
| R — Kat 1 kare ort (tamirden sonra) | 11,1–11,5 | 11,8–12,0 |
| İkinci giriş en uzun kare (Y) | 138–168 | 133–154 (değişmedi) |
| Bellek Y, Kat 1 (geometri / doku / program) | 92 / 32 / 26 | 1.097 / 160 / 29 |
| Bellek Y, Kat 2'ye girdikten sonra | 253 / 145 / 28 | 1.063 / 161 / 29 |
| Kat 2 kapalı yeni oyun | `kat2` nesnesi yok, 109 / 36 / 28 | **aynı** (`kat2` yok, 109 / 36 / 28) |
| Sıfırlama sonrası | — | `kat2` sökülür, geometri 1.063 → 200 |
| konsol hatası | 0 | 0 |

Okuma: ilk girişin toplam işi ~1,2–1,3 sn → ~0,8 sn; ikinci büyük kare (kurulum + derleme + yükleme) gitti.
Geometri +~810: ısıtma görüş kesmesini kapattığı için Kat 2'nin kamera dışındaki parçaları da GPU'ya yüklendi
(küçük kutu/silindir tamponları); doku/program aynı.

## Kalan (bu işin dışında)

İlk girişte kalan ~0,65–0,7 sn'lik kare **görünür olma anındaki yeniden render**: gizliyken sökülen store
abonelikleri tazelenince masa eşyası (`kat2/Esya.tsx` `SvSekme`/`OkeyMasa`/`TavlaMasa`/`Kutu`/`Silindir`) yeniden
çiziliyor (profil: ~%55 React render, DEV `jsxDEV` payı büyük) + ilk tam gölge geçişi. Sonraki girişlerde de
aynı mekanizma, daha küçük (15 sn Kat 1'den sonra üçüncü giriş: A 168–199, B 197–236 ms — gürültü bandı). Çözüm adayı: `Esya` bileşenlerinde seçici/`memo`
daraltma (Kat 2 sahibi dosyalar). Üretim derlemesinde React payı belirgin küçülür — telefonda yeniden ölçülmeli.

## Bekçi

`tests/kat2-onkurulum.test.ts` (8 test): kurulum kararı, `Activity` görünürlüğü, boşta zamanlayıcı + iptal, ısıtma
dilimi/parçalama. Mutasyonlar (hepsi yakalandı): `acik &&` silindi · `onKurulumZamani` yerine yalnız `acik` ·
`clearTimeout` silindi · `kat2ActivityGorunur` ısınma kolu silindi · parçalama bütçesi ×100.
