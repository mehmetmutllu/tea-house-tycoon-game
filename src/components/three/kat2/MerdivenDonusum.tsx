/**
 * kat2/MerdivenDonusum.tsx — Kat 1'in MERDİVEN KOVASI ve DÖNÜŞÜM ANI (D-191/D-192). Merdiven pad'i
 * dolana dek yıkık merdiven + uyarı şeridi + dubalar; pad dolunca (aynı oturumda) yıkık takım yere
 * gömülür, toz kalkar (`TozDonusumu`, Kat 2 lavabosu da aynı), tamir edilmiş merdiven yerinde büyür. Yüklemede
 * zaten açıksa doğrudan durur.
 */
import { useMemo, useRef, useState } from 'react';
import { MaketDuba, MaketMerdivenHarap, MaketUyariSeridi } from '../maketParts';
import { MerdivenTamir } from '../Kat2';
import { Dogus } from './Esya';
import { TozDonusumu } from './TozDonusumu';

function YikikTakim({ stairZ, zf }: { stairZ: number; zf: number }) {
  return (
    <>
      <MaketMerdivenHarap pos={[0, 0, stairZ]} />
      <MaketUyariSeridi x1={-4.2} x2={4.2} z={zf - 0.1} />
      {[-3.6, 0, 3.6].map((x) => (
        <MaketDuba key={x} pos={[x, 0, zf - 0.25]} />
      ))}
    </>
  );
}

/** Kovanın ağzındaki toz elipsi (D-193'ün ilk deseni; G-117 lavabo aynı bileşenle). */
const TOZ_YARICAP: readonly [number, number] = [1.6, 1.2];

export function MerdivenKovasi({ acik, stairZ, zf }: { acik: boolean; stairZ: number; zf: number }) {
  // Bileşen kurulurken kapalıydı ve şimdi açıksa = oturumda açıldı → dönüşüm oynar.
  const ilkAcik = useRef(acik);
  const [gecis, setGecis] = useState(true);
  const tozMerkez = useMemo(() => [0, zf - 1.6] as const, [zf]);
  if (!acik) return <YikikTakim stairZ={stairZ} zf={zf} />;
  const donusum = !ilkAcik.current;
  return (
    <>
      <Dogus dogus={donusum} pos={[0, 0, stairZ]}>
        <MerdivenTamir pos={[0, 0, stairZ]} />
      </Dogus>
      {donusum && gecis && (
        <TozDonusumu merkez={tozMerkez} yaricap={TOZ_YARICAP} bitti={() => setGecis(false)}>
          <YikikTakim stairZ={stairZ} zf={zf} />
        </TozDonusumu>
      )}
    </>
  );
}
