/**
 * tetik-s24.test.ts — BEKÇİ: yükseltme tetiği çizilen ÇERÇEVEDİR (S24 · D-121).
 *
 * NE KORUYOR. S24'e kadar dolum bir DAİRE testine bağlıydı (`dist2D < TABLE_UP_RADIUS |
 * PAD_RADIUS`) ama ekranda DİKDÖRTGEN çiziliyordu. Ölçüldü: tetikleyen alanın **%50,4'ü**
 * çerçevenin dışındaydı, ayrıca "üstündesin" kabarması da kendi üçüncü geometrisini kuruyordu
 * (%34,3 dışarıda). Sayılar: `docs/tetik-raporu-s24.md`.
 *
 * BU DOSYA İSME DEĞİL KULLANIMA BAKAR. S23'ün dersi buydu: `toMatch(/FloorPatch/)` kaldırılmış
 * bir bileşende bile yeşil kalıyordu, çünkü ad import satırında duruyordu. Buradaki denetimlerin
 * çoğu GERÇEK TICK'i sürüyor ya da saf geometriyi hesaplıyor; kaynak metnine bakan üç denetim
 * de bir ADIN varlığını değil, formülün TEK YERDE durduğunu sınıyor.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig } from '../src/config/economy.config';
import {
  LAVABO,
  LAYOUT,
  PAD_RADIUS,
  TABLE_UP_RADIUS,
  activeSolids,
  hitsSolid,
  servicePlace,
} from '../src/game/layout';
import {
  ETIKET_LAVABO,
  ETIKET_SERVIS,
  ISARET_R,
  MASA_ISARET_R,
  inFrame,
  lavaboCercevesi,
  markerFrame,
  masaCercevesi,
  masaEtiketi,
  padCercevesi,
  servisCercevesi,
  type Cerceve,
} from '../src/game/markerFrame';
import { useGame } from '../src/game/store';
import type { Vec3 } from '../src/game/types';

const oku = (p: string) => readFileSync(p, 'utf8');
const TICK = 'src/game/tick.ts';
const MARKER = 'src/components/three/GroundMarker.tsx';
const SCENE = 'src/components/three/Scene.tsx';
const FRAME = 'src/game/markerFrame.ts';

/** Yorumları at — bir kuralı YORUMDA anlatmak onu uygulamak değildir. */
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// =============================================================================================
//  1) GERÇEK TICK — sınır tam olarak çerçeve mi?
// =============================================================================================

/**
 * Oyuncuyu koy, girdiyi sıfırla (dolum yalnız DURURKEN akar), birkaç tik sür ve pad'in
 * dolup dolmadığına BAK.
 *
 * `onFillId` store'da durmaz — tick bağlamının içinde yaşar. Bu iyi bir şey: denetim böylece
 * bir iç değişkeni değil, oyuncunun GÖRDÜĞÜ sonucu (dolum çubuğu ilerledi mi) sınıyor.
 */
function doluyorMu(padId: string, x: number, z: number): boolean {
  useGame.setState({ padFills: {}, player: [x, 0.6, z] as Vec3, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  for (let i = 0; i < 4; i++) useGame.getState().tick(0.05);
  return (useGame.getState().padFills[padId] ?? 0) > 0;
}

/**
 * İlk pad (`table2`) sahnesi. Pad'ler GÖREV HATTINA bağlı görünür (`visiblePads`), o yüzden
 * görev indeksi o pad'i hedefleyen göreve kurulur — `logic.test.ts`in `completePad` deseni.
 */
function padSahnesi(): { id: string; pos: Vec3; c: Cerceve } {
  const pad = economyConfig.pads[0];
  const qi = economyConfig.quests.findIndex(
    (q) => q.target.type === 'pad' && (q.target as { id: string }).id === pad.id,
  );
  expect(qi, 'pad görev hattında bulunmalı').toBeGreaterThanOrEqual(0);
  useGame.setState({
    questIndex: qi, questBase: 0, questPhase: 'active', questPhaseT: 0,
    padsDone: [], padFills: {},
  });
  useGame.getState().addMoney(pad.cost + 500);
  return { id: pad.id, pos: LAYOUT.padPos[pad.id], c: padCercevesi(pad.label) };
}

describe('S24 · tetik = çizilen çerçeve (gerçek tick)', () => {
  it('1 · çerçevenin İÇİNDE dolum başlar, kenarın hemen DIŞINDA başlamaz', () => {
    const { id, pos, c } = padSahnesi();
    // Dört yönde: içeride (kenarın 0,04 içi) tetikler, dışarıda (0,12 dışı) tetiklemez.
    const yonler: Array<[number, number, string]> = [
      [1, 0, '+x'], [-1, 0, '-x'], [0, 1, '+z'], [0, -1, '-z'],
    ];
    for (const [sx, sz, ad] of yonler) {
      const ic = doluyorMu(id, pos[0] + sx * (c.hw - 0.04), pos[2] + sz * (c.hh - 0.04));
      expect(ic, `${ad}: çerçevenin içinde dolum başlamalı`).toBe(true);
      const dis = doluyorMu(id, pos[0] + sx * (c.hw + 0.12), pos[2] + sz * (c.hh + 0.12));
      expect(dis, `${ad}: çerçevenin dışında dolum başlamamalı`).toBe(false);
    }
  });

  it('2 · ESKİ DAİRENİN yakaladığı ama çerçevenin dışında kalan nokta artık TETİKLEMEZ', () => {
    const { id, pos, c } = padSahnesi();
    // Eski tetik PAD_RADIUS = 1,3'lük daireydi. Çerçevenin sağ kenarı ile o dairenin kenarı
    // arasındaki bant, kullanıcının "yanında" dediği alanın ta kendisi.
    const arada = (c.hw + PAD_RADIUS) / 2;
    expect(arada, 'bu sınav ancak daire çerçeveden genişse anlamlı').toBeGreaterThan(c.hw);
    expect(Math.hypot(arada, 0), 'nokta eski dairenin İÇİNDE olmalı').toBeLessThan(PAD_RADIUS);
    expect(doluyorMu(id, pos[0] + arada, pos[2])).toBe(false);
  });

  it('3 · köşe de çerçeveye uyar: köşenin içi tetikler, köşegen taşması tetiklemez', () => {
    const { id, pos, c } = padSahnesi();
    expect(doluyorMu(id, pos[0] + c.hw - 0.05, pos[2] + c.hh - 0.05)).toBe(true);
    // Köşenin DIŞI ama eski dairenin İÇİ: köşe yönünde ilerleyip yarıçapın hemen altında durulur.
    // Daire testi burayı yakalardı (köşegende çerçeve 1,233 br'de biter, daire 1,300'de).
    const kose = Math.hypot(c.hw, c.hh);
    expect(kose, 'bu sınav ancak köşe daireden içerdeyse anlamlı').toBeLessThan(PAD_RADIUS);
    const t = (PAD_RADIUS - 0.03) / kose;
    const kx = pos[0] + c.hw * t;
    const kz = pos[2] + c.hh * t;
    expect(Math.hypot(kx - pos[0], kz - pos[2]), 'nokta eski daireye düşsün').toBeLessThan(PAD_RADIUS);
    expect(Math.abs(kx - pos[0]), 'nokta çerçevenin dışında olmalı').toBeGreaterThan(c.hw);
    expect(doluyorMu(id, kx, kz)).toBe(false);
  });
});

// =============================================================================================
//  2) TEK KAYNAK — çerçeve iki yerde ayrı ayrı hesaplanmıyor
// =============================================================================================

describe('S24 · çerçeve TEK yerde hesaplanır', () => {
  it('4 · çerçeve formülü (r × 1,05 kelepçesi) yalnız markerFrame.ts içinde geçer', () => {
    for (const dosya of [MARKER, SCENE, TICK]) {
      expect(yorumsuz(oku(dosya)), `${dosya} çerçeveyi yeniden hesaplamamalı`).not.toMatch(/1\.05/);
    }
    expect(yorumsuz(oku(FRAME))).toMatch(/radius \* 1\.05/);
  });

  it('5 · tick dolum sınırı için YARIÇAP kullanmaz, çerçeve çağırır', () => {
    const kod = yorumsuz(oku(TICK));
    // Yarıçap sabitleri tick'e hiç girmemeli (yerleşim ayrıklığı için layout/testlerde kalırlar).
    expect(kod).not.toMatch(/\bPAD_RADIUS\b/);
    expect(kod).not.toMatch(/\bTABLE_UP_RADIUS\b/);
    // Dört dolum noktasının dördü de çerçeve testinden geçmeli.
    for (const cagri of ['padCercevesi(', 'servisCercevesi(', 'masaCercevesi(', 'lavaboCercevesi(']) {
      expect(kod, `${cagri} çağrılmalı`).toContain(cagri);
    }
    expect((kod.match(/inFrame\(/g) ?? []).length, 'dört dolum noktası da inFrame ile').toBe(4);
  });

  it('6 · işaret kendi dairesini kurmaz; G-105 (S5) sonrası "üstündesin" kabarması hiç yok', () => {
    const kod = yorumsuz(oku(MARKER));
    // Eski hâl bir daire karşılaştırmasıydı: (pl[0]-pos[0])**2 + ... <= (hw * PAY)**2
    expect(kod, 'daire testi olmamalı').not.toMatch(/\*\* 2/);
    // Kabarma kalktı (oyun testi 2026-11-20): boyu değiştiren ölçek yazımı yok — bekçisi tests/esya-s5.test.ts.
    expect(kod).not.toMatch(/UZERINDE_BUYUME/);
  });

  it('7 · çizilen etiketler ile tetiğin okuduğu etiketler aynı üreticiden gelir', () => {
    const scene = yorumsuz(oku(SCENE));
    expect(scene).toMatch(/label=\{ETIKET_SERVIS\}/);
    expect(scene).toMatch(/label=\{masaEtiketi\(lvl\)\}/);
    expect(scene).toMatch(/label=\{ETIKET_LAVABO\}/);
    expect(scene, 'masa işaretinin yarıçapı da paylaşılan sabitten').toMatch(/radius=\{MASA_ISARET_R\}/);
    // Pad işareti pad'in KENDİ etiketini çizer; tick de aynı alanı okur.
    expect(yorumsuz(oku('src/components/three/Pad.tsx'))).toMatch(/label=\{t\(pad\.label\)\}/);
    expect(yorumsuz(oku(TICK))).toMatch(/padCercevesi\(t\(pad\.label\)\)/);
  });

  it('8 · etiket üreticileri gerçekten seviye/sabit taşır', () => {
    expect(masaEtiketi(0)).toBe('Sv 1');
    expect(masaEtiketi(11)).toBe('Sv 12');
    expect(ETIKET_SERVIS).toBe('Yükselt');
    expect(ETIKET_LAVABO.length).toBeGreaterThan(0);
  });
});

// =============================================================================================
//  3) GEOMETRİ — çerçeve daireden dar, ama yaşanabilir
// =============================================================================================

/** O an sahnede olabilecek TÜM işaretler (en geniş hâlleriyle). */
function tumIsaretler(): Array<{ ad: string; pos: Vec3; c: Cerceve; grup: string }> {
  const hepsi: Array<{ ad: string; pos: Vec3; c: Cerceve; grup: string }> = [];
  for (const pad of economyConfig.pads) {
    const p = LAYOUT.padPos[pad.id];
    if (p) hepsi.push({ ad: `pad:${pad.id}`, pos: p, c: padCercevesi(pad.label), grup: `spot:${p[0]},${p[2]}` });
  }
  for (let i = 0; i < LAYOUT.tables.length; i++) {
    const p = LAYOUT.tables[i].upgradeSpot;
    // En uzun etiket en yüksek seviyede olur — en geniş çerçeveyle sınanır.
    hepsi.push({ ad: `masa${i}`, pos: p, c: masaCercevesi(11), grup: `spot:${p[0]},${p[2]}` });
  }
  for (const a of [1, 2, 3]) {
    const p = servicePlace(a).upgradeSpot;
    hepsi.push({ ad: `servis(a${a})`, pos: p, c: servisCercevesi(), grup: `spot:${p[0]},${p[2]}` });
  }
  hepsi.push({ ad: 'lavabo', pos: LAVABO.spot, c: lavaboCercevesi(), grup: `spot:${LAVABO.spot[0]},${LAVABO.spot[2]}` });
  return hepsi;
}

/**
 * KABUL EDİLEN ÇAKIŞMA YOK. S24'ten beri tek istisna `zone3` pad'i ↔ masa 6'ydı (0,382 × 0,100 br);
 * T7'de (G-82, D-141) pad kapı eksenine (0 · 1,2) taşındı ve liste boşaldı. Yeniden bir istisna
 * eklenecekse gerekçesiyle buraya yazılır — ve 9. denetim onun gerçekten durduğunu da sınar.
 */
const KABUL_EDILEN = new Set<string>();

describe('S24 · çerçeveler çakışmıyor ve içinde durulabiliyor', () => {
  it('9 · aynı anda etkin olabilen iki çerçeve örtüşmez (bilinen tek istisna dışında)', () => {
    const hepsi = tumIsaretler();
    const bulunan: string[] = [];
    for (let i = 0; i < hepsi.length; i++) {
      for (let j = i + 1; j < hepsi.length; j++) {
        const a = hepsi[i], b = hepsi[j];
        // AYNI noktada duran işaretler aynı anda etkin olamaz (pad biter, yükseltme başlar).
        if (a.grup === b.grup) continue;
        const ox = a.c.hw + b.c.hw - Math.abs(a.pos[0] - b.pos[0]);
        const oz = a.c.hh + b.c.hh - Math.abs(a.pos[2] - b.pos[2]);
        if (ox > 0 && oz > 0) bulunan.push(`${a.ad} ↔ ${b.ad}`);
      }
    }
    expect(bulunan.filter((k) => !KABUL_EDILEN.has(k)), 'yeni çakışma doğdu').toEqual([]);
    // İstisna gerçekten duruyor mu — allowlist bayatlarsa da haber versin.
    expect(bulunan).toEqual([...KABUL_EDILEN]);
  });

  it('10 · G-82: zone3 pad çerçevesi iki komşu masa çerçevesine de ≥ 1,5 br boşluk bırakır', () => {
    // Ölçüm (docs/banket-raporu-t7.md Bulgu 1): P2 adayı masa 3 ve masa 6'ya eşit 1,618 br.
    const z = LAYOUT.padPos.zone3;
    const a = padCercevesi(economyConfig.pads.find((p) => p.id === 'zone3')!.label);
    for (const i of [3, 6]) {
      const m = LAYOUT.tables[i].upgradeSpot;
      const b = masaCercevesi(11); // en geniş etiket (eski 10. denetimle aynı)
      const bosluk = Math.max(Math.abs(z[0] - m[0]) - a.hw - b.hw, Math.abs(z[2] - m[2]) - a.hh - b.hh);
      expect(bosluk, `masa ${i}`).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('11 · her çerçevenin içinde oyuncunun DURABİLECEĞİ bir nokta var', () => {
    const tumKatilar = activeSolids(LAYOUT.tables.length, 3);
    const olu: string[] = [];
    for (const m of tumIsaretler()) {
      // MEKÂNSAL TYCOON: her pad, AÇACAĞI objenin tam yerinde durur — yani pad görünürken o
      // obje (ve masaysa taburesi) HENÜZ YOKTUR. Tüm katılarla sınamak, pad'i kendi masasının
      // içine gömülü sayardı ve denetim yalancı kırmızı verirdi.
      const katilar = m.ad.startsWith('pad:')
        ? tumKatilar.filter((k) => Math.hypot(k.c[0] - m.pos[0], k.c[2] - m.pos[2]) > 1.6)
        : tumKatilar;
      let bulundu = false;
      for (let i = -6; i <= 6 && !bulundu; i++) {
        for (let j = -6; j <= 6 && !bulundu; j++) {
          const x = m.pos[0] + (i / 6) * m.c.hw;
          const z = m.pos[2] + (j / 6) * m.c.hh;
          if (!hitsSolid(x, z, katilar, LAYOUT.playerRadius)) bulundu = true;
        }
      }
      if (!bulundu) olu.push(m.ad);
    }
    expect(olu, 'bu işaretlerin içine oyuncu giremiyor').toEqual([]);
  });

  it('12 · çerçeve eski daireden DAR (tur bunu istiyordu) ama oyuncu gövdesinden geniş', () => {
    const masa = masaCercevesi(0);
    const servis = servisCercevesi();
    expect(masa.hw).toBeLessThan(TABLE_UP_RADIUS);
    expect(masa.hh).toBeLessThan(TABLE_UP_RADIUS);
    expect(servis.hh).toBeLessThan(PAD_RADIUS);
    // Oyuncu (r 0,47) her işaretin içine sığmalı — yoksa "çerçeve içinde dur" imkânsız olurdu.
    for (const m of tumIsaretler()) {
      expect(Math.min(m.c.hw, m.c.hh), `${m.ad} oyuncu gövdesinden dar`)
        .toBeGreaterThan(LAYOUT.playerRadius);
    }
  });

  it('13 · markerFrame saf: aynı girdi aynı kutu, yazı uzayınca kutu genişler', () => {
    expect(markerFrame('YÜKSELT', ISARET_R, true)).toEqual(markerFrame('YÜKSELT', ISARET_R, true));
    const kisa = markerFrame('AA', ISARET_R, false);
    const uzun = markerFrame('AAAAAAAAAAAAAAAAAAAA', ISARET_R, false);
    expect(uzun.hw).toBeGreaterThan(kisa.hw);
    expect(uzun.hh).toBe(kisa.hh);
    // Yarı-yükseklik her zaman yarıçapın kendisidir (çizim de bunu varsayıyor).
    expect(markerFrame('X', MASA_ISARET_R, true).hh).toBe(MASA_ISARET_R);
  });

  it('14 · inFrame kenarı DAHİL sayar ve pay ancak istenirse eklenir', () => {
    const c: Cerceve = { hw: 1, hh: 0.5 };
    const spot: Vec3 = [0, 0, 0];
    expect(inFrame(1, 0.5, spot, c)).toBe(true);
    expect(inFrame(1.001, 0, spot, c)).toBe(false);
    expect(inFrame(1.001, 0, spot, c, 0.01)).toBe(true);
    expect(inFrame(0, -0.5, spot, c)).toBe(true);
    // İKİ EKSEN AYRI ÖLÇÜLÜR. Bu satır bir MUTASYON KAÇIŞINDAN doğdu: `inFrame` her iki eksende
    // de `hw` kullanacak şekilde bozulduğunda 14 denetimin 14'ü de yeşil kalmıştı, çünkü hiçbiri
    // hw ≫ hh olan bir kutuda dikey taşmayı sınamıyordu. Gerçek işaretlerde fark büyük
    // (lavabo 1,464 × 0,850): orada z'de taşan nokta x'te hâlâ içeride görünür.
    expect(inFrame(0, 0.8, spot, c), 'z ekseni hh ile ölçülmeli, hw ile değil').toBe(false);
    expect(inFrame(0.9, 0.51, spot, c), 'x içeride ama z dışarıda → dışarıda').toBe(false);
  });
});
