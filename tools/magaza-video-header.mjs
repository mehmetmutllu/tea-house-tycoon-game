/**
 * Header videosu (21:9, D-170 · tur 3): arayüzsüz, tek fikir — çaycı tezgâhtan dolu tepsiyle çıkar, drone ÖNÜNDEN
 * geri geri uçarak onu takip eder; çaycı masaya varınca kamera yavaşça yükselip geri çekilir ve dolu salonu açar.
 * Döngü: sonun genel planı başın takibine erir (magaza-video.mjs XF harmanı). Oyuncu joystick girdisiyle yürür.
 */
export const SURE = Number(process.env.SURE ?? 15);
/** Header'da ses açılabilir (Apple: kısa, temiz dönen müzik): oyunun salon müziği (CC0, assets README). */
export const MUZIK = 'public/assets/audio/muzik_salon.ogg';
/** Genel plandan takibe dönüş harmanı (sn). */
export const XF = 1.2;

const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const DEKOR = ['radyo', 'koltuk', 'lamba', 'tablo', 'semaver', 'gramofon', 'kanarya', 'saat'];

const TEMA = JSON.parse(process.env.TEMA ?? '{}');

export async function kur(s) {
  await s.evaluate(([pads, dekor, tema]) => window.__setState({
    padsDone: pads, padFills: {}, stationLevels: [6], tableLevels: new Array(24).fill(4), diamonds: 320, wallet: 48250, xp: 60000, questIndex: 999,
    ownedCosmetics: dekor.map((d) => `decor:${d}`), dekor: Object.fromEntries(dekor.map((d) => [d, d])),
    mastersOwned: Array.from({ length: 24 }, (_, i) => `table:${i}`),
    floorThemeByArea: ['parke', 'parke', 'parke'], wallThemeByArea: ['yesil', 'yesil', 'yesil'], tableTheme: 'bordo',
    charUpgrades: { tray: 4, magnet: 3, speed: 2 },
    ...tema,
  }), [PADS, DEKOR, TEMA]);
  await s.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await s.evaluate(() => window.__advanceTime(2)); await s.waitForTimeout(100); }
  await s.evaluate(() => window.__setState({ levelUp: null, offlineEarned: 0 }));
  if (process.env.PLAN) await s.evaluate(() => window.__devPlan({ topDown: true, zoom: 1, gridStep: 2 }));
  await s.waitForTimeout(3000);
}

// YOL — tezgâh önünden (−11,5, −8,6) arka koridorla orta koridora, oradan güneye; ön sol masanın (−5,4, 5,5)
// KÖŞESİNE varır (sandalyeler arası boşluk: oturan müşterinin içine girmez). Masa çarpışma kutusu gövde + oyuncu
// yarıçapı: köşeler koridorun ortasından dönülür.
const YOL = JSON.parse(process.env.YOL ?? 'null') ?? [[-2.3, -8.6, null], [-2.4, 2.4, null], [-3.9, 3.9, 9]];
const BAS = [-11.5, -8.6];
/** Takip: kamera yürüme yönünde ÖNDE, çaycıya bakar; yürüdükçe [baş → son] arasında geri ve yukarı açılır. */
const ON = [4.8, 7.6];
const KAM_Y = [2.8, 5.0];
/** Açılmanın süresi (sn): yaklaşık yürüyüş kadar. */
const ACILMA = 6;
/** Joystick ne kadar itilir: çaycı koşmaz, takip okunur tempoda yürür. */
const ITIS = Number(process.env.ITIS ?? 0.62);
const FOV = Number(process.env.FOV ?? 42);
/** Açılış: varıştan bu kadar sonra başlar, bu kadar sürer; bitince genel plan yavaşça kayar. */
const ACILIS_GEC = 0.8;
const ACILIS = 4.2;
const GENIS = { pos: [3.5, 10.5, 15], bak: [-2.5, 0, -2], kay: [0.3, 0.05, -0.1] };
const GOK = '#b9dcf0';

const d = { son: -1, i: 0, bekle: 0, gx: 0, gz: 0, yon: [1, 0], onceki: null, kam: null, varis: null, donuk: null };

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a.map((v, k) => v + (b[k] - v) * u);

export async function kare(s, t) {
  if (process.env.PLAN) return;
  if (d.son < 0) {
    // Tepsi dolu, oturan herkes çay bekliyor, garsonlar boş: servisi çaycı yapar.
    await s.evaluate(async ([x, z]) => {
      const { useGame } = await import('/src/game/store.ts');
      const st = useGame.getState();
      window.__teleport(x, z);
      useGame.setState({
        tray: 5, trayFood: 1, coins: [], notice: null, noticeQueue: [], camFocus: null,
        npcs: st.npcs.map((n) => (n.state === 'drinking' || n.state === 'waitingForTea' ? { ...n, state: 'waitingForTea', timer: 40, product: 'tea' } : n)),
        // Garsonlar sağ yarıda, tepsileri dolu: oradaki masalara servis ederken çaycının yoluna ve takip
        // kamerasının önüne girmezler (boş tepsiyle tezgâha yürüyen garson kadrajı kapatıyordu).
        waiters: st.waiters.map((w, i) => ({ ...w, pos: [[9, 0.6, -1.5], [11, 0.6, 5], [7, 0.6, 11], [13, 0.6, -4]][i % 4], tray: 3, trayFood: 0, claim: undefined })),
      });
    }, BAS);
  }
  const dt = d.son < 0 ? 1 / 60 : t - d.son;
  d.son = t;

  const p = await s.evaluate(() => window.__girdi(0, 0));
  let hx = 0;
  let hz = 0;
  if (d.i < YOL.length) {
    const [x, z, bekle] = YOL[d.i];
    const dx = x - p[0];
    const dz = z - p[1];
    const uz = Math.hypot(dx, dz);
    if (bekle == null) {
      if (uz < 0.9) d.i++;
      hx = dx / uz;
      hz = dz / uz;
    } else if (uz < 0.15) {
      d.varis ??= t;
      d.bekle += dt;
      if (d.bekle >= bekle) { d.i++; d.bekle = 0; }
    } else {
      const m = Math.min(1, uz / 0.9) / uz;
      hx = dx * m;
      hz = dz * m;
    }
  }
  const a = 1 - Math.exp(-6 * dt);
  d.gx += (hx - d.gx) * a;
  d.gz += (hz - d.gz) * a;
  await s.evaluate(([a, b]) => window.__girdi(a, b), [d.gx * ITIS, d.gz * ITIS]);

  // Yön: hızdan, ağır yumuşatılmış — köşede kamera savrulmaz, çaycının önünde geniş bir yay çizer.
  if (d.onceki) {
    const vx = (p[0] - d.onceki[0]) / dt;
    const vz = (p[1] - d.onceki[1]) / dt;
    const v = Math.hypot(vx, vz);
    if (v > 0.8) {
      const b = 1 - Math.exp(-2.2 * dt);
      const nx = d.yon[0] + (vx / v - d.yon[0]) * b;
      const nz = d.yon[1] + (vz / v - d.yon[1]) * b;
      const n = Math.hypot(nx, nz);
      d.yon = [nx / n, nz / n];
    }
  }
  d.onceki = p;
  const ac = ease(t / ACILMA);
  const on = ON[0] + (ON[1] - ON[0]) * ac;
  const hedefPos = [p[0] + d.yon[0] * on, KAM_Y[0] + (KAM_Y[1] - KAM_Y[0]) * ac, p[1] + d.yon[1] * on];
  const hedefBak = [p[0] - d.yon[0] * 0.4, 0.8, p[1] - d.yon[1] * 0.4];
  if (!d.kam) d.kam = { pos: hedefPos, bak: hedefBak };
  const c = 1 - Math.exp(-5 * dt);
  d.kam = { pos: lerp(d.kam.pos, hedefPos, c), bak: lerp(d.kam.bak, hedefBak, c) };

  let { pos, bak } = d.kam;
  if (d.varis != null) {
    d.donuk ??= d.kam;
    const g = t - d.varis - ACILIS_GEC;
    const u = ease(g / ACILIS);
    const kay = Math.max(0, g - ACILIS);
    const genisPos = GENIS.pos.map((v, k) => v + GENIS.kay[k] * kay);
    // Yükseklik önden gelir (önce yukarı, sonra geri): kamera masaların üstünden süzülür, içinden geçmez.
    pos = lerp(d.donuk.pos, genisPos, u).map((v, k) => (k === 1 ? d.donuk.pos[1] + (genisPos[1] - d.donuk.pos[1]) * ease(Math.min(1, (g / ACILIS) * 2)) : v));
    bak = lerp(d.donuk.bak, GENIS.bak, u);
  }
  if (process.env.IZ && Math.round(t * 60) % 30 === 0) console.log(t.toFixed(2), p.map((v) => v.toFixed(2)).join(','), d.varis, await s.evaluate(() => window.__game().tray));
  await s.evaluate(([pos, bak, fov, gok]) => window.__sinema({ pos, bak, fov, gok }), [pos, bak, FOV, GOK]);
}
