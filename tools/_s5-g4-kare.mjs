/**
 * _s5-g4-kare.mjs — S5 3. tur G4 kareleri: 4. garson pad'i (tavla 5 bitince) + 4 garson (pad alınınca).
 * Kullanım: node tools/_s5-g4-kare.mjs docs/kareler   (BAK_PORT varsayılan 4190, HMR kapalı)
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4190);
const OUT = path.resolve(process.argv[2]);
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
try {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 0 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(2500);
  const kur = (son) => s.evaluate(async (son) => {
    const { useGame } = await import('/src/game/store.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const ids = cfg.economyConfig.kat2.padler.map((p) => p.id);
    const k = useGame.getState().kat2;
    const hepsi = [...cfg.economyConfig.kat2.hazir, ...ids.slice(0, ids.indexOf(son) + 1)];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi }, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  }, son);
  await kur('k2tavla5');
  await s.evaluate(() => window.__teleport(1.5, -3.2));
  await s.waitForTimeout(3000);
  await s.screenshot({ path: path.join(OUT, 's5-g4-1-pad.png') });
  await kur('k2garson4');
  await s.waitForTimeout(4000); // yeni pad'e kamera gezisi biter
  await s.evaluate(() => window.__teleport(1.5, -3.2));
  await s.waitForTimeout(1500);
  await s.screenshot({ path: path.join(OUT, 's5-g4-2-dort-garson.png') });
  console.log('GARSON', await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const d = useGame.getState().kat2Dunya;
    return [d.garson, ...(d.garsonEk ?? [])].filter(Boolean).map((g) => `${g.x.toFixed(1)},${g.z.toFixed(1)}`).join(' | ');
  }));
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
