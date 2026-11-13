# Play Games kurulumu (F4b · D-153)

Kod hazır ve **kimlik girilene dek kapalı**: `strings.xml` → `game_services_project_id` boşken Play Games SDK hiç
kurulmaz, Ayarlar'da bölüm görünmez, oyun onsuz oynanır (emülatörde doğrulandı: `docs/gorsel/f4b/`).

## Senin adımların (Play Console)

1. **Play Games Services'ı aç:** Play Console → uygulama → *Büyüme → Play Games Services → Kurulum ve yönetim →
   Yapılandırma* → "Hayır, oyunum Google API'lerini kullanmıyor" → yeni oyun projesi.
2. **Kimlik bilgisi (Android):** Yapılandırma → *Kimlik bilgisi ekle* → Android. Paket adı
   `com.mutlubadem.teahouse`. Bir OAuth istemcisi gerekiyor (Google Cloud'da oluşturma bağlantısı açılır).
   **Her imza için ayrı kimlik bilgisi:**
   - **Uygulama imzalama anahtarı** (Play App Signing): SHA-1'i *Test ve yayınla → Uygulama bütünlüğü*'nde.
     Mağazadan indirilen sürüm bununla imzalanır.
   - **Yükleme anahtarı** (bizim `.jks`): elle kurulan yayın APK'sı için.
   - **Debug anahtarı**: `npm run apk` ile kurulan geliştirme APK'sı için.
   (Yükleme ve debug SHA-1'leri oturumda verildi; `keytool -list -v` ile yeniden alınır.)
3. **Özellikler → Kayıtlı oyunlar (Saved Games): AÇIK.** Kapalıysa bulut kaydı çalışmaz.
4. **Başarımlar:** aşağıdaki 25 satırı gir (toplam 1000 puan; D-195: Kat 2'nin 6 başarımı için Kat 1'in altı büyüğü 25'er indi) (ad · açıklama · puan). Her başarım **512×512 PNG simge** ister
   (simgeleri istersen ben hazırlarım). Puanların toplamı tam **1000** (Play'in tavanı).
5. **Test kullanıcıları:** yayımlanmamış Play Games yapılandırması yalnız test hesaplarında çalışır → kendi Google
   hesabını *Test kullanıcıları*'na ekle.
6. **Kimlikleri bana ver:**
   - Yapılandırma sayfasındaki **proje kimliği** (sayı) → `strings.xml` `game_services_project_id`.
   - Başarımların kimlikleri (`CgkI…`) → `src/config/playGames.config.ts` `kimlik` alanları.
   (Başarımlar sayfasındaki *Kaynakları al* düğmesi hepsini tek XML olarak verir — onu yapıştırman yeter.)
7. Her şey denendikten sonra: Play Games yapılandırmasını **yayımla** (F5 mağaza turunda).

## Başarımlar (Console'a girilecek)

| Anahtar | Ad | Açıklama | Puan |
|---|---|---|---|
| ilk_cay | İlk Çay | İlk çayını servis et. | 10 |
| ilk_masa | Yeni Masa | İlk yeni noktanı aç. | 10 |
| ilk_bulasik | Temiz Bardak | İlk kirli bardağı yıka. | 10 |
| ilk_garson | Yardımcı Geldi | Garsonun ilk çayı taşısın. | 25 |
| seviye_5 | Tanınan Mekân | Seviye 5'e ulaş. | 15 |
| seviye_10 | Mahallenin Gözdesi | Seviye 10'a ulaş. | 30 |
| servis_100 | Çaycı Çırağı | 100 servis yap. | 25 |
| servis_1000 | Semaver Başında | 1.000 servis yap. | 50 |
| servis_6000 | Mahallenin Çaycısı | 6.000 servis yap. | 75 |
| mekan_10 | Büyüyen Mekân | 10 nokta aç. | 50 |
| mekan_24 | Dolu Kıraathane | 24 nokta aç. | 75 |
| kazanc_10k | Kasa Doluyor | Toplam 10.000 ₺ kazan. | 25 |
| kazanc_200k | Esnaf | Toplam 200.000 ₺ kazan. | 50 |
| kazanc_600k | Köşenin Sahibi | Toplam 600.000 ₺ kazan. | 75 |
| ilk_usta | Usta Dokunuşu | İlk Usta yükseltmesini al. | 50 |
| masa_8 | Özenli Masalar | 8 masayı son seviyeye çıkar. | 75 |
| masa_20 | Eksiksiz Salon | 20 masayı son seviyeye çıkar. | 75 |
| gorev_hatti | Hepsi Tamam | Bütün görevleri bitir. | 50 |
| koleksiyon | Koleksiyoncu | Bütün hedefleri topla. | 75 |
| kat2_ac | Yukarı Kat | Merdiveni onar, Kat 2'yi aç. | 20 |
| kat2_ilk_masa | Okey Başlasın | Kat 2'de ilk yeni masanı aç. | 10 |
| kat2_tavla | Tavla Köşesi | Tavla köşesini aç. | 25 |
| kat2_gozde_masa | Gözde Masa | Kat 2'de bir masayı Seviye 5'e çıkar. | 25 |
| kat2_gorev | Üst Kat Tamam | Kat 2'nin tüm görevlerini tamamla. | 30 |
| kat2_tamam | Dolu Salonlar | Kat 2'deki tüm masaları aç. | 40 |

Kaynak `src/config/playGames.config.ts`; tablo oradan kopyalandı, değişirse ikisi birlikte güncellenir.

## Oyunun davranışı

- **Giriş zorunlu değil.** Açılışta sessizce denenir; olmazsa Ayarlar → *Play Games'e bağlan*.
- **Bulut kaydı:** bağlanınca buluttaki ile telefondaki karşılaştırılır; **daha ileri olan kazanır** (toplam kazanç,
  eşitse XP). Buluttaki ileriyse yüklenir ("Bulut kaydı yüklendi"); telefondaki ileriyse buluta yazılır. Daha ileri
  bir bulut kaydının üstüne yazılmaz; bulut okunamazsa hiç yazılmaz. Oyun açıkken 2 dk'da bir ve uygulama arka
  plana geçince yazılır. Yüklemede telefonun ayarları ve satın alımları korunur.
- **Sıfırlama** bulut yedeğini de sıfırlar (yoksa bir sonraki açılışta eski ilerleme geri gelirdi).
- **Başarımlar** oyun içinde ödül vermez (yalnız Play XP'si); ayrı sayaçları yok, oyunun mevcut sayaçlarından türer —
  girişten önce ya da çevrimdışı kazanılanlar bağlanınca gider.
