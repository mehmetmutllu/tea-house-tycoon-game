// Headless tarayıcı duman testi (Playwright MCP yokken yedek; CI'de de kullanılabilir).
// Çalışan dev sunucusuna bağlanır: önce `npm run dev`, sonra `node tools/smoke.mjs`.
import { chromium } from 'playwright';

// K3 (D-106, S12): ekranlar TAM EKRAN. D-177: alt menüdeki dört ekranın çıkışı açık sekmeye yeniden dokunmak;
// geri düğmesi (`.sheet-back`) yalnız Ayarlar'da.

const URL = process.env.SMOKE_URL || 'http://localhost:5173/';
const results = [];
const fail = (m) => {
  results.push(['FAIL', m]);
};
const pass = (m) => {
  results.push(['PASS', m]);
};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, locale: 'tr-TR' }); // dil 'oto' → Türkçe (i18n: denetimler Türkçe metin okur)

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

/* D-142 (G-66/G-67): seviye atlama artık bir ÖDÜL EKRANI — tasarım gereği ekranı keser. Duman akışı
 * zamanı hızlı sardığı için seviyeler üst üste atlanıyor; her HUD tıklamasından önce açık ekran
 * "Al" ile kapatılır (oyuncunun yapacağı şey) ve ekranın akışta en az bir kez çıktığı sayılır. */
let seviyeEkraniGoruldu = 0;
async function seviyeKapat() {
  for (let i = 0; i < 20; i++) {
    const ok = await page.$('[data-testid="level-up-ok"]');
    if (!ok) return;
    seviyeEkraniGoruldu++;
    await ok.click();
    await page.waitForTimeout(50);
  }
}
async function tikla(sel) {
  await seviyeKapat();
  await page.click(sel);
}

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  // 15 sn → 40 sn (S16): açılışta yüklenen asset yükü S14'ten beri belirgin büyüdü — dört klip
  // dosyası + beş müşteri gövdesi + personel gövdeleri, hepsi vite dev sunucusunun İLK derlemesiyle
  // birlikte. Soğuk başlangıçta (disk meşgulken) 15 sn yetmiyordu ve test ürün hatası olmadığı
  // hâlde kırmızı dönüyordu. Bu bir ÜRÜN bütçesi değil, tezgâhın bekleme payıdır; gerçek yükleme
  // süresi `SplashScreen`in MAX_MS'i (6 sn) ile ayrıca sınırlı.
  await page.waitForSelector('canvas', { timeout: 40000 });
  pass('Sahne yüklendi (canvas mevcut)');

  await page.waitForFunction(() => typeof window.__game === 'function', { timeout: 10000 });
  const init = await page.evaluate(() => window.__game());
  if (init.tables === 1) pass('Başlangıç: 1 masa');
  else fail(`Başlangıç masa sayısı 1 değil: ${init.tables}`);

  // F4c-3 (D-156): yeni oyunda KAFE ADI bir kez sorulur (her şeyden önce); yazarken WASD yürütmez,
  // "Tamam" adı kayda ve tabelaya yazar. Yükleniyor ekranında oyunun adı.
  const baslik = await page.title();
  if (baslik === 'Tea House Tycoon') pass('Sayfa başlığı oyunun adı (Tea House Tycoon)');
  else fail(`Sayfa başlığı: ${baslik}`);
  const adKutusu = await page.waitForSelector('[data-testid="kafe-adi"]', { timeout: 5000 }).catch(() => null);
  if (adKutusu && init.kafeAdi === null) pass('Yeni oyunda kafe adı kutusu açıldı');
  else fail(`Kafe adı kutusu yok (kafeAdi=${JSON.stringify(init.kafeAdi)})`);
  if (adKutusu) {
    await page.fill('[data-testid="kafe-adi-girdi"]', '');
    await page.type('[data-testid="kafe-adi-girdi"]', 'dddd Çınar Kahvesi');
    const yazarken = await page.evaluate(() => window.__game());
    if (Math.abs(yazarken.player[0] - init.player[0]) < 0.05) pass('Ad yazılırken WASD oyuncuyu yürütmedi');
    else fail(`Ad yazılırken oyuncu yürüdü (x ${init.player[0]}→${yazarken.player[0]})`);
    await page.fill('[data-testid="kafe-adi-girdi"]', '  Çınar   Kahvesi  ');
    await page.click('[data-testid="kafe-adi-tamam"]');
    await page.waitForTimeout(200);
    const adSonra = await page.evaluate(() => window.__game().kafeAdi);
    const kayitAd = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('kiraathane.save')).kafeAdi; } catch { return null; }
    });
    if (adSonra === 'Çınar Kahvesi' && kayitAd === 'Çınar Kahvesi' && !(await page.$('[data-testid="kafe-adi"]')))
      pass('Kafe adı kaydedildi ve kutu kapandı (Çınar Kahvesi)');
    else fail(`Kafe adı: store=${adSonra} kayıt=${kayitAd}`);
  }

  // E5: taze oyunda öğretici ad kutusundan SONRA görünür — ilk adım "yürü" ve sürükleyen el.
  const ogr = await page.waitForSelector('[data-testid="ogretici"][data-adim="yuru"]', { timeout: 5000 }).catch(() => null);
  if (ogr && (await page.$('[data-testid="ogretici-el"]'))) pass('Taze oyunda öğretici göründü (yürü adımı + sürükleyen el)');
  else fail(`Öğretici görünmedi (adim=${await page.evaluate(() => document.querySelector('[data-testid="ogretici"]')?.getAttribute('data-adim') ?? null)})`);

  // Klavye hareketi: D tuşu ile +x
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  const moved = await page.evaluate(() => window.__game());
  if (moved.player[0] > init.player[0] + 0.3) pass(`Klavye hareketi çalışıyor (x ${init.player[0]}→${moved.player[0]})`);
  else fail(`Klavye ile hareket olmadı (x ${init.player[0]}→${moved.player[0]})`);

  // E5: yürüyünce el kalkar (süre değil HAREKET), satır bir sonraki adıma geçer; "Atla" kapatır ve kayda yazar.
  const ogrAdim = await page.evaluate(() => document.querySelector('[data-testid="ogretici"]')?.getAttribute('data-adim') ?? null);
  if (ogrAdim === 'cay-al' && !(await page.$('[data-testid="ogretici-el"]'))) pass('Öğretici: yürüyünce el kalktı, adım "çay al"');
  else fail(`Öğretici yürüdükten sonra: adim=${ogrAdim}`);
  if (ogrAdim) {
    await page.click('[data-testid="ogretici-atla"]');
    await page.waitForSelector('[data-testid="ogretici"]', { state: 'detached', timeout: 2000 }).catch(() => {});
    const atlandiKayit = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('kiraathane.save')).ogreticiAtlandi; } catch { return null; }
    });
    if (!(await page.$('[data-testid="ogretici"]')) && atlandiKayit === true) pass('Öğretici "Atla" ile kapandı ve kayda yazıldı');
    else fail(`Öğretici atlanamadı (görünür=${!!(await page.$('[data-testid="ogretici"]'))}, kayıt=${atlandiKayit})`);
  }

  // Zamanı ileri sar → müşteri otursun, ocak hazır-kuyruğa demlesin (D-011)
  // 15 sn sonra müşteri ya oturmuş bekliyor ya da sabrı bitip kalkmış ve yenisi yolda olabilir —
  // hangisi olduğu açılıştan bu yana geçen GERÇEK süreye bağlı (oyun döngüsü duman beklerken de
  // akıyor). E5'in iki öğretici denetimi bu süreyi uzatınca ilk müşteri pencereyi kaçırdı; artık
  // bekleyen biri çıkana kadar saniye saniye sarılır (en çok 20 sn).
  const seated = await page.evaluate(() => {
    let g = window.__advanceTime(15);
    for (let i = 0; i < 20 && g.waitingCount === 0; i++) g = window.__advanceTime(1);
    return g;
  });
  if (seated.npcCount > 0) pass(`NPC akışı çalışıyor (npcCount=${seated.npcCount})`);
  else fail('NPC oluşmadı');
  if (seated.readyCups > 0) pass(`Ocak hazır-kuyruğa demledi (readyCups=${seated.readyCups})`);
  else fail(`Hazır çay demlenmedi (readyCups=${seated.readyCups})`);
  if (seated.waitingCount > 0) pass(`Müşteri çay bekliyor (waitingCount=${seated.waitingCount})`);
  else fail(`Bekleyen müşteri yok (waitingCount=${seated.waitingCount})`);

  // Manuel servis: ocağa git (tepsi dolar) → bekleyen koltuğa git (çay bırak) → ödeme + toplama
  const seat = seated.firstWaitingSeat;
  await page.evaluate((p) => window.__teleport(p[0], p[2]), seated.stationPos);
  const loaded = await page.evaluate(() => window.__advanceTime(0.5));
  if (loaded.tray > 0) pass(`Tepsi ocaktan doldu (tray=${loaded.tray}/${loaded.trayCap})`);
  else fail(`Tepsi dolmadı (tray=${loaded.tray})`);

  if (seat) {
    await page.evaluate((p) => window.__teleport(p[0], p[2]), seat);
    // Para toplanana kadar saniye saniye sar (en çok 20 sn). Sabit 8 sn kararsızdı: duman beklerken
    // gerçek oyun döngüsü de akıyor; ilk müşterinin sabrı bazen biter, yerine oturan İKİNCİ müşteri
    // pencerenin sonunda servis edilir ve 4 sn'lik içme bitmeden oyuncu başka yere ışınlanırdı —
    // para yerde kalır, q_coin takılırdı. Ölçü `lifetime` değil `coinsCollected`: lifetime görev
    // ödülüyle (q_pickup/q_serve1) zaten doluyor, toplamayı kanıtlamıyordu.
    const served = await page.evaluate(() => {
      let g = window.__advanceTime(8);
      for (let i = 0; i < 20 && g.stats.coinsCollected === 0; i++) g = window.__advanceTime(1);
      // Toplama son karede olduysa q_coin kutlama penceresinde (QUEST_COMPLETE_DUR 0,5 sn) — kapanmasını bekle.
      return window.__advanceTime(1);
    });
    if (served.stats.coinsCollected > 0)
      pass(`Manuel servis → ödeme → toplama çalışıyor (toplanan para=${served.stats.coinsCollected})`);
    else fail(`Servis sonrası para toplanmadı (coinsCollected=${served.stats.coinsCollected}, yerde=${served.coins}, tray=${served.tray})`);
  } else {
    fail('Bekleyen müşteri koltuğu bulunamadı (firstWaitingSeat null)');
  }

  // QUEST AKIŞI: yukarıdaki doğal oyun (çay al → servis → para topla) ilk 3 görevi bitirmiş olmalı
  // → aktif görev "2. Masayı aç" (q_table2) ve EKRANDA TEK PAD kuralıyla görünür pad = table2.
  await page.evaluate(() => window.__addMoney(300));
  const padInfo = await page.evaluate(() => window.__game());
  if (padInfo.quest && padInfo.quest.id === 'q_table2') pass(`Quest hattı doğal akışla ilerledi (aktif görev: ${padInfo.quest.title})`);
  else fail(`Aktif görev q_table2 değil: ${JSON.stringify(padInfo.quest)} (stats=${JSON.stringify(padInfo.stats)})`);
  if (padInfo.currentPad === 'table2' && padInfo.padPos) {
    await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), padInfo.padPos);
    const afterPad = await page.evaluate(() => window.__advanceTime(8));
    if (afterPad.tables >= 2 && afterPad.padsDone.includes('table2'))
      pass(`Pad sistemi + gating çalışıyor (table2 açıldı, masa=${afterPad.tables}, görev=${afterPad.quest?.title})`);
    else fail(`Pad açılmadı (tables=${afterPad.tables}, padsDone=${JSON.stringify(afterPad.padsDone)})`);
  } else {
    fail(`Beklenen görünür pad table2 değil: ${padInfo.currentPad}`);
  }

  // Mekânsal çay yükseltme (table2 sonrası açılır): para ekle + noktaya ışınla + zaman sar → seviye artmalı.
  // (D-019 reveal: ocak yükseltme garsondan ÖNCE — garson "ocak L1 olunca" belirir.)
  const beforeLvl = (await page.evaluate(() => window.__game())).stationLevel;
  await page.evaluate(() => window.__addMoney(100000));
  const uz = (await page.evaluate(() => window.__game())).upgradeZonePos;
  await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), uz);
  // D-142 (G-61): nokta yalnız OCAK görevinde canlı — önce görevsiz dur (seviye artmamalı).
  const gorevsiz = await page.evaluate(() => window.__advanceTime(3));
  if (gorevsiz.stationLevel === beforeLvl) pass('Yükseltme noktası görevi yokken kapalı (D-142)');
  else fail(`Görevi olmayan yükseltme noktası doldu (L${beforeLvl}→L${gorevsiz.stationLevel})`);
  await page.evaluate(() => window.__setQuest('q_station1'));
  await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), uz);
  const afterUp = await page.evaluate(() => window.__advanceTime(5));
  if (afterUp.stationLevel > beforeLvl)
    pass(`Mekânsal çay yükseltme çalışıyor (L${beforeLvl}→L${afterUp.stationLevel})`);
  else fail(`Yükseltme noktası seviye artırmadı (L${beforeLvl}→L${afterUp.stationLevel})`);

  // OMURGA (quest hattı, 2026-06-09): table3 → garson → (assist) → garson hız → bulaşıkçı → table4.
  // Personel artık zorunlu halka; pad yalnız kendi görevi aktifken görünür (__setQuest ile atla).
  // 3. Masa (garson önkoşulu).
  await page.evaluate(() => window.__setQuest('q_table3'));
  await page.evaluate(() => window.__addMoney(2000));
  const t3 = await page.evaluate(() => window.__game());
  if (t3.currentPad === 'table3' && t3.padPos) {
    await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), t3.padPos);
    await page.evaluate(() => window.__advanceTime(8));
  }
  if ((await page.evaluate(() => window.__game())).padsDone.includes('table3')) pass('3. Masa açıldı (quest hattı)');
  else fail('3. Masa açılamadı');

  // Garson tut (omurga halkası; quest görevi aktifken pad görünür).
  await page.evaluate(() => window.__setQuest('q_waiter'));
  await page.evaluate(() => window.__addMoney(500));
  const wq = await page.evaluate(() => window.__game());
  if (wq.currentPad === 'waiter' && wq.padPos) {
    pass('Garson pad\'i yalnız kendi görevinde görünüyor (ekranda tek pad)');
    await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), wq.padPos);
    const hired = await page.evaluate(() => window.__advanceTime(8));
    if (hired.hasWaiter) pass('Garson tutuldu (hasWaiter=true)');
    else fail(`Garson tutulamadı (hasWaiter=${hired.hasWaiter})`);
  } else {
    fail(`Garson pad'i görünmüyor (currentPad=${wq.currentPad}, quest=${JSON.stringify(wq.quest)})`);
  }

  // Kısmi assist: oyuncuyu kimseyi servis edemeyeceği uzak köşeye park et → garson tek başına servis edip para düşürmeli.
  await page.evaluate(() => window.__park());
  const beforeCoins = (await page.evaluate(() => window.__game())).coins;
  const assisted = await page.evaluate(() => window.__advanceTime(40));
  if (assisted.coins > beforeCoins)
    pass(`Garson kısmi assist çalışıyor (oyuncu uzakta, düşen para ${beforeCoins}→${assisted.coins})`);
  else fail(`Garson servis etmedi (coins ${beforeCoins}→${assisted.coins}, waiterTray=${assisted.waiterTray})`);

  // Garson hız yükseltme (v29): karakter PANELİNDEN satın alınır (eski mekânsal waiterUp pad'i kalktı).
  const beforeWL = (await page.evaluate(() => window.__game())).waiterUpgrades?.speed ?? 0;
  await page.evaluate(() => window.__addMoney(500));
  await tikla('[data-testid="char"]');
  await tikla('[data-testid="char-tab-waiter"]'); // B2: tek "Garson" sekmesi (çay/tostçu birleşti)
  await tikla('[data-testid="waiter-speed-buy"]');
  const wL2 = await page.evaluate(() => window.__game());
  if ((wL2.waiterUpgrades?.speed ?? 0) > beforeWL)
    pass(`Garson hız yükseltme panelden çalışıyor (speed ${beforeWL}→${wL2.waiterUpgrades.speed})`);
  else fail(`Garson hız yükseltmedi (speed ${beforeWL}→${wL2.waiterUpgrades?.speed})`);
  // Backdrop'un ÜST şeridine tıkla (kartın dışı). Merkeze tıklamak kırılgandı: panel açılış
  // animasyonu bitince kart backdrop'un merkezini kaplıyor ve tıklama "intercepted" oluyor —
  // test bugüne dek yalnız animasyon henüz tamamlanmadığı için geçiyordu (D3'te ortaya çıktı).
  await tikla('[data-testid="char"]'); // D-177: açık sekmeye yeniden dokunmak kapatır

  // HEDEFLER paneli (D3/D-089 · ödül kalıbı D3b/D-090): beş kategori + ödül toplama. Ödülü CONFIG
  // verir, HUD çizer — burada sınanan şey "panel açıldı mı" değil, ödülün GERÇEKTEN işlemesi:
  // 💎 cüzdana geçiyor mu ve KALICI GELİR ÇARPANI büyüyor mu (D-090'da ₺ ödülü kalktı).
  {
    const oncesi = await page.evaluate(() => window.__addMoney(1200) && window.__game());
    await tikla('[data-testid="goals"]');
    await page.waitForSelector('[data-testid="goals-panel"]', { timeout: 5000 });
    const satir = await page.$$('[data-testid^="goal-"]:not([data-testid^="goal-claim"])');
    if (satir.length === 5) pass('Hedefler paneli: beş kategori satırı');
    else fail(`Hedefler panelinde 5 satır yok: ${satir.length}`);

    // Kazanç kategorisinin ilk kademesi 1.000 ₺ — yukarıdaki para onu toplanabilir yapar.
    const alBtn = await page.$('[data-testid="goal-claim-earn"]');
    if (!alBtn) {
      fail('Kazanç hedefi toplanabilir görünmüyor (1.200 ₺ eklendi, eşik 1.000)');
    } else {
      await alBtn.click();
      await page.waitForSelector('[data-testid="goal-reward"]', { timeout: 5000 });
      await tikla('[data-testid="goal-reward-ok"]');
      const sonrasi = await page.evaluate(() => window.__game());
      if (sonrasi.diamonds > oncesi.diamonds)
        pass(`Hedef ödülü toplandı (💎 ${oncesi.diamonds}→${sonrasi.diamonds})`);
      else fail(`Hedef ödülü elmas vermedi (💎 ${oncesi.diamonds}→${sonrasi.diamonds})`);
      // Aynı hedef ikinci kez toplanamamalı: kategori sonraki kademeye geçer (eşik 1.000 → 10.000)
      // ve buton kalkar. React'in yeniden çizmesi bir kare sürer — bekleyerek sorulur.
      // Kimlik kayda geçti mi? "Buton kalktı mı" diye sormak YANILTICIYDI: duman akışının sonunda
      // lifetime 100k'yı aşıyor, yani Kazanç kategorisinin SONRAKİ kademesi de hemen toplanabilir
      // oluyor ve buton haklı olarak yerinde duruyor. Doğru soru, toplanan KİMLİĞİN kayıtta olması.
      const kimlikler = (await page.evaluate(() => window.__game())).goalsClaimed ?? [];
      if (kimlikler.includes('earn:0')) pass(`Toplanan hedef kimliği kayıtta (${kimlikler.join(',')})`);
      else fail(`Toplanan hedef kayda geçmedi: ${JSON.stringify(kimlikler)}`);
      // D-090: asıl ödül kalıcı gelir çarpanı. Cüzdana bir şey düşmediği için tek görünür kanıt bu.
      const mult = (await page.evaluate(() => window.__game())).goalMult ?? 1;
      if (mult > 1) pass(`Kalıcı gelir çarpanı büyüdü (×${mult.toFixed(3)})`);
      else fail(`Hedef toplandı ama gelir çarpanı 1 kaldı (×${mult})`);
    }
    // Backdrop'un ÜST şeridi (kartın dışı) — merkez kartın altında kalıyor.
    await tikla('[data-testid="goals"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
  }

  // GÜNLÜK GÖREVLER (D8): kartlar Görevler panelinde çıkıyor mu ve ödül GERÇEKTEN 💎 veriyor mu?
  // Sınanan şey panelin açılması değil, günün ölçülen arzının (10 💎) akması.
  {
    await tikla('[data-testid="quests"]');
    await page.waitForSelector('[data-testid="quests-panel"]', { timeout: 5000 });
    const kart = await page.$$('[data-testid^="daily-"][data-state]');
    if (kart.length === 3) pass('Günlük görev: üç kart çizildi');
    else fail(`Günlük görev kartı 3 değil: ${kart.length}`);

    // Kartların 💎 payı toplamı config toplamına eşit olmalı (kaçak arz bekçisi).
    const g = await page.evaluate(() => window.__game());
    const toplam = (g.daily ?? []).reduce((a, d) => a + d.diamonds, 0);
    if (toplam === 10) pass(`Günün 💎 tavanı doğru (${toplam})`);
    else fail(`Günün 💎 toplamı 10 değil: ${toplam}`);

    // Bir görevi sayaçtan DOLDUR → kart toplanabilir olsun → ödülü al.
    const hedef = (g.daily ?? [])[0];
    if (!hedef) {
      fail('Günlük görev kartı okunamadı');
    } else {
      await page.evaluate((id) => window.__fillDaily(id), hedef.id);
      await page.waitForSelector(`[data-testid="daily-claim-${hedef.id}"]`, { timeout: 5000 });
      const oncesi = (await page.evaluate(() => window.__game())).diamonds;
      await tikla(`[data-testid="daily-claim-${hedef.id}"]`);
      await page.waitForSelector('[data-testid="daily-reward"]', { timeout: 5000 });
      await tikla('[data-testid="daily-reward-ok"]');
      const sonrasi = (await page.evaluate(() => window.__game())).diamonds;
      if (sonrasi === oncesi + hedef.diamonds)
        pass(`Günlük görev ödülü ödendi (💎 ${oncesi}→${sonrasi})`);
      else fail(`Günlük ödül yanlış (💎 ${oncesi}→${sonrasi}, beklenen +${hedef.diamonds})`);
      const tekrar = await page.$(`[data-testid="daily-claim-${hedef.id}"]`);
      if (!tekrar) pass('Toplanan günlük görev ikinci kez toplanamıyor');
      else fail('Toplanan günlük görevin "Ödülü al" butonu duruyor');
    }
    await tikla('[data-testid="quests"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
  }

  // Bardak döngüsü (Faz 2e): garson servis ederken kirli bardak üretilir → oyuncu toplar → bulaşıkta yıkar.
  await page.evaluate(() => window.__park()); // oyuncu uzak köşede; garson servis etsin, kirli birikir
  const cupRun = await page.evaluate(() => window.__advanceTime(30));
  if (cupRun.dirtyCount > 0 || cupRun.carriedDirty > 0) {
    pass(`Kirli bardak üretiliyor (içen müşteri masada bırakıyor, dirty=${cupRun.dirtyCount})`);
    const dishPos = cupRun.firstDishPos;
    if (dishPos) {
      const beforeClean = cupRun.cleanCups;
      await page.evaluate((p) => window.__teleport(p[0], p[2]), dishPos);
      const collected = await page.evaluate(() => window.__advanceTime(0.5));
      if (collected.carriedDirty > 0) pass(`Kirli bardak toplanıyor (carriedDirty=${collected.carriedDirty})`);
      else fail(`Kirli bardak toplanmadı (carriedDirty=${collected.carriedDirty})`);
      // Bulaşığa götür → yıka → temiz havuza döner
      await page.evaluate((p) => window.__teleport(p[0], p[2]), collected.dishStationPos);
      const washed = await page.evaluate(() => window.__advanceTime(0.5));
      if (washed.carriedDirty === 0 && washed.cleanCups + washed.readyCups >= beforeClean)
        pass(`Bulaşıkta yıkanıyor (taşınan→temize döndü, clean+ready=${washed.cleanCups + washed.readyCups})`);
      else fail(`Yıkama olmadı (carriedDirty=${washed.carriedDirty}, clean=${washed.cleanCups})`);
    } else {
      fail('Kirli bardak konumu okunamadı (firstDishPos null)');
    }
  } else {
    fail(`Kirli bardak üretilmedi (dirty=${cupRun.dirtyCount}, carried=${cupRun.carriedDirty})`);
  }

  // Omurga sonu (B2): 4. masa → 2. GARSON (D-142) → 2. Salon → salonun masaları → BULAŞIKÇI.
  for (const [qid, pid] of [
    ['q_table4', 'table4'], ['q_waiter2', 'waiter2'], ['q_zone2', 'zone2'], ['q_z2table2', 'z2table2'],
    ['q_z2table3', 'z2table3'], ['q_dish', 'dishwasher'],
  ]) {
    await page.evaluate((q) => window.__setQuest(q), qid);
    await page.evaluate(() => window.__addMoney(2000));
    const g = await page.evaluate(() => window.__game());
    if (g.currentPad === pid && g.padPos) {
      await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), g.padPos);
      await page.evaluate(() => window.__advanceTime(8));
    }
  }
  const opened = await page.evaluate(() => window.__game());
  if ((opened.padsDone || []).includes('dishwasher') && (opened.padsDone || []).includes('waiter2'))
    pass(`Omurga tamam (4. masa + 2. garson + 2. salon + bulaşıkçı, padsDone=${opened.padsDone.length})`);
  else fail(`Omurga açılmadı (padsDone=${JSON.stringify(opened.padsDone)})`);

  // Masa yükseltme (Faz 2h, MASA-BAŞI): TÜM masalar açılınca her masanın YANINDAKİ nokta aktif. 0. masanın
  // noktasına git → SADECE o masa yükselir (bahşiş+sabır); komşu masa etkilenmez.
  const preTable = await page.evaluate(() => window.__game());
  if ((preTable.padsDone || []).includes('table4')) {
    const before0 = (preTable.tableLevels || [])[0] ?? 0;
    const before1 = (preTable.tableLevels || [])[1] ?? 0;
    // D-142: masa noktası yalnız MASA görevinde canlı.
    await page.evaluate(() => window.__setQuest('q_tableL2'));
    await page.evaluate(() => window.__addMoney(5000));
    await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), preTable.tableUpgradeSpots[0]);
    const afterTable = await page.evaluate(() => window.__advanceTime(6));
    const after0 = (afterTable.tableLevels || [])[0] ?? 0;
    const after1 = (afterTable.tableLevels || [])[1] ?? 0;
    if (after0 > before0 && after1 === before1)
      pass(`Masa-başı yükseltme çalışıyor (0. masa ${before0}→${after0}, 1. masa ${after1} sabit)`);
    else fail(`Masa-başı yükseltme hatalı (0:${before0}→${after0}, 1:${before1}→${after1})`);
  } else {
    fail(`Masa yükseltme için 4. masa açık değil (padsDone=${JSON.stringify(preTable.padsDone)})`);
  }

  // USTA NOKTASI (D8 · D-093 → G-14): masa ₺ tavanına varınca aynı nokta 💎 kimliğine döner.
  // 2026-09-09'da etkileşim DEĞİŞTİ: yaklaşmak yetmiyor, oyuncunun noktada DURMASI gerekiyor —
  // kalın çerçeve yeşil dolunca MERKEZÎ modal açılıyor (alt şerit değil, alt sayfa da değil).
  // Işınlanma sonrası oyuncu hareketsiz kaldığı için dolum ~1,1 sn'de tamamlanır.
  {
    const max = (await page.evaluate(() => window.__game())).tableMaxLevel;
    await page.evaluate((lv) => window.__setTableLevel(0, lv), max);
    await page.evaluate(() => window.__setState({ diamonds: 999 }));
    const spot = (await page.evaluate(() => window.__game())).tableUpgradeSpots[0];
    await page.evaluate((p) => window.__teleport(p[0], p[2]), spot);
    await page.evaluate(() => window.__advanceTime(0.5));
    await page.waitForSelector('[data-testid="master-bar"]', { timeout: 5000 });
    pass('Usta noktasında BEKLEYİNCE onay modali açıldı (dwell)');

    // G-14: modal MERKEZÎ olmalı — alt sayfa kabuğuna (.modal-card) düşerse kullanıcının
    // reddettiği "alttan açılan" hâle geri dönmüşüz demektir.
    const merkezi = await page.evaluate(() => !!document.querySelector('.usta-backdrop .usta-card')
      && !document.querySelector('[data-testid="master-bar"] .modal-card'));
    if (merkezi) pass('Usta modali merkezî kabukta (alt sayfa değil)');
    else fail('Usta modali alt sayfa kabuğuna düşmüş (.modal-card)');

    const once = (await page.evaluate(() => window.__game())).diamonds;
    await tikla('[data-testid="master-buy"]');
    const sonra = await page.evaluate(() => window.__game());
    if (sonra.mastersOwned.includes('table:0')) pass(`Usta alındı (${sonra.mastersOwned.join(',')})`);
    else fail(`Usta alınamadı: ${JSON.stringify(sonra.mastersOwned)}`);
    if (sonra.diamonds === once - 25) pass(`Usta 25 💎 düşürdü (${once}→${sonra.diamonds})`);
    else fail(`Usta fiyatı yanlış düştü (${once}→${sonra.diamonds})`);

    // Alındıktan sonra nokta da çubuk da KALKAR (yapacak iş kalmadı).
    await page.evaluate(() => window.__advanceTime(0.5));
    await page.waitForSelector('[data-testid="master-bar"]', { state: 'detached', timeout: 5000 });
    pass('Usta alınınca onay çubuğu kalktı');

    // F4c: İLK Usta'dan sonra başlangıç paketi teklifi BİR KEZ çıkar; "Şimdi değil" kalıcı kapatır.
    // Oyuncu Usta noktasındayken teklif SIRA BEKLER (eylem ortasında satış yok, `ekranKanali`):
    // noktadan ayrılınca çıkar.
    await page.evaluate(() => window.__park());
    // Usta XP verir → seviye ekranı teklifin ÖNÜNDE (kanal önceliği); önce o alınır.
    await page.waitForTimeout(1500);
    await seviyeKapat();
    await page.waitForSelector('[data-testid="baslangic-teklif"]', { timeout: 15000 });
    pass('İlk Usta sonrası başlangıç paketi teklifi çıktı');
    await tikla('[data-testid="teklif-kapat"]');
    await page.waitForSelector('[data-testid="baslangic-teklif"]', { state: 'detached', timeout: 5000 });
    await page.evaluate(() => window.__advanceTime(2));
    await page.waitForTimeout(400);
    if (!(await page.$('[data-testid="baslangic-teklif"]'))) pass('"Şimdi değil" teklifi kalıcı kapattı');
    else fail('Teklif kapatıldı ama yeniden çıktı');

    // Hedefler panelindeki toplu sayaç güncellendi mi (plan §5: "Usta masalar 7/20")?
    await tikla('[data-testid="goals"]');
    await page.waitForSelector('[data-testid="usta-strip"]', { timeout: 5000 });
    const sayac = await page.textContent('[data-testid="usta-owned"]');
    if (sayac.trim() === '1') pass('Hedefler panelinde Usta sayacı 1');
    else fail(`Usta sayacı yanlış: "${sayac}"`);
    await tikla('[data-testid="goals"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
  }


  // Yeni-özellik bildirimi (D-019 §4): ilerleme boyunca açılan ikincil özellikler bildirilmiş olmalı.
  // ('opt:waiter' kalktı — personel artık quest hattının zorunlu halkası, opsiyonel pad yok.)
  const reveals = (await page.evaluate(() => window.__game())).revealSeen || [];
  // v21: reveal anahtarları zone-başına ('upgrade:0' = zone-1 ocak yükseltmesi vb.).
  const wantReveals = ['upgrade:0', 'tableUp:0']; // v29: 'waiterUp:0' kalktı (hız panelden)
  const missing = wantReveals.filter((k) => !reveals.includes(k));
  if (missing.length === 0) pass(`Yeni-özellik bildirimi çalışıyor (reveal: ${reveals.join(', ')})`);
  else fail(`Eksik reveal bildirimi: ${missing.join(', ')} (görülen: ${reveals.join(', ')})`);

  // ODA — LAVABO (B4): Kat 1'in son gelir kolu. 3D sahne görsel doğrulanamadığı için burada
  // ölçülen üç şey: (1) pad GERÇEK yerinde ve gerçek tarayıcıda doluyor, (2) müşteriler odaya
  // uğrayıp parayı ODANIN ÖNÜNE bırakıyor, (3) odanın çizimi konsola hata düşürmüyor.
  const chainNoLavabo = ['table2', 'table3', 'waiter', 'table4', 'zone2', 'z2table2', 'z2table3',
    'dishwasher', 'z2table4', 'zone3', 'z3table2', 'waiter2', 'z3table3', 'z3table4', 'waiter3'];
  await page.evaluate((pads) => window.__setState({ padsDone: pads, lavaboLevel: 0 }), chainNoLavabo);
  await page.evaluate(() => window.__setQuest('q_lavabo'));
  await page.evaluate(() => window.__addMoney(20000));
  const lavPre = await page.evaluate(() => window.__game());
  await page.evaluate((pos) => window.__teleport(pos[0], pos[2]), lavPre.lavabo.spot);
  const lavAfter = await page.evaluate(() => window.__advanceTime(8));
  if (lavAfter.lavabo.open && lavAfter.lavabo.level >= 1)
    pass(`Lavabo pad'i gerçek yerinde açıldı (seviye ${lavAfter.lavabo.level}, ücret ${lavAfter.lavabo.fee}₺)`);
  else fail(`Lavabo açılmadı (open=${lavAfter.lavabo.open}, level=${lavAfter.lavabo.level})`);

  // Müşteri akışı dönsün: uğrayanların parası lavabonun önündeki istifte birikmeli. Oyuncu
  // UZAĞA park edilir — para mıknatısla toplanmasın, istif gerçekten yerde görünsün.
  await page.evaluate(() => window.__park());
  const flow = await page.evaluate(() => window.__advanceTime(120));
  if (flow.lavabo.pileCount > 0)
    pass(`Lavabo ücreti odanın ÖNÜNDEKİ istifte birikiyor (${flow.lavabo.pileCount} ödeme, ${Math.round(flow.lavabo.pileValue)}₺)`);
  else fail(`Lavabo önünde para birikmedi (seviye ${flow.lavabo.level}, uğrama %${Math.round(flow.lavabo.visitChance * 100)})`);

  // GÖREV BARI DOM'da (HUD redesign): üst-orta quest chip'i + para chip'i var; eski sayaç chip'leri YOK.
  const questBar = await page.$('[data-testid="quest"]');
  const walletChip = await page.$('[data-testid="wallet"]');
  const oldChip = await page.$('[data-testid="tray"]');
  if (walletChip && !oldChip) pass('HUD sade: para chip\'i var, eski sayaç chip\'leri kaldırıldı');
  else fail(`HUD beklenen durumda değil (wallet=${!!walletChip}, eskiChip=${!!oldChip})`);
  if (questBar) pass('Görev barı DOM\'da (quest sistemi)');
  else {
    // Görev hattı bitmişse bar görünmez — bunu da geçerli say (oyun sonu durumu).
    const qNow = await page.evaluate(() => window.__game());
    if (!qNow.quest) pass('Görev barı yok çünkü görev hattı bitti (geçerli)');
    else fail(`Görev barı DOM'da yok ama aktif görev var: ${JSON.stringify(qNow.quest)}`);
  }

  // AYARLAR — SES/MÜZİK SEVİYESİ (S9 · D-122). Mantık bekçisi motoru sınıyor
  // (`tests/ses-seviye-s9.test.ts`); burada sınanan şey KABLONUN gerçek tarayıcıda uçtan uca
  // bağlı olduğu: kaydırıcı DOM'da mı, oynatınca kayda yazılıyor mu, anahtar kapanınca devre
  // dışı kalıyor mu. Bunlar mantık testinin göremeyeceği yerler — kaydırıcı hiç render
  // edilmese de motor testleri yeşil kalırdı.
  await tikla('[data-testid="gear"]');
  await page.waitForSelector('[data-testid="menu"]', { timeout: 3000 });
  // F4c-3 (D-156): kafe adı Ayarlar'dan değişir; Vazgeç eskisini bırakır.
  await tikla('[data-testid="set-kafe-adi"]');
  await page.waitForSelector('[data-testid="kafe-adi"]', { timeout: 3000 });
  await page.fill('[data-testid="kafe-adi-girdi"]', 'Vazgeçilen Ad');
  await page.click('[data-testid="kafe-adi-vazgec"]');
  const vazgecAd = await page.evaluate(() => window.__game().kafeAdi);
  await tikla('[data-testid="set-kafe-adi"]');
  await page.fill('[data-testid="kafe-adi-girdi"]', 'Köprübaşı Çay Evi');
  await page.click('[data-testid="kafe-adi-tamam"]');
  await page.waitForTimeout(150);
  const yeniAd = await page.evaluate(() => window.__game().kafeAdi);
  const satirAd = await page.$eval('[data-testid="set-kafe-adi"]', (el) => el.textContent);
  if (vazgecAd === 'Çınar Kahvesi' && yeniAd === 'Köprübaşı Çay Evi' && satirAd === 'Köprübaşı Çay Evi')
    pass('Ayarlar: kafe adı değişti, Vazgeç eskisini bıraktı');
  else fail(`Ayarlar kafe adı: vazgeç=${vazgecAd} yeni=${yeniAd} satır=${satirAd}`);
  const sesKaydirici = await page.$('[data-testid="set-sound-vol"]');
  const muzikKaydirici = await page.$('[data-testid="set-music-vol"]');
  if (sesKaydirici && muzikKaydirici) pass('Ayarlarda ses ve müzik SEVİYE kaydırıcıları var');
  else fail(`Seviye kaydırıcısı eksik (ses=${!!sesKaydirici}, müzik=${!!muzikKaydirici})`);

  if (sesKaydirici) {
    await sesKaydirici.fill('40');
    await page.waitForTimeout(150);
    const kayitli = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('kiraathane.save')).settings; } catch { return null; }
    });
    if (kayitli && Math.abs(kayitli.soundVolume - 0.4) < 1e-6)
      pass(`Ses seviyesi KAYDA yazıldı (${kayitli.soundVolume})`);
    else fail(`Ses seviyesi kayda geçmedi: ${JSON.stringify(kayitli)}`);

    // Anahtar kapanınca kaydırıcı devre dışı — ama SEVİYE korunur ("kapat" ≠ "kıs").
    await tikla('[data-testid="set-sound"]');
    await page.waitForTimeout(150);
    const kapali = await page.$eval('[data-testid="set-sound-vol"]', (el) => el.disabled);
    const sonra = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('kiraathane.save')).settings; } catch { return null; }
    });
    if (kapali && sonra && Math.abs(sonra.soundVolume - 0.4) < 1e-6)
      pass('Ses kapanınca kaydırıcı devre dışı ama SEVİYE korunuyor');
    else fail(`Kapalı durum yanlış (disabled=${kapali}, seviye=${sonra && sonra.soundVolume})`);
    await tikla('[data-testid="set-sound"]'); // geri aç
  }
  // A4 (T9c · D-147): GERİ = üstteki paneli kapatır. Web'de Escape, Android'de geri tuşu aynı
  // `geriTusu` kararından geçer; burada sınanan şey kablonun gerçek tarayıcıda bağlı olduğu.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (!(await page.$('[data-testid="menu"]'))) pass('Geri (Escape) açık paneli kapattı');
  else {
    fail('Geri (Escape) paneli kapatmadı');
    await tikla('[data-testid="menu"] .sheet-back');
    await page.waitForTimeout(200);
  }

  // F3 GEÇİŞLİ C1′ (D-144): soğuma KURAR, panel kapanışı PATLATIR. Mantık bekçisi kuralı sınıyor
  // (`tests/reklam-f3.test.ts`); burada sınanan KABLO: HUD'un panel kapanışı gerçekten reklam
  // katmanına ulaşıyor mu. Tarayıcıda sahte arka uç çalışır, sayaç `__ads` kancasından okunur.
  const adPaneliAcKapa = async () => {
    await tikla('[data-testid="gear"]');
    await page.waitForSelector('[data-testid="menu"]', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return page.evaluate(() => window.__ads.durum());
  };
  const ad0 = await page.evaluate(() => window.__ads.saat(0));
  if (ad0.kuruldu) pass('Reklam katmanı kuruldu (tarayıcıda sahte arka uç)');
  else fail('Reklam katmanı kurulmadı');
  await page.evaluate(() => window.__ads.saat(180_000));
  const ad1 = await adPaneliAcKapa();
  const ad2 = await adPaneliAcKapa();
  if (ad1.gecisli === ad0.gecisli + 1 && ad2.gecisli === ad1.gecisli)
    pass(`Geçişli: soğuma dolunca panel kapanışı 1 reklam, hemen sonraki kapanış 0 (${ad0.gecisli}→${ad1.gecisli}→${ad2.gecisli})`);
  else fail(`Geçişli kuralı tarayıcıda tutmadı (${ad0.gecisli}→${ad1.gecisli}→${ad2.gecisli})`);

  /*
   * KARE-HIZI TAVANI (K-A · D-136) — üç denetim, üçü de SAYIYLA.
   *
   * Sahne gözle doğrulanamıyor (CLAUDE.md), o yüzden tavanın üç ayrı bozulma biçimi ayrı ayrı
   * sayıya bağlandı:
   *   ① sürücü dönüyor mu — `frameloop="never"` ile sürücü durursa ekran DONAR ve hiçbir test
   *     bunu görmez; sayaç 0 kalırsa yakalanır.
   *   ② tavan tutuyor mu — sayaç saniyede ~60'ı aşarsa tavan delinmiş demektir (şikâyetin kendisi).
   *   ③ ÖNİZLEME tuvali de sürülüyor mu — paneldeki `<Canvas frameloop="never">` sürücüsüz
   *     kalsaydı önizleme BOŞ çıkardı.
   *
   * Sprint A (perf #2a/b): sayaç artık ÇİZİLEN kareyi sayar. Opak panel açıkken ana sahne çizmez
   * (tick sürer) ve durağan önizlemeler yalnız değişince çizer — yani panel açılınca hız eskisi
   * gibi "ikiye katlanmaz". Denetim: panel açıkken ana sahne 0 kare (`__sahneKaresi`), önizleme
   * ≥ 1 kare; panel kapanınca sahne yeniden çiziyor.
   */
  {
    const say = () => page.evaluate(() => ({ t: window.__kareSayaci ?? -1, s: window.__sahneKaresi ?? -1 }));
    const olc = async (ms) => {
      const a = await say();
      await page.waitForTimeout(ms);
      const b = await say();
      return ((b.t - a.t) / ms) * 1000;
    };
    const tek = await olc(1500);
    // ALT SINIR bilerek düşük: başsız tarayıcıda ve yüklü makinede rAF'in kendisi 60'a yaklaşmaz
    // (bu koşuda ~7/sn ölçülüyor). Buradaki iddia "oyun hızlı" DEĞİL, "sürücü yaşıyor" — sıfır
    // demek `frameloop="never"` ile DONMUŞ ekran demektir ve başka hiçbir test onu görmez.
    if (tek > 2) pass(`Kare sürücüsü dönüyor (${tek.toFixed(0)} kare/sn)`);
    else fail(`Kare sürücüsü durmuş — sahne donar (${tek.toFixed(0)} kare/sn)`);
    // ÜST SINIR asıl iddia: tavan delinirse sürücü her rAF'te ilerletir ve bu sayı fırlar.
    if (tek <= 75) pass(`Kare tavanı tutuyor (${tek.toFixed(0)} ≤ 75 kare/sn)`);
    else fail(`Kare tavanı delinmiş: ${tek.toFixed(0)} kare/sn`);

    // F4c: mağaza 💎 vitrininde (Kıyafet) açılır; önizlemesi sahibin kendisi.
    await tikla('[data-testid="shop"]');
    await page.waitForSelector('[data-testid="vitrin-onizleme"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    const pa = await say();
    await page.waitForTimeout(1500);
    const pb = await say();
    const onizlemeKare = pb.t - pa.t - (pb.s - pa.s);
    if (onizlemeKare >= 1) pass(`Önizleme tuvali çiziyor (${onizlemeKare} kare / 1,5 sn)`);
    else fail(`Önizleme tuvali çizmiyor — boş kalır (${onizlemeKare} kare / 1,5 sn)`);
    if (pb.s >= 0 && pb.s === pa.s) pass('Opak panel açıkken sahne çizilmiyor (0 kare / 1,5 sn, tick sürüyor)');
    else fail(`Panel açıkken sahne hâlâ çiziliyor (${pb.s - pa.s} kare / 1,5 sn)`);

    // F4c 💎 VİTRİNİ uçtan uca: çeşidi seç → tek düğmeyle al → 💎 düşer, sahip onu giyer.
    await page.evaluate(() => window.__setState({ diamonds: 100 }));
    await tikla('[data-testid="shop-card-outfit-yesil"]');
    await tikla('[data-testid="shop-buy"]');
    await page.waitForFunction(() => document.querySelector('[data-testid="shop-buy"]')?.textContent?.includes('Uygulandı'), null, { timeout: 5000 });
    const vitrin = await page.evaluate(() => window.__game().diamonds);
    if (vitrin === 40) pass('💎 vitrini: Kıyafet alındı ve giyildi (100→40)');
    else fail(`💎 vitrini: kıyafet alımı yanlış (100→${vitrin})`);
    // F4c-2 💎 DEKOR: yuvanın salonu açılmadan kilitli; yılbaşı koltuğu baştan açık → alınır, salona konur.
    await tikla('[data-testid="shop-tab-decor"]');
    await page.waitForSelector('[data-testid="dekor-onizleme"]', { timeout: 5000 });
    // Duman bu noktada geç dönemde; kilidi görmek için dönem bir an 1. Salon'a alınır (alan sayısı
    // padsDone'dan TÜRER), denetimden sonra aynı liste geri yazılır.
    const padsOnce = await page.evaluate(() => window.__game().padsDone);
    await page.evaluate(() => window.__setState({ padsDone: [] }));
    const da = await say();
    await tikla('[data-testid="shop-card-decor-semaver"]');
    // Kilitli dekor yalıtık önizlemede, `frameloop="demand"`: seçilince en az bir kare çizer.
    await page.waitForTimeout(500);
    const db = await say();
    if (db.t - da.t - (db.s - da.s) >= 1) pass(`Durağan dekor önizlemesi seçilince çizdi (${db.t - da.t - (db.s - da.s)} kare)`);
    else fail('Durağan dekor önizlemesi hiç çizmedi — boş kalır');
    const kilit = await page.evaluate(() => {
      const d = document.querySelector('[data-testid="shop-buy"]');
      return { kapali: !!d?.disabled, metin: d?.textContent ?? '' };
    });
    await page.evaluate((p) => window.__setState({ padsDone: p }), padsOnce);
    if (kilit.kapali && kilit.metin.includes('3. Salon')) pass('💎 dekor: semaver 3. Salon açılmadan kilitli');
    else fail(`💎 dekor: kilit yok (${kilit.metin})`);
    await page.evaluate(() => window.__setState({ diamonds: 100 }));
    await tikla('[data-testid="shop-card-decor-yilbasi-kirmizi"]');
    await tikla('[data-testid="shop-buy"]');
    await page.waitForFunction(() => document.querySelector('[data-testid="shop-buy"]')?.textContent?.includes('Kaldır'), null, { timeout: 5000 });
    const dekor = await page.evaluate(() => ({ elmas: window.__game().diamonds, dekor: window.__game().dekor }));
    if (dekor.elmas === 0 && dekor.dekor.includes('yilbasi-kirmizi')) pass('💎 dekor: yılbaşı koltuğu alındı ve salona kondu (100→0)');
    else fail(`💎 dekor: alım yanlış (${JSON.stringify(dekor)})`);
    // F4c-4 (D-157): alım SESSİZ bitmez — mağazanın üstünde bildirim; önizleme salondaki YERİNDEN çekilir.
    // Konum: bildirim önizlemenin ÇERÇEVESİNİN İÇİNDE (üst kenara binmez) ve sekmelerin altında.
    // Giriş animasyonu (0,38 sn) bitince ölçülür.
    await page.waitForTimeout(500);
    const bildirim = await page
      .evaluate(() => {
        const n = document.querySelector('[data-testid="notice"]');
        const o = document.querySelector('[data-testid="dekor-onizleme"] .preview-canvas');
        const s = document.querySelector('.shop-tabs');
        if (!n || !o || !s) return { metin: n?.textContent ?? '', pay: NaN, sekme: NaN };
        const nr = n.getBoundingClientRect(), or = o.getBoundingClientRect();
        return { metin: n.textContent ?? '', pay: Math.round(nr.top - or.top), sekme: Math.round(nr.top - s.getBoundingClientRect().bottom), alt: Math.round(or.bottom - nr.bottom) };
      })
      .catch(() => ({ metin: '', pay: NaN, sekme: NaN }));
    if (bildirim.metin.includes('salona kondu') && bildirim.pay >= 8 && bildirim.sekme > 0 && bildirim.alt > 0)
      pass(`Alım bildirimi önizlemenin içinde, üst kenardan ${bildirim.pay} px (${bildirim.metin.trim()})`);
    else fail(`Alım bildirimi yok ya da önizlemenin kenarına biniyor (${JSON.stringify(bildirim)})`);
    const cekim = await page
      .waitForFunction(() => Number(document.querySelector('[data-testid="dekor-salonda"]')?.getAttribute('data-kare') ?? 0) > 0, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (cekim) pass('Dekor önizlemesi salondaki yerinden çekiliyor (ayrı kamera)');
    else fail('Dekor önizlemesi salondan çekilmedi — kutu boş kalır');
    await tikla('[data-testid="shop"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
    await page.waitForSelector('[data-testid="shop-panel"]', { state: 'detached', timeout: 5000 });
    const ka = await say();
    await page.waitForTimeout(1000);
    const kb = await say();
    if (kb.s - ka.s >= 1) pass(`Panel kapanınca sahne yeniden çiziliyor (${kb.s - ka.s} kare / sn)`);
    else fail('Panel kapandı ama sahne çizilmiyor — ekran donuk kalır');
  }

  // Dikey (portrait) orana çevir → responsive kamera/HUD hatasız mı
  await page.setViewportSize({ width: 412, height: 915 });
  await page.waitForTimeout(500);
  const portrait = await page.evaluate(() => window.__game());
  const canvasOk = await page.$('canvas');
  if (canvasOk && typeof portrait.tables === 'number') pass('Portrait orana uyum sağladı (canvas + durum okunuyor)');
  else fail('Portrait orana geçişte sorun');

  await seviyeKapat();
  if (seviyeEkraniGoruldu > 0) pass(`Seviye atlama ödül ekranı çıktı ve "Al" ile kapandı (${seviyeEkraniGoruldu} kez)`);
  else fail('Akış boyunca hiç seviye ödül ekranı çıkmadı');

  // F3b ÖDÜLLÜ 2× (D-150): "İzle, 2× al" gerçek tarayıcıda sahte reklamla uçtan uca — ödül
  // yalnız izlenince ve İKİ KATI verilir. Mantık bekçisi store'u sınıyor; burada sınanan kablo.
  {
    const once = (await page.evaluate(() => window.__game())).wallet;
    await page.evaluate(() => window.__setState({ levelUp: { level: 9, amount: 500, carryBefore: 0, carryAfter: 0 } }));
    await page.waitForSelector('[data-testid="level-up-izle"]:not([disabled])', { timeout: 5000 });
    await page.click('[data-testid="level-up-izle"]'); // `tikla` DEĞİL: o, açık seviye ekranını "Al" ile kapatır
    await page.waitForSelector('[data-testid="level-up"]', { state: 'detached', timeout: 5000 });
    const sonra = (await page.evaluate(() => window.__game())).wallet;
    const odullu = (await page.evaluate(() => window.__ads.durum())).odullu;
    // Eşik 1× (500) ile 2× (1000) ARASI: pencere boyunca tick kasayı birkaç ₺ oynatır (ölçüldü: +999,x ve +1005).
    if (sonra - once >= 900 && odullu >= 1) pass(`"İzle, 2× al" seviye ödülünü ikiye katladı (+${Math.round(sonra - once)} ₺, ödüllü ${odullu})`);
    else fail(`"İzle, 2× al" 2× vermedi (+${Math.round(sonra - once)} ₺, ödüllü ${odullu})`);
  }

  // Y-16/Y-17: ödül ekranından SONRA geçişli yok. Soğuma dolu; (a) gerçek parayla 💎 → "Harika!" →
  // mağazayı kapat, (b) panel açıkken çevrimdışı ödülü → "Al" → paneli kapat. İkisinde de sayaç sabit.
  {
    // Önceki seviye ekranının bayrağı hâlâ kalkık: bir kapanışla boşaltılır, yoksa (a) onu tüketip mutasyonu örter.
    await adPaneliAcKapa();
    await page.evaluate(() => window.__ads.saat(180_000));
    const g0 = (await page.evaluate(() => window.__ads.durum())).gecisli;
    await tikla('[data-testid="shop"]');
    await tikla('[data-testid="shop-tab-paket"]');
    const al = '[data-testid="paket-al-kiraathane_elmas_25"]';
    await page.waitForSelector(`${al}:not([disabled])`, { timeout: 5000 });
    await page.click(al);
    await page.waitForSelector('[data-testid="satin-odul"]', { timeout: 5000 });
    await page.click('[data-testid="satin-odul-tamam"]');
    await tikla('[data-testid="shop"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
    await page.waitForSelector('[data-testid="shop-panel"]', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(200);
    const g1 = (await page.evaluate(() => window.__ads.durum())).gecisli;

    await page.evaluate(() => window.__ads.saat(180_000));
    await tikla('[data-testid="gear"]');
    await page.waitForSelector('[data-testid="menu"]', { timeout: 3000 });
    await page.evaluate(() => window.__setState({ offlineEarned: 500 }));
    await page.waitForSelector('[data-testid="offline-ok"]', { timeout: 5000 });
    await page.click('[data-testid="offline-ok"]');
    await page.waitForSelector('[data-testid="offline"]', { state: 'detached', timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="menu"]', { state: 'detached', timeout: 3000 });
    await page.waitForTimeout(200);
    const g2 = (await page.evaluate(() => window.__ads.durum())).gecisli;
    if (g1 === g0 && g2 === g0) pass(`Ödül ekranından sonra geçişli yok: 💎 alımı + çevrimdışı ödül (${g0}→${g1}→${g2})`);
    else fail(`Ödül ekranından sonra geçişli çıktı (💎 alımı ${g0}→${g1}, çevrimdışı →${g2})`);
  }

  // F4a REKLAMLARI KALDIR (D-152): mağazanın Paketler sekmesinden sahte arka uçla satın alınır;
  // ödül kartı çıkar, düğme "Alındı" olur ve soğuma dolu olsa da panel kapanışı artık geçişli göstermez.
  {
    await tikla('[data-testid="shop"]');
    await tikla('[data-testid="shop-tab-paket"]');
    const al = '[data-testid="paket-al-kiraathane_reklamsiz"]';
    await page.waitForSelector(`${al}:not([disabled])`, { timeout: 5000 });
    await page.click(al);
    // F4c-4: gerçek parayla alımın karşılığı ekranda — ödül kartı "Harika!" ile kapanır, kart "Alındı" olur.
    await page.waitForSelector('[data-testid="satin-odul"]', { timeout: 5000 });
    await page.click('[data-testid="satin-odul-tamam"]');
    await page.waitForFunction((s) => document.querySelector(s)?.textContent?.includes('Alındı'), al, { timeout: 5000 });
    await tikla('[data-testid="shop"]'); // D-177: açık sekmeye yeniden dokunmak kapatır
    await page.waitForSelector('[data-testid="shop-panel"]', { state: 'detached', timeout: 5000 });
    await page.evaluate(() => window.__ads.saat(180_000));
    const r0 = await page.evaluate(() => window.__ads.durum());
    const r1 = await adPaneliAcKapa();
    if (r1.reklamsiz && r1.gecisli === r0.gecisli)
      pass(`Reklamları Kaldır: satın alındı, soğuma dolu panel kapanışı reklamsız (${r0.gecisli}→${r1.gecisli})`);
    else fail(`Reklamları Kaldır tutmadı (reklamsız ${r1.reklamsiz}, geçişli ${r0.gecisli}→${r1.gecisli})`);
  }

  if (consoleErrors.length === 0) pass('Konsol hatası yok');
  else fail(`Konsol hataları: ${consoleErrors.slice(0, 5).join(' | ')}`);
} catch (e) {
  fail('İstisna: ' + e.message);
} finally {
  await browser.close();
}

console.log('\n=== Duman Testi Sonuçları ===');
for (const [s, m] of results) console.log(`  [${s}] ${m}`);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} geçti.`);
process.exit(failed ? 1 : 0);
