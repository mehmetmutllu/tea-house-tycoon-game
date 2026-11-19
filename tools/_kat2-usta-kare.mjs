/**
 * _kat2-usta-kare.mjs — D-206 kareleri: Kat 2 Sv5 masanın Usta noktası · Usta modalı · Usta olmuş masa (nokta düşer).
 * Kullanım: node tools/_kat2-usta-kare.mjs docs/kareler
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4121);
const OUT = path.resolve(process.argv[2] ?? 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const MASA = 'k2okey2';
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
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000, diamonds: 100 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(2500);
  const nokta = await s.evaluate(async (masa) => {
    const { useGame } = await import('/src/game/store.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const dongu = await import('/src/game/kat2Dongu.ts');
    const k = useGame.getState().kat2;
    const hepsi = [...cfg.economyConfig.kat2.hazir, ...cfg.economyConfig.kat2.padler.map((p) => p.id).slice(0, 6)];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi }, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__kat2Sv(masa, 5);
    const s1 = useGame.getState();
    return dongu.kat2UstaNoktalari(s1.kat2.padsDone, s1.kat2.masaSv, s1.mastersOwned).find((n) => n.masaId === masa);
  }, MASA);
  if (!nokta) throw new Error('Usta noktası yok');
  // 1) Nokta: oyuncu masanın yanında, noktanın dışında.
  await s.evaluate(([x, z]) => window.__teleport(x - 1.2, z + 1.5), [nokta.x, nokta.z]);
  await s.waitForTimeout(3000);
  await s.screenshot({ path: path.join(OUT, 'kat2-usta-1-nokta.png') });
  // 2) Noktaya bas, dur → modal (kenar tetiği: konum değişimi kolu kurar).
  await s.evaluate(([x, z]) => window.__teleport(x, z), [nokta.x, nokta.z]);
  await s.waitForSelector('[data-testid="master-bar"]', { timeout: 8000 });
  await s.waitForTimeout(600);
  const modal = await s.evaluate(() => ({ id: document.querySelector('[data-testid="master-bar"]')?.getAttribute('data-master'), metin: document.querySelector('.usta-card')?.textContent }));
  console.log('MODAL', JSON.stringify(modal));
  await s.screenshot({ path: path.join(OUT, 'kat2-usta-2-modal.png') });
  // 3) 💎 ile al → nokta düşer, masa Usta.
  await s.click('[data-testid="master-buy"]');
  await s.waitForTimeout(400);
  // İlk Usta'dan sonra Kat 1'deki gibi başlangıç paketi teklifi bir kez çıkar — kapatılır.
  await s.click('text=Şimdi değil').catch(() => {});
  await s.waitForTimeout(300);
  await s.evaluate(([x, z]) => window.__teleport(x - 2.4, z + 2.4), [nokta.x, nokta.z]);
  await s.waitForTimeout(2000);
  const son = await s.evaluate(() => ({ masters: window.__game().mastersOwned ?? null, diamonds: window.__game().diamonds }));
  console.log('SONRA', JSON.stringify(son));
  await s.screenshot({ path: path.join(OUT, 'kat2-usta-3-usta-masa.png') });
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
