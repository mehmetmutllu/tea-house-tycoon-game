/** Header videosu (21:9, D-170): arayüzsüz drone turu — geç oyun, dolu üç salon, oyunun başlangıç zemini (Klasik Parke). */
export const SURE = Number(process.env.SURE ?? 24);
/** Header'da ses açılabilir (Apple: kısa, temiz dönen müzik): oyunun salon müziği (CC0, assets README). */
export const MUZIK = 'public/assets/audio/muzik_salon.ogg';

const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const DEKOR = ['radyo', 'koltuk', 'lamba', 'tablo', 'semaver', 'gramofon', 'kanarya', 'saat'];

const TEMA = JSON.parse(process.env.TEMA ?? '{}');

export async function kur(s) {
  await s.evaluate(([pads, dekor, tema]) => window.__setState({
    padsDone: pads, padFills: {}, stationLevels: [6], tableLevels: new Array(24).fill(4), diamonds: 320, wallet: 48250, xp: 60000, questIndex: 999,
    ownedCosmetics: dekor.map((d) => `decor:${d}`), dekor: Object.fromEntries(dekor.map((d) => [d, d])),
    mastersOwned: Array.from({ length: 24 }, (_, i) => `table:${i}`),
    floorThemeByArea: ['parke', 'parke', 'parke'], wallThemeByArea: ['yesil', 'yesil', 'yesil'], tableTheme: 'bordo',
    ...tema,
  }), [PADS, DEKOR, TEMA]);
  await s.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await s.evaluate(() => window.__advanceTime(2)); await s.waitForTimeout(100); }
  await s.evaluate(() => window.__setState({ levelUp: null, offlineEarned: 0 }));
  await s.evaluate(() => window.__teleport(-3, 6));
  if (process.env.PLAN) await s.evaluate(() => window.__devPlan({ topDown: true, zoom: 1, gridStep: 2 }));
  await s.waitForTimeout(3000);
}

// DRONE YOLU — kapalı Catmull-Rom: kamera ve bakış noktası aynı anahtar karelerden geçer, son kare ilkine
// birebir döner (döngü dikişsiz). Bakış hep içeri/kuzeye (yakın ön cephe kadraja girmez).
// [konum, bakış] — sırayla: giriş üstü genel plan → orta koridora dalış → mutfağa süzülüş →
// banketler arasından sağa dönüş → sağ banketin müşterileri → sağ önde yükselip çapraz genel plan.
const ROTA = JSON.parse(process.env.ROTA ?? 'null') ?? [
  [[0, 10, 19], [0, 0.5, 1]],
  [[-1, 4.2, 9], [-2, 1, -5]],
  [[-5, 3.2, 0], [-12, 1.2, -12]],
  [[0, 3.6, -1], [9, 1, -7]],
  [[5, 3.8, 5], [11, 1, -4]],
  [[12, 7.5, 12], [-1, 0.5, 0]],
];
const FOV = Number(process.env.FOV ?? 50);
const GOK = '#b9dcf0';

function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u3));
}

export async function kare(s, t) {
  if (process.env.PLAN) return;
  const n = ROTA.length;
  const f = ((t / SURE) % 1) * n;
  const i = Math.floor(f);
  const u = f - i;
  const al = (j, k) => ROTA[(j + n) % n][k];
  const pos = catmull(al(i - 1, 0), al(i, 0), al(i + 1, 0), al(i + 2, 0), u);
  const bak = catmull(al(i - 1, 1), al(i, 1), al(i + 1, 1), al(i + 2, 1), u);
  await s.evaluate(([pos, bak, fov, gok]) => window.__sinema({ pos, bak, fov, gok }), [pos, bak, FOV, GOK]);
}
