/**
 * kat2/SvIsaret.tsx — Kat 2 MASA SEVİYESİ işaretleri (S3). Dil Kat 1'in masa yükseltme noktası
 * (`Scene.TableUpgradeMarkers`): obje-başı, masanın YANINDA sade düz zemin işareti, yukarı ok + "Sv N"
 * (şimdiki seviye) + kalan tutar, altta dolan bar; havada buton, altın halka, dünya-içi "L" yok.
 *
 * Çerçeve = tetik (D-121): yer, etiket ve kutu `kat2SvTetikleri`den gelir — `kat2Tick` aynı listeyi
 * `inFrame` ile test eder; burada `MASA_ISARET_R` + ok, `markerFrame(etiket)` aynı kutuyu çizer.
 * `ayar.masaSv` yoksa liste boş: işaret çizilmez, Kat 2 bugünkü görünüş.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../../../game/store';
import { economyConfig } from '../../../config/economy.config';
import { fmt } from '../../../game/decimal';
import { kat2LavaboTetik, kat2OcakTetik, kat2SvCanliTetik, kat2UstaNoktalari, type Kat2Ayar, type Kat2SvTetik } from '../../../game/kat2Dongu';
import { kat2SvCanli } from '../../../game/kat2Gorev';
import { dwellState, ustaKaresi } from '../../../game/dwell';
import { masterCost } from '../../../game/rules';
import { ETIKET_SERVIS, ETIKET_USTA, ISARET_R, MASA_ISARET_R } from '../../../game/markerFrame';
import { GroundMarker } from '../GroundMarker';
import { useMasaSvleri } from './masaSv';

type Durum = ReturnType<typeof useGame.getState>;

/** Cüzdanın sayısı — her `set`te işaret başına `Decimal.toNumber` yerine cüzdan kimliği başına bir kez. */
let sonCuzdan: Durum['wallet'] | null = null;
let sonSayi = 0;
function cuzdan(s: Durum): number {
  if (s.wallet !== sonCuzdan) {
    sonCuzdan = s.wallet;
    sonSayi = s.wallet.toNumber();
  }
  return sonSayi;
}

function SvIsareti({ t }: { t: Kat2SvTetik }) {
  const fill = useGame((s) => s.kat2Dunya.padFill[t.id] ?? 0);
  const kalan = Math.max(0, Math.ceil(t.fiyat - fill));
  // Boolean abonelik: cüzdan her tick değişir, işaret yalnız "yetiyor mu" değişince render olur.
  const yetiyor = useGame((s) => cuzdan(s) >= kalan);
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
  const yetiyor = useGame((s) => cuzdan(s) >= kalan);
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
  const yetiyor = useGame((s) => cuzdan(s) >= kalan);
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

/** `kat2SvCanli` yalnız `kat2` kaydı değişince yeniden hesaplanır (o nesne her tick değil, olayda değişir). */
let sonKat2: Durum['kat2'] | null = null;
let sonCanli = false;
function svCanli(s: Durum): boolean {
  if (s.kat2 !== sonKat2) {
    sonKat2 = s.kat2;
    sonCanli = kat2SvCanli(s.kat2, economyConfig.kat2Gorevler, AYAR);
  }
  return sonCanli;
}

export function Kat2SvIsaretleri() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const masaSv = useMasaSvleri();
  // D-124 + D-142 karşılığı: tek masa, yalnız Sv görevi aktifken (ya da hat bitince) — tick ile aynı kural.
  const canli = useGame(svCanli);
  const tetikler = kat2SvCanliTetik(AYAR, padsDone, masaSv, canli);
  return (
    <>
      {tetikler.map((t) => (
        <SvIsareti key={`${t.id}:${t.sv}`} t={t} />
      ))}
    </>
  );
}

/** Bu hızın altı "duruyor" sayılır (br/sn) — Kat 1 `Scene.TableMasterSpots` ile aynı. */
const DURMA_HIZI = 0.35;

/**
 * D-206 KAT 2 USTA NOKTALARI — Kat 1 `Scene.TableMasterSpots`un birebir uyarlaması: Sv tavanındaki (Sv5) masanın
 * Sv noktası kaybolur, aynı yerde 💎 kimliğiyle Usta noktası doğar (D8). Satın alma dwell'le OLMAZ: nokta yalnız
 * yakınlık + bekleme bildirir, modalı HUD açar (`UstaModal`). Tetik kenar-kurulumlu (G-79 ②) ve çizilen çerçeve (K4).
 * Usta alınan masanın noktası düşer; Kat 1'de de Usta masasının ayrı bir işareti yok.
 */
export function Kat2UstaIsaretleri() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const masaSv = useMasaSvleri();
  const mastersOwned = useGame((s) => s.mastersOwned);
  const yeter = useGame((s) => s.diamonds.toNumber() >= masterCost());
  const setNearMaster = useGame((s) => s.setNearMaster);
  const noktalar = useMemo(() => kat2UstaNoktalari(padsDone, masaSv, mastersOwned), [padsDone, masaSv, mastersOwned]);
  const adaylar = useMemo(() => noktalar.map((n) => ({ id: n.id, pos: [n.x, 0, n.z] as [number, number, number] })), [noktalar]);

  const son = useRef<string | null>(null);
  const oncekiPos = useRef<[number, number]>([0, 0]);
  const kuruldu = useRef(false);
  useFrame((_, dt) => {
    const g = useGame.getState();
    if (g.kat !== 2) return;
    const p = g.player;
    const hiz = Math.hypot(p[0] - oncekiPos.current[0], p[2] - oncekiPos.current[1]) / Math.max(dt, 1e-4);
    oncekiPos.current = [p[0], p[2]];
    if (hiz >= DURMA_HIZI) kuruldu.current = true;
    const duruyor = kuruldu.current && hiz < DURMA_HIZI;
    const k = ustaKaresi(adaylar, p[0], p[2], duruyor, dt, { p: dwellState.p, kapali: g.ustaKapali });
    dwellState.p = k.p;
    dwellState.id = k.id;
    if (k.kapali !== g.ustaKapali) useGame.setState({ ustaKapali: k.kapali });
    if (k.acik !== son.current) {
      son.current = k.acik;
      setNearMaster(k.acik);
    }
  });

  const fiyat = masterCost();
  return (
    <>
      {adaylar.map((a) => (
        <GroundMarker
          key={a.id}
          pos={a.pos}
          label={ETIKET_USTA}
          arrow
          sub={String(fiyat)}
          pip="gem"
          tint="#4fc3f7"
          dwellId={a.id}
          radius={MASA_ISARET_R}
          afford={yeter}
        />
      ))}
    </>
  );
}
