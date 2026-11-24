/** Görünürlük kapısının küresi (saf): gövde + güneşin tersine düşen gölge ucu + pay. `[x, y, z, yarıçap]`. */
const PAY = 0.6;

export function gorusKuresi(
  x: number, y: number, z: number, boy: number, yari: number, gunes: readonly number[],
): [number, number, number, number] {
  const gx = (-gunes[0] / gunes[1]) * boy;
  const gz = (-gunes[2] / gunes[1]) * boy;
  return [x + gx / 2, y + boy / 2, z + gz / 2, Math.hypot(boy, gx, gz) / 2 + yari + PAY];
}
