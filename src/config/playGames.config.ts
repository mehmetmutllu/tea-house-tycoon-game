/**
 * playGames.config.ts — PLAY GAMES KİMLİK VE KURAL AYARLARI (F4b · D-153).
 *
 * Buradaki değerler DENGE değil kimliktir → varyant kapısına tabi değil. Başarımlar oyun içinde
 * ÖDÜL VERMEZ (yalnız Play Games XP'si); bu yüzden `economy.config.ts`e dokunmazlar. Eşikler oyunun
 * mevcut sayaçlarından okunur — başarım için ayrı sayaç ya da kayıt alanı YOK (durumdan türer).
 *
 * `kimlik`: Play Console'un verdiği başarım kimliği ("CgkI…"). null iken o başarım gönderilmez.
 * `xp`: Play Console'a girilecek puan (5'in katı; toplam 1000 — Play'in tavanı). Kodda yalnız
 * kurulum listesinin ve bekçinin kaynağıdır; asıl değer Console'dadır.
 *
 * Uygulamanın Play Games kimliği (APP_ID) Android kaynağındadır:
 * `android/app/src/main/res/values/strings.xml` → `game_services_project_id`. Boşken cihazda
 * Play Games KAPALIDIR (Ayarlar'da bölüm görünmez), oyun olduğu gibi oynanır.
 */

/** Başarım koşulunun okuduğu sayaç — hepsi `basarim.ts`te kayıttan türetilir. */
export type BasarimOlcu =
  | 'servis' | 'pad' | 'kazanc' | 'bulasik' | 'garson' | 'sonSeviyeMasa' | 'usta'
  | 'hedef' | 'gorevHatti' | 'seviye'
  // S3 (Kat 2): durumdan türer (`kat2` kaydı) — ayrı sayaç yok.
  | 'kat2Acik' | 'kat2Pad' | 'kat2Alan' | 'kat2Bitti' | 'kat2SonSvMasa' | 'kat2GorevHatti';

export interface BasarimTanim {
  anahtar: string;
  ad: string;
  aciklama: string;
  xp: number;
  olcu: BasarimOlcu;
  esik: number;
  kimlik: string | null;
}

export const playGamesConfig = {
  /** Saved Games'teki tek kaydın adı. Değişirse eski bulut kaydı bulunamaz — KALICIDIR. */
  kayitAdi: 'kiraathane-kayit',
  /** Oyun açıkken buluta en sık kaç saniyede bir yazılır (uygulama arka plana geçince hemen yazılır). */
  yazmaAraligiSn: 120,
  /** Başarım koşulları kaç saniyede bir yoklanır. */
  basarimAraligiSn: 10,
  basarimlar: [
    { anahtar: 'ilk_cay', ad: 'İlk Çay', aciklama: 'İlk çayını servis et.', xp: 10, olcu: 'servis', esik: 1, kimlik: null },
    { anahtar: 'ilk_masa', ad: 'Yeni Masa', aciklama: 'İlk yeni noktanı aç.', xp: 10, olcu: 'pad', esik: 1, kimlik: null },
    { anahtar: 'ilk_bulasik', ad: 'Temiz Bardak', aciklama: 'İlk kirli bardağı yıka.', xp: 10, olcu: 'bulasik', esik: 1, kimlik: null },
    { anahtar: 'ilk_garson', ad: 'Yardımcı Geldi', aciklama: 'Garsonun ilk çayı taşısın.', xp: 25, olcu: 'garson', esik: 1, kimlik: null },
    { anahtar: 'seviye_5', ad: 'Tanınan Mekân', aciklama: 'Seviye 5\'e ulaş.', xp: 15, olcu: 'seviye', esik: 5, kimlik: null },
    { anahtar: 'seviye_10', ad: 'Mahallenin Gözdesi', aciklama: 'Seviye 10\'a ulaş.', xp: 30, olcu: 'seviye', esik: 10, kimlik: null },
    { anahtar: 'servis_100', ad: 'Çaycı Çırağı', aciklama: '100 servis yap.', xp: 25, olcu: 'servis', esik: 100, kimlik: null },
    { anahtar: 'servis_1000', ad: 'Semaver Başında', aciklama: '1.000 servis yap.', xp: 50, olcu: 'servis', esik: 1_000, kimlik: null },
    { anahtar: 'servis_6000', ad: 'Mahallenin Çaycısı', aciklama: '6.000 servis yap.', xp: 75, olcu: 'servis', esik: 6_000, kimlik: null },
    { anahtar: 'mekan_10', ad: 'Büyüyen Mekân', aciklama: '10 nokta aç.', xp: 50, olcu: 'pad', esik: 10, kimlik: null },
    { anahtar: 'mekan_24', ad: 'Dolu Mekân', aciklama: '24 nokta aç.', xp: 75, olcu: 'pad', esik: 24, kimlik: null },
    { anahtar: 'kazanc_10k', ad: 'Kasa Doluyor', aciklama: 'Toplam 10.000 ₺ kazan.', xp: 25, olcu: 'kazanc', esik: 10_000, kimlik: null },
    { anahtar: 'kazanc_200k', ad: 'Esnaf', aciklama: 'Toplam 200.000 ₺ kazan.', xp: 50, olcu: 'kazanc', esik: 200_000, kimlik: null },
    { anahtar: 'kazanc_600k', ad: 'Köşenin Sahibi', aciklama: 'Toplam 600.000 ₺ kazan.', xp: 75, olcu: 'kazanc', esik: 600_000, kimlik: null },
    { anahtar: 'ilk_usta', ad: 'Usta Dokunuşu', aciklama: 'İlk Usta yükseltmesini al.', xp: 50, olcu: 'usta', esik: 1, kimlik: null },
    { anahtar: 'masa_8', ad: 'Özenli Masalar', aciklama: '8 masayı son seviyeye çıkar.', xp: 75, olcu: 'sonSeviyeMasa', esik: 8, kimlik: null },
    { anahtar: 'masa_20', ad: 'Eksiksiz Salon', aciklama: '20 masayı son seviyeye çıkar.', xp: 75, olcu: 'sonSeviyeMasa', esik: 20, kimlik: null },
    { anahtar: 'gorev_hatti', ad: 'Hepsi Tamam', aciklama: 'Bütün görevleri bitir.', xp: 50, olcu: 'gorevHatti', esik: 1, kimlik: null },
    { anahtar: 'koleksiyon', ad: 'Koleksiyoncu', aciklama: 'Bütün hedefleri topla.', xp: 75, olcu: 'hedef', esik: 1, kimlik: null },
    // S3 (Kat 2, ajan D): toplam 1000 tavanı korunsun diye yukarıdaki altı büyük başarım 25'er indi (150 XP).
    { anahtar: 'kat2_ac', ad: 'Yukarı Kat', aciklama: "Merdiveni onar, Kat 2'yi aç.", xp: 20, olcu: 'kat2Acik', esik: 1, kimlik: null },
    { anahtar: 'kat2_ilk_masa', ad: 'Okey Başlasın', aciklama: "Kat 2'de ilk yeni masanı aç.", xp: 10, olcu: 'kat2Pad', esik: 1, kimlik: null },
    { anahtar: 'kat2_tavla', ad: 'Tavla Köşesi', aciklama: "Tavla köşesini aç.", xp: 25, olcu: 'kat2Alan', esik: 3, kimlik: null },
    { anahtar: 'kat2_gozde_masa', ad: 'Gözde Masa', aciklama: "Kat 2'de bir masayı Seviye 5'e çıkar.", xp: 25, olcu: 'kat2SonSvMasa', esik: 1, kimlik: null },
    { anahtar: 'kat2_gorev', ad: 'Üst Kat Tamam', aciklama: "Kat 2'nin bütün görevlerini bitir.", xp: 30, olcu: 'kat2GorevHatti', esik: 1, kimlik: null },
    { anahtar: 'kat2_tamam', ad: 'Dolu Salonlar', aciklama: "Kat 2'nin bütün masalarını aç.", xp: 40, olcu: 'kat2Bitti', esik: 1, kimlik: null },
  ] as readonly BasarimTanim[],
} as const;
