/**
 * Search videosu (3:2, D-170): gerçek oynanış, arayüz görünür, KESMELİ. Tek bir geç-oyun dünyasında altı
 * çekim; dünya çekimden çekime sürer (yükseltilen masa sonraki çekimde yükseltilmiş, açılan masa açık):
 *   1 tezgâhtan çay+tost al · 2 servis · 3 mıknatısla para · 4 masa yükselt · 5 yeni masa aç · 6 geniş plan
 * Oyuncu joystick girdisiyle yürür (`__girdi`): ışınlama yok, çarpışma/animasyon/kural oyununki.
 * Masa çarpışma kutusu gövde + oyuncu yarıçapı (dörtlü ±1,34): yollar koridorlardan geçer.
 */

/** Arama kartı telefonda küçük: kamera oyunun yatay kadrajından biraz yakın (karakterler okunsun). */
const KAM_YAKIN = 0.8;

const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8'.split(' ');
const DEKOR = ['radyo', 'koltuk', 'lamba', 'tablo', 'semaver', 'gramofon', 'kanarya', 'saat'];
const MASA = 16; // z3table8'e kadar açık masa sayısı
/** Çekim 4'ün masası: (−5,3, 5,3). Daha küçük indeksler tavanda → yükseltme sırası bu masada. */
const YUKSELEN = 3;

export async function kur(s) {
  await s.evaluate(([pads, dekor, n, y]) => window.__setState({
    padsDone: pads, padFills: {}, stationLevels: [6], tableLevels: Array.from({ length: n }, (_, i) => (i === y ? 3 : 4)),
    mastersOwned: Array.from({ length: 24 }, (_, i) => `table:${i}`),
    wallet: 14800, diamonds: 320, xp: 60000, questIndex: 999,
    ownedCosmetics: dekor.map((d) => `decor:${d}`), dekor: Object.fromEntries(dekor.map((d) => [d, d])),
    floorThemeByArea: ['parke', 'parke', 'parke'], wallThemeByArea: ['yesil', 'yesil', 'yesil'], tableTheme: 'bordo',
    charUpgrades: { tray: 4, magnet: 3, speed: 3 },
  }), [PADS, DEKOR, MASA, YUKSELEN]);
  await s.waitForTimeout(2000);
  for (let i = 0; i < 30; i++) { await s.evaluate(() => window.__advanceTime(2)); await s.waitForTimeout(100); }
  await s.evaluate(() => window.__setState({ levelUp: null, offlineEarned: 0 }));
  // Başlangıç paketi teklifi bu ilerlemede açılır ve sahneyi örter: gösterilmiş say.
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    useGame.setState({ satin: { ...useGame.getState().satin, teklif: true } });
  });
  if (process.env.IZ) {
    const g = await s.evaluate(() => window.__game());
    console.log(JSON.stringify({ pad: g.currentPad, padPos: g.padPos, tables: g.tables, trayCap: g.trayCap, quest: g.quest }));
  }
}

/** Çekim başı: oyuncu yerinde, girdi sıfır, açık bildirim/kutlama yok, kamera kipi verilen. */
async function yerles(s, [x, z], { yakin = KAM_YAKIN, uzak = false, durum = {} } = {}) {
  await s.evaluate(([x, z, yakin, uzak, durum]) => {
    window.__teleport(x, z);
    window.__girdi(0, 0);
    window.__devCam({ distMul: yakin });
    window.__setState({ levelUp: null, notice: null, noticeQueue: [], camFocus: null, camZoomOut: uzak, ...durum });
  }, [x, z, yakin, uzak, durum]);
}

/**
 * Yürüyüş: [x, z, bekle] noktaları. bekle = null → durmadan geçilir (köşe 0,7 br önce dönülür);
 * sayı → noktaya yavaşlayarak varılır ve o kadar sn durulur. Girdi yumuşatılır (joystick'e parmakla
 * dokunur gibi; ani 90° dönüş yok).
 */
function yurut(yol) {
  const d = { i: 0, bekle: 0, son: 0, gx: 0, gz: 0 };
  return async (s, t) => {
    const dt = t - d.son;
    d.son = t;
    const p = await s.evaluate(() => window.__girdi(0, 0));
    let hx = 0;
    let hz = 0;
    if (d.i < yol.length) {
      const [x, z, bekle] = yol[d.i];
      const dx = x - p[0];
      const dz = z - p[1];
      const uz = Math.hypot(dx, dz);
      if (bekle == null) {
        if (uz < 0.7) d.i++;
        hx = dx / uz;
        hz = dz / uz;
      } else if (uz < 0.1) {
        d.bekle += dt;
        if (d.bekle >= bekle) { d.i++; d.bekle = 0; }
      } else {
        const m = Math.min(1, uz / 0.9) / uz;
        hx = dx * m;
        hz = dz * m;
      }
    }
    const a = 1 - Math.exp(-14 * dt);
    d.gx += (hx - d.gx) * a;
    d.gz += (hz - d.gz) * a;
    await s.evaluate(([a, b]) => window.__girdi(a, b), [d.gx, d.gz]);
  };
}

/** Oturan müşteriler çay bekler, garsonların tepsisi boş: servisi oyuncu yapar. */
async function bekleyenler(s, masalar) {
  await s.evaluate(async (masalar) => {
    const { useGame } = await import('/src/game/store.ts');
    const st = useGame.getState();
    useGame.setState({
      npcs: st.npcs.map((n) => (masalar.includes(n.tableIndex) && (n.state === 'drinking' || n.state === 'waitingForTea') ? { ...n, state: 'waitingForTea', timer: 40, product: 'tea' } : n)),
      waiters: st.waiters.map((w) => ({ ...w, tray: 0, trayFood: 0, claim: undefined })),
    });
  }, masalar);
}

/** Yolun üstüne sarmal para istifleri: [[x, z], …], her istifte `adet` sikke (her biri `deger`). */
async function paraIstifi(s, merkezler, adet, deger) {
  await s.evaluate(([merkezler, k, v]) => {
    const coins = [];
    for (const [x0, z0] of merkezler) {
      for (let i = 0; i < k; i++) {
        const a = i * 2.39996;
        const r = 0.2 + Math.sqrt(i) * 0.16;
        coins.push({ id: 900000 + coins.length, pos: [x0 + Math.cos(a) * r, 0.05, z0 + Math.sin(a) * r], value: v, age: 0 });
      }
    }
    window.__setState({ coins });
  }, [merkezler, adet, deger]);
}

/** Çekim kısa: yükseltme noktası / pad bu oranda ödenmiş başlar, dolumun yalnız son kısmı görünür. */
async function onDolum(s, { masa, pad }) {
  return s.evaluate(async ([masa, pad]) => {
    const { useGame } = await import('/src/game/store.ts');
    const { tableUpgradeCost } = await import('/src/config/economy.config.ts');
    const { areaOfTable } = await import('/src/game/world.ts');
    const st = useGame.getState();
    if (masa) {
      const f = [...st.tableUpgradeFills];
      f[masa[0]] = tableUpgradeCost(st.tableLevels[masa[0]], areaOfTable(masa[0])) * masa[1];
      useGame.setState({ tableUpgradeFills: f });
    }
    if (pad) {
      const g = window.__game();
      useGame.setState({ padFills: { ...st.padFills, [g.currentPad]: g.padCost * pad } });
      return g.currentPad;
    }
    return null;
  }, [masa, pad]);
}

/** Çekimler: `hazirla` sahneyi kurar ve o çekimin kare başı yürütücüsünü döndürür. */
export const CEKIMLER = [
  {
    ad: 'çay al', sure: 3,
    // Tezgâh arka bantta (−13, −10,3), alma noktası gövdeye 0,5. Arka koridordan (z −8,8) gelir.
    hazirla: async (s) => {
      await yerles(s, [-6.5, -8.7], { durum: { tray: 0, trayFood: 0, coins: [], ready: { tea: 4, tost: 2 } } });
      return yurut([[-10.5, -9.0, null], [-12.6, -9.3, 9]]);
    },
  },
  {
    ad: 'servis', sure: 3.6,
    hazirla: async (s) => {
      await yerles(s, [-12.6, 8.5], { durum: { tray: 5, trayFood: 1, coins: [] } });
      await bekleyenler(s, [0, 1, 2, 3]);
      return yurut([[-10.25, 8.5, null], [-10.25, 6.1, 0.3], [-10.25, 10.9, 0.3], [-6.75, 10.9, 0.3], [-6.75, 8.3, 9]]);
    },
  },
  {
    ad: 'para', sure: 3.6,
    // 2. salonun koridoru (z 8,5); dört büyük istif yol boyunca. Mıknatıs bu çekimde 2. kademe (r 3,4): istifler
    // kadraja girip sırayla akar, hepsi ilk anda emilmez — sayaç adım adım fırlar.
    hazirla: async (s) => {
      await yerles(s, [-5, 8.5], { durum: { tray: 0, trayFood: 0, charUpgrades: { tray: 4, magnet: 1, speed: 3 } } });
      await paraIstifi(s, [[2.5, 7.8], [5, 9.2], [7.5, 7.8], [10, 9.2]], 100, 35);
      return yurut([[13.5, 8.5, 9]]);
    },
  },
  {
    ad: 'yükselt', sure: 3.8,
    // Masa 3'ün yükseltme noktası (−3,1, 3,1): Sv 3 → 4 örtü gelir. Nokta %55 ödenmiş: dolum ~1,6 sn, sonra yeni hâl.
    hazirla: async (s) => {
      await yerles(s, [0.3, 5.6], { durum: { coins: [], charUpgrades: { tray: 4, magnet: 3, speed: 3 } } });
      await onDolum(s, { masa: [YUKSELEN, 0.55] });
      return yurut([[-3.1, 3.1, 9]]);
    },
  },
  {
    ad: 'yeni masa', sure: 4.2,
    // 3. salonun sıradaki masası (−11,7, −1,8): pad yarı ödenmiş, dolar, masa belirir, oyuncu masadan kayarak çıkar.
    hazirla: async (s) => {
      await yerles(s, [-7.4, 0.4]);
      console.log('pad', await onDolum(s, { pad: 0.5 }));
      return yurut([[-10.2, 0.3, null], [-11.7, -1.8, 2.4], [-9.4, 0.4, 9]]);
    },
  },
  {
    ad: 'geniş plan', sure: 3.2, on: 1.2,
    hazirla: async (s) => {
      await yerles(s, [0, 9.5], { yakin: 1.15, uzak: true, durum: { tray: 5, trayFood: 1 } });
      return yurut([[0, 3.5, null], [-2.5, -0.2, 9]]);
    },
  },
];
export const SURE = CEKIMLER.reduce((n, c) => n + c.sure, 0);
