/**
 * BEKÇİ — tarama 2026-11-18 · W1 (kayıt + seviye ekranı). Rapor: `docs/tarama-2026-11-18/duzeltme-W1.md`.
 * #1 Kat 2'siz (1.0.7) daha ileri bulut/yerel kayıt Kat 2'yi silmez · #2 Kat 2 kısmi dolum kayda gider,
 * fiyata kelepçeli döner · #4 Kat 2'de yerdeki para kayıtta cüzdandadır, çift sayılmaz · #3 kaydet→yükle
 * Kat 2 görev hattını değiştirmez · #5 sürümü bozuk kayıt sessizce sıfırlanmaz · reklam #3 tick dışı XP
 * seviye ekranını bir kez açar.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { economyConfig as C, levelProgress, xpForLevel } from '../src/config/economy.config';
import { kayitVerisi, useGame } from '../src/game/store';
import {
  defaultSave, kayitCoz, kayitDogrula, kayitMetni, kayitSorunu, karantinadakiKayit, loadSave, type SaveData,
} from '../src/game/save';
import { kalicilikHazirla } from '../src/game/kalicilik';
import { bulutBaslat, bulutlaBirlestir, sahteBulut, type BulutKancasi } from '../src/game/bulut';
import { kat2Gorevleri } from '../src/game/kat2Gorev';
import { kat2SiradakiPad, kat2SvTetikleri, yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { VARIS } from '../src/game/kat';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

const KEY = 'kiraathane.save';
const A = C.kat2 as unknown as Kat2Ayar;
const ZINCIR = A.padler.map((p) => p.id);
const HAT = kat2Gorevleri(C.kat2Gorevler, A);
const kadar = (id: string) => [...C.kat2.hazir, ...ZINCIR.slice(0, ZINCIR.indexOf(id) + 1)];
const esik = (lv: number) => Array.from({ length: lv - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);
let mem: Record<string, string>;

beforeEach(async () => {
  mem = {};
  (globalThis as Record<string, unknown>).localStorage = {
    get length() { return Object.keys(mem).length; },
    key: (i: number) => Object.keys(mem)[i] ?? null,
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  await kalicilikHazirla(null);
  useGame.getState().hardReset();
});

/** Kat 2 açık, `pad`a kadar zincir alınmış, görev hattı `gorev`de. */
function kat2Kur(pad: string, gorev: { idx: number; sayac: Record<string, number> }) {
  const k = { acik: true, padsDone: kadar(pad), masaSv: {}, gorev, yuk: {} };
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: k, kat2Dunya: yeniKat2Dunya(k.padsDone, A) });
}

/** 1.0.7'nin yazdığı kayıt: `kat`/`kat2`/`kasa`/`kasaOlcum` alanları YOK. */
function eskiSurumMetni(d: SaveData): string {
  const { kat: _k, kat2: _k2, kasa: _ks, kasaOlcum: _ko, ...eski } = d;
  return kayitMetni(eski as SaveData, 1);
}

describe('#1 Kat 2 kat bazında birleşir', () => {
  it('Kat 2\'siz DAHA İLERİ bulut kaydı yüklenir ama yereldeki Kat 2 silinmez', async () => {
    const gi = HAT.findIndex((g) => g.id === 'k2_garson2');
    kat2Kur('k2okey4', { idx: gi, sayac: {} });
    useGame.setState({ lifetime: D(1000) });
    useGame.getState().saveNow();
    const bulut = sahteBulut({ veri: eskiSurumMetni({ ...kayitVerisi(useGame.getState()), lifetime: '900000', xp: 5 }) });
    const kanca: BulutKancasi = { yerel: () => kayitVerisi(useGame.getState()), yukle: (d) => useGame.getState().bulutKaydiYukle(d) };
    await bulutBaslat(kanca, bulut);
    const s = useGame.getState();
    expect(s.lifetime.toString()).toBe('900000');
    expect(s.kat2.acik).toBe(true);
    expect(s.kat2.padsDone).toEqual(kadar('k2okey4'));
    expect(s.kat2.gorev?.idx).toBe(gi);
    expect(s.kat).toBe(2);
  });

  it('bulutun Kat 2\'si İLERİDEYSE bulutunki gelir', () => {
    const yerel = { ...defaultSave(), kat2: { acik: true, padsDone: kadar('k2okey1'), masaSv: {}, gorev: { idx: 1, sayac: {} }, yuk: {} } };
    const ileri = { ...defaultSave(), lifetime: '5', kat: 2, kat2: { acik: true, padsDone: kadar('k2okey4'), masaSv: {}, gorev: { idx: 5, sayac: {} }, yuk: {} } };
    const b = bulutlaBirlestir(ileri, yerel);
    expect(b.kat2.padsDone).toEqual(kadar('k2okey4'));
    expect(b.kat).toBe(2);
    // Aynı pad sayısında Sv / yükseltme farkı da ileri sayılır.
    const svli = { ...yerel, kat2: { ...yerel.kat2, masaSv: { k2okey2: 3 } } };
    expect(bulutlaBirlestir(yerel, svli).kat2.masaSv).toEqual({ k2okey2: 3 });
  });

  it('yerel: ana kaydı Kat 2\'siz sürüm yazdıysa yedekteki Kat 2 korunur', () => {
    const k2 = { acik: true, padsDone: kadar('k2okey3'), masaSv: {}, gorev: { idx: 2, sayac: {} }, yuk: {} };
    mem[`${KEY}.yedek.0`] = kayitMetni({ ...defaultSave(), lifetime: '100', kat: 2, kat2: k2 }, 4);
    mem[KEY] = eskiSurumMetni({ ...defaultSave(), lifetime: '200' });
    const d = loadSave();
    expect(d.lifetime).toBe('200');
    expect(d.kat2.padsDone).toEqual(k2.padsDone);
    expect(d.kat).toBe(2);
    expect(kayitSorunu()).toBeNull();
  });
});

describe('#2 Kat 2 kısmi dolum', () => {
  it('kaydet → yükle: pad / Sv dolumu geri gelir, fiyata kelepçeli; geçersiz nokta düşer', () => {
    kat2Kur('k2okey1', { idx: 2, sayac: {} });
    const k = useGame.getState().kat2;
    const pad = kat2SiradakiPad(A, k.padsDone)!;
    const sv = kat2SvTetikleri(A, k.padsDone, {})[0];
    const d = useGame.getState().kat2Dunya;
    useGame.setState({ kat2Dunya: { ...d, padFill: { [pad.id]: 2743, [sv.id]: sv.fiyat * 10, k2yokBoyle: 50, [ZINCIR[0]]: 99 } } });
    useGame.getState().saveNow();
    useGame.getState().init();
    expect(useGame.getState().kat2Dunya.padFill).toEqual({ [pad.id]: 2743, [sv.id]: sv.fiyat });
    expect(useGame.getState().kat2).not.toHaveProperty('padFill');
  });

  it('doğrulama bozuk dolumu atar', () => {
    const d = { ...defaultSave(), kat2: { ...defaultSave().kat2, padFill: { a: 5, b: -1, c: Number.NaN, e: 'x' as unknown as number } } };
    expect(kayitDogrula(d).data.kat2.padFill).toEqual({ a: 5 });
  });
});

describe('#4 Kat 2 yerdeki para', () => {
  it('kayıtta cüzdan + toplam kazançtadır; yüklemede çift sayılmaz', () => {
    kat2Kur('k2okey1', { idx: 2, sayac: {} });
    const d = useGame.getState().kat2Dunya;
    useGame.setState({ wallet: D(100), lifetime: D(1000), coins: [], kat2Dunya: { ...d, paralar: [{ id: 1, x: -6.5, z: -1.9, miktar: 5000 }, { id: 2, x: 6.5, z: -1.9, miktar: 234 }] } });
    const k = kayitVerisi(useGame.getState());
    expect(k.wallet).toBe('5334');
    expect(k.lifetime).toBe('6234');
    useGame.getState().saveNow();
    useGame.getState().init();
    const s = useGame.getState();
    expect(s.kat2Dunya.paralar).toEqual([]);
    expect(s.wallet.toString()).toBe('5334');
    expect(kayitVerisi(s).wallet).toBe('5334');
  });
});

describe('#3 Kat 2 görev hattı yüklemede atlamaz', () => {
  it('sayaç görevi sürerken sonraki pad\'ler alınmış kayıt: kaydet → yükle aynı', () => {
    const gi = HAT.findIndex((g) => g.id === 'k2_kahve10');
    kat2Kur('k2garson', { idx: gi, sayac: { servis: 7 } });
    useGame.getState().saveNow();
    useGame.getState().init();
    expect(useGame.getState().kat2.gorev).toEqual({ idx: gi, sayac: { servis: 7 } });
  });

  it('görev kaydı OLMAYAN eski Kat 2 kaydı hâlâ hizalanır', () => {
    const k2 = { acik: true, padsDone: kadar('k2salon2'), masaSv: {}, yuk: {} };
    mem[KEY] = JSON.stringify({ ...defaultSave(), kat2: k2 });
    useGame.getState().init();
    expect(HAT[useGame.getState().kat2.gorev!.idx].id).toBe('k2_grup5');
  });
});

describe('#5 sürümü bozuk kayıt sessizce sıfırlanmaz', () => {
  it('saveVersion dizge / eksik → red', () => {
    expect(kayitCoz({ ...defaultSave(), saveVersion: '34', wallet: '777' }).red).toContain('saveVersion');
    const { saveVersion: _v, ...surumsuz } = defaultSave();
    expect(kayitCoz(surumsuz).red).toContain('saveVersion');
  });
  it('sağlam yedek varsa ondan açılır; yoksa karantina + not', () => {
    mem[`${KEY}.yedek.0`] = kayitMetni({ ...defaultSave(), wallet: '555' }, 1);
    mem[KEY] = JSON.stringify({ ...defaultSave(), saveVersion: '34', wallet: '777' });
    expect(loadSave().wallet).toBe('555');
    expect(kayitSorunu()).toBe('yedekten');
    delete mem[`${KEY}.yedek.0`];
    loadSave();
    expect(kayitSorunu()).toBe('onarildi');
    expect(karantinadakiKayit()).toContain('777');
  });
});

describe('reklam #3 tick dışı XP seviye ekranını açar (bir kez)', () => {
  it('Kat 2 görev XP\'si seviye atlatır → ödül ekranı', () => {
    const gi = HAT.findIndex((g) => g.id === 'k2_okey1');
    kat2Kur('k2okey1', { idx: gi, sayac: {} });
    useGame.setState({ xp: esik(6) - 1, levelUp: null });
    for (let i = 0; i < 5; i++) useGame.getState().tick(0.05);
    const s = useGame.getState();
    expect(levelProgress(s.xp).level).toBe(6);
    expect(s.levelUp?.level).toBe(6);
    useGame.getState().claimLevelUp();
    for (let i = 0; i < 20; i++) useGame.getState().tick(0.05);
    expect(useGame.getState().levelUp).toBeNull();
  });

  it('Kat 1 panel alımı (tick dışı) seviye atlatır → ekran bir kez', () => {
    useGame.setState({ xp: esik(6) - 1, levelUp: null, wallet: D(1e9) });
    expect(useGame.getState().upgradeStation()).toBe(true);
    for (let i = 0; i < 3; i++) useGame.getState().tick(0.05);
    expect(useGame.getState().levelUp?.level).toBe(6);
    const tutar = useGame.getState().levelUp!.amount;
    for (let i = 0; i < 20; i++) useGame.getState().tick(0.05);
    expect(useGame.getState().levelUp?.amount).toBe(tutar);
    expect(useGame.getState().xpBekleyen).toBe(0);
  });

  it('yüklemede seviye ekranı doğmaz (kayıttaki XP bekleyen sayılmaz)', () => {
    mem[KEY] = JSON.stringify({ ...defaultSave(), xp: esik(9) + 3 });
    useGame.getState().init();
    for (let i = 0; i < 5; i++) useGame.getState().tick(0.05);
    expect(useGame.getState().levelUp).toBeNull();
  });
});
