/**
 * kat2-akis-cek.mjs — Kat 2 akış turu: `tools/kat2-akis.tsx` senaryolarını aynı kadrajda çeker.
 *
 * Koşu: node tools/kat2-akis-cek.mjs              (hepsi)
 *       SEN=b1,b2 node tools/kat2-akis-cek.mjs
 * Çıktı: docs/tasarim/kat2-akis/<senaryo>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.AKIS_PORT || 5306);
const CIKTI = path.join(KOK, 'docs/tasarim/kat2-akis');
mkdirSync(CIKTI, { recursive: true });

const HEPSI = 'b0,b1,b2,b3,m1,m2,m3,m4,s0,s1,s2,s3,s4,s5,s2b,k1,k2,k3,k4,k5,p1,p2,p3,p4,p5,p6,n1,n2,n3,n4,n5,n6,n7,t0,t1,t2,t3,t4,t5,t6,w1,w2,w1b,w2b';
const SENLER = (process.env.SEN ?? HEPSI).split(',');

const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
const indir = () => { try { sunucu.kill(); } catch { /* kapalı */ } };
process.on('exit', indir);
const KOKURL = `http://localhost:${PORT}`;
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(`${KOKURL}/`, { toplamMs: 15000 }))) {
  console.error(`kat2-akis: vite ${KOKURL} kalkmadı`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
let hata = 0;
const genis = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1.5 });
for (const s of SENLER) {
  const page = await genis.newPage();
  page.on('pageerror', (e) => { hata++; console.error('pageerror', s, e.message.slice(0, 200)); });
  page.on('console', (m) => { if (m.type() === 'error') console.error('konsol', s, m.text().slice(0, 200)); });
  await page.goto(`${KOKURL}/tools/kat2-akis.html?s=${s}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.MAKET_HAZIR === true, null, { timeout: 180000 });
  await page.waitForTimeout(600);
  const yol = path.join(CIKTI, `${s}.png`);
  await page.screenshot({ path: yol });
  console.log('çekildi', path.relative(KOK, yol));
  await page.close();
}
await browser.close();
indir();
process.exit(hata ? 1 : 0);
