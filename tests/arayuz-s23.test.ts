/**
 * arayuz-s23.test.ts — S23 / D-120 BEKÇİSİ: ok · karakter paneli · panel doluluğu.
 *
 * NE BEKÇİLİYOR. S23 ölçümü üç kusuru sayıya çevirdi ve üçü de **sessizce geri gelebilir**:
 *
 *  §O  Okun ucu kendi ayrılan bloğundan %63 genişti (0,554 r çizilirken 0,340 r ayrılmıştı).
 *      Kusurun kaynağı çizilen enin AYRI BİR SAYI olmasıydı — `circleGeometry(r·0,32, 3)`
 *      içindeki √3 çarpanı hiçbir yerde yazmıyordu. Yapısal kapatma: çizilen en artık
 *      `OK_GENIS`in KENDİSİ. Buradaki denetimler o bağın kopmasını kırmızıya çevirir; ayrıca
 *      okun yerleşimini `GroundMarker`ın kendi formülüyle yeniden kurup üç açıklığı da
 *      yazılı hedeflerine karşı sınar (kenar payı · yazı boşluğu · parantez).
 *
 *  §K  Panelin çaycısı oyunun çaycısı değildi: dört kimlik işaretinin dördü de tersti.
 *      Kök neden panelin gövdeyi KENDİ çizmesiydi (`OwnerBody`), yani iki ayrı doğru vardı.
 *      Bekçi tek doğruyu denetler: panel `KayActor` kullanır, ilkel gövdeyi ve kapsül
 *      önizlemeyi KULLANMAZ. Kimlik böylece bir daha ayrışamaz.
 *
 *  §E  Beş ekranın üçünde içerik ekranın yarısında bitiyordu. İki yapısal sebep vardı ve
 *      ikisi de burada bekçili: karakter kartı gövdenin boyunu almıyordu (vitrin artan yeri
 *      yiyemiyordu) ve mağaza her açılışta KİLİTLİ sekmede açılıyordu.
 *
 * SAYILAR NEREDEN: `docs/arayuz-raporu-s23.md` §Bulgular · ham `docs/olcum-arayuz-s23.txt`
 * (tam koşu damgalı). Test mümkün olan her yerde SAYIYI değil KURALI bekçiliyor (S20'nin dersi).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HARF_EM,
  ETIKET_PUNTO,
  OK_GENIS,
  OK_BOSLUK,
  KENAR_PAYI,
  OK_YUKSEKLIK_ORAN,
  OK_KALINLIK_ORAN,
  CERCEVE,
  ZEMIN_ICE,
} from '../src/components/three/GroundMarker';

const oku = (y: string) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const MARKER = oku('src/components/three/GroundMarker.tsx');
const PANEL = oku('src/components/ui/CharacterPanel.tsx');
const HUD = oku('src/components/ui/HUD.tsx');
const CSS = oku('src/index.css');

/**
 * İŞARETİN YERLEŞİMİ — `GroundMarker`ın kendi formülü (bileşen JSX olduğu için node'da
 * çağrılamıyor; formül burada AYNI sabitlerden kurulur, sabitler kopyalanmaz).
 */
function yerlesim(label: string, r: number) {
  const punto = r * ETIKET_PUNTO;
  const yaziGen = label.length * HARF_EM * punto;
  const okBlok = (OK_GENIS + OK_BOSLUK) * r;
  const hw = Math.max(r * 1.05, (okBlok + yaziGen) / 2 + KENAR_PAYI * r);
  const okX = -hw + KENAR_PAYI * r + (OK_GENIS * r) / 2;
  const yaziSol = -hw + KENAR_PAYI * r + okBlok;
  return { hw, okX, yaziSol, okEn: OK_GENIS * r, cerceveSol: -hw };
}

/** Oyunda gerçekten çizilen ok taşıyan işaretler (`Scene.tsx` çağrı yerleri). */
const ISARETLER = [
  { label: 'Yükselt', r: 0.85 }, // servis noktası (varsayılan yarıçap)
  { label: 'Sv 2', r: 0.6 }, // masa yükseltme noktası
  { label: 'Yükselt', r: 0.6 }, // Usta noktası
];

describe('§O — yükseltme oku kendi bloğunun içinde', () => {
  it('çizilen okun eni AYRI bir sayı değil, OK_GENIS’in kendisi', () => {
    // Kusurun kökü buydu: iki ayrı sayı vardı ve biri ölçülmüyordu.
    expect(MARKER).toMatch(/okShape\(OK_GENIS \* r\)/);
    // Eski üçgen uç geri gelirse kırmızı yanar. Yasak olan `circleGeometry` DEĞİL — para pulu
    // meşru bir daire (20 kenar). Yasak olan ÜÇ kenarlı hâli: gerçek eni yarıçapın √3 katıdır
    // ve o çarpan hiçbir yerde yazmaz, yani kusur aynen geri gelir.
    expect(MARKER).not.toMatch(/circleGeometry args=\{\[[^\]]*,\s*3\s*\]\}/);
  });

  it('ok tek chevron mesh’i — gövde + uç ikilisi geri gelmedi (O7)', () => {
    expect(MARKER).toMatch(/name="ok-uc"/);
    expect(MARKER).not.toMatch(/name="ok-govde"/);
    expect(MARKER).toMatch(/function okShape/);
  });

  it('chevron kendi orijininde ORTALI — tabandan yukarı büyümüyor', () => {
    // Eski ok tabandan kuruluyordu ve üst parantezin bandına 0,006 birim kalıyordu.
    expect(MARKER).toMatch(/const alt = -h \/ 2;/);
  });

  it('okun eni ayrılan bloğu AŞMIYOR (ölçümdeki 0,554 r > 0,340 r kusuru)', () => {
    for (const { label, r } of ISARETLER) {
      const y = yerlesim(label, r);
      expect(y.okEn / r).toBeCloseTo(OK_GENIS, 6);
      expect(y.okEn / r).toBeLessThanOrEqual(OK_GENIS + 1e-9);
    }
  });

  it('sol kenar payı YAZILI hedefinde (0,073 r değil 0,180 r)', () => {
    for (const { label, r } of ISARETLER) {
      const y = yerlesim(label, r);
      const solPay = (y.okX - y.okEn / 2 - y.cerceveSol) / r;
      expect(solPay).toBeCloseTo(KENAR_PAYI, 6);
    }
  });

  it('yazıya kalan açıklık YAZILI hedefinde (0,053 r değil 0,160 r)', () => {
    for (const { label, r } of ISARETLER) {
      const y = yerlesim(label, r);
      const aciklik = (y.yaziSol - (y.okX + y.okEn / 2)) / r;
      expect(aciklik).toBeCloseTo(OK_BOSLUK, 6);
    }
  });

  it('kenar payı kenarlık kalınlığından GENİŞ — ok kenarlığın sütununa girmiyor', () => {
    // D-176: köşe parantezi yerine kesintisiz kenarlık; kalınlığı `hh * CERCEVE`.
    expect(KENAR_PAYI).toBeGreaterThan(CERCEVE);
  });

  it('ok, üst kenarlığın bandına hiç girmiyor', () => {
    // D-176: kenarlık çerçevenin üst kenarından `CERCEVE` kadar içeri iner (yerel birim: hh = r).
    // Ok etiketle aynı bantta (-0,3 r merkezli) ve boyu OK_GENIS * OK_YUKSEKLIK_ORAN.
    for (const { label } of ISARETLER) {
      void label;
      const okBoy = OK_GENIS * OK_YUKSEKLIK_ORAN; // r biriminde
      const okUst = 0.3 + okBoy / 2; // merkez -0,3 r, yukarı doğru
      const parantezAlt = 1 - CERCEVE; // üst kenarlık buraya kadar iniyor
      expect(okUst).toBeLessThan(parantezAlt);
      // Eşik UYDURULMUYOR: işaretin kendi tasarımındaki EN KÜÇÜK bilinçli açıklık `ZEMIN_ICE`
      // (iç zeminin parantez çizgilerinden kaçtığı pay). Ok en az o kadar uzakta duracak —
      // ölçülen kusur 0,010 r idi, yani eşiğin beşte biri.
      expect(parantezAlt - okUst).toBeGreaterThan(ZEMIN_ICE);
      // Çizgi kalınlığı da bloğun içinde kalmalı: chevron'un kolu enin yarısını geçemez.
      expect(OK_KALINLIK_ORAN).toBeLessThan(0.5);
    }
  });
});

describe('D-176 — zemin işareti: kesintisiz beyaz kenarlık', () => {
  it('köşe parantezi yok, tek parça kenarlık var', () => {
    expect(MARKER).toMatch(/name="kenar"/);
    expect(MARKER).toMatch(/halkaShape\(2 \* hw, 2 \* hh/);
    expect(MARKER).not.toMatch(/parantez\$\{i\}|bracketShape/);
  });
  it('para pulu saydam geçişte çizilir (saydam zeminin altında kalıp solmaz)', () => {
    expect(MARKER).toMatch(/color="#ffc933" transparent/);
    expect(MARKER).toMatch(/color="#b87400" transparent/);
  });
});

describe('§K — karakter paneli oyunun gövdesini gösteriyor', () => {
  it('panel KayActor kullanıyor; ilkel gövde ve kapsül önizleme kalktı', () => {
    // KULLANIM denetlenir, İMPORT değil. Mutasyon turu bunu öğretti: `toMatch(/FloorPatch/)`
    // kaldırılmış bir bileşende bile yeşil kalıyordu, çünkü adı import satırında duruyor.
    expect(PANEL).toMatch(/<KayActor[\s/>]/);
    expect(PANEL).not.toMatch(/<OwnerBody/);
    expect(PANEL).not.toMatch(/capsuleGeometry/);
  });

  it('rol eşlemesi elle yazılmıyor — kind doğrudan KayActor’e veriliyor', () => {
    // Kimlik işaretleri (kasket/önlük/havlu/sıvalı kol) `KAY_KIYAFET`ten gelir; panel
    // kendi listesini tutarsa dört işaret yine ayrışabilir.
    for (const kind of ['owner', 'waiter', 'dishwasher']) {
      expect(PANEL).toMatch(new RegExp(`kind="${kind}"`));
    }
    expect(PANEL).not.toMatch(/PALETTE\.(foodApron|foodCap|toast)/);
  });

  it('vitrin salon dilimi — karakter boşlukta değil zeminde (K3)', () => {
    expect(PANEL).toMatch(/<FloorPatch[\s/>]/);
    expect(PANEL).toMatch(/<WallBack[\s/>]/);
    // Kamera oyunun kamerası; eski fov 36 duruşu geri gelmesin.
    expect(PANEL).toMatch(/<FixedCam[\s/>]/);
    expect(PANEL).not.toMatch(/fov: 36/);
  });

  it('tepsi ELE takılı kalıyor (S16 · D-114 bozulmadı)', () => {
    expect(PANEL).toMatch(/<KayActor[^>]*\stasiyor/);
    // Çapa ELLE yazılmış bir koordinata dönerse kırmızı yanar (tepsi ellerin 29 cm üstünde
    // kalıyordu — S16 ölçümü). Burada da kullanım denetlenir, import değil.
    // F4c: çapa artık `tepsiKaymasi` (askılı tepsi sarkar) — o da `KAY_TEPSI_KAYMA`dan türer.
    expect(PANEL).toMatch(/position=\{tepsiKaymasi\(/);
    expect(oku('src/components/three/Player.tsx')).toMatch(/function tepsiKaymasi[\s\S]*?return KAY_TEPSI_KAYMA;/);
  });
});

describe('§E — paneller ekranı dolduruyor', () => {
  it('karakter kartı gövdenin boyunu alıyor ve vitrin artan yeri yiyor', () => {
    const kart = CSS.match(/\.char-card \{[^}]*\}/)?.[0] ?? '';
    expect(kart).toMatch(/flex: 1/);
    expect(kart).toMatch(/flex-direction: column/);
    const tuval = CSS.match(/\.char-canvas \{[^}]*\}/)?.[0] ?? '';
    expect(tuval).toMatch(/flex: 1 1 auto/);
    // Sabit yükseklik geri gelirse vitrin yine 353 px'lik kuyruğu bırakır.
    expect(tuval).not.toMatch(/\n\s*height:/);
  });

  it('mağaza satılabilir bir sekmede açılıyor (kilitli sekmede değil)', () => {
    // F4c: Kıyafet sekmesi oyunun her anında satılabilir (klasikten ötesi 💎 ile) — hiç kilitli değil.
    expect(HUD).toMatch(/useState<Sekme>\('outfit'\)/);
  });

  it('kilitli kart kendi boyunda — gövdeye yayılıp iç delik açmıyor', () => {
    const kilit = CSS.match(/\.shop-locked \{[^}]*\}/)?.[0] ?? '';
    expect(kilit).toMatch(/flex: none/);
  });

  it('ayarlar ekranının altı künye bloğuyla doluyor ve yıkıcı düğme en sonda', () => {
    expect(HUD).toMatch(/data-testid="kunye"/);
    expect(HUD).toMatch(/SAVE_VERSION/);
    // Sıra: künye → not → sıfırla. Yıkıcı düğme anahtarların dibinde durmuyor.
    const kunyeIdx = HUD.indexOf('data-testid="kunye"');
    const resetIdx = HUD.indexOf('data-testid="reset"');
    // Anahtar kümesinin SONU: FPS satırı R3'te kalktı (D-128), sıranın çapası artık gölge satırı.
    const anahtarIdx = HUD.indexOf('testid="set-golge"');
    expect(kunyeIdx).toBeGreaterThan(anahtarIdx);
    expect(resetIdx).toBeGreaterThan(kunyeIdx);
  });
});
