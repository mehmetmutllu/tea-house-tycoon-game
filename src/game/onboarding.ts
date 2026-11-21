/**
 * onboarding.ts — E5 HAREKETLİ İLK DAKİKALAR: hangi adımdayız, iz nereyi gösteriyor.
 *
 * İKİNCİ BİR HAT DEĞİL. Görev hattı ilk dakikaların NE'sini zaten söylüyor (bant · kamera · kenar
 * oku · zemin işareti, D-038). Taze oyunda eksik kalan üç şey vardı ve öğretici yalnız onları ekler:
 *   1. **Nasıl yürünür** — joystick görünmez (dokunulan yerde belirir); ilk karede ekranda onu
 *      anlatan hiçbir şey yoktu. → sürükleyen el.
 *   2. **Tam olarak nereye** — "Çayı müşteriye götür" görevinin dünya hedefi OCAK (`questFocusPos`
 *      serveTea → istasyon); tepsisi dolu yeni oyuncuya ok ocağı gösteriyordu. Öğretici süresince
 *      hedef, çay bekleyen müşteri / yerdeki para olur. → zemin izi + aynı hedefe dönen kenar oku.
 *   3. **Nasıl alınır** — "durunca al" (hareket-temelli) kuralı hiçbir yerde yazmıyordu. → tek satır.
 *
 * TEK DOĞRU KAYNAK: adım sayaçtan değil, kartın görevinden (`cardQuestIndex`) türer. Kayıtta tek
 * yeni şey oyuncunun "Atla" kararıdır. Son öğretici görevi bitmiş (ilerlemiş/eski) kayıt öğreticiyi
 * yapısal olarak göremez — migrasyon gerekmez.
 */
import { ONBOARDING, type OgreticiAdim } from '../config/onboarding';
import { economyConfig as C } from '../config/economy.config';
import { KAT2_YIKAMA_YER, OCAKLAR, type Kat2Kayit } from './kat';
import { kat2LavaboTetik, kat2OcakTetik, kat2PadYeri, kat2SiradakiPad, kat2SvCanliTetik, type Kat2Ayar } from './kat2Dongu';
import { kat2SvCanli } from './kat2Gorev';

/** Öğretici görevlerinin hattaki index'leri (config sırasıyla). */
const GOREV_INDEX: readonly number[] = ONBOARDING.gorevler.map((g) => C.quests.findIndex((q) => q.id === g.gorev));

/** Öğreticinin bittiği kart index'i: son öğretici görevinden SONRAKİ görev. */
export const OGRETICI_BITIS = Math.max(...GOREV_INDEX) + 1;

export interface OgreticiGirdi {
  /** KARTIN görevi (`cardQuestIndex`) — kutlama penceresinde biten görev, sonra yenisi. */
  kartIndex: number;
  /** Oyuncu "Atla" dedi (kayıtta). */
  atlandi: boolean;
  /** Oyuncu bu oturumda yürüdü mü (başlangıç noktasından `yuruEsik` kadar uzaklaştı). */
  yurudu: boolean;
}

/** Şu anki öğretici adımı; öğretici yoksa (bitti/atlandı) `null`. SAF. */
export function ogreticiAdimi(g: OgreticiGirdi): OgreticiAdim | null {
  if (g.atlandi) return null;
  // Bitiş ayrı bir eşik değil: kart öğretici görevlerinden birinde değilse öğretici yoktur
  // (`OGRETICI_BITIS` ve sonrası — ilerlemiş/eski kayıt dahil).
  const i = GOREV_INDEX.indexOf(g.kartIndex);
  if (i < 0) return null;
  const adim = ONBOARDING.gorevler[i].adim;
  return adim === 'cay-al' && !g.yurudu ? 'yuru' : adim;
}

/** Oyuncu yürümeyi öğrendi mi — başlangıç noktasından uzaklık. */
export function yurudu(player: readonly number[], baslangic: readonly number[]): boolean {
  return Math.hypot(player[0] - baslangic[0], player[2] - baslangic[2]) >= ONBOARDING.yuruEsik;
}

type Nokta = readonly [number, number, number] | readonly number[];

export interface OgreticiDunya {
  player: Nokta;
  tray: number;
  npcs: readonly { state: string; product: string; pos: Nokta }[];
  coins: readonly { pos: Nokta }[];
}

const yakini = <T extends { pos: Nokta }>(liste: readonly T[], p: Nokta): T | null => {
  let en: T | null = null;
  let d = Infinity;
  for (const o of liste) {
    const dd = Math.hypot(o.pos[0] - p[0], o.pos[2] - p[2]);
    if (dd < d) {
      d = dd;
      en = o;
    }
  }
  return en;
};

/**
 * Öğretici adımının DÜNYA hedefi — görevin kendi hedefinden (`questFocusPos`) farklıysa.
 * `null` = görevin hedefi zaten doğru, dokunma. Yalnız iki adımda ayrışır:
 *   - servis: tepside çay varken çay bekleyen EN YAKIN müşteri (tepsi boşsa ocak → null).
 *   - para:   yerdeki EN YAKIN para (henüz yoksa → null; görev hedefi salon ortası).
 */
export function ogreticiHedefi(adim: OgreticiAdim | null, w: OgreticiDunya): [number, number, number] | null {
  if (adim === 'servis') {
    if (w.tray <= 0) return null;
    const n = yakini(w.npcs.filter((m) => m.state === 'waitingForTea' && m.product !== 'tost'), w.player);
    return n ? [n.pos[0], 0, n.pos[2]] : null;
  }
  if (adim === 'para') {
    const c = yakini(w.coins, w.player);
    return c ? [c.pos[0], 0, c.pos[2]] : null;
  }
  return null;
}

/** Zemin izi çizilir mi: öğretici adımı var ve izin gideceği anlamlı bir hedef var (para
 *  adımında yerde henüz para yoksa görev hedefi salonun ortasıdır — oraya iz çekilmez). */
export function izCizilir(adim: OgreticiAdim | null, w: Pick<OgreticiDunya, 'coins'>): boolean {
  if (adim == null) return false;
  return !(adim === 'para' && w.coins.length === 0);
}

export type OgreticiMetinAnahtari = keyof typeof ONBOARDING.metin;

/** Adımın satırı. Servis/para adımında dünyanın hâline göre (tepsi boş · para henüz düşmedi). */
export function ogreticiMetni(adim: OgreticiAdim, w: Pick<OgreticiDunya, 'tray' | 'coins'>): OgreticiMetinAnahtari {
  if (adim === 'servis' && w.tray <= 0) return 'servis-bos';
  if (adim === 'para' && w.coins.length === 0) return 'para-bekle';
  return adim;
}

// ───────────────────────── KAT 2 (S5 · Kat 1 eşitliği — `docs/s5-ux-denetim.md`) ─────────────────────────

/**
 * G-104 — KAT 2 İLK İPUÇLARI. Kat 1'de "Ocağa git, yanında dur" satırı (E5) ve bulaşık öğretme kartı (G-63)
 * ilk kahve/ilk bulaşıkta konuşuyordu; Kat 2'de ikisinin karşılığı yoktu. Kat 1 deseniyle: adım SAYAÇTAN
 * değil oyuncunun yaptığından türer (hiç kahve almadı · elinde kirli var ama hiç yıkamadı), kayıtta yeni
 * alan yok; oyuncu bir kez yapınca satır yapısal olarak kaybolur. Bulaşık önce: elde kirli varken yol leğen.
 */
export type Kat2Ipucu = 'k2-kahve' | 'k2-bulasik';

export interface Kat2IpucuGirdi {
  kat: number;
  gecis: boolean;
  padsDone: readonly string[];
  /** Kat 2 tepsisindeki kahve / kirli fincan. */
  tepsi: number;
  tepsiKirli: number;
  /** Ömür boyu: ocaktan alınan kahve (`stats.kat2Alinan`) · oyuncunun leğene bıraktığı kirli (`stats.kat2Yikanan`). */
  alinan: number;
  yikanan: number;
}

export function kat2IpucuAdimi(g: Kat2IpucuGirdi): Kat2Ipucu | null {
  if (g.kat !== 2 || g.gecis) return null;
  if (g.tepsiKirli > 0 && g.yikanan <= 0) return 'k2-bulasik';
  if (g.alinan <= 0 && g.tepsi <= 0 && OCAKLAR.some((o) => g.padsDone.includes(o.id))) return 'k2-kahve';
  return null;
}

/** Satırın metni (TR anahtar; `t()` çevirir). "Buradan/buraya": kamera ipucu belirince hedefe gider (Kat 1 G-63). */
export const KAT2_IPUCU_METIN: Record<Kat2Ipucu, string> = {
  'k2-kahve': 'Kahveleri buradan al',
  'k2-bulasik': 'Bulaşıkları buraya koy',
};

/** İpucunun dünya hedefi [x, z]: açık ilk ocağın alma noktası · yıkama yeri (leğen). */
export function kat2IpucuHedefi(i: Kat2Ipucu, padsDone: readonly string[]): [number, number] | null {
  if (i === 'k2-bulasik') return [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1]];
  const o = OCAKLAR.find((x) => padsDone.includes(x.id));
  return o ? [o.al[0], o.al[1]] : null;
}

/**
 * G-107 — KAT 2'DE ŞU AN ÇİZİLEN SATIN ALMA NOKTALARI: sıradaki pad · canlı Sv noktaları · ocak ve lavabo
 * yükseltme noktası. Sahnenin çizdiği kuralların AYNISI (`PadIsaret` · `SvIsaret`), yani "yeni nokta" = ekranda
 * yeni beliren işaret. Anahtar türü taşır (Kat 1 `revealKeys`in `tableUp:` / `upgrade:` / `opt:` deseni).
 */
export function kat2Noktalar(k: Pick<Kat2Kayit, 'padsDone' | 'masaSv' | 'yuk' | 'gorev'>, ayar: Kat2Ayar): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const pad = kat2SiradakiPad(ayar, k.padsDone);
  if (pad) out.set(`pad:${pad.id}`, kat2PadYeri(pad.id));
  const canli = kat2SvCanli(k, C.kat2Gorevler, ayar);
  for (const t of kat2SvCanliTetik(ayar, k.padsDone, k.masaSv ?? {}, canli)) out.set(`sv:${t.id}`, [t.x, t.z]);
  const o = kat2OcakTetik(ayar, k.padsDone, k.yuk);
  if (o) out.set(`ocak:${o.id}`, [o.x, o.z]);
  const l = kat2LavaboTetik(ayar, k.padsDone, k.yuk);
  if (l) out.set(`lavabo:${l.id}`, [l.x, l.z]);
  return out;
}

/** Öncekinde olmayan TÜM noktalar (sahnedeki sırayla). İlk ölçüm (önceki yok) yeni sayılmaz. SAF. */
export function kat2YeniNoktalar(
  onceki: ReadonlySet<string> | null,
  simdi: ReadonlyMap<string, [number, number]>,
): { anahtar: string; yer: [number, number] }[] {
  if (!onceki) return [];
  return [...simdi].filter(([a]) => !onceki.has(a)).map(([anahtar, yer]) => ({ anahtar, yer }));
}

/**
 * Aynı karede belirenlerin tepkisi: HER yeni noktanın bildirimi (tek pad iki nokta açabilir — `k2okey4`
 * sıradaki pad'i VE ocak yükseltmesini birlikte getirir; yalnız ilkine bakmak ocak bildirimini yutuyordu)
 * ve tek kamera hedefi — bildirimi olan nokta önce (bant neyi söylüyorsa kamera onu gösterir). SAF.
 */
export function kat2NoktaTepkisi(
  yeniler: readonly { anahtar: string; yer: [number, number] }[],
): { yer: [number, number]; bildirimler: string[] } | null {
  if (yeniler.length === 0) return null;
  const bildirimler = yeniler.map((y) => kat2NoktaBildirimi(y.anahtar)).filter((m): m is string => m != null);
  const hedef = yeniler.find((y) => kat2NoktaBildirimi(y.anahtar) != null) ?? yeniler[0];
  return { yer: hedef.yer, bildirimler };
}

/**
 * Yeni noktanın bildirimi (Kat 1 reveal toast'ı): yalnız GÖREVİN söylemediği yükseltme noktası — ocak.
 * Pad ve Sv noktalarını görev bandı zaten söylüyor (Kat 1 `questCoveredReveals`: görev kapsıyorsa toast yok,
 * yalnız kamera); lavabonun Kat 1'de de bildirimi yok.
 */
export function kat2NoktaBildirimi(anahtar: string): string | null {
  return anahtar.startsWith('ocak:') ? 'Yeni: Cezve ocağını yükseltebilirsin ☕' : null;
}

/**
 * G-94 — KAT 2 TANITIM BANDI: perde açılıp oyuncu Kat 2'de belirince "bu kat ne" (Kat 1'de yeni şey açılınca
 * çıkan bildirim bandı). Kat 1'in "yeni kat" sesiyle (`kat2Ses` `k2yeniKat`) aynı an: kat henüz boşken
 * (yalnız hazır pad'ler — ilk çıkış) geçiş BİTTİĞİ kare. Yükleme anı (geçişsiz) sayılmaz. SAF.
 */
export function kat2TanitimAni(
  onceki: { kat: number; gecis: boolean } | null,
  simdi: { kat: number; gecis: boolean; hazirda: boolean },
): boolean {
  return !!onceki && onceki.gecis && !simdi.gecis && simdi.kat === 2 && simdi.hazirda;
}

export const KAT2_TANITIM_METIN = 'Oyun Salonu — okey ve tavla masaları';
