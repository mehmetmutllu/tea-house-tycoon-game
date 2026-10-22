/**
 * BEKÇİ — iOS izi (App Store önce; Android sonra). Platforma bağlı her seçim `platform.ts`ten türer:
 *  - Play Games yalnız Android'de: iOS'ta ve tarayıcıda eklenti HİÇ çağrılmaz, Ayarlar'da bölüm/metin yok.
 *  - Reklam birimi platforma göre; `test` açıkken Google test birimi, kapalıyken gerçek birim.
 *  - iOS'ta izin sırası: UMP (rıza) → ATT (ayrı deneme) → `canRequestAds` ise SDK → yükleme. Android'de ATT yok.
 *  - RevenueCat anahtarı platforma göre; o platformun anahtarı yoksa cihazda satın alma kapalı.
 *  - Xcode projesi: AdMob uygulama kimliği, ATT metni (tr/en), SKAdNetwork, sürüm package.json'dan.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  platform: 'web',
  yerliCagri: [] as string[],
  admob: [] as string[],
  adId: [] as string[],
  att: 'notDetermined',
  rcAnahtar: [] as string[],
  tercih: 'REQUIRED',
  rizaHata: false,
  reklamIzni: true,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => h.platform,
    isNativePlatform: () => h.platform !== 'web',
  },
  registerPlugin: () =>
    new Proxy({}, {
      get: (_t, ad: string) => async () => {
        h.yerliCagri.push(ad);
        return { kullanilabilir: false, girisli: false };
      },
    }),
}));

vi.mock('@capacitor-community/admob', () => {
  const kaydet = (ad: string, donus: unknown = undefined) => async (o?: { adId?: string }) => {
    h.admob.push(ad);
    if (o?.adId) h.adId.push(o.adId);
    return donus;
  };
  const bilgi = () => ({
    status: 'REQUIRED', isConsentFormAvailable: true, privacyOptionsRequirementStatus: h.tercih, canRequestAds: h.reklamIzni,
  });
  return {
    AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
    InterstitialAdPluginEvents: { Dismissed: 'd', FailedToShow: 'f', Showed: 's' },
    RewardAdPluginEvents: { Dismissed: 'd', FailedToShow: 'f', Showed: 's', Rewarded: 'r' },
    AdMob: {
      initialize: kaydet('initialize'),
      requestConsentInfo: async () => {
        h.admob.push('requestConsentInfo');
        if (h.rizaHata) throw new Error('ağ yok');
        return bilgi();
      },
      showPrivacyOptionsForm: kaydet('showPrivacyOptionsForm'),
      showConsentForm: async () => { h.admob.push('showConsentForm'); return bilgi(); },
      trackingAuthorizationStatus: async () => {
        h.admob.push('trackingAuthorizationStatus');
        return { status: h.att };
      },
      requestTrackingAuthorization: kaydet('requestTrackingAuthorization'),
      prepareInterstitial: kaydet('prepareInterstitial'),
      prepareRewardVideoAd: kaydet('prepareRewardVideoAd'),
      addListener: async () => ({ remove: async () => {} }),
    },
  };
});

vi.mock('@revenuecat/purchases-capacitor', () => ({
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
  Purchases: {
    configure: async (o: { apiKey: string }) => { h.rcAnahtar.push(o.apiKey); },
    getProducts: async () => ({ products: [] }),
    getCustomerInfo: async () => ({ customerInfo: { entitlements: { active: {} }, nonSubscriptionTransactions: [] } }),
    // Sprint A (P2): kalıcı kimlik + dinleyici + Android sessiz eşitleme.
    logIn: async () => ({}),
    getAppUserID: async () => ({ appUserID: 'test-kimlik' }),
    syncPurchases: async () => {},
    addCustomerInfoUpdateListener: async () => 'dinleyici',
  },
}));

import { magazaHesabi, magazaPlatformu, playGamesVar } from '../src/game/platform';
import { bulutBaslat, playGamesDurumu, sahteArkaUc as sahteBulut } from '../src/game/bulut';
import { reklamBaslat, reklamDurumu, reklamTercihleriGerekli, reklamTercihleriniAc, reklamYenidenKur } from '../src/game/ads';
import { magazaHazir, satinAlmaBaslat } from '../src/game/iap';
import { adsConfig } from '../src/config/ads.config';
import { iapConfig } from '../src/config/iap.config';
import { defaultSave } from '../src/game/save';
import { iosSurumu, spmYollari } from '../tools/ios-duzelt.mjs';

const oku = (p: string) => readFileSync(p, 'utf8');
const kanca = { yerel: () => defaultSave(), yukle: () => {} };

beforeEach(() => {
  h.yerliCagri = [];
  h.admob = [];
  h.adId = [];
  h.att = 'notDetermined';
  h.rcAnahtar = [];
  h.tercih = 'REQUIRED';
  h.rizaHata = false;
  h.reklamIzni = true;
});

describe('platform tek kaynak', () => {
  it('mağaza platformu: android · ios · tarayıcı = null', () => {
    expect(magazaPlatformu('android')).toBe('android');
    expect(magazaPlatformu('ios')).toBe('ios');
    expect(magazaPlatformu('web')).toBeNull();
  });
  it('satın alım hesabı metni platforma göre: iOS’ta "Google" yazmaz (App Store red riski)', () => {
    expect(magazaHesabi('ios')).toBe('Apple hesabında');
    expect(magazaHesabi('android')).toBe('Google hesabında');
    expect(magazaHesabi('web')).toBe('mağaza hesabında');
    const hud = readFileSync('src/components/ui/HUD.tsx', 'utf8');
    expect(hud).not.toMatch(/Google hesab/);
  });
  it('Play Games yalnız Android', () => {
    expect(playGamesVar('android')).toBe(true);
    expect(playGamesVar('ios')).toBe(false);
    expect(playGamesVar('web')).toBe(false);
  });
});

describe('Play Games: iOS ve tarayıcıda kapalı', () => {
  it('iOS: Play Games eklentisine tek çağrı yok (yalnız iCloud KVS sorulur, Sprint A), katman kullanılamaz', async () => {
    h.platform = 'ios';
    await bulutBaslat(kanca);
    expect(h.yerliCagri).toEqual(['varMi']);
    expect(playGamesDurumu().kullanilabilir).toBe(false);
  });
  it('tarayıcı: sahte bulut da kurulmaz — Ayarlar\'da bölüm görünmez', async () => {
    h.platform = 'web';
    await bulutBaslat(kanca);
    expect(h.yerliCagri).toEqual([]);
    expect(playGamesDurumu().kullanilabilir).toBe(false);
  });
  it('Android: yerli eklenti sorulur (değişmedi)', async () => {
    h.platform = 'android';
    await bulutBaslat(kanca);
    expect(h.yerliCagri).toContain('durum');
  });
  it('test arka ucu (`ozel`) her platformda çalışır', async () => {
    h.platform = 'ios';
    await bulutBaslat(kanca, sahteBulut({ girisli: false }));
    expect(playGamesDurumu().kullanilabilir).toBe(true);
  });
  it('Ayarlar metinleri bulut durumundan türer (iOS\'ta "Play Games"/"bulut" yazmaz)', () => {
    const hud = oku('src/components/ui/HUD.tsx');
    expect(hud).toContain('const bulutVar = playGamesDurumu().kullanilabilir;');
    expect(hud).toMatch(/\{bulutVar\s*\n?\s*\? t\('Kayıt bu cihazda tutulur; Play Games\\'e/);
    expect(hud).toContain("{bulutVar ? ` ${t('(bulut yedeği dahil)')}` : ''}");
  });
});

describe('reklam: platforma göre birim + iOS izin sırası', () => {
  const testKipi = adsConfig.test;
  afterEach(() => { (adsConfig as { test: boolean }).test = testKipi; });

  it('iOS: rıza → form → ATT → SDK başlatma → yükleme; test kipinde Google iOS test birimleri', async () => {
    h.platform = 'ios';
    await reklamBaslat();
    expect(reklamDurumu().kuruldu).toBe(true);
    const i = (ad: string) => h.admob.indexOf(ad);
    expect(i('requestConsentInfo')).toBe(0);
    expect(i('showConsentForm')).toBeGreaterThan(i('requestConsentInfo'));
    expect(i('requestTrackingAuthorization')).toBeGreaterThan(i('showConsentForm'));
    expect(i('initialize')).toBeGreaterThan(i('requestTrackingAuthorization'));
    expect(i('prepareInterstitial')).toBeGreaterThan(i('initialize'));
    expect(h.adId.sort()).toEqual(['ca-app-pub-3940256099942544/1712485313', 'ca-app-pub-3940256099942544/4411468910']);
  });
  it('iOS: rıza bilgisi alınamazsa ATT YİNE sorulur ama SDK başlatılmaz; ön plana dönüşte yeniden kurulur', async () => {
    h.platform = 'ios';
    h.rizaHata = true;
    await reklamBaslat();
    expect(h.admob).toContain('requestTrackingAuthorization');
    expect(h.admob).not.toContain('initialize');
    expect(h.admob).not.toContain('prepareInterstitial');
    expect(reklamDurumu().kuruldu).toBe(false);
    h.rizaHata = false;
    expect(await reklamYenidenKur()).toBe(true);
    expect(h.admob).toContain('initialize');
    expect(reklamDurumu().kuruldu).toBe(true);
  });
  it('rıza reklama izin vermiyorsa (canRequestAds false) SDK başlatılmaz, reklam yüklenmez', async () => {
    h.platform = 'android';
    h.reklamIzni = false;
    await reklamBaslat();
    expect(h.admob).toContain('requestConsentInfo');
    expect(h.admob).not.toContain('initialize');
    expect(h.adId).toEqual([]);
    expect(reklamDurumu().kuruldu).toBe(false);
  });
  it('iOS: ATT kararı verilmişse pencere yeniden istenmez', async () => {
    h.platform = 'ios';
    h.att = 'denied';
    await reklamBaslat();
    expect(h.admob).not.toContain('requestTrackingAuthorization');
    expect(reklamDurumu().kuruldu).toBe(true);
  });
  it('iOS: test kipi kapalıyken GERÇEK iOS birimleri', async () => {
    h.platform = 'ios';
    (adsConfig as { test: boolean }).test = false;
    await reklamBaslat();
    expect(h.adId.sort()).toEqual([adsConfig.birim.ios.odullu, adsConfig.birim.ios.gecisli].sort());
    expect(adsConfig.birim.ios.gecisli).toMatch(/^ca-app-pub-9532352817217002\//);
  });
  it('Android: ATT yok, Android birimleri', async () => {
    h.platform = 'android';
    await reklamBaslat();
    expect(h.admob.some((a) => a.startsWith('tracking') || a === 'requestTrackingAuthorization')).toBe(false);
    expect(h.adId.sort()).toEqual([adsConfig.testBirim.android.gecisli, adsConfig.testBirim.android.odullu].sort());
  });
  it('yerel/test derlemesinde reklam HEP test kipinde — gerçek birim yalnız VITE_REKLAM=gercek', () => {
    expect(testKipi).toBe(true);
    expect(oku('codemagic.yaml')).toMatch(/VITE_REKLAM: "gercek"/);
    expect(oku('codemagic.yaml')).toContain('test:!1,birim');
  });
  it('Y-06: UMP gizlilik seçeneği isterse (AB/UK) Ayarlar’da "Reklam tercihleri" açılır ve formu gösterir', async () => {
    h.platform = 'ios';
    h.tercih = 'REQUIRED';
    await reklamBaslat();
    expect(reklamTercihleriGerekli()).toBe(true);
    await reklamTercihleriniAc();
    expect(h.admob).toContain('showPrivacyOptionsForm');
  });
  it('Y-06: UMP istemezse "Reklam tercihleri" görünmez; tarayıcıda da görünmez', async () => {
    h.platform = 'ios';
    h.tercih = 'NOT_REQUIRED';
    await reklamBaslat();
    expect(reklamTercihleriGerekli()).toBe(false);
    h.platform = 'web';
    h.tercih = 'REQUIRED';
    await reklamBaslat();
    expect(reklamTercihleriGerekli()).toBe(false);
  });
  it('tarayıcı: AdMob hiç çağrılmaz (sahte arka uç)', async () => {
    h.platform = 'web';
    await reklamBaslat();
    expect(h.admob).toEqual([]);
    expect(reklamDurumu().kuruldu).toBe(true);
  });
});

describe('satın alma: RevenueCat anahtarı platforma göre', () => {
  const asil = { ...iapConfig.revenueCatAnahtar };
  afterEach(() => Object.assign(iapConfig.revenueCatAnahtar, asil));

  it('iOS: iOS anahtarıyla kurulur (Android anahtarı değil)', async () => {
    h.platform = 'ios';
    Object.assign(iapConfig.revenueCatAnahtar, { android: 'goog_x', ios: 'appl_x' });
    await satinAlmaBaslat();
    expect(h.rcAnahtar).toEqual(['appl_x']);
    expect(magazaHazir()).toBe(true);
  });
  it('Android: Android anahtarı', async () => {
    h.platform = 'android';
    Object.assign(iapConfig.revenueCatAnahtar, { android: 'goog_x', ios: 'appl_x' });
    await satinAlmaBaslat();
    expect(h.rcAnahtar).toEqual(['goog_x']);
  });
  it('iOS anahtarı yoksa cihazda KAPALI — Android anahtarına düşmez, sahteye düşmez', async () => {
    h.platform = 'ios';
    Object.assign(iapConfig.revenueCatAnahtar, { android: 'goog_x', ios: null });
    await satinAlmaBaslat();
    expect(h.rcAnahtar).toEqual([]);
    expect(magazaHazir()).toBe(false);
  });
  it('iki platformun anahtarı da girildi, her biri kendi önekiyle (D-161)', () => {
    expect(asil.android).toMatch(/^goog_/);
    expect(asil.ios).toMatch(/^appl_/);
  });
});

describe('Xcode projesi', () => {
  const plist = oku('ios/App/App/Info.plist');
  const pbx = oku('ios/App/App.xcodeproj/project.pbxproj');
  it('AdMob iOS uygulama kimliği + ATT metni + SKAdNetwork', () => {
    expect(plist).toMatch(/<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-9532352817217002~4395129824<\/string>/);
    expect(plist).toContain('<key>NSUserTrackingUsageDescription</key>');
    expect(plist.match(/<key>SKAdNetworkIdentifier<\/key>/g)?.length ?? 0).toBeGreaterThanOrEqual(40);
    expect(plist).toContain('<string>cstr6suwn9.skadnetwork</string>');
    expect(plist).not.toContain('<key>GADIsAdManagerApp</key>');
  });
  it('mediation adaptörleri (Liftoff + Unity) iki platformda bağlı, SKAdNetwork listeleri birleşik', () => {
    // Adaptör projeden düşerse derleme yine geçer ama ağ hiç teklif vermez — sessiz gelir kaybı.
    for (const urun of ['LiftoffMonetizeAdapterTarget', 'UnityAdapterTarget']) {
      expect(pbx).toContain(`${urun} in Frameworks */,`);
      expect(pbx).toContain(`productName = ${urun};`);
    }
    const gradle = oku('android/app/build.gradle');
    expect(gradle).toMatch(/implementation "com\.google\.ads\.mediation:vungle:[\d.]+"/);
    expect(gradle).toMatch(/implementation "com\.google\.ads\.mediation:unity:[\d.]+"/);
    expect(gradle).toMatch(/implementation "com\.unity3d\.ads:unity-ads:[\d.]+"/);
    expect(plist.match(/<key>SKAdNetworkIdentifier<\/key>/g)?.length ?? 0).toBeGreaterThanOrEqual(150);
    expect(plist).toContain('<string>gta9lk7p23.skadnetwork</string>'); // Liftoff
    expect(plist).toContain('<string>4dzt52r2t5.skadnetwork</string>'); // Unity
  });
  it('ATT metni ve ad Türkçe + İngilizce, projeye bağlı', () => {
    expect(oku('ios/App/App/tr.lproj/InfoPlist.strings')).toMatch(/"CFBundleDisplayName" = "Tea House Tycoon";/);
    expect(oku('ios/App/App/tr.lproj/InfoPlist.strings')).toContain('"NSUserTrackingUsageDescription"');
    expect(oku('ios/App/App/en.lproj/InfoPlist.strings')).toContain('"NSUserTrackingUsageDescription"');
    expect(pbx).toContain('path = tr.lproj/InfoPlist.strings;');
    expect(pbx).toContain('InfoPlist.strings in Resources */,');
    expect(pbx).toMatch(/knownRegions = \([^)]*\btr,/);
  });
  it('yön: iPhone dikey + yatay, iPad dört yön (Android fullUser karşılığı)', () => {
    const iphone = plist.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)![1];
    const ipad = plist.match(/<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/)![1];
    for (const y of ['Portrait', 'LandscapeLeft', 'LandscapeRight']) expect(iphone).toContain(`UIInterfaceOrientation${y}<`);
    expect(ipad.match(/UIInterfaceOrientation/g)?.length).toBe(4);
  });
  it('sürüm package.json\'dan (Android versionCode ile aynı formül)', () => {
    const { version } = JSON.parse(oku('package.json'));
    const s = iosSurumu(version);
    expect(pbx.match(/MARKETING_VERSION = ([^;]+);/g)).toEqual([`MARKETING_VERSION = ${s.pazar};`, `MARKETING_VERSION = ${s.pazar};`]);
    expect(pbx.match(/CURRENT_PROJECT_VERSION = ([^;]+);/g)).toEqual([`CURRENT_PROJECT_VERSION = ${s.derleme};`, `CURRENT_PROJECT_VERSION = ${s.derleme};`]);
    expect(iosSurumu('0.9.0').derleme).toBe(900);
  });
  it('SPM eklenti yolları Mac\'te çözülür: göreli, düz bölü (Windows cap sync ters bölü yazar)', () => {
    const spm = oku('ios/App/CapApp-SPM/Package.swift');
    for (const p of ['@capacitor-community/admob', '@capacitor/app', '@revenuecat/purchases-capacitor'])
      expect(spm).toContain(`path: "../../../node_modules/${p}"`);
    expect(spm).not.toContain('\\');
    expect(spmYollari('path: "..\\..\\..\\..\\x\\node_modules\\@capacitor\\app"'))
      .toBe('path: "../../../node_modules/@capacitor/app"');
  });
  it('bundle id = capacitor appId (kullanıcı 2026-09-28: com.mutlubadem.teahouse)', () => {
    expect(oku('capacitor.config.ts')).toContain("appId: 'com.mutlubadem.teahouse'");
    expect(pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.mutlubadem\.teahouse;/g)?.length).toBe(2);
  });
  it('çentik: viewport-fit=cover (yoksa iOS\'ta env(safe-area-inset-*) 0 döner)', () => {
    expect(oku('index.html')).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
  });
});

describe('iOS ses kilidi', () => {
  it('kesintiden (interrupted) sonra dokunuş bağlamı yeniden açar', async () => {
    class SahteBaglam {
      state = 'interrupted';
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    (globalThis as Record<string, unknown>).window = { AudioContext: SahteBaglam };
    const { sesBaglami, sesiUyandir } = await import('../src/game/audioWeb');
    const c = sesBaglami() as unknown as SahteBaglam;
    sesiUyandir();
    expect(c.state).toBe('running');
    c.state = 'suspended';
    sesiUyandir();
    expect(c.state).toBe('running');
    delete (globalThis as Record<string, unknown>).window;
  });
  it('her dokunuş (touchend/click dahil) uyandırır', () => {
    const k = oku('src/game/audioBridge.ts');
    expect(k).toContain("const ac = () => { m.kilidiAc(); mz.kilidiAc(); sesiUyandir(); };");
    expect(k).toContain("['pointerdown', 'touchend', 'click', 'keydown']");
  });
});
