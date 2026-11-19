import { chromium } from 'playwright';
const PORT = 5193;
const OUT = process.argv[2];
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const b = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const c = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const s = await c.newPage();
const hata = []; s.on('pageerror', (e) => hata.push(e.message));
await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await s.waitForFunction(() => typeof window.__game === 'function');
await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 500000 }), KAT1_PADS);
await s.evaluate(() => window.__kat2(2));
await s.waitForTimeout(2500);
const set = (o) => s.evaluate(async (o) => { const { useGame } = await import('/src/game/store.ts'); const k = useGame.getState().kat2; window.__setState({ kat2: { ...k, padsDone: ['k2okey2','k2cezve'], yuk: { ocak: o } } }); }, o);
await set(0);
await s.evaluate(() => window.__sinema({ pos: [-11, 7.5, -7], bak: [-11, 1, -16.5], fov: 75 }));
await s.waitForTimeout(2000);
for (const o of [0, 1, 2, 3, 4, 5]) {
  await set(o);
  for (let i = 0; i < 8; i++) {
    await s.screenshot({ path: `${OUT}/m${o}-${i}.png`, clip: { x: 0, y: 200, width: 440, height: 500 } });
    await s.waitForTimeout(120);
  }
  await s.waitForTimeout(1500);
  await s.screenshot({ path: `${OUT}/m${o}-son.png`, clip: { x: 0, y: 200, width: 440, height: 500 } });
}
console.log(hata);
await b.close();
