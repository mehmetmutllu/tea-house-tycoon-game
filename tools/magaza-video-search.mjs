/**
 * Search videosu (3:2, D-170): gerçek oynanış, arayüz görünür. Oyuncu ocaktan çay alır, üç masaya
 * servis eder, "4. Masayı aç" pad'ine basar (masa salonun ortasında belirir), dönüşte parayı mıknatısla
 * toplar ve ocağa döner (döngü başı).
 * Oyuncu joystick girdisiyle yürütülür (`__girdi`) — ışınlama yok, çarpışma ve animasyon oyununki.
 */
/** Arama kartı telefonda küçük: kamera oyunun yatay kadrajından biraz yakın (karakterler okunsun). */
const KAM_YAKIN = Number(process.env.KAM_YAKIN ?? 0.8);

export const SURE = Number(process.env.SURE ?? 14);

// [x, z, bekle(sn)]. Masa çarpışma kutusu gövde + oyuncu yarıçapı = ±1,34: yol z = 8,5 ve x = −8,5
// koridorlarından geçer; servis noktası masanın koridora bakan yüzü (gövdeye 0,6 — pay 0,7).
const ROTA = [
  [-14.6, 6.4, 0.7], // ocak (gövdeye 0,65): tepsi dolar
  [-12.8, 8.5, 0],
  [-10.25, 8.5, 0],
  [-10.25, 6.1, 0.35], // masa 3 (−11,7, 5,3)
  [-10.25, 10.9, 0.35], // masa 1 (−11,7, 11,7)
  [-6.75, 10.9, 0.35], // masa 2 (−5,3, 11,7)
  [-6.75, 8.5, 0],
  [-5.3, 5.3, 3.9], // 4. masanın pad'i: 250 akar, masa yerinde belirir
  [-6.75, 8.5, 0],
  [-12.8, 8.5, 0],
  [-14.6, 6.4, 9], // ocakta kalır: döngü harmanı sırasında kamera başlangıç kadrajında dursun
];

// Döngü dikişi: pad'ler görev sırasına bağlı, o yüzden kart "4. Masayı aç"la başlar ve açılınca değişir —
// iki ucun tek kalıcı farkı kart + para + yeni masa. Harman kısa tutulur ki kart yazısı üst üste az görünsün.
export const XF = 0.6;

export async function kur(s) {
  await s.evaluate(() => window.__setState({
    padsDone: ['table2', 'table3', 'waiter'], padFills: {}, stationLevels: [3], tableLevels: [3, 3, 3],
    wallet: 330, diamonds: 45, xp: 1500, questIndex: 12, charUpgrades: { tray: 3, magnet: 3, speed: 2 },
    floorThemeByArea: ['ceviz', 'ceviz', 'ceviz'], tableTheme: 'bordo',
  }));
  await s.waitForTimeout(2000);
  for (let i = 0; i < 20; i++) { await s.evaluate(() => window.__advanceTime(2)); await s.waitForTimeout(100); }
  await s.evaluate(() => window.__setState({ levelUp: null, offlineEarned: 0, coins: [], ready: { tea: 8, tost: 0 } }));
  await s.evaluate(([x, z]) => window.__teleport(x, z), ROTA[0]);
  // SAHNELEME: oyuncunun geçeceği üç masadaki müşteriler çay bekler, garsonların tepsisi boş ve ocakta
  // tam bir tepsi çay var → ilk servisleri oyuncu yapar (garsonlar yeni demi bekler). Kurallar oyununki.
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const st = useGame.getState();
    useGame.setState({
      npcs: st.npcs.map((n) => (n.tableIndex < 3 && n.state === 'drinking' ? { ...n, state: 'waitingForTea', timer: 40, product: 'tea' } : n)),
      waiters: st.waiters.map((w) => ({ ...w, tray: 0, trayFood: 0, claim: undefined })),
      ready: { ...st.ready, tea: 5 },
      tray: 0,
    });
  });
  await s.evaluate((k) => window.__devCam({ distMul: k }), KAM_YAKIN);
  if (process.env.IZ) { const g = await s.evaluate(() => window.__game()); console.log(JSON.stringify({ pad: g.currentPad, padPos: g.padPos, cost: g.padCost, quest: g.quest, tables: g.tables })); }
  if (process.env.PLAN) await s.evaluate(() => window.__devPlan({ topDown: true, zoom: 1.6, gridStep: 1 }));
  await s.waitForTimeout(2000);
}

const yol = { i: 0, bekle: 0, son: -1 };
export async function kare(s, t) {
  const dt = yol.son < 0 ? 0 : t - yol.son;
  yol.son = t;
  const [x, z, bekle] = ROTA[yol.i % ROTA.length];
  const p = await s.evaluate(() => window.__girdi(0, 0));
  const dx = x - p[0];
  const dz = z - p[1];
  const d = Math.hypot(dx, dz);
  if (d < 0.12) {
    yol.bekle += dt;
    if (yol.bekle >= bekle) { yol.i++; yol.bekle = 0; }
  } else {
    const m = Math.min(1, d / 0.6) / d;
    await s.evaluate(([a, b]) => window.__girdi(a, b), [dx * m, dz * m]);
  }
  if (process.env.IZ && Math.round(t * 60) % 30 === 0) {
    const g = await s.evaluate(() => window.__game());
    console.log(t.toFixed(1), yol.i, g.player.join(','), 'tepsi', g.tray, 'para', g.wallet, 'yerde', g.coins, 'pad', g.padFill, 'servis', g.stats?.served ?? '');
  }
}
