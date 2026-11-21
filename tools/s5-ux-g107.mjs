/**
 * s5-ux-g107.mjs — G-107 canlı kanıtı: Kat 2'de TEK pad (k2okey4) gerçek satın alma gibi biter → yeni noktalar
 * (pad:k2garson2 + ocak:k2ocakYuk) belirir → görev kutlaması → kamera panı + ocak bildirimi. Zaman serisi + kareler.
 * Kullanım: UX_PORT=4131 node tools/s5-ux-g107.mjs   Çıktı docs/kareler/s5-ux-g107-*.png
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.UX_PORT ?? 4131);
const OUT = path.join(KOK, 'docs/kareler');
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1.6, hasTouch: true, isMobile: true });
const s = await baglam.newPage();
s.on('pageerror', (e) => hatalar.push(e.message));
s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await s.waitForFunction(() => typeof window.__game === 'function');
await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 500000 }), KAT1_PADS);
await s.evaluate(() => window.__kat2(2));
await s.evaluate(async () => {
  const { useGame } = await import('/src/game/store.ts');
  for (let i = 0; i < 300 && !(useGame.getState().kat === 2 && useGame.getState().katGecis == null); i++) await new Promise((r) => setTimeout(r, 50));
  const g = useGame.getState();
  // k2_okey4 görevi aktif (idx 5), önceki pad'ler alınmış; ipuçları geçilmiş; oyuncu ocak/pad'den uzak (salon girişi).
  useGame.setState({
    kat2: { ...g.kat2, padsDone: [...g.kat2.padsDone, 'k2okey1', 'k2okey3', 'k2garson'], gorev: { idx: 5, sayac: {} } },
    stats: { ...g.stats, kat2Alinan: 5, kat2Yikanan: 5 },
    notice: null, noticeQueue: [], camFocus: null,
  });
});
await s.waitForTimeout(6000); // tanıtım bandı + ilk ölçüm otursun
// GERÇEK satın alma: oyuncu k2okey4 pad'inin üstünde durur, tick cüzdandan doldurur → pad + görev AYNI karede.
await s.evaluate(async () => {
  const { kat2PadYeri } = await import('/src/game/kat2Dongu.ts');
  const [x, z] = kat2PadYeri('k2okey4');
  window.__teleport(x, z);
  const { useGame } = await import('/src/game/store.ts');
  window.__g107 = useGame;
});
const ornek = () => s.evaluate(() => {
  const g = window.__g107.getState();
  return { idx: g.kat2.gorev?.idx, pad: g.kat2.padsDone.includes('k2okey4'), odak: g.camFocus ? g.camFocus.pos.map((v) => +v.toFixed(1)).join(',') : null,
    bildirim: g.notice?.text ?? null, kuyruk: g.noticeQueue.map((n) => n.text) };
});
const sonuc = [];
const t0 = Date.now();
let bitis = null;
const kareAt = new Map([[300, 'a-bitti'], [1700, 'b-pan'], [4300, 'c-bildirim']]);
while (Date.now() - t0 < 20000) {
  const r = { ms: Date.now() - t0, ...(await ornek()) };
  sonuc.push(r);
  if (r.pad && bitis == null) bitis = r.ms;
  if (bitis != null) {
    for (const [ms, ad] of kareAt) if (r.ms - bitis >= ms) { await s.screenshot({ path: path.join(OUT, `s5-ux-g107-${ad}.png`) }); kareAt.delete(ms); }
    if (r.ms - bitis > 9000) break;
  }
  await s.waitForTimeout(100);
}
await tarayici.close();
await sunucu.close();
console.log('pad bitti ms', bitis);
let onceki = '';
for (const r of sonuc) { const k = JSON.stringify({ ...r, ms: 0 }); if (k !== onceki) console.log(JSON.stringify(r)); onceki = k; }
console.log(hatalar.length ? `HATALAR ${JSON.stringify(hatalar.slice(0, 5))}` : 'konsol hatası yok');
