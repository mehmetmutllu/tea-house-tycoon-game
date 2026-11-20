# S5 NPC ajanı — DEVİR NOTU (2026-11-20, oturum kapanışı)

## Biten (commit edilmedi)
- **G-100 kök:** `kat2/yol.ts` `merdivenY` kuyunun ÖNÜNÜ (z ≥ AGIZ.on) kuyu dibi sayıyordu → geçitten (x ±0,9) salona
  giren grup y = −3,2'de, zeminin ALTINDA yürüyordu (iz: `docs/s5-npc-iz-once.json`, t 10-13 sn). Düzeltildi.
- **G-99:** çıkan grup artık `cikisYolu` (geliş yolunun ters + yan çıkış şeridi: kuyuda +0,45, kuyunun yanında +0,75,
  geçitte +0,7, önde +0,6) ile merdivene yürüyüp kuyuda İNERKEN söner (`cikisPozu`, `SONME_SN`). Eskiden 5,5 sn yürüyüp salonda sönüyordu.
- `kat2/Grup.tsx`: iki gövde takımı (masa/çıkan), kalkışta yer değiştirir; Sv5'te (boş 1,5 sn) yeni grup önceki oynarken
  çıkış takımıyla yola çıkar (`gelisGecen`, `gerekenOnce`, `ONCE_EN_COK` 24) → hiç ortada belirmez/kaybolmaz.
- Kanıt: `docs/kareler/s5-npc-once-pano.png` / `s5-npc-sonra-pano.png` (k2s2okey1 Sv1), iz araç `tools/s5-npc-iz.mjs`.
- Testler: `tests/kat2-yol.test.ts` + `kat2-g-turu.test.ts` yeşil (16/16). tsc: Grup/yol temiz.

## Devam turu (2026-11-20)
- **Bekçi `tests/s5-npc.test.ts` (15 test):** G-100 merdivenY kuyu dışı = 0 (ızgara + bütün geliş/çıkış yolları) · G-99 çıkış
  oturakta başlar, kuyu dibinde biter (y < −2,5), engel/kat/kova/Sv çerçevesi, kuyuya yalnız son bacakta girer, yalnız kuyuda
  söner · Sv1..5 + ilk geliş: ilk görünen u ≤ bir kare adımı, geliş sonunda oturakta. Mutasyon: eski merdivenY koşulu → 2 kırmızı;
  çıkış 5,5 sn'de kesilir → 1 kırmızı (geri alındı, yol.ts = HEAD).
- **G-109 kahve ustası yürür:** `kat2/kahveUstaYol.ts` (saf: yol ±1,3 br setin iki yanı, tezgâhın 0,45 arkası; Kat 1 çaycısıyla
  aynı faz/tempo `CAYCI_TEMPO`/`cayciHizCarpani`, yük = masalardaki açık kahve isteği, pişerken en az 1) + `Mutfak.tsx` yalnız
  `KahveUsta`. Bekçi 3 test; mutasyon: yol tezgâhın önünde → kırmızı, uçta tezgâha dönmez → kırmızı, yüksüzken yürür → kırmızı.
  Kare: `docs/kareler/s5-npc-g109-once.png` / `-sonra.png` (araç `tools/s5-npc-usta.mjs kare <ad>`, port 4120).
- **G-108 yama hazır, UYGULANMADI:** `docs/s5-npc/g108.patch` (tick.ts 8 navStep çağrısından `player, obstacles` + ctx `obstacles`
  + `tableSolids` içe alımı; layout.ts navStep `avoid/avoidSolids` gövdesi). Kat 2 eşdeğeri gerekmez (çarpışma yok). Yalıtılmış
  worktree'de: tsc temiz, **tam vitest 2356/2356 yeşil (kıran test yok)**. Bekçi taslağı `docs/s5-npc/g108-bekci.test.ts.txt`
  (oyuncu garsonun üstündeyken kare adımı ≤ serbest adım, servis aynı kare): yamalı yeşil · yamasız kırmızı (0,75 br sıçrama) ·
  yalnız masa rotasında avoid → kırmızı. Ana ağaçta `git apply --check` temiz; tick.ts/layout.ts dokunulmadı.
- **Perf (`tools/s5-npc-usta.mjs perf`, headless, tüm masalar açık, 22 masa):** oturan 64 gövde → ~925 çağrı, 505 k üçgen, iş ~16 ms;
  hepsi aynı anda kalkış+geliş (Sv5, en kötü hâl) 124 gövde → ~1400 çağrı, 920 k üçgen, iş ~26 ms. Gövde başına ~8 çağrı (2 mesh ×
  ana+gölge geçişleri). Gerçek oyunda masalar eş zamanlı değil; risk sürerse çıkan takımın gölgesi kapatılabilir (öneri).
- Kaza + onarım: worktree silinirken `git worktree remove` node_modules bağlantısının içine girip bir kısmını sildi; `npm install`
  ile geri kuruldu (lock değişmedi, eksik paket 0). Paralel koşular o arada hata verdiyse yeniden koşulmalı.

## Açık
- Uzak masada ilk grup gelişte hızlı yürür (bekçi gerçek hızı tolere ediyor); mantık değişikliği gerekirse varyant kapısı.
- Duman koşulmadı (orkestratör birleştirmede).
