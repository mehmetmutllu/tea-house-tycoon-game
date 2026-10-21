/**
 * magaza-video.mjs — App Store tanıtım videoları (D-170, `docs/magaza-tanitim-video-raporu.md`).
 *
 * Gerçek zamanlı ekran kaydı DEĞİL: sayfanın saati (rAF + performance.now + Date.now) sanallaştırılır,
 * her kare tam 1/FPS sn ilerletilir ve çekilir. Kare ne kadar geç çizilirse çizilsin video takılmaz.
 * Kareler PNG olarak ffmpeg'e borudan akar (diske 4K kare yığılmaz); büyük çizilip lanczos'la küçültülür.
 *
 * Kullanım: VIDEO=header|search [DIL=en] [KIP=deneme] node tools/magaza-video.mjs
 *   deneme → birkaç tek kare (docs/magaza-video/deneme/), kayıt yok
 * Çıktı: docs/magaza-video/header.mp4 · search-<DIL>.mp4 (DIL=tr|en; arayüz yazısı yalnız search'te)
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 5306);
const VIDEO = process.env.VIDEO ?? 'header';
const KIP = process.env.KIP ?? 'kayit';
/** Arayüz dili (cihaz dili gibi verilir). Arayüzsüz video dilden bağımsızdır, tek dosya. */
const DIL = process.env.DIL ?? 'tr';
const OUT = path.join(KOK, 'docs/magaza-video');
mkdirSync(path.join(OUT, 'deneme'), { recursive: true });

const AYAR = {
  // 21:9 · 3840×1646. 2560×1097 @2.25 = 5760×2469 çizilir → 1,5× küçültme (süper örnekleme).
  header: { viewport: { width: 2560, height: 1097 }, dpr: 2.25, cikti: [3840, 1646], hud: false },
  // 3:2 · 3840×2560. Arayüz iPad yatay ölçeğinde (1200×800 css px) → @4,8 = 5760×3840.
  search: { viewport: { width: 1200, height: 800 }, dpr: 4.8, cikti: [3840, 2560], hud: true },
}[VIDEO];
const FPS = Number(process.env.FPS ?? 60);
/** Sayfa animasyon hızı: kare işi (1/FPS)/HIZ ms'yi aşmamalı (aşan kare `gecikme`de sayılır). */
const HIZ = Number(process.env.HIZ ?? 0.08);

/** Sayfa açılmadan kurulur: oyunun bütün zamanı buradan geçer. `__sanalBasla` gelene kadar gerçek saat akar. */
function sanalSaat() {
  const rafG = window.requestAnimationFrame.bind(window);
  const nowG = performance.now.bind(performance);
  const dateFark = Date.now() - nowG();
  let elle = false;
  let sanal = nowG();
  let kuyruk = [];
  let sira = 0;
  performance.now = () => (elle ? sanal : (sanal = nowG()));
  Date.now = () => dateFark + performance.now();
  window.requestAnimationFrame = (cb) => { kuyruk.push([++sira, cb]); return sira; };
  window.cancelAnimationFrame = (id) => { kuyruk = kuyruk.filter((k) => k[0] !== id); };
  const calistir = () => {
    const k = kuyruk;
    kuyruk = [];
    for (const [, cb] of k) {
      try { cb(sanal); } catch (e) { console.error(e); }
    }
  };
  const pompa = () => { if (!elle) { sanal = nowG(); calistir(); } rafG(pompa); };
  rafG(pompa);
  window.__sanalBasla = () => { elle = true; };
  window.__sanalKare = (ms) => { sanal += ms; calistir(); };
}

/**
 * Müzik (yalnız sahne `MUZIK` verirse — header): ses de videoyla aynı yoldan döner, [XF, T+XF] parçasının
 * sonu [0, XF]'ye erir. Seviye loudnorm −18 LUFS (Apple: ani yüksek ses yok); görüntü yeniden kodlanmaz.
 */
async function sesEkle(video, muzik, T, xf) {
  const gecici = video.replace(/\.mp4$/, '-sessiz.mp4');
  const { renameSync, rmSync } = await import('node:fs');
  renameSync(video, gecici);
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', gecici, '-i', muzik,
    '-filter_complex', `[1:a]asplit[a][b];[a]atrim=start=${xf}:end=${T + xf},asetpts=PTS-STARTPTS[g];[b]atrim=start=0:end=${xf},asetpts=PTS-STARTPTS[h];[g][h]acrossfade=d=${xf}:c1=tri:c2=tri,loudnorm=I=-18:TP=-2,aresample=48000[s]`,
    '-map', '0:v', '-map', '[s]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-t', String(T), '-movflags', '+faststart', video], { stdio: 'inherit' })
    .on('close', (c) => (c ? j(new Error(`ffmpeg ses ${c}`)) : r())));
  rmSync(gecici);
}

if (KIP === 'ses') {
  const sahne = await import(`./magaza-video-${VIDEO}.mjs`);
  await sesEkle(path.join(OUT, `${VIDEO}.mp4`), path.join(KOK, sahne.MUZIK), sahne.SURE, sahne.XF ?? 1);
  console.log('ses eklendi');
  process.exit(0);
}

const sunucu = spawn(process.execPath, [path.join(KOK, 'node_modules', 'vite', 'bin', 'vite.js'), '--config', 'tools/vite-kare.config.mjs', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: KOK, stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch { /* henüz yok */ }
  await new Promise((r) => setTimeout(r, 400));
}
const tarayici = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const hatalar = [];
try {
  const baglam = await tarayici.newContext({ viewport: AYAR.viewport, deviceScaleFactor: AYAR.dpr, hasTouch: true, isMobile: false, locale: DIL === 'en' ? 'en-US' : 'tr-TR' });
  await baglam.addInitScript(sanalSaat);
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  const cdp = await baglam.newCDPSession(s);
  await s.goto(`http://127.0.0.1:${PORT}/?kayitdpr=${AYAR.dpr}&f2golge=4096`, { waitUntil: 'networkidle' });
  await s.addStyleTag({ content: '.dsb-fab{display:none!important}' });
  await s.waitForSelector('[data-testid="kafe-adi"]', { timeout: 60000 });
  await s.fill('[data-testid="kafe-adi-girdi"]', DIL === 'en' ? 'Corner Tea House' : 'Köşe Kıraathanesi');
  await s.click('[data-testid="kafe-adi-tamam"]');
  await s.waitForTimeout(1500);
  if (!AYAR.hud) await s.addStyleTag({ content: '.hud,.joy,.joystick,[class*="joy"]{display:none!important}' });
  console.log('gpu', await s.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);
  }));

  const sahne = await import(`./magaza-video-${VIDEO}.mjs`);
  /** Döngü harmanı (sn): videonun sonu başına bu kadar sürede erir. Sahne kendi değerini verebilir. */
  const XF = sahne.XF ?? 1;
  await sahne.kur(s);
  await s.evaluate(() => window.__sanalBasla());
  // CSS animasyon/geçişleri sanal saate bağlanamaz: sayfanın animasyon hızı HIZ'a çekilir ve her kare
  // tam (1/FPS)/HIZ gerçek sürede çekilir → arayüz animasyonları da kare başına tam 1/FPS sn ilerler.
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: HIZ });
  let tempo = Date.now();
  let gecikme = 0;
  const bekleKare = async () => {
    tempo += 1000 / FPS / HIZ;
    const kalan = tempo - Date.now();
    if (kalan > 0) await new Promise((r) => setTimeout(r, kalan));
    else { gecikme++; tempo = Date.now(); }
  };

  const cek = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');
  const kareSayisi = Math.round(sahne.SURE * FPS);
  const adim = 1000 / FPS;

  if (sahne.CEKIMLER) {
    // KESMELİ VİDEO: her çekim kendi sahnelemesini kurar, kayıtsız ön sarmayla yerleşir (kamera, NPC),
    // sonra çekilir. Kesmeler sert; döngü de bir kesme olduğundan harman yok. Deneme: çekim başına 3 kare.
    const [w, h] = AYAR.cikti;
    const son = path.join(OUT, `${VIDEO}-${DIL}.mp4`);
    const ff = KIP === 'deneme' ? null : spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '5.2',
      '-movflags', '+faststart', son], { stdio: ['pipe', 'inherit', 'inherit'] });
    const basla = Date.now();
    for (const [ci, c] of sahne.CEKIMLER.entries()) {
      const kare = await c.hazirla(s);
      for (let k = 0; k < Math.round((c.on ?? 0.6) * FPS); k++) await s.evaluate((m) => window.__sanalKare(m), adim);
      tempo = Date.now();
      const n = Math.round(c.sure * FPS);
      const anlar = new Set([0, Math.floor(n / 2), n - 1]);
      for (let k = 0; k < n; k++) {
        // Yürütücü `true` dönerse eylem bitmiştir: çekim orada kesilir (oyuncu boşta beklemez). `sure` üst sınır.
        if (await kare(s, k / FPS)) { console.log(`  ${c.ad} ${(k / FPS).toFixed(2)} sn'de bitti`); break; }
        await s.evaluate((m) => window.__sanalKare(m), adim);
        await bekleKare();
        if (ff) {
          const png = await cek();
          if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
        } else if (anlar.has(k)) writeFileSync(path.join(OUT, 'deneme', `${VIDEO}-c${ci + 1}-${k}.png`), await cek());
      }
      console.log(`çekim ${ci + 1} ${c.ad}  ${((Date.now() - basla) / 1000).toFixed(0)} sn`);
    }
    if (ff) {
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      console.log('bitti', son, 'geciken kare', gecikme);
    }
  } else if (KIP === 'deneme') {
    const anlar = (process.env.ANLAR ?? '0,0.25,0.5,0.75').split(',').map(Number);
    let k = 0;
    for (const an of anlar) {
      const hedef = Math.round(an * kareSayisi);
      for (; k <= hedef; k++) { await sahne.kare(s, k / FPS); await s.evaluate((m) => window.__sanalKare(m), adim); }
      const t0 = Date.now();
      writeFileSync(path.join(OUT, 'deneme', `${VIDEO}-${String(Math.round(an * 100)).padStart(3, '0')}.png`), await cek());
      console.log('kare', an, `${Date.now() - t0} ms`);
    }
  } else {
    // 1) Ham: SURE + XF sn, son çözünürlükte neredeyse kayıpsız (crf 8).
    const [w, h] = AYAR.cikti;
    const ad = AYAR.hud ? `${VIDEO}-${DIL}` : VIDEO;
    const ham = path.join(OUT, `${ad}-ham.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv444p', ham], { stdio: ['pipe', 'inherit', 'inherit'] });
    const toplam = Math.round((sahne.SURE + XF) * FPS);
    const basla = Date.now();
    for (let k = 0; k < toplam; k++) {
      await sahne.kare(s, k / FPS);
      await s.evaluate((m) => window.__sanalKare(m), adim);
      await bekleKare();
      const png = await cek();
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (k % 120 === 0) console.log(`${k}/${toplam}  ${((Date.now() - basla) / 1000).toFixed(0)} sn`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    // 2) Döngü: kamera SURE periyotlu, o yüzden [XF, SURE+XF] parçasının son XF saniyesi [0, XF] ile
    //    harmanlanınca son kare ilk kareye birebir oturur — yalnız karakterler yumuşakça geçer.
    const T = sahne.SURE;
    const son = path.join(OUT, `${ad}.mp4`);
    await new Promise((r, j) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', ham,
      '-filter_complex', `[0:v]split[a][b];[a]trim=start=${XF}:end=${T + XF},setpts=PTS-STARTPTS[govde];[b]trim=start=0:end=${XF},setpts=PTS-STARTPTS[bas];[govde][bas]xfade=transition=fade:duration=${XF}:offset=${T - XF},format=yuv420p[v]`,
      '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '5.2', '-r', String(FPS), '-movflags', '+faststart', son], { stdio: 'inherit' })
      .on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
    if (sahne.MUZIK) await sesEkle(son, path.join(KOK, sahne.MUZIK), T, XF);
    console.log('bitti', son, 'geciken kare', gecikme, `${((Date.now() - basla) / 1000).toFixed(0)} sn`);
  }
  await baglam.close();
} catch (e) {
  console.error('HATA', e.stack ?? e.message);
} finally {
  if (hatalar.length) console.log('sayfa hataları:', hatalar.slice(0, 5));
  await tarayici.close();
  sunucu.kill();
}
