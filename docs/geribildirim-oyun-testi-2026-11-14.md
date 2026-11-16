# Oyun testi geri bildirimi — 2026-11-14 (Kat 2, deneme APK D-197)

Kaynak: kullanıcının sesli notu, cümleleri aynen. Teşhis: kod + `tools/_kat-kare.mjs` kareleri (Kat 2 varış hâli).

## G1 · Kat 1 parası Kat 2'deyken akmalı, kasa barı olmasın
> "İkinci kata çıktığım zaman ilk kattaki para yavaş yavaş gelsin. … Aşağı inince almak gibi bir durum olmasın. … Orada bir bar var ya, onun olmasına gerek yok."

- Bugün (D-185): Kat 1 parası cüzdana değil KASAYA girer (`game/kasa.ts`); HUD'da "KAT 1: X" + doluluk barı (`ui/KasaSayaci.tsx`);
  kasa 20 dk'da dolar, dolunca Kat 1 durur; para ancak Kat 1'e inince/kasaya yürüyünce cüzdana geçer.
- Sorun: oyuncuyu Kat 2'nin akışından koparıp merdivene gönderen angarya; bar "acele et" baskısı yaratıyor.
- Çözüm önerisi: kasa kalkar → Kat 1'in oto-toplanan parası birkaç saniyede bir doğrudan cüzdana akar (küçük "+X" sayacı
  kesenin yanında belirip söner). Sınır yok (oyuncu oyundayken). Çevrimdışı tavanı (D-185 ikinci yarısı) aynen kalır.

## G2 · Kat 2 mutfağı: tezgâhın içine girilebiliyor, kahvenin alındığı yer belli değil
> "Mutfak çok kötü. Mutfakta tezgahın içine girebiliyorum. Kahveyi nereden alacağım belli [değil]. Aşağıyı kopyala direkt. Önde tezgah olsun, arkada ocak vesaire olsun. … öndeki tezgahın üzerine o kahve şeyini koyarsın. … aspiratör … olmasına gerek yok."
> "Mutfağın alt kattakiyle neredeyse aynı olmasını istiyorum. Sadece öndeki set var ya o farklı olsun."

- Teşhis: bandın ocağının (`k2cezve`) katı gövdesi YOK — `kat.kat2Govdeler` yalnız `govde`si olan (salondaki) ocağı ekliyor
  (`src/game/kat.ts:230`). Ocak tek sıra, alış noktası ocağın önünde; fincanlar ocak tezgâhında küçük duruyor; davlumbaz var.
- Çözüm: Kat 1 mutfağının birebir uyarlaması — arkada ocak sırası (davlumbazsız), önde salona bakan servis tezgâhı (katı),
  hazır fincanlar ÖN tezgâhın üstünde dizili, oyuncu ön tezgâhın önünden alır. Farklı olan tek şey ön set (Kat 2'ye özgü).
  Ön set için 6-12 aday aynı kadrajda render edilip seçtirilir (feedback_show_dont_ask).

## G3 · Duvarlar çok yüksek, yaklaşınca oyuncu ve haritanın yarısı kayboluyor
> "Duvarlar çok yüksek. Duvara yaklaşınca map'in yarısına, yani kullanıcı ve geride kalan çoğu şey kayboluyor."

- Teşhis: D-191 W1 — kapalı alanın önüne TAM BOY (3,2) sıva duvar. Varışta kapalı alan kameraya bakan tarafta (z = 0 hattı),
  kamera yukarıdan-önden baktığı için oyuncu duvara 2-3 adım kala duvarın arkasında kalıyor (kare `s3`: oyuncu görünmez,
  ekranın alt yarısı düz duvar). Kat 1'de bu yok: kilitli alan çizilmez, ön cephe alçak.
- Çözüm önerisi: kameraya bakan (önde kalan) bölmeler alçak (~1 m, Kat 1 ön cephesinin boyu), yan ve arka bölmeler tam boy kalır.
  Arkadaki kaba inşaat alçak duvarın üstünden görünür → "burada açılacak yer var" sinyali de güçlenir.

## G4 · Gruplar kata girerken iç içe giriyor
> "Bir kata girerken kullanıcılar iç içe giriyorlar. O öyle olmamalı."

- Teşhis: `kat2/Grup.tsx` her kişiyi kendi süresiyle yürütür — sonra çıkan daha kısa sürede aynı yolu bitirmek zorunda olduğu için
  HIZLANIP öndekine yetişiyor; şerit yalnız 2 (`yol.ts` `serit`), 4 kişiden ikişeri aynı çizgide; koridorda bütün yollar birleşiyor.
- Çözüm: tek sıra yürüyüş — herkes aynı hızda, aralarında sabit mesafe (~0,8 m), her biri yolun sonunda kendi oturağına ayrılır.
  Kat 2 denge sayılarına dokunmaz (yalnız görsel); mantıktaki `yurume` süresi aynı kalır, görsel süre ona uyar.

## G5 · Okey masası: grup oturuyor, 1-2 dk hiçbir şey olmuyor
> "Okey masasına oturuyor. 1 dakika 2 dakika gitmiyor. Kahve servisi hemen gelmiyor. Ne yapacağımı bilmiyorum yani öyle olunca. … Kullanıcıyı kaçırabilir bu."
> "Ama bu da oyunun çok tekrar etmesi anlamına gelir. … Bence getiriyi düşürüp süreyi de çok çok azaltabiliriz okey masası için."

- Teşhis (config `kat2`): masa açılınca grup 15 sn sonra gelir + 5 sn yürür; İLK kahve isteği oturduktan 25 sn sonra; para yalnız
  oyun BİTİNCE (180 sn) tek yığın. Masa açıldıktan ilk paraya ~3,5 dk. Kat 1'de aynı döngü ~15-20 sn (oturur → hemen sipariş →
  çay 6 sn → para). Geri bildirim aralığı ~10 kat uzun; ilk dakikada oyuncuya verilen bir iş yok.
- Çözüm önerisi (ölçülecek, D-084): ① grup oturur oturmaz ilk kahveyi ister · ② her teslim edilen kahvenin parası ANINDA masaya
  düşer (Kat 1 hissi) · ③ oyun süresi kısalır, masa ücreti orantılı düşer (kullanıcının önerisi) · ④ ilk grup daha çabuk gelir.
  Okeyin kimliği (4 kişi, uzun oturma, bitişte masa ücreti) kalır → Kat 1'in kopyası olmaz.
  Sayılar: `tools/olcum-kat2-dongu.ts` ile kol tablosu → seçim → kod.

## Kullanıcı seçimi (2026-11-14)
- G5 okey: **tam paket** (oturunca hemen kahve · kahve parası anında · kısa oyun + düşük masa ücreti · ilk grup çabuk) → önce ölçüm turu (D-084: araç + kol tablosu → sayı seçimi → kod).
- G3 duvar: **kameraya bakan bölmeler alçak (~1 m)**, yan/arka tam boy.
- G1 Kat 1 parası: **kasa + bar kalkar, para doğrudan cüzdana, oyun açıkken sınır yok**; çevrimdışı tavanı aynen.
- G2 mutfak: Kat 1 uyarlaması (seçenek sorulmaz) · yalnız ön set için aday karesi gösterilir.
- G4 tek sıra yürüyüş: teknik, sorulmaz.

## Uygulama sırası (öneri)
1. G4 + G3 + G1 (görsel/kural, hızlı) · 2. G2 mutfak + ön set aday karesi · 3. G5 ölçüm turu → sayı tablosu → seçim → kod · 4. yeni deneme APK.

## Sonraki tur (2026-11-15)
- G5: kullanıcı *"G2 veya G3 olsun fark etmez"* → **G2** config'te (rapor §Karar).
- Set tasarımı: *"sap niye bana doğru dönük … tezgâhın öbür tarafındaki kişiye dönük olacak, o hazırlıyor gibi … masadan da ben
  kahveleri alıp dağıtıma çıkacağım veya garson"* → cezve sapı arkaya, ısıtıcı tezgâhın arka yarısında, ön kenarda pirinç
  servis tepsisi (hazır fincanlar), arkada kahveci usta (Kat 1 çaycısının karşılığı). Ön set biçimi (6 aday) seçim bekliyor.

## Sonraki tur (2026-11-17) — D-199
- Ön set: 6 aday yan yana → *"en iyisi köz mangalı gibi ama bunların seviyelerini artırdıkça fark nasıl olacak? ve ortadaki
  masaları kaldır karmaşık duruyo alttaki mutfaktan farkı o olmuş olsun"* → mangal; 3 büyüme yolu (A/B/C) çizildi; adalar kalktı.
- *"Düz renkle başlasın. Seviye artınca çevresi siyah olsun … altın sarısı çizgi … sırayla cezve sayısı artsın … zeminini
  kahvemtırak bir ton … bir tane daha farklı renk"* → D yolu + 5 zemin çizildi.
- Seçim: *"koyu kahve ve krem olsun ve diğerinde de c diyorum karma olan"* → zemin koyu kahve + krem, mangal yolu C.
