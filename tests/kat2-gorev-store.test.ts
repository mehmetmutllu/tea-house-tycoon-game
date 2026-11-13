/**
 * kat2-gorev-store.test.ts — Kat 2 görev hattının STORE BAĞLANTISI bekçisi (S3).
 * `kat2Gorev.ts` saf mantığı `tests/kat2-gorev.test.ts`te; burada store'un onu çağırması denetlenir:
 * tick'te ilerler + ödül cüzdana/lifetime'a + XP + bildirim · kat açılışında kayıttaki pad'e hizalanır (ödülsüz).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { kat2Gorevleri } from '../src/game/kat2Gorev';
import { VARIS } from '../src/game/kat';
import type { Kat2Ayar } from '../src/game/kat2Dongu';
import type { Vec3 } from '../src/game/types';

const HAT = kat2Gorevleri(C.kat2Gorevler, C.kat2 as Kat2Ayar);
const g = globalThis as Record<string, unknown>;
let orig: unknown;

beforeEach(() => {
  const mem: Record<string, string> = {};
  orig = g.localStorage;
  g.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  useGame.getState().hardReset();
});
afterEach(() => {
  if (orig === undefined) delete g.localStorage;
  else g.localStorage = orig;
});

describe('Kat 2 görev hattı — store bağlantısı', () => {
  it('pad görevi tick\'te biter: hat ilerler, ödül cüzdana + lifetime\'a, görev başına XP', () => {
    useGame.getState().kat2Ac();
    const i = HAT.findIndex((x) => x.hedef.tip === 'pad');
    const gorev = HAT[i];
    expect(gorev).toBeDefined();
    const padId = (gorev.hedef as { id: string }).id;
    const k2 = useGame.getState().kat2;
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { ...k2, padsDone: [...k2.padsDone, padId], gorev: { idx: i, sayac: {} } } });
    const s0 = useGame.getState();
    useGame.getState().tick(0.05);
    const s1 = useGame.getState();
    expect(s1.kat2.gorev?.idx).toBeGreaterThan(i);
    expect(s1.wallet.sub(s0.wallet).toNumber()).toBeGreaterThanOrEqual(gorev.reward);
    expect(s1.lifetime.sub(s0.lifetime).toNumber()).toBeGreaterThanOrEqual(gorev.reward);
    expect(s1.xp - s0.xp).toBeGreaterThanOrEqual(C.xp.perQuest);
  });

  it('Kat 1\'deyken de (Kat 2 arkada) hat ilerler ama ödül yine görevden gelir', () => {
    useGame.getState().kat2Ac();
    const i = HAT.findIndex((x) => x.hedef.tip === 'pad');
    const padId = (HAT[i].hedef as { id: string }).id;
    const k2 = useGame.getState().kat2;
    useGame.setState({ kat: 1, kat2: { ...k2, padsDone: [...k2.padsDone, padId], gorev: { idx: i, sayac: {} } } });
    useGame.getState().tick(0.05);
    expect(useGame.getState().kat2.gorev?.idx).toBeGreaterThan(i);
  });

  it('kat açılışında kayıttaki pad\'e hizalanır (ödülsüz)', () => {
    const i = HAT.findIndex((x) => x.hedef.tip === 'pad');
    const padId = (HAT[i].hedef as { id: string }).id;
    useGame.setState({ kat2: { acik: false, padsDone: [padId] } });
    const w0 = useGame.getState().wallet;
    useGame.getState().kat2Ac();
    const s = useGame.getState();
    expect(s.kat2.gorev?.idx).toBeGreaterThan(i);
    expect(s.wallet.eq(w0)).toBe(true);
  });
});
