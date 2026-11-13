/**
 * kat2/Balon.tsx — KAHVE BALONU: oyunda olan masa kahve istediğinde (`istek > 0`) masanın
 * üstünde kaç fincan beklendiği okunur. Dil Kat 1'in sipariş balonu (`siparisBalonu.ts`): krem
 * gövde, kalın koyu kontur, aşağı kuyruk, kameraya dönen düz levha.
 Balonun içi: fincan + "×2" sayısı (D-187 balon A). Doku adet başına bir kez çizilir ve paylaşılır.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, LinearFilter, MeshBasicMaterial, SRGBColorSpace, type Group } from 'three';
import { useGame } from '../../../game/store';
import { PALETTE } from '../../../config/palette';
import type { Kat2MasaYeri } from '../../../game/kat';

const BOY = 256;
const KONTUR = 12;
const BALON_Y = 2.35;
const BALON_W = 0.95;
const YAZI = "'Luckiest Guy', 'Baloo 2', system-ui, sans-serif";

function balonYolu(c: CanvasRenderingContext2D, x: number, y: number, g: number, y2: number, r: number) {
  const kx = x + g / 2;
  const kg = g * 0.12;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + g - r, y);
  c.quadraticCurveTo(x + g, y, x + g, y + r);
  c.lineTo(x + g, y + y2 - r);
  c.quadraticCurveTo(x + g, y + y2, x + g - r, y + y2);
  c.lineTo(kx + kg, y + y2);
  c.lineTo(kx, y + y2 + g * 0.13);
  c.lineTo(kx - kg, y + y2);
  c.lineTo(x + r, y + y2);
  c.quadraticCurveTo(x, y + y2, x, y + y2 - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/** Türk kahvesi fincanı: tabak + kulplu fincan + köpüklü kahve yüzeyi (kalın kontur). */
function fincanCiz(c: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.lineWidth = 7;
  c.lineJoin = 'round';
  c.strokeStyle = PALETTE.outline;
  // tabak
  c.beginPath();
  c.ellipse(0, 34, 50, 13, 0, 0, Math.PI * 2);
  c.fillStyle = '#e9e2d2';
  c.fill();
  c.stroke();
  // kulp
  c.beginPath();
  c.arc(33, 6, 13, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  // gövde
  c.beginPath();
  c.moveTo(-34, -18);
  c.lineTo(34, -18);
  c.lineTo(24, 30);
  c.quadraticCurveTo(0, 38, -24, 30);
  c.closePath();
  c.fillStyle = '#fbf7ee';
  c.fill();
  c.stroke();
  // kahve + köpük
  c.beginPath();
  c.ellipse(0, -18, 34, 9, 0, 0, Math.PI * 2);
  c.fillStyle = '#6b3f22';
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0, -18, 22, 5, 0, 0, Math.PI * 2);
  c.fillStyle = '#b07a4d';
  c.fill();
  // süsleme bandı (çini mavisi)
  c.fillStyle = '#2f6fb3';
  c.fillRect(-30, -6, 60, 6);
  c.restore();
}

function yazi(c: CanvasRenderingContext2D, t: string, x: number, y: number, px: number, renk = '#3b2418') {
  c.font = `${px}px ${YAZI}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = px * 0.16;
  c.strokeStyle = '#fbf7ee';
  c.strokeText(t, x, y);
  c.fillStyle = renk;
  c.fillText(t, x, y);
}

const onbellek = new Map<number, CanvasTexture>();

function balonDokusu(adet: number): CanvasTexture | null {
  const once = onbellek.get(adet);
  if (once) return once;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = BOY;
  cv.height = BOY;
  const c = cv.getContext('2d');
  if (!c) return null;
  const pay = KONTUR;
  const g = BOY - pay * 2;
  const y2 = BOY * 0.74 - pay;
  c.lineWidth = KONTUR * 1.6;
  c.lineJoin = 'round';
  c.strokeStyle = PALETTE.outline;
  balonYolu(c, pay, pay, g, y2, 34);
  c.fillStyle = '#f6efe0';
  c.fill();
  c.stroke();
  const orta = pay + y2 / 2;
  fincanCiz(c, BOY * 0.36, orta + 4, 1.15);
  yazi(c, `×${adet}`, BOY * 0.73, orta + 6, 78);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  onbellek.set(adet, t);
  return t;
}

/** Oyun fontu yüklenmeden çizilen dokular sistem fontuyla kalmasın: font gelince önbellek tazelenir. */
function useFontHazir(): boolean {
  const [hazir, setHazir] = useState(() => typeof document === 'undefined' || document.fonts.check(`40px ${YAZI}`));
  useEffect(() => {
    if (hazir || typeof document === 'undefined') return;
    let iptal = false;
    document.fonts.load(`40px ${YAZI}`).then(() => {
      if (iptal) return;
      onbellek.forEach((t) => t.dispose());
      onbellek.clear();
      setHazir(true);
    });
    return () => {
      iptal = true;
    };
  }, [hazir]);
  return hazir;
}

/** Masanın kahve balonu — `istek` 0'dan büyükken görünür, belirirken hafif zıplar. */
export function KahveBalonu({ yer }: { yer: Kat2MasaYeri }) {
  const istek = useGame((s) => s.kat2Dunya.masalar.find((m) => m.id === yer.id)?.istek ?? 0);
  const fontHazir = useFontHazir();
  const mat = useMemo(() => new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => {
    if (istek <= 0) return;
    mat.map = balonDokusu(istek);
    mat.needsUpdate = true;
  }, [istek, mat, fontHazir]);
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    g.visible = istek > 0;
    if (istek <= 0) {
      t.current = 0;
      return;
    }
    t.current = Math.min(1, t.current + dt * 4);
    const x = t.current;
    const s = 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
    g.scale.setScalar(Math.max(0.001, s));
    g.position.y = BALON_Y + 0.05 * Math.sin(st.clock.elapsedTime * 2.2);
    g.quaternion.copy(st.camera.quaternion);
  });
  return (
    <group ref={ref} position={[yer.x, BALON_Y, yer.z]} visible={false}>
      <mesh material={mat} renderOrder={5}>
        <planeGeometry args={[BALON_W, BALON_W]} />
      </mesh>
    </group>
  );
}
