/**
 * kat2/Dis.tsx — ARKA DUVARIN ÜSTÜ (gözlem: Kat 2 varış kadrajında arka duvarın üstü koyu boşluktu;
 * Kat 1'de aynı yerde bahçe görünüyor). Kat 2 Kat 1'in 3,2 üstünde: duvarın üstünden bakan göz
 * dışarıyı YUKARIDAN görür — Kat 1'in kendi bahçesi 3,2 aşağıda (D-187 dış A: aynı dünya, üst kattan).
 */
import { Bahce } from '../Bahce';
import { BAND } from '../../../game/layout';
import { PALETTE } from '../../../config/palette';

const ARKA_Z = BAND.back - 0.5; // dış duvar hattı (Kat2.Duvarlar ile aynı kural)
const KAT = 3.2;

export function ArkaDuvarUstu() {
  return (
    <group position={[0, -KAT, 0]}>
      {/* bahçenin ötesi de çim (arsanın dışı koyu kalmasın) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, ARKA_Z - 40]} receiveShadow>
        <planeGeometry args={[160, 80]} />
        <meshStandardMaterial color={PALETTE.plantAlt} />
      </mesh>
      <Bahce />
    </group>
  );
}
