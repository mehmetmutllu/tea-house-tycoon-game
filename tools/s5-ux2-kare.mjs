/**
 * s5-ux2-kare.mjs — G-120 (M1 kart + M2 Görevler sekmesi) kareleri: telefon 390×844 + tablet 820×1180, Kat 1 + Kat 2.
 *
 * Kullanım: node tools/s5-ux2-kare.mjs   (UX_PORT, varsayılan 4171; HMR + izleme KAPALI — paralel ajanlar dosya yazıyor)
 * Çıktı docs/kareler/s5-ux2-<cihaz>-<kat>-<ad>.png + konsolda kartın kutusu (oyun alanından ne kadar yer aldığı).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.UX_PORT ?? 4171);
const OUT = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const CIHAZ = [
  { ad: 'telefon', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  { ad: 'tablet', viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1 },
];

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];

for (const c of CIHAZ) {
  const baglam = await tarayici.newContext({ viewport: c.viewport, deviceScaleFactor: c.deviceScaleFactor, hasTouch: true, isMobile: c.ad === 'telefon' });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(`${c.ad}: ${e.message}`));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(`${c.ad}: ${m.text()}`); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  const kare = (ad) => s.screenshot({ path: path.join(OUT, `s5-ux2-${c.ad}-${ad}.png`) });
  const kutu = (sel) => s.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { ust: Math.round(r.top), yuk: Math.round(r.height), en: Math.round(r.width) }; }).catch(() => null);

  // ── Kat 1: "5 çay servis et" 2/5 → sırada "Çay ocağını yükselt" (yükseltme, amber) + sonraki.
  await s.evaluate(() => window.__setState({ padsDone: ['table2'], kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 2000, charPanelSeen: true, trayTipSeen: true, washTipSeen: true }));
  await s.evaluate(() => window.__setQuest('q_serve5'));
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const g = useGame.getState();
    useGame.setState({ questBase: g.questBase - 2 });
  });
  await s.waitForTimeout(1500);
  console.log(c.ad, 'kat1 kart', await kutu('[data-testid="quest"]'), 'yan yığın', await kutu('.side-stack'));
  await kare('kat1-kart');
  await s.click('[data-testid="quests"]');
  await s.waitForSelector('[data-testid="quests-panel"]');
  await s.waitForTimeout(400);
  await kare('kat1-gorevler');
  await s.click('[data-testid="quests"]');

  // ── Kat 2: "Garsonlarınla 40 kahve götür" 23/40 → sırada okey salonu.
  await s.evaluate((pads) => window.__setState({ padsDone: pads, wallet: 200000 }), KAT1_PADS);
  await s.evaluate(() => window.__kat2(2));
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    for (let i = 0; i < 300 && !(useGame.getState().kat === 2 && useGame.getState().katGecis == null); i++) await new Promise((r) => setTimeout(r, 50));
  });
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const { economyConfig } = await import('/src/config/economy.config.ts');
    const { kat2Gorevleri } = await import('/src/game/kat2Gorev.ts');
    const g = useGame.getState();
    // G-128 metnini de göstersin: "Garsonlarınla 40 kahve götür" 23/40; zincir o göreve kadar açık.
    const hat = kat2Gorevleri(economyConfig.kat2Gorevler, economyConfig.kat2);
    const idx = hat.findIndex((d) => d.id === 'k2_kahve40');
    const zincir = economyConfig.kat2.padler.map((p) => p.id);
    const son = zincir.indexOf('k2cezve2');
    const pads = [...new Set([...g.kat2.padsDone, ...zincir.slice(0, son + 1)])];
    useGame.setState({ kat2: { ...g.kat2, padsDone: pads, gorev: { idx, sayac: { servis: 23 } } } });
  });
  await s.waitForTimeout(6500); // tanıtım bandı + ipucu geçsin
  console.log(c.ad, 'kat2 kart', await kutu('[data-testid="kat-bandi"]'), await s.$eval('[data-testid="kat-bandi"]', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => null));
  await kare('kat2-kart');
  await s.click('[data-testid="quests"]');
  await s.waitForSelector('[data-testid="quests-panel"]');
  await s.waitForTimeout(400);
  await kare('kat2-gorevler');
  await s.click('[data-testid="gunluk-ozet"]');
  await s.waitForTimeout(300);
  await s.$eval('[data-testid="daily-list"]', (e) => e.scrollIntoView({ block: 'end' }));
  await kare('kat2-gorevler-gunluk');
  await baglam.close();
}

console.log(hatalar.length ? `KONSOL HATASI:\n${hatalar.join('\n')}` : 'konsol hatası yok');
await tarayici.close();
await sunucu.close();
