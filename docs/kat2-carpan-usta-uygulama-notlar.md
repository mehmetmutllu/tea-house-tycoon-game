# D-206 uygulama notları (commit #2 · K2-CARPAN + U-ESIT + B-UCLU)

Rapor: `docs/kat2-carpan-usta-raporu.md` · araç: `tools/olcum-kat2-carpan-usta.ts` (FINAL kipi eklendi).

## Sıra
1. Kod değişmeden önce araca birleşik emülasyon kolu `A+U-ESIT+B-UCLU` eklendi ve OLCUM=tam koşuldu
   (`docs/olcum-kat2-carpan-usta-emu-birlesik.txt`, damgalar temiz). TABAN raporla birebir (7,91 / 8,34 sa).
   Emülasyon: U0 7,40 sa (−%6,5) · U20 7,74 sa (−%7,2). Parmak izleri `EMU_IZ`e yazıldı.
2. Kod yazıldı; FINAL kipi (emülasyon kapalı, Usta store `buyMaster('k2:…')`ıyla) aynı parmak izini vermeli.

## Kod yeri
- `kat2Dongu.ts` — `Kat2Girdi.gelirCarpan / ustaMasalar / ustaCarpan` (yok = 1). Çarpan yığının YARATILDIĞI yerde:
  kalkış yığını `(ücret + birikim) × gelirK × ustaK`, `kahveOde` (kahveAninda) `ham × gelirK × ustaK`, lavabo `× gelirK`
  (Usta binmez). Çarpım sırası aracın kancasıyla aynı (`inc × m × u`). `kahveAninda` kapalıysa birikim ham kalır,
  kalkışta bir kez çarpılır. Usta yardımcıları: `kat2UstaId`, `kat2UstaMasalari`, `kat2UstaUygun`, `kat2UstaNoktalari`.
- `rules.ts` — `kat2UstaCarpan()` = aracın ESIT_PCT ifadesi (config'ten: `tableTip(tavan)`, `master.tipMult`, servis tavanı
  `stationSoftMaxLevel()` = 6 → +%20). `kat2Oran(…, mult)`; `CevrimdisiKat2.mult`.
- **Çevrimdışı Usta'yı GÖRMEZ:** Kat 1 `cevrimdisiGelir` tipTotal'ı `tipBase × seviye`den kurar (Usta çarpanı yok) →
  aynı kural Kat 2'ye. (Rapor planı `ustaMasalar`ı da öneriyordu; "Kat 1 görüyorsa" şartı tutmadı. Tavan ~170 sn'de
  bağladığı için ödenen tutar zaten değişmezdi.)
- `store.ts` — iki `kat2Tick` çağrısı `kat2GelirGirdisi(c.incomeMult, mastersOwned)` alır; `ustaAcilabilir` `k2:` kimliğini
  kabul eder (Kat 2 açık + masa açık + Sv5) → `buyMaster`/`buyMasterAd` değişmeden çalışır. `cevrimdisiGelir` mult geçirir.
- Kimlik `mastersOwned`ta `k2:<masaId>`; `metinKumesi` her metni korur → saveVersion artmadı (D-093 deseni doğrulandı).

## Kayıt uyumu (görev hattı)
- Disk kaydı `kat2.gorev`e `son` (son tamamlanan görevin kimliği, '' = yok) yazılır (`kat2GorevKaydiYaz`); canlı durum
  `{idx, sayac}` olarak kalır. Okurken `kat2GorevKaydiCoz` idx'i bugünkü hatta kimlikten kurar.
- `son` YOKSA (D-205 / deneme APK kaydı) idx sabit `KAT2_GOREV_SIRA_D205` sırasına göre okunur. Yeni idx = son tamamlanan
  görevin hemen ardı → arada yeni eklenen ara görevler sıraya girer; durumu zaten tamamsa açılıştaki boş adım ödülsüz
  geçer (hiçbir eski görev yeniden ödenmez). Sayaç yalnız aktif görev aynıysa korunur. saveVersion artmadı (additive).
- Göç `save.ts kat2GorevKaydi`de → yerel, yedek ve bulut kaydı aynı yoldan geçer (`kat2Sira` karşılaştırması da yeni idx'le).

## Görsel / UI (Kat 1 uyarlaması)
- `kat2/SvIsaret.tsx Kat2UstaIsaretleri`: Sv5 + Usta değil her açık masada `GroundMarker` ("Yükselt", 💎 pul, fiyat,
  yeşil bekleme dolumu) — Sv noktasıyla aynı yer kuralı (masanın uzak yanı, ayak izine 0,2), çerçeve `ustaCercevesi`.
  Dwell + kenar tetiği Kat 1 `TableMasterSpots`ın aynısı. Usta alınınca nokta düşer (Kat 1'de de Usta masasının ayrı işareti yok).
- Kat 1 `TableMasterSpots` useFrame'i artık yalnız Kat 1'de ölçer (Kat 2 koordinatıyla iki yazar `nearMaster`ı ezerdi).
- HUD `UstaModal`: `k2:` kimliğinde başlık "Masa N · Usta" (N = Kat 2 masa sırası), not "Bu masanın geliri kalıcı olarak
  +%20 artar". Hedefler'in Usta şeridi Kat 2'deyken Kat 2'nin Usta/masa sayısını gösterir (eskiden Kat 2'de gizliydi —
  `tarama-w4-rehber` bekçisi buna göre güncellendi).
- İlk Usta'dan sonra başlangıç paketi teklifi Kat 1'deki gibi bir kez çıkıyor (ortak `mastersOwned` sayımı) — beklenen.
- Kareler: `docs/kareler/kat2-usta-1-nokta.png` · `-2-modal.png` · `-3-usta-masa.png` (betik `tools/_kat2-usta-kare.mjs`).

## Mevcut bekçilerde beklenen değişiklikler
- `kat2-gorev`: hat uzunluğu üst sınırı 22 → 28 (B-UCLU 27 Sv'siz); "pad görevi adım sayar" örneği k2_s2okey2 → k2_s2okey6
  (k2_s2okey2 artık tek adım).
- `tarama-w4-rehber`: "Usta şeridi Kat 2'de yok" → "Kat 2'de Kat 2'nin Usta masalarını sayar".

## Mutasyonlar (`tests/kat2-carpan-usta.test.ts`, altısı da yakalandı)
M1 kalkış çarpanı silindi (2 test) · M2 Usta Sv eşiği Sv4'e gevşedi (2) · M3 kahveOde'dan Usta silindi (1) · M4 lavabo
çarpansız (2) · M5 eski kayıt göçü kaldırıldı (5) · M6 Usta lavaboya da (1).

## Açık not
- `npx tsc -b` HEAD'deki `Scene.tsx` ~1471 (`isitmaParcalari`/`meshSayisi` tipleri, ön kurulum commit'i) yüzünden hata veriyor —
  bu işten değil, dokunulmadı.
