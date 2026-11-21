/**
 * S5 G-92 bekçisi — Kat 1 ilk tepsi: fiyat 25 + "cebinde fiyatın en az %40'ı varsa eksiği oyun tamamlar".
 * Kural yalnız tepsi kademe 0 → 1 alımında ve görev q_charTray1 aktifken geçer; oyun en çok 15 coin öder.
 * Ölçüm: docs/s5-denge-raporu.md (F25·X40) · final docs/olcum-s5-kat1-final.txt.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C, charNextCost, charTamamlanir } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { D } from '../src/game/decimal';

const Q = C.quests.findIndex((q) => q.id === 'q_charTray1');

function kur(wallet: number, questIndex = Q, tray = 0) {
  useGame.getState().hardReset();
  useGame.setState({ wallet: D(wallet), questIndex, charUpgrades: { tray, magnet: 0, speed: 0 } });
}

describe('G-92 ilk tepsi tamamlama', () => {
  it('sayılar: fiyat 25, eşik %40 → oyun en çok 15 coin hediye eder', () => {
    expect(charNextCost('tray', 0)).toBe(25);
    expect(C.character.tray.ilkTamamla).toEqual({ gorev: 'q_charTray1', oran: 0.4 });
    expect(25 * (1 - C.character.tray.ilkTamamla.oran)).toBe(15);
  });

  it('görev açılınca cüzdan 11: alım geçer, cüzdan sıfırlanır, tepsi 3 bardak', () => {
    kur(11);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(true);
    const s = useGame.getState();
    expect(s.charUpgrades.tray).toBe(1);
    expect(s.wallet.toNumber()).toBe(0);
  });

  it('tam eşik (10) geçer, eşiğin altı (9,9) geçmez', () => {
    kur(10);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(true);
    kur(9.9);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(false);
    expect(useGame.getState().wallet.toNumber()).toBe(9.9);
  });

  it('parası yetiyorsa normal alım: fiyat kadar düşer (hediye yok)', () => {
    kur(30);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(true);
    expect(useGame.getState().wallet.toNumber()).toBe(5);
  });

  it('görev q_charTray1 değilken tamamlama YOK', () => {
    kur(11, Q - 1);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(false);
    expect(charTamamlanir('tray', 0, 11, C.quests[Q - 1].id)).toBe(false);
  });

  it('yalnız ilk tepsi: ikinci kademe ve diğer özellikler tamamlanmaz', () => {
    kur(100, Q, 1);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(false); // T2 130, %40 = 52 ≤ 100 ama kural yok
    kur(150);
    expect(useGame.getState().buyCharUpgrade('magnet')).toBe(false); // mıknatıs 200
    expect(charTamamlanir('magnet', 0, 150, 'q_charTray1')).toBe(false);
  });
});
