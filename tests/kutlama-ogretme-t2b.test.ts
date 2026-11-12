/**
 * kutlama-ogretme-t2b.test.ts — T2b BEKÇİSİ: KUTLAMA · FARKINDALIK · ÖĞRETME
 * (G-58 · G-62 · G-63 · G-64 · G-81 · 2026-09-18).
 *
 * Bu turun kalemleri "görsel" ama hiçbiri süsleme değil; her biri kullanıcının ekranda
 * **göremediği** bir şeyin karşılığı:
 *   G-58 — görev bittiğini göz kaçırıyordu (tamamlanma yalnız RENK değişimiydi, hiç hareket yoktu).
 *   G-62 — bir şey tamamlanınca ilgili sekme sessiz kalıyordu.
 *   G-81 — hazır ödül panelin ortasında/altında kalıyordu; rozet "bir şey var" diyor, panel nerede
 *          olduğunu söylemiyordu.
 *   G-63 — bulaşık mekaniği hiç öğretilmeden "3 bulaşık yıka" görevi geliyordu.
 *   G-64 — karakter spotlight'ı ekranı karartıyor ama HİÇBİR ŞEY YAZMIYORDU.
 *
 * Görsel bir efektin "güzel" olduğu test edilemez; **var olduğu, bir kez çaldığı ve doğru koşula
 * bağlı olduğu** edilebilir. Bu dosya onu tutar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig as C } from '../src/config/economy.config';
import { goalViewsForPanel, type GoalMetrics } from '../src/game/goals';
import { ekranKanali, type EkranGirdisi } from '../src/game/ekranKanali';
import { defaultSave } from '../src/game/save';
import { useGame } from '../src/game/store';

const oku = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = () => oku('src/components/ui/hud.css');
const hud = () => oku('src/components/ui/HUD.tsx');

const KEY = 'kiraathane.save';
function withStorage(fn: () => void): void {
  const mem: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  const orig = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  try { fn(); } finally { if (orig === undefined) delete g.localStorage; else g.localStorage = orig; }
}

describe('G-58 · görev bitişi bir AN, bir hâl değil', () => {
  it('tamamlanan bant kendi kutlama animasyonunu oynatır', () => {
    const blok = css().slice(css().indexOf('\n.band.done {'), css().indexOf('@keyframes bandSweep'));
    expect(blok, 'tamamlanma yalnız renk değişimi olmamalı').toMatch(/animation:\s*bandDone/);
    expect(css()).toMatch(/@keyframes bandDone/);
  });

  it('kutlama BİR KEZ çalar (birikmez)', () => {
    // `infinite` olsaydı bant kutlama penceresi boyunca sallanıp dururdu.
    const blok = css().slice(css().indexOf('\n.band.done {'), css().indexOf('@keyframes bandDone'));
    expect(blok).not.toMatch(/animation:[^;]*infinite/);
    expect(blok).toMatch(/animation:\s*bandDone[^;]*\s1\s/);
  });

  it('kutlama süresi geçiş penceresine SIĞAR (yarıda kesilmez)', () => {
    // Pencere = QUEST_COMPLETE_DUR + QUEST_GAP_DUR. Animasyon ondan uzun olsaydı, yeni görevin
    // kartı gelirken kutlama hâlâ oynuyor olurdu — G-41'in ("tebrik yeni görevin üstünde kalıyor")
    // tam olarak kendisi.
    const pencere = 0.5 + 0.8; // rules.ts: QUEST_COMPLETE_DUR + QUEST_GAP_DUR
    const sureler = [...css().matchAll(/animation:\s*(?:bandDone|bandSweep|onayPop)\s+([\d.]+)s(?:\s+[^;]*?\s([\d.]+)s)?/g)]
      .map((m) => Number(m[1]) + (m[2] ? Number(m[2]) : 0));
    expect(sureler.length, 'üç katman da bulunmalı').toBeGreaterThanOrEqual(3);
    for (const sn of sureler) expect(sn).toBeLessThan(pencere);
  });

  it('taşan ışık bandın dışına çıkmaz ve bu DURUMA bağlı değil', () => {
    // `overflow` yalnız `.done`da olsaydı iki hâl farklı kutu boyardı (titreme).
    const bant = css().slice(css().indexOf('\n.band {'), css().indexOf('@keyframes bandIn'));
    expect(bant).toMatch(/overflow:\s*hidden/);
  });
});

describe('G-62 / G-81 · kutlama halkası: bir kez çalar, talimatı yutmaz', () => {
  it('halka iki tekrarla durur — sonsuz nabız DEĞİL', () => {
    const blok = css().slice(css().indexOf('.navtab.kutla'), css().indexOf('@keyframes navKutlaIkon'));
    expect(blok).toMatch(/animation:\s*navKutla[^;]*\s2\s/);
    expect(blok).not.toMatch(/animation:[^;]*infinite/);
  });

  it('`spot` (talimat) varken kutlama ÇİZİLMEZ — ekran iki şey birden söylemez', () => {
    // Seçici `:not(.spot)` taşımazsa iki halka üst üste biner.
    expect(css()).toMatch(/\.navtab\.kutla:not\(\.spot\)/);
  });

  it('Görevler ve Hedefler sekmesi YALNIZ hazır ödülde kutlar (hat görevi bitişi sekmeyi yakmaz)', () => {
    const k = hud();
    expect(k).toMatch(/id="quests"[\s\S]{0,320}kutla=\{dailyReady\}/);
    expect(k).not.toMatch(/kutla=\{gecisPenceresi\}/);
    expect(k).toMatch(/id="goals"[\s\S]{0,320}kutla=\{goalsReady\}/);
  });

  it('kutlama için yeni bir zamanlayıcı/sayaç eklenmedi (bayrak var olandan türer)', () => {
    // Zamanlayıcı eklenseydi `bitisGorunur` gibi ikinci bir setState-in-effect doğardı.
    const k = hud();
    expect(k).toMatch(/const gecisPenceresi = questInTransition\(/);
    expect(k).not.toMatch(/setKutla|kutlamaTimer|setTimeout\([^)]*kutla/);
  });
});

describe('G-81 · hazır ödül panelin ÜSTÜNDE', () => {
  const metrics: GoalMetrics = { served: 0, pads: 0, lifetime: 0, dishes: 0, masterTables: 0 };

  it('toplanabilir kategoriler başa gelir', () => {
    // İlk kategorinin ilk kademesini geçecek kadar sayaç ver; o kategori "claimable" olur.
    const kats = C.goals.categories;
    expect(kats.length).toBeGreaterThan(1);
    const son = kats[kats.length - 1];
    const m: GoalMetrics = { ...metrics, [son.metric]: son.tiers[0] } as GoalMetrics;
    const sirali = goalViewsForPanel(m, []);
    expect(sirali[0].state, 'hazır ödül ilk satırda olmalı').toBe('claimable');
    expect(sirali[0].categoryId).toBe(son.id);
  });

  it('hazır ödül yokken config sırası KORUNUR (panel her bakışta değişmez)', () => {
    const sirali = goalViewsForPanel(metrics, []);
    expect(sirali.map((g) => g.categoryId)).toEqual(C.goals.categories.map((c) => c.id));
  });

  it('panel bu sıralamayı gerçekten kullanıyor', () => {
    expect(hud()).toMatch(/goalViewsForPanel\(metrics, goalsClaimed\)/);
  });
});

describe('G-63 · bulaşık döngüsü ÖĞRETİLİR, görevle birlikte dayatılmaz', () => {
  const bos: EkranGirdisi = {
    cevrimdisiVar: false,
    ustaVar: false,
    panelAcik: false,
    bildirimVar: false,
    gecisPenceresi: false,
    bulasikOgretmeHazir: false,
    karakterIpucuHazir: false,
    tepsiIpucuHazir: false,
  };

  it('öğretme kartı ipucuların ÖNÜNDE gelir', () => {
    expect(ekranKanali({ ...bos, bulasikOgretmeHazir: true, tepsiIpucuHazir: true, karakterIpucuHazir: true }))
      .toBe('ogretme-bulasik');
  });

  it('ama kutlama/bildirim penceresinde yine SIRA BEKLER', () => {
    expect(ekranKanali({ ...bos, bulasikOgretmeHazir: true, gecisPenceresi: true })).toBeNull();
    expect(ekranKanali({ ...bos, bulasikOgretmeHazir: true, bildirimVar: true })).toBeNull();
  });

  it('modalların altında kalır (çevrimdışı ve Usta önce)', () => {
    expect(ekranKanali({ ...bos, bulasikOgretmeHazir: true, cevrimdisiVar: true })).toBe('cevrimdisi');
    expect(ekranKanali({ ...bos, bulasikOgretmeHazir: true, ustaVar: true })).toBe('usta');
  });

  it('kart bulaşık GÖREVİNE bağlı ve bir kez görülür', () => {
    const k = hud();
    expect(k).toMatch(/bulasikOgretmeHazir: (!kat2de && )?quest\?\.target\.type === 'washDish' && !washTipSeen/);
    expect(k).toMatch(/onClose=\{markWashTipSeen\}/);
  });

  it('kart açılırken kamera bulaşığa çevrilir (kullanıcı: "oraya birden zoom yapar")', () => {
    expect(hud()).toMatch(/onShow=\{focusDish\}/);
    // Hedef koordinatı koda gömülmez, yerleşimden okunur.
    expect(oku('src/game/store.ts')).toMatch(/servicePlace\(get\(\)\.areasOpen\)\.dish/);
  });

  it('yazı hedefin ÜSTÜNÜ ÖRTMEZ: kart üst bantta, ekranın ortasında değil', () => {
    const blok = css().slice(css().indexOf('\n.ogretme {'), css().indexOf('@keyframes ogretmeIn'));
    expect(blok, 'üstten konumlanmalı').toMatch(/top:\s*calc\(var\(--sat\)/);
    expect(blok, 'tam ekran perde OLMAMALI').not.toMatch(/inset:\s*0/);
  });

  it('`washTipSeen` kayıtta durur (additive alan; sürüm artmaz)', () => {
    expect(Object.keys(defaultSave())).toContain('washTipSeen');
    withStorage(() => {
      useGame.getState().hardReset();
      expect(useGame.getState().washTipSeen).toBe(false);
      useGame.getState().markWashTipSeen();
      useGame.getState().init();
      expect(useGame.getState().washTipSeen, 'kart bir daha çıkmamalı').toBe(true);
    });
  });

  it('alanı taşımayan eski kayıt patlamaz (false okunur)', () => {
    const eski = { ...defaultSave() } as Record<string, unknown>;
    delete eski.washTipSeen;
    const mem: Record<string, string> = { [KEY]: JSON.stringify(eski) };
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      useGame.getState().init();
      expect(useGame.getState().washTipSeen).toBe(false);
    } finally {
      if (orig === undefined) delete g.localStorage; else g.localStorage = orig;
    }
  });
});

describe('G-64 · spotlight artık KONUŞUYOR', () => {
  it('karartmanın yanında bir cümle var', () => {
    const k = hud();
    expect(k).toMatch(/data-testid="char-tip"/);
    // Cümle görev başlığını TEKRARLAMAZ: kare (`t2b-3`) ilk hâlde aynı hedefi iki kez yazıyordu
    // (kartta ve bandın içinde). Kart NEREDE yapılacağını söyler, NE yapılacağını bant söyler.
    expect(k).toMatch(/\{t\('Bu yükseltme'\)\} <u>\{t\('Çaycı'\)\}<\/u> \{t\('sekmesinde/);
    expect(k).not.toMatch(/char-tip[\s\S]{0,200}\{quest\?\.title/);
  });

  it('kart hedefi gösteren bir ok taşır (yazı ile hedef arasında çizgi)', () => {
    expect(css()).toMatch(/\.char-tip::after/);
    expect(css()).toMatch(/@keyframes charTipOk/);
  });

  it('yalnız spotlight kanalındayken çizilir (kendi koşulunu kurmaz)', () => {
    expect(hud()).toMatch(/\{spotlight && \(\s*<div className="char-tip"/);
  });
});

/**
 * TÜRKÇE BÜYÜK HARF — belgenin dili (2026-09-18, T2b'de yakalandı).
 *
 * CSS `text-transform: uppercase` çevirirken `<html lang>`e bakar. `lang="en"` kaldığı sürece
 * Türkçe "i" harfi "I"ya dönüyordu ve öğretme kartının başlığı ekranda **"BULAŞIK BIRIYOR"**
 * yazıyordu (kare: `docs/gorsel/ss/t2b-2-ogretme-bulasik.png` ilk hâli). Arayüzde yedi ayrı
 * yerde `uppercase` var; hepsi aynı kusuru taşıyordu ama içinde küçük "i" geçen bir metin
 * yazılana kadar GÖRÜNMEDİ — yani hata kodda üç yıldır duruyordu, testte değil ekranda çıktı.
 */
describe('Türkçe büyük harf · belgenin dili', () => {
  it('index.html Türkçe ilan eder (uppercase İ üretsin)', () => {
    expect(oku('index.html')).toMatch(/<html lang="tr">/);
  });

  it('uppercase kullanan her yer hâlâ var — kelepçe bu yüzden gerekli', () => {
    // Denetim körelmesin: `uppercase` tamamen kalkarsa yukarıdaki iddia anlamsızlaşır.
    const say = (oku('src/components/ui/hud.css').match(/text-transform:\s*uppercase/g) ?? []).length;
    expect(say).toBeGreaterThan(0);
  });
});
