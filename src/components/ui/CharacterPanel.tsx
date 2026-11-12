import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KareTavani } from '../three/KareTavani';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { fmt, sayi } from '../../game/decimal';
import {
  charLevel,
  charValue,
  charNextCost,
  charMaxTier,
  trayCapacityFor,
  waiterTrayCapacityFor,
  waiterTrayNextCost,
  dishCarryCapacityFor,
  dishCarryNextCost,
  waiterSpeedFor,
  waiterSpeedNextCost,
  dishSpeedFor,
  dishSpeedNextCost,
  type CharStat,
} from '../../config/economy.config';
import { CupTray, tepsiKaymasi, tepsiTekEl } from '../three/Player';
import { gecerliKiyafet, gecerliTepsi } from '../../game/vitrin';
import { KayActor } from '../three/KayActor';
import { FixedCam, SalonLights, FloorPatch, WallBack } from './SalonSlice';
import { PREVIEW_GL } from '../../config/palette';
import { CoinIcon, TrayIcon, BasinIcon, MagnetIcon, BootIcon, ToIcon } from './icons';
import { Sheet } from './Sheet';
import { t } from '../../i18n';

/**
 * Karakter paneli (v20 + Y3 SEKMELER; docs/yemek-alani-garson-plan.md §3): Oyuncu | Çay Garsonu |
 * Tostçu. Oyuncu sekmesi v20 içeriği (canlı tepsi önizleme + 3 özellik). Garson sekmeleri tepsi
 * yükseltmesi satar (çay garsonları z0+z1 ORTAK eğri; tostçu kendi eğrisi) — garson tutulmadan kilitli.
 */

/**
 * ÖNİZLEME — TEK BİLEŞEN, ÜÇ ROL (S23 · D-120 · kol K3).
 *
 * NEDEN DEĞİŞTİ: S23 ölçümü paneldeki adamın oyundaki adam OLMADIĞINI saydı. Panel
 * `OwnerBody`yi (eski ilkel gövde) çiziyordu, salon `KayActor`ü; dört kimlik işaretinin
 * DÖRDÜ de tersti — kasket ve önlük PANELDE vardı oyunda yoktu (S15 ve S18'de kalkmışlardı),
 * omuz havlusu ve sıvalı kol OYUNDA vardı panelde yoktu (D-116 · P7). Garson ve bulaşıkçı
 * ise hâlâ kapsüldü. Yani panel, oyunda iki turdur var olmayan birini gösteriyordu.
 *
 * Artık gövde tek kaynaktan gelir: `KayActor`. Rol eşlemesi `KAY_MODEL`/`KAY_KIYAFET`in
 * kendisi olduğu için kimlik bir daha ayrışamaz — panel ne eklerse salon da onu ekler.
 *
 * VİTRİN (kullanıcı kararı, K3): karakter boşlukta değil ZEMİNDE durur. Yeni bir dil
 * açılmıyor — mağaza önizlemeleri (`SalonSlice` · `DioramaPreview` · `TableThemePreview`)
 * zaten "salondan kes-yapıştır"; karakter paneli bu dilin dışında kalan tek ekrandı.
 *
 * TEPSİ ELE TAKILI: `tasiyor` ile üst gövde `Holding_A`ya geçer ve `KayActor` çapayı iki
 * `handslot` kemiğinin ortasından alır (S16 · D-114). Panelde satılan şey tepsi kapasitesi
 * olduğu için tepsinin GÖRÜNMESİ ekranın işi.
 */
function Onizleme({ kind, cap, dirty = 0, food = false, kiyafet, tepsi }: {
  kind: 'owner' | 'waiter' | 'dishwasher';
  cap: number;
  dirty?: number;
  food?: boolean;
  /** Sahibin 💎 kıyafeti ve tepsisi (F4c) — panelde oyunda giyilenle aynı görünsün. */
  kiyafet?: string;
  tepsi?: string;
}) {
  const sway = useRef<Group>(null);
  const trayG = useRef<Group>(null);
  const prevCap = useRef(cap);
  const pop = useRef(0);
  useFrame((st, dt) => {
    if (cap > prevCap.current) pop.current = 1;
    prevCap.current = cap;
    const t = st.clock.elapsedTime;
    if (sway.current) {
      // Hafif salınım (`feedback_visual_polish`: animasyon hafif olsun) — gövdenin KENDİ
      // idle klibi zaten çalıyor, bu yalnız 3/4 duruşu canlı tutan bir kıpırtı.
      sway.current.rotation.y = -0.38 + Math.sin(t * 0.6) * 0.1;
    }
    if (trayG.current) {
      pop.current = Math.max(0, pop.current - dt * 2.2);
      trayG.current.scale.setScalar(1 + 0.3 * pop.current);
    }
  });
  return (
    <group ref={sway}>
      <KayActor kind={kind} kiyafet={kiyafet} tasiyor tekEl={!!tepsi && tepsiTekEl(tepsi)}>
        <group ref={trayG} position={tepsiKaymasi(tepsi ?? 'klasik')}>
          <CupTray tea={food ? 0 : cap - dirty} food={food ? cap : 0} dirty={dirty} cap={cap} gorunum={tepsi} />
        </group>
      </KayActor>
    </group>
  );
}

/**
 * B12 (T9d · D-146): sönük alım NEDENİNİ söyler. Eskiden parası yetmeyen düğme yalnız griydi; oyuncu
 * "neden basılmıyor"u sayıdan çıkarmak zorundaydı. Satırın altında kalan tutar yazar.
 */
function Eksik({ cost, cash }: { cost: number | null; cash: number }) {
  if (cost == null || cash >= cost) return null;
  return (
    <span className="eksik" data-testid="eksik">
      <CoinIcon size={12} />
      {t('{1} eksik', fmt(Math.ceil(cost - cash)))}
    </span>
  );
}

const STAT_ROWS: { stat: CharStat; name: string; unit: string; icon: React.ReactNode }[] = [
  { stat: 'tray', name: t('Tepsi'), unit: t('bardak'), icon: <TrayIcon size={42} /> },
  { stat: 'magnet', name: t('Para Mıknatısı'), unit: t('alan'), icon: <MagnetIcon size={42} /> },
  { stat: 'speed', name: t('Hareket Hızı'), unit: t('hız'), icon: <BootIcon size={42} /> },
];

export type Tab = 'player' | 'waiter' | 'dish';

// Garson sekmesi içeriği: tepsi yükseltme satırı. Sekme yalnız garson tutulunca ÇİZİLİR
// (turu-5 m.7: kilitli sekme hiç görünmez), o yüzden burada kilit dalı yok.
// NOT: kendi Canvas'ı YOK — panel TEK Canvas kullanır (sekme başına yeni WebGL context açmak
// tarayıcı context limitine takılıp önizlemeyi karartıyordu; Playwright canlı bulgusu 2026-06-12).
function WaiterTab() {
  const wallet = useGame((s) => s.wallet);
  const waiterUpgrades = useGame((s) => s.waiterUpgrades);
  const buyWaiterTray = useGame((s) => s.buyWaiterTray);
  const buyWaiterSpeed = useGame((s) => s.buyWaiterSpeed);
  const cash = wallet.toNumber();
  // B2: tek garson havuzu → tek tepsi/hız hattı ("Çay Garsonu" + "Tostçu" sekmeleri birleşti).
  const tier = waiterUpgrades.tray;
  const cap = waiterTrayCapacityFor(tier);
  const cost = waiterTrayNextCost(tier);
  // v29: hız yükseltmesi mekânsal noktadan panele taşındı (kullanıcı 2026-06-13).
  const spdTier = waiterUpgrades.speed;
  const spd = waiterSpeedFor(spdTier);
  const spdNext = waiterSpeedFor(spdTier + 1);
  const spdCost = waiterSpeedNextCost(spdTier);
  const unit = t('ürün');
  return (
    <>
      <div className="char-stat">
        <span className="char-stat-icon"><TrayIcon size={42} food={false} /></span>
        <span className="char-stat-info">
          <span className="char-stat-name">{t('Tepsi')}</span>
          <span className="char-stat-val" data-testid="waiter-val">
            {cost != null ? (
              <>
                {cap} <i><ToIcon /> {cap + 1}</i> {unit}
              </>
            ) : (
              <>
                {cap} {unit}
              </>
            )}
          </span>
          <Eksik cost={cost} cash={cash} />
        </span>
        {cost != null ? (
          <button
            className="char-buy"
            data-testid="waiter-buy"
            disabled={cash < cost}
            onClick={() => buyWaiterTray()}
          >
            <CoinIcon size={16} />
            {fmt(cost)}
          </button>
        ) : (
          <span className="char-max" data-testid="waiter-buy">
            {t('Son seviye')}
          </span>
        )}
      </div>
      <div className="char-stat">
        <span className="char-stat-icon"><BootIcon size={42} /></span>
        <span className="char-stat-info">
          <span className="char-stat-name">{t('Hız')}</span>
          <span className="char-stat-val" data-testid="waiter-speed-val">
            {spdCost != null ? (
              <>
                {sayi(spd)} <i><ToIcon /> {sayi(spdNext)}</i> {t('hız')}
              </>
            ) : (
              <>{sayi(spd)} {t('hız')}</>
            )}
          </span>
          <Eksik cost={spdCost} cash={cash} />
        </span>
        {spdCost != null ? (
          <button
            className="char-buy"
            data-testid="waiter-speed-buy"
            disabled={cash < spdCost}
            onClick={() => buyWaiterSpeed()}
          >
            <CoinIcon size={16} />
            {fmt(spdCost)}
          </button>
        ) : (
          <span className="char-max" data-testid="waiter-speed-buy">
            {t('Son seviye')}
          </span>
        )}
      </div>
      <div className="char-note">{t('Garsonların ortak tepsisi ve hızı — hepsi tek havuzdan, her masaya.')}</div>
    </>
  );
}

// Bulaşıkçı sekmesi (v28): leğen kapasite yükseltme satırı (sekme yalnız bulaşıkçı tutulunca çizilir).
function DishTab() {
  const wallet = useGame((s) => s.wallet);
  const waiterUpgrades = useGame((s) => s.waiterUpgrades);
  const buyDishCarry = useGame((s) => s.buyDishCarry);
  const buyDishSpeed = useGame((s) => s.buyDishSpeed);
  const cash = wallet.toNumber();
  const tier = waiterUpgrades.dishCarry;
  const cap = dishCarryCapacityFor(tier);
  const cost = dishCarryNextCost(tier);
  // v29 (kullanıcı 2026-06-13): bulaşıkçıya hız kademesi — "yetişemez" baskısının ikinci kolu.
  const spdTier = waiterUpgrades.dishSpeed;
  const spd = dishSpeedFor(spdTier);
  const spdNext = dishSpeedFor(spdTier + 1);
  const spdCost = dishSpeedNextCost(spdTier);
  return (
    <>
      <div className="char-stat">
        <span className="char-stat-icon"><BasinIcon size={42} /></span>
        <span className="char-stat-info">
          <span className="char-stat-name">{t('Leğen')}</span>
          <span className="char-stat-val" data-testid="waiter-val-dish">
            {cost != null ? (
              <>
                {cap} <i><ToIcon /> {cap + 2}</i> {t('bardak')}
              </>
            ) : (
              <>{t('{1} bardak', cap)}</>
            )}
          </span>
          <Eksik cost={cost} cash={cash} />
        </span>
        {cost != null ? (
          <button
            className="char-buy"
            data-testid="waiter-buy-dish"
            disabled={cash < cost}
            onClick={() => buyDishCarry()}
          >
            <CoinIcon size={16} />
            {fmt(cost)}
          </button>
        ) : (
          <span className="char-max" data-testid="waiter-buy-dish">
            {t('Son seviye')}
          </span>
        )}
      </div>
      <div className="char-stat">
        <span className="char-stat-icon"><BootIcon size={42} /></span>
        <span className="char-stat-info">
          <span className="char-stat-name">{t('Hız')}</span>
          <span className="char-stat-val" data-testid="waiter-speed-val-dish">
            {spdCost != null ? (
              <>
                {sayi(spd)} <i><ToIcon /> {sayi(spdNext)}</i> {t('hız')}
              </>
            ) : (
              <>{sayi(spd)} {t('hız')}</>
            )}
          </span>
          <Eksik cost={spdCost} cash={cash} />
        </span>
        {spdCost != null ? (
          <button
            className="char-buy"
            data-testid="waiter-speed-buy-dish"
            disabled={cash < spdCost}
            onClick={() => buyDishSpeed()}
          >
            <CoinIcon size={16} />
            {fmt(spdCost)}
          </button>
        ) : (
          <span className="char-max" data-testid="waiter-speed-buy-dish">
            {t('Son seviye')}
          </span>
        )}
      </div>
      <div className="char-note">
        {t('Tüm salonların bulaşıkçılarına ortak: leğen tek turda daha çok taşır, hız turu kısaltır.')}
      </div>
    </>
  );
}

/** `ilkSekme`: B4 (T9d) — garson görevi paneli GARSON sekmesinde açar. Oyuncu sekmesinde de "Tepsi"
 *  satırı var; görev "garson tepsisi" derken panel oyuncununkinde açılınca yanlış alım yapılıyordu. */
export function CharacterPanel({ onClose, ilkSekme = 'player' }: { onClose: () => void; ilkSekme?: Tab }) {
  const wallet = useGame((s) => s.wallet);
  const charUpgrades = useGame((s) => s.charUpgrades);
  const waiterUpgrades = useGame((s) => s.waiterUpgrades);
  const buyCharUpgrade = useGame((s) => s.buyCharUpgrade);
  const padsDone = useGame((s) => s.padsDone);
  // Vitrin OYUNCUNUN KENDİ salonunu gösterir: satın aldığı zemin ve duvar teması burada da
  // geçerli (mağaza önizlemeleriyle aynı kaynak). Karakter, kendi kıraathanesinde duruyor.
  const floorThemeByArea = useGame((s) => s.floorThemeByArea);
  const wallThemeByArea = useGame((s) => s.wallThemeByArea);
  const floorId = floorThemeByArea[0] ?? 'parke';
  const kiyafet = useGame(gecerliKiyafet);
  const tepsi = useGame(gecerliTepsi);
  const wallId = wallThemeByArea[0] ?? 'krem';
  const [secili, setTab] = useState<Tab>(ilkSekme);
  const cash = wallet.toNumber();
  const cap = trayCapacityFor(charUpgrades.tray);
  const lvl = charLevel(charUpgrades);
  const waiterHired = padsDone.includes('waiter');
  const dishHired =
    padsDone.includes('dishwasher') || padsDone.includes('z2dishwasher') || padsDone.includes('z3dishwasher');
  // turu-5 m.7: tutulmamış karakterin sekmesi HİÇ çizilmez (kilitli mesaj yerine).
  // İstenen sekme tutulmamış karakterinse (bozuk kayıt/erken görev) Oyuncu'ya düşer.
  const tab: Tab =
    (secili === 'waiter' && !waiterHired) || (secili === 'dish' && !dishHired) ? 'player' : secili;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'player', label: t('Çaycı') },
    ...(waiterHired ? [{ id: 'waiter' as Tab, label: t('Garson') }] : []),
    ...(dishHired ? [{ id: 'dish' as Tab, label: t('Bulaşıkçı') }] : []),
  ];

  return (
    <Sheet
      title={tab === 'player' ? t('Çaycı') : tab === 'waiter' ? t('Garson') : t('Bulaşıkçı')}
      testid="char-panel"
      onClose={onClose}
      navda
    >
      <div className="char-card">
        <div className="char-head">
          <span className="char-lvl" data-testid="char-level" title={t('Çaycı seviyesi')}>
            {/* Karakter madalyonu — D-108: aksan disk + koyu kontur + içinde karakter.
                Eskiden 48'lik kutuya 24 ızgaralı bir tepsi çiziliyordu ve köşeye sıkışıyordu. */}
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="10.4" fill="var(--ac)" stroke="var(--ot)" strokeWidth="2.2" />
              <g color="var(--txa)" transform="translate(12 12) scale(0.62) translate(-12 -12)">
                <circle cx="12" cy="7.8" r="4.6" fill="currentColor" />
                <path d="M4.2 21c0-4.3 3.5-6.9 7.8-6.9s7.8 2.6 7.8 6.9z" fill="currentColor" />
              </g>
            </svg>
            <i>{lvl}</i>
          </span>
        </div>

        {/* Y3 sekmeleri — yalnız tutulan karakterler; tek sekme kalırsa çubuk gizli (turu-5 m.7) */}
        {tabs.length > 1 && (
          <div className="char-tabs" role="tablist">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                className={`char-tab${tab === id ? ' active' : ''}`}
                data-testid={`char-tab-${id}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* TEK Canvas: sekme MODELİ değiştirir, context'i değil — sekme başına yeni WebGL
            context tarayıcı limitine takılıp önizlemeyi karartıyordu (2026-06-12).

            KAMERA ARTIK OYUNUN KAMERASI (`FixedCam`, 45° · fov 50) — eski (0,75 · 1,45 · 2,05)
            fov 36 duruşu ne salonun açısıydı ne de mağaza önizlemelerininki. Ölçüm kutunun da
            yanlış olduğunu saydı: gövde 356×134'lük kutunun eninin yalnız %22-24'ünü
            kullanıyordu ve üç sekmede de ayak alt kenara dayanıyordu. Kutu portreye büyüdü
            (`hud.css` .char-canvas), duruş salonunkiyle eşitlendi. */}
        <div className="char-canvas">
          <Canvas dpr={[1, 1.5]} gl={PREVIEW_GL} frameloop="never">
            {/* K-A: önizleme de tavanlı — panel açıkken durağan kareyi 120 kez çizmesin. */}
            <KareTavani />
            <FixedCam d={2.6} ty={1.02} />
            {/* Işık ve zemin/duvar SAHNEYLE aynı bileşenlerden: panelde gördüğün kıyafet rengi
                salonda göreceğinle birebir (tek tanım `three/lights.tsx`). */}
            <SalonLights />
            <FloorPatch floorId={floorId} checkerHalf={2} />
            <WallBack wallId={wallId} z={-1.55} width={7} />
            {tab === 'player' && <Onizleme kind="owner" cap={cap} kiyafet={kiyafet} tepsi={tepsi} />}
            {tab === 'waiter' && waiterHired && (
              <Onizleme kind="waiter" cap={waiterTrayCapacityFor(waiterUpgrades.tray)} />
            )}
            {tab === 'dish' && dishHired && (
              <Onizleme
                kind="dishwasher"
                cap={dishCarryCapacityFor(waiterUpgrades.dishCarry)}
                dirty={dishCarryCapacityFor(waiterUpgrades.dishCarry)}
              />
            )}
          </Canvas>
        </div>

        {tab === 'player' && (
          <>
            {STAT_ROWS.map(({ stat, name, unit, icon }) => {
              const tier = charUpgrades[stat];
              const max = charMaxTier(stat);
              const cost = charNextCost(stat, tier);
              const cur = charValue(stat, tier);
              const next = tier < max ? charValue(stat, tier + 1) : null;
              const afford = cost != null && cash >= cost;
              return (
                <div className="char-stat" key={stat}>
                  <span className="char-stat-icon">{icon}</span>
                  <span className="char-stat-info">
                    <span className="char-stat-name">{name}</span>
                    <span className="char-stat-val" data-testid={`char-val-${stat}`}>
                      {next != null ? (
                        <>
                          {sayi(cur)} <i><ToIcon /> {sayi(next)}</i> {unit}
                        </>
                      ) : (
                        <>
                          {sayi(cur)} {unit}
                        </>
                      )}
                    </span>
                    <Eksik cost={cost} cash={cash} />
                  </span>
                  {cost != null ? (
                    <button
                      className="char-buy"
                      data-testid={`char-buy-${stat}`}
                      disabled={!afford}
                      onClick={() => buyCharUpgrade(stat)}
                    >
                      <CoinIcon size={16} />
                      {fmt(cost)}
                    </button>
                  ) : (
                    <span className="char-max" data-testid={`char-buy-${stat}`}>
                      {t('Son seviye')}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'waiter' && <WaiterTab />}
        {tab === 'dish' && <DishTab />}
      </div>
    </Sheet>
  );
}

/**
 * 💎 VİTRİN ÖNİZLEMESİ (F4c) — mağazanın Kıyafet/Tepsi sekmesi. Karakter panelinin AYNI sahnesi
 * (oyunun kamerası, ışığı, zemini): vitrinde gördüğün kıyafet salonda göreceğinle birebir.
 */
export function SahipOnizleme({ kiyafet, tepsi }: { kiyafet: string; tepsi: string }) {
  const floorId = useGame((s) => s.floorThemeByArea[0] ?? 'parke');
  const wallId = useGame((s) => s.wallThemeByArea[0] ?? 'krem');
  const cap = useGame((s) => trayCapacityFor(s.charUpgrades.tray));
  return (
    <div className="shop-preview" data-testid="vitrin-onizleme">
      <div className="preview-canvas">
        <Canvas dpr={[1, 1.5]} gl={PREVIEW_GL} frameloop="never">
          <KareTavani />
          <FixedCam d={2.6} ty={1.02} />
          <SalonLights />
          <FloorPatch floorId={floorId} checkerHalf={2} />
          <WallBack wallId={wallId} z={-1.55} width={7} />
          <Onizleme kind="owner" cap={Math.min(cap, 3)} kiyafet={kiyafet} tepsi={tepsi} />
        </Canvas>
      </div>
    </div>
  );
}
