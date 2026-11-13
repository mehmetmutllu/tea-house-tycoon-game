/**
 * kat2/Bolme.tsx — ALANLAR ARASI DUVAR (D-191: bölme yok). Hat yalnız bir yanı açıkken çizilir: kapalı
 * alanın önünde boydan boya duvar (arkada kaba inşaat). İki yanı açılınca duvar kalkar, hat boş kalır.
 * Çarpışma `kat.kat2Duvarlar` ile aynı kural (`kat2DuvarVar`). Sıva görünüşü + kalkış anı görsel turda.
 */
import { KAT2_BOLMELER, kat2DuvarVar } from '../../../game/kat';
import { MaketWall } from '../maketParts';

const BOY = 1.2;

export function Bolmeler({ acikAlan }: { acikAlan: number }) {
  return (
    <group>
      {KAT2_BOLMELER.map((b, i) =>
        kat2DuvarVar(b, acikAlan) ? <MaketWall key={i} x1={b.x1} z1={b.z1} x2={b.x2} z2={b.z2} h={BOY} /> : null,
      )}
    </group>
  );
}
