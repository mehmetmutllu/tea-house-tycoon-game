# K2-4 — KAT 1'İN KASASI + ÇEVRİMDIŞI (yalnız ölçüm)

> Araç: `tools/olcum-kat2-kasa.ts` → `docs/olcum-kat2-kasa.txt` (tam koşu, damgalar temiz).
> Mantık: `src/game/kasa.ts` (saf modül, Decimal) · bekçi `tests/kasa.test.ts` (13 test, 3 mutasyonla sınandı).
> `tick.ts` / `store.ts` / `economy.config.ts` DEĞİŞMEDİ: kasa araçta muhasebe olarak uygulandı.

## §0 Soru

D-174 ②: *"Kat 2'deyken Kat 1 çalışır, kasada birikir, kasa dolunca durur."* Bugün Kat 1'in parası yerde
3 dk bekleyip kendiliğinden cüzdana akıyor, sınırı yok. Dört soru var:
1. Kasa kaç dakikalık Kat 1 gelirini alsın (sınır yok / 10 / 20 / 40 dk)?
2. Kasa dolunca fazlası ne olsun: kaybolsun mu, yerde mi beklesin?
3. Oyuncu Kat 1'deyken Kat 2 dursun mu, dönmeye devam mı etsin?
4. Oyun kapalıyken (çevrimdışı) Kat 2 de kazandırsın mı, tavan neye bakmalı?

## §Yöntem

- **Gerçek oyun:** `useGame` store'u. Kat 1 bitmiş (bütün pad'ler, yükseltmesiz; `bitmisKat1` kalıbı),
  karakter son kademede. Kat 2 iki durumda: **başı** (yalnız okey1) · **dolu** (4 okey + ocak). Masaların
  döngüleri eşit aralıkla kaydırıldı (gerçekte pad'ler ayrı anlarda açılır).
- **Senaryo:** bot Kat 2'de T dk oynar (önce yığın, sonra kahve, sonra ocak). Sonra merdivene yürüyüp iner,
  Kat 1'de 60 sn kalır (önce kasaya, sonra yerdeki paraya), yine merdivenden çıkar. Süre 60 dk, T ∈ {5, 10, 20},
  öncesinde 5 dk ısınma.
- **Kasa = muhasebe.** Oyuncu Kat 2'deyken Kat 1'de kendiliğinden toplanan her sikke kasaya yazılır.
  Dört sınır kolu aynı koşu üstünde paralel tutuldu. Dünyayı yalnız "Kat 2 arkada döner" kolu değiştirir,
  o yüzden o kol ayrı koşu. Kat 2 bu kolda oyuncu uzaktaymış gibi `kat2Tick`le ilerler.
- **Sınırın birimi:** "Kat 1 gelirinin N dakikası", oyuncu yokken ölçülen **gerçek** Kat 1 akışı üstünden
  hesaplandı (kalibrasyon 15 dk: **76 ₺/dk** → 760 / 1.520 / 3.040 ₺). Sebebi Bulgu 1.
- **Çevrimdışı:** analitik hesap, store'un formülüyle aynı: oran × rateMult 0,5 × min(süre, 1 sa), sonra
  para tavanı. "İhlal" şu demek: Kat 2 bitmemişken çevrimdışı parayla **art arda 2 ya da daha fazla** Kat 2 pad'i
  alınabiliyor. Kat 1'in kuralı (sıradaki pad × 1,15) yalnız sıradaki pad'i alabilmeye izin verir.
- **Damgalar:** bot yürüdü (Kat 2 ≥ 30 br/dk, Kat 1 ≥ 30 br/dk) · iniş gerçekten oldu · ₺ korunumu iki
  denklemde: (Kat 1 başta yerde + üretilen = cüzdana + kasaya akan + yerde) ve (kasaya akan = boşalan + kasada
  + taşan) · varyant etkili (döner ≠ donuk, 10 dk sınır taşırdı, çevrimdışı Kat 2 tavanı bugünden farklı). Hepsi temiz.
- Not: C ajanı `kat2Dongu.ts`'i paralel genelleştiriyordu. Tam koşu o anki çalışma ağacıyla alındı. Okey
  sayıları birebir kalma şartı C'nin bekçisinde.

## §Bulgular

### Bulgu 1 — Oyuncu yokken Kat 1 dakikada ~75 ₺ getiriyor; çevrimdışı formülü bunun 14 katını sayıyor
| ölçü | ₺/dk |
|---|---|
| Kat 1, oyuncu Kat 2'de (12 koşunun aralığı) | **71-78** |
| Kat 1, oyuncu başındayken (`olcum-izdiham-t6`, garsonlu) | 127-144 |
| `incomeRate` (çevrimdışının kullandığı idealize oran), aynı dükkân | **1.040** |

Sınırı `incomeRate`e bağlasaydık 10 dk sınır 10.400 ₺ olurdu ve 60 dk'da bir kez bile dolmazdı. Kasa sınırının
birimi gerçek akış olmalı. Oyun bunu nereden okuyacak, §S2 dikişleri'nde.

### Bulgu 2 — Kasa sınırı (60 dk, son kademe oyuncu)
| Kat 2 | T | sınır | toplam ₺/dk | Kat 1 ₺/dk | Kat 2 ₺/dk | kaybolan ₺ | inişte kasadan ₺ | inişte Kat 1 toplam ₺ | dolma sn | yerde sikke tepe |
|---|---|---|---|---|---|---|---|---|---|---|
| başı | 5 | yok · 10 · 20 · 40 | 94 | 75 | 18 | 0 | 173 | 446 | — | 0 |
| başı | 10 | yok · 10 · 20 · 40 | 96 | 77 | 19 | 0 | 550 | 812 | — | 0 |
| başı | 20 | yok · 20 · 40 | 100 | 79 | 20 | 0 | 1.271 | 1.578 | — | 0 |
| başı | 20 | **10 dk** | **74** | 54 | 20 | **1.532 (%40)** | 760 | 1.067 | 780 | 84 |
| dolu | 5 | yok · 10 · 20 · 40 | 246 | 72 | 174 | 0 | 175 | 422 | — | 0 |
| dolu | 10 | yok · 10 · 20 · 40 | 266 | 74 | 192 | 0 | 536 | 798 | — | 0 |
| dolu | 20 | yok · 20 · 40 | 277 | 76 | 201 | 0 | 1.226 | 1.501 | — | 0 |
| dolu | 20 | **10 dk** | **254** | 53 | 201 | **1.397 (%37)** | 760 | 1.035 | 769 | 75 |

(Kat 2 donuk satırları. "Döner" satırları Bulgu 4'te. Kasa kolu bugünden yalnız kaybolan ₺ kadar ayrışıyor,
koşu sonunda kasada bekleyen para kazanç sayıldı.)

- Sınır ancak **T > sınır + ~3 dk** olduğunda bağlıyor. 3 dk, paranın yerde bekleme süresi (180 sn).
  60 dk'lık senaryoda **20 ve 40 dk sınırı hiç dolmadı**. Kasayı onlar için doldurmak 23-43 dk tek seferde Kat 2'de
  kalmak demek.
- 10 dk sınırla 20 dk'lık oturumda Kat 1 parasının **%37-40'ı** kayboluyor. Kat 2 başında bu toplamın **%26'sı**
  (100 → 74 ₺/dk), çünkü Kat 2 başında gelirin %80'i hâlâ Kat 1'den geliyor.
- **Kasa dolma süresi** = sınır dk + ~3 dk (ölçülen 769-780 sn, 10 dk sınır için).
- **"Yerde bekler" kipi:** taşan para yerde kalsaydı Kat 1 zemininde aynı anda **75-84 sikke** birikirdi. Kayıp
  sıfır olurdu ama bu fiilen "sınırsız + toplama angaryası" demek. FPS eşiği (m.13) ~115 sikke. Bunun altında
  kalıyor ama 40 dk'lık bir oturumda aşar (doğrusal tahmin, ölçülmedi: taşan ₺ / sikke ≈ 18 ₺).

### Bulgu 3 — Kat 1'e iniş başına kazanç
| T (dk) | 5 | 10 | 20 |
|---|---|---|---|
| inişte kasadan ₺ (sınırsız) | 168-175 | 532-550 | 1.226-1.271 |
| inişte Kat 1 toplam ₺ (kasa + 1 dk'da yerden) | 422-446 | 767-812 | 1.501-1.578 |
| iniş sayısı / 60 dk | 10 | 5 | 3 |

Kasa ilk 3 dk boş kalıyor (para önce yerde yaşlanıyor). 5 dk'lık turda inişin yarıdan fazlası kasa değil, yerdeki para.

### Bulgu 4 — Oyuncu Kat 1'deyken Kat 2 dönerse
| Kat 2 | T | donuk ₺/dk | döner ₺/dk | fark | kaçan kahve (arkada, 60 dk) |
|---|---|---|---|---|---|
| başı | 5 / 10 / 20 | 94 / 96 / 100 | 97 / 99 / 101 | +1…+3 | 0 (ocak yok) |
| dolu | 5 | 246 | 261 | **+15 (+%6)** | 74 |
| dolu | 10 | 266 | 271 | +5 | 36 |
| dolu | 20 | 277 | 280 | +3 | 20 |

Kat 2 dönerken masalar oynamaya devam ediyor, kahve istekleri sessizce düşüyor (ceza yok) ve yığınlar yerde
bekliyor. Oyuncu Kat 2'ye dönünce yığınları topluyor (koşu sonunda yerde 0 ₺). Kazanç sık inen oyuncuda biraz artıyor.
"Kat 2 döner" durumunda dönüşte birkaç yığın birden hazır bekliyor. "Donuk" durumunda masa tam bıraktığın anda donuyor.

### Bulgu 5 — Çevrimdışı: bugünkü tavan Kat 2'yi tek kapanışta bitirtiyor
| kol | 1 sa sonra ₺ (Kat 2 başı → dolu) | ihlal / 15 |
|---|---|---|
| **bugün:** yalnız Kat 1, tavan = en pahalı Kat 1 pad × 1,15 | 11.442 (her durumda) | **12** |
| Kat 2 payı + tavan Kat 1 | 11.442. Bugünle birebir aynı, Kat 2 payı görünmez | 12 |
| Kat 2 payı + tavan **sıradaki Kat 2 pad'i** × 1,15 | 575 → 4.600 | **0** |
| yalnız Kat 1, tavan sıradaki Kat 2 pad'i | 575 → 4.600 | 0 |
| Kat 1 → kasaya (10 / 20 / 40 dk), Kat 2 yok | 760 / 1.520 / 3.040 | 0 / 3 / 6 |
| Kat 1 → kasaya (10 / 20 / 40 dk) + Kat 2 payı, Kat 2 tavanı | 760-5.360 / 1.520-6.120 / 3.040-7.640 | 0 / 3 / 9 |

- Kat 1 bitince "sıradaki pad" kalmıyor ve tavan en pahalı Kat 1 pad'ine düşüyor (9.950 × 1,15 = **11.442 ₺**).
  Kat 2'nin bütün zinciri 9.300 ₺. Oyuncu merdiveni açıp oyunu 1 saat kapatırsa döndüğünde **Kat 2'nin beş pad'ini
  birden** alabiliyor. Bu, "çevrimdışı zone bitirmez" ilkesinin bugün açık olan ihlali.
- Aynı 11.442 ₺, Kat 2 başında **aktif oynanan bir saatten** (94 ₺/dk × 60 = 5.640 ₺) iki kat fazla: oyunu kapatmak oynamaktan
  kârlı.
- Süre tavanı 1 sa olduğu için 4 ve 8 sa sütunları 1 sa ile aynı (elmasla uzatma hariç).

### Bulgu 6 — Kasanın Kat 1'deki yeri (aday; yalnız yer/ölçü)
| aday | koordinat (x, z) | varıştan | gidiş-dönüş | gerekçe |
|---|---|---|---|---|
| 1. merdivenin dibi (ağzın sağı) | (3,5, −9,2) | 3,6 br | 1,5 sn | İnişte göz önünde. Merdiven tetiğinin (|x| ≤ 2,0) dışında. "Kasaya yürü" kolu fiilen "inince" ile aynı. |
| 2. servis tezgâhının ucu | (−10,8, −9,3) | 10,8 br | 4,4 sn | Kıraathanede kasa çaycının yanında durur. Kısa bir yürüyüş ister, yolda yerdeki paralar toplanır. S2'de çay alma dairesiyle (`pickupReach`) ve servis yükseltme noktasıyla çakışmadığı doğrulanmalı. |
| 3. giriş kapısının içi | (1,6, 15,4) | 23,9 br | 9,6 sn | Klasik dükkân kasası. Salonu boydan boya geçirir (en aktif kol), ama 1 dk'lık inişin %16'sı yürüyüşe gider. |

## §Kullanıcıya gidecek sorular — öneri (sade, örnekli)

1. **Kasa ne kadar alsın?** Öneri: **20 dakikalık Kat 1 geliri** (bugünkü dükkânla ~1.500 ₺). Örnek: Kat 2'de
   okey masalarıyla 15-20 dk uğraşıp inen oyuncu hiçbir şey kaybetmez, kasada ~1.200 ₺ bulur. Yarım saatten
   uzun yukarıda kalırsa kasa dolar ve "Kat 1 doldu" sayacı onu aşağı çağırır. 10 dk sınırı, 20 dk'lık normal bir
   Kat 2 turunda Kat 1 parasının %40'ını yakıyor. Bu "aşağı inmeyi unuttun" değil, "cezalandırıldın" hissi verir.
   40 dk ise hiç dolmuyor, yani "kasa dolunca durur" kararı kâğıt üstünde kalır.
2. **Kasa dolunca fazlası?** Öneri: **Kat 1 durur** (müşteri gelmez). Kayıp para açısından "kaybolur" ile aynı,
   ama oyuncunun gözü önünde para yanmaz. İndiğinde "boş masalar" görür ve sebebi açıktır. "Yerde bekler" kayıpsız
   ama sınırı anlamsız kılar ve yere 80+ sikke yığar.
3. **Kasa ne zaman boşalsın?** Öneri: **kasaya yürüyünce**, kasa **servis tezgâhının ucunda** (aday 2). 4 sn'lik
   yürüyüş bir eylem, toplanan para bir an, "dur, kendisi gelsin" değil. Merdivenin dibine konursa yürüme
   kolunun inişten farkı kalmaz.
4. **Sen Kat 1'deyken Kat 2?** Öneri: **döner**. Dönünce masaların önünde birkaç yığın hazır bulursun
   (+%2-6 kazanç). Kahve istekleri cezasız düşer. Donuk kalınca masa bıraktığın saniyede durur, bu da "kat yaşıyor"
   hissini bozar.
5. **Çevrimdışı?** Öneri: **Kat 2 de kazandırsın, ama tavan sıradaki Kat 2 pad'ine baksın** (ihlal 0).
   Bugünkü hâliyle merdiveni açıp 1 saat kapatan oyuncu döndüğünde Kat 2'nin bütün zincirini alıyor. Oyuncu
   Kat 2'deyken kapattıysa Kat 1'in payı da kasaya girip kasa sınırında kesilsin (20 dk + Kat 2 tavanı: ihlal 3/15,
   hepsi Kat 2 hiç açılmamışken, merdiven yeni açıldığında).

## §S2 dikişleri (orkestratör)
- `tick.coinSystem` oto-toplama: `s.kat === 2` iken `wallet` yerine kasaya (`kasayaAt`). Taşan için "durur"
  seçilirse NPC doğuşu `kasaDolu` iken kesilmeli (spawn sistemi).
- `store`: `kasa: Decimal` alanı + `kat` 2→1 geçişinde ya da kasa erişiminde `kasaBosalt`. Sınır için oran
  kaynağı lazım. `incomeRate` kullanılamaz (Bulgu 1). Aday kaynaklar: `gelirIzi` (son N sn kazanılan) ya da Kat 1
  durumuna bağlı config sabiti.
- `save.ts`: `kasa` alanı + `saveVersion` göçü (eski kayıt → 0).
- Çevrimdışı (`cevrimdisiGelir` / `computeOfflineEarned`): Kat 1 bitmişken tavan referansı Kat 2'nin sıradaki pad'i
  olmalı. Kat 2 oranı (`kat2Oran`, araçta) `rules.ts`e taşınabilir.
- HUD: Kat 2'de "Kat 1: X ₺" sayacı + doluluk (`kasaDoluluk`).

## §Karar

