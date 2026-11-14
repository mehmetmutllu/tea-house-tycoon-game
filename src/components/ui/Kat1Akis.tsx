/**
 * Kat1Akis — D-198 (oyun testi G1): Kat 2'deyken Kat 1'in parası doğrudan cüzdana akar; kesenin altında
 * kısa bir "Kat 1: +X" satırı belirir, akış durunca söner. Bar YOK (kasa kalktı). Kese satırının dili
 * (`.cur` · `.cur-val`), para ikonu bitmap'i (`CoinIcon`). `kat1Akis` store'da birikimli sayaçtır;
 * satır yalnız son görünür pencerede gelen farkı gösterir.
 */
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/store';
import { fmt } from '../../game/decimal';
import { CoinIcon } from './icons';
import { t } from '../../i18n';

/** Son para gelişinden bu kadar ms sonra satır söner ve tutar sıfırlanır. */
const SONME_MS = 3000;

export function Kat1Akis() {
  const kat2de = useGame((s) => s.kat === 2);
  const toplam = useGame((s) => Math.floor(s.kat1Akis));
  const onceki = useRef(toplam);
  // Sönerken tutar ekranda kalır (görünürlük ayrı): yoksa satır "+0" yazarak solardı.
  const [satir, setSatir] = useState({ tutar: 0, gorunur: false });

  useEffect(() => {
    const fark = toplam - onceki.current;
    onceki.current = toplam;
    if (fark <= 0) return undefined;
    setSatir((s) => ({ tutar: (s.gorunur ? s.tutar : 0) + fark, gorunur: true }));
    const id = setTimeout(() => setSatir((s) => ({ ...s, gorunur: false })), SONME_MS);
    return () => clearTimeout(id);
  }, [toplam]);

  if (!kat2de) return null;
  return (
    <div className="cur kat1-akis" data-testid="kat1-akis" data-gorunur={satir.gorunur ? '1' : '0'} style={{ opacity: satir.gorunur ? 1 : 0 }}>
      <CoinIcon size={22} />
      <span className="cur-val" style={{ fontSize: 'var(--p3)' }}>
        {t('Kat 1:')} +{fmt(satir.tutar)}
      </span>
    </div>
  );
}
