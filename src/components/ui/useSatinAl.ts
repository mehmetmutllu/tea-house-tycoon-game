/**
 * useSatinAl — satın alma düğmelerinin ortak kancası (Sprint A · P1 #3/#6). Meşgul durumu, son sonuç
 * ve onun mesaj anahtarı (`magaza.sonuc.*`); metni çağıran `t()` ile çevirir. Ödül vermez: cevaptaki
 * işlem/müşteri bilgisini çağıran store'a iletir.
 */
import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  islemdeUrun, magazaDurumu, satinAlDetay, satinAlmaAbone, satinAlmaSurumu, type SatinAlCevap,
} from '../../game/iap';
import type { SatinAlSonuc } from '../../game/satinAlimTipleri';
import { odulAlindi } from '../../game/ads';

/** Sonucun metni (Türkçe = i18n anahtarı; çağıran `t()` ile çevirir). `tamam`ın yerine ödül kartı çıkar. */
const SONUC_METNI: Record<SatinAlSonuc, string> = {
  tamam: 'Satın alma başarılı!',
  vazgecti: 'Satın almadan vazgeçtin.',
  bekliyor: 'Ödeme bekleniyor. Onaylanınca ödülün gelecek.',
  zatenSahip: 'Bu ürün zaten sende. Geri yüklendi!',
  hata: 'Mağazaya ulaşılamadı. Tekrar dene.',
};
export const sonucAnahtari = (s: SatinAlSonuc) => SONUC_METNI[s];

export function useSatinAl() {
  useSyncExternalStore(satinAlmaAbone, satinAlmaSurumu);
  const [sonuc, setSonuc] = useState<{ urun: string; sonuc: SatinAlSonuc } | null>(null);
  const al = useCallback(async (urun: string): Promise<SatinAlCevap> => {
    setSonuc(null);
    // Tarama-6 #6: satın alma DENEMESİ başladıysa (sonuç ne olursa olsun: vazgeç · hata · bekliyor) bu
    // panelin kapanışı geçişli reklam patlatmaz — oyuncu az önce mağaza ödeme ekranındaydı.
    odulAlindi();
    const c = await satinAlDetay(urun);
    setSonuc({ urun, sonuc: c.sonuc });
    return c;
  }, []);
  const islemde = islemdeUrun();
  return {
    al,
    /** Bir satın alma sürüyor (tüm satın alma düğmeleri kilitli). */
    mesgul: islemde != null,
    /** "Bekleniyor…" gösterilecek ürün. */
    islemde,
    durum: magazaDurumu(),
    sonuc,
    /** Son sonucun mesaj anahtarı (yoksa null). */
    mesaj: sonuc ? sonucAnahtari(sonuc.sonuc) : null,
    temizle: useCallback(() => setSonuc(null), []),
  };
}
