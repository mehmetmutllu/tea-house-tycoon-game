/**
 * s5-tabela-kare.mjs — S5 kafe adı tabelası (kapı direkleri arası kemer) kareleri: oyun kamerası (portre telefon,
 * HUD'lu) + geniş sinema kadrajı. Kısa ad ve 20 harflik ad. Kurulum `tools/s5-ga-kare.mjs`le aynı (Kat 1 tamamı açık).
 *
 * Koşu: node tools/s5-tabela-kare.mjs   (port TB_PORT, varsayılan 4181; HMR kapalı)
 * Çıktı: docs/kareler/s5-tabela-*.png
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.TB_PORT ?? 4181);
const OUT = path.join(KOK, 'docs/kareler');
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const TEL = { viewport: { width: 440, height: 956 }, dpr: 2, mobil: true };
const GENIS = { viewport: { width: 1280, height: 860 }, dpr: 1.25, mobil: false };
const ADLAR = [['kisa', 'Köşe'], ['uzun', 'Çınaraltı Kıraathane']];
/** [ad, kip, ...] — 'oyun': oyuncu (dx kapıdan, z, 'bos' = müşteriler silinir: yalnız oyuncu) · 'sinema': pos/bak kapı eksenine göre, fov. */
const KARELER = [
  ['oyun-ic', 'oyun', 0, 15.9],
  ['oyun-ic-bos', 'oyun', 0, 15.9, 'bos'],
  ['oyun-ic2-bos', 'oyun', 0, 15.2, 'bos'],
  ['oyun-kapi', 'oyun', 0.6, 17.5],
  ['oyun-dis', 'oyun', 1.2, 19.2],
  ['oyun-yan', 'oyun', 4.2, 16.3],
  ['genis', 'sinema', [0, 7, 29], [0, 1.4, 15], 50],
  ['yakin', 'sinema', [2.5, 3.2, 23], [0, 1.8, 17], 45],
];

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
async function sayfa(v) {
  const b = await tarayici.newContext({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.mobil, isMobile: v.mobil });
  const s = await b.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function' && !!window.__three);
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), KAT1_PADS);
  await s.evaluate(() => window.__advanceTime(20));
  await s.waitForTimeout(1500);
  return s;
}
try {
  const o = await sayfa(TEL);
  const g = await sayfa(GENIS);
  await g.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  const kapi = await o.evaluate(async () => (await import('/src/game/layout.ts')).doorX(window.__game().areasOpen ?? 3));
  for (const [etiket, ad] of ADLAR) {
    for (const s of [o, g]) await s.evaluate((ad) => window.__setState({ kafeAdi: ad }), ad);
    for (const [kare, kip, a, b, c] of KARELER) {
      const dosya = path.join(OUT, `s5-tabela-${etiket}-${kare}.png`);
      if (kip === 'sinema') {
        await g.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [[a[0] + kapi, a[1], a[2]], [b[0] + kapi, b[1], b[2]], c]);
        await g.waitForTimeout(1600);
        await g.screenshot({ path: dosya });
      } else {
        if (c === 'bos') await o.evaluate(() => window.__setState({ npcs: [], spawnTimer: 999 }));
        await o.evaluate(([x, z]) => window.__teleport(x, z), [kapi + a, b - 0.2]);
        await o.evaluate(() => window.__girdi(0, 1));
        await o.waitForTimeout(90);
        await o.evaluate(() => window.__girdi(0, 0));
        await o.evaluate(([x, z]) => window.__teleport(x, z), [kapi + a, b]);
        await o.waitForTimeout(1800);
        await o.screenshot({ path: dosya });
      }
      console.log('kare', etiket, kare);
    }
  }
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 6));
  await tarayici.close();
  await sunucu.close();
}
