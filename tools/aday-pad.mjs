/**
 * aday-pad.mjs — 1.0.7 arayüz turu: zemin işaretinin (pad + yükseltme noktası) GÖRÜNÜŞ adayları.
 * Oyun aynı duruma getirilir, `window.__padStil(harf)` ile aday değiştirilir (yalnız geliştirmede,
 * `src/components/three/padAday.tsx`) ve AYNI kadrajda çekilir. Çerçeve ölçüsü (D-121) sabit.
 *
 * Koşu: node tools/aday-pad.mjs   ·   Çıktı: docs/tasarim/1.0.7/pad/<harf>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle, adres } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ADAY_PORT || 5303);
const URL = adres(PORT);
const CIKTI = path.join(KOK, 'docs/tasarim/1.0.7/pad');
mkdirSync(CIKTI, { recursive: true });

const ADAYLAR = {
  A: 'Bugünkü (köşe parantez)',
  B: 'Tam beyaz çerçeve',
  C: 'Renkli karo',
  D: 'Kesik çizgi',
  E: 'Büyük fiyat',
  F: 'Mor tabla (arayüz dili)',
  G: 'Yalnız beyaz köşeler',
  H: 'Fiyat şeridi',
  I: 'Işık havuzu',
};

const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
const indir = () => { try { sunucu.kill(); } catch { /* kapalı */ } };
process.on('exit', indir);
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(URL, { toplamMs: 15000 }))) {
  console.error(`aday: vite ${URL} kalkmadı (ADAY_PORT)`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const page = await ctx.newPage();
let hata = 0;
page.on('pageerror', (e) => { hata++; console.error('pageerror', e.message.slice(0, 160)); });
const ev = (fn, arg) => page.evaluate(fn, arg);
const kapatAcik = async () => {
  for (let i = 0; i < 25; i++) {
    let tik = false;
    for (const s of ['[data-testid="level-up-ok"]', '[data-testid="ogretme-ok"]', '[data-testid="offline-ok"]',
      '[data-testid="goal-reward-ok"]', '[data-testid="daily-reward-ok"]']) {
      const el = await page.$(s);
      if (el) { await el.click().catch(() => {}); tik = true; await page.waitForTimeout(80); }
    }
    if (!tik) return;
  }
};

await page.goto(URL, { waitUntil: 'commit', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForFunction(() => typeof window.__game === 'function', null, { timeout: 20000 });
await page.waitForSelector('.splash', { state: 'detached', timeout: 15000 }).catch(() => {});
await page.waitForSelector('[data-testid="kafe-adi"]', { timeout: 8000 }).then(async () => {
  await page.fill('[data-testid="kafe-adi-girdi"]', 'Çınar Kahvesi');
  await page.click('[data-testid="kafe-adi-tamam"]');
}).catch(() => {});
await page.waitForSelector('[data-testid="ogretici"]', { timeout: 8000 }).then(() => page.click('[data-testid="ogretici-atla"]')).catch(() => {});

await ev(() => { let g = window.__advanceTime(15); for (let i = 0; i < 20 && g.waitingCount === 0; i++) g = window.__advanceTime(1); });
for (const [q, pad] of [['q_table2', 'table2'], ['q_table3', 'table3'], ['q_waiter', 'waiter'], ['q_table4', 'table4'],
  ['q_waiter2', 'waiter2'], ['q_zone2', 'zone2'], ['q_z2table2', 'z2table2'], ['q_z2table3', 'z2table3'], ['q_dish', 'dishwasher']]) {
  await ev((q) => window.__setQuest(q), q);
  await ev(() => window.__addMoney(3000));
  const g = await ev(() => window.__game());
  if (g.currentPad === pad && g.padPos) {
    await ev((p) => window.__teleport(p[0], p[2]), g.padPos);
    await ev(() => window.__advanceTime(8));
  }
  await kapatAcik();
}
await ev(() => window.__setState({ wallet: 48250, diamonds: 140, xp: Math.max(window.__game().xp ?? 0, 4000) }));
const g0 = await ev(() => window.__game());
// Kadraj: sıradaki pad'in (Salon 2 · 4. masa) hemen önünde, üstüne basmadan; pad'in üçte biri dolu.
const p = g0.padPos ?? g0.stationPos;
await ev((p) => window.__teleport(p[0] + 0.4, p[2] + 2.6), p);
await ev(() => window.__advanceTime(20));
const KADRAJLAR = {
  // 1: sıradaki pad (Salon 2 · 4. masa), oyuncu yanında; pad'in bir kısmı dolu.
  pad: () => ev((p) => window.__teleport(p[0] + 1.5, p[2] + 1.4), p),
  // 2: masa yükseltme görevi (D-142: nokta yalnız kendi görevinde) — hedef masanın oklu noktası.
  yukselt: async () => {
    await ev(() => window.__setQuest('q_tableL2x2'));
    await ev(() => window.__advanceTime(2));
    await kapatAcik();
    const sp = await ev(async () => {
      const { LAYOUT } = await import('/src/game/layout.ts');
      const { useGame } = await import('/src/game/store.ts');
      const { tableUpgradeTarget } = await import('/src/game/rules.ts');
      const st = useGame.getState();
      const i = tableUpgradeTarget({ padsDone: st.padsDone, tables: st.tables, stationLevel: st.stationLevels[0],
        lifetime: st.lifetime.toNumber(), tableLevels: st.tableLevels }) ?? 0;
      return LAYOUT.tables[i].upgradeSpot;
    });
    console.log('hedef masa noktası', sp);
    await ev((s) => window.__teleport(s[0] + 1.4, s[2] - 0.6), sp);
  },
};
await kapatAcik();
console.log(`durum: görev=${g0.quest?.id} pad=${g0.currentPad}`);

if (process.env.DOLUM) {
  // DOLUM KİPİ (kullanıcı 2026-11-12: "dolma animasyonunu da görmek istiyorum"): oyuncu işaretin
  // üstüne basar, simülasyon 0,1 sn'lik adımlarla ilerletilir ve her adımda kadraj çekilir.
  // %93'te durur (satın alma / yükseltme gerçekleşmesin), sonraki aday için dolum sıfırlanır.
  const dolum = (tur) => ev(async (tur) => {
    const { useGame } = await import('/src/game/store.ts');
    const st = useGame.getState();
    if (tur === 'pad') return (st.padFills.z2table4 ?? 0) / 1400;
    const { tableNextCost, tableUpgradeTarget } = await import('/src/game/rules.ts');
    const { areaOfTable } = await import('/src/game/world.ts');
    const i = window.__hedefMasa;
    return (st.tableUpgradeFills[i] ?? 0) / tableNextCost(st.tableLevels[i] ?? 0, areaOfTable(i));
  }, tur);
  const sifirla = (tur) => ev(async (tur) => {
    const { useGame } = await import('/src/game/store.ts');
    const st = useGame.getState();
    if (tur === 'pad') useGame.setState({ padFills: { ...st.padFills, z2table4: 0 } });
    else { const f = [...st.tableUpgradeFills]; f[window.__hedefMasa] = 0; useGame.setState({ tableUpgradeFills: f }); }
  }, tur);
  mkdirSync(path.join(CIKTI, 'dolum'), { recursive: true });
  const ADIM = 0.06;
  await ev(() => window.__zaman(0));
  for (const tur of process.env.TUR ? [process.env.TUR] : ['pad', 'yukselt']) {
    if (tur === 'yukselt') await KADRAJLAR.yukselt();
    const nokta = await ev(async (tur) => {
      if (tur === 'pad') return window.__game().padPos;
      const { LAYOUT } = await import('/src/game/layout.ts');
      const { useGame } = await import('/src/game/store.ts');
      const { tableUpgradeTarget } = await import('/src/game/rules.ts');
      const st = useGame.getState();
      window.__hedefMasa = tableUpgradeTarget({ padsDone: st.padsDone, tables: st.tables, stationLevel: st.stationLevels[0],
        lifetime: st.lifetime.toNumber(), tableLevels: st.tableLevels }) ?? 0;
      return LAYOUT.tables[window.__hedefMasa].upgradeSpot;
    }, tur);
    for (const harf of Object.keys(ADAYLAR)) {
      await ev((h) => window.__padStil(h), harf);
      await sifirla(tur);
      // yanından başla, sonra üstüne bas
      await ev((n) => window.__teleport(n[0] + 1.4, n[2] + 0.4), nokta);
      await page.waitForTimeout(600);
      const kare = [];
      const cek = async () => {
        await page.waitForTimeout(90);
        const f = path.join(CIKTI, 'dolum', `${tur}-${harf}-${String(kare.length).padStart(2, '0')}.png`);
        await page.screenshot({ path: f, clip: { x: 45, y: 300, width: 300, height: 240 } });
        kare.push({ f, t: kare.length * ADIM * 1000 });
      };
      // Dünya DONUK (`__zaman(0)`); her kare simülasyonu ADIM sn ilerletir → oynatma gerçek hızda.
      const adim = () => ev((a) => window.__advanceTime(a), ADIM);
      for (let i = 0; i < 4; i++) { await adim(); await cek(); }
      await ev((n) => window.__teleport(n[0] + 0.15, n[2] + 0.35), nokta);
      for (let i = 0; i < 80; i++) {
        await adim();
        await cek();
        if ((await dolum(tur)) >= 0.9) break;
      }
      await ev((n) => window.__teleport(n[0] + 1.4, n[2] + 0.4), nokta);
      for (let i = 0; i < 8; i++) { await adim(); await cek(); }
      writeFileSync(path.join(CIKTI, 'dolum', `${tur}-${harf}.json`), JSON.stringify(kare.map((k) => ({ f: path.basename(k.f), t: k.t }))));
      console.log(`  dolum ${tur}-${harf}: ${kare.length} kare`);
    }
  }
} else {
await ev(() => window.__setState({ padFills: { ...window.__game().padFills, z2table4: 500 } }));
for (const [kadraj, git] of Object.entries(KADRAJLAR)) {
  await git();
  await page.waitForTimeout(1800);
  for (const [harf, ad] of Object.entries(ADAYLAR)) {
    await ev((h) => window.__padStil(h), harf);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(CIKTI, `${kadraj}-${harf}.png`) });
    console.log(`  ${kadraj}-${harf} · ${ad}`);
  }
}
}
console.log(`sayfa hatası: ${hata}`);
await browser.close();
indir();
process.exit(0);
