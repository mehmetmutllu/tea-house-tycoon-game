/**
 * kat2/Grup.tsx — KAT 2'NİN MÜŞTERİ GRUBU (dörtlü okey · ikili tavla), yalnız ÇİZİM.
 *
 * Mantık grubun yerini bilmez: masa `bos → geliyor → oyunda → bos` diye döner ve her durumun
 * kalan süresini (`t`) tutar (`kat2Dongu`). Görsel bunlardan TÜRER, kendi saati yoktur:
 *  · geliyor : yolun neresinde olduğu = kalan süre / toplam süre (sahne sonradan açılsa da doğru yerde)
 *  · bos (son saniyeler) : grup merdivenden erken çıkmaya başlar — `yurume` (5 sn) uzak masaya
 *    yürümek için kısa; görsel süre `ONCE_EN_COK` kadar öne uzar, mantık değişmez.
 *  · oyunda : oturur, oynar (baş sallar, gövde hafif döner; masada taş/zar oynar — `Esya`).
 *  · oyun biter (oyunda → başka durum): KISA ÇIKIŞ — kalkar, geldiği yoldan döner; merdivene
 *    yetişemeyecek kadar uzaksa yolda söner. Durumda yok, yalnız görsel (rapora yazıldı).
 *    Geçiş KAREDE değil store aboneliğinde yakalanır (`useKalkisIzle`): her durum yazımı görülür,
 *    kare atlansa, gövde henüz yüklenmese ya da birkaç tick tek karede koşsa da kalkış kaçmaz.
 *
 * Gövdeler Kat 1 müşterisinin gövdeleri (KayKit, `Customers.yuvaKur`un sade hâli): baş dokulu +
 * gövde köşe renkli = gövde başına İKİ çizim. Masa başına bir kez, ilk geliş anında kurulur.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  AnimationMixer, BufferAttribute, Color, Group, MathUtils, MeshStandardMaterial, SkinnedMesh,
  type AnimationAction, type AnimationClip, type Bone, type BufferGeometry,
} from 'three';
import { clone as skinKlon } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../../../game/store';
import { economyConfig } from '../../../config/economy.config';
import { KAY_KOK, KAY_MUSTERI_GOVDE, KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, KAY_SCALE } from '../../../config/actor';
import { PALETTE } from '../../../config/palette';
import { KLIP, LOKOMOSYON_YURUYUS, basMi, ekipmanMi, kafaKucult, lokomosyonSec, useKayKlipler } from '../KayActor';
import type { Kat2MasaYeri } from '../../../game/kat';
import { grupYolu, oturakYerleri, yolKur, yolNoktasi, type Nokta, type Yol } from './yol';
import { useMasaSv } from './masaSv';

const AYAR = economyConfig.kat2;
/** Grup en çok bu kadar sn önce merdivenden çıkmaya başlar (mantıktaki `bos` süresinin sonu). */
const ONCE_EN_COK = 8;
/** Yürüyüş hızı (Kat 1 müşterisi `NPC_SPEED` 1,4); uzak masada süre yetmezse hızlanır. */
const HIZ = 1.5;
/** Grup üyeleri arka arkaya çıkar (sn). */
const ARA = 0.45;
/** Kısa çıkış: en çok bu kadar sn yürür, sonra (merdivene yetişmediyse) söner. */
const CIKIS_SN = 5.5;
const SONME_SN = 0.35;
const GOMLEK = ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#4bacc6', '#d6b656', '#7f6084', '#e8e1d0', '#5b8a72'];

type TurGeo = { bas: BufferGeometry | null; govde: BufferGeometry | null };
const turGeolari = new WeakMap<Group, TurGeo>();

type Govde = {
  kok: Group;
  mixer: AnimationMixer;
  eylem: Record<string, AnimationAction>;
  mat: MeshStandardMaterial;
  bas: Bone | null;
  /** Başa eklenen eğim (bir sonraki karede geri alınır — klip başı yazmıyorsa birikmesin). */
  basEk: number;
  klip: string;
};

function govdeKur(kaynak: Group, klipler: AnimationClip[], faz: number): Govde {
  const kok = skinKlon(kaynak) as Group;
  const parcalar: SkinnedMesh[] = [];
  kok.traverse((n) => {
    const m = n as SkinnedMesh;
    if (m.isSkinnedMesh) parcalar.push(m);
  });
  const sivil = parcalar.filter((p) => !ekipmanMi(p.name));
  const ana = sivil[0] ?? parcalar[0];
  const ust = ana.parent ?? kok;
  parcalar.forEach((p) => p.parent?.remove(p));
  let tur = turGeolari.get(kaynak);
  if (!tur) {
    const govde = sivil.filter((p) => !basMi(p.name)).map((p) => {
      const g = p.geometry.clone();
      const renk = new Color(/leg/i.test(p.name) ? PALETTE.pants : '#ffffff');
      const say = g.attributes.position.count;
      const dizi = new Float32Array(say * 3);
      for (let v = 0; v < say; v++) dizi.set([renk.r, renk.g, renk.b], v * 3);
      g.setAttribute('color', new BufferAttribute(dizi, 3));
      return g;
    });
    const bas = sivil.filter((p) => basMi(p.name)).map((p) => p.geometry.clone());
    tur = { bas: bas.length ? mergeGeometries(bas, false) : null, govde: govde.length ? mergeGeometries(govde, false) : null };
    turGeolari.set(kaynak, tur);
  }
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, vertexColors: true });
  for (const [geo, m] of [[tur.bas, ana.material], [tur.govde, mat]] as const) {
    if (!geo) continue;
    const mesh = new SkinnedMesh(geo, m);
    mesh.bind(ana.skeleton, ana.bindMatrix);
    mesh.castShadow = true;
    // Kırpma açık, küre elle (Kat 1 `kirpmaKuresi`): dinlenme pozundan ×1,5 pay — yürüyüş/oturuş
    // uzuvları taşsa da kenarda yarım görünen gövde birden kaybolmasın.
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const kure = geo.boundingSphere!.clone();
    kure.radius *= 1.5;
    mesh.boundingSphere = kure;
    ust.add(mesh);
  }
  kafaKucult(kok);
  kok.scale.setScalar(KAY_SCALE);
  kok.visible = false;
  let bas: Bone | null = null;
  kok.traverse((n) => {
    if ((n as Bone).isBone && n.name === 'head') bas = n as Bone;
  });
  const mixer = new AnimationMixer(kok);
  const eylem: Record<string, AnimationAction> = {};
  for (const ad of [KLIP.dur, KLIP.otur, ...LOKOMOSYON_YURUYUS.yuru]) {
    const k = klipler.find((c) => c.name === ad);
    if (k) eylem[ad] = mixer.clipAction(k);
  }
  eylem[KLIP.dur]?.play();
  mixer.setTime(faz * 0.37);
  return { kok, mixer, eylem, mat, bas, basEk: 0, klip: KLIP.dur };
}

function klipSec(g: Govde, ad: string, oran = 1) {
  const a = g.eylem[ad];
  if (!a) return;
  a.timeScale = oran;
  if (g.klip === ad) return;
  a.reset().fadeIn(0.2).play();
  g.eylem[g.klip]?.fadeOut(0.2);
  g.klip = ad;
}

const _p: Nokta = [0, 0, 0];

/** Masa kimliği → son kalkışın anı (`performance.now`, ms). Abonelik yazar, `MasaGrubu` okur. */
const kalkisAni = new Map<string, number>();

/**
 * Kalkışı store'un HER yazımında yakalar: önceki durumda `oyunda` olup şimdi olmayan masa kalktı.
 * Kat 2 sahnesi açıkken bir kez takılır.
 */
export function useKalkisIzle() {
  useEffect(
    () =>
      useGame.subscribe((s, o) => {
        if (s.kat2Dunya === o.kat2Dunya) return;
        const once = new Map(o.kat2Dunya.masalar.map((m) => [m.id, m.durum]));
        const simdi = performance.now();
        for (const m of s.kat2Dunya.masalar) if (m.durum !== 'oyunda' && once.get(m.id) === 'oyunda') kalkisAni.set(m.id, simdi);
      }),
    [],
  );
}

/** Bir masanın grubu. Masa açık olduğu sürece takılı; gövdeler ilk gelişte kurulur. */
export function MasaGrubu({ yer, sira }: { yer: Kat2MasaYeri; sira: number }) {
  // Sv4'te masa büyür, oturaklar açılır: grup yeni oturağa yürür ve oturur (`oturakYerleri(tur, sv)`).
  const sv = useMasaSv(yer.id);
  const oturaklar = useMemo(() => oturakYerleri(yer.tur, sv), [yer.tur, sv]);
  const yollar = useMemo<Yol[]>(() => oturaklar.map((o, k) => yolKur(grupYolu(yer, o, k))), [yer, oturaklar]);
  const enUzun = Math.max(...yollar.map((y) => y.boy));
  // Görsel geliş süresi: mantığın `yurume`si + merdivenden erken çıkış (çıkışla çakışmasın diye sınırlı).
  const once = MathUtils.clamp(enUzun / HIZ - AYAR.yurume, 0, Math.min(ONCE_EN_COK, AYAR.gelisAralik - CIKIS_SN - SONME_SN - 0.5));
  const T = AYAR.yurume + once;

  const kaynaklar = useGLTF(useMemo(() => KAY_MUSTERI_GOVDE.map((g) => `${KAY_KOK}${g}.glb`), []));
  const klipler = useKayKlipler();
  const kap = useMemo(() => {
    const g = new Group();
    g.userData.k2npc = true; // oyuncu silüeti (bölme adayı D) bu gövdeleri atlar
    return g;
  }, []);
  const govdeler = useRef<Govde[] | null>(null);
  const hal = useRef({ onceki: 'kapali', kip: 'yok', cikisT: -1, ziyaret: sira * 3, kalkis: kalkisAni.get(yer.id) ?? 0 });

  useFrame((st, dt) => {
    const m = useGame.getState().kat2Dunya.masalar.find((x) => x.id === yer.id);
    const durum = m?.durum ?? 'kapali';
    const h = hal.current;
    const ani = kalkisAni.get(yer.id) ?? 0;
    if (ani !== h.kalkis) {
      // Yeni kalkış: aradan geçen süre kadar ileriden başlar (gövde geç yüklendiyse yetişir).
      h.kalkis = ani;
      const gecti = (performance.now() - ani) / 1000;
      h.cikisT = gecti < CIKIS_SN ? Math.max(0, gecti - dt) : -1;
    }
    if (durum === 'geliyor' && h.onceki !== 'geliyor') h.cikisT = -1;
    h.onceki = durum;
    if (h.cikisT >= 0) h.cikisT += dt;

    // Hangi kip: gel (yol oranı) · otur · çık · yok
    let kip: 'gel' | 'otur' | 'cik' | 'yok' = 'yok';
    let gecen = 0;
    if (h.cikisT >= 0 && h.cikisT < CIKIS_SN + SONME_SN) kip = 'cik';
    else if (durum === 'oyunda') kip = 'otur';
    else if (durum === 'geliyor' && m) {
      kip = 'gel';
      gecen = T - m.t;
    } else if (durum === 'bos' && m && m.t <= once) {
      kip = 'gel';
      gecen = once - m.t;
    }
    if (h.cikisT >= CIKIS_SN + SONME_SN) h.cikisT = -1;
    // Yeni grup (gömlek renkleri değişir): geliş, oturma ya da gelişin içinden başlamadıysa.
    if (kip === 'gel' && h.kip !== 'gel' && h.kip !== 'otur') h.ziyaret++;
    h.kip = kip;

    if (kip === 'yok') {
      if (govdeler.current) for (const g of govdeler.current) g.kok.visible = false;
      return;
    }
    if (!govdeler.current) {
      govdeler.current = yollar.map((_, k) => {
        const g = govdeKur(kaynaklar[(sira * 2 + k) % kaynaklar.length].scene as Group, klipler, sira * 4 + k);
        kap.add(g.kok);
        return g;
      });
    }
    const zaman = st.clock.elapsedTime;
    govdeler.current.forEach((g, k) => {
      g.mat.color.set(GOMLEK[(h.ziyaret * 4 + k * 3) % GOMLEK.length]);
      const yol = yollar[k];
      const [dx, dz] = oturaklar[k];
      const aciOtur = Math.atan2(-dx, -dz);
      let olcek = 1;
      if (kip === 'otur') {
        g.kok.position.set(yer.x + dx + Math.sin(aciOtur) * KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, yer.z + dz + Math.cos(aciOtur) * KAY_OTURMA_ILERI);
        // oynuyor hissi: gövde ıstakaya doğru hafifçe döner (oyuncu başına ayrı faz)
        g.kok.rotation.y = aciOtur + 0.12 * Math.sin(zaman * 0.8 + k * 1.7 + sira);
        klipSec(g, KLIP.otur);
      } else {
        let u: number;
        let hiz: number;
        if (kip === 'gel') {
          const bas = k * ARA;
          const sure = Math.max(0.5, T - bas);
          u = MathUtils.clamp((gecen - bas) / sure, 0, 1);
          hiz = yol.boy / sure;
          if (u <= 0) {
            g.kok.visible = false;
            return;
          }
        } else {
          // çıkış: oturaktan geldiği yola, merdivene doğru (ters yön)
          const yuruyen = Math.max(0, h.cikisT - k * 0.25);
          hiz = HIZ;
          u = 1 - (yuruyen * HIZ) / yol.boy;
          if (u <= 0) {
            g.kok.visible = false;
            return;
          }
          const kalan = h.cikisT - CIKIS_SN;
          if (kalan > 0) olcek = Math.max(0.001, 1 - kalan / SONME_SN);
        }
        let aci = yolNoktasi(yol, u, _p);
        if (kip === 'cik') aci += Math.PI;
        if (u >= 1) {
          g.kok.position.set(yer.x + dx + Math.sin(aciOtur) * KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, yer.z + dz + Math.cos(aciOtur) * KAY_OTURMA_ILERI);
          g.kok.rotation.y = aciOtur;
          klipSec(g, KLIP.otur);
        } else {
          g.kok.position.set(_p[0], _p[1], _p[2]);
          let fark = aci - g.kok.rotation.y;
          while (fark > Math.PI) fark -= Math.PI * 2;
          while (fark < -Math.PI) fark += Math.PI * 2;
          g.kok.rotation.y += fark * Math.min(1, dt * 10);
          const sec = lokomosyonSec(LOKOMOSYON_YURUYUS.yuru, hiz);
          klipSec(g, sec.klip, sec.timeScale);
        }
      }
      g.kok.scale.setScalar(KAY_SCALE * olcek);
      g.kok.visible = true;
      if (g.bas) g.bas.rotation.x -= g.basEk;
      g.mixer.update(dt);
      // oturan baş: düşünür gibi hafif öne eğilip kalkar (klibin üstüne eklenir)
      g.basEk = kip === 'otur' ? 0.16 * Math.max(0, Math.sin(zaman * 0.9 + k * 2.1 + sira * 0.7)) : 0;
      if (g.bas) g.bas.rotation.x += g.basEk;
    });
  });

  return <primitive object={kap} />;
}
