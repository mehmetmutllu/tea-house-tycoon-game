/**
 * ekran-kabugu.test.ts — **EKRAN YAPISININ BEKÇİSİ** (D-106 → S12).
 *
 * NE KORUYOR: S11 arayüzün DİLİNİ kilitledi (`mor-dil.test.ts`); bu tur YAPISINI kilitliyor.
 * D-106'nın beş yapı kararı var ve hepsinin ölçülmüş bir sebebi var — kural yazılı olsa bile
 * bir sonraki turda bir panel "bir kerecik" kendi kabuğunu kurabilir. S10'un dersi tam buydu:
 * `hud.css`in başında "tek dil" diyen bir yorum vardı ve hiçbir şeyi engellemiyordu.
 *
 * NE DENETLER:
 *   1  · TEK KABUK — her panel `Sheet`ten geçer; kimse kendi `modal-card`ını kurmaz.
 *   2  · K3 TAM EKRAN — kabuk ekranı doldurur; alt sayfa kabuğu (başlık kuşağı + ✕ + alttan
 *        açılma) geri GELMEZ. Ölçüm sebebi: beş ekran dört farklı yükseklikte açılıyordu.
 *   3  · ÜÇ BÖLGE — sol üstte geri · ortada başlık · sağ üstte cüzdan.
 *   4  · M2 MAĞAZA — vitrin ≥ 230 px, satın alma TEK düğme (eskiden üç bileşende üç düğme).
 *   5  · KESE HAP ÇERÇEVELİ (D-128) — para/elmas kutulu, iç halka para birimine göre renkli,
 *        dizilim ALT ALTA (yan yana uzun değerde ekranı aşıyordu).
 *   6  · G-05 — her görevin kısa LAKABI var ve band hem lakabı hem net hedefi çiziyor.
 *   7  · G-18 — masanın yükseltme noktası SEVİYEYİ yazıyor (havada kart YOK).
 *   8  · T2 — ikincil metin (`--tx2`) kartsız gövde zemininde durmaz. Bu test string
 *        eşleştirmiyor, WCAG oranını HESAPLIYOR: renkler değişirse de yakalar.
 *
 * DOĞRULANDI: 8 mutasyonla (aşağıdaki her maddeye bir tane) — sekizi de kırmızı yaktı.
 *
 * DEĞİŞTİRMEK İÇİN: yapı kararı kullanıcınındır → `decisions.md` → buradaki liste. Testi
 * susturarak geçme; kırması AMAÇTIR.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig } from '../src/config/economy.config';
import { masaEtiketi } from '../src/game/markerFrame';

const INDEX = 'src/index.css';
const HUD_CSS = 'src/components/ui/hud.css';
const HUD = 'src/components/ui/HUD.tsx';
const SHEET = 'src/components/ui/Sheet.tsx';
const CHAR = 'src/components/ui/CharacterPanel.tsx';
const SCENE = 'src/components/three/Scene.tsx';

const oku = (p: string) => readFileSync(p, 'utf8');
const yorumsuz = (k: string) => k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/** Bir CSS kuralının gövdesi (ilk eşleşme). Seçici birebir yazılır. */
function kural(css: string, secici: string): string {
  const i = css.indexOf(`\n${secici} {`);
  if (i < 0) return '';
  return css.slice(i + secici.length + 3, css.indexOf('}', i));
}

// ── WCAG yardımcıları — `tools/shot-ui-s10.mjs`taki formülün aynısı (iki araç aynı şeyi ölçsün).
type Rgb = [number, number, number];
const hexRgb = (h: string): Rgb => {
  const s = h.length === 4 ? h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(1, 7);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const kanal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const parlaklik = ([r, g, b]: Rgb) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
const oran = (a: Rgb, b: Rgb) => {
  const [x, y] = [parlaklik(a) + 0.05, parlaklik(b) + 0.05];
  return x > y ? x / y : y / x;
};

/** `:root` token sözlüğü — renkler TEK kaynaktan okunur, teste kopyalanmaz. */
function tokenlar(): Record<string, string> {
  const kok = oku(INDEX);
  const blok = kok.slice(kok.indexOf(':root {'), kok.indexOf('}', kok.indexOf(':root {')));
  const out: Record<string, string> = {};
  for (const m of blok.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** `var(--x)` / `linear-gradient(180deg, var(--a), var(--b))` → ilk renk durağı (üst uç). */
function ilkRenk(deger: string, tok: Record<string, string>): Rgb | null {
  const m = deger.match(/var\((--[\w-]+)\)|#[0-9a-fA-F]{3,6}/);
  if (!m) return null;
  const ham = m[1] ? tok[m[1]] : m[0];
  if (!ham) return null;
  return ham.startsWith('#') ? hexRgb(ham) : ilkRenk(ham, tok);
}

describe('ekran kabuğu — K3 (D-106)', () => {
  it('1 · beş ekranın beşi de TEK kabuktan (Sheet) geçer', () => {
    // Kabuğu Sheet kuruyorsa `testid` bir PROP'tur; bir panel kendi kabuğunu kurarsa aynı ad
    // `data-testid` olarak ham bir div'e düşer. Ayrım tam burada okunuyor.
    const kod = yorumsuz(oku(HUD)) + yorumsuz(oku(CHAR));
    for (const ekran of ['quests-panel', 'goals-panel', 'shop-panel', 'char-panel', 'menu']) {
      expect(kod, `${ekran} Sheet kabuğunu kullanmıyor`).toContain(`testid="${ekran}"`);
      expect(kod, `${ekran} kendi kabuğunu kuruyor`).not.toContain(`data-testid="${ekran}"`);
    }
    // Ham modal kabuğu yalnız GERÇEK modallerin hakkı — ödül ekranı + sıfırlama onayı (C5 · T9d,
    // `window.confirm`in yerini aldı) + teklif + alım kartı (F4c-4) — panellerin değil.
    expect([...yorumsuz(oku(HUD)).matchAll(/className="modal-backdrop"/g)].length, "ödül + sıfırlama onayı + başlangıç teklifi (F4c) + alım kartı (F4c-4)").toBe(4);
    expect(yorumsuz(oku(CHAR))).not.toContain('modal-backdrop');
  });

  it('2 · kabuk TAM EKRAN; alt sayfa kabuğu geri gelmez', () => {
    const css = yorumsuz(oku(HUD_CSS));
    const ekran = kural(css, '.modal-card.screen');
    expect(ekran, '.modal-card.screen kuralı yok').not.toBe('');
    expect(ekran).toMatch(/height:\s*100%/);
    expect(ekran).toMatch(/max-height:\s*none/);
    expect(ekran).toMatch(/border-radius:\s*0/);
    // Alt sayfanın izleri: başlık kuşağı, ✕ düğmesi, alttan açılma animasyonu.
    for (const iz of ['.sheet-head', '.sheet-x', 'sheetIn', '.sheet-backdrop']) {
      expect(css, `alt sayfa kabuğu geri gelmiş: ${iz}`).not.toContain(iz);
    }
    // Perde de kalktı: kart her şeyi örtüyor, alta hizalama ve blur yalnız telefonu yoruyordu.
    // (`align-items: flex-end` genel olarak yasak DEĞİL — `.purse` onu haklı olarak kullanıyor.)
    const perde = kural(css, '.screen-backdrop');
    expect(perde, '.screen-backdrop kuralı yok').not.toBe('');
    expect(perde).toMatch(/align-items:\s*stretch/);
  });

  it('2b · D-177: alt menüdeki dört ekranda menü açık kalır, geri oku yerine ✕; Ayarlar geri okunu korur', () => {
    const sheet = yorumsuz(oku(SHEET));
    // Kapatma işareti (kullanıcı 2026-11-12): sekme ekranında geri oku yerine ✕.
    expect(sheet).toMatch(/navda \? \(\s*<button className="sheet-back sheet-kapat"[^>]*>\s*<CloseIcon/);
    const hud = yorumsuz(oku(HUD));
    for (const id of ['quests-panel', 'goals-panel', 'shop-panel']) {
      expect(hud, `${id} menü-üstü değil`).toMatch(new RegExp(`testid="${id}" onClose=\{onClose\} navda>`));
    }
    expect(yorumsuz(oku(CHAR))).toMatch(/testid="char-panel"\s+onClose=\{onClose\}\s+navda/);
    expect(hud).toMatch(/testid="menu"\s+onClose=/);
    expect(hud).not.toMatch(/testid="menu"[^>]*navda/);
    // Menü ekranın ÜSTÜNDE (z 21 > zemin 20), ekrandan açılan pencereler menünün de üstünde (22);
    // gövdenin altında menünün gerçek boyu kadar pay var, boy canlı ölçülüyor.
    const css = yorumsuz(oku(HUD_CSS));
    expect(kural(css, '.botnav.ekranda:not(.spot-acik)')).toMatch(/z-index:\s*21/);
    expect(kural(css, '.modal-backdrop:not(.screen-backdrop)')).toMatch(/z-index:\s*22/);
    expect(kural(css, '.screen-backdrop.navda .sheet-body')).toMatch(/var\(--nav-h/);
    expect(hud).toMatch(/setProperty\('--nav-h'/);
    expect(hud).toMatch(/sheet && sheet !== 'settings' \? ' ekranda'/);
  });

  it('3 · üç bölge: sol üstte geri · ortada başlık · sağ üstte cüzdan', () => {
    const kod = yorumsuz(oku(SHEET));
    const sira = ['sheet-back', 'screen-title', 'screen-purse'].map((c) => kod.indexOf(c));
    expect(sira.every((i) => i >= 0), 'üç bölgeden biri eksik').toBe(true);
    expect(sira[0]).toBeLessThan(sira[1]);
    expect(sira[1]).toBeLessThan(sira[2]);
    // Cüzdan gerçekten cüzdan: tam ekran sahneyi örttüğü için para burada okunmalı.
    expect(kod).toMatch(/wallet/);
    expect(kod).toMatch(/diamonds/);
  });

  it('4 · M2: vitrin ≥ 230 px ve satın alma TEK düğme', () => {
    const vitrin = kural(yorumsuz(oku(INDEX)), '.preview-canvas');
    const h = Number(vitrin.match(/height:\s*(\d+)px/)?.[1] ?? 0);
    expect(h, 'M2 vitrini 230 px ister (ölçülen taban 74 px)').toBeGreaterThanOrEqual(230);
    const kod = yorumsuz(oku(HUD));
    expect([...kod.matchAll(/data-testid="shop-buy"/g)].length, 'mağazada tek satın alma').toBe(1);
    // Eski düzen: satın alma üç ayrı önizleme bileşeninin içindeydi.
    for (const p of ['src/components/ui/TableThemePreview.tsx', 'src/components/ui/DioramaPreview.tsx']) {
      expect(yorumsuz(oku(p)), `${p} — vitrin satın alma yapmaz`).not.toContain('buyCosmetic');
    }
  });

  /**
   * D-106'NIN YERİNİ D-128 ALDI ve bu test onunla birlikte döndü. Eski kural *"kese kutusuz,
   * okunabilirliği KONTUR taşır"* idi; R3 o kararın fiyatını ölçtü: kutusuz kolda kesenin
   * arkasındaki zemin sahnenin oynamasını neredeyse bire bir üstleniyordu (geçirme 0,979/0,999),
   * yani zemin hiçbir şeyi sabitlemiyordu. Kullanıcı hap çerçeveyi seçti (kol F).
   *
   * Test artık ÜÇ şeyi tutuyor ve üçü de ölçümden geliyor:
   *   · kesenin kutusu VAR (zemin + kontur) — yoksa geçirme 1,0'a geri döner,
   *   · iç halka para birimine göre renkli (altın ↔ buz bir bakışta ayrılır),
   *   · dizilim ALT ALTA kalır — yan yana dizilim 999.99M + 12.34K'da ekranı 42,7 px aşıyordu.
   */
  it('5 · kese HAP çerçeveli, kenarı para birimine göre renkli ve ALT ALTA (D-128)', () => {
    const css = yorumsuz(oku(HUD_CSS));
    const cur = kural(css, '.cur');
    expect(cur, '.cur kuralı yok').not.toBe('');
    for (const kutu of ['background', 'border', 'border-radius']) {
      expect(cur, `.cur kutusunu kaybetti: ${kutu} yok`).toContain(`${kutu}:`);
    }
    expect(kural(css, '.cur::before'), 'para kesesinin iç halkası --para değil').toContain('var(--para)');
    expect(kural(css, '.cur.gem::before'), 'elmas kesesinin iç halkası --elmas değil').toContain('var(--elmas)');
    // Yan yana dizilim ölçümde ekranı aşıyordu; kolon olması bir tercih değil sığma koşulu.
    expect(kural(css, '.purse'), 'kese yan yana dizildi — uzun değerde ekranı aşar').toContain(
      'flex-direction: column',
    );
    // Kontur da DURUYOR: kutu zemini sabitler, kontur açık zeminde okunurluğu taşır (iki katman).
    expect(yorumsuz(oku(INDEX)), 'kese yazısının konturu kalkmış').toMatch(
      /\.cur-val[\s\S]{0,400}?-webkit-text-stroke/,
    );
  });

  it('6 · G-05: her görevin lakabı var; band lakabı da net hedefi de çizer', () => {
    for (const q of economyConfig.quests) {
      expect(q.kicker, `${q.id} lakapsız`).toBeTruthy();
      expect(q.kicker.length, `${q.id} lakabı çok uzun (bant tek satır)`).toBeLessThanOrEqual(16);
      expect(q.title.length, `${q.id} hedefi çok uzun`).toBeGreaterThan(4);
    }
    const kod = yorumsuz(oku(HUD));
    // D-175: alt bant tek satırlık hap — lakap orada YOK (başlık yeri zaten söylüyor), sağda fiyat
    // değil ÖDÜL durur. Lakap Görevler ekranında yaşar.
    expect(kod).not.toContain('className="band-kicker"');
    expect(kod).not.toContain('data-testid="quest-cost"');
    expect(kod).toContain('className="band-title">{t(quest.title)}');
    expect(kod).toContain('data-testid="quest-reward"');
    // Görevler ekranındaki lakap da görevin kendisinden gelir (sabit "ŞU AN" değil).
    expect(kod).toContain('className="qbig-kicker">{t(quest.kicker)}');
  });

  it('7 · G-18: masanın yükseltme noktası SEVİYEYİ yazar (havada kart yok)', () => {
    // S24 (D-121): etiket artık Scene'de düz metin değil — `masaEtiketi` üretiyor, çünkü AYNI
    // metni `tick.ts` de okuyor (etiket uzunluğu çerçeve genişliğine, o da tetiğe giriyor).
    // Bu yüzden denetim kaynak metnine değil DAVRANIŞA bakar: üretilen yazı seviyeyi taşıyor mu
    // ve Scene gerçekten o üreticiyi mi çağırıyor.
    expect(masaEtiketi(0)).toBe('Sv 1');
    expect(masaEtiketi(11)).toBe('Sv 12');
    const kod = yorumsuz(oku(SCENE));
    expect(kod, 'masa noktası seviyeyi taşımalı').toMatch(/label=\{masaEtiketi\(lvl\)\}/);
  });

  it('8 · T2: ikincil metin (--tx2) kartsız gövde zemininde DURMAZ (WCAG AA ≥ 4,5)', () => {
    const tok = tokenlar();
    const tx2 = ilkRenk('var(--tx2)', tok);
    expect(tx2, '--tx2 token\'ı yok').not.toBeNull();

    // S12 taban ölçümünde AA altında kalan BEŞ sınıf — hepsinin sebebi aynıydı: zeminsizlik.
    const hedefler: [string, string][] = [
      [HUD_CSS, '.sheet-sec'],
      [HUD_CSS, '.sheet-foot-note'],
      [HUD_CSS, '.qrow.next'],
      [INDEX, '.char-stat'],
      [INDEX, '.shop-locked'],
    ];
    for (const [dosya, sec] of hedefler) {
      const govde = kural(yorumsuz(oku(dosya)), sec);
      expect(govde, `${sec} kuralı yok`).not.toBe('');
      const bg = govde.match(/background:\s*([^;]+)/)?.[1];
      expect(bg, `${sec} zeminsiz — ikincil metin gövde gradyanında kalıyor`).toBeTruthy();
      const zemin = ilkRenk(bg!, tok);
      expect(zemin, `${sec} zemini çözülemedi: ${bg}`).not.toBeNull();
      expect(oran(tx2!, zemin!), `${sec} — --tx2 bu zeminde AA'yı geçmiyor`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
