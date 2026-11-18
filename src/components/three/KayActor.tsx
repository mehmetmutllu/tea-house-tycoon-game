import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  Box3,
  SkinnedMesh,
  type Object3D,
  type Bone,
  type AnimationClip,
} from 'three';
import { clone as skinKlon } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { iskeletleriBirak, useKatGizli, useSokulurkenBirak } from './katKatmani';
import { PALETTE } from '../../config/palette';
import { govdeProfili, onlukParcasi, kumas, ONLUK_PARCALARI } from './onluk';
import { kollariSiva, omuzHavlusu, HAVLU_KAYMA } from './patron';
import { kiyafetParcalari } from './kiyafet';
import { kiyafetGorunum, type KiyafetGorunum } from '../../config/kozmetik';
import {
  ASKI_KOL,
  KAY_KOK,
  KAY_KLIPLER,
  KAY_MODEL,
  KAY_KIYAFET,
  KAY_SCALE,
  KAY_KAFA_OLCEK,
  KLIP_HIZI,
  TIMESCALE_TAVAN,
  TIMESCALE_TABAN,
  type ActorKind,
} from '../../config/actor';

/**
 * KayActor — personel gövdesi: KayKit karakteri + ayrı dosyadaki klip + oyunun kıyafeti.
 *
 * NEDEN BÖYLE (S14 · D-112, ölçüm `docs/karakter-raporu-s14.md`):
 * - Gövdeler fantezi paketinden geliyor ama **ekipman ayrı düğüm** (pelerin/miğfer/şapka);
 *   gizlemek bir satır, mesh düzenleme gerekmiyor (§B3).
 * - Ortaçağ derisi gövdenin DOKUSUNDAydı; gövde ve bacak oyunun paletine boyanınca kıyafet
 *   oluyor. **Baş boyanmaz** — yüz, saç, sakal başın kendi dokusundan gelir; boyanınca saç da
 *   ten rengine dönüyordu (ölçüm turunda birebir bu oldu).
 * - Kasket ve önlük bizim: bugüne kadar `Player.tsx`'te ilkel şekildi, artık `head`/`chest`
 *   KEMİĞİNE takılı — yani yürüme ve oturma klibi onları da taşıyor.
 *
 * Klip seçimi React'ten GEÇMEZ: konum her kare doğrudan three'ye yazılıyor (`actorTransform`),
 * dolayısıyla hız da burada, `useFrame` içinde ölçülür ve eylem çapraz geçişle değiştirilir.
 * Prop'a bağlasaydık her hız değişimi bir React render'ı olurdu.
 */

/** Ekipman parçası: adın SON bölümü (rol) bu köklerden biriyse gövdeye girmez. */
const EKIPMAN = [
  'cape', 'cloak', 'helmet', 'visor', 'hood', 'hat', 'crown', 'shoulder', 'pauldron',
  'pauldrons', 'armor', 'sword', 'shield', 'staff', 'wand', 'bow', 'quiver', 'dagger',
  'axe', 'spellbook', 'horn', 'backpack', 'mask',
];
export const ekipmanMi = (ad: string) => {
  const rol = ad.split('_').pop()?.toLowerCase() ?? '';
  return EKIPMAN.some((k) => rol.startsWith(k) || rol.endsWith(k));
};

/** Baş parçası: boyanmaz, dokusunu korur (yüz/saç/sakal oradan gelir — D-112). */
export const basMi = (ad: string) => /head|skull/i.test(ad);

/**
 * Hangi parça hangi renge boyanır. Baş listede YOK (yukarıdaki gerekçe).
 *
 * GÖMLEK HERKESTE AYNI (S19b · D-116): S18 patronu koyu lacivertle ayırmıştı, kullanıcı geri
 * aldı (*"beyaz daha ayırt ediciydi o kalabilir"*). Patronu ayıran şey artık renk değil, omuz
 * havlusu + sıvalı kol — gerekçe `patron.ts`.
 */
const PARCA_RENK: readonly (readonly [RegExp, string])[] = [
  [/arm/i, PALETTE.shirt],
  [/body|torso/i, PALETTE.shirt],
  [/leg/i, PALETTE.pants],
];

/** Klip adları — dosya değil KLİP; hangi durumda hangisi çalar. */
export const KLIP = {
  dur: 'Idle_A',
  yuru: 'Walking_A',
  tasi: 'Walking_B',
  calis: 'Working_A',
  otur: 'Sit_Chair_Idle',
  tut: 'Holding_A',
} as const;
export type KayHal = keyof typeof KLIP;

/** Yürüyor sayılma eşiği (birim/sn). Altında `dur`, üstünde `yuru`. */
export const YURUME_ESIGI = 0.25;

/**
 * HAREKET HALİNİN KLİP ADAYLARI (S15 · D-113). Hız hangi klibi en az bozarak taşıyorsa o çalar:
 * yavaş giden yürür, hızlı giden koşar. `tasi` halinde de koşu adayı var — garson kademe 1'de
 * 2,0 br/sn gidiyor ve `Walking_B` o hızda 3,05 kat hızlanmak zorunda kalırdı (5,7 adım/sn,
 * sprintin üstü).
 */
export const LOKOMOSYON: Record<'yuru' | 'tasi', readonly string[]> = {
  yuru: ['Walking_A', 'Running_A'],
  tasi: ['Walking_B', 'Running_A'],
};

/**
 * KOŞU YALNIZ ANA KARAKTERİN (S18, kullanıcı kararı 2026-09-14):
 * *"ana karakter dışında kimse koşma efekti ile hareket etmeyecek"*.
 *
 * NEDEN KOL LİSTESİ, NEDEN HIZ EŞİĞİ DEĞİL: `lokomosyonSec` bozulmayı logaritmik ölçtüğü için
 * **0,844 br/sn'nin üstündeki her hızda `Running_A` kazanıyor** (iki klibin yazılı hızlarının
 * geometrik ortası orası). Yani "yavaşlarsa yürür" doğru değildi — müşteri 0,9'a inse bile
 * koşardı. Kim koşabilir sorusu bir HIZ sorusu değil, bir ROL sorusudur; aday listesinden
 * çözülür. Ölçüm: `docs/olcum-musteri.txt` §1.
 *
 * Ana karakter listede kalıyor çünkü oyuncu 4,5-5,4 br/sn gidiyor; onu yürütmek 7,9× ayak
 * kayması demekti (D-113'te ölçüldü) ve zaten oyuncunun koşması istenen şey.
 */
export const LOKOMOSYON_YURUYUS: Record<'yuru' | 'tasi', readonly string[]> = {
  yuru: ['Walking_A'],
  tasi: ['Walking_B'],
};

/** Rolün koşu klibi kullanma izni. Müşterilerin karşılığı `Customers.tsx`te (her zaman yürür). */
export const KOSABILIR: Record<ActorKind, boolean> = {
  owner: true,
  waiter: false,
  dishwasher: false,
  kitchenHand: false,
};

/** Rolün hareket klibi adayları — koşamayan rolde koşu klibi listeye hiç girmez. */
export const lokomosyonAdaylari = (hal: 'yuru' | 'tasi', kosabilir: boolean): readonly string[] =>
  (kosabilir ? LOKOMOSYON : LOKOMOSYON_YURUYUS)[hal];

/**
 * Hızı EN AZ BOZARAK taşıyan klibi seç ve gereken `timeScale`i ver.
 *
 * Bozulma logaritmik ölçülür: 2 kat hızlandırmak ile 2 kat yavaşlatmak aynı ağırlıktadır,
 * yoksa seçim hep hızlı klibe kayar. Katsayı sonra kelepçelenir (gerekçe `actor.ts`).
 */
export function lokomosyonSec(adaylar: readonly string[], hiz: number): { klip: string; timeScale: number } {
  let enIyi = adaylar[0];
  let enAzBozulma = Infinity;
  for (const ad of adaylar) {
    const yazili = KLIP_HIZI[ad];
    if (!yazili) continue;
    const bozulma = Math.abs(Math.log(hiz / yazili));
    if (bozulma < enAzBozulma) {
      enAzBozulma = bozulma;
      enIyi = ad;
    }
  }
  const ham = hiz / KLIP_HIZI[enIyi];
  return { klip: enIyi, timeScale: Math.min(TIMESCALE_TAVAN, Math.max(TIMESCALE_TABAN, ham)) };
}

/**
 * ÜST ↔ ALT GÖVDE BÖLÜŞÜMÜ (S16). KayKit'te "yürürken taşıma" klibi YOK: `Holding_*` ayakta
 * duran bir poz, `Walking_*` ise kolları sallıyor. İkisini aynı anda oynatmanın yolu klipleri
 * KEMİK KÜMESİNE göre bölmek — alt gövde yürür, üst gövde tepsiyi tutar.
 *
 * Bölüşüm rig'in 23 kemiğini TAM olarak ikiye ayırır (13 üst + 10 alt); kesişim boş olduğu için
 * iki eylem aynı özelliğe yazmaz ve ikisi de tam ağırlıkta çalışabilir.
 */
const UST_KEMIKLER = new Set([
  'spine', 'chest', 'head',
  'upperarml', 'upperarmr', 'lowerarml', 'lowerarmr',
  'wristl', 'wristr', 'handl', 'handr', 'handslotl', 'handslotr',
]);

/**
 * ADLAR NEDEN NOKTASIZ: dosyada kemik `upperarm.l` yazıyor ama three'nin `GLTFLoader`ı düğüm
 * adlarını `PropertyBinding.sanitizeNodeName` ile geçiriyor ve NOKTA ayrılmış karakter olduğu
 * için **siliniyor** — sahnedeki ad `upperarml`, animasyon izi de `upperarml.quaternion`.
 *
 * Bu sessiz bir tuzak: noktalı adlarla yazılan küme HİÇBİR kolu yakalamıyor, yalnız noktasız
 * `spine`/`chest`/`head` tutuyordu. Sonuç konsol hatası vermiyor — kollar alt gövde klibinde
 * kalıyor ve taşıma pozu yarım çalışıyordu. `tests/karakter-senkron.test.ts` adları artık
 * GERÇEK dosyadan okuyup aynı kuralla sterilize ederek karşılaştırıyor.
 */
const STERIL = (ad: string) => ad.replace(/\s/g, '_').replace(/[[\].:/]/g, '');

/** İzin adından kemiği çıkarır: `upperarml.quaternion` → `upperarml`. */
const izKemigi = (izAdi: string) => izAdi.slice(0, izAdi.lastIndexOf('.'));

/** Klibin yalnız üst (veya yalnız alt) gövde izlerini taşıyan kopyası. Sonuç ÖNBELLEKLENİR. */
const suzulmusKlipler = new Map<string, AnimationClip>();
function govdeYarisi(klip: AnimationClip, yari: 'ust' | 'alt'): AnimationClip {
  const anahtar = `${klip.name}|${yari}`;
  const onbellek = suzulmusKlipler.get(anahtar);
  if (onbellek) return onbellek;
  const kopya = klip.clone();
  kopya.name = anahtar;
  kopya.tracks = klip.tracks.filter((t) => UST_KEMIKLER.has(izKemigi(t.name)) === (yari === 'ust'));
  suzulmusKlipler.set(anahtar, kopya);
  return kopya;
}

function mat(renk: string) {
  return new MeshStandardMaterial({ color: renk, roughness: 0.85 });
}


/**
 * Kimlik parçalarını kemiğe takar. Ölçüler HAM rig biriminde (gövde 2,204 ham = 1,75 dünya);
 * ölçülen hatlar: baş mesh'i y 1,10…2,20 · gövde 0,38…1,24 · baş eni 0,86.
 */
function kiyafetTak(kok: Object3D, kind: ActorKind, gorunum?: KiyafetGorunum) {
  const kemikler = new Map<string, Bone>();
  kok.traverse((n) => {
    if ((n as Bone).isBone) kemikler.set(n.name, n as Bone);
  });
  kok.updateWorldMatrix(true, true);
  const q = new Quaternion();
  const tak = (kemikAd: string, mesh: Mesh | Group, nokta: Vector3) => {
    const k = kemikler.get(kemikAd);
    if (!k) return;
    k.add(mesh);
    mesh.position.copy(k.worldToLocal(nokta.clone()));
    mesh.quaternion.copy(k.getWorldQuaternion(q).invert()); // kemiğin kendi dönüşünü geri al
  };

  // Sahibin 💎 kıyafeti (F4c) rolün sabit kimlik parçalarının YERİNE geçer; kasket de ondan gelir.
  const kiyafet = gorunum
    ? { kasket: false, onluk: false, havlu: !!gorunum.havlu, sivaliKol: !!gorunum.sivaliKol }
    : KAY_KIYAFET[kind];
  if (kiyafet.kasket) {
    // Kasket SABİT yükseklikte duramaz: her gövdenin saçı farklı yükseliyor (Ranger'ın saçı
    // 2,28'e, mankenin kafası 2,20'ye çıkıyor) ve sabit 2,06 saçın İÇİNDE kalıyordu — oyunda
    // alın bandı gibi okundu. Ölçü başın kendi kutusundan alınır, yani her gövdede oturur.
    const bas = new Box3();
    kok.traverse((n) => {
      const m = n as Mesh;
      if (m.isMesh && m.visible && /head|skull/i.test(m.name)) bas.union(new Box3().setFromObject(m));
    });
    const tepe = bas.isEmpty() ? 2.2 : bas.max.y;
    const yaricap = bas.isEmpty() ? 0.44 : ((bas.max.x - bas.min.x) / 2) * 0.98;
    const kasket = new Group();
    kasket.add(new Mesh(new CylinderGeometry(yaricap * 0.94, yaricap, 0.16, 14), mat(PALETTE.cap)));
    const vizor = new Mesh(new BoxGeometry(yaricap * 1.15, 0.045, yaricap * 0.7), mat(PALETTE.cap));
    vizor.position.set(0, -0.06, yaricap * 0.95);
    kasket.add(vizor);
    tak('head', kasket, new Vector3(0, tepe - 0.05, 0));
  }
  if (kiyafet.onluk) {
    // Önlük gövdenin PROFİLİNDEN üretilir (gerekçe: `onlukParcasi`). Geometri model uzayında
    // mutlak koordinat taşıdığı için kemiğe DÜNYA SIFIRINDAN takılır — `tak` orada mesh'in
    // dönüşünü de sıfırlar, yani yerel koordinatlar model koordinatlarıyla çakışır.
    const profil = govdeProfili(kok);
    const sifir = new Vector3(0, 0, 0);
    for (const p of Object.values(ONLUK_PARCALARI)) {
      const yay = (p.yayDerece * Math.PI) / 180;
      const merkez = (p.merkezDerece * Math.PI) / 180;
      const g = onlukParcasi(profil, p.yAlt, p.yUst, yay, p.genisleme, p.payEk, merkez);
      tak(p.kemik, new Mesh(g, kumas(PALETTE.apron)), sifir);
    }
  }

  if (kiyafet.havlu) {
    // Havlunun çapası SABİT DEĞİL, omuz kemiğinin kendi dünya konumu (gerekçe `patron.ts`).
    const omuz = kemikler.get('upperarml');
    if (omuz) {
      const nokta = omuz.getWorldPosition(new Vector3()).add(HAVLU_KAYMA);
      tak('upperarml', omuzHavlusu(), nokta);
    }
  }
  if (kiyafet.sivaliKol) kollariSiva(kok, gorunum?.gomlek);
  if (gorunum) {
    const bas = new Box3();
    kok.traverse((n) => {
      const m = n as Mesh;
      if (m.isMesh && m.visible && /head|skull/i.test(m.name)) bas.union(new Box3().setFromObject(m));
    });
    kiyafetParcalari(gorunum, govdeProfili(kok), tak, {
      tepe: bas.isEmpty() ? 2.2 : bas.max.y,
      yaricap: bas.isEmpty() ? 0.44 : ((bas.max.x - bas.min.x) / 2) * 0.98,
    });
  }
}

/**
 * Başı `head` KEMİĞİNDEN küçültür (S15 · D-113, gerekçe `actor.ts` → `KAY_KAFA_OLCEK`).
 * Kasket bu kemiğin çocuğu olduğu için onunla küçülür — o yüzden kıyafetten ÖNCE çağrılır.
 */
export function kafaKucult(kok: Object3D) {
  if (KAY_KAFA_OLCEK === 1) return;
  kok.traverse((n) => {
    if ((n as Bone).isBone && n.name === 'head') n.scale.setScalar(KAY_KAFA_OLCEK);
    // SkinnedMesh sınır kutusunu NESNE düzeyinde önbelleğe alır ve `kiyafetTak` kasketi o
    // kutudan konumlandırır; temizlenmezse kasket KÜÇÜLMEDEN ÖNCEKİ başın tepesine oturur.
    const sm = n as SkinnedMesh;
    if (sm.isSkinnedMesh) sm.boundingBox = null as unknown as Box3;
  });
  kok.updateMatrixWorld(true);
}

/**
 * Klip dosyalarının hepsini yükle ve tek listede topla (hepsi aynı rig'e bağlı).
 *
 * `head`in ÖLÇEK izi sökülür: KayKit her klipte her kemiğin ölçeğini de yazıyor, yani mixer
 * bizim `KAY_KAFA_OLCEK`imizin üstüne her karede 1,0 yazardı. İz sökmek güvenli çünkü ölçüldü —
 * kullandığımız dört dosyanın kliplerinde ölçek değeri **tam 1,0**; 1,0'dan sapan tek yer
 * `Spawn_Air`/`Spawn_Ground` (sıfırdan büyüyen doğuş efekti) ve o klipler kullanılmıyor.
 */
export function useKayKlipler() {
  const yollar = useMemo(() => KAY_KLIPLER.map((f) => `${KAY_KOK}${f}.glb`), []);
  const dosyalar = useGLTF(yollar);
  return useMemo(() => {
    const hepsi = dosyalar.flatMap((d) => d.animations);
    // İz YERİNDE sökülür, klip KLONLANMAZ. Klonlamak iki şeyi birden bozuyordu: 139 klip her
    // render'da yeniden üretiliyor (pahalı) ve yeni kimlik dönüyordu — müşteri havuzunun
    // `useMemo`su bu kimliğe bağlı olduğu için 24 skinned gövde her render'da baştan kuruluyordu.
    // `useGLTF` ayrıştırılmış dosyayı zaten global önbellekte tutuyor; bir kez sökmek yeter.
    for (const klip of hepsi) {
      const damga = klip as unknown as { __kafaIziSokuldu?: boolean };
      if (damga.__kafaIziSokuldu) continue;
      klip.tracks = klip.tracks.filter((t) => t.name !== 'head.scale');
      damga.__kafaIziSokuldu = true;
    }
    // TAŞIMA için bölünmüş kopyalar da listeye girer ki `useAnimations` onlara da eylem kursun:
    // alt gövde yürür (lokomosyon klipleri), üst gövde tepsiyi tutar (`KLIP.tut`).
    const bolunmus: AnimationClip[] = [];
    for (const ad of [...LOKOMOSYON.yuru, ...LOKOMOSYON.tasi, KLIP.dur]) {
      const k = hepsi.find((c) => c.name === ad);
      if (k) bolunmus.push(govdeYarisi(k, 'alt'));
    }
    const tutKlip = hepsi.find((c) => c.name === KLIP.tut);
    if (tutKlip) bolunmus.push(govdeYarisi(tutKlip, 'ust'));
    return [...hepsi, ...bolunmus];
  }, [dosyalar]);
}

/**
 * GÖVDE DEĞİŞİNCE AKTÖR YENİDEN KURULUR (F4c). Kıyafet değişince `govde` yeni bir iskeletle
 * yeniden üretiliyor, ama `useAnimations`ın karıştırıcısı klip izlerini İLK iskeletin kemiklerine
 * bağlayıp önbellekliyor — yeni gövde bind pozunda, yani T-pozunda donuyordu (vitrinde bir kıyafete
 * dokununca ölçüldü). Anahtar karıştırıcıyı gövdeyle birlikte tazeler.
 */
export function KayActor(props: KayActorProps) {
  return <KayActorGovde key={`${props.kind}|${props.kiyafet ?? ''}`} {...props} />;
}

type KayActorProps = {
  kind: ActorKind;
  hal?: KayHal;
  tasiyor?: boolean;
  tekEl?: boolean;
  kiyafet?: string;
  children?: ReactNode;
};

function KayActorGovde({
  kind,
  hal,
  tasiyor = false,
  tekEl = false,
  kiyafet,
  children,
}: {
  kind: ActorKind;
  /** 💎 vitrini kıyafet kimliği (F4c) — yalnız sahip için verilir; yoksa rolün kendi kıyafeti. */
  kiyafet?: string;
  hal?: KayHal;
  /** Elinde bir şey var mı — üst gövde `KLIP.tut`a geçer, `children` ELE takılır. */
  tasiyor?: boolean;
  /** Eşya TEK ELDE asılı (askılı tepsi): tutuş klibi yok, çapa sağ el, sağ kol yana açılır (`ASKI_KOL`). */
  tekEl?: boolean;
  /** Taşınan eşya (tepsi, kirli bardak). Gövde ölçeğinin DIŞINDA, ama ELİ takip eder. */
  children?: ReactNode;
}) {
  const { scene } = useGLTF(`${KAY_KOK}${KAY_MODEL[kind]}.glb`);
  const gorunum = kiyafet ? kiyafetGorunum(kiyafet) : undefined;
  const klipler = useKayKlipler();
  const ref = useRef<Group>(null);

  const govde = useMemo(() => {
    // SkeletonUtils: skinned mesh'te düz klon bütün kopyaları TEK iskelete bağlar.
    const o = skinKlon(scene);
    o.traverse((n) => {
      const m = n as Mesh;
      if (!m.isMesh) return;
      if (ekipmanMi(m.name)) {
        m.visible = false;
        return;
      }
      m.castShadow = true;
      const e = PARCA_RENK.find(([d]) => d.test(m.name));
      if (e) m.material = mat(gorunum ? (/leg/i.test(m.name) ? gorunum.pantolon : gorunum.gomlek) : e[1]);
    });
    kafaKucult(o);
    kiyafetTak(o, kind, gorunum);
    return o;
  }, [scene, kind, gorunum]);
  // Klonun iskeletleri kendi kemik dokusunu (GPU) taşır; gövde sökülünce bırakılmazsa her Kat 2
  // girişinde birikiyordu (perf W3). Kat 2 gizlenirken (Activity) değil, gerçekten sökülürken bırakılır.
  const birak = useSokulurkenBirak();
  useEffect(
    () => () => {
      if (birak()) iskeletleriBirak(govde);
    },
    [govde, birak],
  );

  const gizli = useKatGizli();

  const { actions, mixer } = useAnimations(klipler, ref);
  // Katı gizliyken (Kat 2'deyken Kat 1 personeli) karıştırıcı ilerlemez — drei'nin kare döngüsü
  // `mixer.update`i çağırır, gizliyken boşa döner. Dönüşte animasyon kaldığı yerden sürer.
  useLayoutEffect(() => {
    const asil = mixer.update;
    mixer.update = function (dt: number) {
      return gizli() ? this : asil.call(this, dt);
    };
    return () => {
      mixer.update = asil;
    };
  }, [mixer, gizli]);

  /**
   * Başlangıç: dur. Eylem HENÜZ YOKSA bu kanca sessizce hiçbir şey yapmaz — ve düzeltmesi
   * aşağıda, `useFrame` içindedir (T-POZ HATASI, S18).
   *
   * KUSUR NEYDİ: `useAnimations` `actions` nesnesini YERİNDE doldurur; klipler geç çözülen bir
   * aktörde bu kanca çalıştığında `actions[KLIP.dur]` hâlâ `undefined` oluyordu ve kanca
   * `[actions]`e bağlı olduğu için —nesne kimliği değişmediğinden— BİR DAHA çalışmıyordu.
   * `useFrame` de kurtaramıyordu: `suAn` zaten `['Idle_A']` yazıyordu, hedef de `['Idle_A']`
   * çıkıyor ve erken dönüş her karede vuruyordu. Sonuç: o aktörde hiçbir klip HİÇ başlamıyor,
   * kemikler bind pozunda kalıyor — KayKit'in bind pozu T-POZ, yani kollar iki yana açık.
   * Kullanıcı 2026-09-14: *"tüm karakterlerin elleri sağa açık garsonlar için vs"*.
   *
   * Yarış olduğu için de SEYREKTİ: dört personelin yalnız bir-ikisi donuyordu, müşteriler hiç
   * donmuyordu (onların eylemleri yuva kurulurken, klipler ELDEYKEN başlıyor). Ölçüm:
   * `docs/olcum-kol.json` — donuk gövdede el oynaması **tam 0**, yan açıklık 1,574 (oynayan
   * personelde 0,92-0,96).
   */
  const suAn = useRef<string[]>([KLIP.dur]);
  useEffect(() => {
    const a = actions[KLIP.dur];
    a?.reset().play();
    return () => {
      a?.stop();
    };
  }, [actions]);

  const sonKonum = useRef<Vector3 | null>(null);
  const dunya = useRef(new Vector3());
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || dt <= 0 || gizli()) return;
    g.getWorldPosition(dunya.current);
    let hiz = 0;
    if (sonKonum.current) {
      const dx = dunya.current.x - sonKonum.current.x;
      const dz = dunya.current.z - sonKonum.current.z;
      hiz = Math.sqrt(dx * dx + dz * dz) / dt;
    } else sonKonum.current = new Vector3();
    sonKonum.current.copy(dunya.current);

    // `hal` verilmişse o kazanır (oturan müşteri, tezgâhta çalışan çaycı); yoksa hız karar verir.
    const hedefHal: KayHal = hal ?? (hiz > YURUME_ESIGI ? 'yuru' : 'dur');

    // SENKRON (S15 · D-113): hareket halinde klip HIZDAN seçilir ve hıza göre hızlandırılır.
    // Duruş/çalışma/oturma klipleri yerinde çalar, `timeScale` 1 kalır.
    const hareket = hedefHal === 'yuru' || hedefHal === 'tasi';
    const secim = hareket ? lokomosyonSec(lokomosyonAdaylari(hedefHal, KOSABILIR[kind]), hiz) : null;
    const hedefKlip = secim ? secim.klip : KLIP[hedefHal];

    // TAŞIMA (S16): elinde tepsi varken üst gövde `KLIP.tut`, alt gövde yürüyüş oynar.
    // KayKit'te "yürürken taşıma" klibi yok; iki yarım klip aynı anda, tam ağırlıkta çalar.
    const hedefler = tasiyor && !tekEl
      ? [`${hedefKlip}|alt`, `${KLIP.tut}|ust`]
      : [hedefKlip];

    // Katsayı HER KARE yazılır (hız yükseltmeyle veya ivmeyle değişir), klip değişmese bile.
    // Yalnız LOKOMOSYON yarısına uygulanır — tutuş pozu hızlanmaz.
    const lokomosyon = actions[hedefler[0]];
    if (lokomosyon) lokomosyon.timeScale = secim ? secim.timeScale : 1;

    /**
     * ERKEN DÖNÜŞ İKİ KOŞULA BAĞLI: hedef DEĞİŞMEMİŞ **ve** hedef gerçekten ÇALIYOR olmalı.
     *
     * Eskiden yalnız birinci koşul vardı ve "hedef değişmedi" ile "hedef çalıyor" aynı şey
     * sanılıyordu. Değiller: mount anında klipleri hazır olmayan bir aktörde hiçbir eylem
     * başlamıyor, `suAn` yine de `['Idle_A']` yazıyor ve hedef de `['Idle_A']` çıktığı için
     * erken dönüş ebediyen vuruyordu — aktör T-pozunda kalıyordu. İkinci koşulla kare döngüsü
     * TEK OTORİTE oluyor: mount'ta kaçan başlatma bir sonraki karede kendiliğinden onarılıyor.
     *
     * `varOlan` süzgeci şart: her hedefin eylemi OLMAYABİLİR (örn. `Working_A|alt` bölünmüş
     * klipler listesinde yok). Var olmayanı beklemek, koşulu ebediyen yanlış tutup her karede
     * yeniden başlatma denemesi yaptırırdı.
     */
    const varOlan = hedefler.filter((ad) => actions[ad]);
    if (varOlan.length === 0) return;
    const ayniHedef = hedefler.length === suAn.current.length && hedefler.every((a, i) => a === suAn.current[i]);
    if (ayniHedef && varOlan.every((ad) => actions[ad]!.isRunning())) return;
    for (const ad of hedefler) {
      const a = actions[ad];
      if (!a || a.isRunning()) continue;
      a.reset().fadeIn(0.18).play();
    }
    for (const ad of suAn.current) {
      if (hedefler.includes(ad)) continue;
      actions[ad]?.fadeOut(0.18);
    }
    suAn.current = hedefler;
  });

  // TAŞINAN EŞYA ELİ TAKİP EDER (S16). Eskiden gövdenin yanında SABİT bir noktaya asılıydı
  // (`KAY_TEPSI_KAYMA`) ve ölçüm kusuru gösterdi: çapa y 0,953'te, eller 0,66'da — tepsi
  // ellerin 29 cm üstünde, göğse yapışık duruyordu (`docs/gorsel/ss/s16-tepsi-yakin.png`).
  // Çapa artık iki `handslot` kemiğinin ORTASI. KONUM takip edilir, DÖNÜŞ edilmez: tepsi
  // düz kalmalı, elin eğimiyle yalpalamamalı.
  const tepsiRef = useRef<Group>(null);
  /**
   * EL KEMİKLERİ `govde` İLE BİRLİKTE TAZELENİR (S18).
   *
   * Eskiden bir `useRef` içinde TEMBEL dolduruluyordu (`if (!eller.current[0])`) ve bir daha
   * hiç yenilenmiyordu. `govde` ise `useMemo([scene, kind])` — yani gövde yeniden kurulduğunda
   * (rol değişimi, HMR, `useGLTF`in yeni sahne döndürmesi) ref ESKİ iskeletin kemiklerini
   * tutmaya devam ediyordu. Eski iskelet artık sahnede olmadığı için dünya konumu donuyor ve
   * tepsi, taşıyanından kopup salonda bir yerde ASILI kalıyordu — kullanıcı 2026-09-14:
   * *"etrafta tepsiler geziyo"*. `useMemo` bağı kurunca kemikler gövdeyle birlikte tazeleniyor.
   */
  const eller = useMemo<[Object3D | null, Object3D | null]>(() => [
    govde.getObjectByName(STERIL('handslot.l')) ?? null,
    govde.getObjectByName(STERIL('handslot.r')) ?? null,
  ], [govde]);
  const sagKol = useMemo(() => govde.getObjectByName(STERIL('upperarm.r')) ?? null, [govde]);
  const solP = useRef(new Vector3());
  const sagP = useRef(new Vector3());
  const kolQ = useMemo(() => ({
    ebeveyn: new Quaternion(), ters: new Quaternion(), aktor: new Quaternion(), don: new Quaternion(), eksen: new Vector3(),
    taban: new Quaternion(), yazilan: new Quaternion(), dolu: false,
  }), []);
  useFrame(() => {
    const t = tepsiRef.current;
    const g = ref.current;
    if (!t || !g || gizli()) return;
    const [sol, sag] = eller;
    // Tek elde taşıma: karıştırıcı kolu bu karede yazdı; üstüne dünya eksenlerinde (aktörün ileri ve
    // yan ekseni) açılma eklenir. Yerel eksen kemikten kemiğe değişir, dünya ekseni değişmez.
    if (tasiyor && tekEl && sagKol?.parent) {
      // Karıştırıcı bu karede kolu yazmadıysa (klip durmuş/çizim atlanmış) açılma ÜST ÜSTE binmesin.
      if (kolQ.dolu && sagKol.quaternion.equals(kolQ.yazilan)) sagKol.quaternion.copy(kolQ.taban);
      kolQ.taban.copy(sagKol.quaternion);
      g.getWorldQuaternion(kolQ.aktor);
      sagKol.parent.getWorldQuaternion(kolQ.ebeveyn);
      kolQ.ters.copy(kolQ.ebeveyn).invert();
      const ekle = (x: number, y: number, z: number, aci: number) => {
        kolQ.eksen.set(x, y, z).applyQuaternion(kolQ.aktor);
        kolQ.don.setFromAxisAngle(kolQ.eksen, aci);
        // yerel' = P⁻¹ · R · P · yerel
        sagKol.quaternion.premultiply(kolQ.ebeveyn).premultiply(kolQ.don).premultiply(kolQ.ters);
      };
      ekle(0, 0, 1, -ASKI_KOL.acilma);
      ekle(1, 0, 0, -ASKI_KOL.one);
      kolQ.yazilan.copy(sagKol.quaternion);
      kolQ.dolu = true;
      sagKol.updateMatrixWorld(true);
    }
    // EL BULUNAMAZSA TEPSİ GİZLENİR, yerinde BIRAKILMAZ. Bırakmak sessiz bir kusurdu: tepsi
    // konum alamayınca son konumunda kalıyor ve sahnede sahipsiz duruyordu. Görünmemek,
    // yanlış yerde görünmekten iyidir.
    if (!sol || !sag) {
      t.visible = false;
      return;
    }
    t.visible = true;
    if (tasiyor && tekEl) sag.getWorldPosition(solP.current);
    else {
      sol.getWorldPosition(solP.current);
      sag.getWorldPosition(sagP.current);
      solP.current.add(sagP.current).multiplyScalar(0.5);
    }
    // Dünya → bu bileşenin ebeveyn uzayı (gövde ölçeğinin DIŞI).
    t.parent?.worldToLocal(solP.current);
    t.position.copy(solP.current);
  });

  return (
    <>
      <group ref={ref} scale={KAY_SCALE}>
        <primitive object={govde} />
      </group>
      {/* Gövde ölçeğinin DIŞINDA: bardaklar dünya ölçüsünde yazılı (yarıçap 0,05 = 5 cm) ve
          gövde ölçeğine bağlanırsa onunla küçülürdü. Konumu her kare elden alınır. */}
      <group ref={tepsiRef}>{children}</group>
    </>
  );
}

KAY_KLIPLER.forEach((f) => useGLTF.preload(`${KAY_KOK}${f}.glb`));
Object.values(KAY_MODEL).forEach((m) => useGLTF.preload(`${KAY_KOK}${m}.glb`));
