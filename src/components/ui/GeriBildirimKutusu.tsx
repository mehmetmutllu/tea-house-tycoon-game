/**
 * Ayarlar → "Geri bildirim gönder" kutusu (1.0.7). Kalıp `KafeAdiKutusu` ile aynı (perde + kart).
 * Gönderim `game/geriBildirim.ts`te; burası yalnız durum: yazıyor → gönderiliyor → teşekkür / hata.
 */
import { useState } from 'react';
import { GERI_BILDIRIM_ARA_SN, GERI_BILDIRIM_UZUNLUK } from '../../config/firebase.config';
import { levelProgress } from '../../config/economy.config';
import { cihazOzeti, geriBildirimGonder, metniHazirla } from '../../game/geriBildirim';
import { useGame } from '../../game/store';
import { dil, t } from '../../i18n';
import { Capacitor } from '@capacitor/core';

type Hal = 'yaziyor' | 'gonderiliyor' | 'tamam' | 'hata';

/** Son başarılı gönderim (oturum içi) — ara süresi dolmadan ikinci gönderim yapılmaz. */
let sonGonderim = 0;

export function GeriBildirimKutusu({ onKapat }: { onKapat: () => void }) {
  const [taslak, setTaslak] = useState('');
  const [hal, setHal] = useState<Hal>('yaziyor');
  const metin = metniHazirla(taslak);
  // Ara süresi açılışta bir kez okunur (render saf kalsın): yeni gönderim kutu yeniden açılınca denenir.
  const [bekle] = useState(() => Date.now() - sonGonderim < GERI_BILDIRIM_ARA_SN * 1000);

  const gonder = async () => {
    if (!metin || hal === 'gonderiliyor' || bekle) return;
    setHal('gonderiliyor');
    const s = useGame.getState();
    const ok = await geriBildirimGonder(metin, {
      surum: __SURUM__,
      platform: Capacitor.getPlatform(),
      dil: dil(),
      cihaz: cihazOzeti(),
      ilerleme: `gorev ${s.questIndex + 1} · sv ${levelProgress(s.xp).level} · masa ${s.tables} · nokta ${s.padsDone.length}`,
    });
    if (ok) sonGonderim = Date.now();
    setHal(ok ? 'tamam' : 'hata');
  };

  return (
    <div className="modal-backdrop kafe-adi-perde" data-testid="geri-bildirim" onClick={onKapat}>
      <form
        className="modal-card reward-card kafe-adi-kart"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void gonder();
        }}
      >
        {hal === 'tamam' ? (
          <>
            <div className="reward-title">{t('Teşekkürler!')}</div>
            <p className="onay-metin" data-testid="geri-bildirim-tamam">
              {t('Mesajın bize ulaştı. Her birini okuyoruz.')}
            </p>
            <button type="button" className="sheet-cta" onClick={onKapat}>
              {t('Tamam')}
            </button>
          </>
        ) : (
          <>
            <div className="reward-title">{t('Geri bildirim gönder')}</div>
            <p className="onay-metin">{t('Bir hata mı buldun, bir fikrin mi var? Yaz, oyunu birlikte geliştirelim.')}</p>
            <textarea
              className="kafe-adi-girdi geri-bildirim-girdi"
              data-testid="geri-bildirim-girdi"
              value={taslak}
              maxLength={GERI_BILDIRIM_UZUNLUK}
              rows={5}
              placeholder={t('Mesajını yaz…')}
              aria-label={t('Geri bildirim gönder')}
              onChange={(e) => {
                setTaslak(e.target.value);
                if (hal === 'hata') setHal('yaziyor');
              }}
            />
            <div className="kafe-adi-sayac">
              {taslak.length}/{GERI_BILDIRIM_UZUNLUK}
            </div>
            {hal === 'hata' && (
              <p className="onay-metin geri-bildirim-hata" data-testid="geri-bildirim-hata" role="alert">
                {t('Gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.')}
              </p>
            )}
            <button
              type="submit"
              className="sheet-cta"
              data-testid="geri-bildirim-gonder"
              disabled={!metin || hal === 'gonderiliyor' || bekle}
            >
              {hal === 'gonderiliyor' ? t('Gönderiliyor…') : bekle ? t('Biraz sonra tekrar gönderebilirsin') : t('Gönder')}
            </button>
            <button type="button" className="sheet-cta ad" data-testid="geri-bildirim-vazgec" onClick={onKapat}>
              {t('Vazgeç')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
