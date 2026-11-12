/**
 * gorev-seridi-g1.test.ts — G1 BEKÇİSİ: görev bitişi TEK yerde konuşur, zoom sırasını bozmaz.
 *
 * NE KORUYOR — ve bu bekçinin varlık sebebi sıradan değil. Görev tamamlanma toast'ının
 * çizilmemesi 2026-09-09'da alınmış bir KULLANICI kararıydı (G-04). Karar HUD'da tek bir
 * `notice.kind !== 'quest'` koşulu olarak duruyordu; `f4b1a52` commit'inde `tsc -b` o koşulu
 * "ölü dal" diye işaretledi (tip o an daralmıştı), dal silindi ve KARAR da onunla gitti.
 * `'quest'` sonradan tipe geri geldi, toast geri geldi, kimse fark etmedi — kullanıcı aynı
 * şeyi 2026-09-16'da ikinci kez bildirdi (G-41/G-43). Ölçüm örtüşmeyi **2,20 sn** olarak
 * saydı (`docs/serit-raporu-g1.md`).
 *
 * Yani buradaki asıl soru "kod çalışıyor mu" değil: **bu karar bir daha sessizce silinebilir mi?**
 * Üç kat bekçi:
 *   1) Kural bir OLUMSUZLAMA değil bir LİSTE (`CIZILEN_TOAST`) — tip daralsa bile ölü dal olmaz.
 *   2) Olay hâlâ ÜRETİLİYOR (tick'e dokunulmadı) ama çizilmiyor — ikisi ayrı ayrı sınanır,
 *      yoksa "toast'ı yok etmek" ile "toast'ı çizmemek" birbirine karışır.
 *   3) HUD'un gerçekten bu kapıdan geçtiği, ADIN varlığıyla değil, o kapı olmadan geçen bir
 *      bildirimin kalmadığıyla sınanır (S23 dersi: import satırındaki ad testi yeşil tutuyordu).
 *
 * Kamera kapısı (G-44) GERÇEK TICK ile sınanır: kutlama penceresinde istenen odak ertelenir,
 * pencere bitince salınır, görev geçişinin kendi odağı (prio 2) ertelenmez.
 *
 * Doğrulaması: `node tools/mutasyon-serit-g1.mjs` (kaynağa kusur geri konur; bu dosya kırmızı
 * yanmazsa o kolun bekçisi yok demektir).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { CIZILEN_TOAST, toastCizilir, type GameNotice } from '../src/game/rules';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame, LAYOUT } from '../src/game/store';
import type { Vec3 } from '../src/game/types';

const oku = (p: string) => readFileSync(p, 'utf8');
const HUD = 'src/components/ui/HUD.tsx';
const HUD_CSS = 'src/components/ui/hud.css';

const bildirim = (kind: GameNotice['kind']): GameNotice => ({ text: 'x', ttl: 3, kind });

beforeEach(() => {
  useGame.getState().hardReset();
});

describe('G1/1 · tebrik TEK yerde: bant', () => {
  it('görev tamamlanma bildirimi ÇİZİLMEZ', () => {
    expect(toastCizilir(bildirim('quest'))).toBe(false);
    expect(CIZILEN_TOAST).not.toContain('quest');
  });

  it('diğer bildirimler çizilmeye devam eder (kapı fazla kapatmıyor)', () => {
    expect(toastCizilir(bildirim('level'))).toBe(true);
    expect(toastCizilir(bildirim('reveal'))).toBe(true);
    // Kapının "hepsini kapat" diye bozulması da bir kusurdur: seviye ve yeni-özellik toast'ları
    // kullanıcının görmek İSTEDİĞİ şeyler, kaldırılan yalnız görev tebriğiydi.
    expect(CIZILEN_TOAST.length).toBeGreaterThanOrEqual(2);
  });

  it('boş bildirim çizilmez (tip koruması da davranış)', () => {
    expect(toastCizilir(null)).toBe(false);
    expect(toastCizilir(undefined)).toBe(false);
  });

  it('OLAY hâlâ üretiliyor — tick sustu diye değil, HUD çizmediği için sessiz', () => {
    // G-04'ün deseni (E3/D-096): sunum katmanı kararı tick'i değiştirmez. Bu ayrım korunmazsa
    // `stats`/devHooks üstünden okuyan testler ve ileride bu olayı dinleyecek her şey sessizce
    // kırılır — ve kırıldığı gün sebebi "toast'ı kaldırmıştık" diye görünmez.
    const qi = C.quests.findIndex((q) => q.target.type === 'pickupTea');
    expect(qi).toBeGreaterThanOrEqual(0);
    const hedef = C.quests[qi].target as { count: number };
    useGame.setState({
      questIndex: qi,
      questBase: 0,
      questPhase: 'active',
      questPhaseT: 0,
      questDoneIndex: -1,
      stats: { ...useGame.getState().stats, teaPickups: hedef.count },
    });
    useGame.getState().tick(0.05);
    const s = useGame.getState();
    expect(s.questIndex, 'görev ilerlemeli').toBe(qi + 1);
    const uretilen = s.notice ?? s.noticeQueue[0] ?? null;
    expect(uretilen, 'tamamlanma olayı hâlâ üretilmeli').not.toBeNull();
    expect(uretilen!.kind).toBe('quest');
    expect(toastCizilir(uretilen), 'üretilen olay çizilmemeli').toBe(false);
  });

  it('HUD bildirimi kapıdan geçirmeden çizmiyor', () => {
    const src = oku(HUD);
    // Ada değil KULLANIMA bakar: `data-testid="notice"` kutusu `Bildirim` bileşeninde; onu çizen
    // HER satır (HUD kökü + mağaza çapası, F4c-4) kapının kendisiyle açılmalı.
    const cizimler = src.split('\n').filter((l) => l.includes('<Bildirim '));
    expect(cizimler.length).toBeGreaterThanOrEqual(2);
    for (const l of cizimler) expect(l).toContain('toastCizilir(notice) &&');
    // Kapısız bir `{notice && (` geri gelirse bu satır yakalar — f4b1a52'nin yaptığı tam buydu.
    expect(src).not.toMatch(/\{notice && \(/);
  });
});

describe('G1/2 · bant içeriğine uyar (G-42)', () => {
  const css = () => oku(HUD_CSS);

  it('bandın yüksekliği SABİT değil, TABAN', () => {
    const blok = css().slice(css().indexOf('\n.band {'), css().indexOf('@keyframes bandIn'));
    expect(blok, 'sabit yükseklik içerik büyüyünce keser').not.toMatch(/^\s*height:\s*\d/m);
    expect(blok).toMatch(/min-height:\s*48px/); // D-175: tek satırlık hap
  });

  it('bandın üst/alt iç boşluğu sıfır değil (yazı kenara yapışmaz)', () => {
    const blok = css().slice(css().indexOf('\n.band {'), css().indexOf('@keyframes bandIn'));
    const m = blok.match(/padding:\s*([\d.]+)px/);
    expect(m, 'bant padding tanımlamalı').not.toBeNull();
    expect(Number(m![1]), 'üst boşluk 0 ise lakap üst kenara yapışır').toBeGreaterThan(0);
  });

  it('bandın üstünde gri iç parlama yok', () => {
    const blok = css().slice(css().indexOf('\n.band {'), css().indexOf('@keyframes bandIn'));
    expect(blok).toMatch(/box-shadow:\s*var\(--k3duz\)/);
    // `--k3duz` gerçekten inset TAŞIMAMALI; yoksa ad değişir, gri kalır.
    const kok = oku('src/index.css');
    const satir = kok.split('\n').find((l) => l.trim().startsWith('--k3duz:')) ?? '';
    expect(satir, '--k3duz tanımlı olmalı').not.toBe('');
    expect(satir, 'düz gölge inset içeremez').not.toContain('inset');
  });

  it('görev başlıkları bant genişliğine sığacak kadar kısa', () => {
    // Ölçüm 50 görevin 1'inde kırpılma buldu (q_z1allL4, 32 px). Sınır karakter sayısıyla
    // değil, ÖLÇÜLEN vakayla kuruldu: kırpılan başlık 31 karakterdi, kalan en uzunu 28.
    const enUzun = Math.max(...C.quests.map((q) => q.title.length));
    expect(enUzun, 'başlık uzarsa telefon portresinde üç noktaya düşer').toBeLessThanOrEqual(29);
  });
});

describe('G1/3 · kutlama sürerken kamera kaçmaz (G-44, gerçek tick)', () => {
  /** Oyuncuyu hiçbir şeyi tetiklemeyen bir köşeye park eder (odak testleri temiz kalsın). */
  const park = () => useGame.setState({ inputKeyboard: [0, 0], inputJoystick: [0, 0] });

  /**
   * ALAN AÇILIŞI panının A/B kurulumu: tek değişken `questPhase`. Oyuncu zone2 pad'inin üstünde,
   * pad 1 ₺ kalmış → bu tick'te dolar, `padFillSystem` prio 3 odak ister.
   */
  const zone2Kurulum = (faz: 'active' | 'completing') => ({
    padsDone: ['table2', 'table3', 'waiter', 'table4', 'waiter2'], // D-142: zone2 ← waiter2
    questIndex: C.quests.length, // hat bitti → görevin kendi tamamlanması fazı oynatmasın
    questDoneIndex: -1,
    questPhase: faz,
    questPhaseT: faz === 'active' ? 0 : 0.5,
    questBase: 0,
    padFills: { zone2: C.pads.find((p) => p.id === 'zone2')!.cost - 1 },
    camFocus: null,
    camBekleyen: null,
    player: [LAYOUT.padPos.zone2[0], 0.6, LAYOUT.padPos.zone2[2]] as Vec3,
  });

  it('kutlama penceresinde GERÇEK bir pan isteği (ALAN AÇILIŞI, prio 3) ertelenir', () => {
    // Kurulum elle `camBekleyen` yazmaz — o, kapının ÇIKTISI. İstek gerçek yoldan gelir.
    //
    // KAYNAK 2026-09-18'de DEĞİŞTİ (G-60): eskiden buradaki pan `revealSystem`den geliyordu, ama
    // artık reveal kutlama penceresinde HİÇ işlenmiyor (toast da biten görevin toast'ına biniyordu,
    // kullanıcı bunu bildirdi) → o yoldan istek gelmez oldu. Kapının hâlâ korumak zorunda olduğu
    // kaynak zaten ölçümün BULDUĞU kaynaktı: `docs/serit-raporu-g1.md` §Bulgular 4 — *"erken olan
    // tek şey ALAN AÇILIŞININ panı"* (`padFillSystem` → `unlockArea` → prio 3). Test o kaynağa
    // taşındı; yani bekçi zayıflamadı, ölçülen vakaya yaklaştı.
    park();
    // Hat BİTMİŞ kurulur (questIndex = length): tek değişken `questPhase` kalsın. Hat bitmemiş
    // olsaydı zone2 açılırken `q_zone2` de tamamlanır, faz kendiliğinden 'completing'e düşer ve
    // iki kol ayırt edilemezdi — aşağıdaki körlük denetimi bunu yakaladı.
    useGame.setState(zone2Kurulum('completing'));
    useGame.getState().addMoney(500);
    useGame.getState().tick(0.05);
    const s = useGame.getState();
    expect(s.padsDone, 'alan gerçekten açılmalı (istek ancak o zaman doğar)').toContain('zone2');
    expect(s.questPhase, 'pencere hâlâ sürüyor olmalı').not.toBe('active');
    expect(s.camBekleyen, 'gerçek bir pan isteği gelmeli ve sıraya girmeli').not.toBeNull();
    expect(s.camFocus, 'kutlama sürerken kamera kaymaz').toBeNull();
  });

  it('kapı OLMASAYDI aynı kurulum kamerayı ANINDA kaydırırdı (ölçüt kör değil)', () => {
    // Aynı kurulum, tek fark: faz 'active'. Kapı yoksa fark da olmaz — bu denetim, yukarıdaki
    // testin "zaten hiçbir pan yoktu" diye boşuna yeşil yanmasını engeller.
    park();
    useGame.setState(zone2Kurulum('active'));
    useGame.getState().addMoney(500);
    useGame.getState().tick(0.05);
    expect(useGame.getState().padsDone).toContain('zone2');
    expect(useGame.getState().camFocus, 'kapı kapalıyken pan anında uygulanmalı').not.toBeNull();
  });

  it('G-60 · kutlama penceresinde reveal ne TOAST üretir ne de TÜKETİLİR', () => {
    // Kullanıcı 2026-09-18: *"uyarı geldiği anda altta biten göreve de var — onların bir
    // sıralaması olması gerekiyor."* Reveal SİLİNMEZ: pencere kapanınca sırası gelir.
    park();
    useGame.setState({
      padsDone: ['table2', 'table3', 'waiter', 'table4', 'zone2'],
      revealSeen: [],
      questIndex: C.quests.length, // hat bitti → hiçbir görev reveal'ı kapsamasın
      questDoneIndex: C.quests.length - 1,
      questPhase: 'completing',
      questPhaseT: 0.5,
      camFocus: null,
      camBekleyen: null,
      notice: null,
      noticeQueue: [],
      player: [0, 0.6, 0] as Vec3,
    });
    useGame.getState().tick(0.05);
    const ara = useGame.getState();
    expect(ara.revealSeen, 'pencerede tüketilmemeli').toEqual([]);
    expect(ara.notice, 'pencerede reveal toastı çıkmamalı').toBeNull();
    expect(ara.camBekleyen, 'reveal hiç istek yapmadığı için kuyruk da boş kalmalı').toBeNull();
    // Pencere kapanınca aynı reveal normal sırasıyla gelir.
    for (let i = 0; i < 40 && useGame.getState().questPhase !== 'active'; i++) useGame.getState().tick(0.1);
    useGame.getState().tick(0.1);
    const son = useGame.getState();
    expect(son.revealSeen.length, 'ertelenen reveal pencere kapanınca işlenmeli').toBeGreaterThan(0);
  });

  it('pencere bitince bekleyen odak SALINIR (pan silinmiyor, erteleniyor)', () => {
    park();
    useGame.setState({
      questPhase: 'gap',
      questPhaseT: 0.05,
      questIndex: C.quests.length, // hat bitti → görevin kendi odağı (prio 2) devreye girmesin
      camFocus: null,
      camBekleyen: { pos: [40, 0, 40], prio: 3 },
      player: [0, 0.6, 0] as Vec3,
    });
    useGame.getState().tick(0.06);
    const s = useGame.getState();
    expect(s.questPhase, 'pencere kapanmalı').toBe('active');
    expect(s.camFocus, 'bekleyen odak salınmalı').not.toBeNull();
    expect(s.camFocus!.pos[0]).toBeCloseTo(40, 3);
    expect(s.camBekleyen, 'salındıktan sonra kuyruk boşalmalı').toBeNull();
  });

  it('görev geçişinin KENDİ odağı (prio 2) ertelenmez', () => {
    // Kapı "her panı beklet" diye bozulursa yeni görevin kendi panı da bir tur gecikirdi ve
    // ölçümdeki 0,00 sn sapma bozulurdu. Prio 2 istisnası kuralın parçası, kaza değil.
    const kaynak = oku('src/game/tick.ts');
    expect(kaynak).toMatch(/camIstek\.prio !== 2/);
  });

  it('bekleyen odak KAYDA yazılmaz (geçici hâl, saveVersion oynamaz)', () => {
    // Kaydedilseydi `saveVersion` + migrasyon borcu doğardı; kamera odağı zaten geçici.
    const kaynak = oku('src/game/store.ts');
    // F4b: kayıt görüntüsü `kayitVerisi`nde kurulur (disk + bulut aynı yoldan).
    const yazma = kaynak.slice(kaynak.indexOf('export function kayitVerisi('));
    const govde = yazma.split(/\n\}\n/)[0];
    expect(govde).toContain('questsDone'); // doğru blok mu — yoksa denetim boşa yeşil yanar
    expect(govde).not.toContain('camBekleyen');
  });
});
