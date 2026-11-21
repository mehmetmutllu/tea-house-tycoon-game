/**
 * kat2/Dis.tsx — ARKA DUVARIN ÜSTÜ (gözlem: Kat 2 varış kadrajında arka duvarın üstü koyu boşluktu;
 * Kat 1'de aynı yerde bahçe görünüyor). Kat 2 Kat 1'in 3,2 üstünde: duvarın üstünden bakan göz
 * dışarıyı YUKARIDAN görür — Kat 1'in kendi bahçesi 3,2 aşağıda (D-187 dış A: aynı dünya, üst kattan).
 * Bahçe `binaTam`: Kat 1'in açılmamış alanındaki ağaçlar Kat 2'nin zemininden taşmasın (bina ayak izi tam).
 */
import { Bahce } from '../Bahce';
import { BAND } from '../../../game/layout';
import { PALETTE } from '../../../config/palette';
import { MC } from '../maketParts';
import { ASFALT } from '../streetLook';
import { ALT_KAT, altKatCamlari } from './yapiOlcu';

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
      <Bahce binaTam />
    </group>
  );
}

/**
 * S5 G-115 C — BİNANIN ALTI. Kat 2'deyken ön duvarın dışı/altı arka plan rengiydi (lacivert boşluk).
 * Alt katın cephesi (krem sıva + kat silmesi + koyu camlar) Kat 2 zemininden 3,2 aşağı iner, dipte gri
 * sokak zemini (Kat 1 kaldırımının rengi) + asfalt (Kat 1 `Street` ile aynı yer). Ölçü `yapiOlcu.ALT_KAT`.
 * Sokak düzlemi bahçenin çiminin ALTINDA: bahçe olan yerde çim, olmayan yerde sokak görünür.
 */
export function AltKat() {
  const { x0, x1, z0, z1, derin, silme } = ALT_KAT;
  const kat = (p: [number, number, number], s: [number, number, number], c: string) => (
    <mesh position={p} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
  const zm = (z0 + z1) / 2;
  return (
    <group>
      {kat([(x0 + x1) / 2, -derin / 2, z1], [x1 - x0 + 0.2, derin, 0.2], MC.wallCream)}
      {kat([x0, -derin / 2, zm], [0.2, derin, z1 - z0], MC.wallCream)}
      {kat([x1, -derin / 2, zm], [0.2, derin, z1 - z0], MC.wallCream)}
      {/* kat silmesi (iki kat arası taş kuşak) */}
      {kat([(x0 + x1) / 2, -silme / 2, z1 + 0.08], [x1 - x0 + 0.56, silme, 0.36], ALT_KAT.silmeRenk)}
      {kat([x0 - 0.08, -silme / 2, zm], [0.36, silme, z1 - z0], ALT_KAT.silmeRenk)}
      {kat([x1 + 0.08, -silme / 2, zm], [0.36, silme, z1 - z0], ALT_KAT.silmeRenk)}
      {altKatCamlari().map((c, i) => (
        <mesh key={i} position={[c.x, c.y, z1 + 0.11]}>
          <boxGeometry args={[c.w, c.h, 0.04]} />
          <meshStandardMaterial color={ALT_KAT.camRenk} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -KAT - 0.05, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={ALT_KAT.sokakRenk} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ASFALT.x, -KAT - 0.03, ASFALT.z]} receiveShadow>
        <planeGeometry args={[ASFALT.w * 3, ASFALT.d]} />
        <meshStandardMaterial color={ALT_KAT.asfaltRenk} />
      </mesh>
    </group>
  );
}
