/**
 * padAday.tsx — 1.0.7 arayüz turu: ZEMİN İŞARETİNİN (pad + yükseltme noktası) GÖRÜNÜŞ ADAYLARI.
 * YALNIZ GELİŞTİRMEDE çalışır (`window.__padStil('C')`); kullanıcı seçince seçilen aday
 * GroundMarker'a yazılır ve bu dosya SİLİNİR. Çerçeve ölçüsü (`markerFrame`, D-121) hiçbir
 * adayda değişmez — tetik alanı ile çizilen kutu aynı kalır; yalnız görünüş değişir.
 */
import { useEffect, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { CanvasTexture, Color, MeshBasicMaterial, Path, Shape } from 'three';
import { create } from 'zustand';
import { ETIKET_PUNTO, KENAR_PAYI, OK_BOSLUK, OK_GENIS, markerFrame } from '../../game/markerFrame';
import type { Vec3 } from '../../game/types';

export const usePadAday = create<{ v: string }>(() => ({ v: 'A' }));
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __padStil: (v: string) => void }).__padStil = (v) => usePadAday.setState({ v });
}

const FONT = '/assets/fonts/Baloo2.ttf';
const MOR = '#2a1f4d';
const SARI = '#ffc933';

function rrect(w: number, h: number, r: number, cx = 0, cy = 0): Shape {
  const s = new Shape();
  const hw = w / 2;
  const hh = h / 2;
  const q = Math.min(r, hw, hh);
  s.moveTo(cx - hw + q, cy - hh);
  s.lineTo(cx + hw - q, cy - hh);
  s.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + q);
  s.lineTo(cx + hw, cy + hh - q);
  s.quadraticCurveTo(cx + hw, cy + hh, cx + hw - q, cy + hh);
  s.lineTo(cx - hw + q, cy + hh);
  s.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - q);
  s.lineTo(cx - hw, cy - hh + q);
  s.quadraticCurveTo(cx - hw, cy - hh, cx - hw + q, cy - hh);
  return s;
}
/** Kesintisiz yuvarlak kenarlık: dış dikdörtgen − iç dikdörtgen. */
function halka(w: number, h: number, r: number, k: number): Shape {
  const s = rrect(w, h, r);
  const ic = rrect(w - 2 * k, h - 2 * k, Math.max(0.01, r - k));
  s.holes.push(new Path(ic.getPoints(12).reverse()));
  return s;
}
function okShape(en: number): Shape {
  const h = en * 0.75;
  const k = en * 0.275;
  const s = new Shape();
  const alt = -h / 2;
  s.moveTo(-en / 2, alt);
  s.lineTo(0, alt + h);
  s.lineTo(en / 2, alt);
  s.lineTo(en / 2 - k, alt);
  s.lineTo(0, alt + h - k * 1.9);
  s.lineTo(-en / 2 + k, alt);
  s.closePath();
  return s;
}
function isikDokusu(renk: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  const col = new Color(renk);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  gr.addColorStop(0, `rgba(${rgb},0.75)`);
  gr.addColorStop(0.65, `rgba(${rgb},0.35)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}
const koyu = (hex: string, k: number) => '#' + new Color(hex).multiplyScalar(k).getHexString();

const ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

export function PadAday({
  v,
  pos,
  label,
  sub,
  tint,
  progress,
  afford,
  r,
  arrow,
}: {
  v: string;
  pos: Vec3;
  label: string;
  sub?: string;
  tint: string;
  progress: number;
  afford: boolean;
  r: number;
  arrow: boolean;
}) {
  const { hw, hh } = markerFrame(label, r, arrow);
  const W = 2 * hw;
  const H = 2 * hh;
  const R = hh * 0.3;
  const punto = r * ETIKET_PUNTO;
  const okBlok = arrow ? (OK_GENIS + OK_BOSLUK) * r : 0;
  const yaziSol = -hw + KENAR_PAYI * r + okBlok;
  const okX = -hw + KENAR_PAYI * r + (OK_GENIS * r) / 2;
  const p = Math.max(0, Math.min(1, progress));

  const sekil = useMemo(() => ({
    zemin: rrect(W * 0.97, H * 0.97, R),
    halka: halka(W, H, R, hh * 0.13),
    inceHalka: halka(W, H, R, hh * 0.07),
    ok: okShape(OK_GENIS * r),
    serit: rrect(W * 0.94, H * 0.36, R * 0.7, 0, -hh * 0.55),
  }), [W, H, R, hh, r]);
  const isik = useMemo(() => (v === 'I' ? isikDokusu(tint) : null), [v, tint]);
  const mats = useMemo(() => ({ tint: new MeshBasicMaterial({ color: tint, depthWrite: false, transparent: true }) }), [tint]);
  useEffect(() => () => { isik?.dispose(); mats.tint.dispose(); }, [isik, mats]);

  // Kesik çizgi (D): dört kenar boyunca kısa yuvarlak parçalar.
  const kesik = useMemo(() => {
    if (v !== 'D') return [];
    const out: { x: number; y: number; w: number; h: number }[] = [];
    const k = hh * 0.11;
    const parca = hh * 0.34;
    const bosluk = hh * 0.2;
    for (let x = -hw + R; x < hw - R - parca * 0.5; x += parca + bosluk) {
      const w = Math.min(parca, hw - R - x);
      out.push({ x: x + w / 2, y: -hh + k / 2, w, h: k }, { x: x + w / 2, y: hh - k / 2, w, h: k });
    }
    for (let y = -hh + R; y < hh - R - parca * 0.5; y += parca + bosluk) {
      const h = Math.min(parca, hh - R - y);
      out.push({ x: -hw + k / 2, y: y + h / 2, w: k, h }, { x: hw - k / 2, y: y + h / 2, w: k, h });
    }
    return out;
  }, [v, hw, hh, R]);

  // Görünüş tablosu — her aday yalnız bu sayılarla ve aşağıdaki katmanlarla ayrışır.
  const zeminRenk = v === 'F' ? MOR : v === 'C' ? tint : v === 'G' || v === 'I' ? null : '#14202a';
  const zeminOp = v === 'F' ? 0.88 : v === 'C' ? 1 : v === 'E' ? 0.4 : afford ? 0.34 : 0.24;
  const yaziRenk = v === 'C' ? koyu(tint, 0.28) : '#ffffff';
  const kontur = v === 'C' ? tint : v === 'F' ? MOR : '#14202a';
  const fiyatRenk = v === 'C' ? koyu(tint, 0.28) : '#ffe082';
  const fiyatPunto = v === 'E' ? r * 0.52 : r * 0.36;
  const etiketPunto = v === 'E' ? punto * 0.72 : punto;
  const etiketY = v === 'E' ? -hh * 0.42 : v === 'H' ? -hh * 0.22 : sub ? -hh * 0.3 : 0;
  const fiyatY = v === 'E' ? hh * 0.32 : v === 'H' ? hh * 0.55 : hh * 0.52;

  return (
    <group position={[pos[0], 0, pos[2]]} name={`isaret:${label}`} userData={{ olcum: { label, r, hw, hh, arrow } }}>
      {/* C: hafif kalınlığı olan renkli karo — zeminden 4 cm, havada değil */}
      {v === 'C' && (
        <mesh position={[0, 0.012, 0]} rotation={ROT}>
          <shapeGeometry args={[rrect(W, H, R, 0, -0.06)]} />
          <meshBasicMaterial color={koyu(tint, 0.55)} depthWrite={false} />
        </mesh>
      )}
      {zeminRenk && (
        <mesh position={[0, 0.02, 0]} rotation={ROT}>
          <shapeGeometry args={[sekil.zemin]} />
          <meshBasicMaterial color={zeminRenk} transparent opacity={zeminOp} depthWrite={false} />
        </mesh>
      )}
      {v === 'I' && isik && (
        <mesh position={[0, 0.02, 0]} rotation={ROT}>
          <planeGeometry args={[W * 1.5, H * 1.9]} />
          <meshBasicMaterial map={isik} transparent depthWrite={false} />
        </mesh>
      )}

      {/* dolum — alttan üste; H'de şerit soldan sağa */}
      {p > 0.001 && v !== 'H' && (
        <mesh position={[0, 0.03, H * 0.45 - (H * 0.9 * p) / 2]} rotation={ROT} scale={[1, p, 1]}>
          <planeGeometry args={[W * 0.9, H * 0.9]} />
          <meshBasicMaterial color={v === 'C' ? '#ffffff' : tint} transparent opacity={v === 'C' ? 0.35 : 0.42} depthWrite={false} />
        </mesh>
      )}

      {/* kenar */}
      {(v === 'B' || v === 'F' || v === 'H') && (
        <mesh position={[0, 0.032, 0]} rotation={ROT}>
          <shapeGeometry args={[v === 'F' ? sekil.inceHalka : sekil.halka]} />
          <meshBasicMaterial color={v === 'B' ? '#ffffff' : tint} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      )}
      {v === 'C' && (
        <mesh position={[0, 0.032, 0]} rotation={ROT}>
          <shapeGeometry args={[sekil.inceHalka]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}
      {v === 'D' && kesik.map((s, i) => (
        <mesh key={i} position={[s.x, 0.032, -s.y]} rotation={ROT}>
          <planeGeometry args={[s.w, s.h]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
      {v === 'G' && (
        <group position={[0, 0.032, 0]} rotation={ROT}>
          {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
            <group key={i} position={[sx * hw, sy * hh, 0]} scale={[-sx, -sy, 1]}>
              <mesh position={[hh * 0.25, hh * 0.06, 0]}>
                <planeGeometry args={[hh * 0.5, hh * 0.12]} />
                <meshBasicMaterial color="#ffffff" depthWrite={false} />
              </mesh>
              <mesh position={[hh * 0.06, hh * 0.25, 0]}>
                <planeGeometry args={[hh * 0.12, hh * 0.5]} />
                <meshBasicMaterial color="#ffffff" depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {/* H: altta renkli fiyat şeridi */}
      {v === 'H' && (
        <>
          <mesh position={[0, 0.034, 0]} rotation={ROT}>
            <shapeGeometry args={[sekil.serit]} />
            <meshBasicMaterial color={koyu(tint, 0.6)} depthWrite={false} />
          </mesh>
          {p > 0.001 && (
            <mesh position={[-W * 0.47 + (W * 0.94 * p) / 2, 0.036, hh * 0.55]} rotation={ROT}>
              <planeGeometry args={[W * 0.94 * p, H * 0.36]} />
              <meshBasicMaterial color={tint} depthWrite={false} />
            </mesh>
          )}
        </>
      )}

      {arrow && (
        <mesh position={[okX, 0.05, -hh * 0.3]} rotation={ROT} renderOrder={6}>
          <shapeGeometry args={[sekil.ok]} />
          <meshBasicMaterial color={v === 'F' ? SARI : '#ffffff'} transparent depthWrite={false} />
        </mesh>
      )}
      <Text
        renderOrder={8}
        font={FONT}
        fontWeight={800}
        letterSpacing={0.02}
        position={[arrow ? yaziSol : 0, 0.05, etiketY]}
        rotation={ROT}
        fontSize={etiketPunto}
        color={yaziRenk}
        anchorX={arrow ? 'left' : 'center'}
        anchorY="middle"
        outlineWidth={etiketPunto * 0.1}
        outlineColor={kontur}
        maxWidth={2 * hw - okBlok - KENAR_PAYI * r * 2}
        textAlign={arrow ? 'left' : 'center'}
      >
        {label}
      </Text>
      {sub && (
        <>
          <group position={[-(0.12 + sub.length * (v === 'E' ? 0.15 : 0.1)) * r, 0.05, fiyatY]}>
            <mesh rotation={ROT} renderOrder={6}>
              <circleGeometry args={[r * (v === 'E' ? 0.27 : 0.19), 20]} />
              <meshBasicMaterial color={SARI} transparent depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.004, 0]} rotation={ROT} renderOrder={7}>
              <ringGeometry args={[r * (v === 'E' ? 0.2 : 0.14), r * (v === 'E' ? 0.27 : 0.19), 20]} />
              <meshBasicMaterial color="#b87400" transparent depthWrite={false} />
            </mesh>
          </group>
          <Text
            renderOrder={8}
            font={FONT}
            fontWeight={800}
            position={[0.13 * r, 0.05, fiyatY]}
            rotation={ROT}
            fontSize={fiyatPunto}
            color={fiyatRenk}
            anchorX="center"
            anchorY="middle"
            outlineWidth={fiyatPunto * 0.08}
            outlineColor={kontur}
          >
            {sub}
          </Text>
        </>
      )}
    </group>
  );
}
