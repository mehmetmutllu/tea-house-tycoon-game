import { useGame, LAYOUT, visiblePads } from '../../game/store';
import { cardQuestIndex, kat1OmurgaBitti } from '../../game/rules';
import { MERDIVEN_PAD, MERDIVEN_PAD_YER, merdivenPadAcik } from '../../game/kat';
import { economyConfig as C } from '../../config/economy.config';
import { GroundMarker } from './GroundMarker';
import { fmt } from '../../game/decimal';
import { t } from '../../i18n';

// EKRANDA TEK PAD (quest sistemi, 2026-06-09): yalnız aktif görevin pad'i çizilir (visiblePads —
// tick'teki dolum mantığıyla AYNI kaynak). Renk: personel (hire*) mavi, masa açılışı yeşil.
export function Pad() {
  const padsDone = useGame((s) => s.padsDone);
  const padFills = useGame((s) => s.padFills);
  const tables = useGame((s) => s.tables);
  const stationLevel = useGame((s) => s.stationLevels[0]);
  const lifetime = useGame((s) => s.lifetime);
  const wallet = useGame((s) => s.wallet);
  // G-59: çizilen pad, KARTIN gösterdiği görevden türer (tick'teki dolum mantığıyla aynı
  // çağrı). Ham `questIndex` kutlama penceresinde çoktan yeni görevi gösteriyor.
  const questIndex = useGame(cardQuestIndex);
  const waiterServed = useGame((s) => s.stats.waiterServed);
  const tableLevels = useGame((s) => s.tableLevels);
  const cash = wallet.toNumber();
  const gate = { padsDone, tables, stationLevel, lifetime: lifetime.toNumber(), waiterServed, tableLevels };

  const pads = visiblePads(questIndex, gate);

  return (
    <>
      {pads.map((pad) => {
        const fill = padFills[pad.id] ?? 0;
        const isHire = pad.effect.type === 'hireWaiter' || pad.effect.type === 'hireDishwasher';
        // KALAN tutar gösterilir (2026-06-11 feedback: "100'e 50 verdiysem 50 yazsın").
        const remaining = Math.max(0, Math.ceil(pad.cost - fill));
        return (
          <GroundMarker
            key={pad.id}
            pos={LAYOUT.padPos[pad.id]}
            label={t(pad.label)}
            sub={fmt(remaining)}
            pip="coin"
            tint={isHire ? '#42a5f5' : '#43d17a'}
            progress={fill / pad.cost}
            afford={cash >= remaining}
          />
        );
      })}
      <MerdivenPad />
    </>
  );
}

/**
 * D-192: Kat 1'in merdiven pad'i (omurga bitince merdivenin önünde). Dolum store'da; çizim aynı
 * koşuldan (`merdivenPadAcik`). Dönüşüm anı (yıkık merdiven → düzgün) görsel turda.
 */
function MerdivenPad() {
  const acik = useGame((s) => merdivenPadAcik(kat1OmurgaBitti(s.padsDone), s.kat2));
  const fill = useGame((s) => s.padFills[MERDIVEN_PAD] ?? 0);
  const cash = useGame((s) => s.wallet.toNumber());
  if (!acik) return null;
  const { cost } = C.kat2.merdiven;
  const remaining = Math.max(0, Math.ceil(cost - fill));
  return (
    <GroundMarker
      pos={[MERDIVEN_PAD_YER[0], 0, MERDIVEN_PAD_YER[1]]}
      label={t('Merdiven')}
      sub={fmt(remaining)}
      pip="coin"
      tint="#43d17a"
      progress={fill / cost}
      afford={cash >= remaining}
    />
  );
}
