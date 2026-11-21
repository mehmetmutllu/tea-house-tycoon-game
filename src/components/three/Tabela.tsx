import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useGame } from '../../game/store';
import { tabelaYazisi } from '../../game/kafeAdi';
import { PALETTE } from '../../config/palette';
import { KEMER, TABELA, TABELA_YAZI, tabelaFontPx, tabelaUstY } from './streetLook';
import { DOOR } from './wallOlcu';

const TUVAL_EN = 1024;
const TUVAL_BOY = Math.round((TUVAL_EN * TABELA.h) / TABELA.w);

/** Ahşap levha + kafe adı (Türkçe büyük harf). Yazı uzunsa küçülür, levhadan taşmaz. */
function tabelaDokusu(metin: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = TUVAL_EN;
  c.height = TUVAL_BOY;
  const x = c.getContext('2d')!;
  x.fillStyle = PALETTE.tabela;
  x.fillRect(0, 0, TUVAL_EN, TUVAL_BOY);
  x.font = TABELA_YAZI.font.replace('{px}', '100');
  const harf100 = x.measureText('H').actualBoundingBoxAscent || 70;
  const px = tabelaFontPx(harf100, x.measureText(metin).width, TUVAL_EN, TUVAL_BOY);
  x.font = TABELA_YAZI.font.replace('{px}', px.toFixed(1));
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.fillStyle = PALETTE.tabelaYazi;
  x.fillText(metin, TUVAL_EN / 2, TUVAL_BOY / 2 + (harf100 * px) / 200);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * KAPI KEMERİ TABELASI (D-156 kafe adı · S5 yeni yeri) — direk başlıklarından çıkan iki dikme + kiriş, levha
 * kirişten iki askıyla sarkar. Ölçüler `streetLook.KEMER/TABELA`; x kapı ekseni. Yazı yalnız ön yüzde
 * (kutunun +z yüzü, BoxGeometry malzeme sırası 4), öteki yüzler düz ahşap.
 */
export function Tabela({ x }: { x: number }) {
  const kafeAdi = useGame((s) => s.kafeAdi);
  const metin = tabelaYazisi(kafeAdi);
  const doku = useMemo(() => tabelaDokusu(metin), [metin]);
  useEffect(() => () => doku.dispose(), [doku]);
  const dikmeBoy = KEMER.y + KEMER.kalin / 2 - KEMER.y0;
  const kirisAlt = KEMER.y - KEMER.kalin / 2;
  const askiBoy = kirisAlt - tabelaUstY() + 0.02;
  const askiX = TABELA.w / 2 - 0.25;
  return (
    <group position={[x, 0, KEMER.z]}>
      {[-DOOR.half, DOOR.half].map((dx) => (
        <mesh key={dx} castShadow position={[dx, KEMER.y0 + dikmeBoy / 2, 0]}>
          <boxGeometry args={[KEMER.dikme, dikmeBoy, KEMER.dikme]} />
          <meshStandardMaterial color={PALETTE.doorWood} />
        </mesh>
      ))}
      <mesh castShadow position={[0, KEMER.y, 0]}>
        <boxGeometry args={[DOOR.half * 2 + KEMER.tasma * 2, KEMER.kalin, KEMER.kalin]} />
        <meshStandardMaterial color={PALETTE.doorWood} />
      </mesh>
      {[-askiX, askiX].map((dx) => (
        <mesh key={dx} position={[dx, kirisAlt - askiBoy / 2, 0]}>
          <boxGeometry args={[0.03, askiBoy, 0.03]} />
          <meshStandardMaterial color={PALETTE.griddle} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <mesh castShadow position={[0, TABELA.y, TABELA.z - KEMER.z]} rotation={[-TABELA.egim, 0, 0]} userData={{ tabela: true }}>
        <boxGeometry args={[TABELA.w, TABELA.h, TABELA.d]} />
        <meshStandardMaterial attach="material-0" color={PALETTE.tabela} />
        <meshStandardMaterial attach="material-1" color={PALETTE.tabela} />
        <meshStandardMaterial attach="material-2" color={PALETTE.tabela} />
        <meshStandardMaterial attach="material-3" color={PALETTE.tabela} />
        <meshStandardMaterial attach="material-4" map={doku} roughness={0.8} />
        <meshStandardMaterial attach="material-5" color={PALETTE.tabela} />
      </mesh>
    </group>
  );
}
