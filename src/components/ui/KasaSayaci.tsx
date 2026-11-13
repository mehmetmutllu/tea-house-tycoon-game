/**
 * KasaSayaci — D-185: Kat 2'deyken Kat 1'in kasası. Kesenin altında üçüncü satır: "Kat 1: X ₺" + doluluk
 * çubuğu. Kasa dolunca (Kat 1'e müşteri gelmiyor) satır nabız gibi atar — oyuncuyu aşağı çağırır.
 * Kese satırının dili (`.cur` · `.cur-val` · `.rep-bar`/`.rep-fill`), para ikonu bitmap'i (`CoinIcon`).
 */
import { useEffect, useRef } from 'react';
import { useGame } from '../../game/store';
import { kasaDoluluk, kasaSiniriOlcumden } from '../../game/kasa';
import { economyConfig } from '../../config/economy.config';
import { fmt } from '../../game/decimal';
import { CoinIcon } from './icons';
import { t } from '../../i18n';

export function KasaSayaci() {
  const kat2de = useGame((s) => s.kat === 2);
  const tutar = useGame((s) => Math.floor(s.kasa.toNumber()));
  // Yüzde tam sayıya yuvarlanır: ölçüm her karede değişir, sayaç yalnız görünür adımda çizer.
  const yuzde = useGame((s) => Math.round(kasaDoluluk(s.kasa, kasaSiniriOlcumden(s.kasaOlcum, economyConfig.kasa)) * 100));
  const dolu = yuzde >= 100;
  const kok = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = kok.current;
    if (!dolu || !el || typeof el.animate !== 'function') return undefined;
    const a = el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
      { duration: 900, iterations: Infinity, easing: 'ease-in-out' },
    );
    return () => a.cancel();
  }, [dolu]);

  if (!kat2de) return null;
  return (
    <div ref={kok} className="cur" data-testid="kasa-sayaci" data-dolu={dolu ? '1' : '0'}>
      <CoinIcon size={22} />
      <span className="cur-val" style={{ fontSize: 'var(--p3)' }}>
        {dolu ? t('Kat 1 dolu:') : t('Kat 1:')} {fmt(tutar)}
      </span>
      <span className="rep-bar" style={{ width: 44 }}>
        <span
          className="rep-fill"
          style={{ width: `${yuzde}%`, background: dolu ? 'var(--uyari)' : undefined }}
        />
      </span>
    </div>
  );
}
