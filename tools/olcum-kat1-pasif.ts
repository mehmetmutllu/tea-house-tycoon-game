/**
 * olcum-kat1-pasif.ts — Oyuncu Kat 2'deyken Kat 1'in KENDİLİĞİNDEN getirdiği para (D-198: düşen sikke 2 sn sonra cüzdana).
 * Formül yok: Kat 1 arkada gerçekten oynar (D-182), bu araç onu oyuncusuz 20 dk koşturur (5 dk ısınma).
 * Kat 1'in hâli belirler: görev hattının sonu (merdiveni açan oyuncu) ocak L6 · lavabo L6 · garson/bulaşıkçı tavan.
 *   npx tsx tools/olcum-kat1-pasif.ts > docs/olcum-kat1-pasif.txt
 */
import { seedRandom } from './olcum-lib';
import { charMaxTier, economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { VARIS } from '../src/game/kat';
import { yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';
const g = () => useGame.getState();
const DT = 0.1;
function olc(ad: string, ek: (s: ReturnType<typeof g>) => Partial<ReturnType<typeof g>>) {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow(); g().init(); g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  useGame.setState(ek(g()) as never);
  const s = g();
  console.log(ad, 'servis', s.stationLevels, 'masa', s.tables, s.tableLevels.slice(0, s.tables).join(''), 'lavabo', s.lavaboLevel, 'garson', JSON.stringify(s.waiterUpgrades));
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: [] }, kat2Dunya: yeniKat2Dunya([], C.kat2 as unknown as Kat2Ayar) });
  g().setKeyboardInput(0, 0);
  let once = new Map<number, number>(); let top = 0;
  const N = 20 * 60 / DT, IS = 5 * 60 / DT;
  for (let i = 0; i < IS + N; i++) {
    g().tick(DT); useGame.setState({ kasa: D(0) } as never);
    const simdi = new Map(g().coins.map((c) => [c.id, c.value]));
    for (const [id, v] of once) if (!simdi.has(id) && i >= IS) top += v;
    once = simdi;
  }
  console.log('  → Kat 1 oyuncusuz', (top / 20).toFixed(1), 'coin/dk');
}
import { dishCarryMaxTier, dishSpeedMaxTier, waiterSpeedMaxTier } from '../src/config/economy.config';
const GMAX = (s: ReturnType<typeof g>) => ({ ...s.waiterUpgrades, tray: C.waiter.trayUpgrades.costs.length, speed: waiterSpeedMaxTier(), dishCarry: dishCarryMaxTier(), dishSpeed: dishSpeedMaxTier() });
olc('A pad açık, seviyeler taban (D-192…D-200 ölçümlerinin izi)', () => ({}));
olc('D görev hattı sonu: ocak 6 · lavabo 6 · garson/bulaşıkçı max · masa 0', (s) => ({ stationLevels: s.stationLevels.map(() => 6), lavaboLevel: 6, waiterUpgrades: GMAX(s) }));
olc('E + masalar L2', (s) => ({ stationLevels: s.stationLevels.map(() => 6), lavaboLevel: 6, waiterUpgrades: GMAX(s), tableLevels: s.tableLevels.map(() => 2) }));
olc('F tam: + masalar L4', (s) => ({ stationLevels: s.stationLevels.map(() => 6), lavaboLevel: 6, waiterUpgrades: GMAX(s), tableLevels: s.tableLevels.map(() => 4) }));
