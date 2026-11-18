# Tarama 5 — Arayüz + metin (i18n) denetimi · 2026-11-18

Kapsam: sürüm 1.1 (Kat 2, `VITE_KAT2=1 VITE_DENEME=1`). Kod/config DEĞİŞTİRİLMEDİ; yalnız ölçüldü.

## Yöntem

- **Statik:** TypeScript ayrıştırıcısıyla `src/` tarandı (araç kopyaları scratchpad'de: `statik.mjs`, `metin-tara` uyarlaması).
  Sözlükte 482 anahtar var; 288 `t('…')` literal'i ve 26 dinamik `t(x)` çağrısı bulundu (görev, pad, kozmetik, başarım verisi).
  `npx vitest run tests/i18n.test.ts tests/marka-adi.test.ts` → **5/5 geçti**.
- **Tarayıcı:** Playwright (headless Chromium + swiftshader), `vite --port 4501`. Boyutlar: 360×640, 390×844, 1024×768 ve 844×390
  (yatay telefon; manifestte ekran yönü serbest, D-132). Diller: tr-TR ve en-US. Her kombinasyonda Kat 1 erken (kafe adı + öğretici + HUD),
  sonra `set-deneme-kat1` ile Kat 1 bitti hâli taranıp `__kat2(2)` + 15 Kat 2 pad'i ile Kat 2'ye geçildi. Her iki katta açılan ekranlar:
  Çaycı paneli (Oyuncu / Garson / Bulaşıkçı / **Kat 2 Garson** sekmeleri), Hedefler, Görevler, Mağaza (7 sekme + çip seçimi), Ayarlar
  (üst + alt + sıfırlama onayı + geri bildirim penceresi). Ölçülenler: gizli taşmada kırpma/üç nokta/satır kesme, kutusundan taşan metin,
  ekran dışında kalan metin, kısa etiketin satır sarması, HUD parçaları arasındaki örtüşme, CTA'nın üstünde başka öğe olup olmadığı
  (`elementFromPoint`). Kat 2 pad etiketleri (3D zemin yazısı) EN ve TR'de ayrıca görsel olarak kontrol edildi.
- Ham çıktılar scratchpad'de kaldı. Repoya yalnız gerçek sorunların kareleri kopyalandı: `kareler/t5-*.png`.

## Temiz çıkanlar (sorun yok)

- `t()` içinde kullanılan her metnin İngilizcesi sözlükte var. `{1}`/`{N}` yer tutucuları iki dilde aynı. Argüman sayıları doğru.
- EN değerlerinde Türkçe harf yok. Tek istisna dil seçicideki kasıtlı "Türkçe" etiketi.
- "kıraathane" ekrana çıkmıyor (bekçi testi geçti). Uygulama adları TR ve EN'de "Tea House Tycoon".
- Ayar dosyalarındaki metinler sözlükte var: Kat 1 ve Kat 2 görev başlıkları/üst başlıkları, pad'ler, kozmetikler, başarımlar, elmas paketleri.
- HUD parçaları (cüzdan, elmas, seviye, dişli, görev bandı, alt gezinme, kenar oku) hiçbir boyutta birbirine binmiyor.
- Kat 2 pad etiketleri EN'de daha uzun ama çerçeve yazıyla birlikte genişliyor ve okunuyor. Örnek: "Backgammon Table", "Hire Dishwasher".
- Mağazadaki satın alma düğmesi panel sonuna kaydırınca 360×640 ve 1024×768'de alt gezinmenin üstünde kalıyor, tıklanabiliyor.

## Bulgular

Önem: **Y** = yüksek (işlev/oyuncu takılır) · **O** = orta (yanlış/çirkin, her oyuncu görür) · **D** = düşük (cila/tutarlılık) · **B** = bilgi.

| # | önem | ekran / dosya:satır | sorun | dil / boyut | kanıt | önerilen düzeltme |
|---|---|---|---|---|---|---|
| 1 | Y | Ayarlar › Geri bildirim penceresi · `src/components/ui/GeriBildirimKutusu.tsx:41-43` (`.kafe-adi-kart`) | Yatay telefonda **Gönder** ve **Vazgeç** düğmeleri ekranın altında kalıyor (y = 386–504, ekran yüksekliği 390). Pencerede kaydırma yok, yani mesaj gönderilemiyor. | TR+EN · 844×390 | `kareler/t5-02-geri-bildirim-yatay-en-844x390.png` | `@media (orientation: landscape) and (max-height:560px)` içinde `.kafe-adi-kart { max-height: calc(100dvh - 16px); overflow-y: auto; }` ve metin alanını kısalt (`rows` ~3). |
| 2 | O | HUD görev bandı sayacı "0/1" · `src/components/ui/hud.css:640-672` (`.band-track` 13px yükseklik + 2px kenarlık; `.band-count` font `--p1`) | Sayaç rakamlarının alt yarısı kesik. Metin 14px, kutunun iç yüksekliği 9px. Kat 1 ve Kat 2 bandında aynı. | TR+EN · tüm boyutlar | `kareler/t5-01-gorev-bandi-sayac-en-360.png`, `t5-01b-…-tr-360.png` | `.band-track { height: 18px }` (`.big` ile aynı); ya da `.band-count { font-size: 10px; line-height: 1 }`. |
| 3 | O | Hedefler başlığı · `src/components/ui/HUD.tsx:107` (`yuzde` "+" ekliyor) + `src/i18n/en.ts:100` | EN metinde fazladan "+" var: **"collection bonus ++0.4%"**. "gelir" kelimesi de çeviride kaybolmuş. | EN · tüm boyutlar (en az 1 hedef toplanınca) | `kareler/t5-07-koleksiyon-cift-arti-en-390.png` | EN: `"· koleksiyon bonusu {1} gelir": "· collection bonus {1} income"` |
| 4 | O | Ayarlar › KÜNYE "Toplam kazanç" · `src/components/ui/HUD.tsx:787` (`{toplamKazancMetni} ₺` t() dışında) | İngilizcede de **"5,000 ₺"** yazıyor (TL simgesi). Oyuncuya gösterilen birim coin olmalı. | TR+EN · tüm boyutlar | `kareler/t5-06-kunye-tl-en-390.png` | `<b>{toplamKazancMetni} <CoinIcon size={14}/></b>` (mağaza fiyatlarıyla aynı). Metin isteniyorsa TR `"{1} para"` / EN `"{1} coins"`. |
| 5 | O | Görevler (günlük), Hedefler, Mağaza fiyatı, başarımlar · `src/config/economy.config.ts:1102` `'{N} ₺ kazan'`, `:989` `'Toplam kazanılan ₺'`, `src/config/playGames.config.ts:53-55` `'Toplam 10.000 ₺ kazan.'` …, `src/components/ui/HUD.tsx:2298` `t('{1} ₺')` | Türkçede para birimi iki türlü yazılıyor. Aynı listede **"520 ₺ kazan"** ile hemen altında **"23 para topla"** var. Zemin/duvar fiyatı "10.000 ₺", HUD'da ise coin ikonu. Brief: oyuncuya gösterilen birim coin. | TR · tüm boyutlar | `kareler/t5-05-gunluk-gorev-tl-para-tr-360.png` | TR: `'{N} para kazan'` · `'Toplam kazanılan para'` · `'Toplam 10.000 para kazan.'` (200.000 / 600.000 aynı) · fiyat: `{1}` + CoinIcon. `en.ts`'teki anahtarlar da aynı biçimde değişir (EN değerleri zaten "coins"). Play Console'daki başarım metni ayrı güncellenir. |
| 6 | O | Çaycı › **Kat 2 Garson** sekmesi · `src/components/ui/CharacterPanel.tsx:264-265` + `src/i18n/en.ts:13` | Birim iki tarafta da tekrar ediyor: **"2 item → 3 item"**, **"3 speed → 4 speed"**. TR'de "2 ürün → 3 ürün". 360'ta satır ikiye sarıyor. Kat 1 Garson sekmesi aynı bilgiyi "2 → 3 item" diye yazıyor. EN'de çoğul da yanlış. | TR+EN · 360/390 sarma | `kareler/t5-04-kat2-garson-birim-en-360.png`, `t5-09-kat1-garson-item-en-360.png` | Kat 1 biçimi kullanılsın: `simdi = String(g.tepsi)`, birim yalnız sonda. EN `"ürün": "items"`. Kat 2 yalnız kahve taşıdığı için TR `"{1} fincan"` / EN `"{1} cups"` daha doğru. |
| 7 | O | Ayarlar › KÜNYE · `src/components/ui/hud.css:1020-1026` (`.kunye{overflow:hidden}`) + yatay ızgara `hud.css:1806+` | Yatay telefonda "KÜNYE" başlığı sağ sütunda, tablosu sol sütunda. Tablo 62px'e kırpılıyor (içerik 203px). 5 satırın yalnız 2'si görünüyor. | TR+EN · 844×390 | `kareler/t5-03-kunye-yatay-tr-844x390.png` | Yatay medyada `.sheet-body > .kunye { grid-column: 1 / -1 }` (başlıkla aynı tam satır) ya da `.kunye` yüksekliğini serbest bırak. |
| 8 | D | HUD görev bandı başlığı · `src/components/ui/hud.css:617-631` (2 satır kesme) | EN 360'ta ilk görev **"Get tea from the Tea…"** diye kesiliyor. Sayaç izi + ödül + ok başlığa ~85px bırakıyor. TR "Ocaktan çay al" sığıyor. | EN · 360×640 | `kareler/t5-01-gorev-bandi-sayac-en-360.png` | ≤360px'te `.band-track { width: 48px }`. EN metni de kısalt: `"Ocaktan çay al": "Get tea at the Tea Station"`. |
| 9 | D | Mağaza › Paketler afişi · `src/components/ui/HUD.tsx:1921` civarı | "BİR KEZ ALINABİLİR" / "ONE-TIME PURCHASE" rozeti 2 satıra sarıyor. "Başlangıç Paketi" / "Starter Pack" başlığı kutusundan taşıyor (metin 36px, kutu 24px). | TR+EN · 360, 390 (başlık 1024'te de) | `kareler/t5-08-paket-kicker-sarma-en-360.png` | Rozet için ayrı kısa metin: TR `"Tek seferlik"` / EN `"One-time only"` + `white-space: nowrap`. Başlık kutusunda `height` yerine `min-height`. |
| 10 | D | Kat 2 görevleri + Garson kilit ipucu · `src/i18n/en.ts:448,454,462,465,471,473` | EN fiili karışık. Kat 2 görevleri **"Open …"** diyor ("Open a new okey table", "Open the okey room", "Open backgammon table 5"). Kat 1 görevleri ve Kat 2 başarımları **"Unlock …"** diyor ("Unlock the backgammon corner."). "okey" küçük harfle, "Okey Table/Okey Room" büyük harfle yazılıyor. | EN | statik | `"Unlock a new Okey table"` · `"Unlock the Okey room"` · `"Unlock 2 tables in the Okey room"` · `"Unlock the backgammon corner"` · `"Unlock the first backgammon table"` · `"Unlock backgammon table {1}"` · `"Bring coffee to the Okey table"` · `"Fill the Okey room"`. |
| 11 | D | Görev üst başlığı "SALON DOLU" · `src/config/economy.config.ts:827` (Kat 1 `q_table4`) ve `:1360` (Kat 2) · `en.ts:481` | Aynı anahtar iki katta kullanılıyor ve EN'de "FULL ROOM" çıkıyor. Kat 1'de salon = **Hall** (sözlük terimi). Kat 2'de "Okey Room" ile "stair hall" yan yana. | EN | statik | Kat 1 `q_table4` kicker'ı `'SALON DOLDU'` olsun (anahtar ve EN "HALL FULL" zaten var, kullanılmıyor). Kat 2 `'OKEY SALONU DOLU'` / `"OKEY ROOM FULL"`. |
| 12 | D | Mağaza bağlantı hataları · `src/i18n/en.ts:114,127,175` | Aynı hata üç yazımla çıkıyor: "Couldn't connect to the **Shop**", "Couldn't reach the **Shop**", "Couldn't reach the **store**." Burada kastedilen App Store/Play, oyun içi Mağaza değil. | EN | statik | `"Couldn't connect to the store"` · `"Couldn't reach the store"` (küçük harf, üçü aynı) |
| 13 | D | Seviye kısaltması · `src/game/markerFrame.ts:95` `'Sv {1}'` ↔ `economy.config.ts:875+` `'Lavaboyu büyüt (L2)'` … `(L6)` | TR'de seviye hem "Sv" hem "L" ile yazılıyor. EN'de hem "Lv" hem "L". | TR+EN | statik | TR `'Lavaboyu büyüt (Sv 2)'` … · EN `"Expand the Restroom (Lv 2)"` … |
| 14 | D | Başarım "Köşenin Sahibi" · `src/i18n/en.ts:372` | EN "Master of the Place". "Master" oyunda Usta (💎 masa yükseltmesi) terimi, karışıyor. | EN | statik | `"Owner of the Corner"` |
| 15 | D | Usta şeridi · `src/i18n/en.ts:85` | "Become Master with an ad again tomorrow" bozuk bir cümle. | EN | statik | `"Master by ad: available again tomorrow"` |
| 16 | D | Öğretici ipucu · `src/i18n/en.ts:342` | "Tepsin boşsa ocağa git" → "Empty tray? Tea Station" fiilsiz kalmış. | EN | statik | `"Tray empty? Go to the Tea Station"` |
| 17 | D | KÜNYE · `src/i18n/en.ts:49` | TR "Kayıt şeması" teknik jargon. EN zaten "Save version" diyor. | TR | statik | TR `'Kayıt sürümü'` (anahtar + en.ts anahtarı) |
| 18 | D | Kozmetik adları · `src/i18n/en.ts:308,327` | "Çini Mavisi" → "Tile Blue" anlamsız. "Lambalı Radyo" → "Table Radio" anlamı kaybediyor. | EN | statik | `"Iznik Blue"` · `"Tube Radio"` |
| 19 | D | Personel pad'i ↔ görev · `src/i18n/en.ts:190,194,226,243,267,393` | Aynı kavram için iki ayrı anahtar var: "Garson Tut"/"Garson tut", "Bulaşıkçı Tut"/"Bulaşıkçı tut", "Lavaboyu Büyüt"/"Lavaboyu büyüt (L2)". Fark büyük/küçük harften ibaret, EN karşılıkları da farklı ("Hire Server" / "Hire a Server"). | TR+EN | statik | Tek yazım seç (pad ve görev: `'Garson tut'` → EN `"Hire a Server"`) ve fazla anahtarı sil. |
| 20 | D | `src/i18n/en.ts` ölü anahtarlar: `:32` "Çaycı panelinden al", `:33` "Hedefe git", `:69` "GÜNLÜK GÖREV", `:140`, `:141`, `:142` (eski paket açıklamaları), `:228` "SALON DOLDU" | 7 anahtarı hiçbir kod/config kullanmıyor (yalnız yorumlarda geçiyor). | — | statik (`statik.mjs`) | Sil. "SALON DOLDU"yu ise #11'deki gibi kullan. |
| 21 | D | "MEKÂN" bölüm başlığı + başarımlar · `src/i18n/en.ts:95,282,354,364` | "PLACE" / "Known Place" / "Growing Place" zayıf İngilizce. | EN | statik | `"VENUE"` · `"Venue"` · `"Well-Known Venue"` · `"Growing Venue"` (isteğe bağlı) |
| 22 | B | `src/game/tick.ts:1420,1463,1505` (`activeSpot.label`) | `t()` argümanına Türkçe parça sabit yazılmış: `"(+N bahşiş)"`, `"(Usta 💎)"`. Etiket yalnız `__game` dev kancasında okunuyor, oyuncuya çıkmıyor. | — | statik | Ekrana bağlanırsa parçaları ayrı `t()` anahtarı yap. |
| 23 | B | Görevler paneli Kat 2'de | Kat 2'deyken panel yalnız Kat 1 "MEKÂN" hattını listeliyor (hat bitti). Kat 2 görev hattı yalnız HUD bandında görünüyor. | TR+EN | tarayıcı | Ürün kararı: panelde Kat 2 hattı da listelensin mi? |
| 24 | B | Kat 2 Garson sekmesi önizlemesi | Kat 2 kahve katı ama önizlemedeki garson çay tepsisi (ince belli kırmızı bardaklar) taşıyor. | — | `kareler/t5-04-…` | Görsel tutarlılık notu (metin kapsamı dışı). |
| 25 | B | `android/app/src/main/res/values/strings.xml` yorumu | Yorumda hâlâ "Köşe Kıraathanesi" yazıyor. Ekrana çıkmıyor, değerler doğru ("Tea House Tycoon"). | — | statik | Yorumu güncelle (karışıklık olmasın). |

## Not: gürültü olarak elenenler

Ölçüm aracı bunları da işaretledi ama gerçek kusur değiller:

- Yatayda panel başlığının satır yüksekliği, 1024'teki mağaza sekme etiketleri ve 1024/yataydaki bant başlıkları 1–3px'lik satır kutusu farkıyla işaretlendi; ekranda kesik görünmüyor.
- Panel içi kaydırma alanında görünmeyen satırlar sorun sayılmadı.
- Öğretici karartmasının HUD'u örtmesi tasarım gereği.
- "DEV" rozetinin başlıkla çakışması yalnız geliştirme derlemesinde görülüyor.
