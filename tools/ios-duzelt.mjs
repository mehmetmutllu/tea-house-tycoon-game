/**
 * ios-duzelt.mjs — `npx cap sync ios`tan SONRA çalışır (`npm run ios:sync`). İki iş:
 *
 * 1. SÜRÜM package.json'dan. Android sürümü `build.gradle`da package.json'dan TÜRÜYOR (F1a: iki kaynak
 *    sessizce ayrışıyordu). Xcode projesi dosya okuyamaz; aynı kural burada uygulanır:
 *      MARKETING_VERSION       = package.json version            (App Store'da görünen: 0.9.0)
 *      CURRENT_PROJECT_VERSION = major*10000 + minor*100 + patch (Android versionCode ile aynı: 900)
 *    App Store aynı sürüme ikinci derleme yüklerken derleme numarasının ARTMASINI ister — o durumda
 *    package.json'un patch'i artırılır (Android'le birlikte yürür).
 *
 * 2. SPM YOLLARI. Windows'ta `cap sync ios` eklenti yollarını `..\..\..\node_modules\…` diye TERS
 *    bölüyle yazar (worktree'de junction'ın gerçek yerini bile çözer). Mac'te Xcode bu yolu bulamaz
 *    ve paket çözümü kırılır. Yol her zaman `ios/App/CapApp-SPM`den köke göre `../../../node_modules/…`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PBX = path.join(KOK, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const SPM = path.join(KOK, 'ios', 'App', 'CapApp-SPM', 'Package.swift');

export function iosSurumu(surum) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(surum);
  if (!m) throw new Error(`package.json surumu semver degil: '${surum}' (beklenen 'X.Y.Z')`);
  return { pazar: surum, derleme: Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]) };
}

/** `path: "…node_modules…"` → `path: "../../../node_modules/…"` (düz bölü). Yerel eklentiler
 *  (`file:` bağımlılığı, ör. `eklentiler/bulut-kayit`) de Windows'ta ters bölüyle yazılır → düz bölü. */
export function spmYollari(metin) {
  return metin
    .replace(/path: "([^"]*?)node_modules[\\/]([^"]+)"/g,
      (_t, _on, geri) => `path: "../../../node_modules/${geri.replace(/\\/g, '/')}"`)
    .replace(/path: "([^"]*\\[^"]*)"/g, (_t, yol) => `path: "${yol.replace(/\\/g, '/')}"`);
}

const guncelle = (dosya, donustur) => {
  const eski = fs.readFileSync(dosya, 'utf8');
  const yeni = donustur(eski);
  if (yeni !== eski) fs.writeFileSync(dosya, yeni);
  return yeni !== eski;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { version } = JSON.parse(fs.readFileSync(path.join(KOK, 'package.json'), 'utf8'));
  const { pazar, derleme } = iosSurumu(version);
  const s = guncelle(PBX, (t) => t
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${pazar};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${derleme};`));
  const y = fs.existsSync(SPM) && guncelle(SPM, spmYollari);
  console.log(`ios-duzelt: surum ${pazar} (${derleme})${s ? ' yazildi' : ''} · SPM yollari${y ? ' duzeltildi' : ' temiz'}`);
}
