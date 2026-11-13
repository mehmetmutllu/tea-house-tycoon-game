# Ajan A notu — masa Sv mantığı + ölçüm

## SÖZLEŞME HAZIR (tsc temiz, `tests/kat2*` 111/111 yeşil)

`src/game/kat2Dongu.ts`
```ts
interface Kat2Ayar { ...; masaSv?: { okey: Kat2SvKol; tavla: Kat2SvKol } }
interface Kat2SvKol {
  fiyat: number[];              // fiyat[i] = Sv(i+1)'e ÇIKIŞIN fiyatı; fiyat[0] kullanılmaz (0)
  ucretCarpan: number[];        // indeks 0 = Sv1 = 1,0; uzunluk 5
  kahveAralikCarpan: number[];
  gelisAralikCarpan: number[];
  kahveFiyatCarpan?: number[];  // opsiyonel ölçüm kolu (yoksa 1)
  oturumCarpan?: number[];      // opsiyonel ölçüm kolu (yoksa 1)
  dolumSn?: number;             // tam dolum süresi; yoksa SV_DOLUM_SN = 3,5
}
interface Kat2Girdi { ...; masaSv?: Readonly<Record<string, number>> }   // masa id → 1..5; yok = 1
export function kat2SvTetikleri(ayar: Kat2Ayar, padsDone: readonly string[], masaSv: Readonly<Record<string, number>>): Kat2SvTetik[]
interface Kat2SvTetik { id /* 'sv:'+masaId */; masaId; tur: MasaTuru; sv /* şimdiki */; fiyat /* Sv+1'in */; x; z;
  w; d /* TAM genişlik/derinlik — inFrame'e yarısı */; etiket /* masaEtiketi(sv-1) → "Sv 1" */ }
export const masaSvOku(masaSv | undefined, id): number   // 1..5 kelepçeli
Kat2Cikti.olay.svAtlayan: string[]   // bu adımda Sv tetiği dolan masalar; kat2Tick Sv'yi ARTIRMAZ
```
- Dolum `dunya.padFill['sv:<masaId>']`de (pad deseni), çerçeve = `masaCercevesi(sv-1)` (Kat 1 masa yükseltme kutusu,
  `MASA_ISARET_R` + ok). **B için:** `GroundMarker` `label={etiket} arrow radius={MASA_ISARET_R}` aynı kutuyu çizer;
  ilerleme `padFill[id] / fiyat`.
- Yer: masanın YANINDA, salonun ortasından (x=0) uzak tarafta, z masanın hizası; ayak izi + 0,2 boşluk.

`src/game/kat.ts`: `Kat2Kayit.masaSv?: Record<string, number>` (yalnız Sv ≥ 2 yazılır) · `Kat2Kayit.gorev?: { idx; sayac }` ·
`KAT2_SV_MAX = 5` · `defaultKat2Gorev()` · `defaultKat2()` artık `masaSv: {}, gorev: {idx:0,sayac:{}}` içerir.
`src/game/save.ts`: doğrulama `masaSv` (tam sayı 2..5, bozuk düşer) + `gorev` (bozuk → baştan). saveVersion ARTMADI.
`src/game/store.ts`: `kat2Tick`e `masaSv: kat2.masaSv` (Kat 2'de + arka planda) · `svAtlayan` → `kat2SvAtla()` (export) ile
`kat2.masaSv` güncellenir · kayıt anlık görüntüsü `masaSv` kopyalar. `gorev` alanı store'da duruyor (D'nin; Claude bağlar).

## Kat 2 olay sayaçları (`Kat2Cikti.olay`, adım başına)
servis · kacan · kalkis · istek · padBitti (id|null) · dusen[] (₺) · kalkan[] (masa id) · garsonServis · tavlaServis ·
tavlaKacan · lavabo (₺) · **svAtlayan[] (yeni)**. Ocaktan alım için ayrı sayaç yok (tepsi farkından okunur).

## Mantık bitti (tsc + eslint temiz · `tests/kat2*` 169/169 · yeni `tests/kat2-masasv.test.ts` 13 test)
- Sv etkisi `kat2Tick`te: ücret × (kalkışta), kahve aralığı × (her yeniden sayımda), geliş aralığı × (kalkıştan
  sonraki boş kalma), opsiyonel kahve fiyatı × ve oyun süresi ×. `ayar.masaSv` yokken `olcum-kat2-akis` kısa koşu
  çıktısı HEAD ile birebir (diff boş).
- Tetik yeri: `x = m.x ± (yarı + 0,2 + hw)`, işaret salonun ortasından uzak yan; bekçi: masaya/oturağa/bütün Kat 2
  pad'lerine/yığın noktalarına/öteki Sv çerçevelerine değmez, kova genişliğinde (merdiven önü yol) değil, yürüme alanında.
- **B/Claude için not:** `kat2/yol.ts grupYolu` güney oturağına `m.x + 1,9`dan iner → x > 0 okey masalarında (k2okey3/4)
  grubun yolu Sv çerçevesinin üstünden geçer (yalnız görsel; zemin işareti). `ax = m.x - s·1,9` (s = sign(m.x))
  aynalanırsa çakışma kalkar. Ben değiştirmedim (B'nin dosyası).
- Mutasyon: bekçi 4/4 (tetik ×2 · Sv5 tetiği · ücret çarpanı · boşluk) · araç 2/2 (`SV_MUT=almaz`, `carpansiz`).

## Ölçüm bitti (tam koşu 764 sn, damgalar temiz) — rapor `docs/kat2-masasv-raporu-k2-s3.md`, ham `docs/olcum-kat2-masasv.txt`
Öneri UG + SB3T (ücret + geliş, tür payına göre "gelirin ~3 dk'sı"): gerçek Sv5 ×2,31 (%100 gerçekleşme), 5,32 sa,
medyan bekleyiş 3,5 dk. Kahve kolu taşıma tavanında: +%64 kâğıt → +%2 gerçek (servis Sv1'de bile %61). §Karar boş.
