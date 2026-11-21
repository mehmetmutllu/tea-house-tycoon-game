/**
 * BEKÇİ — F4c-3 tabela + kafe adı (D-156). Ölçüm: `docs/tabela-raporu-f4c3.md`. Kullanıcı kararı:
 * tabela "alınlığı dolduran büyük tabela" (K2); üstünde oyuncunun girişte verdiği ad yazar; ad Ayarlar'dan
 * ücretsiz değişir, eski kayıtlara bir kez sorulur, en fazla 20 harf; yükleniyor ekranında oyunun adı.
 *
 * S5 (G-114 sonrası, kullanıcı kararı): alınlık gitti → tabela kapının iki direği arasındaki kemerden sarkar.
 *
 * Neyi korur:
 *  - YER: kemer direklerin hattında ve başlıklarına oturur; levha direklerin arasında, altından insan geçer.
 *  - YAZI: uzun adda harf küçülür, levhadan taşmaz; boy da en de sınırlar (B6).
 *  - AD: temizlenir (boşluk, denetim karakteri, 20 harf), boş → varsayılan, Türkçe büyük harf (i → İ).
 *  - KAYIT: yeni ve ESKİ kayıt "hiç sorulmadı" (null) açılır; verilen ad kayda girer ve geri okunur;
 *    sıfırlama yeniden sordurur.
 *  - SIRA: ad kutusu ekranı kesen kanalların EN ÖNÜNDE (çevrimdışı kazançtan da önce); geri tuşu onu kaydeder.
 *  - AD AYRIMI: yükleniyor ekranı ve sayfa başlığı oyunun adını (Tea House Tycoon) taşır, kafenin adını değil.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame, kayitVerisi } from '../src/game/store';
import { defaultSave, kayitCoz } from '../src/game/save';
import { KAFE_ADI_MAX, KAFE_ADI_VARSAYILAN, OYUN_ADI, kafeAdiOku, kafeAdiTemizle, tabelaYazisi } from '../src/game/kafeAdi';
import { ekranKanali, geriTusu, type EkranGirdisi } from '../src/game/ekranKanali';
import { KEMER, STREET_Z0, TABELA, TABELA_YAZI, tabelaAltY, tabelaFontPx, tabelaUstY } from '../src/components/three/streetLook';
import { DOOR, KAPI_DIREK_H, SOVE_W, WALL_H } from '../src/components/three/wallOlcu';
import { ACTOR_HEIGHT } from '../src/config/actor';
import { WALL_M } from '../src/components/three/wallLook';
import { LAYOUT } from '../src/game/layout';

const mem: Record<string, string> = {};
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
};

describe('tabela geometrisi — kapı direkleri arasındaki kemer (S5, G-114 sonrası)', () => {
  it('kemer kapı direklerinin hattında: z = ön duvar kenarı (Scene: areaBounds[0].maxZ + WALL_M)', () => {
    const frontEdgeZ = LAYOUT.areaBounds[0].maxZ + WALL_M;
    expect(KEMER.z).toBeCloseTo(frontEdgeZ, 6);
    expect(TABELA.z).toBeCloseTo(STREET_Z0, 6);
  });
  it('dikmeler direk başlığının üst yüzünden başlar (KAPI_DIREK_H + 0,05 + 0,1/2)', () => {
    expect(KEMER.y0).toBeCloseTo(KAPI_DIREK_H + 0.05 + 0.1 / 2, 6);
  });
  it('levha iki direğin ARASINDA (direklerin iç yüzünü geçmez)', () => {
    expect(TABELA.w / 2).toBeLessThan(DOOR.half - SOVE_W / 2);
  });
  it('altından insan geçer: levhanın alt ucu 1,75 boyun en az 0,1 üstünde; levha kirişin altında asılı', () => {
    expect(tabelaAltY() - ACTOR_HEIGHT).toBeGreaterThanOrEqual(0.1);
    expect(tabelaUstY()).toBeLessThan(KEMER.y - KEMER.kalin / 2);
    expect(KEMER.y + KEMER.kalin / 2).toBeLessThan(WALL_H); // eski alınlık tavanını aşmaz
  });
  it('yüz kameraya döner: eğim 0 … 0,4 rad (üst kenar geriye)', () => {
    expect(TABELA.egim).toBeGreaterThan(0);
    expect(TABELA.egim).toBeLessThan(0.4);
  });
});

describe('tabela yazısı sığdırma (B6)', () => {
  const W = 1024;
  const H = Math.round((W * TABELA.h) / TABELA.w);
  // 100 px fontta büyük harf 69 px; yazı eni harfin 17,14 katı/100 px ölçeğinde.
  const harf100 = 69;
  const en = (n: number) => n * 58; // karakter başına ~58 px (100 px font)
  it('kısa adda harf levha boyunun %42,7si (boydan sınırlı)', () => {
    const px = tabelaFontPx(harf100, en(8), W, H);
    expect((harf100 * px) / 100).toBeCloseTo(TABELA_YAZI.harfBoy * H, 5);
    expect((en(8) * px) / 100).toBeLessThanOrEqual(TABELA_YAZI.doluluk * W + 1e-9);
  });
  it('20 harfte harf küçülür, yazı levhanın %78,7sini aşmaz (enden sınırlı)', () => {
    const kisa = tabelaFontPx(harf100, en(8), W, H);
    const uzun = tabelaFontPx(harf100, en(KAFE_ADI_MAX), W, H);
    expect(uzun).toBeLessThan(kisa);
    expect((en(KAFE_ADI_MAX) * uzun) / 100).toBeCloseTo(TABELA_YAZI.doluluk * W, 5);
  });
});

describe('kafe adı kuralları', () => {
  it('boşlukları toplar, uçları kırpar, denetim karakterini atar', () => {
    expect(kafeAdiTemizle('  Çınar   Kahvesi  ')).toBe('Çınar Kahvesi');
    expect(kafeAdiTemizle('Çınar\u0000​Kahve')).toBe('ÇınarKahve');
    expect(kafeAdiTemizle('   ')).toBe('');
  });
  it('en fazla 20 harf (Türkçe harf tek sayılır)', () => {
    expect(Array.from(kafeAdiTemizle('ÇĞİÖŞÜ'.repeat(5)))).toHaveLength(KAFE_ADI_MAX);
    expect(kafeAdiTemizle('a'.repeat(19) + ' b')).toBe('a'.repeat(19));
  });
  it('tabela Türkçe büyük harfle yazar; ad yoksa varsayılan', () => {
    expect(tabelaYazisi('çınar kahvesi')).toBe('ÇINAR KAHVESİ');
    expect(tabelaYazisi(null)).toBe('ÇAY OCAĞI');
    expect(tabelaYazisi('')).toBe('ÇAY OCAĞI');
  });
  it('kayıttan okuma: dize değilse hiç sorulmadı (null), boş dize varsayılan', () => {
    expect(kafeAdiOku(undefined)).toBeNull();
    expect(kafeAdiOku(42)).toBeNull();
    expect(kafeAdiOku('')).toBe(KAFE_ADI_VARSAYILAN);
    expect(kafeAdiOku('  Ada  Çay ')).toBe('Ada Çay');
  });
});

describe('kafe adı kayıtta', () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
    useGame.getState().hardReset();
  });
  it('yeni oyun: hiç sorulmadı', () => {
    expect(useGame.getState().kafeAdi).toBeNull();
    expect(defaultSave().kafeAdi).toBeNull();
  });
  it('ESKİ kayıt (alan yok) hiç sorulmamış açılır → kutu bir kez çıkar', () => {
    const eski = { ...defaultSave() } as Record<string, unknown>;
    delete eski.kafeAdi;
    expect(kayitCoz(eski).data.kafeAdi).toBeNull();
  });
  it('verilen ad temizlenip kayda girer ve geri okunur', () => {
    useGame.getState().kafeAdiKoy('  Köprübaşı   Çay Evi ');
    expect(useGame.getState().kafeAdi).toBe('Köprübaşı Çay Evi');
    const v = kayitVerisi(useGame.getState());
    expect(v.kafeAdi).toBe('Köprübaşı Çay Evi');
    expect(kayitCoz(JSON.parse(JSON.stringify(v))).data.kafeAdi).toBe('Köprübaşı Çay Evi');
    useGame.getState().init();
    expect(useGame.getState().kafeAdi).toBe('Köprübaşı Çay Evi');
  });
  it('boş ad varsayılanı kaydeder (kutu bir daha çıkmaz)', () => {
    useGame.getState().kafeAdiKoy('   ');
    expect(useGame.getState().kafeAdi).toBe(KAFE_ADI_VARSAYILAN);
  });
  it('sıfırlama adı siler → yeniden sorulur', () => {
    useGame.getState().kafeAdiKoy('Ada Çay');
    useGame.getState().hardReset();
    expect(useGame.getState().kafeAdi).toBeNull();
  });
});

describe('ekran sırası', () => {
  const bos: EkranGirdisi = {
    panelAcik: false, bildirimVar: false, gecisPenceresi: false, cevrimdisiVar: false, ustaVar: false,
    bulasikOgretmeHazir: false, karakterIpucuHazir: false, tepsiIpucuHazir: false,
  };
  it('ad kutusu her şeyin önünde — çevrimdışı kazanç ve Usta bile bekler', () => {
    expect(ekranKanali({ ...bos, kafeAdiSorulacak: true, cevrimdisiVar: true, ustaVar: true, seviyeVar: true })).toBe('kafe-adi');
    expect(ekranKanali({ ...bos, kafeAdiSorulacak: false, cevrimdisiVar: true })).toBe('cevrimdisi');
  });
  it('geri tuşu ad kutusunu kaydeder (panelden önce)', () => {
    expect(geriTusu('kafe-adi', true)).toBe('kafe-adi');
  });
});

describe('oyunun adı ile kafenin adı ayrı', () => {
  it('yükleniyor ekranı ve sayfa başlığı oyunun adını taşır', () => {
    expect(OYUN_ADI).toBe('Tea House Tycoon');
    const splash = readFileSync('src/components/ui/SplashScreen.tsx', 'utf8');
    expect(splash).toContain('{OYUN_ADI}');
    expect(splash).not.toContain('Köşe Kıraathanesi');
    expect(readFileSync('index.html', 'utf8')).toContain('<title>Tea House Tycoon</title>');
  });
  it('tabela kafenin adını store\'dan okur (sabit yazı yok)', () => {
    const t = readFileSync('src/components/three/Tabela.tsx', 'utf8');
    expect(t).toContain('tabelaYazisi(kafeAdi)');
    const scene = readFileSync('src/components/three/Scene.tsx', 'utf8');
    expect(scene).toContain('<Tabela x={e[0]} />');
    expect(scene).not.toMatch(/args=\{\[3\.4, 0\.34/);
  });
});
