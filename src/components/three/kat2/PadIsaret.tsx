/**
 * kat2/PadIsaret.tsx — Kat 2'nin SIRADAKİ pad'i (zincir tek hat: `kat2SiradakiPad`). Dil Kat 1'in
 * pad'i (`Pad.tsx`): sade düz zemin işareti (`GroundMarker`), çerçeve = tetik (`padCercevesi(
 * kat2PadEtiket(id))` — `kat2Tick` aynı kutuyu test eder), dolum alttan üste, kalan tutar yazılı.
 *
 * Kat 2'de Kat 1'in görev oku yok (`QuestPointer` Kat 2'de `activeStep`i kapatır). Ekranda tek
 * pad var ve o pad AKTİF adımdır: işaret nabzı + yazısı uzaktan da okunsun diye `activeStep`
 * bu pad'e yazılır. Yazan bileşen işaretten ÖNCE takılır → aynı karede işaretten önce koşar.
 */
import { useFrame } from '@react-three/fiber';
import { useGame } from '../../../game/store';
import { economyConfig } from '../../../config/economy.config';
import { fmt } from '../../../game/decimal';
import { activeStep } from '../../../game/activeStep';
import { kat2PadEtiket, kat2PadYeri, kat2SiradakiPad } from '../../../game/kat2Dongu';
import { GroundMarker } from '../GroundMarker';

function AktifAdim({ x, z }: { x: number; z: number }) {
  useFrame(() => {
    if (useGame.getState().kat !== 2) return;
    activeStep.has = true;
    activeStep.x = x;
    activeStep.z = z;
  });
  return null;
}

export function Kat2PadIsareti() {
  const padsDone = useGame((s) => s.kat2.padsDone);
  const pad = kat2SiradakiPad(economyConfig.kat2, padsDone);
  const fill = useGame((s) => (pad ? s.kat2Dunya.padFill[pad.id] ?? 0 : 0));
  const kalan = pad ? Math.max(0, Math.ceil(pad.cost - fill)) : 0;
  // Boolean abonelik: cüzdan her tick değişir, işaret yalnız "yetiyor mu" değişince render olur.
  const yetiyor = useGame((s) => s.wallet.toNumber() >= kalan);
  if (!pad) return null;
  const [x, z] = kat2PadYeri(pad.id);
  return (
    <>
      <AktifAdim x={x} z={z} />
      <GroundMarker
        key={pad.id}
        pos={[x, 0, z]}
        label={kat2PadEtiket(pad.id)}
        sub={fmt(kalan)}
        pip="coin"
        tint="#43d17a"
        progress={fill / pad.cost}
        afford={yetiyor}
      />
    </>
  );
}
