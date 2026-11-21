/**
 * s5-npc-usta.mjs — S5 NPC: G-109 kahve ustası kareleri + Kat 2 grup gövdesi perf ölçümü.
 * Koşu: node tools/s5-npc-usta.mjs kare <ad>   → docs/kareler/s5-npc-g109-<ad>.png (mutfak, 3 an yan yana)
 *       node tools/s5-npc-usta.mjs perf        → konsola __perf() (tüm masalar açık; oturan / kalkış+geliş anı)
 * Port NPC_PORT (4120; kendi sunucusu, HMR kapalı).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.NPC_PORT ?? 4120);
const KIP = process.argv[2] ?? 'kare';
const AD = process.argv[3] ?? 'once';
const OUT = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
try {
  const baglam = await tarayici.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function' && !!window.__three);
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
  await s.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  /** Bütün Kat 2 açık; `kalkis`: masalar 0,5-3 sn içinde kalkar (Sv5: yeni grup hemen yolda → iki takım). */
  const kur = (kalkis) => s.evaluate(async (kalkis) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const kat = await import('/src/game/kat.ts');
    const hepsi = [...new Set([...cfg.economyConfig.kat2.padler.map((p) => p.id), ...kat.OCAKLAR.map((o) => o.id), kat.KAT2_LAVABO_PAD])];
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m, i) => ({ ...m, durum: 'oyunda', t: kalkis ? 0.5 + (i % 6) * 0.5 : 9999, istek: 2, sabir: 9999, kahveT: 9999 }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 2 }));
    w.paralar = [];
    const sv = kalkis ? Object.fromEntries(w.masalar.map((m) => [m.id, 5])) : {};
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, masaSv: sv }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0], player: [14, 0.6, 12] });
  }, kalkis);

  if (KIP === 'perf') {
    await s.evaluate(() => window.__sinema({ pos: [0, 34, 12], bak: [0, 0, -3], fov: 60 }));
    const olc = async (ad, bekle) => {
      await s.waitForTimeout(bekle);
      const ornek = [];
      for (let i = 0; i < 6; i++) {
        await s.waitForTimeout(600);
        ornek.push(await s.evaluate(() => {
          const { scene } = window.__three;
          let govde = 0;
          const gorunur = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
          scene.traverse((o) => { if (o.userData.k2npc && o.type === 'Group' && !o.children.some((c) => c.type === 'Mesh')) for (const c of o.children) if (gorunur(c)) govde++; });
          let kurulu = 0;
          scene.traverse((o) => { if (o.userData.k2npc && o.type === 'Group' && !o.children.some((c) => c.type === 'Mesh')) kurulu += o.children.length; });
          return { ...window.__perf(), govde, kurulu };
        }));
      }
      console.log(ad, JSON.stringify(ornek));
    };
    await kur(false);
    await olc('oturan', 2500);
    await kur(true);
    await olc('kalkis+gelis', 1500);
  } else {
    await kur(false);
    await s.evaluate(() => window.__sinema({ pos: [-10.3, 7.5, -3.6], bak: [-10.3, 0.6, -10.8], fov: 50 }));
    await s.waitForTimeout(1500);
    const kareler = [];
    for (let i = 0; i < 3; i++) {
      const p = path.join(OUT, `_usta-${i}.png`);
      await s.screenshot({ path: p });
      kareler.push(p);
      await s.waitForTimeout(1700);
    }
    const pano = await baglam.newPage();
    await pano.setViewportSize({ width: 1500, height: 380 });
    const img = kareler.map((p) => `<img src="data:image/png;base64,${readFileSync(p).toString('base64')}" style="width:500px;height:380px;object-fit:cover">`).join('');
    await pano.setContent(`<body style="margin:0;display:flex">${img}</body>`);
    await pano.screenshot({ path: path.join(OUT, `s5-npc-g109-${AD}.png`) });
    kareler.forEach((p) => rmSync(p));
    console.log('kare', path.join(OUT, `s5-npc-g109-${AD}.png`));
  }
} finally {
  if (hatalar.length) console.log('HATA', hatalar.slice(0, 5));
  await tarayici.close();
  await sunucu.close();
}
