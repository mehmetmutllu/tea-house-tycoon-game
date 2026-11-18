/**
 * BEKÇİ — tarama 2026-11-18 W4: yön (oynanış #1/#4/#6/#8/#9) · reklam kuralı (reklam #4/#6/#9) ·
 * geri bildirim bağlamı (#8) · ₺ simgesi (arayüz #4/#5).
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { kat2Gorevleri } from '../src/game/kat2Gorev';
import { MERDIVEN_PAD_YER } from '../src/game/kat';
import type { Kat2Ayar } from '../src/game/kat2Dongu';
import { kenarOku, merdivenRehberi, rehberHedefi } from '../src/game/screenPointer';
import { panelKapandi, reklamBaslat, odulluIzleSonuc, reklamSaatiKaydir, sahteArkaUc, type ReklamArkaUcu } from '../src/game/ads';
import type { OdulluSonuc } from '../src/game/satinAlimTipleri';
import { adsConfig } from '../src/config/ads.config';
import { analitikOlaylari, type AnalitikKesit } from '../src/game/analitik';
import { ilerlemeOzeti } from '../src/game/geriBildirim';
import { en } from '../src/i18n/en';

const oku = (p: string) => readFileSync(p, 'utf8');
const HAT = kat2Gorevleri(C.kat2Gorevler, C.kat2 as Kat2Ayar);
const KAT1_PADLER = (C.pads as readonly { id: string }[]).map((p) => p.id);
const g = globalThis as Record<string, unknown>;
let orig: unknown;

beforeEach(() => {
  const mem: Record<string, string> = {};
  orig = g.localStorage;
  g.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  useGame.getState().hardReset();
});
afterEach(() => {
  if (orig === undefined) delete g.localStorage;
  else g.localStorage = orig;
});

describe('Kat 1 hat sonu → merdiven (oynanış #1)', () => {
  const durum = (o: Partial<Parameters<typeof merdivenRehberi>[0]> = {}) => ({
    kat: 1, quest: null, padsDone: KAT1_PADLER, kat2: { acik: false, padsDone: [] }, ...o,
  });
  it('hat bitti + omurga bitti + Kat 2 kapalı → merdivene çağırır; hedef merdiven pad\'i', () => {
    expect(merdivenRehberi(durum(), true)).toBe(true);
    expect(rehberHedefi(durum(), true)).toEqual([MERDIVEN_PAD_YER[0], MERDIVEN_PAD_YER[1]]);
  });
  it('hat sürerken, Kat 2 açıkken ya da bayrak kapalıyken çağırmaz', () => {
    expect(merdivenRehberi(durum({ quest: { id: 'q' } }), true)).toBe(false);
    expect(merdivenRehberi(durum({ kat2: { acik: true, padsDone: [] } }), true)).toBe(false);
    expect(merdivenRehberi(durum(), false)).toBe(false);
    expect(merdivenRehberi(durum({ padsDone: [] }), true)).toBe(false);
    expect(rehberHedefi(durum({ quest: { id: 'q' } }), true)).toBeNull();
  });
});

describe('Kat 2 görev hedefi (oynanış #4) — store `kat2GorevOdak` ile aynı nokta', () => {
  it('hattın her adımında kenar okunun hedefi = kamera odağının hedefi', () => {
    useGame.getState().kat2Ac();
    const k2 = useGame.getState().kat2;
    const tumPad = (C.kat2 as Kat2Ayar).padler.map((p) => p.id);
    let karsilastirilan = 0;
    for (const padsDone of [k2.padsDone, [...k2.padsDone, ...tumPad]]) {
      for (let idx = 0; idx < HAT.length; idx++) {
        useGame.setState({ kat: 2, camFocus: null, kat2: { ...k2, padsDone, gorev: { idx, sayac: {} } } });
        useGame.getState().kat2GorevOdak();
        const s = useGame.getState();
        const h = rehberHedefi(s);
        const odak = s.camFocus ? [s.camFocus.pos[0], s.camFocus.pos[2]] : null;
        expect(h, `idx ${idx}`).toEqual(odak);
        if (h) karsilastirilan++;
      }
    }
    expect(karsilastirilan).toBeGreaterThan(HAT.length / 2);
  });
  it('hat bitince hedef yok (Kat 2 sonu: ok susar, bant kutlar → günlük bant)', () => {
    useGame.getState().kat2Ac();
    useGame.setState({ kat: 2, kat2: { ...useGame.getState().kat2, gorev: { idx: HAT.length, sayac: {} } } });
    expect(rehberHedefi(useGame.getState())).toBeNull();
  });
});

describe('kenar oku izdüşümü (Scene kuralının aynısı)', () => {
  it('ekran içi hedefte ok yok; dışarıdaysa güvenli kenara oturur ve hedefe bakar', () => {
    expect(kenarOku([0, 0], 400, 800).onScreen).toBe(true);
    const sag = kenarOku([3, 0.2], 400, 800);
    expect(sag.onScreen).toBe(false);
    expect(sag.x).toBeCloseTo(400 - 34, 3);
    expect(Math.abs(sag.angle)).toBeLessThan(45);
    const alt = kenarOku([0, -3], 400, 800);
    expect(alt.y).toBeCloseTo(800 - 170, 3);
    expect(alt.angle).toBeCloseTo(90, 3);
  });
});

describe('HUD bağlantıları (oynanış #2/#5/#6/#8/#9)', () => {
  const hud = oku('src/components/ui/HUD.tsx');
  it('kenar oku Scene yazmıyorsa rehber hedefini izdüşürür; dokunuş rehbere gider', () => {
    expect(hud).toMatch(/sp\.active \? sp : g\.katGecis \? null : rehberOku\(rehberHedefi\(g\)/);
    expect(hud).toContain('<EdgeArrow onClick={rehberOdak} />');
  });
  it('hat sonu bandı merdivene çağırır; Kat 2 sonu kutlar sonra günlük banda döner', () => {
    expect(hud).toMatch(/merdivenCagir \? \(\s*<button className="band" data-testid="merdiven-bandi"/);
    expect(hud).toMatch(/k2BitisGorunur \? \([\s\S]{0,300}Kat 2 görevleri tamamlandı[\s\S]{0,200}<GunlukBant/);
  });
  it('Kat 2\'de tepsi düğmesi Kat 2 kahvesini gösterir/boşaltır, Kat 1 tepsisi gizlenir', () => {
    expect(hud).toMatch(/s\.kat === 2 \? s\.kat2Dunya\.tepsi : 0/);
    expect(hud).toMatch(/onClick=\{\(\) => emptyTray\('kahve'\)\}/); // boşaltma store eyleminde (tests/tarama-tepsi-katlar)
    expect(hud).toMatch(/\{!kat2de && tray > 0 && \(/);
    expect(hud).toMatch(/\{!kat2de && trayFood > 0 && \(/);
  });
  it('Görevler paneli Kat 2\'de Kat 2 hattını listeler; Hedefler\'de Usta şeridi Kat 2\'de yok', () => {
    expect(hud).toMatch(/const all: [^=]+= kat2de \? k2Hat : economyConfig\.quests;/);
    expect(hud).toMatch(/\{!kat2de && \(\s*<div className="usta-strip"/);
  });
  it('kat değişince panel/video kartı kapanır ve bu kapanış reklam patlatmaz', () => {
    expect(hud).toMatch(/setSheet\(null\);\s*setVideoAcik\(false\);/);
    expect(hud).toMatch(/if \(katKapanisi\) return;\s*if \(onceki != null && sheet == null\) void panelKapandi\(\);/);
  });
});

describe('reklam — ödüllü video da tam ekran reklamdır (reklam #4) · iptal edilen alım (#6)', () => {
  const SOGUMA_MS = adsConfig.gecisli.sogumaSn * 1000;
  const arkaUc = (sonuc: OdulluSonuc): ReklamArkaUcu => ({ ...sahteArkaUc(), gecisliGoster: async () => true, odulluGoster: async () => sonuc });

  for (const sonuc of ['odul', 'yarida'] as const) {
    it(`ödüllü (${sonuc}) sonrası ilk kapanış reklamsız ve soğuma baştan`, async () => {
      await reklamBaslat(arkaUc(sonuc));
      reklamSaatiKaydir(SOGUMA_MS); // soğuma çoktan doldu
      expect(await odulluIzleSonuc()).toBe(sonuc);
      expect(await panelKapandi()).toBe(false); // ödül ekranından hemen sonra
      expect(await panelKapandi()).toBe(false); // soğuma yeniden başladı
      reklamSaatiKaydir(SOGUMA_MS);
      expect(await panelKapandi()).toBe(true);
    });
  }
  it('gösterilemeyen ödüllü soğumayı etkilemez', async () => {
    await reklamBaslat({ ...arkaUc('odul'), odulluHazirla: async () => false });
    reklamSaatiKaydir(SOGUMA_MS);
    expect(await odulluIzleSonuc()).toBe('gosterilemedi');
    expect(await panelKapandi()).toBe(true);
  });
  it('satın alma denemesi (vazgeç/hata dahil) panel kapanışını reklamsız yapar', () => {
    const k = oku('src/components/ui/useSatinAl.ts');
    expect(k).toMatch(/odulAlindi\(\);\s*const c = await satinAlDetay\(urun\);/);
  });
});

describe('analitik — bulut yüklemesi sahte kat2_acildi doğurmaz (reklam/derleme #9)', () => {
  const kesit = (o: Partial<AnalitikKesit> = {}): AnalitikKesit => ({
    questIndex: 50, seviye: 12, padsDone: [], ogreticiAtlandi: false,
    kat: 1, katGecisi: false, kat2Acik: false, kat2Pads: [], kat2MasaSv: {}, kat2GorevIdx: 0, merdivenDolum: 0, ...o,
  });
  const adlar = (a: AnalitikKesit, b: AnalitikKesit) => analitikOlaylari(a, b).map((x) => x.ad);
  it('merdiven dolmadan Kat 2 açıldıysa (yükleme) olay yok — ≤2 Kat 2 noktası dahil', () => {
    expect(adlar(kesit(), kesit({ kat2Acik: true, kat2Pads: [...C.kat2.hazir, 'k2okey1'] }))).toEqual([]);
  });
  it('merdiven dolarken açıldıysa tek olay', () => {
    expect(adlar(kesit({ merdivenDolum: 9000 }), kesit({ kat2Acik: true, kat2Pads: [...C.kat2.hazir], merdivenDolum: 0 }))).toEqual(['kat2_acildi']);
  });
});

describe('geri bildirim Kat 2 bağlamı (#8)', () => {
  const taban = { questIndex: 49, seviye: 20, tables: 12, padsDone: ['a', 'b'] };
  it('Kat 2 açıkken kat + Kat 2 noktası + Kat 2 görev sırası yazılır', () => {
    const m = ilerlemeOzeti({ ...taban, kat: 2, kat2: { acik: true, padsDone: ['x', 'y', 'z'], gorev: { idx: 4 } } });
    expect(m).toBe('gorev 50 · sv 20 · masa 12 · nokta 2 · kat 2 · k2 3 · k2g 5');
    expect(m.length).toBeLessThanOrEqual(120);
    expect(ilerlemeOzeti({ ...taban, kat: 1, kat2: { acik: false, padsDone: [] } })).toBe('gorev 50 · sv 20 · masa 12 · nokta 2 · kat 1');
  });
  it('kutu bu özeti kullanır', () => {
    expect(oku('src/components/ui/GeriBildirimKutusu.tsx')).toMatch(/ilerleme: ilerlemeOzeti\(/);
  });
});

describe('para birimi ₺ değil (arayüz #4/#5)', () => {
  it('sözlükte ₺ içeren anahtar kalmadı; KÜNYE ve mağaza fiyatı coin ikonu', () => {
    expect(Object.keys(en).filter((k) => k.includes('₺'))).toEqual([]);
    const hud = oku('src/components/ui/HUD.tsx');
    expect(hud).not.toMatch(/₺<\/b>/);
    expect(hud).not.toMatch(/t\('\{1\} ₺'/);
    expect(oku('src/config/playGames.config.ts')).not.toMatch(/₺ kazan/);
  });
  it('EN koleksiyon bonusu çift "+" taşımaz', () => {
    expect(en['· koleksiyon bonusu {1} gelir']).not.toContain('+');
  });
});
