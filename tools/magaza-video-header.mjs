/** Header videosu (21:9, D-170): arayüzsüz sinematik tur — geç oyun, dolu üç salon. */
export const SURE = 20;
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
    floorThemeByArea: ['ceviz', 'ceviz', 'ceviz'], tableTheme: 'bordo',
    ...tema,
  }), [PADS, DEKOR, TEMA]);
  await s.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await s.evaluate(() => window.__advanceTime(2)); await s.waitForTimeout(100); }
  await s.evaluate(() => window.__setState({ levelUp: null, offlineEarned: 0 }));
  await s.evaluate(() => window.__teleport(-3, 6));
  if (process.env.PLAN) await s.evaluate(() => window.__devPlan({ topDown: true, zoom: 1, gridStep: 2 }));
  await s.waitForTimeout(3000);
}

// Kamera periyodik: konum sin(2πt/T) ile salınır → başlangıç ve bitiş birebir aynı kadraj (döngü dikişsiz).
const KAM = JSON.parse(process.env.KAM ?? 'null') ?? { ax: 7, y: 10, z: 13, dz: 1, bz: -2, by: 0.6, bx: 0.6, fov: 40 };

export async function kare(s, t) {
  if (process.env.PLAN) return;
  const k = KAM;
  const a = (2 * Math.PI * t) / SURE;
  const x = k.ax * Math.sin(a);
  const z = k.z + k.dz * Math.cos(2 * a);
  await s.evaluate(([x, z, k]) => window.__sinema({ pos: [x, k.y, z], bak: [x * k.bx, k.by, k.bz], fov: k.fov }), [x, z, k]);
}
