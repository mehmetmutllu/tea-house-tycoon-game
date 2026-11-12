/**
 * analitik.ts — Firebase Analytics köprüsü (1.0.7).
 *
 * Soru: oyuncu NEREDE bırakıyor ve ne kadar oynuyor? Oturum süresi Firebase'in kendi
 * otomatik olaylarından (`session_start`, `user_engagement`) gelir; burada yalnız oyunun
 * ilerleme adımları gönderilir. Son `gorev_tamam` olayı oyuncunun bıraktığı adımı gösterir.
 *
 * `audioBridge` deseni: store'a abone olur, iki kesitin FARKINDAN olay türetir (`analitikOlaylari`
 * saf, bekçi onu doğrular). `tick.ts`e dokunulmaz.
 *
 * Yalnız yerel uygulamada (iOS/Android) gönderilir; web/dev'de sessiz. Eklenti `registerPlugin`
 * ile doğrudan yerel köprüden çağrılır — paketin web uygulaması `firebase` JS SDK'sını ister ve
 * oyuna gereksiz yük bindirirdi.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { FirebaseAnalyticsPlugin } from '@capacitor-firebase/analytics';
import { economyConfig, levelProgress } from '../config/economy.config';
import { useGame } from './store';

type Durum = ReturnType<typeof useGame.getState>;

export interface AnalitikKesit {
  questIndex: number;
  seviye: number;
  padsDone: readonly string[];
  ogreticiAtlandi: boolean;
}

export interface AnalitikOlay {
  ad: string;
  parametreler: Record<string, string | number>;
}

/**
 * Tek değişimde bundan büyük sıçrama YÜKLEMEDİR (açılış, bulut kaydı, sıfırlama), oyun değil:
 * olay doğurmaz. Oyunda bir karede en çok bir görev biter, bir nokta açılır.
 */
const YUKLEME_ESIGI = 2;

export function analitikKesiti(s: Durum): AnalitikKesit {
  return {
    questIndex: s.questIndex,
    seviye: levelProgress(s.xp).level,
    padsDone: s.padsDone,
    ogreticiAtlandi: s.ogreticiAtlandi,
  };
}

/** İki kesitin farkından olaylar (saf). `onceki === null` ⇒ ilk kesit, olay yok. */
export function analitikOlaylari(
  onceki: AnalitikKesit | null,
  simdiki: AnalitikKesit,
  gorevler: readonly { id: string }[] = economyConfig.quests,
): AnalitikOlay[] {
  if (!onceki) return [];
  const gorevFarki = simdiki.questIndex - onceki.questIndex;
  const yeniNoktalar = simdiki.padsDone.filter((p) => !onceki.padsDone.includes(p));
  if (gorevFarki > YUKLEME_ESIGI || yeniNoktalar.length > YUKLEME_ESIGI) return [];
  if (simdiki.seviye - onceki.seviye > YUKLEME_ESIGI) return [];

  const olaylar: AnalitikOlay[] = [];
  for (let i = onceki.questIndex; i < simdiki.questIndex; i++) {
    const g = gorevler[i];
    if (g) olaylar.push({ ad: 'gorev_tamam', parametreler: { gorev_id: g.id, gorev_sira: i + 1 } });
  }
  for (const nokta of yeniNoktalar) olaylar.push({ ad: 'nokta_acildi', parametreler: { nokta } });
  for (let l = onceki.seviye + 1; l <= simdiki.seviye; l++) olaylar.push({ ad: 'level_up', parametreler: { level: l } });
  if (!onceki.ogreticiAtlandi && simdiki.ogreticiAtlandi) {
    olaylar.push({ ad: 'ogretici_atla', parametreler: { gorev_sira: simdiki.questIndex + 1 } });
  }
  return olaylar;
}

/** Store'a abone olur ve olayları gönderir. Dönüş: aboneliği bitiren fonksiyon. */
export function analitigiBagla(gonder?: (o: AnalitikOlay) => void): () => void {
  const yolla = gonder ?? yerelGonderici();
  if (!yolla) return () => {};
  let onceki: AnalitikKesit | null = analitikKesiti(useGame.getState());
  return useGame.subscribe((s) => {
    const simdiki = analitikKesiti(s);
    for (const o of analitikOlaylari(onceki, simdiki)) yolla(o);
    onceki = simdiki;
  });
}

function yerelGonderici(): ((o: AnalitikOlay) => void) | null {
  if (!Capacitor.isNativePlatform()) return null;
  const eklenti = registerPlugin<FirebaseAnalyticsPlugin>('FirebaseAnalytics');
  return (o) => {
    // Analitik oyunu ASLA durdurmaz: hata yutulur.
    eklenti.logEvent({ name: o.ad, params: o.parametreler }).catch(() => {});
  };
}
