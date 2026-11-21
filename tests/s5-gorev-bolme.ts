/**
 * S5 3. tur (kullanıcı 2026-11-21, `docs/s5-denge-raporu.md` §KARAR üçüncü tur) — görev hattına giren ara görevler.
 * GB: > 20 dk görevler tek pad'lik parçalara bölündü, ödül toplamı korunur (parçalar + asıl görev = eski ödül).
 * GB-SV: k2_s2okey4 dörde — 3 masa aç · 3 okey Sv2 · 6 okey Sv2 · 4. masa. G4: 4. garsonun kendi görevi (yeni ödül).
 */
export const S5_PARCA: Readonly<Record<string, readonly string[]>> = {
  k2_s2okey4: ['k2_s2okey4_a', 'k2_okeySv3', 'k2_okeySv6'],
  k2_s2okey6: ['k2_s2okey6_a'],
  k2_tavla3: ['k2_tavla3_a'],
  k2_tavla5: ['k2_tavla5_a'],
  k2_tavla8: ['k2_tavla8_a'],
  k2_tavla10: ['k2_tavla10_a'],
  k2_tavla12: ['k2_tavla12_a'],
};
/** S5 3. turdan önceki (D-206) ödüller — bölünen görevlerin toplamı bunlara eşit kalır. */
export const S5_ONCEKI_ODUL: Readonly<Record<string, number>> = {
  k2_s2okey4: 1_750, k2_s2okey6: 1_900, k2_tavla3: 2_100, k2_tavla5: 2_200, k2_tavla8: 2_350, k2_tavla10: 2_400, k2_tavla12: 2_500,
};
export const S5_YENI_GOREV = 'k2_garson4';
/** S5 3. turda eklenen bütün görev kimlikleri. */
export const S5_EKLENEN: readonly string[] = [...Object.values(S5_PARCA).flat(), S5_YENI_GOREV];
