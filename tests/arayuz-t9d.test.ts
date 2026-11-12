/**
 * arayuz-t9d.test.ts — T9d ARAYÜZ/METİN BEKÇİSİ (D-146 §B · §C · K1 · K2 · K3 · K6 · K9 → D-148).
 *
 * Mantık tarafı saf fonksiyonla (para biçimi · görünen cüzdan · tepsi ipucu anı · çok-adımlı sayaç ·
 * görev tutarı); sunum tarafı kaynak metinle (duman testi DURUMU doğrular, sahneyi değil — CLAUDE.md).
 * Mutasyon sınavı: `tools/mutasyon-arayuz-t9d.mjs`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fmt, sayi, D } from '../src/game/decimal';
import { gorunenCuzdan } from '../src/game/store';
import { tepsiIpucuZamani } from '../src/game/ekranKanali';
import { questView, type QuestCtx } from '../src/game/rules';
import { economyConfig as C } from '../src/config/economy.config';
import { defaultStats, defaultCharUpgrades, defaultWaiterUpgrades } from '../src/game/save';
import { masaEtiketi, ETIKET_SERVIS, ETIKET_USTA, markerFrame } from '../src/game/markerFrame';

const oku = (p: string) => readFileSync(p, 'utf8');
const HUD = oku('src/components/ui/HUD.tsx');
const CHAR = oku('src/components/ui/CharacterPanel.tsx');
const CSS = oku('src/components/ui/hud.css');
const SCENE = oku('src/components/three/Scene.tsx');
const PAD = oku('src/components/three/Pad.tsx');

const ctx = (tableLevels: number[]): QuestCtx => ({
  padsDone: [], stationLevels: [0], tableLevels, stats: defaultStats(), questBase: 0,
  charUpgrades: defaultCharUpgrades(), waiterUpgrades: defaultWaiterUpgrades(), lavaboLevel: 0,
});
const gorev = (id: string) => C.quests.find((q) => q.id === id)!;

describe('K2 — para tek biçimde', () => {
  it('küsurat yok, < 1 Mn tam + binlik, ≥ 1 Mn tek ondalık kısaltma (aşağı yuvarlanır)', () => {
    expect(fmt(D(0))).toBe('0');
    expect(fmt(D(273.33))).toBe('273');
    expect(fmt(D(9950))).toBe('9.950');
    expect(fmt(D(999_999.99))).toBe('999.999');
    expect(fmt(D(1_000_000))).toBe('1 Mn');
    expect(fmt(D(1_999_999))).toBe('1,9 Mn');
    expect(fmt(D(3.4e12))).toBe('3,4 Tn');
    expect(fmt(9950)).toBe('9.950'); // ham sayı da kabul (zemin/bant/ödül)
  });
  it('para olmayan ondalık Türkçe ayraçla', () => {
    expect(sayi(2.6)).toBe('2,6');
    expect(sayi(4.65)).toBe('4,65');
  });
  it('ekrandaki para yolları biçimleyiciden geçiyor — ham toLocaleString/String(remaining) yok', () => {
    expect(HUD).not.toMatch(/toLocaleString\('tr-TR'\)\}/);
    expect(HUD).not.toMatch(/Math\.round\(notice\.reward\)/);
    expect(HUD).not.toMatch(/\+\{quest\.reward\}/);
    expect(SCENE).not.toMatch(/sub=\{String\(remaining\)\}/);
    expect(PAD).toMatch(/sub=\{fmt\(remaining\)\}/);
    expect(CHAR).not.toMatch(/fmt\(D\(/);
  });
});

describe('B7 — çok-adımlı durum görevinde sayaç', () => {
  it('"2 masayı Seviye 3\'e çıkar" 0/2 → 1/2 → 2/2', () => {
    const q = gorev('q_tableL2x2');
    expect(questView(q, ctx([0, 0, 0, 0]))).toMatchObject({ cur: 0, total: 2 });
    expect(questView(q, ctx([2, 1, 0, 0]))).toMatchObject({ cur: 1, total: 2 });
    expect(questView(q, ctx([3, 2, 5, 0]))).toMatchObject({ cur: 2, total: 2 });
  });
  it('alanlı görev yalnız o alanın masalarını sayar', () => {
    const q = gorev('q_z1allL4');
    const lv = Array(12).fill(0);
    lv[0] = 4; lv[1] = 4; lv[5] = 4; // 5. slot başka salonda
    expect(questView(q, ctx(lv))).toMatchObject({ cur: 2, total: 4 });
  });
  it('tek-adımlı durum görevi sayaçsız kalır (kart maliyet ya da "Hedefe git" gösterir)', () => {
    expect(questView(gorev('q_tableL2'), ctx([0]))).toMatchObject({ cur: null, total: null });
  });
});

describe('B8 — bant zeminle aynı tutarı yazar', () => {
  it('pad görevinde bant KALANI (maliyet − dolum) gösterir', () => {
    expect(HUD).toMatch(/function gorevTutari/);
    expect(HUD).toMatch(/q\.cost - \(padFills\[q\.target\.id\] \?\? 0\)/);
    // D-175: alt bant artık tutar yazmıyor (sağda ödül); tek çağrı yeri Görevler paneli.
    expect(HUD).not.toMatch(/fmt\(gorevTutari\(s\.quest, s\.padFills\) \?\? 0\)/);
    expect(HUD).toMatch(/fmt\(gorevTutari\(quest, padFills\) \?\? 0\)/);
  });
});

describe('B11 — çevrimdışı ₺ "Al"dan sonra görünür', () => {
  it('ödül ekranı açıkken görünen cüzdan ödülü içermez, "Al" sonrası içerir', () => {
    expect(gorunenCuzdan({ wallet: D(24_785), offlineEarned: 4_000 }).toNumber()).toBe(20_785);
    expect(gorunenCuzdan({ wallet: D(24_785), offlineEarned: 0 }).toNumber()).toBe(24_785);
    expect(gorunenCuzdan({ wallet: D(100), offlineEarned: 500 }).toNumber()).toBe(0); // eksiye düşmez
  });
  it('üst şerit ve panel cüzdanı görünen değeri çiziyor', () => {
    expect(HUD).toMatch(/fmt\(gorunenCuzdan\(\{ wallet: s\.wallet, offlineEarned: s\.offlineEarned \}\)\)/);
    expect(oku('src/components/ui/Sheet.tsx')).toMatch(/fmt\(gorunenCuzdan\(\{ wallet, offlineEarned \}\)\)/);
  });
});

describe('B2 — tepsi ipucu doğru anda', () => {
  const cay = (state: string) => ({ state, product: 'tea' });
  it('ilk servis yapılmadan hiç çıkmaz', () => {
    expect(tepsiIpucuZamani({ tray: 1, trayFood: 0, teasServed: 0, npcs: [] })).toBe(false);
  });
  it('elindeki ürünü isteyen (ya da yolda gelen) müşteri varken çıkmaz', () => {
    expect(tepsiIpucuZamani({ tray: 1, trayFood: 0, teasServed: 3, npcs: [cay('waitingForTea')] })).toBe(false);
    expect(tepsiIpucuZamani({ tray: 1, trayFood: 0, teasServed: 3, npcs: [cay('toTable')] })).toBe(false);
  });
  it('isteyen kalmadıysa çıkar — başka ürün isteyen müşteri sayılmaz', () => {
    expect(tepsiIpucuZamani({ tray: 1, trayFood: 0, teasServed: 3, npcs: [cay('drinking')] })).toBe(true);
    expect(tepsiIpucuZamani({ tray: 1, trayFood: 0, teasServed: 3, npcs: [{ state: 'waitingForTea', product: 'tost' }] })).toBe(true);
  });
  it('tepsi boşsa çıkmaz', () => {
    expect(tepsiIpucuZamani({ tray: 0, trayFood: 0, teasServed: 3, npcs: [] })).toBe(false);
  });
  it('HUD kanalı bu fonksiyondan besleniyor', () => {
    expect(HUD).toMatch(/tepsiIpucuHazir: (!kat2de && )?tepsiAni && !trayTipSeen/);
  });
});

describe('B1 — ipucu açıkken ilk dokunuş sekmeye gider', () => {
  it('gezinme ve sağ yığın karartmanın (30) üstüne çıkar', () => {
    expect(HUD).toMatch(/className=\{`botnav\$\{spotlight \? ' spot-acik' : ''\}/); // D-177: ardından ' ekranda' gelebilir
    expect(HUD).toMatch(/className=\{`side-stack\$\{traySpot \? ' spot-acik' : ''\}`\}/);
    const kural = CSS.match(/\.botnav\.spot-acik,\s*\.side-stack\.spot-acik \{[^}]*\}/)?.[0] ?? '';
    const z = Number(kural.match(/z-index:\s*(\d+)/)?.[1]);
    const perde = Number(oku('src/index.css').match(/\.spotlight-backdrop \{[^}]*z-index:\s*(\d+)/)?.[1]
      ?? CSS.match(/\.spotlight-backdrop \{[^}]*z-index:\s*(\d+)/)?.[1]);
    expect(z).toBeGreaterThan(perde);
  });
});

describe('B4 — garson görevi Garson sekmesinde açılır', () => {
  it('panel başlangıç sekmesini alır, HUD garson görevinde waiter verir', () => {
    expect(CHAR).toMatch(/useState<Tab>\(ilkSekme\)/);
    expect(HUD).toMatch(/quest\?\.target\.type === 'waiterTray' \|\| quest\?\.target\.type === 'waiterSpeed' \? 'waiter' : 'player'/);
  });
});

describe('B9 — bildirim sağ düğmeye binmez, kesilmez', () => {
  it('kutu iki yandan yığın şeridi kadar dar, metin iki satıra kırılır', () => {
    const kural = CSS.match(/\.notice \{\s*bottom:[^}]*\}/)?.[0] ?? '';
    expect(kural).toMatch(/max-width: min\(380px, calc\(100% - 2 \* \(max\(var\(--sal\), var\(--sar\)\) \+ 62px\)\)\)/);
    expect(kural).toMatch(/width: max-content/);
    expect(CSS).toMatch(/\.notice \.notice-text \{[^}]*-webkit-line-clamp: 2/);
  });
});

describe('B12 — sönük alım nedenini söyler', () => {
  it('Çaycı panelindeki her alım satırı ve Usta "eksik" yazar; mağaza YAZMAZ (2026-10-13)', () => {
    expect((CHAR.match(/<Eksik cost=/g) ?? []).length).toBe(5);
    // Kullanıcı: mağazadaki "{1} eksik" ekstra satır açıyordu — fiyat ad satırında ve düğmede zaten yazılı.
    expect(HUD).not.toMatch(/shop-eksik/);
    expect(HUD).toMatch(/\{!yeter && \(/);
  });
});

describe('B13 — dokunma hedefi ≥ 44 px', () => {
  it('dişli (34 px) görünmez kabukla 44 px', () => {
    expect(CSS).toMatch(/\.round-btn\.gear::before \{\s*inset: -5px;/);
    expect(CSS).toMatch(/\.round-btn::before,\s*\.switch::before,\s*\.goal-claim::before/);
  });
  it('alt gezinme etiketi 11 px değil', () => {
    expect(CSS).toMatch(/\.navtab-label \{\s*font-size: var\(--p2\)/);
  });
});

describe('K1 — hat sonu günlük görev bandı', () => {
  it('hat bitince (kutlama sonrası) bant günlük göreve döner', () => {
    expect(HUD).toMatch(/\) : \(\s*<GunlukBant onClick=\{\(\) => setSheet\('quests'\)\} \/>\s*\)\}/);
    expect(HUD).toMatch(/Bugünkü görevleri tamamladın — yenileri yarın/);
  });
});

describe('K3 — Sv 2-4 ekranı', () => {
  it('katlanacak ödül yoksa tek "Harika!", "İzle, 2×" gizli', () => {
    expect(HUD).toMatch(/const katlanir = amount > 0 \|\| diamonds > 0;/);
    expect(HUD).toMatch(/\{katlanir \? t\('Ücretsiz al'\) : t\('Harika!'\)\}/);
    expect(HUD).toMatch(/\{katlanir && onIzle && \(\s*<button\s+className=\{`sheet-cta ad/);
  });
});

describe('K6 · C3 — adlar ve yazım', () => {
  it('"Çaycı" ve "Seviye"; "Karakter" / "İtibar" / "Oyuncu" ekranda yok', () => {
    const metin = (k: string) => k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    for (const k of [metin(HUD), metin(CHAR)]) {
      expect(k).not.toMatch(/label="Karakter"|'Oyuncu'|İtibar \{|title="İtibar"|>\s*MAX\s*</);
    }
    expect(HUD).toMatch(/label=\{t\('Çaycı'\)\}/);
    expect(HUD).toMatch(/<b>\{t\('Seviye'\)\} \{lvl\.level\}<\/b>/);
  });
  it('yerdeki etiketler cümle düzeninde — harf sayısı (çerçeve/tetik) değişmedi', () => {
    expect(ETIKET_SERVIS).toBe('Yükselt');
    expect(ETIKET_USTA).toBe('Yükselt');
    expect(masaEtiketi(1)).toBe('Sv 2');
    expect(markerFrame('Yükselt', 0.85, true)).toEqual(markerFrame('YÜKSELT', 0.85, true));
    expect(markerFrame(masaEtiketi(1), 0.6, true)).toEqual(markerFrame('SV 2', 0.6, true));
  });
});

describe('K9 · C5 — ayarlar', () => {
  it('işlevsiz "Bildirimler" anahtarı yok; sıfırlama oyunun kendi onayında', () => {
    expect(HUD).not.toMatch(/testid="set-notifications"/);
    expect(HUD).not.toMatch(/window\.confirm\(/);
    expect(HUD).toMatch(/data-testid="reset-confirm"/);
    expect(HUD).toMatch(/if \(sifirlaSor\) return setSifirlaSor\(false\);/);
  });
});

describe('q_tost5 — 3 tost (D-148, `docs/tost-raporu-t9d.md` V3)', () => {
  it('hedef 3, başlık sayıyla aynı, kimlik kayıt için sabit', () => {
    const q = gorev('q_tost5');
    expect(q.target).toEqual({ type: 'serveTost', count: 3 });
    expect(q.title).toBe('3 tost servis et');
  });
});
