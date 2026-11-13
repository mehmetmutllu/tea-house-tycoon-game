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
import { kat2SvCanliTetik, type Kat2Ayar, type Kat2SvTetik } from '../../../game/kat2Dongu';
import { kat2SvCanli } from '../../../game/kat2Gorev';
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

const AYAR = economyConfig.kat2 as Kat2Ayar;

export function Kat2SvIsaretleri() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const masaSv = useMasaSvleri();
  // D-124 + D-142 karşılığı: tek masa, yalnız Sv görevi aktifken (ya da hat bitince) — tick ile aynı kural.
  const canli = useGame((s) => kat2SvCanli(s.kat2, economyConfig.kat2Gorevler, AYAR));
  const tetikler = kat2SvCanliTetik(AYAR, padsDone, masaSv, canli);
  return (
    <>
      {tetikler.map((t) => (
        <SvIsareti key={`${t.id}:${t.sv}`} t={t} />
      ))}
    </>
  );
}
