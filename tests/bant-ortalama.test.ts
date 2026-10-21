/**
 * bant-ortalama.test.ts — geniş ekranda görev bandı ORTALI KALIR.
 *
 * `.band` geniş ekranda `left: 50%` + yarı en geri çekilerek ortalanır. Çekme `transform` ile
 * yazılınca `bandIn`/`bandDone` animasyonları (`both` dolgu) son karelerinin transform'unu tutup
 * ortalamayı eziyordu: görev bitince bant yarı eni kadar sağa kayıyordu (mağaza videosu, 2026-10-21).
 * Kural: bandın transform'unu canlandıran animasyon varken ortalama ayrı `translate` özelliğinde durur.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/components/ui/hud.css'), 'utf8');

/** `@media (min-width: 560px) { … }` gövdesindeki ilk `.band { … }` kuralı. */
function genisBant(): string {
  const i = css.indexOf('@media (min-width: 560px)');
  expect(i).toBeGreaterThan(-1);
  const m = css.slice(i).match(/\n\s*\.band\s*\{([^}]*)\}/);
  expect(m).not.toBeNull();
  return m![1];
}

describe('görev bandı geniş ekranda ortalı', () => {
  it('ortalama transform ile değil translate ile yapılır', () => {
    const kural = genisBant();
    expect(kural).toMatch(/left:\s*50%/);
    expect(kural).toMatch(/translate:\s*-50%/);
    expect(kural).not.toMatch(/(^|[^-])transform\s*:/);
  });

  it('bant animasyonları transform canlandırıyor (kural bu yüzden var)', () => {
    expect(css).toMatch(/@keyframes bandDone[\s\S]*?transform:/);
    expect(css).toMatch(/\.band\s*\{[^}]*animation:\s*bandIn/);
  });
});
