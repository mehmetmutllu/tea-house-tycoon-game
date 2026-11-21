/**
 * g108.test.ts — G-108 "garsonlar bana çarpıyor: oyuncunun ve birbirlerinin içinden geçsinler" bekçisi.
 *
 * Kat 1 personeli (garson) oyuncuyu İTEREK yol vermez: oyuncu her karede garsonun üstünde dursa da garsonun
 * bir karelik yer değiştirmesi kendi adımını aşmaz (eski `navStep(..., player, obstacles)` ayrışması onu
 * oyuncudan `actorRadius + playerRadius` uzağa fırlatıyordu) ve servisi oyuncu yokken olduğu gibi yapar.
 * Kat 2'de garson↔oyuncu/garson çarpışması zaten yok (`kat2Dongu` garson yürüyüşü yalnız hedefe gider).
 */
import { describe, it, expect } from 'vitest';
import { useGame, LAYOUT, servicePlace, parkSpot } from '../src/game/store';
import { economyConfig as C } from '../src/config/economy.config';
import type { Npc, Vec3 } from '../src/game/types';

const zincireKadar = (son: string): string[] => C.pads.slice(0, C.pads.findIndex((p) => p.id === son) + 1).map((p) => p.id);

function musteri(id: number, tableIndex: number): Npc {
  const seat = LAYOUT.tables[tableIndex].seats[0];
  return { id, state: 'waitingForTea', pos: [...seat] as Vec3, tableIndex, seatIndex: 0, timer: 999, product: 'tea', color: '#27ae60' };
}

/** Garson tepside çayla masaya gider. `ustunde`: oyuncu her kare garsonun üstüne konur. Kare başına yer değiştirme + servis anı. */
function kos(ustunde: boolean) {
  useGame.getState().hardReset();
  const w0 = servicePlace(1).pickup;
  useGame.setState({
    padsDone: zincireKadar('waiter'),
    waiters: [{ pos: [w0[0], 0.6, w0[2]] as Vec3, tray: 1, trayFood: 0, dirtyCarry: 0 }],
    npcs: [musteri(900, LAYOUT.tables.length > 2 ? 2 : 0)],
    dishes: [], cleanCups: 0,
    player: parkSpot(), inputKeyboard: [0, 0], inputJoystick: [0, 0], spawnTimer: 999,
  });
  const adim: number[] = [];
  let servis = -1;
  for (let k = 0; k < 400 && servis < 0; k++) {
    const once = useGame.getState().waiters[0].pos;
    if (ustunde) useGame.setState({ player: [once[0], 0.6, once[2]] as Vec3 });
    useGame.getState().tick(0.05);
    const s = useGame.getState();
    const w = s.waiters[0].pos;
    adim.push(Math.hypot(w[0] - once[0], w[2] - once[2]));
    if (s.npcs.find((n) => n.id === 900)?.state === 'drinking') servis = k;
  }
  return { adim, servis };
}

describe('G-108 personel oyuncuyu itmez, içinden geçer', () => {
  it('oyuncu garsonun üstündeyken de garson kendi adımıyla yürür ve aynı karede servis eder', () => {
    const serbest = kos(false);
    const ustunde = kos(true);
    expect(serbest.servis, 'garson servis etmedi (senaryo boş)').toBeGreaterThan(0);
    const enBuyuk = Math.max(...serbest.adim);
    for (const [k, d] of ustunde.adim.entries()) expect(d, `kare ${k}: garson ${d.toFixed(3)} br sıçradı (itiliyor)`).toBeLessThanOrEqual(enBuyuk + 1e-6);
    expect(ustunde.servis).toBe(serbest.servis);
  });
});
