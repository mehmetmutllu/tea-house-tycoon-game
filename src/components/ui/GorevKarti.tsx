import { useLayoutEffect, useRef } from 'react';
import type { QuestTarget } from '../../config/economy.config';
import { fmt } from '../../game/decimal';
import { t } from '../../i18n';
import { CheckBadge, CoinIcon, QuestPhoto } from './icons';
import type { KartVerisi } from './gorevPano';

/**
 * G-120 · M1 — ALT BANT GÖREV KARTI (Kat 1 ve Kat 2 aynı bileşen). Hap (D-175) karta büyür:
 *   üst satır  resim · "GÖREV n/N" + başlık · ödül
 *   orta       ilerleme çubuğu (sayaçlı görevde) ya da "Tamamlandı"
 *   alt        SIRADA · iki çip (yükseltme durağı amber)
 * Değerlerin hepsi `kartVerisi`nden (gorevPano.ts) gelir; burada hesap yok.
 */
export function GorevKarti({
  veri,
  kicker,
  title,
  foto,
  done = false,
  onClick,
  testid,
  dataGorev,
  progTestid,
  rewardTestid,
  doneTestid,
}: {
  veri: KartVerisi;
  kicker: string;
  title: string;
  foto: QuestTarget;
  done?: boolean;
  onClick?: () => void;
  testid: string;
  dataGorev?: string;
  progTestid: string;
  rewardTestid: string;
  doneTestid: string;
}) {
  const Kok = onClick ? 'button' : 'div';
  // Kartın hap tabanını (48 px) aşan boyu `--bant-ek` olarak yazılır: bandın üstüne dizilen sağ yığın,
  // bildirim ve ipucu balonları kartla birlikte yükselir, karta binmez (boy içerikle değişir: sırada/çubuk).
  const kok = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = kok.current;
    if (!el) return undefined;
    const kokStil = document.documentElement.style;
    const yaz = () => kokStil.setProperty('--bant-ek', `${Math.max(0, el.offsetHeight - 48)}px`);
    yaz();
    const ro = new ResizeObserver(yaz);
    ro.observe(el);
    return () => {
      ro.disconnect();
      kokStil.setProperty('--bant-ek', '0px');
    };
  }, []);
  return (
    <Kok
      ref={kok as never}
      className={`band kart${done ? ' done' : ''}`}
      data-testid={testid}
      data-gorev={dataGorev}
      onClick={onClick}
    >
      <span className="kart-ust">
        <span className="band-photo">{done ? <CheckBadge size={26} /> : <QuestPhoto target={foto} size={38} />}</span>
        <span className="kart-baslik">
          <span className="kart-kicker" data-testid="kart-no">
            {kicker}
          </span>
          <span className="band-title">{title}</span>
        </span>
        {veri.reward != null && (
          <span className="band-reward" data-testid={rewardTestid}>
            <CoinIcon size={14} />+{fmt(veri.reward)}
          </span>
        )}
      </span>
      {done ? (
        <span className="band-sub done-sub" data-testid={doneTestid}>
          {t('Tamamlandı')}
        </span>
      ) : veri.yuzde != null ? (
        <span className="band-track big">
          <span className="band-fill" style={{ width: `${veri.yuzde}%` }} />
          <span className="band-count" data-testid={progTestid}>
            {veri.cur}/{veri.total}
          </span>
        </span>
      ) : null}
      {!done && veri.sirada.length > 0 && (
        <span className="kart-sirada" data-testid="kart-sirada">
          <span className="kart-sirada-et">{t('SIRADA')}</span>
          {veri.sirada.map((g) => (
            <span className={`kart-cip${g.yukseltme ? ' yuk' : ''}`} key={g.id} data-yuk={g.yukseltme ? '1' : undefined}>
              {t(g.title)}
            </span>
          ))}
        </span>
      )}
    </Kok>
  );
}
