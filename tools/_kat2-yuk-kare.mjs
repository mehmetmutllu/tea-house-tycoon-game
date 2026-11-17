/**
 * _kat2-yuk-kare.mjs — D-200 kareleri: Kat 2 ocak yükseltme noktası (oyun kadrajı) + Kat 2 garson sekmesi.
 * Kullanım: node tools/_kat2-yuk-kare.mjs <klasör>
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4119);
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
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(2500);
  // 1) Zincirin başı: okey4 bitmiş → ocak noktası (1. alım) görünür; oyuncu ocağın önünde.
  const kur = (pads, yuk) => s.evaluate(async ([pads, yuk]) => {
    const { useGame } = await import('/src/game/store.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const k = useGame.getState().kat2;
    const hepsi = [...cfg.economyConfig.kat2.hazir, ...cfg.economyConfig.kat2.padler.map((p) => p.id).slice(0, pads)];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, yuk }, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  }, [pads, yuk]);
  await kur(3, {});
  await s.evaluate(() => window.__teleport(-3.5, -9.0));
  await s.waitForTimeout(2500);
  await s.screenshot({ path: path.join(OUT, '1-ocak-noktasi.png') });
  // 2) Ocak 3 alım: mangal büyümüş, nokta sıradaki fiyatla.
  await kur(14, { ocak: 3 });
  await s.waitForTimeout(2500);
  await s.screenshot({ path: path.join(OUT, '2-ocak-3-alim.png') });
  // 3) Garson sekmesi (bütün zincir, tavla 6 açık: hız açık, tepsi açık, 2. garson kilitli).
  await kur(20, { ocak: 5 });
  await s.waitForTimeout(800);
  await s.click('[data-testid="nav-char"]').catch(async () => s.click('text=Çaycı'));
  await s.waitForTimeout(1500);
  await s.click('[data-testid="char-tab-k2garson"]');
  await s.waitForTimeout(1500);
  await s.screenshot({ path: path.join(OUT, '3-garson-sekmesi.png') });
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
