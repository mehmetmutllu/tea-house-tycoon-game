/**
 * kat2-maket-cek.mjs — K2-1: Kat 2 plan adaylarını (tools/kat2-maket.tsx) aynı kadrajlarda çeker.
 *
 * Koşu: node tools/kat2-maket-cek.mjs            (hepsi)
 *       ADAY=A,C ADIM=3 KADRAJ=genel node tools/kat2-maket-cek.mjs
 * Çıktı: docs/tasarim/kat2/<aday>-<adım>-<kadraj>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ADAY_PORT || 5304);
const CIKTI = path.join(KOK, 'docs/tasarim/kat2');
mkdirSync(CIKTI, { recursive: true });

const ADAYLAR = (process.env.ADAY ?? 'A,B,C,D').split(',');
const ADIMLAR = (process.env.ADIM ?? '1,2,3').split(',').map(Number);
const KADRAJLAR = (process.env.KADRAJ ?? 'genel,oyun').split(',');
const KISI = process.env.KISI ?? '1';

const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
const indir = () => { try { sunucu.kill(); } catch { /* kapalı */ } };
process.on('exit', indir);
const KOKURL = `http://localhost:${PORT}`;
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(`${KOKURL}/`, { toplamMs: 15000 }))) {
  console.error(`kat2-maket: vite ${KOKURL} kalkmadı`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let hata = 0;
for (const kadraj of KADRAJLAR) {
  const oyun = kadraj === 'oyun';
  const ctx = await browser.newContext(
    oyun ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 },
  );
  for (const v of ADAYLAR) {
    // Oyun kadrajı yalnız bitmiş hâlde çekilir (yürüyen oyuncunun gördüğü salon).
    for (const adim of oyun ? [3] : ADIMLAR) {
      const page = await ctx.newPage();
      page.on('pageerror', (e) => { hata++; console.error('pageerror', e.message.slice(0, 200)); });
      page.on('console', (m) => { if (m.type() === 'error') console.error('konsol', m.text().slice(0, 200)); });
      await page.goto(`${KOKURL}/tools/kat2-maket.html?v=${v}&adim=${adim}&kadraj=${kadraj}&kisi=${KISI}`, { waitUntil: 'load', timeout: 90000 });
      await page.waitForFunction(() => window.MAKET_HAZIR === true, null, { timeout: 180000 });
      await page.waitForTimeout(400);
      const dosyaAdi = path.join(CIKTI, `${v}-${adim}-${kadraj}.png`);
      await page.screenshot({ path: dosyaAdi });
      console.log('çekildi', path.relative(KOK, dosyaAdi));
      await page.close();
    }
  }
  await ctx.close();
}
await browser.close();
indir();
process.exit(hata ? 1 : 0);
