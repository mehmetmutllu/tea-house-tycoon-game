/**
 * olcum-bardak-t8.ts — T8a: BARDAK HAVUZU masa sayısıyla ölçeklenmiyor mu? (T6 yan bulgusu)
 *
 * Koşu:  npx tsx tools/olcum-bardak-t8.ts                                  (KISA)
 *        OLCUM=tam npx tsx tools/olcum-bardak-t8.ts > docs/olcum-bardak-t8.txt (TAM)
 *
 * SORU: T6 geç oyunda (20 masa, ocak tavanda) havuzu **42** ölçtü (`3 alan × 10 + 2 × 6`) ve temiz
 * bardak koşu boyunca **0**'dı. Buradan "havuz küçük" sonucu ÇIKMAZ: temiz 0 iken bardakların
 * hepsi masada kirli bekliyorsa darboğaz havuz değil YIKAMADIR ve havuzu büyütmek yalnız kirli
 * yığını büyütür (D-083'ün gerekçesi: *"havuzu büyütmek çözmez, fazladan bardak temiz durur,
 * masalar yine kirli"*). İki kolu ayırmak için havuz ve yıkama AYRI AYRI oynatılır.
 *
 * NASIL: ikinci model kurulmaz; oyunun KENDİ `tick()`i başsız koşar (T6 kurulumu: tüm pad'ler
 * açık, masalar tavanda, ocak tavanda, oyuncu parkta = AFK alt sınırı). Havuz yalnız yüklemede
 * `cleanCups`a yazılır (`store.ts` · `totalCupPool`), yani kol bir kurulum değeridir — `rules.ts`e
 * kanca gerekmez. Bulaşıkçının kademeleri `waiterUpgrades`tan.
 *
 * İKİ DÜNYA: W20 (geç oyun, T6'nın dünyası) · W8 (Salon 2 dolu, bulaşıkçı yeni tutulmuş, ocak L3).
 *
 * DAMGALAR: korunum (temiz + hazır + taşınan + müşteride + masada kirli = havuz, her kare) ·
 * varyant etkili (parmak izi tabandan farklı) · rejim (koşu boyunca masa/ocak değişmedi).
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

interface Kol { kod: string; ad: string; havuzCarpani: number; bulasikciTavan: boolean }

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
  const havuz = Math.round(totalCupPool(deriveWorld(s0.padsDone).areasOpen, lv) * k.havuzCarpani);
  useGame.setState({
    tableLevels: s0.tableLevels.map(() => w.masaSv),
    stationLevels: lv,
    cleanCups: havuz,
    waiterUpgrades: k.bulasikciTavan
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
  let korunum = 0, temizTop = 0, sifir = 0, kirliTop = 0, kirliMasaTop = 0, n = 0, rejim = true;
  for (let i = 0; i < Math.round(KAYIT_SN / DT); i++) {
    tick(DT);
    const s = useGame.getState();
    if (s.tables !== masa || s.stationLevels[0] !== ocak) rejim = false;
    const musteride = s.npcs.filter((x) => x.state === 'drinking').length;
    const garsonda = s.waiters.reduce((a, x) => a + x.tray + x.trayFood + (x.dirtyCarry ?? 0) + (x.dirtyCarryFood ?? 0), 0);
    const dw = s.dishwasher ? s.dishwasher.tray + s.dishwasher.trayFood : 0;
    const elde = s.tray + s.trayFood + s.carriedDirty + s.carriedDirtyFood;
    const legen = (s.legen?.bardak ?? 0) + (s.legen?.tabak ?? 0); // T8b leğeni (D-143) sonradan geldi
    const toplam = s.cleanCups + s.ready.tea + s.ready.tost + garsonda + elde + musteride + s.dishes.length + dw + legen;
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
    korunum,
    rejim,
    iz: iz.deger,
  };
}

const TUM_KOLLAR: Kol[] = [
  { kod: 'B0', ad: 'bugün: havuz = alan × 10 + 2 × ocak', havuzCarpani: 1, bulasikciTavan: false },
  { kod: 'B1', ad: 'havuz × 1,5', havuzCarpani: 1.5, bulasikciTavan: false },
  { kod: 'B2', ad: 'havuz × 2', havuzCarpani: 2, bulasikciTavan: false },
  { kod: 'Y1', ad: 'havuz aynı · bulaşıkçı TAVANDA (leğen 8 · hız 2,8)', havuzCarpani: 1, bulasikciTavan: true },
  { kod: 'Y2', ad: 'havuz × 2 · bulaşıkçı TAVANDA', havuzCarpani: 2, bulasikciTavan: true },
];
const KOLLAR = KISA ? TUM_KOLLAR.filter((k) => ['B0', 'B2', 'Y1'].includes(k.kod)) : TUM_KOLLAR;

const f1 = (x: number) => x.toFixed(1);
const yuzde = (x: number) => `%${(x * 100).toFixed(1)}`;

kipBandi();
console.log('=== T8a — BARDAK HAVUZU: havuz mu bağlıyor, yıkama mı? (oyunun kendi tick\'i, oyuncu parkta) ===');
console.log(`Isınma ${ISINMA_SN} sn · kayıt ${KAYIT_SN} sn · tohum ${TOHUMLAR.length} · DT 1/60`);
console.log('');

for (const w of KISA ? [W20] : [W20, W8]) {
  console.log(`--- ${w.ad} ---`);
  const bas = 'kol | havuz | servis/dk | temiz ort | temiz=0 payı | masada kirli ort | kirli masa ort';
  console.log(bas);
  console.log('-'.repeat(bas.length));
  let tabanIz = '';
  for (const k of KOLLAR) {
    const r = TOHUMLAR.map((t) => kos(w, k, t));
    const o = (f: (x: Olcum) => number) => r.reduce((a, x) => a + f(x), 0) / r.length;
    const iz = r.map((x) => x.iz).join('');
    if (k.kod === 'B0') tabanIz = iz; else varyantDamgasi(`${w.ad.slice(0, 3)} ${k.kod}`, tabanIz, iz);
    korunumDamgasi(`${w.ad.slice(0, 3)} ${k.kod}`, Math.max(...r.map((x) => x.korunum)));
    damga(`rejim ${w.ad.slice(0, 3)} ${k.kod}`, r.every((x) => x.rejim), 'masa/ocak koşu içinde değişti');
    console.log(
      k.kod.padEnd(3) + ' | ' + String(r[0].havuz).padStart(5) + ' | ' + f1(o((x) => x.servisDk)).padStart(9) +
      ' | ' + f1(o((x) => x.temizOrt)).padStart(9) +
      ' | ' + yuzde(o((x) => x.temizSifirPay)).padStart(12) + ' | ' + f1(o((x) => x.kirliOrt)).padStart(16) +
      ' | ' + f1(o((x) => x.kirliMasaOrt)).padStart(14),
    );
  }
  console.log('');
}
console.log('KOLLAR:');
for (const k of KOLLAR) console.log(`  ${k.kod}  ${k.ad}`);

damgaOzeti();
