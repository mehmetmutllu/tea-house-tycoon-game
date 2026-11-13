/**
 * basarim.ts — PLAY GAMES BAŞARIMLARI (F4b · D-153). Saf: kayıttan hangi başarımların açık
 * olduğunu türetir. Başarımın kendi sayacı ya da kayıt alanı YOK — `goalMetricsOf` deseni: her
 * yoklamada durumdan hesaplanır. Böylece bulut kaydından gelen oyuncu, çevrimdışıyken kazandığı
 * başarımlar ve girişten ÖNCE kazanılanlar ayrı bir defter tutulmadan bir sonraki yoklamada gider.
 */
import type { Kat2Ayar } from './kat2Dongu';
import { economyConfig as C, levelProgress } from '../config/economy.config';
import { playGamesConfig, type BasarimOlcu } from '../config/playGames.config';
import { totalTiers } from './goals';
import { KAT2_MASALAR, KAT2_SV_MAX, kat2AcikAlan } from './kat';
import { kat2GorevHattiBitti, type Kat2GorevDurum } from './kat2Gorev';
import { activeQuestIndex } from './questProgress';
import type { SaveData } from './save';
import { deriveWorld } from './world';

export type BasarimKaydi = Pick<
  SaveData,
  'stats' | 'padsDone' | 'lifetime' | 'tableLevels' | 'mastersOwned' | 'goalsClaimed' | 'questsDone' | 'xp'
> & {
  /** S3: Kat 2 kaydı (eski çağıranlar vermeyebilir → Kat 2 başarımları kapalı). */
  kat2?: Kat2GorevDurum & { acik: boolean };
};

const KAT2_MASA = new Set(KAT2_MASALAR.map((m) => m.id));

/** Kat 2 ölçüleri — hepsi `kat2` kaydından türer (ayrı sayaç yok). */
function kat2Olculeri(k: BasarimKaydi['kat2']) {
  if (!k?.acik) return { kat2Acik: 0, kat2Pad: 0, kat2Alan: 0, kat2Bitti: 0, kat2SonSvMasa: 0, kat2GorevHatti: 0 };
  const zincir = C.kat2.padler.map((p) => p.id);
  const sv = k.masaSv ?? {};
  return {
    kat2Acik: 1,
    kat2Pad: zincir.filter((id) => k.padsDone.includes(id)).length,
    kat2Alan: kat2AcikAlan(k.padsDone),
    kat2Bitti: zincir.every((id) => k.padsDone.includes(id)) ? 1 : 0,
    kat2SonSvMasa: k.padsDone.filter((id) => KAT2_MASA.has(id) && (sv[id] ?? 1) >= KAT2_SV_MAX).length,
    kat2GorevHatti: kat2GorevHattiBitti(k, C.kat2Gorevler, C.kat2 as Kat2Ayar) ? 1 : 0,
  };
}

export function basarimOlculeri(s: BasarimKaydi): Record<BasarimOlcu, number> {
  const masa = deriveWorld(s.padsDone).tables.length;
  return {
    servis: s.stats.teasServed + s.stats.waiterServed,
    pad: s.padsDone.length,
    kazanc: Math.max(0, Math.floor(Number(s.lifetime) || 0)),
    bulasik: s.stats.dishesWashed,
    garson: s.stats.waiterServed,
    sonSeviyeMasa: s.tableLevels.slice(0, masa).filter((l) => l >= C.tables.upgrade.maxLevel).length,
    usta: s.mastersOwned.length,
    hedef: s.goalsClaimed.length >= totalTiers() ? 1 : 0,
    gorevHatti: activeQuestIndex(C.quests, s.questsDone) >= C.quests.length ? 1 : 0,
    seviye: levelProgress(s.xp).level,
    ...kat2Olculeri(s.kat2),
  };
}

/** Koşulu sağlanmış başarımların anahtarları (config sırasıyla). */
export function acikBasarimlar(s: BasarimKaydi): string[] {
  const o = basarimOlculeri(s);
  return playGamesConfig.basarimlar.filter((b) => o[b.olcu] >= b.esik).map((b) => b.anahtar);
}
