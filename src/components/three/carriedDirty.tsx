import { PALETTE } from '../../config/palette';

// TAŞINAN KİRLİLER — bulaşıkçı VE garson (D-083: boşta kalan garson da yıkamaya götürür) ortak
// kullanır; iki yerde ayrı çizim = er ya da geç birbirinden ayrışan iki görsel demekti.
// Bulaşıkçının taşıdığı kirliler: gri bardak + yayvan kirli TABAK, KARIŞIK.
// B2: tek bulaşıkçı katın her kabını toplar, o yüzden kabın türü artık "servisin ürünü"nden değil
// KABIN KENDİSİNDEN gelir (leğende ayrı sayılır) — turu-5'teki "tepside yanlış kap" hatası bu
// yüzden geri gelmez. v28: leğen yükseltmesiyle 8'e kadar → 4'lük sıralar.
export function CarriedDirty({ cups, plates }: { cups: number; plates: number }) {
  const count = cups + plates;
  if (count <= 0) return null;
  const perRow = Math.min(count, 4);
  const w = Math.max(0.3, 0.14 + perRow * 0.13);
  const depth = count > 4 ? 0.38 : 0.24;
  return (
    <group position={[0, 0.95, 0.4]}>
      <mesh castShadow>
        <boxGeometry args={[w, 0.04, depth]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      {Array.from({ length: count }).map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const rowCount = Math.min(count - row * 4, 4);
        const x = (col - (rowCount - 1) / 2) * 0.14;
        const z = count > 4 ? (row === 0 ? -0.08 : 0.08) : 0;
        if (i >= cups) {
          return (
            <group key={i} position={[x, 0.05, z]}>
              <mesh>
                <cylinderGeometry args={[0.075, 0.06, 0.03, 10]} />
                <meshStandardMaterial color="#b3a896" roughness={0.9} />
              </mesh>
              <mesh position={[0.015, 0.025, 0.01]}>
                <boxGeometry args={[0.05, 0.02, 0.04]} />
                <meshStandardMaterial color={PALETTE.toastDark} roughness={0.9} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={i} position={[x, 0.1, z]}>
            <cylinderGeometry args={[0.05, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8d8276" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

