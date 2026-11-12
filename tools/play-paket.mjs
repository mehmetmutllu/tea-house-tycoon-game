/**
 * play-paket.mjs — Google Play teslim zip'i (npm run play:paket).
 *
 * Play Console'u Claude kullanmaz (kullanıcı kuralı); yüklemeyi arkadaş yapar. Bu araç ona giden
 * her şeyi tek klasörde toplar: PDF rehber (docs/play/rehber.html) · AAB · ikon/öne çıkan/kareler · metinler.
 * AAB yalnız `npm run play` damgasıyla (kimlik denetimi + gerçek reklam kipi) eşleşiyorsa girer; yoksa
 * zip TASLAK adıyla çıkar ve 2-paket/ içinde neden boş olduğu yazar.
 * Çıktı: dist-play/TeaHouseTycoon-GooglePlay[-TASLAK].zip
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const yol = (...p) => path.join(KOK, ...p);
const paket = JSON.parse(fs.readFileSync(yol('package.json'), 'utf8'));
const [ma, mi, pa] = paket.version.split('.').map(Number);
const KOD = ma * 10000 + mi * 100 + pa;

const AAB = yol('android/app/build/outputs/bundle/release/app-release.aab');
const damga = fs.existsSync(AAB + '.play.json') ? JSON.parse(fs.readFileSync(AAB + '.play.json', 'utf8')) : null;
const aabGercek = damga && fs.existsSync(AAB) && fs.statSync(AAB).size === damga.boyut && fs.statSync(AAB).mtimeMs === damga.mtime;

const AD = 'TeaHouseTycoon-GooglePlay' + (aabGercek ? '' : '-TASLAK');
const CIKTI = yol('dist-play', AD);
fs.rmSync(CIKTI, { recursive: true, force: true });
for (const k of ['2-paket', '3-gorseller', '4-metinler']) fs.mkdirSync(path.join(CIKTI, k), { recursive: true });

if (aabGercek) fs.copyFileSync(AAB, path.join(CIKTI, '2-paket/app-release.aab'));
// Bu sürüme özel: Play'e girilecek sürüm notu + bir kerelik adımlar (sürüm başına üzerine yazılır).
const buSurum = yol('docs/play/bu-surum.txt');
if (fs.existsSync(buSurum)) {
  const metin = fs.readFileSync(buSurum, 'utf8');
  if (!metin.includes(`${paket.version} (sürüm kodu ${KOD})`)) throw new Error(`docs/play/bu-surum.txt ${paket.version} için değil — güncelle`);
  fs.writeFileSync(path.join(CIKTI, '0-BU-SURUM.txt'), metin);
}
else fs.writeFileSync(path.join(CIKTI, '2-paket/OKU.txt'), 'Oyun paketi (app-release.aab) henüz eklenmedi: reklam ve satın alma kimlikleri girildikten sonra Mehmet son paketi gönderecek.\nBu arada Adım 1-5 yapılabilir.\n');

const O = yol('docs/magaza-kareleri/tasarim/O');
const G = path.join(CIKTI, '3-gorseller');
// tasarim/ git'e girmez (.gitignore): başka makinede önce kareler üretilir.
if (!fs.existsSync(path.join(O, 'android-tr-6.png')) || !fs.existsSync(path.join(O, 'ipad-tr-6.png'))) {
  throw new Error('kareler yok → V=O C=android,ipad node tools/magaza-tasarim.mjs');
}
for (const d of ['en', 'tr']) {
  fs.mkdirSync(path.join(G, `telefon-${d}`)); fs.mkdirSync(path.join(G, `tablet-${d}`));
  for (let i = 1; i <= 6; i++) {
    fs.copyFileSync(path.join(O, `android-${d}-${i}.png`), path.join(G, `telefon-${d}`, `${i}.png`));
    fs.copyFileSync(path.join(O, `ipad-${d}-${i}.png`), path.join(G, `tablet-${d}`, `${i}.png`));
  }
}
fs.copyFileSync(yol('docs/magaza-kareleri/play/one-cikan-1024x500.png'), path.join(G, 'one-cikan-1024x500.png'));
for (const f of fs.readdirSync(yol('docs/play/metin'))) fs.copyFileSync(yol('docs/play/metin', f), path.join(CIKTI, '4-metinler', f));

const kacis = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bolumler = (dosya) => Object.fromEntries([...fs.readFileSync(yol('docs/play/metin', dosya), 'utf8').replace(/\r/g, '')
  .matchAll(/=== (.+?) ===\n([\s\S]*?)(?=\n=== |$)/g)].map((m) => [m[1], m[2].trim()]));
const metinHtml = (b) => Object.entries(b).filter(([k]) => !/RELEASE|SÜRÜM/.test(k))
  .map(([k, v]) => `<p><b>${kacis(k)}</b> <span class="kucuk">(${[...v].length} karakter)</span></p><pre class="metin">${kacis(v)}</pre>`).join('\n');
const en = bolumler('en-US.txt'), tr = bolumler('tr-TR.txt');
const not = (b) => Object.entries(b).find(([k]) => /RELEASE|SÜRÜM/.test(k))[1];
const izgara = (d) => Array.from({ length: 6 }, (_, i) => `<img src="3-gorseller/telefon-${d}/${i + 1}.png">`).join('');

let html = fs.readFileSync(yol('docs/play/rehber.html'), 'utf8')
  .replaceAll('{{SURUM}}', `${paket.version} (${KOD})`).replaceAll('{{KOD}}', String(KOD))
  .replaceAll('{{TARIH}}', new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))
  .replace('{{METIN_EN}}', metinHtml(en)).replace('{{METIN_TR}}', metinHtml(tr))
  .replace('{{NOT_EN}}', kacis(not(en))).replace('{{NOT_TR}}', kacis(not(tr)))
  .replace('{{IZGARA_TELEFON_EN}}', izgara('en')).replace('{{IZGARA_TELEFON_TR}}', izgara('tr'))
  .replaceAll('src="gorsel/logo.png"', `src="${pathToFileURL(yol('docs/logotasarim/logo-yazi-saydam.png')).href}"`)
  .replaceAll('src="gorsel/ikon-512.png"', 'src="3-gorseller/ikon-512.png"')
  .replaceAll('src="gorsel/one-cikan-1024x500.png"', 'src="3-gorseller/one-cikan-1024x500.png"');
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('rehberde doldurulmamış yer tutucu: ' + html.match(/\{\{[A-Z_]+\}\}/)[0]);

const tarayici = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const s = await tarayici.newPage();
// İkon: Play 512×512 ister; kaynak 1024 (köşeleri dolu, maskeyi Play uygular).
await s.setViewportSize({ width: 512, height: 512 });
const ikonHtml = path.join(CIKTI, '_ikon.html');
fs.writeFileSync(ikonHtml, `<style>*{margin:0}</style><img src="${pathToFileURL(yol('docs/logotasarim/ikon-1024.png')).href}" width="512" height="512">`);
await s.goto(pathToFileURL(ikonHtml).href, { waitUntil: 'load' });
await s.screenshot({ path: path.join(G, 'ikon-512.png') });
fs.rmSync(ikonHtml);

const gecici = path.join(CIKTI, '_rehber.html');
fs.writeFileSync(gecici, html);
await s.goto(pathToFileURL(gecici).href, { waitUntil: 'load' });
await s.evaluate(() => Promise.all([...document.images].map((g) => (g.complete ? 1 : new Promise((r) => { g.onload = g.onerror = r; })))));
await s.pdf({ path: path.join(CIKTI, '1-REHBER.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;color:#888;width:100%;text-align:center">Tea House Tycoon · Google Play rehberi · <span class="pageNumber"></span>/<span class="totalPages"></span></div>' });
await tarayici.close();
fs.rmSync(gecici);

const zip = yol('dist-play', AD + '.zip');
fs.rmSync(zip, { force: true });
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${CIKTI}' -DestinationPath '${zip}'"`, { stdio: 'inherit' });
console.log(`${aabGercek ? 'TAM' : 'TASLAK (AAB yok — önce npm run play)'} → ${path.relative(KOK, zip)} (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB)`);
