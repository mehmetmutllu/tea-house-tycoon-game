/**
 * play-hazir-mi.mjs — Google Play'e gidecek AAB'den ÖNCE kimlikleri denetler (npm run play).
 *
 * NEDEN: iOS derlemesindeki bekçi (codemagic.yaml) yalnız iOS'u korur. Android'de üç kimlik
 * elle girilir ve üçü de unutulursa paket SESSİZCE yanlış çıkar: test reklamı (gelir 0),
 * satın alma kapalı ("Mağaza hazır değil"). Bunlar ancak mağazada fark edilir.
 * Denetlenen: AndroidManifest AdMob uygulama kimliği · ads.config Android birimleri · RevenueCat goog_ anahtarı.
 * Geçerse gerçek reklam kipiyle (VITE_REKLAM=gercek) derler, kipi pakette doğrular ve imzalı AAB üretir:
 * android/app/build/outputs/bundle/release/app-release.aab
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
const TEST = 'ca-app-pub-3940256099942544';
const hatalar = [];

const manifest = oku('android/app/src/main/AndroidManifest.xml');
const uygulama = manifest.match(/gms\.ads\.APPLICATION_ID"\s*android:value="([^"]+)"/)?.[1] ?? '';
if (!/^ca-app-pub-\d+~\d+$/.test(uygulama) || uygulama.startsWith(TEST)) hatalar.push(`AndroidManifest AdMob APPLICATION_ID test/eksik: ${uygulama}`);

const reklam = oku('src/config/ads.config.ts');
const android = reklam.match(/birim:\s*\{\s*android:\s*\{([^}]+)\}/)?.[1] ?? '';
if (!android || android.includes(TEST)) hatalar.push('ads.config.ts birim.android hâlâ Google test birimi');

const iap = oku('src/config/iap.config.ts');
if (!/android:\s*'goog_[A-Za-z0-9]+'/.test(iap)) hatalar.push("iap.config.ts revenueCatAnahtar.android 'goog_…' değil");

if (hatalar.length) {
  console.error('PLAY HAZIR DEĞİL:\n - ' + hatalar.join('\n - '));
  process.exit(1);
}
console.log('play: kimlikler gerçek (AdMob uygulama + 2 birim + RevenueCat goog_)');
if (!fs.existsSync(path.join(KOK, 'android/keystore.properties'))) {
  console.error('PLAY HAZIR DEĞİL: android/keystore.properties yok (imzasız AAB Play’e yüklenemez)');
  process.exit(1);
}
// 1.0.7: dosya yoksa google-services eklentisi SESSİZCE atlanır ve AAB analitiksiz çıkar.
const gsj = path.join(KOK, 'android/app/google-services.json');
if (!fs.existsSync(gsj) || !fs.readFileSync(gsj, 'utf8').includes('"package_name": "com.mutlubadem.teahouse"')) {
  console.error('PLAY HAZIR DEĞİL: android/app/google-services.json yok ya da başka uygulamanın (dev-ortam → kur.ps1)');
  process.exit(1);
}

const kos = (k, cwd = KOK) => execSync(k, { cwd, stdio: 'inherit', env: { ...process.env, VITE_REKLAM: 'gercek' } });
kos('npm run build');
const js = fs.readdirSync(path.join(KOK, 'dist/assets')).filter((d) => d.endsWith('.js'));
if (!js.some((d) => fs.readFileSync(path.join(KOK, 'dist/assets', d), 'utf8').includes('test:!1,birim'))) {
  console.error('HATA: reklam test kipinde kaldı (VITE_REKLAM pakete girmedi)');
  process.exit(1);
}
kos('npx cap sync android');
kos('node tools/apk-temizle.mjs');
kos(process.platform === 'win32' ? '.\\gradlew.bat bundleRelease' : './gradlew bundleRelease', path.join(KOK, 'android'));
// Damga: play-paket.mjs zip'e yalnız bu denetimden geçmiş AAB'yi koyar (`npm run yayin` test reklamlı AAB de üretir).
const aab = path.join(KOK, 'android/app/build/outputs/bundle/release/app-release.aab');
fs.writeFileSync(aab + '.play.json', JSON.stringify({ boyut: fs.statSync(aab).size, mtime: fs.statSync(aab).mtimeMs }));
console.log('play: AAB hazır → android/app/build/outputs/bundle/release/app-release.aab');
