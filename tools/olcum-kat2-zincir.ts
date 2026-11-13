/**
 * olcum-kat2-zincir.ts — K2-5 ÖLÇÜMÜ: Kat 2'nin açılış zinciri (pad FİYATLARI). Yalnız ölçüm (D-084):
 * fiyatlar koda/config'e YAZILMAZ; kollar araçta üretilir, `Kat2Ayar` araçta kurulur.
 *
 * Soru: Kat 2'nin 27 pad'i (D-186 sırası) hangi fiyat eğrisiyle 4-6 saatte (aktif) biter, en uzun
 * bekleyiş ne olur, oyuncu Kat 1'in kasasına kaç kez iner?
 *
 * BAŞLANGIÇ: bitmiş Kat 1 (bütün pad'ler, yükseltmesiz, karakter son kademe — `olcum-kat2-kasa`
 * kalıbı), merdiven açık, Kat 2 boş, CÜZDAN 0 (Kat 1'in son pad'i + merdiven tamiri cüzdanı boşaltır).
 *
 * KAT 1 ARKADA: gerçek `useGame` store'u (`runTick`) oyuncu Kat 2'deyken koşturulur ve kendiliğinden
 * toplanan her sikkenin ₺'si adım adım İZE yazılır (kimlikle, kasa aracının muhasebesi). Uzun ufukta
 * (10 sa × 13 kol) store'u her kolda yeniden koşturmak yerine bu iz ÇEVRİMLİ çalınır: oyuncu yokken
 * Kat 1 Kat 2'den bağımsız ve durağandır (tohumlu, aynı dükkân). D-185: iz kasaya akar; kasa
 * doluyken Kat 1 DURUR (iz ilerlemez, müşteri doğmaz). Kasa sınırı = izin ölçülen ₺/dk × 20 dk
 * (`kasa.kasaSiniri`). Oyuncu Kat 1'deyken iz cüzdana akar. Kasa saf fonksiyonları `src/game/kasa.ts`.
 *
 * KAT 2: `kat2Tick` + bot (`olcum-kat2-tavla` kalıbı: bölme duvarı katı, geçitten geçer; masa
 * gövdeleri yok sayılır). Öncelik: sıradaki pad (cüzdan yetiyorsa) → kasa politikası (Kat 1'e in)
 * → yığın → tepside kahve varsa sabrı en az kalan masa → hazır kahvesi olan en yakın ocak.
 * Kat 1 ziyareti: merdivene YÜRÜR (Kat 2'de), geçiş 0,7 sn, Kat 1'de varıştan kasaya (D-185 tezgâh
 * ucu) gidiş-dönüş düz çizgi son kademe hızla, geçiş 0,7 sn; bu sırada Kat 2 de işler (D-185).
 *
 * UYUM KATMANI (S2 ajan B paralel): `OCAKLAR` / `Kat2Dunya.ocaklar` / `garson` / `k2cezve2` /
 * `k2garson` yeri yoksa araç tek ocakla ve garsonsuz koşar; tanınmayan pad'in parasını araç kendisi
 * düşer (yer: yedek nokta) ve bunu çıktıda yazar. B'nin dosyalarına dokunulmaz.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-zincir.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-zincir.ts > docs/olcum-kat2-zincir.txt
 * Mutasyon (doğrulama): ZINCIR_MUT=fiyat2 (bütün fiyatlar ×2) · ZINCIR_MUT=kahvesiz (bot kahve taşımaz).
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, korunumDamgasi, seedRandom, varyantDamgasi, yuzdelik } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import * as KatMod from '../src/game/kat';
import {
  AGIZ,
  GECIS_SN,
  KAT2_BOLMELER,
  OCAK,
  OKEY_ERISIM,
  TAVLA_ERISIM,
  VARIS,
  kat2AcikAlan,
  kat2Adim,
  kat2AlanBul,
} from '../src/game/kat';
import { kat2MasaYeri, kat2PadYeri, kat2Tick, kat2ZincirHatasi, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2TavlaAyar } from '../src/game/kat2Dongu';
import { incomeRate } from '../src/game/rules';
import { collectionMult } from '../src/game/goals';
import { THE_SERVICE } from '../src/game/world';
import { BAND, LAYOUT } from '../src/game/layout';
import { D, type Decimal } from '../src/game/decimal';
import { kasaBosalt, kasaDolu, kasaSiniri, kasayaAt } from '../src/game/kasa';
import type { Vec3 } from '../src/game/types';

kipBandi();

const MUT = process.env.ZINCIR_MUT ?? '';
const DT = 0.1;
const UFUK = kisaDeger(10 * 3600, 3 * 3600); // bu sürede bitmeyen kol "bitmedi" yazılır
const IZ_ISINMA = kisaDeger(5 * 60, 3 * 60);
const IZ_SURE = kisaDeger(60 * 60, 10 * 60);
const KASA_DK = 20; // D-185
const KASA_YER: readonly [number, number] = [-10.8, -9.3]; // D-185 tezgâh ucu
const UZAK = { x: 0, z: 400 }; // oyuncu Kat 1'deyken Kat 2 koordinatı (hiçbir şeye yetişmez)

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();

// ---------------------------------------------------------------------------------------------
// ZİNCİR (D-186) + Kat2Ayar — config'te yeni zincir varsa onun id SIRASI, yoksa D-186 sabit.
// ---------------------------------------------------------------------------------------------
const D186: readonly string[] = [
  'k2okey1', 'k2cezve', 'k2okey2', 'k2okey3', 'k2okey4', 'k2salon2', 'k2s2okey1', 'k2s2okey2', 'k2cezve2',
  'k2s2okey3', 'k2s2okey4', 'k2s2okey5', 'k2s2okey6', 'k2salon3', 'k2garson',
  ...Array.from({ length: 12 }, (_, i) => `k2tavla${i + 1}`),
];
const CFG = C.kat2 as unknown as Kat2Ayar;
const cfgIdler = CFG.padler.map((p) => p.id);
const SIRA: readonly string[] = cfgIdler.length === D186.length && cfgIdler.every((id, i) => id === D186[i]) ? cfgIdler : D186;
const SIRA_KAYNAK = SIRA === cfgIdler ? 'config (B)' : 'D-186 araçta sabit (config zinciri henüz eksik)';
/** D-186 T120U (sprint S2 sözleşmesi). */
const T120U: Kat2TavlaAyar = { oturum: 120, kahveAralik: 25, istekAdet: 1, kahveFiyat: 3, masaUcreti: 51 };
const PAD_SN = 3.5; // dolum ~3,5 sn (Kat 1 pad tavanı; config taslağıyla aynı desen)

type Tur = 'masa' | 'ocak' | 'salon' | 'garson';
const turu = (id: string): Tur => (id.includes('cezve') ? 'ocak' : id.includes('salon') ? 'salon' : id.includes('garson') ? 'garson' : 'masa');

/** Pad yeri — B'nin `kat2PadYeri`si tanımıyorsa yedek nokta (araç parayı kendisi düşer). */
const YEDEK_YER: Record<string, [number, number]> = { k2cezve2: [-3.0, 2.0], k2garson: [5.5, -1.6] };
const taniniyor = (id: string): boolean => {
  try {
    kat2PadYeri(id);
    return true;
  } catch {
    return false;
  }
};
const padYeri = (id: string): [number, number] => (taniniyor(id) ? kat2PadYeri(id) : YEDEK_YER[id]);
const TANINMAYAN = SIRA.filter((id) => !taniniyor(id));

/** Ocaklar: B'nin `OCAKLAR`ı varsa o, yoksa tek ocak. */
type OcakYer = { id: string; al: readonly [number, number]; erisim: number };
const OCAKLAR_K: readonly OcakYer[] = (KatMod as unknown as { OCAKLAR?: readonly OcakYer[] }).OCAKLAR ?? [OCAK];
function hazirlar(d: Kat2Dunya): number[] {
  const x = d as unknown as { ocaklar?: { hazir: number }[]; ocakHazir?: number };
  return x.ocaklar ? x.ocaklar.map((o) => o.hazir) : [x.ocakHazir ?? 0];
}
const GARSON_API = 'garson' in (yeniKat2Dunya([], CFG) as object);
const GARSON_ORNEK = { hiz: 2, tepsi: 2, sayi: 1 }; // örnek sayı — B'nin ölçümü (K2-S2) gelene dek

const yuvarla = (v: number): number => {
  const adim = v < 1_000 ? 50 : v < 10_000 ? 100 : v < 100_000 ? 500 : 5_000;
  return Math.max(adim, Math.round(v / adim) * adim);
};

function ayarKur(fiyat: readonly number[], garson: boolean): Kat2Ayar {
  const carp = MUT === 'fiyat2' ? 2 : 1;
  const padler = SIRA.map((id, i) => {
    const cost = fiyat[i] * carp;
    return { id, cost, fillRate: Math.round(cost / PAD_SN) };
  });
  const a: Kat2Ayar = { ...CFG, padler, tavla: T120U };
  if (garson) (a as unknown as { garson: typeof GARSON_ORNEK }).garson = GARSON_ORNEK;
  return a;
}

// ---------------------------------------------------------------------------------------------
// TEORİK Kat 2 ORANI (₺/dk; her istek servis edilirse) — "sabit bekleyiş" eğrisi + çevrimdışı.
// ---------------------------------------------------------------------------------------------
function kat2Oran(pads: readonly string[]): number {
  const kahve = pads.includes(OCAK.id);
  let r = 0;
  for (const id of pads) {
    const m = kat2MasaYeri(id);
    if (!m) continue;
    const a = m.tur === 'tavla' ? T120U : CFG;
    const n = kahve ? Math.max(1, Math.floor((a.oturum - CFG.kahveSabir * 0.5) / a.kahveAralik)) : 0;
    r += ((a.masaUcreti + n * a.istekAdet * a.kahveFiyat) * 60) / (CFG.gelisAralik + CFG.yurume + a.oturum);
  }
  return r;
}

// ---------------------------------------------------------------------------------------------
// KAT 1 İZİ — gerçek store, oyuncu Kat 2'de (kıpırdamaz, Kat 2 boş): adım başına oto-toplanan ₺.
// ---------------------------------------------------------------------------------------------
function bitmisKat1(): void {
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: [] }, kat2Dunya: yeniKat2Dunya([], CFG) });
}

function kat1Izi(): { iz: Float64Array; r1Dk: number; r1Ideal: number } {
  seedRandom(7);
  bitmisKat1();
  const s0 = g();
  let tip = 0;
  for (let i = 0; i < s0.tables; i++) tip += C.tables.tipBase * (s0.tableLevels[i] ?? 0);
  const r1Ideal = incomeRate(s0.tables, s0.stationLevels[THE_SERVICE], tip, s0.lavaboLevel, collectionMult(s0.goalsClaimed ?? [])) * 60;
  g().setKeyboardInput(0, 0);
  const n = Math.round(IZ_SURE / DT);
  const iz = new Float64Array(n);
  let once = new Map<number, number>();
  const nIsinma = Math.round(IZ_ISINMA / DT);
  for (let i = 0; i < nIsinma + n; i++) {
    g().tick(DT);
    // S2 uyumu: store'un kendi kasası (A) varsa sıfır tutulur — kasa muhasebesi araçta, sınırı araç uygular.
    if ('kasa' in (g() as object)) useGame.setState({ kasa: D(0) } as never);
    const simdi = new Map(g().coins.map((c) => [c.id, c.value]));
    let giden = 0;
    for (const [id, v] of once) if (!simdi.has(id)) giden += v;
    once = simdi;
    if (i >= nIsinma) iz[i - nIsinma] = giden;
  }
  const top = iz.reduce((a, b) => a + b, 0);
  return { iz, r1Dk: (top / IZ_SURE) * 60, r1Ideal };
}

// ---------------------------------------------------------------------------------------------
// BOT YOLU — bölme geçitleri (`olcum-kat2-tavla`) + merdiven kovası koridoru (`olcum-kat2-kasa`).
// ---------------------------------------------------------------------------------------------
type Kapi = { yatay: boolean; duvar: number; c: number; alanlar: readonly [number, number] };
const KAPILAR: Kapi[] = KAT2_BOLMELER.flatMap((b) =>
  b.kapilar.map(([p, q]) => ({ yatay: b.z1 === b.z2, duvar: b.z1 === b.z2 ? b.z1 : b.x1, c: (p + q) / 2, alanlar: b.alanlar })),
);
function kapiNoktasi(k: Kapi, alan: number): [number, number] {
  const s = alan === k.alanlar[0] ? -1.2 : 1.2;
  return k.yatay ? [k.c, k.duvar + s] : [k.duvar + s, k.c];
}
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function araHedef(x: number, z: number, hedef: readonly [number, number], acik: number): readonly [number, number] {
  const a0 = kat2AlanBul(x, z);
  const a1 = kat2AlanBul(hedef[0], hedef[1]);
  if (a0 === a1) return hedef;
  const kapilar = (p: number, q: number) => KAPILAR.filter((k) => k.alanlar.includes(p) && k.alanlar.includes(q) && p < acik && q < acik);
  let en: { k: Kapi; L: number } | null = null;
  for (const k of kapilar(a0, a1)) {
    const L = uz([x, z], kapiNoktasi(k, a0)) + uz(kapiNoktasi(k, a1), hedef);
    if (!en || L < en.L) en = { k, L };
  }
  for (let c = 0; c < acik; c++) {
    if (c === a0 || c === a1) continue;
    for (const k1 of kapilar(a0, c))
      for (const k2 of kapilar(c, a1)) {
        const L = uz([x, z], kapiNoktasi(k1, a0)) + uz(kapiNoktasi(k1, c), kapiNoktasi(k2, c)) + uz(kapiNoktasi(k2, a1), hedef);
        if (!en || L < en.L) en = { k: k1, L };
      }
  }
  if (!en) return hedef;
  const k = en.k;
  const [boy, dik] = k.yatay ? [x, z] : [z, x];
  const karsi = k.alanlar[0] === a0 ? k.alanlar[1] : k.alanlar[0];
  if (Math.abs(boy - k.c) <= 0.35 && Math.abs(dik - k.duvar) <= 1.6) return kapiNoktasi(k, karsi);
  return kapiNoktasi(k, a0);
}

const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
const MERDIVEN: readonly [number, number] = [0, AGIZ.sahanlik - LAYOUT.playerRadius - 0.1];
const kovada = (z: number) => z < BAND.front;
function yol(x: number, z: number, h: readonly [number, number], acik: number): readonly [number, number] {
  const ik = kovada(z);
  const hk = kovada(h[1]);
  if (ik && hk) {
    if (Math.abs(z - h[1]) < 0.3) return h;
    return Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, h[1]];
  }
  if (ik) return Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, KAPI_Z];
  if (hk) return Math.abs(x - KX) < 0.3 && z <= KAPI_Z + 0.3 ? [KX, h[1]] : araHedef(x, z, [KX, KAPI_Z], acik);
  return araHedef(x, z, h, acik);
}

// ---------------------------------------------------------------------------------------------
// KOŞU
// ---------------------------------------------------------------------------------------------
type Politika = 'KARMA' | 'P80' | 'P100' | 'IHT';
const POLITIKA_NOT: Record<Politika, string> = {
  KARMA: 'kasa %80 dolunca YA DA sıradaki pad için cüzdan yetmiyor ve kasa açığı kapatıyorsa iner (TABAN)',
  P80: 'kasa %80 dolunca iner',
  P100: 'kasa dolunca iner',
  IHT: 'yalnız sıradaki pad için gerekince (ya da kasa dolunca) iner',
};

interface Sonuc {
  acilis: number[]; // pad başına açılış sn (NaN = açılmadı)
  bitis: number; // sn (NaN = ufukta bitmedi)
  inis: number;
  kasaDoluSn: number; // Kat 1'in durduğu süre
  tasan: number;
  saatlik: { kat1: number; kat2: number }[]; // saat başına ₺
  yol: number;
  iz: string;
  yedekPad: number; // araçta düşülen (tanınmayan) pad sayısı
  servis: number; // oyuncunun servis ettiği fincan
  garsonServis: number; // garsonun servis ettiği fincan (B'nin `olay.garsonServis`i)
  kacan: number;
}

/**
 * `okeyOdak`: oyuncu yalnız OKEY isteklerini taşır ve ocaktan yalnız okeyin istediği kadar alır (tavla garsonun;
 * B'nin garson ölçümündeki "son kademe oyuncu okeyde" kipi). Kapalıyken bot her isteğe gider, ocaktan tepsi dolusu alır.
 */
function kos(ad: string, ayar: Kat2Ayar, iz1: Float64Array, sinir: Decimal | null, pol: Politika, okeyOdak = false): Sonuc {
  const fiyat = ayar.padler;
  // kat2Tick tanınmayan pad'e gelince yerini soramasın diye onu görmez; o pad'i araç düşer.
  const ayarT: Kat2Ayar = TANINMAYAN.length ? { ...ayar, padler: ayar.padler.filter((p) => taniniyor(p.id)) } : ayar;
  let d = yeniKat2Dunya([], ayar);
  let padsDone: string[] = [];
  let cuzdan = 0;
  let kasa = D(0);
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let kat: 1 | 2 = 2;
  let kat1Kalan = 0; // Kat 1 ziyaretinin kalan süresi (sn)
  let kasaBosaltildi = false;
  let inmeli = false;
  let p1 = 0; // Kat 1 izinin oynatma imleci
  const acilis = SIRA.map(() => NaN);
  const saatlik: { kat1: number; kat2: number }[] = [];
  let inis = 0;
  let kasaDoluSn = 0;
  let yolT = 0;
  let yedekFill = 0;
  let yedekPad = 0;
  let servis = 0, garsonServis = 0, kacan = 0;
  // korunum sayaçları
  let kat2Kazanc = 0, harcama = 0, kat1Dogrudan = 0, kasaGiren = 0, kasaBosalan = 0, tasan = 0, dusen = 0;
  const izT = izOlustur();
  const kalisSn = 2 * GECIS_SN + (2 * Math.hypot(KASA_YER[0] - VARIS[1][0], KASA_YER[1] - VARIS[1][2])) / HIZ;
  let t = 0;

  for (; t < UFUK && padsDone.length < SIRA.length; t += DT) {
    const h = Math.floor(t / 3600);
    if (!saatlik[h]) saatlik[h] = { kat1: 0, kat2: 0 };
    const sira = SIRA[padsDone.length];
    const sp = fiyat[padsDone.length];
    const kalan = sp.cost - (d.padFill[sp.id] ?? 0) - (TANINMAYAN.includes(sp.id) ? yedekFill : 0);

    // ---- KAT 1 (iz): oyuncu Kat 2'de → kasaya (dolu → durur); Kat 1'de → cüzdana.
    if (kat === 2 && kasaDolu(kasa, sinir)) kasaDoluSn += DT;
    else {
      const akis = iz1[p1 % iz1.length];
      p1++;
      if (akis > 0) {
        if (kat === 2) {
          const r = kasayaAt(kasa, akis, sinir);
          kasa = r.kasa;
          kasaGiren += r.giren.toNumber();
          tasan += r.tasan.toNumber();
        } else {
          cuzdan += akis;
          kat1Dogrudan += akis;
        }
        saatlik[h].kat1 += akis;
      }
    }

    // ---- KAT 1 ziyareti: Kat 2 de işler (oyuncu uzakta).
    if (kat === 1) {
      kat1Kalan -= DT;
      if (!kasaBosaltildi && kat1Kalan <= kalisSn / 2) {
        const b = kasaBosalt(kasa, D(cuzdan));
        kasaBosalan += b.bosalan.toNumber();
        cuzdan = b.cuzdan.toNumber();
        kasa = b.kasa;
        kasaBosaltildi = true;
      }
      const r = kat2Tick(d, { x: UZAK.x, z: UZAK.z, durdu: true, cuzdan: 0, padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS }, DT, ayarT);
      d = r.dunya;
      dusen += r.olay.dusen.reduce((a, b) => a + b, 0);
      kacan += r.olay.kacan;
      garsonServis += (r.olay as { garsonServis?: number }).garsonServis ?? 0;
      if (kat1Kalan <= 0) {
        kat = 2;
        [x, z] = [VARIS[2][0], VARIS[2][2]];
      }
      continue;
    }

    // ---- BOT (Kat 2)
    const acik = kat2AcikAlan(padsDone);
    const kasaN = kasa.toNumber();
    if (!inmeli && sinir) {
      const s = sinir.toNumber();
      const ihtiyac = cuzdan < kalan && cuzdan + kasaN >= kalan;
      if (pol === 'KARMA') inmeli = kasaN >= 0.8 * s || ihtiyac;
      else if (pol === 'P80') inmeli = kasaN >= 0.8 * s;
      else if (pol === 'P100') inmeli = kasaN >= s;
      else inmeli = kasaN >= s || ihtiyac;
    }
    let hedef: readonly [number, number];
    let padda = false;
    if (cuzdan >= kalan - 1e-9) {
      hedef = padYeri(sira);
      padda = true;
    } else if (inmeli) {
      hedef = MERDIVEN;
    } else if (d.paralar.length) {
      const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b));
      hedef = [p.x, p.z];
    } else {
      const bekleyen = MUT === 'kahvesiz' ? [] : d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0 && (!okeyOdak || m.tur === 'okey'));
      const hz = hazirlar(d);
      const acikOcak = OCAKLAR_K.filter((o) => padsDone.includes(o.id));
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
      } else if (acikOcak.length && MUT !== 'kahvesiz') {
        const hazir = acikOcak.filter((o) => hz[OCAKLAR_K.indexOf(o)] > 0);
        const aday = hazir.length ? hazir : acikOcak;
        hedef = aday.reduce((a, b) => (uz([x, z], a.al) <= uz([x, z], b.al) ? a : b)).al;
      } else {
        hedef = padYeri(sira); // ocak yok: sıradaki pad'in yanında bekle (cüzdan yetmiyor → dolmaz)
      }
    }
    const ara = yol(x, z, hedef, acik);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const k = Math.min(1, (HIZ * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * k, dz * k, acik);
      yolT += Math.hypot(nx - x, nz - z);
      x = nx;
      z = nz;
    }
    if (inmeli && uz([x, z], MERDIVEN) < 0.3) {
      kat = 1;
      inmeli = false;
      kasaBosaltildi = false;
      kat1Kalan = kalisSn;
      inis++;
    }

    const okeyIstek = okeyOdak ? d.masalar.reduce((a, m) => a + (m.tur === 'okey' && m.durum === 'oyunda' ? m.istek : 0), 0) : TEPSI;
    const tepsiKap = MUT === 'kahvesiz' ? 0 : Math.min(TEPSI, Math.max(d.tepsi, okeyIstek));
    const r = kat2Tick(d, { x, z, durdu, cuzdan, padsDone, tepsiKap, miknatis: MIKNATIS }, DT, ayarT);
    d = r.dunya;
    cuzdan += r.kazanc - r.harcama;
    harcama += r.harcama;
    kat2Kazanc += r.kazanc;
    dusen += r.olay.dusen.reduce((a, b) => a + b, 0);
    const gS = (r.olay as { garsonServis?: number }).garsonServis ?? 0;
    garsonServis += gS;
    servis += r.olay.servis - gS;
    kacan += r.olay.kacan;
    saatlik[h].kat2 += r.kazanc;
    if (r.padsDone !== padsDone) padsDone = r.padsDone;
    // Tanınmayan pad (B'nin yeri/mantığı yok): araç düşer, pad'in kendi dolum hızıyla.
    if (padda && durdu && TANINMAYAN.includes(sira) && padsDone.length < SIRA.length && SIRA[padsDone.length] === sira) {
      const amt = Math.min(sp.fillRate * DT, cuzdan, sp.cost - yedekFill);
      yedekFill += amt;
      cuzdan -= amt;
      harcama += amt;
      if (yedekFill >= sp.cost - 1e-9) {
        padsDone = [...padsDone, sira];
        yedekFill = 0;
        yedekPad++;
      }
    }
    const i0 = padsDone.length;
    for (let i = 0; i < i0; i++) if (Number.isNaN(acilis[i])) acilis[i] = t;
    if (Math.round(t / DT) % 50 === 0) izT.ekle(cuzdan, padsDone.length, kasaN, x, z);
  }
  const yerde = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`Kat 2 ₺ ${ad}`, Math.round(dusen - kat2Kazanc - yerde));
  korunumDamgasi(`kasa ₺ ${ad}`, Math.round(kasaGiren - kasaBosalan - kasa.toNumber()));
  korunumDamgasi(`cüzdan ₺ ${ad}`, Math.round(kat2Kazanc + kasaBosalan + kat1Dogrudan - harcama - cuzdan));
  return {
    acilis,
    bitis: padsDone.length === SIRA.length ? t : NaN,
    inis,
    kasaDoluSn,
    tasan,
    saatlik,
    yol: yolT,
    iz: izT.deger,
    yedekPad,
    servis,
    garsonServis,
    kacan,
  };
}

// ---------------------------------------------------------------------------------------------
// KOLLAR — fiyat eğrileri
// ---------------------------------------------------------------------------------------------
type Kol = { ad: string; not: string; fiyat: number[] };
const geo = (r: number, c0: number, carp?: Partial<Record<Tur, number>>) =>
  SIRA.map((id, i) => yuvarla(c0 * r ** i * (carp?.[turu(id)] ?? 1)));
const sabitBekleyis = (dk: number, r1: number) => SIRA.map((_, i) => yuvarla(dk * (r1 + kat2Oran(SIRA.slice(0, i)))));
const TUR_CARP: Partial<Record<Tur, number>> = { ocak: 1.5, salon: 2.5, garson: 2 };

function kollar(r1: number): Kol[] {
  const hepsi: Kol[] = [
    { ad: 'G1.15-500', not: 'geometrik ×1,15, ilk 500 ₺ (TABAN)', fiyat: geo(1.15, 500) },
    { ad: 'G1.10-500', not: 'geometrik ×1,10, ilk 500 ₺', fiyat: geo(1.1, 500) },
    { ad: 'G1.10-1500', not: 'geometrik ×1,10, ilk 1.500 ₺', fiyat: geo(1.1, 1500) },
    { ad: 'G1.15-1500', not: 'geometrik ×1,15, ilk 1.500 ₺', fiyat: geo(1.15, 1500) },
    { ad: 'G1.20-500', not: 'geometrik ×1,20, ilk 500 ₺', fiyat: geo(1.2, 500) },
    { ad: 'G1.35-500', not: 'geometrik ×1,35, ilk 500 ₺ (sözleşme örneği)', fiyat: geo(1.35, 500) },
    { ad: 'G1.50-500', not: 'geometrik ×1,5, ilk 500 ₺ (sözleşme örneği)', fiyat: geo(1.5, 500) },
    { ad: 'G1.70-500', not: 'geometrik ×1,7, ilk 500 ₺ (sözleşme örneği)', fiyat: geo(1.7, 500) },
    { ad: 'T1.15-500', not: 'geometrik ×1,15, ilk 500 ₺; ocak ×1,5 · salon ×2,5 · garson ×2', fiyat: geo(1.15, 500, TUR_CARP) },
    { ad: 'T1.12-500', not: 'geometrik ×1,12, ilk 500 ₺; ocak ×1,5 · salon ×2,5 · garson ×2', fiyat: geo(1.12, 500, TUR_CARP) },
    { ad: 'SB8', not: 'sabit bekleyiş: fiyat = o anki teorik gelirin 8 dk\'sı', fiyat: sabitBekleyis(8, r1) },
    { ad: 'SB9', not: "sabit bekleyiş: fiyat = o anki teorik gelirin 9 dk'sı", fiyat: sabitBekleyis(9, r1) },
    { ad: 'SB10', not: "sabit bekleyiş: fiyat = o anki teorik gelirin 10 dk'sı", fiyat: sabitBekleyis(10, r1) },
    { ad: 'SB12', not: 'sabit bekleyiş: fiyat = o anki teorik gelirin 12 dk\'sı', fiyat: sabitBekleyis(12, r1) },
    { ad: 'DUZ3000', not: 'düz: her pad 3.000 ₺', fiyat: SIRA.map(() => 3000) },
  ];
  return KISA ? hepsi.filter((k) => ['G1.15-500', 'SB8', 'G1.35-500'].includes(k.ad)) : hepsi;
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const dk1 = (sn: number) => (Number.isFinite(sn) ? (sn / 60).toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');

console.log('=== K2-5 — KAT 2 AÇILIŞ ZİNCİRİ (pad fiyat kolları) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · ufuk ${UFUK / 3600} sa · dt ${DT}${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Zincir (${SIRA.length} pad, kaynak: ${SIRA_KAYNAK}): ${SIRA.join(' → ')}`);
console.log(`Tavla T120U (D-186): oyun ${T120U.oturum} sn · ücret ${T120U.masaUcreti} ₺ · kahve ${T120U.kahveFiyat} ₺ · okey config (D-184). Dolum ${PAD_SN} sn/pad.`);
console.log(`Bot: son kademe hız ${HIZ} · tepsi ${TEPSI} · mıknatıs ${MIKNATIS} · başlangıç cüzdan 0, Kat 2 boş, Kat 1 bitmiş (yükseltmesiz).`);
console.log(`Ocaklar: ${OCAKLAR_K.map((o) => o.id).join(', ')} · garson API: ${GARSON_API ? 'VAR' : 'YOK (B birleşmeden önce; garson pad\'i parayı alır, garson gelmez)'}`);
console.log(`Araçta düşülen pad (B'de yeri yok): ${TANINMAYAN.length ? TANINMAYAN.join(', ') : 'yok'}`);
const tamZincir = ayarKur(SIRA.map(() => 1), GARSON_API); // garson sayıları örnek: bekçi yalnız YAPIYI sınar
const zh = TANINMAYAN.length ? 'atlandı (tanınmayan pad)' : kat2ZincirHatasi(tamZincir);
if (!TANINMAYAN.length) damga('zincir tutarlı (kat2ZincirHatasi)', zh === null, String(zh));
console.log(`Zincir bekçisi: ${zh ?? 'tutarlı'}`);

const t0 = Date.now();
const { iz: IZ1, r1Dk, r1Ideal } = kat1Izi();
const SINIR = kasaSiniri(Math.round(r1Dk), KASA_DK);
console.log(`Kat 1 izi (gerçek store, oyuncu yokken, tohum 7, ${IZ_SURE / 60} dk, ${IZ_ISINMA / 60} dk ısınma): ${r1Dk.toFixed(1)} ₺/dk → kasa sınırı ${KASA_DK} dk = ${f0(SINIR!.toNumber())} ₺ · idealize (incomeRate) ${f0(r1Ideal)} ₺/dk · iz ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
damga('Kat 1 izi akıyor', r1Dk > 10, `${r1Dk.toFixed(1)} ₺/dk`);
console.log(`Kat 2 teorik tavan (her istek servis): tam zincir ${f0(kat2Oran(SIRA))} ₺/dk · 4 okey + ocak ${f0(kat2Oran(SIRA.slice(0, 5)))} ₺/dk`);
console.log('');

const KOLLAR = kollar(r1Dk);
type Satir = { kol: Kol; pol: Politika; garson: boolean; okeyOdak?: boolean; r: Sonuc };
const satirlar: Satir[] = [];
let tabanIz = '';
for (const kol of KOLLAR) {
  const r = kos(kol.ad, ayarKur(kol.fiyat, false), IZ1, SINIR, 'KARMA');
  botDamgasi(kol.ad, r.yol, (Number.isFinite(r.bitis) ? r.bitis : UFUK) / 60, 30);
  if (kol === KOLLAR[0]) tabanIz = r.iz;
  else varyantDamgasi(kol.ad, tabanIz, r.iz);
  satirlar.push({ kol, pol: 'KARMA', garson: false, r });
}
// Politika kolları + garson (taban eğri üstünde)
const POL_KOLU = KOLLAR.find((k) => k.ad === (KISA ? 'G1.15-500' : 'SB9')) ?? KOLLAR[0];
const POLITIKALAR: Politika[] = KISA ? ['P80'] : ['P80', 'P100', 'IHT'];
const polTaban = satirlar.find((s) => s.kol === POL_KOLU)!;
for (const pol of POLITIKALAR) {
  const r = kos(`${POL_KOLU.ad} ${pol}`, ayarKur(POL_KOLU.fiyat, false), IZ1, SINIR, pol);
  botDamgasi(`${POL_KOLU.ad} ${pol}`, r.yol, (Number.isFinite(r.bitis) ? r.bitis : UFUK) / 60, 30);
  // IHT, KARMA'nın %80 kuralını kaldırır: kasa hiç %80'e varmıyorsa ikisi BİREBİR aynıdır — bu bir bulgu, damga değil.
  if (pol === 'IHT' && r.iz === polTaban.r.iz) console.error(`not: politika IHT ${POL_KOLU.ad} KARMA ile birebir (kasa %80'e hiç varmadı)`);
  else varyantDamgasi(`politika ${pol}`, polTaban.r.iz, r.iz);
  satirlar.push({ kol: POL_KOLU, pol, garson: false, r });
}
if (GARSON_API) {
  // İki kip: oyuncu her isteğe koşar (garson ocakta oyuncuyla yarışır) · oyuncu okeyde, garson tavlada (B'nin kipi).
  for (const okeyOdak of [false, true]) {
    const r = kos(`${POL_KOLU.ad} garson${okeyOdak ? ' okey' : ''}`, ayarKur(POL_KOLU.fiyat, true), IZ1, SINIR, 'KARMA', okeyOdak);
    if (okeyOdak) varyantDamgasi('garson (oyuncu okeyde)', polTaban.r.iz, r.iz);
    else if (r.garsonServis === 0) console.error('not: garson, oyuncu her isteğe koşarken HİÇ fincan bulamadı (ocağı oyuncu boşaltıyor)');
    satirlar.push({ kol: POL_KOLU, pol: 'KARMA', garson: true, okeyOdak, r });
  }
}

// ---- §A ÖZET
console.log('--- §A KOLLAR — toplam süre (aktif), bekleyiş, Kat 1 inişi, kasa ---');
console.log('bekleyiş = önceki pad açılışından bu pad açılışına; ilk pad için koşu başından. "dk" = oyun dakikası.');
console.log('kol         | pol   | garson | zincir ₺  | toplam      | en uzun bekleyiş (pad)     | medyan dk | iniş | Kat 1 durdu dk | taşan ₺ | yol br/dk | servis oyuncu/garson | kaçan');
console.log('-'.repeat(150));
for (const { kol, pol, garson, okeyOdak, r } of satirlar) {
  const bek = r.acilis.map((a, i) => a - (i ? r.acilis[i - 1] : 0)).filter(Number.isFinite);
  const enI = bek.indexOf(Math.max(...bek));
  const top = kol.fiyat.reduce((a, b) => a + b, 0) * (MUT === 'fiyat2' ? 2 : 1);
  const sure = Number.isFinite(r.bitis) ? r.bitis : UFUK;
  console.log(
    `${kol.ad.padEnd(11)} | ${pol.padEnd(5)} | ${(garson ? (okeyOdak ? 'okey' : 'var') : 'yok').padEnd(6)} | ${f0(top).padStart(9)} | ${(Number.isFinite(r.bitis) ? sa(r.bitis) : `bitmedi ${r.acilis.filter(Number.isFinite).length}/${SIRA.length}`).padEnd(11)} | ${`${dk1(bek[enI])} dk (${SIRA[enI]})`.padEnd(26)} | ${dk1(yuzdelik(bek, 0.5)).padStart(9)} | ${String(r.inis).padStart(4)} | ${dk1(r.kasaDoluSn).padStart(14)} | ${f0(r.tasan).padStart(7)} | ${f0(r.yol / (sure / 60)).padStart(9)} | ${`${r.servis} / ${r.garsonServis}`.padStart(20)} | ${r.kacan}`,
  );
}
for (const k of KOLLAR) console.log(`  ${k.ad}: ${k.not}`);
for (const p of POLITIKALAR) console.log(`  politika ${p}: ${POLITIKA_NOT[p]} (taban KARMA: ${POLITIKA_NOT.KARMA})`);
if (satirlar.some((s) => s.r.yedekPad)) console.log(`  not: araçta düşülen pad ${satirlar[0].r.yedekPad} (B'nin yeri/mantığı yok) — mantığı yok, yalnız parası alınır.`);

// ---- §B PAD FİYATLARI + AÇILIŞ DAKİKALARI
console.log('');
console.log('--- §B PAD × KOL — fiyat ₺ / açılış dakikası (politika KARMA, garsonsuz) ---');
const anaSatir = satirlar.filter((s) => s.pol === 'KARMA' && !s.garson);
console.log(`pad         | ${anaSatir.map((s) => s.kol.ad.padStart(16)).join(' | ')}`);
for (let i = 0; i < SIRA.length; i++) {
  console.log(`${SIRA[i].padEnd(11)} | ${anaSatir.map((s) => `${f0(s.kol.fiyat[i])} / ${dk1(s.r.acilis[i])}`.padStart(16)).join(' | ')}`);
}

// ---- §C ₺/dk EĞRİSİ (saat başına; Kat 1 payı / Kat 2 payı)
console.log('');
console.log('--- §C ₺/dk EĞRİSİ — saat başına ortalama: toplam (Kat 1 · Kat 2); son sütun bitişe kadarki yarım saat ---');
for (const { kol, pol, garson, okeyOdak, r } of satirlar) {
  const son = ((Number.isFinite(r.bitis) ? r.bitis : UFUK) % 3600) / 60 || 60; // son (yarım) saatin dakikası
  const h = r.saatlik.map((s, i) => {
    const m = i === r.saatlik.length - 1 ? son : 60;
    return `${f0((s.kat1 + s.kat2) / m)} (${f0(s.kat1 / m)}·${f0(s.kat2 / m)})`;
  });
  console.log(`${`${kol.ad} ${pol}${garson ? (okeyOdak ? ' garson+okey' : ' garson') : ''}`.padEnd(26)} | ${h.join(' | ')}`);
}

// ---- §D ÇEVRİMDIŞI — D-185: Kat 1 payı kasaya (kasa sınırı) + Kat 2 payı ≤ sıradaki Kat 2 pad'i × capNextPadFrac.
console.log('');
console.log(`--- §D ÇEVRİMDIŞI 1 sa (D-185) — Kat 1 → kasa (≤ ${f0(SINIR!.toNumber())} ₺) + Kat 2 payı ≤ sıradaki Kat 2 pad'i × ${C.offline.capNextPadFrac} · rateMult ${C.offline.rateMult} ---`);
console.log("ihlal = Kat 2 bitmemişken dönüşte art arda ≥ 2 Kat 2 pad'i alınabiliyor (kasa boş kapatıldı, dönüşte kasa da boşaltılır).");
console.log('Kapatırken cüzdan 0 (K2-4 Bulgu 5 tanımı).');
console.log('kol         | ihlal | ihlalli durumlar (o an açık pad sayısı) | ihlalde alınan pad (en çok)');
for (const s of anaSatir) {
  const fiyat = s.kol.fiyat;
  const ham = (oranDk: number) => Math.floor((oranDk / 60) * C.offline.rateMult * Math.min(3600, C.offline.baseCapHours * 3600));
  let ih0 = 0, enCok = 0;
  const y0: number[] = [];
  for (let i = 0; i < SIRA.length; i++) {
    const tavan = Math.floor(fiyat[i] * C.offline.capNextPadFrac);
    const gelir = Math.min(ham(kat2Oran(SIRA.slice(0, i))), tavan) + Math.min(ham(r1Ideal), SINIR!.toNumber());
    let k = gelir, n = 0;
    for (let j = i; j < SIRA.length && k >= fiyat[j]; j++) { k -= fiyat[j]; n++; }
    if (n >= 2) { ih0++; y0.push(i); enCok = Math.max(enCok, n); }
  }
  console.log(`${s.kol.ad.padEnd(11)} | ${`${ih0}/${SIRA.length}`.padStart(5)} | ${(y0.join(',') || '—').padEnd(39)} | ${enCok || '—'}`);
}

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
