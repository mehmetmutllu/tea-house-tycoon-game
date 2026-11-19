/**
 * s5-yapi-kare.mjs — S5 YAPI ajanının önce/sonra kareleri (G-101/110/113/116/117/118/121).
 *
 * Kullanım: node tools/s5-yapi-kare.mjs <etiket> [kare-adı,...]
 *   Kendi dev sunucusunu kaldırır (YAPI_PORT, varsayılan 5193; HMR + izleme KAPALI — paralel ajanlar dosya yazıyor). Çıktı docs/kareler/s5-yapi-<etiket>-<ad>.png
 * Her kare kendi durumunu kurar: Kat 2 açık + `pads` + `yuk`, kadraj `__sinema`, sim donuk.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.YAPI_PORT ?? 5193);
const ETIKET = process.argv[2] ?? 'once';
const SEC = process.argv[3]?.split(',');
const OUT = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const ILK = ['k2okey2', 'k2cezve'];
const SALON2 = [...ILK, 'k2okey1', 'k2okey3', 'k2garson', 'k2okey4', 'k2garson2', 'k2salon2'];

const KARELER = {
  // G-101: kuyunun arka köşeleri (arka duvar tarafı) — yukarıdan, arka duvara bakan açı
  'merdiven-kose': { pads: ILK, kadraj: { pos: [5.5, 4.2, -11.5], bak: [2.0, 0.3, -16.6], fov: 50 } },
  'merdiven-kose2': { pads: ILK, kadraj: { pos: [-5.5, 4.2, -11.5], bak: [-2.0, 0.3, -16.6], fov: 50 } },
  'merdiven-oyun': { pads: ILK, kadraj: { pos: [0, 11, -2], bak: [0, 0, -13], fov: 55 } },
  // G-110: ocak pad'i (k2cezve hazır → kapat; pad sırası ocak gösterilsin diye yalnız salon)
  'ocak-pad': { pads: ['k2okey2'], kadraj: { pos: [-7.4, 7, -3.5], bak: [-7.4, 0, -9.6], fov: 50 } },
  'ocak2-pad': { pads: [...SALON2, 'k2s2okey1', 'k2s2okey2', 'k2bulasikci'], kadraj: { pos: [-12, 7, -3.5], bak: [-12, 0, -9.6], fov: 50 } },
  // G-113: mutfak arka hattı — ocak seviyeleri
  'mutfak-l1': { pads: ILK, yuk: { ocak: 0 }, kadraj: { pos: [-11, 6, -6], bak: [-11, 0.8, -16], fov: 55 } },
  'mutfak-l2': { pads: ILK, yuk: { ocak: 1 }, kadraj: { pos: [-11, 6, -6], bak: [-11, 0.8, -16], fov: 55 } },
  'mutfak-l3': { pads: ILK, yuk: { ocak: 2 }, kadraj: { pos: [-11, 6, -6], bak: [-11, 0.8, -16], fov: 55 } },
  // G-116 / G-121: salon açılınca köşeler ve sağdaki duvar
  'salon2-genis': { pads: SALON2, kadraj: { pos: [2, 22, 26], bak: [2, 0, 2], fov: 65 } },
  'salon2-kose': { pads: SALON2, kadraj: { pos: [6, 6, 8], bak: [0.5, 0.8, 0.5], fov: 55 } },
  'salon1-genis': { pads: ILK, kadraj: { pos: [2, 22, 26], bak: [2, 0, 2], fov: 65 } },
  'salon1-kose': { pads: ILK, kadraj: { pos: [-15, 7, 6], bak: [-17, 1, -1], fov: 55 } },
  'kose-sol-on': { pads: 'HEPSI', kadraj: { pos: [-8, 9, 8], bak: [-16, 0.5, 16.5], fov: 60 } },
  'kose-sol-orta': { pads: 'HEPSI', kadraj: { pos: [-8, 8, 6], bak: [-17, 1, 0], fov: 60 } },
  'kose-sol-bant': { pads: 'HEPSI', kadraj: { pos: [-8, 8, 0], bak: [-17, 1, -9.8], fov: 60 } },
  'kose-on-orta': { pads: 'HEPSI', kadraj: { pos: [0, 9, 8], bak: [0, 0.5, 17], fov: 60 } },
  'kose-sag-on': { pads: 'HEPSI', kadraj: { pos: [8, 9, 8], bak: [16, 0.5, 16.5], fov: 60 } },
  'kose-sag-orta': { pads: 'HEPSI', kadraj: { pos: [8, 8, 6], bak: [17, 1, 0], fov: 60 } },
  'kose-salon2-sag': { pads: SALON2, kadraj: { pos: [-6, 8, 9], bak: [0, 0.5, 2], fov: 60 } },
  'kose-salon2-sagon': { pads: SALON2, kadraj: { pos: [-6, 8, 9], bak: [0, 0.5, 17], fov: 60 } },
  'ust-0-17': { pads: SALON2, kadraj: { pos: [0.01, 9, 15.5], bak: [0, 0, 16.5], fov: 50 } },
  'ust-17-0': { pads: SALON2, kadraj: { pos: [15.5, 9, 0.01], bak: [16.5, 0, 0], fov: 50 } },
  'ust-0-0': { pads: SALON2, kadraj: { pos: [0.01, 9, 0.5], bak: [0, 0, 0], fov: 50 } },
  'ust-m17-0': { pads: SALON2, kadraj: { pos: [-15.5, 9, 0.01], bak: [-16.5, 0, 0], fov: 50 } },
  'yan-0-17': { pads: SALON2, kadraj: { pos: [-4, 3.5, 12], bak: [0, 1, 17], fov: 50 } },
  'yan-17-0': { pads: SALON2, kadraj: { pos: [12, 3.5, -4], bak: [17, 0.5, 0], fov: 50 } },
  // G-117: lavabo açılışı (pad eklenir, dönüşümün ortasında kare)
  'lavabo-donusum': { pads: [...SALON2, 'k2s2okey1', 'k2s2okey2', 'k2bulasikci', 'k2cezve2', 'k2s2okey3', 'k2s2okey4', 'k2s2okey5', 'k2s2okey6', 'k2garson3'], ekle: 'k2lavabo', bekle: 260, kadraj: { pos: [10.8, 8, -1], bak: [10.8, 0.8, -11], fov: 60 } },
  'lavabo-acik': { pads: [...SALON2, 'k2s2okey1', 'k2s2okey2', 'k2bulasikci', 'k2cezve2', 'k2s2okey3', 'k2s2okey4', 'k2s2okey5', 'k2s2okey6', 'k2garson3', 'k2lavabo'], kadraj: { pos: [10.8, 8, -1], bak: [10.8, 0.8, -11], fov: 60 } },
  // G-118: lavabo perdesi simgesi
  'lavabo-perde': { pads: SALON2, kadraj: { pos: [12, 4, -4], bak: [11.5, 1.5, -9.8], fov: 50 } },
  'kat1-wc-perde': { kat1: true, kadraj: { pos: [12.5, 4, -4], bak: [12.5, 1.5, -9.8], fov: 50 } },
};

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
await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 500000 }), KAT1_PADS);
await s.evaluate(() => window.__kat2(2));
await s.waitForTimeout(2500);

for (const [ad, k] of Object.entries(KARELER)) {
  if (SEC && !SEC.includes(ad)) continue;
  if (k.kat1) {
    await s.evaluate((pads) => { window.__kat2(1); window.__setState({ padsDone: pads }); }, KAT1_PADS.filter((p) => p !== 'lavabo'));
    await s.waitForTimeout(2500);
    await s.evaluate((kd) => window.__sinema(kd), k.kadraj);
    await s.waitForTimeout(1500);
    await s.screenshot({ path: path.join(OUT, `s5-yapi-${ETIKET}-${ad}.png`), clip: { x: 0, y: 150, width: 440, height: 640 } });
    await s.evaluate((pads) => { window.__sinema(null); window.__setState({ padsDone: pads }); window.__kat2(2); }, KAT1_PADS);
    await s.waitForTimeout(2500);
    continue;
  }
  await s.evaluate(async ({ pads, yuk }) => {
    const { useGame } = await import('/src/game/store.ts');
    const k2 = useGame.getState().kat2;
    if (pads === 'HEPSI') {
      const cfg = await import('/src/config/economy.config.ts');
      pads = [...new Set([...(cfg.economyConfig.kat2.hazir ?? []), ...cfg.economyConfig.kat2.padler.map((p) => p.id)])];
    }
    window.__setState({ kat2: { ...k2, acik: true, padsDone: pads, yuk: { ...(yuk ?? {}) } }, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__teleport(0, -6);
  }, { pads: k.pads, yuk: k.yuk });
  await s.waitForTimeout(1500);
  await s.evaluate(() => window.__zaman?.(0));
  await s.evaluate((kd) => window.__sinema(kd), k.kadraj);
  await s.waitForTimeout(1500);
  if (k.ekle) {
    await s.evaluate(() => window.__zaman?.(1));
    await s.evaluate((id) => window.__kat2Pad(id), k.ekle);
    await s.waitForTimeout(k.bekle);
  }
  await s.screenshot({ path: path.join(OUT, `s5-yapi-${ETIKET}-${ad}.png`), clip: { x: 0, y: 150, width: 440, height: 640 } });
  await s.evaluate(() => { window.__sinema(null); window.__zaman?.(1); });
}
await tarayici.close();
await sunucu.close();
if (hatalar.length) console.log('HATALAR', hatalar.slice(0, 5));
console.log('tamam');
