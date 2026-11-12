/**
 * Firebase istemci ayarı (1.0.7). Bu değerler GİZLİ DEĞİL: web anahtarı her istemcide durur;
 * erişimi Firestore kuralları sınırlar (`firestore.rules` — yalnız `geribildirim`e biçimli
 * belge EKLENİR, okunamaz). Yerel analitik ayarı ise `GoogleService-Info.plist` /
 * `google-services.json`dadır ve depoya girmez.
 */
export const FIREBASE = {
  projectId: 'tea-house-tycoon',
  apiKey: 'AIzaSyAHi-pDrTferjmqbyMfErIjlY4035l_i_w',
} as const;

/** Geri bildirim metninin üst sınırı — kuraldaki `metin.size() <= 1000` ile AYNI sayı. */
export const GERI_BILDIRIM_UZUNLUK = 1000;
/** İki gönderim arası en az süre (sn): yanlışlıkla çift dokunuş ve seri gönderimi keser. */
export const GERI_BILDIRIM_ARA_SN = 60;
