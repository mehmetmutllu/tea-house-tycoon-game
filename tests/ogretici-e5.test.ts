/**
 * ogretici-e5.test.ts — E5 HAREKETLİ İLK DAKİKALAR bekçisi.
 *
 * NE KORUYOR:
 *   · Öğretici İKİNCİ BİR HAT değil — adımı kartın görevinden türer, hattın başına bağlıdır.
 *   · Bir kez biter: son öğretici görevi geçmiş (ilerlemiş/eski) kayıt onu HİÇ görmez.
 *   · Atlanabilir ve atlama kayıtta durur; alanı taşımayan eski kayıt patlamaz.
 *   · Ekran kanalları sırasında yer alır: başka bir şey konuşurken susar, ekranı kesmez.
 *   · Dünya hedefi (iz + kenar oku) servis/para adımında SOMUT şeyi gösterir.
 *
 * DOĞRULANDI: `node tools/mutasyon-ogretici-e5.mjs` — 10/10 (bitiş · Atla · hat dışı kart · el ·
 * servis/tost hedefi · kanal sırası · geri tuşu · kayıt · metin tavanı). İlk koşuda "bitiş
 * kontrolü yok" mutasyonu KAÇTI: kontrol indexOf'un işini tekrarlıyordu, kod sadeleşti.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig as C } from '../src/config/economy.config';
import { ONBOARDING } from '../src/config/onboarding';
import {
  OGRETICI_BITIS,
  izCizilir,
  ogreticiAdimi,
  ogreticiHedefi,
  ogreticiMetni,
  yurudu,
} from '../src/game/onboarding';
import { ekranKanali, geriTusu, type EkranGirdisi } from '../src/game/ekranKanali';
import { cardQuestIndex } from '../src/game/rules';
import { defaultSave } from '../src/game/save';
import { useGame } from '../src/game/store';
import { LAYOUT } from '../src/game/layout';

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const KEY = 'kiraathane.save';

function withStorage(fn: (mem: Record<string, string>) => void, mem: Record<string, string> = {}): void {
  const g = globalThis as Record<string, unknown>;
  const orig = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  try { fn(mem); } finally { if (orig === undefined) delete g.localStorage; else g.localStorage = orig; }
}

const adim = (kartIndex: number, o: { atlandi?: boolean; yurudu?: boolean } = {}) =>
  ogreticiAdimi({ kartIndex, atlandi: o.atlandi ?? false, yurudu: o.yurudu ?? true });

describe('E5 · öğretici görev hattının BAŞINA bağlı (ikinci hat yok)', () => {
  it('öğretici görevleri hattın ilk görevleri, config sırasıyla', () => {
    ONBOARDING.gorevler.forEach((g, i) => expect(C.quests[i].id, `adım ${g.adim}`).toBe(g.gorev));
  });

  it('beklenen dört görev: çay al → servis → para → ilk pad', () => {
    expect(ONBOARDING.gorevler.map((g) => g.gorev)).toEqual(['q_pickup', 'q_serve1', 'q_coin', 'q_table2']);
    expect(C.quests[3].target).toEqual({ type: 'pad', id: 'table2' });
  });

  it('bitiş eşiği son öğretici görevinden SONRAKİ kart', () => {
    expect(OGRETICI_BITIS).toBe(4);
  });
});

describe('E5 · adım oyun durumundan türer', () => {
  it('ilk görevde önce yürü, yürüyünce çay al', () => {
    expect(adim(0, { yurudu: false })).toBe('yuru');
    expect(adim(0, { yurudu: true })).toBe('cay-al');
  });

  it('sonraki görevler kendi adımına denk gelir', () => {
    expect(adim(1)).toBe('servis');
    expect(adim(2)).toBe('para');
    expect(adim(3)).toBe('pad');
  });

  it('yürüme mandalı yalnız ilk görevde anlam taşır', () => {
    for (const i of [1, 2, 3]) expect(adim(i, { yurudu: false })).toBe(adim(i, { yurudu: true }));
  });

  it('ilk pad açılınca öğretici BİTER ve ilerlemiş kayıtta hiç görünmez', () => {
    expect(adim(4)).toBeNull();
    for (let i = OGRETICI_BITIS; i <= C.quests.length; i++) expect(adim(i, { yurudu: false }), `kart ${i}`).toBeNull();
  });

  it('atlanınca hiçbir adımda görünmez', () => {
    for (let i = 0; i < OGRETICI_BITIS; i++) {
      expect(adim(i, { atlandi: true, yurudu: false }), `kart ${i}`).toBeNull();
    }
  });

  it('kutlama penceresinde BİTEN görevin adımı kalır (kart ile satır ayrışmaz)', () => {
    // q_table2 bitti: ham index 4 ama kart hâlâ 3'ü gösteriyor.
    const kart = cardQuestIndex({ questIndex: 4, questPhase: 'completing', questDoneIndex: 3 } as Parameters<typeof cardQuestIndex>[0]);
    expect(kart).toBe(3);
    expect(adim(kart)).toBe('pad');
    const sonra = cardQuestIndex({ questIndex: 4, questPhase: 'active', questDoneIndex: -1 } as Parameters<typeof cardQuestIndex>[0]);
    expect(adim(sonra)).toBeNull();
  });

  it('yürüme eşiği başlangıç noktasından ölçülür', () => {
    const b = LAYOUT.player;
    expect(yurudu(b, b)).toBe(false);
    expect(yurudu([b[0] + ONBOARDING.yuruEsik * 0.5, b[1], b[2]], b)).toBe(false);
    expect(yurudu([b[0], b[1], b[2] + ONBOARDING.yuruEsik * 1.01], b)).toBe(true);
    // Yükseklik (y) sayılmaz.
    expect(yurudu([b[0], b[1] + 5, b[2]], b)).toBe(false);
  });
});

describe('E5 · dünya hedefi somut şeyi gösterir', () => {
  const npc = (x: number, z: number, state = 'waitingForTea', product = 'cay') => ({ state, product, pos: [x, 0.6, z] });
  const dunya = { player: [0, 0.6, 0], tray: 2, npcs: [npc(5, 0), npc(2, 1), npc(1, 0, 'drinking'), npc(0.5, 0, 'waitingForTea', 'tost')], coins: [] as { pos: number[] }[] };

  it('servis: tepside çay varken çay bekleyen EN YAKIN müşteri', () => {
    expect(ogreticiHedefi('servis', dunya)).toEqual([2, 0, 1]);
  });

  it('servis: tepsi boşsa görevin kendi hedefi (ocak) kalır', () => {
    expect(ogreticiHedefi('servis', { ...dunya, tray: 0 })).toBeNull();
  });

  it('servis: bekleyen yoksa görevin hedefi kalır', () => {
    expect(ogreticiHedefi('servis', { ...dunya, npcs: [npc(1, 0, 'drinking')] })).toBeNull();
  });

  it('para: en yakın para; yerde para yoksa görevin hedefi', () => {
    expect(ogreticiHedefi('para', { ...dunya, coins: [{ pos: [9, 0, 9] }, { pos: [1, 0, -1] }] })).toEqual([1, 0, -1]);
    expect(ogreticiHedefi('para', dunya)).toBeNull();
  });

  it('diğer adımlarda görevin hedefi zaten doğru (null)', () => {
    for (const a of ['yuru', 'cay-al', 'pad'] as const) expect(ogreticiHedefi(a, dunya)).toBeNull();
    expect(ogreticiHedefi(null, dunya)).toBeNull();
  });

  it('iz: öğretici yoksa yok; para adımında para düşmeden yok', () => {
    expect(izCizilir(null, { coins: [] })).toBe(false);
    expect(izCizilir('para', { coins: [] })).toBe(false);
    expect(izCizilir('para', { coins: [{ pos: [0, 0, 0] }] })).toBe(true);
    expect(izCizilir('cay-al', { coins: [] })).toBe(true);
  });

  it('satır dünyanın hâline göre (tepsi boş · para henüz düşmedi)', () => {
    expect(ogreticiMetni('servis', { tray: 1, coins: [] })).toBe('servis');
    expect(ogreticiMetni('servis', { tray: 0, coins: [] })).toBe('servis-bos');
    expect(ogreticiMetni('para', { tray: 0, coins: [] })).toBe('para-bekle');
    expect(ogreticiMetni('para', { tray: 0, coins: [{ pos: [0, 0, 0] }] })).toBe('para');
    expect(ogreticiMetni('pad', { tray: 0, coins: [] })).toBe('pad');
  });

  it('her satır kısa: 390 px dikeyde tek satıra sığar', () => {
    for (const [k, v] of Object.entries(ONBOARDING.metin)) {
      expect([...v].length, `${k}: "${v}"`).toBeLessThanOrEqual(ONBOARDING.metinTavan);
    }
  });
});

describe('E5 · ekran kanallarında yeri', () => {
  const bos: EkranGirdisi = {
    cevrimdisiVar: false, ustaVar: false, panelAcik: false, bildirimVar: false, gecisPenceresi: false,
    bulasikOgretmeHazir: false, karakterIpucuHazir: false, tepsiIpucuHazir: false,
  };

  it('ekran serbestken öğretici konuşur', () => {
    expect(ekranKanali({ ...bos, ogreticiHazir: true })).toBe('ogretici');
    expect(ekranKanali(bos)).toBeNull();
  });

  it('başka bir şey konuşurken susar', () => {
    const o = { ...bos, ogreticiHazir: true };
    expect(ekranKanali({ ...o, kafeAdiSorulacak: true })).toBe('kafe-adi');
    expect(ekranKanali({ ...o, panelAcik: true })).toBeNull();
    expect(ekranKanali({ ...o, bildirimVar: true })).toBeNull();
    expect(ekranKanali({ ...o, gecisPenceresi: true })).toBeNull();
    expect(ekranKanali({ ...o, seviyeVar: true })).toBe('seviye');
    expect(ekranKanali({ ...o, tepsiIpucuHazir: true })).toBe('ipucu-tepsi');
  });

  it('satış teklifinin ÖNÜNDE (öğreten her şey önce gelir)', () => {
    expect(ekranKanali({ ...bos, ogreticiHazir: true, baslangicTeklifHazir: true })).toBe('ogretici');
  });

  it('geri tuşu öğreticiyi atlatmaz (kazayla atlanmasın) — uygulama küçülür', () => {
    expect(geriTusu('ogretici', false)).toBe('kucult');
    expect(geriTusu('ogretici', true)).toBe('panel');
  });
});

describe('E5 · kayıt: atlama kalıcı, eski kayıt güvenli', () => {
  it('taze oyun öğreticiyle başlar', () => {
    withStorage(() => {
      useGame.getState().hardReset();
      const s = useGame.getState();
      expect(s.ogreticiAtlandi).toBe(false);
      expect(adim(cardQuestIndex(s), { atlandi: s.ogreticiAtlandi, yurudu: yurudu(s.player, LAYOUT.player) })).toBe('yuru');
    });
  });

  it('"Atla" kayda yazılır, yeniden açılışta öğretici dönmez', () => {
    expect(Object.keys(defaultSave())).toContain('ogreticiAtlandi');
    withStorage((mem) => {
      useGame.getState().hardReset();
      useGame.getState().ogreticiAtla();
      expect(JSON.parse(mem[KEY]).ogreticiAtlandi).toBe(true);
      useGame.getState().init();
      expect(useGame.getState().ogreticiAtlandi).toBe(true);
      // Sıfırlama yeni bir oyundur: öğretici geri gelir.
      useGame.getState().hardReset();
      expect(useGame.getState().ogreticiAtlandi).toBe(false);
    });
  });

  it('alanı taşımayan eski kayıt patlamaz (false okunur, sürüm aynı)', () => {
    const eski = { ...defaultSave() } as Record<string, unknown>;
    delete eski.ogreticiAtlandi;
    withStorage(() => {
      useGame.getState().init();
      expect(useGame.getState().ogreticiAtlandi).toBe(false);
    }, { [KEY]: JSON.stringify(eski) });
  });
});

describe('E5 · sunum: ekranı kesmez, dünyaya yapışık, tek kaynaktan', () => {
  const css = oku('src/components/ui/hud.css');
  const blok = css.slice(css.indexOf('E5 · ÖĞRETİCİ'));

  it('kap dokunmayı geçirir, yalnız "Atla" dokunur; karartma yok', () => {
    const kap = blok.slice(blok.indexOf('.ogretici {'), blok.indexOf('.ogretici-satir {'));
    expect(kap).toMatch(/pointer-events:\s*none/);
    expect(kap).not.toMatch(/background/);
    const atla = blok.slice(blok.indexOf('.ogretici-atla {'), blok.indexOf('.ogretici-el-alan'));
    expect(atla).toMatch(/pointer-events:\s*auto/);
  });

  it('hareket yalnız transform/opacity ile ve azaltılmış harekete saygılı', () => {
    for (const kf of ['ogreticiEl', 'ogreticiSurukle', 'ogreticiTaban']) {
      const i = blok.indexOf(`@keyframes ${kf}`);
      expect(i, kf).toBeGreaterThan(0);
      const govde = blok.slice(i, blok.indexOf('@keyframes', i + 5) > 0 ? blok.indexOf('@keyframes', i + 5) : blok.indexOf('@media', i));
      const ozellikler = [...govde.matchAll(/([a-z-]+):\s/g)].map((m) => m[1]);
      expect(new Set(ozellikler), kf).toEqual(new Set(['opacity', 'transform']));
    }
    expect(blok).toMatch(/prefers-reduced-motion/);
  });

  it('HUD öğreticiyi kanaldan çizer; Scene iz ve kenar okunu aynı hedeften besler', () => {
    const hud = oku('src/components/ui/HUD.tsx');
    expect(hud).toMatch(/kanal === 'ogretici' && ogreticiAdim/);
    expect(hud).toMatch(/ogreticiHazir: (!kat2de && )?ogreticiAdim != null/);
    const scene = oku('src/components/three/Scene.tsx');
    expect(scene).toMatch(/ogretici \?\? questFocusPos\(/);
    expect(scene).toMatch(/<OgreticiIz \/>/);
    // İz hedefi kendisi hesaplamaz: QuestPointer'ın yazdığı `activeStep`i okur.
    expect(oku('src/components/three/OgreticiIz.tsx')).toMatch(/activeStep\.x - p\[0\]/);
  });
});
