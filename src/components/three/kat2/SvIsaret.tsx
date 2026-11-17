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
import { kat2LavaboTetik, kat2OcakTetik, kat2SvCanliTetik, type Kat2Ayar, type Kat2SvTetik } from '../../../game/kat2Dongu';
import { kat2SvCanli } from '../../../game/kat2Gorev';
import { ETIKET_SERVIS, ISARET_R, MASA_ISARET_R } from '../../../game/markerFrame';
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

/**
 * D-200: OCAK YÜKSELTME noktası — Kat 1'in servis yükseltme noktasıyla aynı dil ("Yükselt" + ok + kalan tutar,
 * altta dolan bar). Yer/fiyat `kat2OcakTetik`ten; tick aynı tetiği `servisCercevesi` ile test eder.
 */
export function Kat2OcakIsareti() {
  // Seçici kararlı referans döner (padsDone/yuk); tetik nesnesi render'da türer — seçicide yeni nesne sonsuz render yapar.
  const padsDone = useGame((s) => s.kat2.padsDone);
  const yuk = useGame((s) => s.kat2.yuk);
  const t = kat2OcakTetik(AYAR, padsDone, yuk);
  const fill = useGame((s) => (t ? s.kat2Dunya.padFill[t.id] ?? 0 : 0));
  const kalan = t ? Math.max(0, Math.ceil(t.fiyat - fill)) : 0;
  const yetiyor = useGame((s) => s.wallet.toNumber() >= kalan);
  if (!t) return null;
  return (
    <GroundMarker
      key={t.fiyat}
      pos={[t.x, 0, t.z]}
      label={ETIKET_SERVIS}
      arrow
      sub={fmt(kalan)}
      pip="coin"
      tint="#ffce54"
      radius={ISARET_R}
      progress={t.fiyat > 0 ? fill / t.fiyat : 0}
      afford={yetiyor}
    />
  );
}

/**
 * D-201: LAVABO SEVİYE noktası — ocak noktasıyla aynı dil ("Yükselt" + ok + kalan tutar, altta dolan bar); lavabo pad'inin
 * solunda. Yer/fiyat `kat2LavaboTetik`ten; tick aynı tetiği `servisCercevesi` ile test eder (çizilen = tetik).
 */
export function Kat2LavaboIsareti() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const yuk = useGame((s) => s.kat2.yuk);
  const t = kat2LavaboTetik(AYAR, padsDone, yuk);
  const fill = useGame((s) => (t ? s.kat2Dunya.padFill[t.id] ?? 0 : 0));
  const kalan = t ? Math.max(0, Math.ceil(t.fiyat - fill)) : 0;
  const yetiyor = useGame((s) => s.wallet.toNumber() >= kalan);
  if (!t) return null;
  return (
    <GroundMarker
      key={t.fiyat}
      pos={[t.x, 0, t.z]}
      label={ETIKET_SERVIS}
      arrow
      sub={fmt(kalan)}
      pip="coin"
      tint="#ffce54"
      radius={ISARET_R}
      progress={t.fiyat > 0 ? fill / t.fiyat : 0}
      afford={yetiyor}
    />
  );
}

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
