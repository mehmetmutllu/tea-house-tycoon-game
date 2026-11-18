# Düzeltme W4: arayüz, yönlendirme, reklam kuralı · 2026-11-18

Kaynak bulgular: `5-arayuz-metin.md`, `4-oynanis.md`, `6-reklam-iap-derleme.md`. Commit atılmadı.
Yalnız W4'ün dosyalarına dokunuldu: `src/components/ui/**`, `src/i18n/en.ts`, `src/game/{ads,analitik,geriBildirim,screenPointer}.ts`,
`economy.config.ts` ve `playGames.config.ts`'te yalnız metin, `tests/tarama-w4-rehber.test.ts`.

## Yapılanlar

| kaynak # | ne değişti | dosya |
|---|---|---|
| Arayüz 1 | Yatay telefonda geri bildirim kartı ekrana sığıyor (`max-height: 100dvh − 16`, kart kaydırılabiliyor, metin alanı 76 px). Kafe adı kartında da aynı kural geçerli. Ölçüm: "Gönder" ilk ekranda görünüyor, "Vazgeç" kartı kaydırınca y=359'a geliyor (ekran 390). | `hud.css` |
| Arayüz 2 | `.band-track` yüksekliği 13 → 18 px (`.big` ile aynı). Sayaçlar artık kesilmiyor. | `hud.css` |
| Arayüz 3 | EN: `"· collection bonus {1} income"`. Çift "+" kalktı, "income" eklendi. | `en.ts` |
| Arayüz 4 | KÜNYE "Toplam kazanç" satırında ₺ yerine coin ikonu var. | `HUD.tsx`, `hud.css` |
| Arayüz 5 | TR metinlerde ₺ yerine "para" yazılıyor: `'{N} para kazan'`, `'Toplam kazanılan para'`, `'Toplam 10.000/200.000/600.000 para kazan.'`. Mağaza fiyatı `t('{1} ₺')` yerine coin ikonu + sayı. `en.ts` anahtarları aynı biçimde güncellendi (EN değerleri değişmedi). Sözlükte ₺ içeren anahtar kalmadı. | `economy.config.ts`, `playGames.config.ts`, `en.ts`, `HUD.tsx` |
| Arayüz 6 | Kat 2 Garson sekmesi Kat 1 biçimine geçti: "2 → 3 ürün" (birim yalnız sonda). EN `"ürün": "items"`. | `CharacterPanel.tsx`, `en.ts` |
| Arayüz 7 | Yatay telefonda Ayarlar'ın bölüm başlıkları ve KÜNYE tam satır kaplıyor. KÜNYE yatayda `overflow: visible`: sabit boylu ızgara satırı 0'a eziliyordu. Ölçüm: tablo 0 → 203 px, 5 satırın 5'i görünüyor. | `hud.css` |
| Arayüz 9 | Afiş rozeti kısa metinle tek satırda: "Tek seferlik" / "One-time only", `nowrap`. "Bir kez alınabilir" teklif kartında duruyor. Başlık 360'ta sığıyor. | `HUD.tsx`, `hud.css`, `en.ts` |
| Arayüz 20 | Kullanılmayan 7 anahtar ve kullanılmaz hâle gelen `"{1} ₺"` silindi. #11 yapılmadığı için "SALON DOLDU" da silindi. | `en.ts` |
| Oynanış 1 | Kat 1 hattı bitince 5 sn "Görev hattı tamamlandı" bandı çıkıyor (eskisi gibi). Ardından merdiven pad'i açıksa bant **"Merdiveni onar, Kat 2'yi aç"** yazıyor. Dokununca kamera merdivene kayıyor, merdiven ekran dışındaysa kenar oku onu gösteriyor. Kat 2 açılınca bant yeniden günlük görev bandı oluyor. | `HUD.tsx`, `screenPointer.ts` |
| Oynanış 2 | Kat 2'deyken Görevler panelinin üçüncü bölümü "KAT 2 — OYUN SALONU" başlığıyla Kat 2 hattını gösteriyor: aktif görev kartı (lakap, başlık, ilerleme, ödül; dokununca `kat2GorevOdak`), SIRADA 3 görev, TAMAMLANAN listesi. Kat 1 listesiyle aynı bileşenler. | `HUD.tsx` |
| Oynanış 4 | Kat 2'de kenar oku çalışıyor. Hedef `kat2GorevHedefi` ile bulunuyor: store'un `kat2GorevOdak`ıyla aynı kural (pad · Sv noktası · ocak). İzdüşüm `cameraView`dan alınıyor; CameraRig her iki katta da yazıyor. Ok kat geçişi sırasında gizli. | `screenPointer.ts`, `HUD.tsx` |
| Oynanış 5 | Kat 2'de tepsi düğmesi Kat 2 kahvesini gösteriyor ve W2'nin `kat2TepsiBosalt` fonksiyonuyla boşaltıyor. Kat 1'in çay ve tost düğmeleri Kat 2'de gizli. | `HUD.tsx` |
| Oynanış 6 | Kat 2 hattı bitince Kat 1'in hat sonuyla aynı akış: önce son görev "Tamamlandı" diye gösteriliyor, sonra 5 sn **"Kat 2 görevleri tamamlandı — salon senin."**, ardından günlük görev bandı (Kat 1 hat sonunda da günlük bant geliyor). Panelde de aynı cümle var. | `HUD.tsx` |
| Oynanış 8 | Hedefler'deki Usta şeridi Kat 2'de gizli. | `HUD.tsx` |
| Oynanış 9 | Kat değişince açık panel ve video kartı kapanıyor. Bu kapanış geçişli reklam göstermiyor (oyuncu paneli kapatmadı, perde iniyor). | `HUD.tsx` |
| Reklam 4 | `odulluIzleSonuc` sonucu `odul` ya da `yarida` olunca `panelOdul = true` ve `sonGecisli = şimdi` oluyor. Ödüllü videodan sonraki ilk kapanış reklamsız, 3 dk soğuma baştan başlıyor. Kapsam: video kartı, Usta, seviye/çevrimdışı/günlük "İzle 2×" ekranları. | `ads.ts` |
| Reklam 6 | `useSatinAl.al` satın alma denemesinden önce `odulAlindi()` çağırıyor. Vazgeç, hata ya da bekliyor sonrasında Mağaza kapanınca reklam çıkmıyor. | `useSatinAl.ts` |
| Reklam 8 | Geri bildirimin `ilerleme` alanı artık `ilerlemeOzeti()` ile üretiliyor (saf fonksiyon) ve Kat 2 bağlamını taşıyor. Örnek: `gorev 50 · sv 20 · masa 12 · nokta 2 · kat 2 · k2 3 · k2g 5`. Uzunluk 120'nin altında. | `geriBildirim.ts`, `GeriBildirimKutusu.tsx` |
| Reklam 9 | Analitik kesitine `merdivenDolum` (`padFills.merdiven`) eklendi. `kat2Acik` false → true geçtiğinde önceki kesitte merdiven dolmuyorduysa bu bir yükleme sıçramasıdır: hiçbir Kat 2 olayı gönderilmez (`kat2_acildi` ve ≤2 `kat2_nokta_acildi` dahil). Alan yoksa (eski testler) kontrol yapılmıyor, mevcut testler değişmeden geçiyor. | `analitik.ts` |

## Doğrulama

- **Bekçi** `tests/tarama-w4-rehber.test.ts`: 20 test, hepsi geçiyor. Kapsadığı yerler: merdiven yönü, Kat 2 hedefinin kamera odağıyla aynı olması (hat boyunca),
  kenar oku izdüşümü, HUD bağlantıları, ödüllü video sonrası reklam (`odul` ve `yarida`), gösterilemeyen video, satın alma denemesi,
  analitikte yükleme sıçraması, geri bildirim özeti, ₺ yokluğu, EN çift "+".
- **Mutasyon (4/4 yakalandı):**
  - M1 `ads.ts` panelOdul/sonGecisli silindi → 2 test kırıldı
  - M2 merdiven koşulundan `quest == null` çıkarıldı → 1 test kırıldı
  - M3 analitik yükleme kapısı kapatıldı → 1 test kırıldı
  - M4 Kat 2 Sv hedefi `canli=false` yapıldı → 1 test kırıldı
- **`npx vitest run`:** 2230/2231 test geçti. i18n ve marka-adi geçiyor. Tek kırmızı `olcum-dikis` ("çıplak import.meta.env"), şikâyet ettiği dosya
  `src/game/store.ts`. Bu dosya başka bir ajanın şu an düzenlediği dosya, W4 dokunmadı. Daha önceki bir koşuda W1 ve W2'nin yarım kalmış
  testleri de kırmızıydı (kat2-salon, kat2-yol, tarama-w1-kayit); son koşuda geçtiler.
- **`DUMAN_PORT=4003 npm run duman`:** 78/78 ve İngilizce 4/4 geçti. Ödüllü/geçişli denetimleri de buna dahil.
- **Playwright** (port 4503, `VITE_KAT2=1 VITE_DENEME=1`), 360×640 ve 844×390, tr-TR ve en-US. Konsolda hata 0. Görülenler:
  - merdiven bandı ve kenar oku
  - Kat 2 tepsisi: 3 → 0, Kat 1 tepsisine dokunulmadı
  - Kat 2 Görevler paneli
  - kat değişince panel kapandı
  - Kat 2 sonu: kutlama, ardından günlük bant
  - Kat 2'de Usta şeridi yok
  - Garson sekmesi "2 → 3 items"
  - KÜNYE dikeyde ve yatayda
  - yatay geri bildirim kartı
  - paket rozeti
- Kareler: `kareler/w4-*.png` (12 adet; merdiven-bandi-ok, kat2-tepsi, kat2-gorevler, kat2-sonu-gunluk, kat2-garson, kunye, kunye-yatay,
  geri-bildirim-yatay(+kaydir), paket).

## Başka sahiplere notlar

1. **store.ts (`emptyTray`):** Kat 2 tepsisi HUD'da şu an doğrudan `useGame.setState((s) => ({ kat2Dunya: kat2TepsiBosalt(s.kat2Dunya) }))` ile boşaltılıyor.
   Store sahibi isterse `emptyTray` içine `if (s.kat === 2) return set({ kat2Dunya: kat2TepsiBosalt(s.kat2Dunya) })` ekleyebilir. O zaman HUD
   `emptyTray('tea')` çağırır. Bu yol W2'nin `kat2TepsiBosalt` dışa aktarımına bağlı. Fonksiyon şu an commit edilmemiş, W2'nin çalışma ağacında duruyor.
2. **Play Console:** başarım açıklamaları ("Toplam … para kazan.") konsolda ayrıca güncellenmeli. Oyunun kendi metni değişti.
3. Kat 2'de Hedefler ve günlük görev sayaçları (oynanış #3, reklam #7) store'un işi. W4 bunlara dokunmadı.

## ChatGPT turuna

**Yeni metinler (TR / EN):**
- `Merdiveni onar, Kat 2'yi aç` / `Repair the stairs, unlock Floor 2` (Kat 1 hat sonu bandı)
- `Kat 2 görevleri tamamlandı — salon senin.` / `Floor 2 tasks complete — the hall is yours.` (Kat 2 sonu bandı ve paneli)
- `Kahveleri bırak` / `Drop Coffee` (Kat 2 tepsi düğmesinin başlığı)
- `Tek seferlik` / `One-time only` (paket afişi rozeti)
- Değişen TR metinler: `{N} para kazan` · `Toplam kazanılan para` · `Toplam 10.000/200.000/600.000 para kazan.` (EN aynı kaldı)

**Yapılmayan, ifade tercihi olan maddeler** (arayüz-metin raporundan): #8 EN ilk görev metni kısaltma · #10 "Open/Unlock" ve "Okey" yazımı ·
#11 "SALON DOLU" ile "SALON DOLDU" ayrımı · #12 mağaza bağlantı hatası metinleri · #13 "Sv/L" ve "Lv/L" seviye kısaltması · #14 "Master of the Place" ·
#15 Usta şeridi EN cümlesi · #16 "Empty tray? Tea Station" · #17 "Kayıt şeması" → "Kayıt sürümü" · #18 "Tile Blue" / "Table Radio" ·
#19 personel pad'i ile görev metnindeki büyük/küçük harf ikizleri · #21 "PLACE" → "VENUE".
