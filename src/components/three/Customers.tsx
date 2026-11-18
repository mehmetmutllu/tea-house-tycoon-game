import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  CapsuleGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Object3D,
  Color,
  MathUtils,
  Group,
  SkinnedMesh,
  AnimationMixer,
  BufferAttribute,
  Box3,
  Vector3,
  Sphere,
  Frustum,
  Matrix4,
  type BufferGeometry,
  type AnimationAction,
  type AnimationClip,
  type InstancedMesh,
} from 'three';
import { clone as skinKlon } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../../game/store';
import {
  ACTOR_HEIGHT,
  BUBBLE_Y,
  CAPSULE_RADIUS,
  SEATED_DROP,
  KAY_KOK,
  KAY_SCALE,
  KAY_MUSTERI_GOVDE,
  KAY_OTURMA_KALDIRMA,
  KAY_OTURMA_ILERI,
  NPC_SKIN_CAP,
} from '../../config/actor';
import { LIGHTING, PALETTE } from '../../config/palette';
import {
  ekipmanMi, basMi, kafaKucult, useKayKlipler, KLIP, LOKOMOSYON_YURUYUS, lokomosyonSec, YURUME_ESIGI,
} from './KayActor';
import { useKatGizli } from './katKatmani';
import { WC_GECIS, wcOlcek, LAYOUT } from '../../game/layout';
import { siparisDokusu } from './siparisBalonu';

/**
 * Customers — müşteri gövdeleri (S15 · D-113: skinned).
 *
 * NEDEN DEĞİŞTİ: müşteriler bugüne kadar TEK InstancedMesh kapsüldü (1 çizim, 0,04 ms) ve
 * personel S14'te skinned'e geçince salon ikiye ayrıldı — yürüyen karakterlerin yanında
 * kaymayan kapsüller duruyordu. Kullanıcı "hepsinde skinned çok iyi olur" dedi; bedel S15'te
 * ölçüldü (`docs/karakter-raporu-s15.md` §Ç).
 *
 * MİMARİ — HAVUZ, liste değil. Skinned mesh INSTANCE EDİLEMEZ: her gövde kendi iskeletini ve
 * kendi `AnimationMixer`ını taşır. O yüzden `NPC_SKIN_CAP` kadar gövde BİR KEZ kurulur ve
 * müşteriler bu yuvalara oturur; yuva boşalınca bir sonraki müşteri aynı gövdeyi devralır
 * (renk ve klip yeniden yazılır). Müşteri gelip gitmesi mesh kurmaz.
 *
 * TAVAN 80 — kullanıcı "kapsül hiç görünmesin" dedi, yani bütçe oyunun üretebildiği en yüksek
 * müşteri sayısının üstünde. Kapsül kolu yine de duruyor: tavan bir gün aşılırsa müşteri
 * kaybolmasın, kapsüle düşsün. Gerekçe ve sayılar `actor.ts` → `NPC_SKIN_CAP`.
 *
 * GÖVDE BAŞINA İKİ MESH: baş dokusunu korur (yüz/saç boyanmaz — D-112), kol+gövde+bacak tek
 * geometriye kaynar ve rengini KÖŞE RENGİNDEN alır. Ölçüldü: 24 müşteri = 48 çizim / 0,52 ms;
 * aynı sayıda 6 parçalı gövde 216 çizim / 1,78 ms. 80 müşteri = 1,57 ms.
 *
 * P0 perf: `npcs` abonelikle DEĞİL `getState()` ile okunur — NPC dizisi her karede yeniden
 * üretiliyor (konum) ve abonelik bu bileşeni her kare render ederdi.
 */

// ---- kapsül kolu (tavanı aşan müşteriler + skinned yüklenene kadar) ----
const BODY_GEO = new CapsuleGeometry(CAPSULE_RADIUS, ACTOR_HEIGHT - 2 * CAPSULE_RADIUS, 6, 10)
  .translate(0, ACTOR_HEIGHT / 2, 0);
const BODY_MAT = new MeshStandardMaterial({ color: '#ffffff' }); // gerçek renk per-instance
/**
 * SİPARİŞ BALONU (S18) — eskiden sarı bir KÜREYDİ ve yalnız "bekliyor" diyordu; ne beklediğini
 * söylemiyordu. Artık ürüne göre ayrı dokulu, KAMERAYA DÖNEN düz levha (billboard).
 * Çizim `siparisBalonu.ts`te; burada yalnızca yerleştirilir.
 *
 * ÜRÜN BAŞINA AYRI `InstancedMesh`: bir instanced mesh tek materyal (tek doku) taşıyabilir, o
 * yüzden çay ve tost ayrı geçiş. İki ürün = iki çizim çağrısı, müşteri sayısından bağımsız.
 */
const BUBBLE_GEO = new PlaneGeometry(0.62, 0.62);
const URUNLER = ['tea', 'tost'] as const;
/**
 * Tostun modeli — Kenney Food Kit (CC0). Dokuz KayKit paketinde tost YOK; stil kilidi bu tek
 * model için bilerek açıldı (D-116 · Y1, künye `public/assets/README.md`).
 */
const TOST_MODELI = '/assets/models/kenney-food-kit/sandwich.glb';

const NPC_CAP = 128; // baloncuk + kapsül kolunun tavanı (npcCount tipik ~10-30); ucuz.

/** Müşterinin durumu OTURUYOR mu — gerçek oturuş klibi ve kök kaldırması buna bağlı. */
const oturuyorMu = (durum: string) => durum === 'waitingForTea' || durum === 'drinking';

/**
 * KIRPMA KÜRESİ PAYI (perf #1 · Sprint A). Gövdeler eskiden `frustumCulled = false` idi: ekran
 * dışındaki (öbür salon, sokak) müşteri de her karede çiziliyordu. Kırpma açılınca küre
 * DİNLENME pozundan kurulur; yürüyüş/oturuş klibi uzuvları onun dışına taşırabilir — ×1,5 pay
 * bunu örter (kenarda yarım görünen müşteri pat diye kaybolmasın).
 */
const KIRPMA_PAYI = 1.5;

/**
 * Gövde TÜRÜ başına (Knight, Rogue…) bir kez kaynatılan geometri (perf #11 · Sprint A).
 * Eskiden her yuva baş ve gövdeyi KENDİ kopyasına kaynatıyordu: 80 yuva = 160 geometri, beş
 * türün köşe verisi tür başına ~16 kez GPU'ya yükleniyordu. Kaynak sahne aynıysa sonuç da aynı
 * (renk köşeye TÜRDEN yazılır, müşterinin rengi materyalde) — paylaşmak birebir.
 */
type TurGeo = { bas: BufferGeometry | null; govde: BufferGeometry | null };
const turGeolari = new WeakMap<Group, TurGeo>();

/** Dinlenme pozundaki sınır küresi, kırpma payıyla büyütülmüş. */
function kirpmaKuresi(geo: BufferGeometry): Sphere {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const k = geo.boundingSphere!.clone();
  k.radius *= KIRPMA_PAYI;
  return k;
}

/**
 * ANİMASYON GÖRÜNÜRLÜK KÜRESİ (perf #1). `mixer.update` yalnız müşteri YA DA GÖLGESİ kamerada
 * olabilecekse koşar. Gölge güneşin tersine düşer: boy `ACTOR_HEIGHT` iken uç, ayaktan
 * `boy × (güneşXZ / güneşY)` uzakta. Küre gövdeyle gölge ucunun ortasına oturur, ikisini de
 * kapsar, üstüne kırpma payı ve kamera gecikmesi payı biner — yani çizilen kırpma küresinden
 * HER ZAMAN büyüktür: çizilen hiçbir müşteri bayat pozla çizilmez.
 */
const GUNES_YATAY = Math.hypot(LIGHTING.sunPos[0], LIGHTING.sunPos[2]) / LIGHTING.sunPos[1];
const GOLGE_X = (-LIGHTING.sunPos[0] / LIGHTING.sunPos[1]) * ACTOR_HEIGHT;
const GOLGE_Z = (-LIGHTING.sunPos[2] / LIGHTING.sunPos[1]) * ACTOR_HEIGHT;
const ANIM_KURE_R = (ACTOR_HEIGHT / 2 + (GUNES_YATAY * ACTOR_HEIGHT) / 2) * KIRPMA_PAYI + 0.5;

type Yuva = {
  kok: Group;
  mixer: AnimationMixer;
  /**
   * Görünmezken biriken animasyon süresi (perf #1). Ekranda ne gövdesi ne gölgesi olabilecek
   * müşterinin `mixer.update`i atlanır; görünür olduğu karede birikenle TEK adımda ilerler —
   * klipler döngüsel, geçişler doğrusal: poz, her kare ilerlemiş olsaydı neyse o.
   */
  bekleyenDt: number;
  eylemler: Record<string, AnimationAction>;
  govdeMat: MeshStandardMaterial;
  /** Yuvayı şu an kullanan müşteri — değişince renk yeniden yazılır. */
  npcId: number;
  suAnKlip: string;
  hedefAci: number;
  aci: number;
  sonX: number;
  sonZ: number;
  /** Yuva yeni el değiştirdi — açı yumuşatılmadan SNAP edilir. */
  yeniYuva: boolean;
};

/**
 * TEK YUVA KURAR: bir gövde, iki mesh (baş dokulu + gövde köşe renkli), bir mixer, dört eylem.
 */
function yuvaKur(kaynak: Group, klipler: AnimationClip[], faz: number): Yuva {
  const kok = skinKlon(kaynak) as Group;

  // Ekipmanı (pelerin/miğfer) at, parçaları baş ↔ gövde diye ikiye ayır.
  const parcalar: SkinnedMesh[] = [];
  kok.traverse((n) => {
    const m = n as SkinnedMesh;
    if (m.isSkinnedMesh) parcalar.push(m);
  });
  const sivil = parcalar.filter((p) => !ekipmanMi(p.name));
  const bas = sivil.filter((p) => basMi(p.name));
  const govde = sivil.filter((p) => !basMi(p.name));
  const ana = sivil[0] ?? parcalar[0];
  const ust = ana.parent ?? kok;
  parcalar.forEach((p) => p.parent?.remove(p));

  // Gövde rengi KÖŞE RENGİNDEN gelir: gömlek ve pantolon tek mesh'te, ayrı renkte.
  // `govdeMat` yuvaya ait — müşteri değişince `color` yeniden yazılır ve gömlek onunla döner.
  const govdeMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, vertexColors: true });
  let tur = turGeolari.get(kaynak);
  if (!tur) {
    const govdeGeolari = govde.map((p) => {
      const g = p.geometry.clone();
      // Pantolon KOYU, gömlek AÇIK: renk köşeye yazılır, materyal tek kalır.
      const renk = new Color(/leg/i.test(p.name) ? PALETTE.pants : '#ffffff');
      const say = g.attributes.position.count;
      const dizi = new Float32Array(say * 3);
      for (let v = 0; v < say; v++) {
        dizi[v * 3] = renk.r;
        dizi[v * 3 + 1] = renk.g;
        dizi[v * 3 + 2] = renk.b;
      }
      g.setAttribute('color', new BufferAttribute(dizi, 3));
      return g;
    });
    tur = {
      bas: bas.length ? mergeGeometries(bas.map((p) => p.geometry.clone()), false) : null,
      govde: govde.length ? mergeGeometries(govdeGeolari, false) : null,
    };
    turGeolari.set(kaynak, tur);
  }
  const tak = (geo: BufferGeometry | null, mat: SkinnedMesh['material']) => {
    if (!geo) return;
    const mesh = new SkinnedMesh(geo, mat);
    mesh.bind(ana.skeleton, ana.bindMatrix);
    mesh.castShadow = true;
    // Kırpma AÇIK, küre elle verilir: three'nin kendi `SkinnedMesh` küresi ilk testte o anki
    // pozdan, köşe başına kemik dönüşümüyle hesaplanır — hem pahalı hem pozun şansına kalır.
    mesh.boundingSphere = kirpmaKuresi(geo);
    ust.add(mesh);
  };
  tak(tur.bas, ana.material);
  tak(tur.govde, govdeMat);

  kafaKucult(kok);
  kok.scale.setScalar(KAY_SCALE);
  kok.visible = false;

  const mixer = new AnimationMixer(kok);
  const eylemler: Record<string, AnimationAction> = {};
  // MUSTERI KOSMAZ (S18): eylem kumesine kosu klibi HIC kurulmaz — kullanici karari
  // "ana karakter disinda kimse kosma efekti ile hareket etmeyecek". Gerekce ve sayilar
  // `KayActor.LOKOMOSYON_YURUYUS`ta; kisaca 0,844 br/sn ustundeki her hizda secici kosuyu
  // secerdi, yani yavaslatmak tek basina yetmiyordu.
  for (const ad of [KLIP.dur, KLIP.otur, ...LOKOMOSYON_YURUYUS.yuru]) {
    const klip = klipler.find((c) => c.name === ad);
    if (klip) eylemler[ad] = mixer.clipAction(klip);
  }
  eylemler[KLIP.dur]?.play();
  mixer.setTime(faz * 0.17); // faz kaydır: müşteriler aynı karede nefes alıp adım atmasın

  return {
    kok, mixer, bekleyenDt: 0, eylemler, govdeMat,
    npcId: -1, suAnKlip: KLIP.dur, hedefAci: 0, aci: 0, sonX: 0, sonZ: 0, yeniYuva: true,
  };
}

type Havuz = {
  grup: Group;
  yuvalar: Yuva[];
  govdeBoy: number;
  /** Havuzu `hedef` yuvaya kadar büyütür; bir karede en çok `YUVA_BASINA_KARE` tane kurar. */
  buyut: (hedef: number) => void;
  /** npc id → yuva indeksi. Bir müşteri ömrü boyunca AYNI yuvada kalır (gerekçe: `yuvaVer`). */
  eslesme: Map<number, number>;
  /** Bu karede hangi yuvalar kullanıldı — sahipsiz kalanlar kare sonunda serbest bırakılır. */
  kullanilan: Set<number>;
  /** Yuva indeksi → sahip npc id (−1 = boş). Sahiplik AÇIK tutulur; gerekçe `yuvaVer`. */
  sahip: number[];
  /**
   * Müşteriye yuva verir; yoksa boş yuvadan birini ayırır. Yuva kalmadıysa −1 (kapsül kolu).
   *
   * BU EŞLEME NEDEN VAR (S18 — kullanıcı: *"saç rengi stili kıyafet falan değişiyorlar"*):
   * yuva eskiden DİZİ SIRASINA göre veriliyordu (`yuvalar[i]` ↔ `npcs[i]`). Ortadaki bir müşteri
   * kalkınca `npcs` dizisi kayıyor ve ondan SONRAKİ her müşteri bir alttaki yuvaya düşüyordu:
   * gövde dosyası yuvaya sabit (`Knight/Rogue/Mage/Barbarian/Ranger` sırayla dağıtılıyor), renk
   * de yuva el değiştirince yeniden yazılıyor — yani oturduğu yerde duran müşterinin SAÇI,
   * GÖVDESİ ve KIYAFETİ bir anda değişiyordu. Temasla ya da çarpışmayla ilgisi yoktu; tetikleyen
   * şey başka birinin salondan ÇIKMASIYDI.
   *
   * Kimliğe bağlı eşleme bunu yapısal olarak kapatır: müşteri geldiği yuvada ölür.
   */
  yuvaVer: (npcId: number) => number;
};

/**
 * Bir karede en çok kaç yuva kurulur. Havuz TEMBEL büyür: erken oyunda salonda 5 müşteri varken
 * 80 gövde kurmanın anlamı yok ve o kurulum MOUNT'u kilitliyordu — tavan 80'e çıkınca duman
 * testi üç koşudan birinde canvas'ı 15 sn'de göremedi. Yuvalar müşteri geldikçe, kare kare
 * ekleniyor; henüz yuvası olmayan müşteri o birkaç kare boyunca kapsül kolunda çizilir.
 */
const YUVA_BASINA_KARE = 2;

function useMusteriHavuzu(): Havuz {
  // YOL DİZİSİ MEMOIZE EDİLİR: `useGLTF`e her render yeni bir dizi verilirse yükleyici yeniden
  // sorgulanıyor ve drei'nin `useProgress`i sürekli güncelleniyor — açılışta `SplashScreen`
  // "Maximum update depth exceeded" ile patlıyordu ve duman testi canvas'ı hiç göremiyordu.
  // (`useKayKlipler` aynı memoyu zaten taşıyor; burada eksikti.)
  const yollar = useMemo(() => KAY_MUSTERI_GOVDE.map((g) => `${KAY_KOK}${g}.glb`), []);
  const dosyalar = useGLTF(yollar);
  const klipler = useKayKlipler();

  const havuz = useRef<Havuz | null>(null);
  if (!havuz.current) {
    const grup = new Group();
    const yuvalar: Yuva[] = [];
    const h: Havuz = {
      grup,
      yuvalar,
      govdeBoy: ACTOR_HEIGHT,
      eslesme: new Map<number, number>(),
      kullanilan: new Set<number>(),
      sahip: [],
      yuvaVer: (npcId: number) => {
        const mevcut = h.eslesme.get(npcId);
        if (mevcut != null) {
          h.kullanilan.add(mevcut);
          return mevcut;
        }
        // SAHİPLİK `sahip` dizisinde AÇIKÇA tutulur. İlk hâli boşluğu `yuvalar[k].npcId`den
        // çıkarmaya çalışıyordu ve yanlıştı: o alan kare gövdesinde güncelleniyor, yani aynı
        // karede gelen İKİ yeni müşteri aynı yuvayı kapabiliyordu (biri diğerinin üstüne binerdi).
        for (let k = 0; k < yuvalar.length; k++) {
          if (h.sahip[k] !== -1) continue;
          h.sahip[k] = npcId;
          h.eslesme.set(npcId, k);
          h.kullanilan.add(k);
          return k;
        }
        return -1; // yuva kalmadı → kapsül kolu (gerekçe: NPC_SKIN_CAP)
      },
      buyut: (hedef: number) => {
        const sinir = Math.min(hedef, NPC_SKIN_CAP);
        let kurulan = 0;
        while (yuvalar.length < sinir && kurulan < YUVA_BASINA_KARE) {
          const y = yuvaKur(dosyalar[yuvalar.length % dosyalar.length].scene as Group, klipler, yuvalar.length);
          grup.add(y.kok);
          yuvalar.push(y);
          h.sahip.push(-1);
          kurulan++;
          // BALONCUK YÜKSEKLİĞİ gövdeden TÜRETİLİR, elle yazılmaz: baş `KAY_KAFA_OLCEK` ile
          // küçüldüğü için siluetin tepesi 1,75 değil (~1,52) ve o sayı ölçek değişince kayar.
          if (yuvalar.length === 1) {
            y.kok.visible = true;
            y.kok.updateMatrixWorld(true);
            const boy = new Box3().setFromObject(y.kok).getSize(new Vector3()).y;
            if (boy > 0.1) h.govdeBoy = boy;
            y.kok.visible = false;
          }
        }
      },
    };
    havuz.current = h;
  }
  return havuz.current;
}

export function Customers() {
  const bodyRef = useRef<InstancedMesh>(null);
  /** Ürün başına bir instanced mesh — sıra `URUNLER` ile aynı. */
  const bubbleRefs = useRef<(InstancedMesh | null)[]>([]);
  /**
   * Dokular ilk çizimde üretilip önbelleklenir; materyal bileşen ömrü boyunca sabit kalır.
   *
   * `depthWrite` KAPALI: saydam levhaların birbirini kırpmasını engeller — yan yana oturan iki
   * müşterinin balonları kenarlarını yiyordu. Derinlik TESTİ açık kalır, yani balon duvarın
   * arkasına geçince kaybolur; istenen davranış budur.
   */
  const bubbleMats = useMemo(
    () => URUNLER.map(() => new MeshBasicMaterial({
      map: null,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })),
    [],
  );
  /**
   * BALONUN İÇİ MODELDEN PİŞİYOR (S19b · D-116) — doku artık `gl`e ve tost modeline bağlı.
   *
   * Neden efekt, neden `useMemo` değil: pişirme sahnenin `WebGLRenderer`ını bir kare boyunca
   * başka bir hedefe yönlendiriyor. React'in render'ı sırasında yapılırsa (ki `useMemo` orada
   * koşar) çizgi dışı bir yan etki olur; efekt, ilk karenin dışında güvenle çalışır.
   *
   * Model gelmeden de çalışır: `siparisDokusu` o durumda BOŞ ÇERÇEVE döndürür ve önbelleğe
   * almaz, model yüklenince efekt yeniden koşup dolusunu ister. Bekleyen müşterinin başında
   * gösterge hiç olmamasındansa boş balon dursun.
   */
  const gl = useThree((st) => st.gl);
  const { scene: tostSahnesi } = useGLTF(TOST_MODELI);
  useEffect(() => {
    URUNLER.forEach((u, i) => {
      const doku = siparisDokusu(u, gl, tostSahnesi);
      if (doku) bubbleMats[i].map = doku;
      bubbleMats[i].needsUpdate = true;
    });
  }, [gl, tostSahnesi, bubbleMats]);
  const dummy = useMemo(() => new Object3D(), []);
  const col = useMemo(() => new Color(), []);
  const havuz = useMusteriHavuzu();
  const { grup, yuvalar } = havuz;
  const gorus = useMemo(() => ({ frustum: new Frustum(), m: new Matrix4(), kure: new Sphere() }), []);

  // Kat 2'deyken Kat 1 gizli: müşteri çizimi (anim/matris/balon) durur, sim sürer; dönüşte ilk kare tazeler.
  const gizli = useKatGizli();
  const balonSayac = useMemo(() => URUNLER.map(() => 0), []);
  useFrame((st, dt) => {
    const kapsul = bodyRef.current;
    if (!kapsul || gizli()) return;
    const npcs = useGame.getState().npcs;
    const n = Math.min(npcs.length, NPC_CAP);
    havuz.buyut(n); // havuz müşteri geldikçe büyür (gerekçe: YUVA_BASINA_KARE)
    const t = st.clock.elapsedTime;
    // Görüş hacmi karede bir kez kurulur. Kamera bu karede henüz kıpırdamadı (CameraRig sonra
    // koşar) — geçen karenin hacmi; aradaki fark `ANIM_KURE_R`ın payında kalır.
    gorus.m.multiplyMatrices(st.camera.projectionMatrix, st.camera.matrixWorldInverse);
    gorus.frustum.setFromProjectionMatrix(gorus.m);
    /** Ürün başına ayrı sayaç — her instanced mesh kendi `count`unu taşır. */
    const bubbleCount = balonSayac.fill(0);
    let kapsulCount = 0;

    for (let i = 0; i < n; i++) {
      const npc = npcs[i];
      const x = npc.pos[0];
      const z = npc.pos[2];
      const oturan = oturuyorMu(npc.state);
      // Lavaboya giren müşteri İÇERİDEDİR — çizilmez. Kapı eşiğinde anında yok olmaz:
      // 'wcGiris'/'wcCikis' boyunca kapı boşluğundan yürür ve son %40'ta ölçekle söner.
      const gorunurluk =
        npc.state === 'inWc' ? 0
        : npc.state === 'wcGiris' ? wcOlcek(1 - npc.timer / WC_GECIS)
        : npc.state === 'wcCikis' ? wcOlcek(npc.timer / WC_GECIS)
        : 1;

      // Oturuş çapasının DÜNYA karşılığı (gerekçe actor.ts → KAY_OTURMA_ILERI). Skinned kolda
      // gövdenin açısı belli olunca doldurulur; kapsül kolunda 0 kalır (kapsül oturmaz, iner).
      let capaX = 0;
      let capaZ = 0;

      const yuvaIdx = havuz.yuvaVer(npc.id);
      if (yuvaIdx >= 0) {
        // ---- SKINNED YUVA ----
        const y = yuvalar[yuvaIdx];
        if (y.npcId !== npc.id) {
          // Yuva el değiştirdi: gömlek rengi yeni müşteriden gelir (`feedback_color_variety`).
          y.npcId = npc.id;
          y.govdeMat.color.set(npc.color);
          y.sonX = x;
          y.sonZ = z;
          y.yeniYuva = true; // açı SNAP etsin: önceki müşterinin yönünden dönerek gelmesin
        }
        const dx = x - y.sonX;
        const dz = z - y.sonZ;
        const hiz = dt > 0 ? Math.sqrt(dx * dx + dz * dz) / dt : 0;
        if (oturan) {
          // OTURAN MÜŞTERİ MASAYA DÖNER. Yön normalde HAREKETTEN türüyor; oturunca hareket
          // bitiyor ve müşteri **geldiği yöne** bakakalıyordu (kullanıcı 2026-09-14: "oturmalar
          // sıkıntı, masaya dönük değiller"). Koltuk masanın çevresinde herhangi bir yönde
          // olabildiği için sabit bir açı işe yaramaz — yön koltuktan MASA MERKEZİNE bakar.
          const masa = LAYOUT.tables[npc.tableIndex]?.table;
          if (masa) y.hedefAci = Math.atan2(masa[0] - x, masa[2] - z);
        } else if (dx * dx + dz * dz > 1e-5) {
          y.hedefAci = Math.atan2(dx, dz);
        }
        y.sonX = x;
        y.sonZ = z;
        let tg = y.hedefAci;
        while (tg - y.aci > Math.PI) tg -= Math.PI * 2;
        while (tg - y.aci < -Math.PI) tg += Math.PI * 2;
        y.aci = y.yeniYuva ? y.hedefAci : MathUtils.damp(y.aci, tg, 9, dt);
        y.yeniYuva = false;

        // Oturan müşteri GERÇEK oturuş klibindedir; kök `KAY_OTURMA_KALDIRMA` kadar kalkar ki
        // kalça taburenin oturağına gelsin (ölçüm §Oturus). Eski `SEATED_DROP` bir kapsül
        // numarasıydı ve skinned gövdede kullanılmaz.
        // OTURUŞ ÇAPASI (S19b · D-116). Klipte kalça kökün 0,315 br arkasında; kök taburenin
        // merkezindeyken kalça oturağın arka kenarından sarkıyordu. Çapa gövdenin KENDİ yönünde
        // (yerel +z) uygulanır — dünya eksenine sabit yazılsa masanın yalnız bir yanı düzelirdi.
        if (oturan) {
          capaX = Math.sin(y.aci) * KAY_OTURMA_ILERI;
          capaZ = Math.cos(y.aci) * KAY_OTURMA_ILERI;
        }

        y.kok.visible = gorunurluk > 0;
        y.kok.position.set(x + capaX, oturan ? KAY_OTURMA_KALDIRMA : 0, z + capaZ);
        y.kok.rotation.y = y.aci;
        y.kok.scale.setScalar(KAY_SCALE * gorunurluk);

        const secim = !oturan && hiz > YURUME_ESIGI ? lokomosyonSec(LOKOMOSYON_YURUYUS.yuru, hiz) : null;
        const hedefKlip = oturan ? KLIP.otur : secim ? secim.klip : KLIP.dur;
        const yeni = y.eylemler[hedefKlip];
        if (yeni) {
          const oran = secim ? secim.timeScale : 1;
          // Birikmiş süre ESKİ klibe ve ESKİ hıza aittir: klip ya da hız değişmeden önce
          // boşaltılır — yoksa yeni klip/hız görünmezken geçen süreyi de kendi hesabına yazar
          // ve müşteri ekrana girdiğinde poz, hiç atlanmamış olsaydı olacağından sapar.
          if (y.bekleyenDt > 0 && (hedefKlip !== y.suAnKlip || oran !== yeni.timeScale)) {
            y.mixer.update(y.bekleyenDt);
            y.bekleyenDt = 0;
          }
          yeni.timeScale = oran;
          if (hedefKlip !== y.suAnKlip) {
            const eski = y.eylemler[y.suAnKlip];
            yeni.reset().play();
            if (eski && eski !== yeni) eski.crossFadeTo(yeni, 0.18, false);
            y.suAnKlip = hedefKlip;
          }
        }
        // Görünmeyende animasyon atlanır, süre birikir (gerekçe: `ANIM_KURE_R`).
        y.bekleyenDt += dt;
        gorus.kure.center.set(x + capaX + GOLGE_X / 2, ACTOR_HEIGHT / 2, z + capaZ + GOLGE_Z / 2);
        gorus.kure.radius = ANIM_KURE_R;
        if (gorunurluk > 0 && gorus.frustum.intersectsSphere(gorus.kure)) {
          y.mixer.update(y.bekleyenDt);
          y.bekleyenDt = 0;
        }
      } else {
        // ---- KAPSÜL KOLU: bütçeyi aşan müşteri (gerekçe actor.ts → NPC_SKIN_CAP) ----
        // Kapsül oturamaz; oturan müşteri `SEATED_DROP` kadar iner ve taburenin üstünde
        // yalnız üst gövde kalır. Bu kol bilerek eski davranışını koruyor.
        const bobY = oturan ? SEATED_DROP + Math.sin(t * 2 + npc.id) * 0.04 : 0;
        dummy.position.set(x, bobY, z);
        dummy.rotation.set(0, 0, 0); // kapsül dönel simetrik — yön taşımaz (eski kolun da etkisi yoktu)
        dummy.scale.setScalar(gorunurluk);
        dummy.updateMatrix();
        kapsul.setMatrixAt(kapsulCount, dummy.matrix);
        col.set(npc.color);
        kapsul.setColorAt(kapsulCount, col);
        kapsulCount++;
      }

      // SİPARİŞ BALONU — baş üstünde, KAMERAYA DÖNER (billboard).
      if (npc.state === 'waitingForTea') {
        const u = URUNLER.indexOf(npc.product as (typeof URUNLER)[number]);
        const mesh = u >= 0 ? bubbleRefs.current[u] : null;
        if (mesh) {
          const skinned = yuvaIdx >= 0;
          dummy.position.set(
            // Balon gövdeyle birlikte kayar: çapa uygulanıp balon yerinde kalsaydı, oturan
            // müşterinin balonu başının arkasında asılı dururdu.
            x + capaX,
            // Balon KÜREDEN BÜYÜK: eski 0,15'lik pay balonun alt kuyruğunu başın içine
            // sokuyordu. Pay balonun yarı yüksekliği kadar açıldı.
            (skinned ? havuz.govdeBoy + 0.15 + (oturan ? KAY_OTURMA_KALDIRMA - 0.3 : 0) : BUBBLE_Y + SEATED_DROP) + 0.22,
            z + capaZ,
          );
          // Kameranın dönüşü kopyalanır: levha her açıdan tam karşıdan görünür. Sabit dönüşlü
          // bir levha, kamera yana kayınca kâğıt gibi incelip kaybolurdu.
          dummy.quaternion.copy(st.camera.quaternion);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          mesh.setMatrixAt(bubbleCount[u], dummy.matrix);
          bubbleCount[u]++;
        }
      }
    }

    // SAHİPSİZ YUVALARI SERBEST BIRAK. Eskiden "n'den sonrakiler" gizleniyordu; eşleme kimliğe
    // bağlandığı için kullanılan yuvalar artık dizinin sonunda TOPLU durmuyor — bu karede
    // dokunulmayan her yuva boşalmış demektir. Eşleme de burada temizlenir, yoksa `Map`
    // salondan çıkan her müşteriyle büyümeye devam ederdi (oturum boyu sızıntı).
    for (let i = 0; i < yuvalar.length; i++) {
      if (havuz.kullanilan.has(i)) continue;
      const y = yuvalar[i];
      y.kok.visible = false;
      if (havuz.sahip[i] >= 0) havuz.eslesme.delete(havuz.sahip[i]);
      havuz.sahip[i] = -1;
      y.npcId = -1;
    }
    havuz.kullanilan.clear();

    kapsul.count = kapsulCount;
    // Dev ölçüm: kapsül koluna düşen müşteri sayısı (tavan/sızıntı denetimi — duman + kare aracı okur).
    if (import.meta.env.DEV) {
      const w = window as unknown as { __musteriCizim?: { toplam: number; kapsul: number; enCokKapsul: number; yuva: number } };
      const o = w.__musteriCizim;
      w.__musteriCizim = { toplam: n, kapsul: kapsulCount, enCokKapsul: Math.max(o?.enCokKapsul ?? 0, kapsulCount), yuva: yuvalar.length };
    }
    kapsul.instanceMatrix.needsUpdate = true;
    if (kapsul.instanceColor) kapsul.instanceColor.needsUpdate = true;
    for (let u = 0; u < URUNLER.length; u++) {
      const m = bubbleRefs.current[u];
      if (!m) continue;
      m.count = bubbleCount[u];
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={grup} />
      <instancedMesh ref={bodyRef} args={[BODY_GEO, BODY_MAT, NPC_CAP]} castShadow frustumCulled={false} />
      {URUNLER.map((u, i) => (
        <instancedMesh
          key={u}
          ref={(m) => { bubbleRefs.current[i] = m; }}
          args={[BUBBLE_GEO, bubbleMats[i], NPC_CAP]}
          frustumCulled={false}
          // Balon SON çizilir: saydam levhanın arkasındaki gövde önce yazılmış olmalı.
          renderOrder={10}
        />
      ))}
    </>
  );
}

KAY_MUSTERI_GOVDE.forEach((g) => useGLTF.preload(`${KAY_KOK}${g}.glb`));
useGLTF.preload(TOST_MODELI);
