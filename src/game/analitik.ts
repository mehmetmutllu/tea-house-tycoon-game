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
import type { Kat2Ayar } from './kat2Dongu';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { FirebaseAnalyticsPlugin } from '@capacitor-firebase/analytics';
import { economyConfig, levelProgress } from '../config/economy.config';
import { kat2Gorevleri } from './kat2Gorev';
import { useGame } from './store';

type Durum = ReturnType<typeof useGame.getState>;

export interface AnalitikKesit {
  questIndex: number;
  seviye: number;
  padsDone: readonly string[];
  ogreticiAtlandi: boolean;
  /** S3 (Kat 2) — hepsi opsiyonel: eski çağıran/test vermezse Kat 2 olayı doğmaz. */
  kat?: number;
  /** Kat geçişi perdesi iniyor mu — kat değişimi YALNIZ perde sırasında olay sayılır (yükleme değil). */
  katGecisi?: boolean;
  kat2Acik?: boolean;
  kat2Pads?: readonly string[];
  kat2MasaSv?: Readonly<Record<string, number>>;
  kat2GorevIdx?: number;
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
    kat: s.kat,
    katGecisi: s.katGecis != null,
    kat2Acik: s.kat2.acik,
    kat2Pads: s.kat2.padsDone,
    kat2MasaSv: s.kat2.masaSv,
    kat2GorevIdx: s.kat2.gorev?.idx ?? 0,
  };
}

/** Kat 2 hattı (Sv görevleri yalnız `kat2.masaSv` varken) — `kat2_gorev_tamam`ın adları buradan. */
const KAT2_HAT = kat2Gorevleri(economyConfig.kat2Gorevler, economyConfig.kat2 as Kat2Ayar);

/**
 * S3: Kat 2 olayları — `kat2_acildi` (merdiven) · `kat_gecis` · `kat2_nokta_acildi` (hazır pad'ler hariç:
 * onlar `kat2_acildi`yla gelir) · `masa_sv` · `kat2_gorev_tamam`. Toplu sıçrama (yükleme/bulut) olay doğurmaz.
 */
export function kat2AnalitikOlaylari(
  onceki: AnalitikKesit,
  simdiki: AnalitikKesit,
  gorevler: readonly { id: string }[] = KAT2_HAT,
  hazir: readonly string[] = economyConfig.kat2.hazir,
): AnalitikOlay[] {
  const o: AnalitikOlay[] = [];
  const oPads = onceki.kat2Pads ?? [];
  const yeniPad = (simdiki.kat2Pads ?? []).filter((p) => !oPads.includes(p) && !hazir.includes(p));
  const gorevFarki = (simdiki.kat2GorevIdx ?? 0) - (onceki.kat2GorevIdx ?? 0);
  const svOnce = onceki.kat2MasaSv ?? {};
  const svAtlayan = Object.entries(simdiki.kat2MasaSv ?? {}).filter(([id, sv]) => sv > (svOnce[id] ?? 1));
  if (yeniPad.length > YUKLEME_ESIGI || gorevFarki > YUKLEME_ESIGI || svAtlayan.length > YUKLEME_ESIGI) return [];

  if (!onceki.kat2Acik && simdiki.kat2Acik) o.push({ ad: 'kat2_acildi', parametreler: { gorev_sira: simdiki.questIndex + 1 } });
  if (onceki.kat !== undefined && simdiki.kat !== undefined && simdiki.kat !== onceki.kat && simdiki.katGecisi) {
    o.push({ ad: 'kat_gecis', parametreler: { kat: simdiki.kat } });
  }
  for (const nokta of yeniPad) o.push({ ad: 'kat2_nokta_acildi', parametreler: { nokta } });
  for (const [masa, sv] of svAtlayan) o.push({ ad: 'masa_sv', parametreler: { masa, sv } });
  for (let i = onceki.kat2GorevIdx ?? 0; i < (simdiki.kat2GorevIdx ?? 0); i++) {
    const g = gorevler[i];
    if (g) o.push({ ad: 'kat2_gorev_tamam', parametreler: { gorev_id: g.id, gorev_sira: i + 1 } });
  }
  return o;
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
  olaylar.push(...kat2AnalitikOlaylari(onceki, simdiki));
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
