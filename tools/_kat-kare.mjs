/**
 * _kat-kare.mjs — parametreli göz kontrolü (K2-2b): adım listesiyle kare al.
 * Kullanım: node tools/_kat-kare.mjs <klasör> x '[["kat2"],["gec"],["tp",x,z],["js","..."],["kare","ad",ms]]'
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 5311);
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const sunucu = spawn(process.execPath, [path.join(KOK, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: KOK, stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch { /* yok */ }
  await new Promise((r) => setTimeout(r, 400));
}
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
try {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  const kare = async (ad, bekle = 1200) => { await s.waitForTimeout(bekle); await s.screenshot({ path: `${OUT}/${ad}.png` }); console.log(ad, JSON.stringify(await s.evaluate(() => { const g = window.__game(); return { kat: g.kat, p: g.player, gecis: g.katGecis, alan: g.areasOpen }; }))); };
  const ad = process.argv[3] ?? 'x';
  const adim = JSON.parse(process.argv[4] ?? '[]');
  for (const [tur, ...a] of adim) {
    if (tur === 'tp') await s.evaluate(([x, z]) => window.__teleport(x, z), a);
    else if (tur === 'kat2') await s.evaluate(() => window.__kat2());
    else if (tur === 'gec') await s.evaluate(() => window.__kat2(2));
    else if (tur === 'js') await s.evaluate(a[0]);
    else if (tur === 'kare') await kare(a[0], a[1] ?? 3500);
  }
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  sunucu.kill();
}
