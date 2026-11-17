/**
 * D-184 döngüsünün MEKANİZMA ayarı — config'in G5 öncesi hâli (3 dk oyun · ilk kahve 25 sn sonra ·
 * kahve parası kalkışta tek yığın). D-198 (G5, kol G2) config'i değiştirdi; bu testler yığın/sabır/kuyruk
 * mekaniğini bayraksız yolda bekçiler. Yeni akış (hemen kahve + anında para) `kat2-g-turu.test.ts`'te.
 * D-201 bulaşığı (config `bulasik`) burada YOK: fincan sınırsız mekanik bekçilenir; bulaşık `kat2-isleyis.test.ts`'te.
 */
import { economyConfig as C } from '../src/config/economy.config';
import type { Kat2Ayar } from '../src/game/kat2Dongu';

export const D184_AYAR: Kat2Ayar = {
  ...C.kat2,
  oturum: 180,
  gelisAralik: 15,
  masaUcreti: 72,
  ilkGelis: undefined,
  ilkKahve: undefined,
  kahveAninda: false,
  bulasik: undefined,
};
