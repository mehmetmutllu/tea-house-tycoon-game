/**
 * olcum-kat2-kasa.ts — D-185 UYGULAMA ÖLÇÜMÜ: Kat 1'in kasası + çevrimdışı, GERÇEK mekanikle.
 *
 * K2-4'te (ölçüm turu, ham çıktı `docs/olcum-kat2-kasa.txt`) kasa araçta muhasebeydi. S2'de kasa oyunda:
 * `tick.coinSystem` Kat 2'deyken oto-toplamayı kasaya yazar, `spawnSystem` kasa doluyken müşteri
 * doğurmaz, Kat 1'de kasaya yürüyünce boşalır, `store.tick` Kat 1'deyken Kat 2'yi de işletir, sınır
 * `kasa.kasaSiniriOlcumden` ile store'un kendi ölçümünden gelir. Bu araç YALNIZ store'u sürer ve
 * sonucu okur — kasa kolu, sınır, ölçüm, doğum kapısı oyunun koduyla birebir aynı.
 *
 * Kol: kasa sınırı `economy.kasa.dakika` (0 = sınırsız, karşılaştırma için; 20 = D-185). Çevrimdışı:
 * `rules.computeOfflineEarned` / `offlineEarnedSplit` + kasa (`kasayaAt`), store'un yolu.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-kasa.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-kasa.ts > docs/olcum-kat2-kasa-s2.txt
 */
import { KISA, botDamgasi, damga, damgaOzeti, kipBandi, kisaDeger, korunumDamgasi, seedRandom, varyantDamgasi } from './olcum-lib';
import { charMaxTier, economyConfig as C, playerSpeedFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { AGIZ, OCAK, OKEY_ERISIM, OKEY_YER, VARIS, type KatNo } from '../src/game/kat';
import { yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { computeOfflineEarned, incomeRate, kat2Oran, offlineEarnedSplit } from '../src/game/rules';
import { collectionMult } from '../src/game/goals';
import { THE_SERVICE } from '../src/game/world';
import { BAND, LAYOUT, getPlayerNavGrid } from '../src/game/layout';
import { findNavPath } from '../src/game/nav';
import { D } from '../src/game/decimal';
import { KASA_YER, kasaDakikaGeliri, kasaDolu, kasaSiniri, kasaSiniriOlcumden, kasayaAt } from '../src/game/kasa';
import type { Vec3 } from '../src/game/types';

kipBandi();

const DT = 0.1;
const SURE = kisaDeger(65 * 60, 40 * 60);
const ISINMA = kisaDeger(5 * 60, 3 * 60);
const KAT1_KALIS = 60;
const T_LISTE = KISA ? [10] : [5, 10, 20, 30];
const DK_KOLLAR = [0, 20] as const; // 0 = sınırsız (karşılaştırma) · 20 = D-185
const AYAR: Kat2Ayar = C.kat2;
const KAT2_DURUM: Record<string, string[]> = {
  'Kat 2 başı': ['k2okey1'],
  'Kat 2 dolu': ['k2okey1', 'k2cezve', 'k2okey2', 'k2okey3', 'k2okey4'],
};
const DURUMLAR = KISA ? ['Kat 2 dolu'] : Object.keys(KAT2_DURUM);
const kasaAyar = C.kasa as { dakika: number };

const HIZ = playerSpeedFor(charMaxTier('speed'));
const g = () => useGame.getState();

/** Kat 1'in idealize oranı (₺/sn) — çevrimdışının kullandığı formül (`store.cevrimdisiGelir`). */
function kat1Oran(): number {
  const s = g();
  let tip = 0;
  for (let i = 0; i < s.tables; i++) tip += C.tables.tipBase * (s.tableLevels[i] ?? 0);
  return incomeRate(s.tables, s.stationLevels[THE_SERVICE], tip, s.lavaboLevel, collectionMult(s.goalsClaimed ?? []));
}

/** Kat 2'de merdiven kovası ↔ salon arası yol (K2-4 aracındaki bot, aynen). */
const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
const kovada = (z: number) => z < BAND.front;
const ON_SERIT = OKEY_YER[0].z + OKEY_ERISIM - 0.1;
const ARKA_SERIT = OKEY_YER[0].z - OKEY_ERISIM - 1.6;
const GECITLER = [-10.25, 0, 10.25];
const onde = (z: number) => z > OKEY_YER[0].z;
function seritte(px: number, pz: number, t: readonly [number, number], serit: number): readonly [number, number] {
  if (Math.abs(px - t[0]) <= 0.3) return t;
  return Math.abs(pz - serit) > 0.3 ? [px, serit] : [t[0], serit];
}
function kat2Yol(px: number, pz: number, t: readonly [number, number]): readonly [number, number] {
  if (kovada(pz) || kovada(t[1])) {
    if (kovada(t[1]) === kovada(pz) && Math.abs(pz - t[1]) < 0.3) return t;
    if (Math.abs(px - KX) > 0.3) return kovada(pz) ? [KX, pz] : kat2Yol(px, pz, [KX, KAPI_Z]);
    if (kovada(t[1])) return [KX, t[1]];
    if (pz < KAPI_Z - 0.3) return [KX, KAPI_Z];
  }
  if (onde(pz) === onde(t[1])) return seritte(px, pz, t, onde(pz) ? ON_SERIT : ARKA_SERIT);
  const gx = GECITLER.reduce((a, b) => (Math.abs(b - (px + t[0]) / 2) < Math.abs(a - (px + t[0]) / 2) ? b : a));
  if (Math.abs(px - gx) > 0.3) return seritte(px, pz, [gx, onde(pz) ? ON_SERIT : ARKA_SERIT], onde(pz) ? ON_SERIT : ARKA_SERIT);
  return [gx, onde(pz) ? ARKA_SERIT : ON_SERIT];
}

/** Bitmiş Kat 1 + Kat 2 durumu; kasa ve ölçüm SIFIR (soğuk başlangıç — oyuncunun ilk Kat 2 turu). */
function bitmisKat1(pads: string[]): void {
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  const d = yeniKat2Dunya(pads, AYAR);
  const acik = d.masalar.filter((m) => m.durum === 'bos');
  const dongu = AYAR.gelisAralik + AYAR.yurume + AYAR.oturum;
  acik.forEach((m, i) => { m.t = AYAR.gelisAralik + (i * dongu) / acik.length; });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: pads }, kat2Dunya: d });
}

interface Sonuc {
  kat1Uret: number;
  kat1Cuzdana: number; // Kat 1'deyken yerden cüzdana
  kasayaGiren: number;
  bosalan: number;
  inisler: number[];
  kasaSon: number;
  kat2Net: number;
  kat2SizanKat1de: number; // Kat 1'deyken cüzdana Kat 1 dışından giren (0 olmalı)
  gorevOdulu: number;
  anindaToplanan: number; // Kat 1'de aynı karede doğup toplanan sikke (bilgi)
  dolSn: number; // kasa dolu + oyuncu Kat 2'de (Kat 1 durdu)
  dolmaSn: number[];
  ilkSinirSn: number; // soğuk başlangıç: ölçüm ilk ne zaman sınır verdi
  olculenDk: number; // store'un ölçtüğü Kat 1 ₺/dk (son)
  gercekDk: number; // Kat 2'deyken Kat 1'de gerçekten düşen ₺/dk
  sinirSon: number;
  yerdeTepe: number; // kasa doluyken yerde bekleyen sikke (tepe)
  kat2Masa: number; // Kat 1'deyken Kat 2'de durum değiştiren masa adımı (döner mi)
  inisSay: number;
  yol2: number;
  yol1: number;
  kat1Sn: number;
  sapmaKasa: number;
  sapmaKat1: number;
  iz: string;
}

function kos(durum: string, T: number, dk: number, seed = 1): Sonuc {
  kasaAyar.dakika = dk;
  seedRandom(seed);
  bitmisKat1(KAT2_DURUM[durum]);
  let faz: 'kat2' | 'inis' | 'kat1' | 'cikis' = 'kat2';
  let fazT = 0;
  let olcT = -ISINMA;
  let tumT = 0;
  const r: Sonuc = {
    kat1Uret: 0, kat1Cuzdana: 0, kasayaGiren: 0, bosalan: 0, inisler: [], kasaSon: 0, kat2Net: 0, kat2SizanKat1de: 0, gorevOdulu: 0, anindaToplanan: 0,
    dolSn: 0, dolmaSn: [], ilkSinirSn: NaN, olculenDk: NaN, gercekDk: NaN, sinirSon: NaN, yerdeTepe: 0, kat2Masa: 0,
    inisSay: 0, yol2: 0, yol1: 0, kat1Sn: 0, sapmaKasa: 0, sapmaKat1: 0, iz: '',
  };
  let yerde0 = 0, kasa0 = 0;
  let uretKat2de = 0, kat2deSn = 0;
  let bosaldiT = 0, doldu = false;
  let iz = 0x811c9dc5;
  let kasaGitti = false;
  const kara = new Set<number>();
  let takilId = -1, takilT = 0;
  let takilYer: [number, number] = [0, 0];
  const kurtar = { x: 0, z: 0, t: 0 };

  while (olcT < SURE) {
    const s = g();
    const katOnce: KatNo = s.kat;
    const olc = olcT >= 0;
    if (olc && olcT - DT < 0) {
      yerde0 = s.coins.reduce((a, c) => a + c.value, 0);
      kasa0 = s.kasa.toNumber();
    }

    // ---- BOT (K2-4 kalıbı; Kat 1'de önce kasaya yürür — boşaltma artık oyunun kendisi)
    let hedef: readonly [number, number] | null = null;
    let it: readonly [number, number] | null = null;
    const px = s.player[0], pz = s.player[2];
    if (!s.katGecis) {
      if (katOnce === 2) {
        if (faz === 'kat2' && fazT >= T * 60) faz = 'inis';
        if (faz === 'cikis') { faz = 'kat2'; fazT = 0; }
        if (faz === 'inis') {
          const z = AGIZ.sahanlik - LAYOUT.playerRadius - 0.1;
          if (Math.abs(px) < 0.3 && Math.abs(pz - z) < 0.3) it = [0, 1];
          else hedef = kat2Yol(px, pz, [0, z]);
        } else {
          const d = s.kat2Dunya;
          if (d.paralar.length) {
            const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - px, a.z - pz) <= Math.hypot(b.x - px, b.z - pz) ? a : b));
            hedef = kat2Yol(px, pz, [p.x, ON_SERIT]);
          } else {
            const bekleyen = d.masalar.map((m, k) => ({ m, yer: OKEY_YER[k] })).filter(({ m, yer }) => yer && m.durum === 'oyunda' && m.istek > 0);
            if (d.tepsi > 0 && bekleyen.length) {
              const b = bekleyen.reduce((a, c) => (a.m.sabir <= c.m.sabir ? a : c));
              hedef = kat2Yol(px, pz, [b.yer.x, ON_SERIT]);
            } else if (s.kat2.padsDone.includes(OCAK.id)) hedef = kat2Yol(px, pz, OCAK.al);
            else hedef = kat2Yol(px, pz, [OKEY_YER[0].x, ON_SERIT]);
          }
        }
      } else {
        if (faz === 'inis') { faz = 'kat1'; fazT = 0; kasaGitti = false; }
        if (faz === 'kat1' && fazT >= KAT1_KALIS) faz = 'cikis';
        if (faz === 'cikis') {
          const z = BAND.front + 0.25;
          if (Math.abs(px) < 0.3 && Math.abs(pz - z) < 0.3) it = [0, -1];
          else hedef = [0, z];
        } else if (!kasaGitti) {
          if (s.kasa.lte(0)) kasaGitti = true;
          else hedef = [KASA_YER[0], KASA_YER[1] + 0.05];
        } else {
          const aday = s.coins.filter((c) => !kara.has(c.id));
          if (aday.length) {
            const c = aday.reduce((a, b) => (Math.hypot(a.pos[0] - px, a.pos[2] - pz) <= Math.hypot(b.pos[0] - px, b.pos[2] - pz) ? a : b));
            hedef = [c.pos[0], c.pos[2]];
            if (c.id === takilId) { if (Math.hypot(px - takilYer[0], pz - takilYer[1]) < 0.2) { if (fazT - takilT > 1.5) kara.add(c.id); } else { takilT = fazT; takilYer = [px, pz]; } }
            else { takilId = c.id; takilT = fazT; takilYer = [px, pz]; }
          }
        }
      }
    }
    if (hedef && katOnce === 1) {
      const yolu = findNavPath(getPlayerNavGrid(s.tables, s.areasOpen), s.player, hedef[0], hedef[1], 0.2);
      if (yolu && yolu.length) hedef = [yolu[0][0], yolu[0][1]];
    }
    if (hedef) {
      const dx = hedef[0] - px, dz = hedef[1] - pz;
      const L = Math.hypot(dx, dz);
      it = L > 0.15 ? [dx / L, dz / L] : [0, 0];
    }
    // Kat 2 takılma kurtarması: 2 sn yerinden kıpırdamadıysa 0,4 sn hedefe dik yönde yürü (S2'de Kat 2'ye
    // yeni engeller geldi — ocak 2, garson — ve K2-4'ün serit botu bazı geçitlerde takılıyor).
    if (katOnce === 2 && it && hedef && Math.hypot(hedef[0] - px, hedef[1] - pz) > 0.6) {
      if (Math.hypot(px - kurtar.x, pz - kurtar.z) > 0.2) { kurtar.x = px; kurtar.z = pz; kurtar.t = tumT; }
      else if (tumT - kurtar.t > 2) {
        if (tumT - kurtar.t > 2.4) kurtar.t = tumT;
        it = [-it[1], it[0]];
      }
    }
    g().setKeyboardInput(it ? it[0] : 0, it ? it[1] : 0);

    // ---- ÖLÇÜLEN: store'un kendi karesi
    const yerdeOnce = s.coins.reduce((a, c) => a + c.value, 0);
    const masaOnce = s.kat2Dunya.masalar.map((m) => m.durum).join();
    g().tick(DT);
    const s2 = g();
    tumT += DT;
    let yeni = 0;
    for (const c of s2.coins) if (c.id >= s.nextId) yeni += c.value;
    const yerdeSonra = s2.coins.reduce((a, c) => a + c.value, 0);
    const alinan = yerdeOnce + yeni - yerdeSonra;
    const kasaFark = s2.kasa.sub(s.kasa).toNumber();
    const cuzdanFark = s2.wallet.sub(s.wallet).toNumber();
    const sinir = kasaSiniriOlcumden(s2.kasaOlcum, C.kasa);
    if (sinir && Number.isNaN(r.ilkSinirSn)) r.ilkSinirSn = tumT;

    const yol = Math.hypot(s2.player[0] - px, s2.player[2] - pz);
    if (katOnce === s2.kat && !s.katGecis) {
      if (katOnce === 2) r.yol2 += yol; else { r.yol1 += yol; r.kat1Sn += DT; }
    }

    if (olc) {
      r.kat1Uret += yeni;
      if (katOnce === 2 && s2.kat === 2) {
        r.kasayaGiren += kasaFark;
        r.kat2Net += cuzdanFark; // Kat 2'deyken Kat 1 cüzdana dokunmaz
        r.sapmaKasa += alinan - kasaFark; // Kat 2'deyken yerden alınan = kasaya giren
        uretKat2de += yeni;
        kat2deSn += DT;
        if (kasaDolu(s2.kasa, sinir)) {
          r.dolSn += DT;
          r.yerdeTepe = Math.max(r.yerdeTepe, s2.coins.length);
          if (!doldu) { doldu = true; r.dolmaSn.push(olcT - bosaldiT); }
        }
      } else if (katOnce === 1 && s2.kat === 1) {
        const bos = kasaFark < 0 ? -kasaFark : 0;
        if (bos > 0) { r.bosalan += bos; r.inisler.push(bos); bosaldiT = olcT; doldu = false; }
        r.kat1Cuzdana += alinan;
        // görev hattının ödülü (`questSystem`) Kat 1'in kendi geliridir — sızıntı sayılmaz
        let gorev = 0;
        for (const id of s2.questsDone) if (!s.questsDone.includes(id)) gorev += C.quests.find((q) => q.id === id)?.reward ?? 0;
        r.gorevOdulu += gorev;
        // Kat 2 sızıntısı Kat 2 tarafından okunur: oyuncu Kat 1'deyken yığın azalamaz, pad dolamaz/açılamaz.
        // (Cüzdan farkından okunamaz: aynı karede doğup oyuncunun ayağında toplanan sikke yerde hiç görünmez.)
        const yigin = (d: typeof s.kat2Dunya) => d.paralar.reduce((t, p) => t + p.miktar, 0);
        r.kat2SizanKat1de += Math.max(0, yigin(s.kat2Dunya) - yigin(s2.kat2Dunya));
        if (s2.kat2.padsDone.length !== s.kat2.padsDone.length || JSON.stringify(s2.kat2Dunya.padFill) !== JSON.stringify(s.kat2Dunya.padFill)) r.kat2SizanKat1de += 1;
        r.anindaToplanan += cuzdanFark - alinan - bos - gorev;
        if (s2.kat2Dunya.masalar.map((m) => m.durum).join() !== masaOnce) r.kat2Masa++;
      } else {
        // geçiş karesi (perde): Kat 1 bu karede kimin katında işledi, ona yaz
        if (katOnce === 2) { r.kasayaGiren += kasaFark; r.sapmaKasa += alinan - kasaFark; r.kat2Net += cuzdanFark; }
        else { r.kat1Cuzdana += alinan; r.kat2Net += cuzdanFark - alinan; }
      }
      if (s2.kat === 1 && katOnce === 2) r.inisSay++;
      iz = Math.imul(iz ^ (Math.round(s2.kasa.toNumber()) * 31 + s2.npcCount * 7 + Math.round(r.kat2Net)), 16777619) >>> 0;
    }
    if (!s2.katGecis) fazT += DT;
    olcT += DT;
  }
  g().setKeyboardInput(0, 0);
  const son = g();
  r.kasaSon = son.kasa.toNumber();
  r.olculenDk = kasaDakikaGeliri(son.kasaOlcum, C.kasa.olcumMinSn) ?? NaN;
  r.gercekDk = kat2deSn > 0 ? (uretKat2de / kat2deSn) * 60 : NaN;
  r.sinirSon = kasaSiniriOlcumden(son.kasaOlcum, C.kasa)?.toNumber() ?? NaN;
  const yerdeSon = son.coins.reduce((a, c) => a + c.value, 0);
  // Kat 1 ₺ korunumu: başta yerde + başta kasada + üretilen = Kat 1'deyken cüzdana + boşalan + kasada + yerde
  r.sapmaKat1 = Math.round(yerde0 + kasa0 + r.kat1Uret - r.kat1Cuzdana - r.bosalan - r.kasaSon - yerdeSon);
  r.sapmaKasa = Math.round(r.sapmaKasa);
  r.kat2SizanKat1de = Math.round(r.kat2SizanKat1de);
  r.iz = iz.toString(16);
  return r;
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const ort = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const kolAd = (dk: number) => (dk === 0 ? 'sınırsız' : `${dk} dk`);

// ---------------------------------------------------------------------------
console.log('=== D-185 — KAT 1 KASASI + ÇEVRİMDIŞI · GERÇEK MEKANİK (store + tick) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · senaryo ${SURE / 60} dk (önce ${ISINMA / 60} dk ısınma, Kat 2'de) · dt ${DT} · Kat 1'de kalış ${KAT1_KALIS} sn`);
console.log(`Bot: son kademe hız ${HIZ} · Kat 1 bitmiş, yükseltmesiz · kasa + ölçüm SIFIRDAN (soğuk başlangıç = oyuncunun ilk Kat 2 turu)`);
console.log(`Kasa ayarı: dakika ${C.kasa.dakika} · ölçüm penceresi ${C.kasa.olcumPencereSn} sn · soğuk başlangıç ${C.kasa.olcumMinSn} sn · taban ${C.kasa.tabanSinir} ₺ · erişim ${C.kasa.erisim} br · yer (${KASA_YER.join(', ')})`);
console.log('');

const dkVarsayilan = kasaAyar.dakika;
const sonuclar: { durum: string; T: number; dk: number; r: Sonuc }[] = [];
try {
  for (const durum of DURUMLAR)
    for (const T of T_LISTE)
      for (const dk of DK_KOLLAR) {
        const r = kos(durum, T, dk);
        const ad = `${durum} T${T} ${kolAd(dk)}`;
        botDamgasi(`${ad} Kat 2`, r.yol2, SURE / 60, 30);
        botDamgasi(`${ad} Kat 1`, r.yol1, r.kat1Sn / 60, 30);
        damga(`iniş oldu (${ad})`, r.inisSay >= Math.max(1, Math.floor(SURE / ((T + 1.2) * 60)) - 1), `${r.inisSay} iniş`);
        damga(`kasa boşaldı (${ad})`, r.inisler.length >= r.inisSay - 1, `${r.inisler.length}/${r.inisSay}`);
        korunumDamgasi(`Kat 1 ₺ ${ad}`, r.sapmaKat1);
        korunumDamgasi(`Kat 2'deyken yerden alınan = kasaya giren ${ad}`, r.sapmaKasa);
        korunumDamgasi(`Kat 1'deyken Kat 2'nin yığını/pad'i oyuncuya geçmedi ${ad}`, r.kat2SizanKat1de);
        damga(`Kat 1'deyken Kat 2 döner (${ad})`, r.kat2Masa > 0, 'masa durumu hiç değişmedi');
        damga(`ölçüm gerçeği izler ±%15 (${ad})`, Math.abs(r.olculenDk / r.gercekDk - 1) <= 0.15, `${f0(r.olculenDk)} vs ${f0(r.gercekDk)}`);
        if (dk > 0) damga(`kasa sınırı aşılmadı (${ad})`, r.kasaSon <= r.sinirSon + 1e-6 || r.dolSn === 0, `${r.kasaSon} > ${r.sinirSon}`);
        sonuclar.push({ durum, T, dk, r });
      }
} finally {
  kasaAyar.dakika = dkVarsayilan;
}
for (const durum of DURUMLAR) {
  const Tmax = Math.max(...T_LISTE);
  const a = sonuclar.find((x) => x.durum === durum && x.T === Tmax && x.dk === 0)!;
  const b = sonuclar.find((x) => x.durum === durum && x.T === Tmax && x.dk === 20)!;
  varyantDamgasi(`kasa 20 dk ${durum} T${Tmax}`, a.r.iz, b.r.iz);
  damga(`20 dk sınır T${Tmax}'da bağladı (${durum})`, b.r.dolSn > 0, 'kasa hiç dolmadı');
}

console.log(`--- A · ${SURE / 60} dk: Kat 2'de T dk → in, Kat 1'de önce kasaya yürü, ${KAT1_KALIS} sn → çık ---`);
console.log('Kat 1 ₺/dk = Kat 1\'deyken yerden + kasadan boşalan + koşu sonunda kasada · "durdu" = kasa dolu, oyuncu Kat 2\'de (Kat 1\'e müşteri gelmedi)');
console.log('durum       | T  | kasa     | toplam ₺/dk | Kat 1 ₺/dk | Kat 2 ₺/dk | iniş | iniş başı kasa ₺ | durdu sn (%) | dolma sn | yerde sikke tepe (dolu) | sınır (son) ₺ | ölçülen / gerçek Kat 1 ₺/dk | ilk sınır sn');
console.log('-'.repeat(190));
const dkS = SURE / 60;
for (const { durum, T, dk, r } of sonuclar) {
  const kat1 = r.kat1Cuzdana + r.anindaToplanan + r.bosalan + r.kasaSon;
  const kat2deDk = Math.max(1e-9, SURE - r.kat1Sn);
  console.log(
    `${durum.padEnd(11)} | ${String(T).padStart(2)} | ${kolAd(dk).padEnd(8)} | ${f0((kat1 + r.kat2Net) / dkS).padStart(11)} | ${f0(kat1 / dkS).padStart(10)} | ${f0(r.kat2Net / dkS).padStart(10)} | ${String(r.inisSay).padStart(4)} | ${f0(ort(r.inisler)).padStart(16)} | ${`${f0(r.dolSn)} (%${((100 * r.dolSn) / kat2deDk).toFixed(0)})`.padStart(12)} | ${f0(ort(r.dolmaSn)).padStart(8)} | ${String(r.yerdeTepe).padStart(23)} | ${f0(r.sinirSon).padStart(13)} | ${`${f0(r.olculenDk)} / ${f0(r.gercekDk)}`.padStart(27)} | ${f0(r.ilkSinirSn).padStart(12)}`,
  );
}

// ---------------------------------------------------------------------------
// B · ÇEVRİMDIŞI — store'un fonksiyonları (`computeOfflineEarned` · `offlineEarnedSplit` · `kasayaAt`)
console.log('');
console.log(`--- B · ÇEVRİMDIŞI · rateMult ${C.offline.rateMult} · süre tavanı ${C.offline.baseCapHours} sa · tavan = sıradaki pad × ${C.offline.capNextPadFrac} (Kat 1 bitmişse Kat 2'nin sıradaki pad'i) ---`);
bitmisKat1(KAT2_DURUM['Kat 2 dolu']);
const R1 = kat1Oran();
const kat1Pads = C.pads.map((p) => p.id);
const K2PADLER = AYAR.padler;
const kat2Durumlari = K2PADLER.map((_, i) => K2PADLER.slice(0, i).map((p) => p.id)).concat([K2PADLER.map((p) => p.id)]);
function aldigiPad(tutar: number, pads: string[]): number {
  let kalan = tutar, say = 0;
  for (const p of K2PADLER) {
    if (pads.includes(p.id)) continue;
    if (kalan < p.cost) break;
    kalan -= p.cost;
    say++;
  }
  return say;
}
// Kasa sınırı: A'nın 20 dk kolunun son ölçümü (gerçek store ölçümü).
const olcDk = ort(sonuclar.filter((x) => x.dk === 20).map((x) => x.r.olculenDk));
const KASA_SINIR = kasaSiniri(olcDk, dkVarsayilan)!;
console.log(`Kat 1 idealize oran ${(R1 * 60).toFixed(1)} ₺/dk · kasa sınırı (A'nın ölçümü ${f0(olcDk)} ₺/dk × ${dkVarsayilan}) ${f0(KASA_SINIR.toNumber())} ₺`);
type OffKol = { ad: string; f: (pads: string[], sn: number) => number };
const OFF_KOLLAR: OffKol[] = [
  { ad: 'S2 öncesi: yalnız Kat 1, Kat 1 tavanı', f: (_p, sn) => computeOfflineEarned(R1, sn, kat1Pads) },
  { ad: 'D-185: Kat 1\'de kapattı (iki kat, cüzdana)', f: (p, sn) => computeOfflineEarned(R1, sn, kat1Pads, { acik: true, padsDone: p }) },
  {
    ad: 'D-185: Kat 2\'de kapattı (Kat 1 payı kasaya, sınırda kesilir)',
    f: (p, sn) => {
      const r = offlineEarnedSplit(R1, sn, kat1Pads, { acik: true, padsDone: p });
      return r.kazanc - r.kat1Pay + kasayaAt(D(0), r.kat1Pay, KASA_SINIR).giren.toNumber();
    },
  },
];
console.log('kol                                                        | Kat 2 durumu (açık pad)             | Kat 2 oran ₺/dk | 1 sa ₺ | 4 sa ₺ | 8 sa ₺ | 1/4/8 sa alınan Kat 2 pad | ihlal (≥ 2 pad)');
console.log('-'.repeat(170));
const offIzler: string[] = [];
for (const kol of OFF_KOLLAR) {
  let ihlal = 0;
  let izS = '';
  for (const pads of kat2Durumlari) {
    const t = [1, 4, 8].map((h) => kol.f(pads, h * 3600));
    const al = t.map((v) => aldigiPad(v, pads));
    const bitmedi = pads.length < K2PADLER.length;
    const ih = bitmedi ? al.filter((a) => a >= 2).length : 0;
    ihlal += ih;
    izS += t.join(',') + ';';
    console.log(`${kol.ad.padEnd(58)} | ${(pads.length ? `${pads.length} · son ${pads[pads.length - 1]}` : '(hiç)').padEnd(35)} | ${(kat2Oran(pads) * 60).toFixed(1).padStart(15)} | ${f0(t[0]).padStart(6)} | ${f0(t[1]).padStart(6)} | ${f0(t[2]).padStart(6)} | ${al.join(' / ').padStart(25)} | ${bitmedi ? ih : '— (bitti)'}`);
  }
  offIzler.push(izS);
  console.log(`  ↳ ${kol.ad}: ihlal ${ihlal} / ${3 * (kat2Durumlari.length - 1)}`);
  if (kol.ad.startsWith('D-185')) damga(`çevrimdışı ihlal 0 (${kol.ad})`, ihlal === 0, `${ihlal} ihlal`);
}
varyantDamgasi('çevrimdışı D-185 tavanı', offIzler[0], offIzler[1]);

// Store yolu: Kat 2'de kapatılmış kayıt, 1 sa sonra açılır (init) — kasa sınırında kesilir mi.
{
  const mem: Record<string, string> = {};
  const gl = globalThis as Record<string, unknown>;
  const eski = gl.localStorage;
  gl.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  try {
    bitmisKat1(['k2okey1']);
    const olcum = { para: (olcDk / 60) * 600, sn: 600 };
    useGame.setState({ kasa: D(0), wallet: D(0), kasaOlcum: olcum });
    g().saveNow();
    const k = JSON.parse(mem['kiraathane.save']);
    k.lastSaved = Date.now() - 3600_000;
    delete k.zarf;
    mem['kiraathane.save'] = JSON.stringify(k);
    g().init();
    const s = g();
    const sinir = kasaSiniriOlcumden(olcum, C.kasa)!.toNumber();
    console.log(`store init (Kat 2'de kapatıldı, 1 sa, Kat 2 başı): kat ${s.kat} · kasa ${f0(s.kasa.toNumber())} ₺ (sınır ${f0(sinir)}) · cüzdana ${f0(s.wallet.toNumber())} ₺ (ekran ${f0(s.offlineEarned)})`);
    damga('store çevrimdışı: Kat 1 payı kasaya, sınırda', s.kat === 2 && s.kasa.toNumber() <= sinir && s.kasa.toNumber() > 0, `kasa ${s.kasa.toNumber()}`);
  } finally {
    if (eski === undefined) delete gl.localStorage; else gl.localStorage = eski;
  }
}

damgaOzeti();
