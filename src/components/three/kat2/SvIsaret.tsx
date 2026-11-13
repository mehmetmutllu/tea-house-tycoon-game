/**
 * kat2/SvIsaret.tsx — Kat 2 MASA SEVİYESİ işaretleri (S3). Dil Kat 1'in masa yükseltme noktası
 * (`Scene.TableUpgradeMarkers`): obje-başı, masanın YANINDA sade düz zemin işareti, yukarı ok + "Sv N"
 * (şimdiki seviye) + kalan tutar, altta dolan bar; havada buton, altın halka, dünya-içi "L" yok.
 *
 * Çerçeve = tetik (D-121): yer, etiket ve kutu `kat2SvTetikleri`den gelir — `kat2Tick` aynı listeyi
 * `inFrame` ile test eder; burada `MASA_ISARET_R` + ok, `markerFrame(etiket)` aynı kutuyu çizer.
 * `ayar.masaSv` yoksa liste boş: işaret çizilmez, Kat 2 bugünkü görünüş.
 */
import { useGame } from '../../../game/store';
import { economyConfig } from '../../../config/economy.config';
import { fmt } from '../../../game/decimal';
import { kat2SvTetikleri, type Kat2SvTetik } from '../../../game/kat2Dongu';
import { MASA_ISARET_R } from '../../../game/markerFrame';
import { GroundMarker } from '../GroundMarker';
import { useMasaSvleri } from './masaSv';

function SvIsareti({ t }: { t: Kat2SvTetik }) {
  const fill = useGame((s) => s.kat2Dunya.padFill[t.id] ?? 0);
  const kalan = Math.max(0, Math.ceil(t.fiyat - fill));
  // Boolean abonelik: cüzdan her tick değişir, işaret yalnız "yetiyor mu" değişince render olur.
  const yetiyor = useGame((s) => s.wallet.toNumber() >= kalan);
  return (
    <GroundMarker
      pos={[t.x, 0, t.z]}
      label={t.etiket}
      arrow
      sub={fmt(kalan)}
      pip="coin"
      tint="#ffce54"
      radius={MASA_ISARET_R}
      progress={t.fiyat > 0 ? fill / t.fiyat : 0}
      afford={yetiyor}
    />
  );
}

export function Kat2SvIsaretleri() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const masaSv = useMasaSvleri();
  const tetikler = kat2SvTetikleri(economyConfig.kat2, padsDone, masaSv);
  return (
    <>
      {tetikler.map((t) => (
        <SvIsareti key={`${t.id}:${t.sv}`} t={t} />
      ))}
    </>
  );
}
