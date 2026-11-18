/**
 * katKatmani.tsx — bir katın dünyası (Kat 1 · Kat 2) için GİZLİYKEN BEDAVA katman (perf W3).
 *
 * Gizli kat takılı kalır (geri dönüşte yeniden kurulum yok) ama kare başına üç iş yapmamalı:
 *  · çizim/gölge — `visible=false` zaten düşürür;
 *  · `scene.updateMatrixWorld` dolaşması — three r184'te `matrixWorldAutoUpdate=false` ÇOCUKLARI
 *    yine dolaşır; alt ağacı atlamak için grubun `updateMatrixWorld`ü gizliyken erken döner.
 *    Görünür olduğu ilk karede grup kendi matrisini tazeler → `force` bütün alt ağaca iner, bayat matris kalmaz;
 *  · görsel `useFrame` döngüleri — `useKatGizli()` ile erken döner (mantık `tick`te, buna dokunulmaz).
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { Group, type Object3D, type SkinnedMesh } from 'three';
import { useGame } from '../../game/store';

/**
 * Alt ağacın katı; 0 = katsız (oyuncu, kamera — her katta çizilir, hiç gizlenmez). `saklar`: katman gizliyken
 * `Activity hidden` ile efektleri sökülür (Kat 2) — o sökülme bileşenin gerçek sökülmesi değildir.
 */
const KatBaglam = createContext({ kat: 0, saklar: false });

/** Görsel `useFrame` döngüsünün erken dönüş sorusu: bu bileşenin katı şu an gizli mi. */
export function useKatGizli(): () => boolean {
  const { kat } = useContext(KatBaglam);
  return useCallback(() => kat !== 0 && useGame.getState().kat !== kat, [kat]);
}

/**
 * Efekt temizliğinde GPU kaynağı bırakılsın mı: gerçek sökülmede evet; `Activity` gizlemesinde hayır (nesne
 * yerinde durur, dönüşte yeniden kurulum/derleme olmasın). Saklanan katmanın tamamı sökülürse `KatKatmani` bırakır.
 */
export function useSokulurkenBirak(): () => boolean {
  const { kat, saklar } = useContext(KatBaglam);
  return useCallback(() => !saklar || useGame.getState().kat === kat, [kat, saklar]);
}

/** Bir klonun iskeletlerinin GPU kemik dokusunu bırakır (paylaşılan iskelet bir kez). */
export function iskeletleriBirak(kok: Object3D) {
  const gorulen = new Set<unknown>();
  kok.traverse((n) => {
    const m = n as SkinnedMesh;
    if (!m.isSkinnedMesh || !m.skeleton || gorulen.has(m.skeleton)) return;
    gorulen.add(m.skeleton);
    m.skeleton.dispose();
  });
}

/** Katın kök grubu: görünürlük + gizliyken matris dolaşmasını atlama + `useKatGizli` bağlamı. */
export function KatKatmani({ kat, saklar = false, children }: { kat: number; saklar?: boolean; children: ReactNode }) {
  const gorunur = useGame((g) => g.kat === kat);
  const kok = useMemo(() => {
    const g = new Group();
    g.name = `kat${kat}`;
    g.updateMatrixWorld = function (force?: boolean) {
      if (!this.visible) return;
      Group.prototype.updateMatrixWorld.call(this, force);
    };
    return g;
  }, [kat]);
  // Katman sökülürken (Kat 2 kapandı: sıfırlama/kayıt yükleme) alt ağaçtaki klon iskeletlerinin GPU kemik
  // dokuları bırakılır — saklanan katmanda gizliyken sökülen bileşenler bırakmaz (`useSokulurkenBirak`).
  // Yerleşim efekti: temizliği çocuklar sahneden ayrılmadan önce koşar.
  useLayoutEffect(() => () => iskeletleriBirak(kok), [kok]);
  const baglam = useMemo(() => ({ kat, saklar }), [kat, saklar]);
  return (
    <KatBaglam.Provider value={baglam}>
      <primitive object={kok} visible={gorunur}>
        {children}
      </primitive>
    </KatBaglam.Provider>
  );
}
