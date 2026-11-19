/**
 * lights.tsx — SAHNENİN IŞIK TAKIMI, TEK TANIM.
 *
 * G0'da dünyanın ışığı sıcak yarımküre + krem güneşe geçti (gerekçe: `palette.ts` LIGHTING),
 * ama mağaza önizlemeleri (`SalonSlice`, `DioramaPreview`, `TableThemePreview`, `CharacterPanel`)
 * eski düz beyaz `ambientLight 0.6 + dirLight [6,12,6]` ile kalmıştı. Sonucu bir MAĞAZA HATASIYDI:
 * satın alınan zemin/duvar/masa rengi kartta bir türlü, salonda başka türlü görünüyordu.
 * Önizlemenin tek işi ne alacağını doğru göstermek olduğundan ışık artık tek yerden gelir.
 *
 * GÖLGE AÇIK (D-073, D-054 geri alındı): dünyayı çizen sahne `shadows` ile çağırır; mağaza
 * önizlemeleri (küçük diorama kesitleri) gölgesiz kalır — 34 × 34'lük gölge kamerası oraya
 * uymaz ve kartın işi ışığı değil RENGİ göstermek.
 * Fog/arka plan burada DEĞİL — onlar dünyaya ait; önizleme küçük bir kesit, sisi olmaz.
 */
import { useEffect, useRef } from 'react';
import type { DirectionalLight } from 'three';
import { LIGHTING } from '../../config/palette';
import { devPerfKol } from '../../game/devPerf';
import { cihazSinifiOku, golgeHaritasi } from '../../game/cihazSinifi';

export function SceneLights({ shadows = false }: { shadows?: boolean } = {}) {
  // DEV — F2 ölçüm kolu gölge haritasının kenarını değiştirebilir (`?f2golge=512`).
  // Harita belleği kenarın KARESİYLE büyür: 2048 → 16 MB, 1024 → 4 MB, 512 → 1 MB.
  // Üretimde `devPerfKol()` çağrılmaz, değer palette.ts'ten gelir.
  // Zayıf cihaz sınıfında 1024 (S4 · #1c, `golgeHaritasi`). Sınıf ölçülünce Scene yeniden
  // çizer ve burası yeni sınıfı okur.
  const harita = (import.meta.env.DEV ? devPerfKol()?.golgeHarita : 0) || golgeHaritasi(cihazSinifiOku(), LIGHTING.shadowMapSize);
  // three gölge haritasını İLK gölge karesinde `mapSize` ile bir kez kurar; kenar sonradan
  // değişirse (çalışırken zayıf damgası) eski hedef atılmalı ki yeni boyutla yeniden kurulsun.
  const gunes = useRef<DirectionalLight>(null);
  useEffect(() => {
    const g = gunes.current?.shadow;
    if (g?.map && g.map.width !== harita) {
      g.map.dispose();
      g.map = null;
    }
  }, [harita]);
  return (
    <>
      <hemisphereLight args={[LIGHTING.skyColor, LIGHTING.groundColor, LIGHTING.hemiIntensity]} />
      <directionalLight
        ref={gunes}
        position={LIGHTING.sunPos}
        color={LIGHTING.sunColor}
        intensity={LIGHTING.sunIntensity}
        castShadow={shadows}
        shadow-mapSize-width={harita}
        shadow-mapSize-height={harita}
        shadow-bias={LIGHTING.shadowBias}
        shadow-normalBias={LIGHTING.shadowNormalBias}
        shadow-camera-left={-LIGHTING.shadowExtent}
        shadow-camera-right={LIGHTING.shadowExtent}
        shadow-camera-top={LIGHTING.shadowExtent}
        shadow-camera-bottom={-LIGHTING.shadowExtent}
        shadow-camera-near={LIGHTING.shadowNear}
        shadow-camera-far={LIGHTING.shadowFar}
      />
      {/* Soğuk dolgu ışığı (B6b) — güneşin görmediği yüzler sarıya boğulmasın diye. Gerekçe palette.ts. */}
      <directionalLight
        position={LIGHTING.fillPos}
        color={LIGHTING.fillColor}
        intensity={LIGHTING.fillIntensity}
      />
    </>
  );
}
