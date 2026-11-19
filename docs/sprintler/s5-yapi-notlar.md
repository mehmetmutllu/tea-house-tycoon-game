# S5 YAPI — devir notu (2026-11-20, oturum kapanışı)

## Biten (kod + bekçi `tests/s5-yapi.test.ts`, 8/8; tam vitest 130 dosya / 2356 yeşil)
- **G-101** kuyu yarığı: basamak yanağa kadar (`kuyuBasamakYariEn`), kuyunun arka+ön perdesi + dibi (`Kat2.tsx MerdivenAgzi`).
- **G-110** ocak açma pad'i: `kat.ts` `OCAK_AL_DZ = 1.05` (önce 0,6; çerçeve tezgâhın altına giriyordu). `al` = alma noktası da → garson/oyuncu 0,45 öne aldı; erişim testleri yeşil.
- **G-113** kök: seviye atlayınca yeni KayKit gövdesi ilk kez isteniyor → `Model` Suspense'i 2-3 kare greybox'a düşüyor (seri karelerde görüldü, sürekli titreme YOK). Çözüm: `kitchenLook.mutfakGovdeleri()` + `Kitchen.tsx` önden `useGLTF.preload` (Kat 1 de düzelir).
- **G-116** köşe: dış duvar hat başına tek parça (`yapiOlcu.birlestir/disKenarlar`; eskiden parçalar 0,5 taşıp üst üste biniyordu) · bölme uçları dış duvar eksenine / dik bölmenin öbür yüzüne uzar (`bolmeCizimi`) · kova ara duvarları arka duvara kadar.
- **G-117** `kat2/TozDonusumu.tsx` (merdivenden çıkarıldı), `MerdivenDonusum` + `Kat2Lavabo` paylaşır.
- **G-118** `maketParts` `KlozetSimge` (lavabo levhası; Kat 1 WC perdesi de aynı bileşen).
- **G-121** bütün bölmeler alçak `ON_BOLME_H` 0,6 (`Bolme.tsx AlcakBolme` yatay/dikey). Not: kullanıcı "lavabo karşısındaki gibi" dedi → 0,6 alındı, brifteki 1,2 değil.
- Mutasyon 2/2 yakalandı (G-121 yan bölme 3,2 · G-101 basamak dar).

## Yarım / yeniden koşulacak
- **Duman koşulmadı** (`DUMAN_PORT=41xx npm run duman`).
- **Sonra kareleri + pano yok**: ilk "sonra" turu paralel ajanların HMR yeniden yüklemesiyle Kat 1'e düştü (çöp; `docs/kareler/s5-yapi-sonra-*` yeniden çekilmeli). Araç artık kendi sunucusunu HMR kapalı kaldırıyor:
  `node tools/s5-yapi-kare.mjs sonra merdiven-kose,ocak2-pad,salon2-genis,ust-0-17,yan-0-17,yan-17-0,lavabo-perde,kat1-wc-perde,lavabo-donusum,lavabo-acik` → pano `docs/kareler/s5-yapi-pano.png`. Son koşuda bir sayfa hatası (`at App`) görüldü, kaynağı incelenmedi — duman bunu göstermeli.
- Önce kareleri: `docs/kareler/s5-yapi-once-*` (G-118 damla önce = `once-salon2-genis`). `tools/_s5-yapi-mutfak-seri.mjs` G-113 seri aracı (silinebilir).

## Riskler
- Paylaşılan dosyalara dokunuldu: `Kitchen.tsx`, `kitchenLook.ts` (yalnız ekleme), `maketParts.tsx` (levha), `kat.ts` (yalnız OCAK yer sabiti).
- `kameraBakanBolme` artık çizimde kullanılmıyor (yalnız `kat2-g-turu` testi okuyor); D-198 G3 metni "yan bölme tam boy" eskidi → decisions'a G-121 kaydı gerekir.
