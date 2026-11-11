# Kat 2 planı + sıradaki işler (taslak, 2026-11-12)

> Durum: **YÖN ONAYLANDI (2026-11-12, D-174).** Sayılar ölçülmeden yazılmaz (D-084).
>
> **Kullanıcı kararları:** ① Tema = Oyun Katı (okey + tavla) · ② Kat 2'deyken Kat 1 çalışır, kasada
> birikir (kasa dolunca durur) · ③ Arayüz: tam ekran menüler + yerdeki pad/yükseltme noktaları +
> görev kartı/yönlendirme → her biri için **farklı varyasyonlar görmek istiyor**; diğer ekranlara da
> bakılır · ④ Sıra: önce arayüz + puanla + analitik (1.0.7), sonra Kat 2.

## 1. Bugün neredeyiz

- Oyun **tek kat**. Kat 1 = 3 salon, 20 masa, çay + tost, 3 garson + 1 bulaşıkçı, lavabo, Usta katmanı.
- Kritik yol **5-7 saat** (D-044). Sonrası isteğe bağlı derinlik (+6-10 sa): masa seviyeleri, Usta.
- Kat 1'in sonunda oyuncu **yıkık merdivene** basınca "Kat 2 çok yakında" yazısını görüyor.
  Yani oyunu bitiren oyuncuya bugün verdiğimiz söz bu.
- Kat 1'de "daha hızlı servis" kolu **tükendi** (D-067 B4 ölçümü: arz tavanı 0,78 fincan/sn). Yeni büyüme
  ancak yeni katla gelir. Kat 2'nin gerekçesi bu.
- Oyun **yayında**. Bu yüzden CLAUDE.md'nin kuralı artık bağlayıcı: **eski kayıt kaybolmaz**, Kat 2
  gelince herkesin Kat 1 ilerlemesi aynen kalmalı (migrasyon şart; "temiz sıfırlama" artık yok).
- Oyunda **analitik yok**. Kimin kaç dakika oynadığını, nerede bıraktığını bilmiyoruz. D-044 "Kat 2'nin
  eğrisi bu veriyle ayarlanacak" diyordu ama o veri hiç toplanmadı.

## 2. Kat 2 ne olsun — önerim: OYUN KATI (okey + tavla)

Eski tasarım (`zone34-wc-floor2-design.md` §4) bunu zaten öneriyordu ve hâlâ en iyisi:

- **Zemin kat = içecek/yiyecek, üst kat = oyun ve keyif.** Gerçek kıraathanelerde de oyun bölümü ayrı durur.
- **Yeni oynanış hissi:** Kat 1'de müşteri gelir, çayını içer, 30-60 sn'de kalkar (sık + küçük para).
  Kat 2'de **4 kişi birlikte** okey masasına oturur, **birkaç dakika** oynar, bu sırada **ara ara çay /
  Türk kahvesi** ister, kalkarken **masa ücretini** tek seferde bırakır (seyrek + büyük para).
  Örnek: oyuncu okey masasını açar → 4 kişilik grup oturur → masada taşlar dizilir → 40 sn'de bir
  "kahve" balonu çıkar → oyuncu ya da garson götürür → 3 dk sonra grup kalkar, masada büyük bir para
  yığını kalır.
- **Yeni ürün: Türk kahvesi** (D-043/D-050'de önerilip ertelenmişti). Cezve ocağı Kat 2'nin servis köşesi olur.
- **Tavla masası** ikinci masa tipi: 2 kişilik, daha kısa oturum. (Kat 1'deki dörtlü/ikili ayrımının karşılığı.)
- **Kumar YOK:** masada para/jeton görünmez, ücret "masa ücreti"dir. Mağaza yaş derecesi için önemli.
- **Nargile balkonu:** önerim **v1.1'de YOK.** Tütün içeriği mağaza derecesini yükseltebilir ve
  reklam dolumunu düşürebilir. İleride ayrı karar.

## 3. Katlar nasıl birlikte çalışır (en önemli tasarım sorusu)

Önerim — **Kat 1 kendi kendine işlemeye devam eder:**
- Oyuncu merdivenden çıkınca kamera Kat 2'ye geçer (ekran kararır, tek kat görünür — D-016 §3).
- Kat 1'deki garsonlar çalışmaya devam eder; para Kat 1'de **kasada birikir** (ekranda "Kat 1: 340₺"
  gibi küçük bir sayaç). Oyuncu inince toplar. Sınırı var (kasa dolar) → arada inmek anlamlı kalır.
- Neden: tycoon türünde ("My Hotel", "Idle Restaurant") eski katı terk etmek değil, **onu otomatiğe
  bırakıp yeniye geçmek** büyüme hissini verir. Ayrıca bizim "aktif oynanış, aşırı otomasyon yok"
  kuralımızla uyumlu: kasa dolunca durur, oyuncu gelmezse kazanç kesilir.

Alternatif (önermiyorum): Kat 1 donar, oyuncu yalnız Kat 2'de kazanır. Basit ama Kat 1'e emek veren
oyuncu "neden bu kadar uğraştım" der.

## 4. Kat 2'nin açılışı ve tempo

- **Kilit:** Kat 1 kritik yolu bitince (3. Salon + tezgâh L3 + ...) merdiven "tamir et" pad'ine döner, parayla açılır.
- **Kat 2 içinde de aynı omurga:** okey masası 1 → cezve ocağı → okey masası 2 → garson → tavla
  bölümü → ... (kat 1 ile aynı sıralı açma + serbest yükseltme mantığı).
- **Hedef süre:** Kat 2 kritik yolu ~4-6 saat (Kat 1'den biraz kısa — oyuncu sistemi biliyor).
- **Sayılar:** simülasyonla ölçülür, rapor + karar paketi gelir, sonra yazılır (D-084 varyant kapısı).

## 5. Teknik iş (neden büyük)

Kod bugün "tek kat" varsayıyor: `LAYOUT` (yerleşim), `World` (açık alanlar), kayıt, sahne, yol ızgarası,
kamera — hepsi tek kat. Kat 2 için:
1. **Kayıt:** her katın kendi ilerlemesi + "şu an hangi kattayım". Eski kayıtlar Kat 1'e taşınır (migrasyon + bekçi testi).
2. **Yerleşim:** katın kendi planı (`layout` kat-başı). Kat 1'in planına dokunulmaz.
3. **Sahne:** merdiven geçişi, kat başına tek sahne, Kat 2'nin kendi duvar/zemin/dekoru.
4. **Okey masası mekaniği:** uzun oturum, oturum içinde tekrar sipariş, masa ücreti (yeni sipariş türü).
5. **Türk kahvesi:** ürün tablosuna eklenir (D-043'ün kancası hazır).
6. **Arka planda Kat 1:** kasa birikimi + offline hesabın iki katı kapsaması.
7. **Metinler TR + EN**, başarımlar, mağaza "Yenilikler".

## 6. Aşamalar (her biri ayrı, test edilebilir; faz bitmeden sonrakine geçilmez)

| # | Aşama | Çıktı | Tahmini oturum |
|---|---|---|---|
| K2-0 | Hazırlık: basit analitik (oturum süresi, hangi adımda bırakıldı) | 1.0.7'de yayına, Kat 2 sürerken veri birikir | 1 |
| K2-1 | **Maket** (görsel): Kat 2 kat planı, okey/tavla masası, cezve ocağı, merdiven | Kullanıcı onayı (göstererek seçim) | 2 |
| K2-2 | Kat altyapısı: kayıt + migrasyon, merdiven geçişi, boş Kat 2 salonu | Eski kayıt bozulmadan iki kat arası gidip gelinir | 2-3 |
| K2-3 | Okey masası döngüsü + Türk kahvesi + cezve ocağı | Kat 2'de oynanabilir ilk 15 dk | 2-3 |
| K2-4 | Kat 1 arka planda (kasa) + offline | Katlar arası dengeli gidip gelme | 1-2 |
| K2-5 | Zincir + denge (ölç → sor → uygula) | Kat 2 kritik yolu sayılarla | 2 |
| K2-6 | Cila, ses, TR/EN metin, başarımlar, sürüm 1.1 | Mağazaya çıkış | 1-2 |

**Toplam: ~11-15 oturum.**

## 7. Sıradaki diğer işler (Kat 2'den önce veya arada)

### 7a. Arayüz düzeltmesi
Kullanıcı "kesinlikle yapmalıyız" dedi. **Hangi ekranlar?** — sorulacak. Hafıza kuralı: şikâyet
biçimle ilgilidir, kullanıcının cümlesindeki isimler doğrudan iş kalemine çevrilir. Önce ekran
görüntüleri alınır, sorunlu ekranlar listelenir, maketle gösterilir.

### 7b. Puanla
- **"Bize 5 yıldız verir misiniz?" diye kendi penceremizi KOYAMAYIZ.** Apple (5.6.1) kendi puan penceresini
  yasaklıyor, yalnız sistemin penceresine izin veriyor. Google Play de puandan önce soru sormayı ve
  yönlendirmeyi yasaklıyor. İkisi de uygulamayı reddettirebilir / kaldırtabilir.
- **Yapabileceğimiz (aynı etkiyi verir):** güzel bir anda (salon açıldı, görev bitti) **sistemin kendi
  yıldız penceresi** otomatik çıkar — oyuncu oyundan çıkmadan 5 yıldıza dokunabilir. Ayrıca Ayarlar'da
  kalıcı "Bizi puanla ⭐" satırı. Mağazada en çok puan getiren yol zaten bu.
- **Geri bildirim** satırı: e-posta mı form mu — sorulacak.

### 7c. Küçükler
Usta kartındaki soluk "0/7" · `ads.ts` lint · duman "q_coin" ara sıra kararsız.

## 8. Önerilen sıra

1. **7a arayüz düzeltmesi** (oyuncu her gün görüyor, Kat 2'den önce) + **7b puanla** + **K2-0 analitik**
   → tek sürüm (1.0.7).
2. Bu sürüm incelemedeyken **K2-1 Kat 2 maketi**.
3. Maket onaylanınca K2-2 … K2-6 → sürüm 1.1.
