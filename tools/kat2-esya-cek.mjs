/**
 * kat2-esya-cek.mjs — K2-1 tur 2b: Kat 2 eşya görünüş adaylarını (tools/kat2-esya.tsx) aynı kadrajda çeker.
 *
 * Koşu: node tools/kat2-esya-cek.mjs                (hepsi)
 *       ESYA=okey NO=1,3 node tools/kat2-esya-cek.mjs
 * Çıktı: docs/tasarim/kat2/esya-<eşya>-<no>.png
 *       ESYA=okey,tavla YOL=A,B,C node tools/kat2-esya-cek.mjs   (yükseltme yolları)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ADAY_PORT || 5305);
const CIKTI = path.join(KOK, 'docs/tasarim/kat2');
mkdirSync(CIKTI, { recursive: true });

const ESYALAR = (process.env.ESYA ?? 'okey,tavla,cezve,merdiven').split(',');
// YOL=A,B,C → yükseltme yolu karesi (Sv1…Sv5 yan yana): esya-<eşya>-yol-<harf>.png
const YOLLAR = process.env.YOL ? process.env.YOL.split(',') : null;
const NOLAR = YOLLAR ?? (process.env.NO ?? '1,2,3,4,5,6').split(',');

const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
const indir = () => { try { sunucu.kill(); } catch { /* kapalı */ } };
process.on('exit', indir);
const KOKURL = `http://localhost:${PORT}`;
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(`${KOKURL}/`, { toplamMs: 15000 }))) {
  console.error(`kat2-esya: vite ${KOKURL} kalkmadı`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let hata = 0;
const ctx = await browser.newContext(YOLLAR ? { viewport: { width: 1600, height: 500 }, deviceScaleFactor: 1.5 } : { viewport: { width: 900, height: 680 }, deviceScaleFactor: 1.5 });
for (const esya of ESYALAR) {
  for (const no of NOLAR) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { hata++; console.error('pageerror', e.message.slice(0, 200)); });
    page.on('console', (m) => { if (m.type() === 'error') console.error('konsol', m.text().slice(0, 200)); });
    await page.goto(`${KOKURL}/tools/kat2-esya.html?esya=${esya}&${YOLLAR ? "yol" : "no"}=${no}`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => window.MAKET_HAZIR === true, null, { timeout: 180000 });
    await page.waitForTimeout(400);
    const dosyaAdi = path.join(CIKTI, `esya-${esya}-${YOLLAR ? "yol-" : ""}${no}.png`);
    await page.screenshot({ path: dosyaAdi });
    console.log('çekildi', path.relative(KOK, dosyaAdi));
    await page.close();
  }
}
await ctx.close();
await browser.close();
indir();
process.exit(hata ? 1 : 0);
