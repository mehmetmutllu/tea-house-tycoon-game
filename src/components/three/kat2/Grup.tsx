/**
 * kat2/Grup.tsx — KAT 2'NİN MÜŞTERİ GRUBU (dörtlü okey · ikili tavla), yalnız ÇİZİM.
 *
 * Mantık grubun yerini bilmez: masa `bos → geliyor → oyunda → bos` diye döner ve her durumun
 * kalan süresini (`t`) tutar (`kat2Dongu`). Görsel bunlardan TÜRER, kendi saati yoktur:
 *  · geliyor : yolun neresinde olduğu = kalan süre / toplam süre (sahne sonradan açılsa da doğru yerde)
 *  · bos (son saniyeler) : grup merdivenden erken çıkmaya başlar — `yurume` (5 sn) uzak masaya
 *    yürümek için kısa; görsel süre yolun gerektirdiği kadar (en çok `ONCE_EN_COK`) öne uzar, mantık
 *    değişmez. Boş süre kısaysa (Sv5: 1,5 sn) yeni grup önceki daha oynarken çıkış takımıyla yola çıkar.
 *  · oyunda : oturur, oynar (baş sallar, gövde hafif döner; masada taş/zar oynar — `Esya`).
 *  · oyun biter (oyunda → başka durum): ÇIKIŞ (G-99) — kalkar, çıkış şeridinden kuyunun yanına,
 *    sahanlıktan merdivene yürür ve İNERKEN (kuyu dibinde, zeminin altında) söner (`cikisYolu`).
 *    Çıkan grup kendi gövde takımıyla yürür: kalkışta oturan takım çıkış takımı olur, yeni grup
 *    öbür takımla gelir — Sv5'te boş süre 1,5 sn, iki grup aynı anda yolda (eskiden yeni geliş
 *    çıkanı salonun ortasında silerdi). Durumda yok, yalnız görsel.
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
  AnimationMixer, BufferAttribute, Color, Group, MeshStandardMaterial, SkinnedMesh,
  type AnimationAction, type AnimationClip, type Bone, type BufferGeometry,
} from 'three';
import { clone as skinKlon } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../../../game/store';
import { economyConfig } from '../../../config/economy.config';
import { ACTOR_HEIGHT, KAY_KOK, KAY_MUSTERI_GOVDE, KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, KAY_SCALE } from '../../../config/actor';
import { PALETTE } from '../../../config/palette';
import { KLIP, LOKOMOSYON_YURUYUS, basMi, ekipmanMi, kafaKucult, lokomosyonSec, useKayKlipler } from '../KayActor';
import type { Kat2MasaYeri } from '../../../game/kat';
import { GRUP_HIZ, SONME_SN, cikisPozu, cikisSuresi, cikisYolu, gelisGecen, gelisHizi, gelisOrani, gerekenOnce, grupYolu, oturakYerleri, yolKur, yolNoktasi, type Nokta, type Yol } from './yol';
import { svCarpan } from '../../../game/kat2Dongu';
import { useMasaSv } from './masaSv';
import { masaBul } from './masaIndeks';
import { iskeletleriBirak, useSokulurkenBirak } from '../katKatmani';
import { KAPI_ONCELIK, gizliykenBedava, gorusteMi } from './gorusKapisi';

const AYAR = economyConfig.kat2;
/**
 * Grup en çok bu kadar sn önce merdivenden çıkmaya başlar (mantıktaki `bos` süresinin sonu). Oyun 90 sn,
 * çıkış ≤ ~30 sn: erken gelen, önceki grubun çıkışı bittikten sonra yola çıkar (iki takım yeter).
 */
const ONCE_EN_COK = 24;
/** Gövdenin yatay yarıçapı (kollar açık) — görünürlük kapısının payı. */
const GOVDE_YARI = 0.6;
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
  /** Kadraj dışında biriken animasyon süresi (T1); görününce tek adımda ilerler. */
  bekleyenDt: number;
  klip: string;
  /** Gömlek renginin yazıldığı ziyaret (renk yalnız yeni grupta yazılır, her kare değil). */
  renkZiyaret: number;
};

function govdeKur(kaynak: Group, klipler: AnimationClip[], faz: number): Govde {
  const kok = gizliykenBedava(skinKlon(kaynak) as Group);
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
  return { kok, mixer, eylem, mat, bas, basEk: 0, bekleyenDt: 0, klip: KLIP.dur, renkZiyaret: -1 };
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
        const yeni = s.kat2Dunya.masalar;
        const eski = o.kat2Dunya.masalar;
        if (yeni === eski) return;
        let simdi = 0;
        for (const m of yeni) {
          if (m.durum === 'oyunda' || masaBul(eski, m.id)?.durum !== 'oyunda') continue;
          simdi ||= performance.now();
          kalkisAni.set(m.id, simdi);
        }
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
  const cikislar = useMemo<Yol[]>(() => oturaklar.map((o, k) => yolKur(cikisYolu(yer, o, k))), [yer, oturaklar]);
  const boylar = useMemo(() => yollar.map((y) => y.boy), [yollar]);
  const cikisSn = useMemo(() => cikisSuresi(cikislar.map((y) => y.boy)), [cikislar]);
  // Görsel geliş: mantığın `yurume`si + merdivenden erken çıkış (en çok `ONCE_EN_COK`; masanın boş süresiyle
  // ayrıca kısılır — `gelisGecen`). Çıkan grup ayrı takım olduğundan geliş onu beklemez.
  const once = Math.min(gerekenOnce(boylar, AYAR.yurume), ONCE_EN_COK);
  const bosSure = AYAR.gelisAralik * svCarpan(AYAR.masaSv?.[yer.tur]?.gelisAralikCarpan, sv);

  const kaynaklar = useGLTF(useMemo(() => KAY_MUSTERI_GOVDE.map((g) => `${KAY_KOK}${g}.glb`), []));
  const klipler = useKayKlipler();
  const kap = useMemo(() => {
    const g = new Group();
    g.userData.k2npc = true; // oyuncu silüeti (bölme adayı D) bu gövdeleri atlar
    return g;
  }, []);
  // İki takım: masanınki (gelen/oturan) ve çıkanınki. Kalkışta yer değiştirir.
  const takim = useRef<{ masa: Govde[] | null; cikan: Govde[] | null }>({ masa: null, cikan: null });
  // Klon iskeletlerinin GPU kemik dokuları + gövdeye özel materyal: masa sökülünce bırakılır — eskiden
  // her Kat 2 girişinde iskelet başına bir doku birikiyordu (perf W3). Kat gizlenirken (Activity) değil:
  // dönüşte yeniden kurulum/derleme olmasın. Katmanın tamamı sökülürse `KatKatmani` bırakır.
  const birak = useSokulurkenBirak();
  useEffect(
    () => () => {
      if (!birak()) return;
      for (const g of [...(takim.current.masa ?? []), ...(takim.current.cikan ?? [])]) {
        iskeletleriBirak(g.kok);
        g.mat.dispose();
      }
    },
    [birak],
  );
  const kare = useRef(0);
  const hal = useRef({ onceki: 'kapali', cikisT: -1, gelis: false, ziyaret: sira * 3, kalkis: kalkisAni.get(yer.id) ?? 0, once });

  useFrame((st, dt) => {
    const m = masaBul(useGame.getState().kat2Dunya.masalar, yer.id);
    const durum = m?.durum ?? 'kapali';
    const h = hal.current;
    const tk = takim.current;
    const ani = kalkisAni.get(yer.id) ?? 0;
    if (ani !== h.kalkis) {
      // Yeni kalkış: oturan takım çıkış takımı olur, yoldaki (erken gelen) takım masanın takımı; çıkış aradan
      // geçen süre kadar ileriden başlar (gövde geç yüklendiyse yetişir).
      h.kalkis = ani;
      const gecti = (performance.now() - ani) / 1000;
      [tk.masa, tk.cikan] = [tk.cikan, tk.masa];
      h.cikisT = gecti < cikisSn + SONME_SN ? Math.max(0, gecti - dt) : -1;
    }
    // Boşa düşüş: kalkıştan değilse (masa yeni açıldı: ilk grup 3 sn'de) erken çıkış o boş süreye sığar.
    if (durum === 'bos' && h.onceki !== 'bos' && m) h.once = h.onceki === 'oyunda' ? once : Math.min(once, Math.max(0, m.t));
    if (durum === 'oyunda') h.once = once;
    h.onceki = durum;
    if (h.cikisT >= 0) h.cikisT += dt;
    if (h.cikisT > cikisSn + SONME_SN) h.cikisT = -1;

    // Sıradaki grubun gelişi: oyun sürerken çıkış takımıyla (önceki çıkış bittiyse), sonra masanın takımıyla.
    const gecen = m ? gelisGecen(durum, m.t, h.once, AYAR.yurume, bosSure) : null;
    const erken = durum === 'oyunda' && gecen != null && h.cikisT < 0;
    const kur = () =>
      yollar.map((_, k) => {
        const g = govdeKur(kaynaklar[(sira * 2 + k) % kaynaklar.length].scene as Group, klipler, sira * 4 + k);
        kap.add(g.kok);
        return g;
      });
    if ((durum === 'oyunda' || gecen != null) && !tk.masa) tk.masa = kur();
    if (erken && !tk.cikan) tk.cikan = kur();
    const gelen = erken ? tk.cikan : durum !== 'oyunda' && gecen != null ? tk.masa : null;
    // Yeni grup (gömlek renkleri değişir) yola çıktığı an; kalkışta takım değişse de aynı grup sürer.
    if (gelen && !h.gelis) h.ziyaret++;
    h.gelis = !!gelen;

    kare.current++;
    const zaman = st.clock.elapsedTime;
    const gelHiz = gelisHizi(boylar, AYAR.yurume + h.once);
    // Bekleyen geliş (kirli masa: grup oturmaz) yerinde yürümez, durur.
    const bekliyor = durum === 'bos' && (m?.t ?? 1) <= 0;

    /** Gövdeyi yol üstüne (ya da `u ≥ 1` oturağa) koyar. `u`: oturağa doğru oran; çıkışta yol ters (kuyuya doğru). */
    const poz = (g: Govde, k: number, u: number, hiz: number, yol: Yol, olcek: number, cik: boolean, oyna: boolean) => {
      const [dx, dz] = oturaklar[k];
      const aciOtur = Math.atan2(-dx, -dz);
      if (u >= 1) {
        g.kok.position.set(yer.x + dx + Math.sin(aciOtur) * KAY_OTURMA_ILERI, KAY_OTURMA_KALDIRMA, yer.z + dz + Math.cos(aciOtur) * KAY_OTURMA_ILERI);
        // oynuyor hissi: gövde ıstakaya doğru hafifçe döner (oyuncu başına ayrı faz)
        g.kok.rotation.y = oyna ? aciOtur + 0.12 * Math.sin(zaman * 0.8 + k * 1.7 + sira) : aciOtur;
        klipSec(g, KLIP.otur);
      } else {
        const aci = yolNoktasi(yol, cik ? 1 - u : u, _p);
        g.kok.position.set(_p[0], _p[1], _p[2]);
        let fark = aci - g.kok.rotation.y;
        while (fark > Math.PI) fark -= Math.PI * 2;
        while (fark < -Math.PI) fark += Math.PI * 2;
        g.kok.rotation.y += fark * Math.min(1, dt * 10);
        const sec = lokomosyonSec(LOKOMOSYON_YURUYUS.yuru, hiz);
        klipSec(g, sec.klip, sec.timeScale);
      }
      g.kok.scale.setScalar(KAY_SCALE * olcek);
      // T1: ne gövdesi ne gölgesi kadrajda olabilecek gövde animasyon/kemik/çizim işi yapmaz; süresi birikir.
      g.bekleyenDt += dt;
      const p = g.kok.position;
      g.kok.visible = gorusteMi(st.camera, zaman, p.x, p.y, p.z, ACTOR_HEIGHT, GOVDE_YARI);
      if (!g.kok.visible) return;
      // Oturan gövde iki karede bir ilerler (yarısı tek, yarısı çift karede): yavaş klip, farkı görünmez.
      if (oyna && ((sira + k + kare.current) & 1) === 1) return;
      if (g.bas) g.bas.rotation.x -= g.basEk;
      g.mixer.update(g.bekleyenDt);
      g.bekleyenDt = 0;
      // oturan baş: düşünür gibi hafif öne eğilip kalkar (klibin üstüne eklenir)
      g.basEk = oyna ? 0.16 * Math.max(0, Math.sin(zaman * 0.9 + k * 2.1 + sira * 0.7)) : 0;
      if (g.bas) g.bas.rotation.x += g.basEk;
    };

    // Gelen takım: yol oranıyla yürür (oturağa varan oturur, oyun başlayana dek oynamaz).
    gelen?.forEach((g, k) => {
      if (g.renkZiyaret !== h.ziyaret) {
        g.renkZiyaret = h.ziyaret;
        g.mat.color.set(GOMLEK[(h.ziyaret * 4 + k * 3) % GOMLEK.length]);
      }
      const u = gelisOrani(yollar[k].boy, k, gecen ?? 0, gelHiz);
      if (u <= 0) {
        g.kok.visible = false;
        return;
      }
      poz(g, k, u, u < 1 && !bekliyor ? gelHiz : 0, yollar[k], 1, false, false);
    });
    // Masanın takımı oyunda oturur; gelmiyorsa ve oyunda değilse gizli.
    if (tk.masa && tk.masa !== gelen) {
      tk.masa.forEach((g, k) => {
        if (durum !== 'oyunda') {
          g.kok.visible = false;
          return;
        }
        if (g.renkZiyaret < 0) {
          g.renkZiyaret = h.ziyaret;
          g.mat.color.set(GOMLEK[(h.ziyaret * 4 + k * 3) % GOMLEK.length]);
        }
        poz(g, k, 1, 0, yollar[k], 1, false, true);
      });
    }
    // Çıkan takım: kalkıştan sonra kuyuya iner (sırası gelmeyen üye hâlâ oturur: ilerleme 0 = oturak).
    if (tk.cikan && tk.cikan !== gelen) {
      tk.cikan.forEach((g, k) => {
        const p = h.cikisT >= 0 ? cikisPozu(cikislar[k].boy, k, h.cikisT) : null;
        if (!p) {
          g.kok.visible = false;
          return;
        }
        poz(g, k, 1 - p.u, p.u > 0 ? GRUP_HIZ : 0, cikislar[k], p.olcek, true, false);
      });
    }
  }, KAPI_ONCELIK);

  return <primitive object={kap} />;
}
