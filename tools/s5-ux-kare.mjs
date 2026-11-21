/**
 * s5-ux-kare.mjs — S5 UX ajanının kareleri (G-93 · G-94 · G-104 · G-107) + konsol hatası denetimi.
 *
 * Kullanım: node tools/s5-ux-kare.mjs   (UX_PORT, varsayılan 5167; HMR + izleme KAPALI — paralel ajanlar dosya yazıyor)
 * Çıktı docs/kareler/s5-ux-<ad>.png. Her kare gerçek akıştan: merdiven geçişi (`katDegistir`), store durumu, HUD.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.UX_PORT ?? 5167);
const OUT = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const s = await baglam.newPage();
s.on('pageerror', (e) => hatalar.push(e.message));
s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await s.waitForFunction(() => typeof window.__game === 'function');
const kare = (ad) => s.screenshot({ path: path.join(OUT, `s5-ux-${ad}.png`) });
const durum = () => s.evaluate(async () => {
  const { useGame } = await import('/src/game/store.ts');
  const g = useGame.getState();
  return {
    kat: g.kat, gecis: g.katGecis != null, notice: g.notice?.text ?? null, camFocus: g.camFocus,
    ipucu: document.querySelector('[data-testid="kat2-ipucu"]')?.textContent ?? null,
  };
});
const rapor = {};
/** Geçiş bitip oyuncu `kat`ta belirene kadar bekler (sayfa içinde; waitForFunction async yüklemi beklemiyor). */
const katBekle = (kat) => s.evaluate(async (k) => {
  const { useGame } = await import('/src/game/store.ts');
  for (let i = 0; i < 300; i++) {
    const g = useGame.getState();
    if (g.kat === k && g.katGecis == null) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}, kat);
/** `sn` boyunca odak ve bildirimi örnekler: ilk görülen camFocus + bildirim metinleri. */
const izle = (sn) => s.evaluate(async (sure) => {
  const { useGame } = await import('/src/game/store.ts');
  const out = { odak: null, bildirim: [] };
  for (let t = 0; t < sure * 1000; t += 50) {
    const g = useGame.getState();
    if (!out.odak && g.camFocus) out.odak = { pos: g.camFocus.pos, kat2: !!g.camFocus.kat2, ms: t };
    if (g.notice && !out.bildirim.includes(g.notice.text)) out.bildirim.push(g.notice.text);
    await new Promise((r) => setTimeout(r, 50));
  }
  return out;
}, sn);

// ── G-94 + G-104: Kat 1 bitti, merdiven açık, Kat 2'ye GERÇEK geçişle ilk çıkış.
await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 500000 }), KAT1_PADS);
await s.evaluate(() => window.__kat2(2));
await katBekle(2);
await s.waitForTimeout(500);
rapor.tanitim = await durum();
await kare('tanitim');
// Tanıtım bandı bitince (4,5 sn) kanal ipucuna geçer.
await s.waitForTimeout(5200);
rapor.ipucuKahve = await durum();
await kare('ipucu-kahve');

// ── G-104 bulaşık: elde kirli, hiç yıkanmadı (kahve bir kez alındı).
await s.evaluate(async () => {
  const { useGame } = await import('/src/game/store.ts');
  const g = useGame.getState();
  useGame.setState({ camFocus: null, stats: { ...g.stats, kat2Alinan: 1 }, kat2Dunya: { ...g.kat2Dunya, tepsiKirli: 2 } });
});
await s.waitForTimeout(900);
rapor.ipucuBulasik = await durum();
await kare('ipucu-bulasik');
await s.evaluate(async () => {
  const { useGame } = await import('/src/game/store.ts');
  const g = useGame.getState();
  useGame.setState({ camFocus: null, stats: { ...g.stats, kat2Yikanan: 1 }, kat2Dunya: { ...g.kat2Dunya, tepsiKirli: 0 } });
});

// ── G-107: yeni nokta — ocak yükseltme noktası belirir (salon + garson açılınca) → bildirim + kamera.
await s.waitForTimeout(600);
const once = await durum();
await s.evaluate(async () => {
  const { useGame } = await import('/src/game/store.ts');
  const cfg = await import('/src/config/economy.config.ts');
  const { kat2OcakTetik, kat2SiradakiPad } = await import('/src/game/kat2Dongu.ts');
  const A = cfg.economyConfig.kat2;
  // Ocak tetiği görünene kadar sıradaki pad'leri sırayla aç (sahnenin çizdiği nokta kümesi değişir).
  let pads = [...useGame.getState().kat2.padsDone];
  for (let i = 0; i < 40 && !kat2OcakTetik(A, pads, useGame.getState().kat2.yuk); i++) {
    const p = kat2SiradakiPad(A, pads);
    if (!p) break;
    pads = [...pads, p.id];
  }
  window.__teleport(6, 8);
  const { kat2Noktalar } = await import('/src/game/onboarding.ts');
  window.__s5once = [...kat2Noktalar(useGame.getState().kat2, A).keys()];
  useGame.setState({ kat2: { ...useGame.getState().kat2, padsDone: pads } });
  window.__s5sonra = [...kat2Noktalar(useGame.getState().kat2, A).keys()];
});
rapor.noktalar = await s.evaluate(() => ({ once: window.__s5once, sonra: window.__s5sonra }));
rapor.yeniNokta = { once, iz: await izle(3.5) };
await kare('yeni-nokta-pan');

// ── G-93: Kat 1, tepsi görevi aktif, Çaycı paneli açık → tepsi düğmesi nabız.
await s.evaluate(() => { window.__kat2(1); });
await katBekle(1);
await s.evaluate(() => { window.__setQuest('q_charTray1'); window.__setState({ charUpgrades: { tray: 0, magnet: 0, speed: 0 }, charPanelSeen: true, wallet: 5000 }); });
await s.waitForTimeout(800);
await s.click('.botnav [data-testid="char"]');
await s.waitForTimeout(900);
rapor.tepsiVurgu = await s.evaluate(() => document.querySelector('[data-testid="char-buy-tray"]')?.className ?? null);
await kare('tepsi-vurgu');

await tarayici.close();
await sunucu.close();
console.log(JSON.stringify(rapor, null, 1));
console.log(hatalar.length ? `HATALAR ${JSON.stringify(hatalar.slice(0, 5))}` : 'konsol hatası yok');
