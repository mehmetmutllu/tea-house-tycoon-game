/**
 * s5-npc-iz.mjs — S5 NPC (G-99/G-100): Kat 2'de TEK masanın grubunu izler — kalkış (çıkış) + yeni grubun
 * gelişi boyunca gövdelerin dünya konumu/görünürlüğü (100 ms) + kare dizisi. Kaybolma anı = görünür
 * gövde sayısının kuyu dışında düşmesi.
 * Koşu: node tools/s5-npc-iz.mjs [masaId] [sv] [ad]   · port NPC_PORT (5188; kendi sunucusu, HMR kapalı)
 * Çıktı: docs/kareler/s5-npc-<ad>-*.png + konsola iz özeti (JSON).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = process.env.NPC_KOK ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Kare anları (sn, izin başından) — kalkış ~1,1 sn'de. */
const ANLAR = (process.env.ANLAR ?? '4,6.6,7.3,10.2,12.2,14').split(',').map(Number);
const PORT = Number(process.env.NPC_PORT ?? 5188);
const MASA = process.argv[2] ?? 'k2s2okey1';
const SV = Number(process.argv[3] ?? 1);
const AD = process.argv[4] ?? 'once';
const KARE = process.env.KARE !== '0';
const OUT = path.join(CIKTI, 'docs/kareler');
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
  await s.evaluate(async ([masa, sv]) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = cfg.economyConfig.kat2.padler.map((p) => p.id);
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    // yalnız izlenen masa oyunda (2 sn sonra kalkar); öbürleri boş ve uzun süre gelmez
    w.masalar = w.masalar.map((m) => (m.id === masa ? { ...m, durum: 'oyunda', t: 2, istek: 0, kahveT: 99 } : { ...m, durum: 'bos', t: 9999 }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 3 }));
    w.paralar = [];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, masaSv: { [masa]: sv } }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0], player: [14, 0.6, 12] });
  }, [MASA, SV]);
  await s.evaluate(() => window.__sinema({ pos: [0, 30, 9], bak: [0, 0, -5], fov: 55 }));
  await s.waitForTimeout(800);
  // iz: 100 ms'de bir görünen k2npc grup gövdeleri (garson hariç: kap = Group, çocukları gövde kökü)
  const izP = s.evaluate(async () => {
    const { scene } = window.__three;
    const { useGame } = await import('/src/game/store.ts');
    const kaplar = [];
    scene.traverse((o) => { if (o.userData.k2npc && o.type === 'Group' && !o.children.some((c) => c.type === 'Mesh')) kaplar.push(o); });
    const out = [];
    const t0 = performance.now();
    const gorunur = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    while (performance.now() - t0 < 34000) {
      const govde = [];
      for (const k of kaplar) for (const c of k.children) {
        if (!gorunur(c)) continue;
        const v = c.getWorldPosition(c.position.clone());
        govde.push([+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2), +c.scale.x.toFixed(3)]);
      }
      const ms = useGame.getState().kat2Dunya.masalar.find((m) => m.durum !== 'bos' || m.t < 100);
      out.push({ t: +((performance.now() - t0) / 1000).toFixed(1), durum: ms ? `${ms.durum}:${ms.t.toFixed(1)}` : '-', govde });
      await new Promise((r) => setTimeout(r, 100));
    }
    return out;
  });
  const bas = Date.now();
  const kareler = [];
  for (const t of KARE ? ANLAR : []) {
    const bekle = bas + t * 1000 - Date.now();
    if (bekle > 0) await s.waitForTimeout(bekle);
    const f = path.join(OUT, `s5-npc-${AD}-${String(t).replace('.', '_')}.png`);
    await s.screenshot({ path: f });
    kareler.push({ f, t });
  }
  const iz = await izP;
  writeFileSync(path.join(CIKTI, `docs/s5-npc-iz-${AD}.json`), JSON.stringify(iz));
  if (kareler.length) {
    // pano: 3 sütun, ≤ 1600 px
    const p = await baglam.newPage();
    await p.setViewportSize({ width: 1600, height: 900 });
    const { readFileSync } = await import('node:fs');
    const kutu = kareler.map(({ f, t }) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${AD} · t=${t} sn</figcaption></figure>`).join('');
    await p.setContent(`<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font:600 15px system-ui;color:#fff}figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:6px;top:4px;background:#000a;padding:2px 6px}</style>${kutu}`);
    await p.screenshot({ path: path.join(OUT, `s5-npc-${AD}-pano.png`), fullPage: true });
  }
  let onceki = -1;
  for (const r of iz) {
    if (r.govde.length !== onceki) console.log(r.t, r.durum, r.govde.length, JSON.stringify(r.govde));
    onceki = r.govde.length;
  }
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 5));
  await tarayici.close();
  await sunucu.close();
}
