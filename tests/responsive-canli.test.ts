/**
 * responsive-canli.test.ts — RESPONSIVE DALLARIN BEKÇİSİ (D-131).
 *
 * NEDEN VAR: F1b tur 2 ölçümü `index.css`'in iki responsive dalının da **ölü kod** olduğunu
 * buldu — dar-ekran dalında 15 seçiciden 2'si, kısa-yatay dalında 18'den 3'ü canlıydı.
 * Sebep `fc061a0` (2026-09-06, "Arayüz v2"): HUD yeniden adlandırıldı, medya sorguları
 * onunla birlikte gelmedi. **Ölü CSS hata vermez** — sessizce hiçbir şey yapmaz, o yüzden
 * on bir gün fark edilmedi ve tur 1'in *"alt bant her yönde 186 px sabit"* bulgusunun sebebi
 * oldu.
 *
 * Bu testin tek işi aynı sessiz çürümeyi bir daha imkânsız kılmak. İki kolu var ve İKİSİ DE
 * gerekli:
 *   ① CANLILIK — medya sorgularındaki her sınıf seçicisi hâlâ bir TSX dosyasında geçmeli.
 *      (Sınıf yeniden adlandırılır, sorgu güncellenmezse burası kırılır.)
 *   ② YER — `.band`/`.botnav`/`.screen-top`/`.sheet-body` gibi taban kuralları `hud.css`'te
 *      olan seçiciler `index.css`'in medya sorgularında YAZILMAMALI. `hud.css` daha sonra
 *      yükleniyor (HUD.tsx içinden) ve medya sorgusu özgüllük eklemiyor; oraya yazılan kural
 *      sessizce eziliyor. Bu da D-131'de canlı ölçümle yakalandı: `transform` uygulanıyor,
 *      `left` uygulanmıyordu — yani kuralın yarısı işliyordu, yarısı değil.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Tüm TSX/TS kaynağını tek metinde topla — `className` içindeki adları burada arayacağız. */
function kaynakMetni(): string {
  const parcalar: string[] = [];
  const gez = (d: string) => {
    for (const g of fs.readdirSync(d, { withFileTypes: true })) {
      const tam = path.join(d, g.name);
      if (g.isDirectory()) gez(tam);
      else if (/\.tsx?$/.test(g.name)) parcalar.push(fs.readFileSync(tam, 'utf8'));
    }
  };
  gez(path.join(KOK, 'src'));
  return parcalar.join('\n');
}

/** Bir CSS metnindeki @media bloklarını (gövdeleriyle) çıkar. */
export function medyaBloklari(css: string): { sorgu: string; govde: string }[] {
  const cikti: { sorgu: string; govde: string }[] = [];
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let derinlik = 1;
    let i = re.lastIndex;
    while (i < css.length && derinlik > 0) {
      if (css[i] === '{') derinlik++;
      else if (css[i] === '}') derinlik--;
      i++;
    }
    cikti.push({ sorgu: m[1].trim(), govde: css.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return cikti;
}

/** Gövdedeki sınıf seçicilerini topla (yorumlar ve bildirim gövdeleri hariç). */
export function sinifSecicileri(govde: string): string[] {
  const temiz = govde
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{[^{}]*\}/g, '{}'); // bildirim gövdelerini boşalt (değer içindeki nokta sayılmasın)
  const adlar = new Set<string>();
  for (const m of temiz.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) adlar.add(m[1]);
  return [...adlar];
}

const TSX = kaynakMetni();
const gecerMi = (sinif: string) => new RegExp(`\\b${sinif.replace(/-/g, '-')}\\b`).test(TSX);

const CSS_DOSYALARI = [
  'src/index.css',
  'src/components/ui/hud.css',
  'src/components/ui/devSandbox.css',
].map((r) => ({ yol: r, metin: fs.readFileSync(path.join(KOK, r), 'utf8') }));

describe('① medya sorgularındaki her sınıf CANLI olmalı', () => {
  for (const { yol, metin } of CSS_DOSYALARI) {
    for (const { sorgu, govde } of medyaBloklari(metin)) {
      // Renk şeması sorguları jeton tanımlar, sınıf hedeflemez — onları atla.
      if (/prefers-color-scheme|prefers-reduced-motion/.test(sorgu)) continue;
      it(`${yol} · @media ${sorgu}`, () => {
        const olu = sinifSecicileri(govde).filter((s) => !gecerMi(s));
        expect(olu, `bu sınıflar hiçbir TSX'te geçmiyor (ölü kural): ${olu.join(', ')}`).toEqual([]);
      });
    }
  }
});

/**
 * `hud.css`'te taban kuralı olan sınıflar. Bunlara `index.css`'in medya sorgusundan dokunmak
 * SESSİZCE ETKİSİZDİR — kaynak sırası `hud.css`'i sonra yüklüyor.
 */
const HUD_SINIFLARI = (() => {
  const hud = CSS_DOSYALARI.find((d) => d.yol.endsWith('hud.css'))!.metin;
  const govde = hud.replace(/@media[^{]+\{/g, ''); // medya sarmalayıcıları düşür, seçiciler kalsın
  const adlar = new Set<string>();
  for (const m of govde.matchAll(/(^|[\s,>])\.([a-zA-Z][a-zA-Z0-9_-]*)\s*[,{.:]/gm)) adlar.add(m[2]);
  return adlar;
})();

describe('② hud.css sınıfına index.css medya sorgusundan dokunulmamalı', () => {
  it('index.css medya sorguları hud.css sınıflarını hedeflemiyor', () => {
    const idx = CSS_DOSYALARI.find((d) => d.yol.endsWith('index.css'))!.metin;
    const carpisan: string[] = [];
    for (const { sorgu, govde } of medyaBloklari(idx)) {
      if (/prefers-color-scheme|prefers-reduced-motion/.test(sorgu)) continue;
      for (const s of sinifSecicileri(govde)) if (HUD_SINIFLARI.has(s)) carpisan.push(`${s} (@media ${sorgu})`);
    }
    expect(
      carpisan,
      `bu kurallar sessizce eziliyor — hud.css sonra yükleniyor, medya sorgusu özgüllük eklemiyor. ` +
        `Kuralı hud.css'in sonuna taşı: ${carpisan.join(', ')}`,
    ).toEqual([]);
  });
});

describe('③ D-131 kolları CSS\'te duruyor', () => {
  const hud = CSS_DOSYALARI.find((d) => d.yol.endsWith('hud.css'))!.metin;

  it('G-51/G-52: geniş ekranda şerit ve nav ORTALI', () => {
    const blok = medyaBloklari(hud).find((b) => /min-width:\s*560px/.test(b.sorgu));
    expect(blok, 'min-width: 560px dalı yok').toBeDefined();
    expect(blok!.govde).toMatch(/\.band\s*\{[^}]*left:\s*50%/);
    // Bant ortalaması `translate` ile (bant-ortalama.test.ts: transform animasyonu ortalamayı eziyordu).
    expect(blok!.govde).toMatch(/\.band\s*\{[^}]*translate:\s*-50%/);
    expect(blok!.govde).toMatch(/\.botnav\s*\{[^}]*left:\s*50%/);
    expect(blok!.govde).toMatch(/\.botnav\s*\{[^}]*translateX\(-50%\)/);
  });

  it('G-54: kısa yatayda panel RAY + İKİ SÜTUN', () => {
    const blok = medyaBloklari(hud).find((b) => /orientation:\s*landscape/.test(b.sorgu) && /max-height/.test(b.sorgu));
    expect(blok, 'kısa yatay dalı yok').toBeDefined();
    // Kabuk yan yana
    expect(blok!.govde).toMatch(/\.modal-card\.screen\s*\{[^}]*flex-direction:\s*row/);
    // Üst şerit sol raya döner
    expect(blok!.govde).toMatch(/\.screen-top\s*\{[^}]*flex-direction:\s*column/);
    // Gövde iki sütun
    expect(blok!.govde).toMatch(/\.sheet-body\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
    // Ara sarmalayıcılar saydam — PB kolunun Görevler/Hedefler'de tutmamasının düzeltmesi
    expect(blok!.govde).toMatch(/display:\s*contents/);
  });

  it('portre DALA GİRMİYOR: eşikler telefon portresini dışarıda bırakıyor', () => {
    const blok = medyaBloklari(hud).find((b) => /min-width:\s*560px/.test(b.sorgu));
    const esik = Number(/min-width:\s*(\d+)px/.exec(blok!.sorgu)![1]);
    // En geniş telefon portresi ~430 px; en dar tablet portresi 768 px.
    expect(esik).toBeGreaterThan(430);
    expect(esik).toBeLessThan(768);
  });
});
