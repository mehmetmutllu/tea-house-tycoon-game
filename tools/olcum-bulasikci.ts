/**
 * olcum-bulasikci.ts — BULAŞIKÇI YIKAMA KURALI (D-201 Bulgu 5 yan bulgusu, 2026-11-17).
 *
 * Koşu:  npx tsx tools/olcum-bulasikci.ts                                   (KISA)
 *        OLCUM=tam npx tsx tools/olcum-bulasikci.ts > docs/olcum-bulasikci.txt (TAM)
 *
 * SORU: bulaşıkçı elindeki kapasite DOLMADAN yıkamaya gitmiyor. Tavanda (leğen 8 · hız 2,8) 8'i doldurana dek topladığı
 * bardaklar elinde bekliyor; temiz havuz kuruyor mu, hangi kural düzeltir? Kat 2'de ölçülen: tavan kademe tabandan KÖTÜ.
 *
 * NASIL: `olcum-bardak-t8` kurulumu — oyunun KENDİ `tick()`i başsız, tüm pad'ler o dünyaya dek açık, oyuncu parkta (işi
 * yalnız bulaşıkçı + garsonlar yapar = AFK alt sınırı). Kural config kancasından (`dishwasher.yikamaKurali`, null = bugün).
 *
 * DAMGALAR: korunum (temiz + hazır + taşınan + müşteride + yerde kirli + LEĞEN = havuz) · varyant etkili · rejim.
 */
import { KISA, kipBandi, damga, damgaOzeti, seedRandom, korunumDamgasi, varyantDamgasi, izOlustur } from './olcum-lib';
import { useGame, parkSpot, stationSoftMaxLevel, totalCupPool } from '../src/game/store';
import { D } from '../src/game/decimal';
import { deriveWorld } from '../src/game/world';
import { dirtyTables } from '../src/game/rules';
import { economyConfig as C } from '../src/config/economy.config';

const DT = 1 / 60;
// Tam koşu ~30 dk sürer (20 masada tick ~7× gerçek zaman) — arka planda koşturulur.
const ISINMA_SN = KISA ? 45 : 180;
const KAYIT_SN = KISA ? 90 : 420;
const TOHUMLAR = KISA ? [20260923] : [20260923, 20260924];

interface Dunya { ad: string; padSon: string; masaSv: number; ocak: number | 'tavan' }
const W20: Dunya = { ad: 'W20 geç oyun (20 masa · masalar L4 · ocak tavan)', padSon: 'z3table12', masaSv: 4, ocak: 'tavan' };
const W8: Dunya = { ad: 'W8 Salon 2 dolu (8 masa · masalar L2 · ocak L3 · bulaşıkçı yeni)', padSon: 'z2table4', masaSv: 2, ocak: 3 };

type Kural = { esik?: number; temizEnFazla?: number } | null;
interface Kol { kod: string; ad: string; tavan: boolean; kural: Kural }

function kur(w: Dunya, k: Kol, tohum: number): number {
  seedRandom(tohum);
  useGame.getState().hardReset();
  const son = C.pads.findIndex((p) => p.id === w.padSon);
  const qSon = C.quests.findIndex((q) => (q.target as { id?: string }).id === w.padSon);
  useGame.setState({
    padsDone: C.pads.slice(0, son + 1).map((p) => p.id),
    wallet: D(1e12),
    diamonds: D(1e6),
    questIndex: w.ocak === 'tavan' ? C.quests.length : qSon + 1,
  } as never);
  const s0 = useGame.getState();
  const ocak = w.ocak === 'tavan' ? stationSoftMaxLevel() : w.ocak;
  const lv = s0.stationLevels.map(() => ocak);
  // `s0.areasOpen` setState'ten sonra BAYAT kalır (store yalnız yüklemede türetir; tick her karede
  // padsDone'dan kendisi türetir). T6 aracı havuzu buradan okudu: ölçülen dünya 42 değil 22 bardaktı.
  const havuz = totalCupPool(deriveWorld(s0.padsDone).areasOpen, lv);
  (C.dishwasher as { yikamaKurali: Kural }).yikamaKurali = k.kural;
  useGame.setState({
    tableLevels: s0.tableLevels.map(() => w.masaSv),
    stationLevels: lv,
    cleanCups: havuz,
    waiterUpgrades: k.tavan
      ? { ...s0.waiterUpgrades, dishCarry: C.dishwasher.carryUpgrades.costs.length, dishSpeed: C.dishwasher.speedUpgrades.costs.length }
      : s0.waiterUpgrades,
  } as never);
  const s1 = useGame.getState();
  useGame.setState({ player: parkSpot(s1.areasOpen, s1.tables) } as never);
  return havuz;
}

interface Olcum {
  havuz: number;
  servisDk: number;
  temizOrt: number;
  temizSifirPay: number;
  kirliOrt: number;
  kirliMasaOrt: number;
  eldeOrt: number;
  korunum: number;
  rejim: boolean;
  iz: string;
}

function kos(w: Dunya, k: Kol, tohum: number): Olcum {
  const havuz = kur(w, k, tohum);
  const tick = useGame.getState().tick;
  for (let i = 0; i < Math.round(ISINMA_SN / DT); i++) tick(DT);
  const bas = useGame.getState();
  const masa = bas.tables;
  const ocak = bas.stationLevels[0];
  const servisBas = (bas.stats?.waiterServed ?? 0) + (bas.stats?.teasServed ?? 0);
  const iz = izOlustur();
  let eldeTop = 0, korunum = 0, temizTop = 0, sifir = 0, kirliTop = 0, kirliMasaTop = 0, n = 0, rejim = true;
  for (let i = 0; i < Math.round(KAYIT_SN / DT); i++) {
    tick(DT);
    const s = useGame.getState();
    if (s.tables !== masa || s.stationLevels[0] !== ocak) rejim = false;
    const musteride = s.npcs.filter((x) => x.state === 'drinking').length;
    const garsonda = s.waiters.reduce((a, x) => a + x.tray + x.trayFood + (x.dirtyCarry ?? 0) + (x.dirtyCarryFood ?? 0), 0);
    const dw = s.dishwasher ? s.dishwasher.tray + s.dishwasher.trayFood : 0;
    const elde = s.tray + s.trayFood + s.carriedDirty + s.carriedDirtyFood;
    const legen = (s.legen?.bardak ?? 0) + (s.legen?.tabak ?? 0);
    const toplam = s.cleanCups + s.ready.tea + s.ready.tost + garsonda + elde + musteride + s.dishes.length + dw + legen;
    eldeTop += dw;
    korunum = Math.max(korunum, Math.abs(toplam - havuz));
    temizTop += s.cleanCups;
    if (s.cleanCups === 0) sifir++;
    kirliTop += s.dishes.length;
    kirliMasaTop += dirtyTables(s.dishes, s.tableLevels).size;
    n++;
    if (i % 60 === 0) iz.ekle(s.cleanCups, s.dishes.length, s.npcs.length);
  }
  const s = useGame.getState();
  const dk = KAYIT_SN / 60;
  return {
    havuz,
    servisDk: ((s.stats?.waiterServed ?? 0) + (s.stats?.teasServed ?? 0) - servisBas) / dk,
    temizOrt: temizTop / n,
    temizSifirPay: sifir / n,
    kirliOrt: kirliTop / n,
    kirliMasaOrt: kirliMasaTop / n,
    eldeOrt: eldeTop / n,
    korunum,
    rejim,
    iz: iz.deger,
  };
}

const TUM_KOLLAR: Kol[] = [
  { kod: 'Y', ad: 'TAVAN (leğen 8 · hız 2,8) · bugünkü kural: dolunca git', tavan: true, kural: null },
  { kod: 'T0', ad: 'taban kademe (leğen 2 · hız 2,0) · bugünkü kural', tavan: false, kural: null },
  { kod: 'E4', ad: 'tavan · 4 kirliyle git', tavan: true, kural: { esik: 4 } },
  { kod: 'K0', ad: 'tavan · temiz bitince elindekini götür', tavan: true, kural: { temizEnFazla: 0 } },
  { kod: 'K2', ad: 'tavan · temiz ≤ 2 olunca elindekini götür', tavan: true, kural: { temizEnFazla: 2 } },
];
const KOLLAR = KISA ? TUM_KOLLAR.filter((k) => ['T0', 'Y', 'K2'].includes(k.kod)) : TUM_KOLLAR;

const f1 = (x: number) => x.toFixed(1);
const yuzde = (x: number) => `%${(x * 100).toFixed(1)}`;

kipBandi();
console.log('=== BULAŞIKÇI YIKAMA KURALI (Kat 1) — dolunca mı, eşikle mi, temiz azalınca mı? Oyunun kendi tick\'i, oyuncu parkta ===');
console.log(`Isınma ${ISINMA_SN} sn · kayıt ${KAYIT_SN} sn · tohum ${TOHUMLAR.length} · DT 1/60`);
console.log('');

for (const w of KISA ? [W20] : [W20, W8]) {
  console.log(`--- ${w.ad} ---`);
  const bas = 'kol | havuz | servis/dk | temiz ort | temiz=0 payı | masada kirli ort | kirli masa ort | bulaşıkçı elinde ort';
  console.log(bas);
  console.log('-'.repeat(bas.length));
  let tabanIz = '';
  for (const k of KOLLAR) {
    const r = TOHUMLAR.map((t) => kos(w, k, t));
    const o = (f: (x: Olcum) => number) => r.reduce((a, x) => a + f(x), 0) / r.length;
    const iz = r.map((x) => x.iz).join('');
    if (k.kod === 'Y') tabanIz = iz; else varyantDamgasi(`${w.ad.slice(0, 3)} ${k.kod}`, tabanIz, iz);
    korunumDamgasi(`${w.ad.slice(0, 3)} ${k.kod}`, Math.max(...r.map((x) => x.korunum)));
    damga(`rejim ${w.ad.slice(0, 3)} ${k.kod}`, r.every((x) => x.rejim), 'masa/ocak koşu içinde değişti');
    console.log(
      k.kod.padEnd(3) + ' | ' + String(r[0].havuz).padStart(5) + ' | ' + f1(o((x) => x.servisDk)).padStart(9) +
      ' | ' + f1(o((x) => x.temizOrt)).padStart(9) +
      ' | ' + yuzde(o((x) => x.temizSifirPay)).padStart(12) + ' | ' + f1(o((x) => x.kirliOrt)).padStart(16) +
      ' | ' + f1(o((x) => x.kirliMasaOrt)).padStart(14) + ' | ' + f1(o((x) => x.eldeOrt)).padStart(20),
    );
  }
  console.log('');
}
console.log('KOLLAR:');
for (const k of KOLLAR) console.log(`  ${k.kod}  ${k.ad}`);

damgaOzeti();
