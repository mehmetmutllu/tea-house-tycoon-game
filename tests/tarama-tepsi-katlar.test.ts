/**
 * Tarama 2026-11-18 (oynanış #5) BEKÇİSİ: tek tepsi iki kat. Kat 1 çayıyla Kat 2'ye çıkan oyuncu kapasiteyi
 * aşacak kadar kahve alamaz; Kat 2 kahvesiyle Kat 1'e inen de kapasiteyi aşacak kadar çay alamaz.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame, servicePlace } from '../src/game/store';
import { OCAK } from '../src/game/kat';
import { yeniKat2Dunya } from '../src/game/kat2Dongu';
import { trayCapacityFor } from '../src/config/economy.config';
import type { Vec3 } from '../src/game/types';

const HEPSI = [...C.kat2.hazir, 'k2okey1'];

function kat2de(tray: number): void {
  useGame.getState().hardReset();
  useGame.getState().kat2Ac();
  const d = yeniKat2Dunya(HEPSI, C.kat2 as never);
  useGame.setState({
    kat: 2,
    kat2: { acik: true, padsDone: HEPSI },
    kat2Dunya: { ...d, ocaklar: d.ocaklar.map((o) => ({ ...o, hazir: 20 })) },
    wallet: new Decimal(0),
    tray,
    player: [OCAK.al[0], 0.6, OCAK.al[1]] as Vec3,
  });
}

describe('tek tepsi, iki kat', () => {
  const kap = trayCapacityFor(useGame.getState().charUpgrades.tray);

  it('Kat 1 tepsisi doluyken Kat 2 ocağından kahve alınmaz', () => {
    kat2de(kap);
    for (let t = 0; t < 2; t += 0.1) useGame.getState().tick(0.1);
    expect(useGame.getState().kat2Dunya.tepsi).toBe(0);
  });

  it('Kat 1 tepsisi boşken Kat 2 ocağından kapasite kadar alınır, kapasite aşılmaz', () => {
    kat2de(1);
    for (let t = 0; t < 2; t += 0.1) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.kat2Dunya.tepsi).toBe(kap - 1);
    expect(s.tray + s.kat2Dunya.tepsi).toBe(kap);
  });

  it("Kat 2 kahvesiyle Kat 1'e inen oyuncu ocaktan kapasiteyi aşacak kadar çay almaz", () => {
    for (const kahve of [kap, kap - 1]) {
      kat2de(0);
      const st = servicePlace(useGame.getState().areasOpen).station;
      useGame.setState({
        kat: 1,
        kat2Dunya: { ...useGame.getState().kat2Dunya, tepsi: kahve },
        ready: { ...useGame.getState().ready, tea: 20 },
        player: [st[0], 0.6, st[2]] as Vec3,
        inputKeyboard: [0, 0],
        inputJoystick: [0, 0],
      });
      useGame.getState().tick(0.1);
      expect(useGame.getState().tray).toBe(kap - kahve);
    }
  });

  it("Kahveleri bırak: Kat 2 tepsisi boşalır, fincanlar Kat 2'nin temiz havuzuna döner", () => {
    kat2de(0);
    const d = useGame.getState().kat2Dunya;
    useGame.setState({ kat2Dunya: { ...d, tepsi: 3, temiz: 5 } });
    useGame.getState().emptyTray('kahve');
    const s = useGame.getState().kat2Dunya;
    expect(s.tepsi).toBe(0);
    expect(s.temiz).toBe(8);
  });
});
