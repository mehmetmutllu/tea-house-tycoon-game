/**
 * kat2-gorev.test.ts — S3 ajan D: Kat 2 görev hattı + Kat 2 başarımları + Kat 2 analitik olayları.
 * Bekçi: her görev ULAŞILABİLİR (q_tost5 dersi), sıra zincirle çelişmez, ödül Kat 1 M1 bandında,
 * Sv görevleri yalnız `kat2.masaSv` varken; başarım listesi çakışmasız ve Play tavanında.
 */
import { describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { playGamesConfig } from '../src/config/playGames.config';
import {
  kat2GorevGorunumu,
  kat2GorevHatasi,
  kat2GorevHizala,
  kat2GorevIlerlet,
  kat2Gorevleri,
  kat2GorevOdulReferansi,
  type Kat2GorevDef,
  type Kat2GorevKayit,
  type Kat2GorevOlay,
} from '../src/game/kat2Gorev';
import type { Kat2Ayar, Kat2SvKol } from '../src/game/kat2Dongu';
import { KAT2_MASALAR } from '../src/game/kat';
import { acikBasarimlar, basarimOlculeri } from '../src/game/basarim';
import { defaultSave, type SaveData } from '../src/game/save';
import { analitikOlaylari, type AnalitikKesit } from '../src/game/analitik';

const G = C.kat2Gorevler as readonly Kat2GorevDef[];
const ZINCIR = C.kat2.padler.map((p) => p.id);
const HAZIR = C.kat2.hazir;
const svKol = (): Kat2SvKol => ({
  fiyat: [0, 2_000, 4_000, 8_000, 16_000],
  ucretCarpan: [1, 1.2, 1.4, 1.6, 1.8],
  kahveAralikCarpan: [1, 1, 1, 1, 1],
  gelisAralikCarpan: [1, 1, 1, 1, 1],
});
const AYAR_SV: Kat2Ayar = { ...C.kat2, masaSv: { okey: svKol(), tavla: svKol() } };
const AYAR: Kat2Ayar = { ...C.kat2 };
delete (AYAR as { masaSv?: unknown }).masaSv;

const SIFIR: Kat2GorevOlay = { servis: 0, garsonServis: 0, tavlaServis: 0, kalkis: 0, kazanc: 0 };
const olay = (o: Partial<Kat2GorevOlay>): Kat2GorevOlay => ({ ...SIFIR, ...o });
const kadar = (id: string) => [...HAZIR, ...ZINCIR.slice(0, ZINCIR.indexOf(id) + 1)];

describe('Kat 2 görev hattı — config bekçisi', () => {
  it('hat oynanabilir: kimlik tekil, zincir sırası, her hedef açılmış şeyi ister, Sv kuyrukta', () => {
    expect(kat2GorevHatasi(G, AYAR, HAZIR)).toBeNull();
    expect(kat2GorevHatasi(G, AYAR_SV, HAZIR)).toBeNull();
  });
  it('15-20 görev (Sv hariç), Sv görevleri yalnız masaSv varken', () => {
    const svsiz = kat2Gorevleri(G, AYAR);
    expect(svsiz.length).toBeGreaterThanOrEqual(15);
    expect(svsiz.length).toBeLessThanOrEqual(20);
    expect(svsiz.some((g) => g.hedef.tip === 'masaSv')).toBe(false);
    expect(kat2Gorevleri(G, AYAR_SV).length).toBe(G.length);
    // Config bugün masaSv taşımıyorsa oynanan hat Sv'siz (sözleşme: kapı ölçümden sonra).
    expect(kat2Gorevleri(G, C.kat2).length).toBe(C.kat2.masaSv ? G.length : svsiz.length);
  });
  it('ilk görevler zincirin açılış sırasını izler, hat zincirin son pad\'inde biter, her salonun görevi var', () => {
    const padHedef = G.flatMap((g) => (g.hedef.tip === 'pad' ? [g.hedef.id] : []));
    const sira = padHedef.map((id) => ZINCIR.indexOf(id));
    expect(sira.every((z, i) => z >= 0 && (i === 0 || z > sira[i - 1]))).toBe(true);
    expect(padHedef[padHedef.length - 1]).toBe(ZINCIR[ZINCIR.length - 1]);
    for (const id of ['k2okey1', 'k2salon2', 'k2cezve2', 'k2lavabo', 'k2salon3', 'k2garson', 'k2tavla1']) expect(padHedef).toContain(id);
    // D-191 akışı: okey salonu → 2. ocak → lavabo → tavla köşesi → garson
    const i = (id: string) => padHedef.indexOf(id);
    expect(i('k2salon2') < i('k2cezve2') && i('k2cezve2') < i('k2lavabo') && i('k2lavabo') < i('k2salon3') && i('k2salon3') < i('k2garson')).toBe(true);
    // İlk görev varışta (hazır masa + ocak) yapılabilir.
    expect(G[0].hedef).toEqual({ tip: 'sayac', sayac: 'servis', adet: 1 });
  });
  it('kimlikler Kat 1 hattıyla çakışmaz', () => {
    const k1 = new Set(C.quests.map((q) => q.id));
    expect(G.filter((g) => k1.has(g.id))).toEqual([]);
  });
  it('ödül Kat 1 M1 bandında: referans pad\'in %10-20\'si, 50\'nin katı', () => {
    for (const hat of [kat2Gorevleri(G, AYAR), kat2Gorevleri(G, AYAR_SV)]) {
      hat.forEach((g, i) => {
        expect(g.reward % 50).toBe(0);
        const ref = kat2GorevOdulReferansi(hat, i, hat === kat2Gorevleri(G, AYAR) ? AYAR : AYAR_SV);
        if (g.hedef.tip === 'masaSv') return; // Sv fiyatı ölçümden sonra (S3b) — taslak
        expect(ref, g.id).not.toBeNull();
        const oran = g.reward / (ref as number);
        expect(oran, `${g.id} ${(oran * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.1);
        expect(oran, `${g.id} ${(oran * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.2);
      });
    }
  });
});

describe('Kat 2 görev hattı — bekçinin kendisi (mutasyonlar yakalanır)', () => {
  const degis = (i: number, h: Kat2GorevDef['hedef']) => G.map((g, j) => (j === i ? { ...g, hedef: h } : g));
  it('zincir sırası bozulursa', () => {
    const takas = [...G];
    const a = takas.findIndex((g) => g.id === 'k2_salon2');
    const b = takas.findIndex((g) => g.id === 'k2_cezve2');
    [takas[a], takas[b]] = [takas[b], takas[a]];
    expect(kat2GorevHatasi(takas, AYAR, HAZIR)).toMatch(/sırasına aykırı/);
  });
  it('tavla kahvesi tavla masasından önce istenirse (q_tost5 dersi)', () => {
    expect(kat2GorevHatasi(degis(1, { tip: 'sayac', sayac: 'tavlaKahve', adet: 1 }), AYAR, HAZIR)).toMatch(/henüz açılmamış/);
  });
  it('garson sayacı garsondan önce istenirse', () => {
    const i = G.findIndex((g) => g.id === 'k2_salon3');
    expect(kat2GorevHatasi(degis(i + 1, { tip: 'sayac', sayac: 'garson', adet: 1 }), AYAR, HAZIR)).toMatch(/henüz açılmamış/);
  });
  it('hazır ocak olmasa ilk kahve görevi ulaşılamaz', () => {
    expect(kat2GorevHatasi(G, AYAR, ['k2okey2'])).toMatch(/k2_kahve1/);
  });
  it('Sv görevi hattın ortasına girerse · Sv6 istenirse', () => {
    expect(kat2GorevHatasi(degis(3, { tip: 'masaSv', sv: 2, adet: 1 }), AYAR_SV, HAZIR)).toMatch(/kuyrukta/);
    expect(kat2GorevHatasi(degis(G.length - 1, { tip: 'masaSv', sv: 6, adet: 1 }), AYAR_SV, HAZIR)).toMatch(/Sv6/);
  });
  it('aynı pad iki görevde hedeflenirse', () => {
    const i = G.findIndex((g) => g.id === 'k2_okey4');
    expect(kat2GorevHatasi(degis(i, { tip: 'pad', id: 'k2okey1' }), AYAR, HAZIR)).toMatch(/sırasına aykırı/);
  });
  it('zincirde olmayan pad · son pad eksik', () => {
    expect(kat2GorevHatasi(degis(1, { tip: 'pad', id: 'yok' }), AYAR, HAZIR)).toMatch(/zincirde yok/);
    const kisa = G.filter((g) => g.id !== 'k2_tavla12');
    expect(kat2GorevHatasi(kisa, AYAR, HAZIR)).toMatch(/son pad/);
  });
});

describe('kat2GorevIlerlet', () => {
  it('servis görevi yalnız ELLE götürülen kahveyi sayar, delta görev başından', () => {
    const d = { padsDone: [...HAZIR] };
    let r = kat2GorevIlerlet(undefined, olay({ servis: 2, garsonServis: 2 }), d, G, AYAR);
    expect(r.biten).toEqual([]);
    expect(r.kayit.idx).toBe(0);
    r = kat2GorevIlerlet(r.kayit, olay({ servis: 1 }), d, G, AYAR);
    expect(r.biten.map((g) => g.id)).toEqual(['k2_kahve1']);
    expect(r.odul).toBe(G[0].reward);
    expect(r.kayit).toEqual({ idx: 1, sayac: {} });
  });
  it('olay yoksa AYNI kayıt döner (store kimliği korur)', () => {
    const k: Kat2GorevKayit = { idx: 3, sayac: { servis: 4 } };
    const r = kat2GorevIlerlet(k, SIFIR, { padsDone: [...HAZIR] }, G, AYAR);
    expect(r.kayit).toBe(k);
    expect(r.odul).toBe(0);
  });
  it('sayaç görevi sürerken alınan pad\'ler, sayaç bitince art arda biter (ödülleri toplanır)', () => {
    const i = G.findIndex((g) => g.id === 'k2_kahve10');
    const k: Kat2GorevKayit = { idx: i, sayac: { servis: 9 } };
    const r = kat2GorevIlerlet(k, olay({ servis: 1 }), { padsDone: kadar('k2salon2') }, G, AYAR);
    expect(r.biten.map((g) => g.id)).toEqual(['k2_kahve10', 'k2_okey4', 'k2_salon2']);
    expect(r.odul).toBe(r.biten.reduce((a, g) => a + g.reward, 0));
    expect(r.kayit.idx).toBe(i + 3);
  });
  it('uçtan uca: zincir sırayla alınıp olaylar akınca bütün hat biter (Sv dahil)', () => {
    for (const ayar of [AYAR, AYAR_SV]) {
      const hat = kat2Gorevleri(G, ayar);
      let kayit: Kat2GorevKayit | undefined;
      let padsDone = [...HAZIR];
      const masaSv: Record<string, number> = {};
      let biten = 0;
      for (let adim = 0; adim < 500 && (kayit?.idx ?? 0) < hat.length; adim++) {
        const g = hat[kayit?.idx ?? 0];
        // Oyuncu zincirin sıradaki pad'ini alır (zincir tek hat).
        const sira = ZINCIR.find((id) => !padsDone.includes(id));
        if (g.hedef.tip === 'pad' && sira) padsDone = [...padsDone, sira];
        if (g.hedef.tip === 'masaSv') {
          const h = g.hedef;
          const m = KAT2_MASALAR.find((x) => (!h.tur || x.tur === h.tur) && padsDone.includes(x.id) && (masaSv[x.id] ?? 1) < h.sv);
          if (m) masaSv[m.id] = (masaSv[m.id] ?? 1) + 1;
        }
        // Açık şeylerin olayları (garson yalnız tavlaya; elle servis okeye).
        const tavla = padsDone.includes('k2tavla1');
        const garson = padsDone.includes('k2garson') && tavla;
        const r = kat2GorevIlerlet(
          kayit,
          olay({ servis: 1 + (garson ? 1 : 0), garsonServis: garson ? 1 : 0, tavlaServis: tavla ? 1 : 0, kalkis: 1, kazanc: 50 }),
          { padsDone, masaSv: { ...masaSv } },
          G,
          ayar,
        );
        kayit = r.kayit;
        biten += r.biten.length;
      }
      expect(biten).toBe(hat.length);
      expect(padsDone).toEqual([...HAZIR, ...ZINCIR]);
    }
  });
});

describe('kat2GorevHizala (yükleme, ödülsüz)', () => {
  it('görev hattından önce bütün zinciri almış kayıt: hat sonuna (Sv kuyruğuna) atlar', () => {
    const d = { padsDone: [...HAZIR, ...ZINCIR] };
    expect(kat2GorevHizala(undefined, d, G, AYAR).idx).toBe(kat2Gorevleri(G, AYAR).length);
    expect(kat2GorevHizala(undefined, d, G, AYAR_SV).idx).toBe(G.findIndex((g) => g.hedef.tip === 'masaSv'));
  });
  it('okey salonu açık kayıt: salonun görevinden sonraki göreve geçer', () => {
    const k = kat2GorevHizala({ idx: 0, sayac: {} }, { padsDone: kadar('k2salon2') }, G, AYAR);
    expect(G[k.idx].id).toBe('k2_grup5');
  });
  it('yeni kayıt ve hizalı kayıt değişmez (aynı nesne)', () => {
    const k: Kat2GorevKayit = { idx: 0, sayac: { servis: 0 } };
    expect(kat2GorevHizala(k, { padsDone: [...HAZIR] }, G, AYAR)).toBe(k);
  });
});

describe('kat2GorevGorunumu (HUD şeridi)', () => {
  it('pad görevi aradaki zincir pad\'lerini adım sayar', () => {
    const i = G.findIndex((g) => g.id === 'k2_okey4');
    const v = kat2GorevGorunumu({ padsDone: kadar('k2okey3'), gorev: { idx: i, sayac: {} } }, G, AYAR);
    expect(v).toMatchObject({ id: 'k2_okey4', cur: 1, total: 2, reward: G[i].reward });
  });
  it('tek adımlı pad görevi çubuksuz · sayaç görevi cur/total', () => {
    expect(kat2GorevGorunumu({ padsDone: [...HAZIR], gorev: { idx: 1, sayac: {} } }, G, AYAR)).toMatchObject({ cur: null, total: null });
    const i = G.findIndex((g) => g.id === 'k2_kahve10');
    expect(kat2GorevGorunumu({ padsDone: [...HAZIR], gorev: { idx: i, sayac: { servis: 4 } } }, G, AYAR)).toMatchObject({ cur: 4, total: 10 });
  });
  it('hat bitince null', () => {
    expect(kat2GorevGorunumu({ padsDone: [], gorev: { idx: 99, sayac: {} } }, G, AYAR)).toBeNull();
  });
});

describe('Kat 2 başarımları', () => {
  const B = playGamesConfig.basarimlar;
  const K2 = B.filter((b) => b.anahtar.startsWith('kat2_'));
  const kayit = (kat2: SaveData['kat2']): SaveData => ({ ...defaultSave(), kat2 });
  it('19 + 6 başarım · anahtar tekil · toplam 1000 XP', () => {
    expect(B.length).toBe(25);
    expect(K2.length).toBe(6);
    expect(new Set(B.map((b) => b.anahtar)).size).toBe(B.length);
    expect(B.reduce((a, b) => a + b.xp, 0)).toBe(1000);
  });
  it('Kat 1 başarımlarının anahtar/ölçü/eşikleri değişmedi', () => {
    const eski = B.filter((b) => !b.anahtar.startsWith('kat2_')).map((b) => `${b.anahtar}:${b.olcu}:${b.esik}`);
    expect(eski).toEqual([
      'ilk_cay:servis:1', 'ilk_masa:pad:1', 'ilk_bulasik:bulasik:1', 'ilk_garson:garson:1', 'seviye_5:seviye:5',
      'seviye_10:seviye:10', 'servis_100:servis:100', 'servis_1000:servis:1000', 'servis_6000:servis:6000',
      'mekan_10:pad:10', 'mekan_24:pad:24', 'kazanc_10k:kazanc:10000', 'kazanc_200k:kazanc:200000',
      'kazanc_600k:kazanc:600000', 'ilk_usta:usta:1', 'masa_8:sonSeviyeMasa:8', 'masa_20:sonSeviyeMasa:20',
      'gorev_hatti:gorevHatti:1', 'koleksiyon:hedef:1',
    ]);
  });
  it('kapalı Kat 2 hiçbir Kat 2 başarımı açmaz', () => {
    const a = acikBasarimlar(kayit({ acik: false, padsDone: [...HAZIR, ...ZINCIR] }));
    expect(a.filter((x) => x.startsWith('kat2_'))).toEqual([]);
  });
  it('merdiven → ilk masa → tavla köşesi → bütün masalar → görev hattı → Sv5', () => {
    const acik = (k: Partial<SaveData['kat2']>) =>
      acikBasarimlar(kayit({ acik: true, padsDone: [...HAZIR], ...k })).filter((x) => x.startsWith('kat2_'));
    expect(acik({})).toEqual(['kat2_ac']);
    expect(acik({ padsDone: kadar('k2okey1') })).toEqual(['kat2_ac', 'kat2_ilk_masa']);
    expect(acik({ padsDone: kadar('k2salon3') })).toContain('kat2_tavla');
    expect(acik({ padsDone: kadar('k2tavla11') })).not.toContain('kat2_tamam');
    expect(acik({ padsDone: kadar('k2tavla12') })).toContain('kat2_tamam');
    const hatSonu = kat2Gorevleri(G, C.kat2).length;
    expect(acik({ gorev: { idx: hatSonu - 1, sayac: {} } })).not.toContain('kat2_gorev');
    expect(acik({ gorev: { idx: hatSonu, sayac: {} } })).toContain('kat2_gorev');
    expect(acik({ masaSv: { k2okey2: 4 } })).not.toContain('kat2_gozde_masa');
    expect(acik({ masaSv: { k2okey2: 5 } })).toContain('kat2_gozde_masa');
    // Açılmamış masanın Sv'si sayılmaz.
    expect(acik({ masaSv: { k2okey1: 5 } })).not.toContain('kat2_gozde_masa');
  });
  it('eşikler ulaşılabilir', () => {
    const o = basarimOlculeri(kayit({ acik: true, padsDone: [...HAZIR, ...ZINCIR], masaSv: { k2okey2: 5 }, gorev: { idx: 999, sayac: {} } }));
    for (const b of K2) expect(o[b.olcu], b.anahtar).toBeGreaterThanOrEqual(b.esik);
  });
});

describe('Kat 2 analitik olayları', () => {
  const kesit = (o: Partial<AnalitikKesit> = {}): AnalitikKesit => ({
    questIndex: 50, seviye: 12, padsDone: [], ogreticiAtlandi: false,
    kat: 1, katGecisi: false, kat2Acik: true, kat2Pads: [...HAZIR], kat2MasaSv: {}, kat2GorevIdx: 0, ...o,
  });
  const adlar = (a: AnalitikKesit, b: AnalitikKesit) => analitikOlaylari(a, b).map((x) => `${x.ad}:${Object.values(x.parametreler).join(',')}`);
  it('merdiven açılışı tek olay; hazır pad\'ler nokta olayı doğurmaz', () => {
    expect(adlar(kesit({ kat2Acik: false, kat2Pads: [] }), kesit())).toEqual(['kat2_acildi:51']);
  });
  it('kat geçişi YALNIZ perde sırasında (yükleme değil)', () => {
    expect(adlar(kesit(), kesit({ kat: 2, katGecisi: true }))).toEqual(['kat_gecis:2']);
    expect(adlar(kesit(), kesit({ kat: 2 }))).toEqual([]);
  });
  it('Kat 2 pad · masa Sv · görev bitişi', () => {
    expect(adlar(kesit(), kesit({ kat2Pads: [...HAZIR, 'k2okey1'] }))).toEqual(['kat2_nokta_acildi:k2okey1']);
    expect(adlar(kesit({ kat2MasaSv: { k2okey2: 2 } }), kesit({ kat2MasaSv: { k2okey2: 3 } }))).toEqual(['masa_sv:k2okey2,3']);
    expect(adlar(kesit(), kesit({ kat2GorevIdx: 1 }))).toEqual([`kat2_gorev_tamam:${G[0].id},1`]);
  });
  it('toplu sıçrama (yükleme/bulut) olay doğurmaz', () => {
    expect(adlar(kesit(), kesit({ kat2Pads: kadar('k2salon2') }))).toEqual([]);
    expect(adlar(kesit(), kesit({ kat2GorevIdx: 6 }))).toEqual([]);
  });
});

// S3b / D-195: D-142'nin Kat 2 karşılığı — Sv noktası yalnız Sv görevindeyken ya da hat bitince canlı.
import { kat2SvCanli as svCanli, kat2Gorevleri as hatOf } from '../src/game/kat2Gorev';
import { economyConfig as CFG } from '../src/config/economy.config';
import type { Kat2Ayar as K2A } from '../src/game/kat2Dongu';
describe('kat2SvCanli (D-142 karşılığı)', () => {
  const ayar = CFG.kat2 as K2A;
  const hat = hatOf(CFG.kat2Gorevler, ayar);
  const svIdx = hat.findIndex((g) => g.hedef.tip === 'masaSv');
  it('hat başında kapalı, Sv görevinde açık, hat bitince açık', () => {
    expect(svIdx).toBeGreaterThan(0);
    expect(svCanli({ padsDone: [], gorev: { idx: 0, sayac: {} } }, CFG.kat2Gorevler, ayar)).toBe(false);
    expect(svCanli({ padsDone: [], gorev: { idx: svIdx - 1, sayac: {} } }, CFG.kat2Gorevler, ayar)).toBe(false);
    expect(svCanli({ padsDone: [], gorev: { idx: svIdx, sayac: {} } }, CFG.kat2Gorevler, ayar)).toBe(true);
    expect(svCanli({ padsDone: [], gorev: { idx: hat.length, sayac: {} } }, CFG.kat2Gorevler, ayar)).toBe(true);
  });
});
