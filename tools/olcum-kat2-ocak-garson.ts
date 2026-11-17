/**
 * olcum-kat2-ocak-garson.ts — KAT 2 SÜRESİ + OCAK/GARSON YÜKSELTMESİ ölçümü (yalnız ölçüm, D-084).
 * Kollar config'e YAZILMAZ; yükseltme etkisi araçta `Kat2Ayar` (demleme · ocakKuyruk · garson) değiştirilerek kurulur.
 *
 * Soru (kullanıcı 2026-11-17, "önerinle ilerleyelim"): Kat 2'nin bugünkü süresi ne (D-192'nin 4,9 sa'i D-198 kasa
 * kaldırma + G5 + D-195 Sv'den önceydi) ve Kat 1'deki OCAK + GARSON yükseltmesinin Kat 2 karşılığı ne getirir?
 * Kat 1 deseni (uyarlanır, D-195 kuralı): ocak seviyesi demlemeyi ×1,35 hızlandırır + kuyruğa +1 (`service.upgrade`,
 * `brew`) · garson hız 1 kademe + tepsi 2 kademe (`waiter`, karakter panelinden, anında). Kat 2'de mutfak seviyesi 1-6
 * (mangal görseli D-199) bugün zincirden türüyor; yükseltme gelince görsel ocak seviyesinden türer (Kat 1 `mutfakSeviyesi`).
 *
 * §A PLATO — bütün zincir açık, masalar Sv1 ve Sv5: GERÇEK coin/dk · okey/tavla servis % · ocak boşta (kuyruk dolu) %.
 *    Darboğazı gösterir: ocak mı, taşıma (oyuncu + garson) mı.
 * §B İLERLEME — Kat 2'ye ilk çıkış (hazır masa + ocak), cüzdan 0, Kat 1 parası doğrudan cüzdana (D-198 G1, kasa yok):
 *    zincir (config D-192) → Sv (config D-195, tek hedef) + kolun yükseltmeleri. Bot "en ucuz açık hedef önce".
 *    Yükseltme açılış noktası zincirdedir (Kat 1'in "2. masadan sonra" deseni); fiyat = açan pad'in fiyatı × f.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-ocak-garson.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-ocak-garson.ts > docs/olcum-kat2-ocak-garson.txt
 * Mutasyon: OG_MUT=etkisiz (yükseltme satın alınır ama ayara işlenmez → §A/§B kolları tabana eşitlenir, varyant
 * damgası kırılır) · OG_MUT=kat1yok (Kat 1 parası akmaz → §B süreleri uzar, "Kat 1 payı" damgası kırılır).
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, korunumDamgasi, seedRandom, takilmaDamgasi, varyantDamgasi, yuzdelik } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { AGIZ, KAT2_MASALAR, KAT2_OCAK_YUK_YER, KAT2_SV_MAX, OCAKLAR, OKEY_ERISIM, TAVLA_ERISIM, VARIS, kat2AcikAlan, kat2Adim } from '../src/game/kat';
import { kat2EtkinAyar, kat2MasaYeri, kat2PadYeri, kat2SvCanliTetik, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2YukAyar, type Kat2YukSeviye } from '../src/game/kat2Dongu';
import { BAND, LAYOUT } from '../src/game/layout';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

kipBandi();

const MUT = process.env.OG_MUT ?? '';
const DT = 0.1;
const PLATO_ISINMA = kisaDeger(5 * 60, 2 * 60);
const PLATO_SURE = kisaDeger(30 * 60, 6 * 60);
const UFUK = kisaDeger(14 * 3600, 2 * 3600);
const IZ_ISINMA = kisaDeger(5 * 60, 3 * 60);
const IZ_SURE = kisaDeger(60 * 60, 10 * 60);
const DOLUM_SN = 3.5; // pad kuralı (D-192)

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const HAZIR: readonly string[] = C.kat2.hazir;
const ZINCIR = CFG.padler;
const TUM: readonly string[] = [...HAZIR, ...ZINCIR.map((p) => p.id)];
const MASALAR = KAT2_MASALAR.filter((m) => TUM.includes(m.id));
const SV_SAYI = MASALAR.length * (KAT2_SV_MAX - 1);
const GARSON0 = CFG.garson!;
const KAT1_OCAK = C.service.upgrade.outputMult; // 1,35
const KAT1_KUYRUK = C.brew.queuePerLevel; // +1

// ---------------------------------------------------------------------------------------------
// YÜKSELTMELER — Kat 1'in karşılığı. Ocak: mutfak seviyesi 1→6 (5 alım, mangal görseli zaten 6 basamak).
// Garson: hız 3 → 4 (Kat 1 1,5→2,0 = ×1,33) · tepsi 2 → 3 → 4 (Kat 1 eğrisi) · opsiyonel 2. garson (D-189 adayı).
// ---------------------------------------------------------------------------------------------
type Tur = 'ocak' | 'ghiz' | 'gtepsi' | 'gsayi';
interface Yuk {
  tur: Tur;
  acan: string; // açılış noktası: bu zincir pad'i bitince görünür
  fiyat?: number; // verilirse kolun f'si yerine bu (CONFIG kolu: config'in kendi fiyatı)
}
const OCAK_YUK: Yuk[] = ['k2okey4', 'k2cezve2', 'k2lavabo', 'k2garson', 'k2tavla6'].map((acan) => ({ tur: 'ocak', acan }));
const GARSON_YUK: Yuk[] = [
  { tur: 'ghiz', acan: 'k2tavla2' },
  { tur: 'gtepsi', acan: 'k2tavla5' },
  { tur: 'gtepsi', acan: 'k2tavla10' },
];
const GARSON2_YUK: Yuk = { tur: 'gsayi', acan: 'k2tavla8' };
const acanFiyat = (id: string) => ZINCIR.find((p) => p.id === id)!.cost;

interface Seviye {
  ocak: number; // 1..6
  ghiz: number; // 0..1
  gtepsi: number; // 0..2
  gsayi: number; // 0..1
}
const S0: Seviye = { ocak: 1, ghiz: 0, gtepsi: 0, gsayi: 0 };
const GHIZ = [GARSON0.hiz, 4];

/** Araç seviyesi → oyunun alım sayıları (`Kat2Kayit.yuk`). */
const oyunSev = (s: Seviye): Kat2YukSeviye => ({ ocak: s.ocak - 1, garsonHiz: s.ghiz, garsonTepsi: s.gtepsi, garsonSayi: s.gsayi });
/** Config'in yükseltme tanımı yok sayılır: kollar alımı ARAÇTA yapar (CONFIG kolu hariç — o oyunun kendi tetiğini kullanır). */
const { yukseltme: _cfgYuk, ...CFG_YUKSUZ } = CFG;

function ayarOf(s: Seviye, herMasa = false): Kat2Ayar {
  if (MUT === 'etkisiz') return { ...CFG_YUKSUZ, garson: { ...GARSON0, herMasa } };
  return {
    ...CFG_YUKSUZ,
    demleme: CFG.demleme / KAT1_OCAK ** (s.ocak - 1),
    ocakKuyruk: CFG.ocakKuyruk + KAT1_KUYRUK * (s.ocak - 1),
    garson: { ...GARSON0, hiz: GHIZ[s.ghiz], tepsi: GARSON0.tepsi + s.gtepsi, sayi: (GARSON0.sayi ?? 1) + s.gsayi, herMasa },
  };
}

interface Kol {
  ad: string;
  not: string;
  yuk: Yuk[];
  f: number; // fiyat = açan pad × f
  herMasa?: boolean; // garson Kat 1 gibi her masaya (okey dahil) — kullanıcı 2026-11-17
  kod?: boolean; // CONFIG kolu: etki `kat2EtkinAyar`, ocak tetiği `kat2Tick`in kendisi (D-200 final)
}

/** Config'in yükseltme hatları araç biçiminde (CONFIG kolu). */
const CFG_YUK = CFG.yukseltme!;
const configYuk = (u: Kat2YukAyar): Yuk[] => [
  ...u.ocak.acan.map((acan, i) => ({ tur: 'ocak' as Tur, acan, fiyat: u.ocak.fiyat[i] })),
  ...u.garsonHiz.acan.map((acan, i) => ({ tur: 'ghiz' as Tur, acan, fiyat: u.garsonHiz.fiyat[i] })),
  ...u.garsonTepsi.acan.map((acan, i) => ({ tur: 'gtepsi' as Tur, acan, fiyat: u.garsonTepsi.fiyat[i] })),
  ...u.garsonSayi.acan.map((acan, i) => ({ tur: 'gsayi' as Tur, acan, fiyat: u.garsonSayi.fiyat[i] })),
];
const KOLLAR: Kol[] = [
  { ad: 'TABAN', not: 'bugünkü config: yükseltme yok (mangal yalnız görsel büyür, garson 3/2/1)', yuk: [], f: 0 },
  { ad: 'O-1', not: 'ocak 5 kademe (×1,35 demleme · +1 kuyruk, Kat 1 gibi), fiyat = açan pad × 1', yuk: OCAK_YUK, f: 1 },
  { ad: 'O-½', not: 'ocak 5 kademe, fiyat = açan pad × 0,5', yuk: OCAK_YUK, f: 0.5 },
  { ad: 'G-1', not: 'garson hız 3→4 + tepsi 2→3→4 (Kat 1 gibi 3 alım), fiyat × 1', yuk: GARSON_YUK, f: 1 },
  { ad: 'G2-1', not: 'G-1 + 2. garson (D-189 adayı), fiyat × 1', yuk: [...GARSON_YUK, GARSON2_YUK], f: 1 },
  { ad: 'OG-1', not: 'ocak 5 + garson 3, fiyat × 1', yuk: [...OCAK_YUK, ...GARSON_YUK], f: 1 },
  { ad: 'OG-½', not: 'ocak 5 + garson 3, fiyat × 0,5', yuk: [...OCAK_YUK, ...GARSON_YUK], f: 0.5 },
  { ad: 'OG2-1', not: 'ocak 5 + garson 3 + 2. garson, fiyat × 1', yuk: [...OCAK_YUK, ...GARSON_YUK, GARSON2_YUK], f: 1 },
  // KAT 1 MANTIĞI (kullanıcı 2026-11-17): garson HER masaya kahve götürür.
  { ad: 'H', not: 'garson her masaya (Kat 1 gibi), yükseltme yok', yuk: [], f: 0, herMasa: true },
  { ad: 'HOG-½', not: 'garson her masaya + ocak 5 + garson 3, fiyat × 0,5', yuk: [...OCAK_YUK, ...GARSON_YUK], f: 0.5, herMasa: true },
  { ad: 'HOG-1', not: 'garson her masaya + ocak 5 + garson 3, fiyat × 1', yuk: [...OCAK_YUK, ...GARSON_YUK], f: 1, herMasa: true },
  { ad: 'HOG2-½', not: 'garson her masaya + ocak 5 + garson 3 + 2. garson, fiyat × 0,5', yuk: [...OCAK_YUK, ...GARSON_YUK, GARSON2_YUK], f: 0.5, herMasa: true },
  { ad: 'HOG2-1', not: 'garson her masaya + ocak 5 + garson 3 + 2. garson, fiyat × 1', yuk: [...OCAK_YUK, ...GARSON_YUK, GARSON2_YUK], f: 1, herMasa: true },
  { ad: 'CONFIG', not: 'D-200 config kendisi (oyun mantığı: kat2EtkinAyar + ocak tetiği kat2Tick) — FİNAL', yuk: configYuk(CFG_YUK), f: 0, herMasa: !!GARSON0.herMasa, kod: true },
];
const yukFiyat = (y: Yuk, f: number) => y.fiyat ?? Math.round(acanFiyat(y.acan) * f);

// ---------------------------------------------------------------------------------------------
// KAT 1 İZİ (olcum-kat2-masasv ile aynı) — D-198: Kat 2'deyken Kat 1 parası doğrudan cüzdana.
// ---------------------------------------------------------------------------------------------
function kat1Izi(): { iz: Float64Array; r1Dk: number } {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: [] }, kat2Dunya: yeniKat2Dunya([], CFG) });
  g().setKeyboardInput(0, 0);
  const n = Math.round(IZ_SURE / DT);
  const iz = new Float64Array(n);
  let once = new Map<number, number>();
  const nIsinma = Math.round(IZ_ISINMA / DT);
  for (let i = 0; i < nIsinma + n; i++) {
    g().tick(DT);
    useGame.setState({ kasa: D(0) } as never);
    const simdi = new Map(g().coins.map((c) => [c.id, c.value]));
    let giden = 0;
    for (const [id, v] of once) if (!simdi.has(id)) giden += v;
    once = simdi;
    if (i >= nIsinma) iz[i - nIsinma] = giden;
  }
  return { iz, r1Dk: (iz.reduce((a, b) => a + b, 0) / IZ_SURE) * 60 };
}

// ---------------------------------------------------------------------------------------------
// BOT YOLU (olcum-kat2-akis ile aynı: yalnız merdiven kovası koridoru)
// ---------------------------------------------------------------------------------------------
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
void AGIZ;
void LAYOUT;
const kovada = (z: number) => z < BAND.front;
function yol(x: number, z: number, h: readonly [number, number]): readonly [number, number] {
  const ik = kovada(z);
  const hk = kovada(h[1]);
  if (ik && hk) return Math.abs(z - h[1]) < 0.3 ? h : Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, h[1]];
  if (ik) return Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, KAPI_Z];
  if (hk) return Math.abs(x - KX) < 0.3 && z <= KAPI_Z + 0.3 ? [KX, h[1]] : [KX, KAPI_Z];
  return h;
}
/** Ocak yükseltme noktası — oyunun yeri (D-200). */
const OCAK_YUK_YER = KAT2_OCAK_YUK_YER;

// ---------------------------------------------------------------------------------------------
// KOŞU
// ---------------------------------------------------------------------------------------------
interface Olcu {
  sure: number;
  para: number; // Kat 2 düşen (masa + lavabo)
  servis: number;
  kacan: number;
  tavlaServis: number;
  tavlaKacan: number;
  garson: number;
  ocakDolu: number; // ocak-sn: kuyruk dolu (arz fazlası)
  ocakBos: number; // ocak-sn: hazır 0 (talep fazlası değil, yetişemiyor)
  ocakSn: number;
  botBos: number;
  yol: number;
  enUzunItme: number;
}
const yeniOlcu = (): Olcu => ({ sure: 0, para: 0, servis: 0, kacan: 0, tavlaServis: 0, tavlaKacan: 0, garson: 0, ocakDolu: 0, ocakBos: 0, ocakSn: 0, botBos: 0, yol: 0, enUzunItme: 0 });

interface Kosu {
  olcu: Olcu;
  zincirBitis: number;
  svBitis: number;
  yukBitis: number;
  bitis: number;
  alimlar: { t: number; ne: string }[];
  saatlik: number[];
  kat1: number;
  iz: string;
}

function kos(kol: Kol, o: { plato?: { sv: number; sev: Seviye; herMasa?: boolean }; iz1?: Float64Array; sure: number; olcBas: number }): Kosu {
  const plato = o.plato;
  let padsDone: string[] = plato ? [...TUM] : [...HAZIR];
  let sev: Seviye = plato ? { ...plato.sev } : { ...S0 };
  const herMasa = plato ? !!plato.herMasa : !!kol.herMasa;
  const kod = !!kol.kod && MUT !== 'etkisiz';
  const ayarHesap = () => (kod ? kat2EtkinAyar(CFG, oyunSev(sev)) : ayarOf(sev, herMasa));
  let ayar = ayarHesap();
  let d: Kat2Dunya = yeniKat2Dunya(padsDone, ayar);
  const masaSv: Record<string, number> = plato ? Object.fromEntries(MASALAR.map((m) => [m.id, plato.sv])) : {};
  const yukKalan = plato ? [] : kol.yuk.map((y) => ({ ...y, fiyat: yukFiyat(y, kol.f) }));
  let yukDolum = 0;
  let cuzdan = 0;
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let p1 = 0;
  let itme = 0;
  const olcu = yeniOlcu();
  const alimlar: Kosu['alimlar'] = [];
  const saatlik: number[] = [];
  const izT = izOlustur();
  let kat2Kazanc = 0, harcama = 0, yukHarcama = 0, kat1 = 0, dusenTop = 0;
  let zincirBitis = plato ? 0 : NaN, svBitis = NaN, yukBitis = kol.yuk.length ? NaN : 0;
  let svAlim = 0;
  const yukAlindi = (y: (typeof yukKalan)[number], t: number) => {
    sev = { ...sev, [y.tur]: sev[y.tur] + 1 };
    ayar = ayarHesap();
    yukKalan.splice(yukKalan.indexOf(y), 1);
    alimlar.push({ t, ne: `${y.tur}${y.tur === 'ocak' ? sev.ocak : ''}` });
    if (!yukKalan.length) yukBitis = t;
  };
  let t = 0;
  for (; t < o.sure; t += DT) {
    const olc = t >= o.olcBas;
    const h = Math.floor(t / 3600);
    saatlik[h] ??= 0;
    if (o.iz1 && MUT !== 'kat1yok') {
      const akis = o.iz1[p1 % o.iz1.length];
      p1++;
      cuzdan += akis;
      kat1 += akis;
      saatlik[h] += akis;
    }
    const zincirBitti = ZINCIR.every((p) => padsDone.includes(p.id));
    if (!plato && zincirBitti && Number.isNaN(zincirBitis)) zincirBitis = t;
    // Açık yükseltmeler (garson: panelden ANINDA, Kat 1 gibi · ocak: mekânsal, noktada dolar).
    const acik = yukKalan.filter((y) => padsDone.includes(y.acan));
    // Hedef adayları: sıradaki zincir pad'i · Sv (zincir bitince; tek hedef) · en ucuz açık yükseltme.
    const sp = ZINCIR.find((p) => !padsDone.includes(p.id));
    const svT = !plato && zincirBitti ? kat2SvCanliTetik(ayar, padsDone, masaSv)[0] : undefined;
    type Aday = { kalan: number; yer: readonly [number, number] | null; yuk?: (typeof yukKalan)[number] };
    const adaylar: Aday[] = [];
    if (sp && !plato) adaylar.push({ kalan: sp.cost - (d.padFill[sp.id] ?? 0), yer: kat2PadYeri(sp.id) });
    if (svT) adaylar.push({ kalan: svT.fiyat - (d.padFill[svT.id] ?? 0), yer: [svT.x, svT.z] });
    const yk = acik.length ? acik.reduce((a, b) => (a.fiyat <= b.fiyat ? a : b)) : undefined;
    if (yk) adaylar.push({ kalan: yk.fiyat - (yk.tur === 'ocak' ? (kod ? d.padFill['k2ocakYuk'] ?? 0 : yukDolum) : 0), yer: yk.tur === 'ocak' ? OCAK_YUK_YER : null, yuk: yk });
    const ucuz = adaylar.length ? adaylar.reduce((a, b) => (a.kalan <= b.kalan ? a : b)) : null;
    // Panel alımı (garson): para yetince anında.
    if (ucuz?.yuk && ucuz.yer === null && cuzdan >= ucuz.kalan) {
      cuzdan -= ucuz.kalan;
      yukHarcama += ucuz.kalan;
      yukAlindi(ucuz.yuk, t);
      continue;
    }

    let hedef: readonly [number, number];
    let bos = false;
    if (ucuz && ucuz.yer && cuzdan >= ucuz.kalan - 1e-9) hedef = ucuz.yer;
    else if (d.paralar.length) hedef = d.paralar.map((p) => [p.x, p.z] as [number, number]).reduce((a, b) => (uz([x, z], a) <= uz([x, z], b) ? a : b));
    else {
      const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
      const acikOcak = OCAKLAR.filter((oc) => padsDone.includes(oc.id));
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
      } else if (d.tepsi < TEPSI && acikOcak.length) {
        const hazir = acikOcak.filter((oc) => d.ocaklar[OCAKLAR.indexOf(oc)].hazir > 0);
        hedef = (hazir.length ? hazir : acikOcak).reduce((a, b) => (uz([x, z], a.al) <= uz([x, z], b.al) ? a : b)).al;
      } else {
        hedef = [x, z];
        bos = true;
      }
    }
    if (olc && bos) olcu.botBos += DT;
    const ara = yol(x, z, hedef);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const kk = Math.min(1, (HIZ * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * kk, dz * kk, kat2AcikAlan(padsDone));
      const adim = Math.hypot(nx - x, nz - z);
      olcu.yol += adim;
      itme = adim < 1e-4 ? itme + DT : 0;
      olcu.enUzunItme = Math.max(olcu.enUzunItme, itme);
      x = nx;
      z = nz;
    }
    // Ocak yükseltme noktası: durunca pad hızıyla dolar.
    if (!kod && yk && yk.tur === 'ocak' && durdu && ucuz?.yuk === yk && uz([x, z], OCAK_YUK_YER) < 0.5) {
      const amt = Math.min((yk.fiyat / DOLUM_SN) * DT, cuzdan, yk.fiyat - yukDolum);
      yukDolum += amt;
      cuzdan -= amt;
      yukHarcama += amt;
      if (yukDolum >= yk.fiyat - 1e-9) {
        yukDolum = 0;
        yukAlindi(yk, t);
      }
    }

    const r = kat2Tick(d, { x, z, durdu, cuzdan, padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS, masaSv, svCanli: !plato && zincirBitti, yuk: kod ? oyunSev(sev) : undefined }, DT, ayar);
    d = r.dunya;
    for (const id of r.olay.svAtlayan) {
      masaSv[id] = Math.min(KAT2_SV_MAX, (masaSv[id] ?? 1) + 1);
      svAlim++;
      alimlar.push({ t, ne: 'sv' });
      if (svAlim >= SV_SAYI) svBitis = t;
    }
    if (r.padsDone !== padsDone) padsDone = r.padsDone;
    if (r.olay.padBitti) alimlar.push({ t, ne: 'pad' });
    // CONFIG: ocak tetiğini oyunun kendisi doldurdu (parası r.harcama'da).
    if (r.olay.ocakYuk) {
      const oy = yukKalan.filter((y) => y.tur === 'ocak' && padsDone.includes(y.acan)).reduce((a, b) => (a.fiyat <= b.fiyat ? a : b));
      yukAlindi(oy, t);
    }
    const dusen = r.olay.dusen.reduce((a, b) => a + b, 0) + r.olay.lavabo;
    dusenTop += dusen;
    cuzdan += r.kazanc - r.harcama;
    harcama += r.harcama;
    kat2Kazanc += r.kazanc;
    saatlik[h] += r.kazanc;
    if (olc) {
      olcu.para += dusen;
      olcu.servis += r.olay.servis;
      olcu.kacan += r.olay.kacan;
      olcu.tavlaServis += r.olay.tavlaServis;
      olcu.tavlaKacan += r.olay.tavlaKacan;
      olcu.garson += r.olay.garsonServis;
      d.ocaklar.forEach((oc, k) => {
        if (!padsDone.includes(OCAKLAR[k].id)) return;
        olcu.ocakSn += DT;
        if (oc.hazir >= ayar.ocakKuyruk) olcu.ocakDolu += DT;
        else if (oc.hazir === 0) olcu.ocakBos += DT;
      });
    }
    if (Math.round(t / DT) % 50 === 0) izT.ekle(cuzdan, padsDone.length, svAlim, x, z, d.tepsi);
    if (!plato && zincirBitti && svAlim >= SV_SAYI && !yukKalan.length) break;
  }
  olcu.sure = Math.max(0, t - o.olcBas);
  const yerde = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`Kat 2 coin ${kol.ad}`, Math.round(dusenTop - kat2Kazanc - yerde));
  korunumDamgasi(`cüzdan coin ${kol.ad}`, Math.round(kat2Kazanc + kat1 - harcama - yukHarcama - cuzdan));
  const bitis = Math.max(zincirBitis, svBitis, yukBitis);
  return { olcu, zincirBitis, svBitis, yukBitis, bitis, alimlar, saatlik, kat1, iz: izT.deger };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');
const yuzde = (a: number, b: number) => (b > 0 ? `%${((100 * a) / b).toFixed(0)}` : '—');

const t0 = Date.now();
console.log('=== KAT 2 SÜRESİ + OCAK/GARSON YÜKSELTMESİ (Kat 1 karşılığı) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · plato ${PLATO_ISINMA / 60}+${PLATO_SURE / 60} dk · ilerleme ufku ${UFUK / 3600} sa${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Config: zincir ${ZINCIR.length} pad (D-192) + hazır ${HAZIR.join('/')} · ${MASALAR.length} masa · ${SV_SAYI} Sv alımı (D-195) · garson ${GARSON0.hiz}/${GARSON0.tepsi}/${GARSON0.sayi} · demleme ${CFG.demleme} sn · kuyruk ${CFG.ocakKuyruk}`);
console.log(`Bot: hız ${HIZ} · tepsi ${TEPSI} · mıknatıs ${MIKNATIS} (karakter son kademe) · "en ucuz açık hedef önce" · Kat 1 parası doğrudan cüzdana (D-198, kasa yok).`);
console.log(`Ocak kademesi: demleme ÷${KAT1_OCAK} · kuyruk +${KAT1_KUYRUK} (Kat 1 service.upgrade/brew) · açılış ${OCAK_YUK.map((y) => y.acan).join(' → ')}`);
console.log(`Garson: hız ${GHIZ.join('→')} (${GARSON_YUK[0].acan}) · tepsi ${GARSON0.tepsi}→${GARSON0.tepsi + 1}→${GARSON0.tepsi + 2} (${GARSON_YUK[1].acan}, ${GARSON_YUK[2].acan}) · 2. garson (${GARSON2_YUK.acan})`);

const { iz: IZ1, r1Dk } = kat1Izi();
console.log(`Kat 1 izi: ${r1Dk.toFixed(1)} coin/dk (bitmiş Kat 1, oyuncusuz)`);
damga('Kat 1 izi akıyor', r1Dk > 10, `${r1Dk.toFixed(1)}`);

// ---- BEKÇİ: araç kuralı = oyun kuralı · config = karar D-200 (HOG2-½)
{
  const SEVLER: Seviye[] = [S0, { ocak: 3, ghiz: 1, gtepsi: 1, gsayi: 0 }, { ocak: 6, ghiz: 1, gtepsi: 2, gsayi: 1 }];
  const ayni = SEVLER.every((sv) => {
    const a = ayarOf(sv, true);
    const o = kat2EtkinAyar(CFG, oyunSev(sv));
    return Math.abs(a.demleme - o.demleme) < 1e-9 && a.ocakKuyruk === o.ocakKuyruk && JSON.stringify(a.garson) === JSON.stringify(o.garson);
  });
  damga('araç ayarı = oyunun kat2EtkinAyar sonucu', MUT === 'etkisiz' || ayni);
  const kol = KOLLAR.find((k) => k.ad === 'HOG2-½')!;
  const hat = (tur: Tur) => kol.yuk.filter((y) => y.tur === tur);
  const beklenen: Kat2YukAyar = {
    ocak: { acan: hat('ocak').map((y) => y.acan), fiyat: hat('ocak').map((y) => yukFiyat(y, kol.f)), demlemeCarpan: KAT1_OCAK, kuyrukArti: KAT1_KUYRUK },
    garsonHiz: { acan: hat('ghiz').map((y) => y.acan), fiyat: hat('ghiz').map((y) => yukFiyat(y, kol.f)), deger: [GHIZ[1]] },
    garsonTepsi: { acan: hat('gtepsi').map((y) => y.acan), fiyat: hat('gtepsi').map((y) => yukFiyat(y, kol.f)) },
    garsonSayi: { acan: hat('gsayi').map((y) => y.acan), fiyat: hat('gsayi').map((y) => yukFiyat(y, kol.f)) },
  };
  damga('config kat2.yukseltme = karar D-200 (HOG2-½)', JSON.stringify(CFG_YUK) === JSON.stringify(beklenen) && GARSON0.herMasa === true, JSON.stringify(CFG_YUK));
}

// ---- §A PLATO
const MAKS: Seviye = { ocak: 6, ghiz: 1, gtepsi: 2, gsayi: 0 };
const PLATOLAR: { ad: string; sev: Seviye; herMasa?: boolean }[] = [
  { ad: 'taban', sev: S0 },
  { ad: 'ocak6', sev: { ...S0, ocak: 6 } },
  { ad: 'garson', sev: { ...MAKS, ocak: 1 } },
  { ad: 'garson+2', sev: { ...MAKS, ocak: 1, gsayi: 1 } },
  { ad: 'ocak6+garson', sev: MAKS },
  { ad: 'ocak6+garson+2', sev: { ...MAKS, gsayi: 1 } },
  { ad: 'H taban', sev: S0, herMasa: true },
  { ad: 'H garson', sev: { ...MAKS, ocak: 1 }, herMasa: true },
  { ad: 'H ocak6+garson', sev: MAKS, herMasa: true },
  { ad: 'H garson+2', sev: { ...MAKS, ocak: 1, gsayi: 1 }, herMasa: true },
  { ad: 'H ocak6+garson+2', sev: { ...MAKS, gsayi: 1 }, herMasa: true },
];
const BOS_KOL: Kol = { ad: 'plato', not: '', yuk: [], f: 0 };
console.log('');
console.log('--- §A PLATO — bütün zincir açık; GERÇEK Kat 2 coin/dk (masa + lavabo) · servis % · ocak (kuyruk dolu / boş) · bot boş ---');
console.log('kurulum          | Sv | coin/dk | servis % | okey % | tavla % | garson payı | ocak dolu % | ocak boş % | bot boş %');
const platoIz = new Map<string, string>();
for (const sv of [1, KAT2_SV_MAX]) {
  for (const p of PLATOLAR) {
    if (KISA && !['taban', 'ocak6', 'ocak6+garson', 'H taban', 'H ocak6+garson'].includes(p.ad)) continue;
    const r = kos({ ...BOS_KOL, ad: `plato ${p.ad} Sv${sv}` }, { plato: { sv, sev: p.sev, herMasa: p.herMasa }, sure: PLATO_ISINMA + PLATO_SURE, olcBas: PLATO_ISINMA });
    const o = r.olcu;
    const dk = o.sure / 60;
    botDamgasi(`plato ${p.ad} Sv${sv}`, o.yol, dk, 30);
    takilmaDamgasi(`plato ${p.ad} Sv${sv}`, o.enUzunItme);
    platoIz.set(`${p.ad}/${sv}`, r.iz);
    const okeyS = o.servis - o.tavlaServis;
    const okeyK = o.kacan - o.tavlaKacan;
    console.log(
      `${p.ad.padEnd(16)} | ${sv}  | ${f0(o.para / dk).padStart(7)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${yuzde(okeyS, okeyS + okeyK).padStart(6)} | ${yuzde(o.tavlaServis, o.tavlaServis + o.tavlaKacan).padStart(7)} | ${yuzde(o.garson, o.servis).padStart(11)} | ${yuzde(o.ocakDolu, o.ocakSn).padStart(11)} | ${yuzde(o.ocakBos, o.ocakSn).padStart(10)} | ${yuzde(o.botBos, o.sure).padStart(9)}`,
    );
  }
}
varyantDamgasi('plato ocak6 Sv1', platoIz.get('taban/1')!, platoIz.get('ocak6/1')!);
varyantDamgasi('plato ocak6+garson Sv5', platoIz.get('ocak6/5')!, platoIz.get('ocak6+garson/5')!);
varyantDamgasi('plato H (garson her masaya) Sv1', platoIz.get('taban/1')!, platoIz.get('H taban/1')!);

// ---- §B İLERLEME
const ILERLEME = KISA ? KOLLAR.filter((k) => ['TABAN', 'HOG2-½', 'CONFIG'].includes(k.ad)) : KOLLAR;
const sonuc: { k: Kol; r: Kosu }[] = [];
for (const k of ILERLEME) {
  const r = kos(k, { iz1: IZ1, sure: UFUK, olcBas: 0 });
  const sure = Number.isFinite(r.bitis) ? r.bitis : UFUK;
  botDamgasi(`ilerleme ${k.ad}`, r.olcu.yol, sure / 60, 30);
  takilmaDamgasi(`ilerleme ${k.ad}`, r.olcu.enUzunItme);
  if (k.yuk.length) damga(`ilerleme ${k.ad} yükseltme aldı`, r.alimlar.some((a) => a.ne !== 'sv' && a.ne !== 'pad'));
  sonuc.push({ k, r });
}
for (const s of sonuc.slice(1)) varyantDamgasi(`ilerleme ${s.k.ad}`, sonuc[0].r.iz, s.r.iz);

console.log('');
console.log(`--- §B İLERLEME — ilk çıkıştan: zincir ${ZINCIR.length} pad → ${SV_SAYI} Sv + kolun yükseltmeleri (Kat 1 ${f0(r1Dk)} coin/dk doğrudan cüzdana) ---`);
console.log('kol    | yükseltme toplam | zincir biter | Sv biter  | yükseltme biter | KAT 2 BİTER | en uzun bekleyiş dk | medyan dk | servis % | tavla % | son saat Kat 2 coin/dk');
console.log('-'.repeat(160));
for (const { k, r } of sonuc) {
  const top = k.yuk.reduce((a, y) => a + yukFiyat(y, k.f), 0);
  // Bekleyiş: zincir pad'i + Sv + yükseltme alımları arası (hepsi satın alma; ilk çıkıştan).
  const ts = [...r.alimlar.map((a) => a.t)].sort((a, b) => a - b);
  const bek = ts.map((v, i) => v - (i ? ts[i - 1] : 0));
  const o = r.olcu;
  const son = r.saatlik.length ? r.saatlik.length - 1 : 0;
  const sonDk = ((Number.isFinite(r.bitis) ? r.bitis : UFUK) - son * 3600) / 60 || 60;
  const sonKat2 = (r.saatlik[son] - r1Dk * sonDk) / sonDk;
  console.log(
    `${k.ad.padEnd(7)}| ${f0(top).padStart(16)} | ${sa(r.zincirBitis).padStart(12)} | ${sa(r.svBitis).padStart(9)} | ${(k.yuk.length ? sa(r.yukBitis) : '—').padStart(15)} | ${sa(r.bitis).padStart(11)} | ${f1(Math.max(...bek, 0) / 60).padStart(19)} | ${f1(yuzdelik(bek, 0.5) / 60).padStart(9)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${yuzde(o.tavlaServis, o.tavlaServis + o.tavlaKacan).padStart(7)} | ${f0(sonKat2).padStart(10)}`,
  );
}
console.log('');
console.log('--- §B2 yükseltme alım dakikaları ---');
for (const { k, r } of sonuc) {
  if (!k.yuk.length) continue;
  console.log(`${k.ad.padEnd(7)}| ${r.alimlar.filter((a) => a.ne !== 'sv' && a.ne !== 'pad').map((a) => `${a.ne} ${f0(a.t / 60)}`).join(' · ')}`);
}
console.log('');
console.log('--- §B3 saat başına toplam gelir (Kat 1 + Kat 2) coin/dk ---');
for (const { k, r } of sonuc) console.log(`${k.ad.padEnd(7)}| ${r.saatlik.map((s, i) => f0(s / ((i < r.saatlik.length - 1 ? 3600 : ((Number.isFinite(r.bitis) ? r.bitis : UFUK) - i * 3600) || 3600) / 60))).join(' · ')}`);
damga('Kat 1 parası cüzdana aktı (§B)', sonuc.every((s) => s.r.kat1 > 0), sonuc.map((s) => f0(s.r.kat1)).join('/'));

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
