# Düzeltme W2 — Kat 2 personel erişimi · para yığını · tek tepsi (2026-11-18)

Kaynak: `1-kat2-mantik.md` #1, #4 · `4-oynanis.md` #5, #11. Kusur düzeltmesi; config sayısı değişmedi. Commit yok.
Dosyalar: `src/game/kat.ts`, `src/game/kat2Dongu.ts`, yeni bekçi `tests/tarama-w2-personel.test.ts` (50 test).
`src/components/three/kat2/yol.ts`'e gerek olmadı.

## Ne değişti

| # | kusur | düzeltme |
|---|---|---|
| 1 | Garson `k2tavla9/10/11`e, bulaşıkçı `k2tavla1/3/9/10/11`e varamıyordu (hedef sıralar arası 0,26 br şeritte; ızgara oraya indiremiyor, aktör duvar dibinde duruyordu) | `Kat2YolAgi.masaNoktasi(m)` (kat.ts): önce eski +z önü; oraya varılamıyorsa erişim kutusu içinde, gövde katıya değmeyen, yürüme alanındaki ve dibinde (≤ 1,5 hücre) ocağa bağlı açık hücre bulunan, öne en yakın nokta (0,05 br tarama, masa başına önbellek). `garsonMasaNoktasi` kalktı; garson + bulaşıkçı bunu kullanıyor. Okey masalarının noktası değişmedi (10/10 eski nokta). Tavla: iç sütun x ≈ 8,2, dış sütun x ≈ 11,3 (koridor). |
| 4 | Kalkış parası her seferinde yeni yığın açıyordu (1 sa → 665 yığın) | `yiginaEkle` (kat2Dongu.ts): kalkış, kahve (`kahveOde`) ve lavabo aynı noktadaki yığına ekler. Nokta başına tek yığın, liste ≤ 22 masa + lavabo. |
| oyn. #11 | Tavla yığını sıralar arasına düşüyordu (yürünmez) | `paraDusmeYeri` tavla: masanın salonun ortasına bakan yanı, `m.x − sign(m.x)·TAVLA_PARA_DX` (1,8 br), z = masanın z'si. Sv çerçevesi öbür yanda olduğundan çakışma yok (`kat2-masasv` bekçisi yeşil). Oyuncu her tavla yığınının üstüne yürüyebiliyor. |
| oyn. #5 | Kat 1'de çay taşıyan oyuncu Kat 2'de tam kapasite kahve alabiliyordu (tepside 8 / kap. 4) | `Kat2Girdi.digerTepsi?` (Kat 1 tepsisinde taşınan). Ocaktan kahve ve masadan kirli alırken boş yer `kat2TepsiBos(kap, digerTepsi, d)`. Yardımcılar: `kat2TepsiDolu(d)`, `kat2TepsiBos(...)`, `kat2TepsiBosalt(d)` (kahve temiz havuza döner). |

## Store / HUD bağlantısı (bu iş başka ajanlarda)

- **store.ts (Kat 2 dalı, `kat2Tick` çağrısı ~1080):** `digerTepsi: s.tray + s.trayFood + s.carriedDirty` geçilmeli. Geçilmezse varsayılan 0'dır, düzeltme oyunda **etkisiz kalır**.
- **Kat 1 alımı (tick.ts / rules, ters yön):** Kat 1 kapasitesi `kat2TepsiDolu(s.kat2Dunya)` kadar azaltılmalı (Kat 2 kahvesiyle Kat 1'e inen oyuncu için).
- **HUD:** Kat 2'deyken (`s.kat === 2`) tepsi sayacı `s.kat2Dunya.tepsi` (kahve) + `s.kat2Dunya.tepsiKirli ?? 0` okumalı, Kat 1'in `tray`/`trayFood` düğmeleri gizlenmeli. Boşalt düğmesi:
  `useGame.setState(s => ({ kat2Dunya: kat2TepsiBosalt(s.kat2Dunya) }))`. HUD.tsx bunu kullanıyor (satır 229/483).
- **Para.tsx:** Yığınlar artık birleşiyor: aynı `id` durur, `miktar` büyür. Yeni yığın yalnız boş noktada açılır.

## Bekçi + mutasyon (`tests/tarama-w2-personel.test.ts`)

Bekçiler: 22 masa × (tek garson servis + tek bulaşıkçı toplama) ≤ 30 sn · yaklaşma noktası erişimde ve ocaktan varılır ·
oyuncusuz 1 sa yığın sayısı = farklı nokta sayısı ≤ 23, para korunur · her tavla yığınına yürünür · tek tepsi (ocak + kirli) · yardımcılar.

| mutasyon | sonuç |
|---|---|
| M1 yaklaşma = eski +z önü | 8 kırmızı (garson 9/10/11 · bulaşıkçı 1/3/9/10/11 = taramanın listesi) |
| M2 "dibinde bağlı açık hücre" şartı yok | 2 kırmızı |
| M3 kalkış yeni yığın açar | 1 kırmızı |
| M4 tavla yığını yine sıralar arası | 1 kırmızı |
| M5 ocak alımı Kat 1 tepsisini saymaz | 1 kırmızı |
| M6 kirli alımı Kat 1 tepsisini saymaz | 1 kırmızı |

Kaçan mutasyonlar kodu sadeleştirdi: "dar şerit" komşu sınaması, durma payı (0,15) ve gövde payı (0,05) hiçbir sonucu
değiştirmiyordu, kaldırıldı. Şeridi "dibinde bağlı açık hücre" şartı zaten eliyor.

## Ölçüm (`tools/olcum-kat2-isleyis.ts`, IS_TUR=2, config olduğu gibi)

Kısa koşu (`OLCUM=kisa`, 43 sn): ufuk kısa olduğu için Kat 2 "bitmedi", yalnız akış denetimi. **Tam koşu** →
`docs/olcum-kat2-isleyis-final-tarama.txt` (147 sn, damgalar temiz):

| ölçü | önce (`olcum-kat2-isleyis-final.txt`) | sonra |
|---|---|---|
| **KAT 2 BİTER** | **8,11 sa** | **8,06 sa** |
| zincir biter · yükseltme biter | 4,91 · 4,80 sa | 4,90 · 4,79 sa |
| ilerleme servis % | %84 | %92 |
| plato Sv1 / Sv5 coin/dk (bulaşık yok) | 1.751 / 2.696 | 1.784 / 2.745 |
| plato Sv1 / Sv5 servis % | %87 / %86 | %95 / %92 |
| plato garson payı (Sv1) | %74 | %84 |

Süre yalnız ~3 dk kısaldı (bot tavlalara kendisi de servis ediyor). Servis oranı belirgin arttı. D-200/D-201 sayıları bu kusuru
içeriyordu; tempo kararı gerekirse varyant kapısından geçmeli. Burada denge değişikliği yapılmadı.

## Test durumu

`npx vitest run` (eşzamanlı düzenlemeler sürerken): 2.228 testten 2 kırmızı.
- `tests/kat2-salon.test.ts:198`: **bu düzeltmenin beklenen sonucu.** Test eski tavla yığın yerini (`z + TAVLA_PARA_DZ`) bekliyor.
  Dosyanın sahibi şuna çevirmeli: `expect(d.paralar[0]).toMatchObject({ x: T1.x - TAVLA_PARA_DX, z: T1.z })`. Sonra
  `TAVLA_PARA_DZ` (kat.ts, artık oyunda kullanılmıyor) silinebilir.
- `tests/kat2-yol.test.ts` (grup yolu): tek başına koşunca yeşil. Eşzamanlı görsel düzenlemelerden kaynaklanan geçici kırmızı.
  `tests/kat2-altyapi` ve `kat2-masasv` kayıt testleri bir ara kırmızıydı (save.ts düzenlemesi), son koşuda yeşil.
