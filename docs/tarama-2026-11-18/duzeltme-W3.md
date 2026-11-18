# Tarama 2026-11-18 · Düzeltme W3 — Performans (görsel değişiklik YOK)

> Kaynak: `3-performans.md` §3 adayları. Gölge (#1) kapsam dışı — kullanıcı kararı (D-073).
> Dokunulan: `src/components/three/` altı (Scene, Customers, KayActor, Kat2, kat2/Grup·Balon·Bulasik·SvIsaret·Para,
> yeni `katKatmani.tsx`, yeni `kat2/masaIndeks.ts`). Mantık (`tick`, store, kat2Dongu) değişmedi. Commit yok.

## Ölçüm damgası

- Araç: `scratchpad/t3/olc.mjs` (A/D/E/F kipleri, port 4302'ye çevrildi) + `ilk.mjs` (kat girişi en uzun kare) + `kontrol.mjs`
  (40'a kadar kat geçişi sonrası doku/iskelet/animasyon denetimi) + `sifirla.mjs` (Kat 2 kapanış yolu).
- Telefon görüntüsü 412×915 · dpr 2 · **CPU 4× kısık** · gölge 2048 açık · fps tavanı kapalı (`?f2golge=2048&f2fps=0`) · DEV derlemesi.
- **Yalıtım:** başka ajanlar repoyu eşzamanlı düzenlediği için ölçüm repo kopyasında yapıldı: A = `HEAD` anlık görüntüsü,
  B = aynı görüntü + yalnız W3 dosyaları (HMR kapalı). Makine paylaşımlı, mutlak ms koşudan koşuya ±%30 oynuyor →
  kare süresi **ABAB sırayla** (her turda sunucu yeniden kalkar) ölçüldü; tabloda tur aralığı yazılı.

## Önce / sonra

| ölçü | önce (A) | sonra (B) | not |
|---|---|---|---|
| **S3 Kat 2 tam — kare ort (ms)** | 34,0–42,1 | **29,3–33,5** | ABAB 3 tur × 2 dilim |
| S3 — kare p95 (ms) | 47,8–55,5 | **36,9–49,5** | |
| S3 — iş ort (useFrame + render, ms) | 31,2–38,5 | **27,3–29,5** | ≈ −4…−9 ms (~%20) |
| S3 — iş p95 (ms) | 36,3–49,5 | **32,7–35,9** | |
| S3 — `scene.updateMatrixWorld` (ms) | 8,6 (gizli Kat 1 takılı) | **3,7** | E kipi; "Kat 1'i sahneden ayır" kolu artık fark üretmiyor (3,66 vs 3,71) |
| S3 — Kat 1 müşteri useFrame (ms/kare) | 0,93 | ~0 (erken dönüş) | E kipi |
| S3 — Kat 2 grup useFrame, 22 masa (ms/kare) | 0,33 | **0,07** | E kipi (`find` → indeks, gömlek rengi her kare değil) |
| S3 — zustand `set` p50 (ms) | 0,7 / 0,7 / 0,8 | 0,6 / 0,6 / 0,7 | F kipi ABAB; küçük ama 3 turda da aynı yönde |
| S3 — çizim çağrısı ana + gölge | 163 + 221 | 163 + 221 | **aynı** → çizilen sahne değişmedi |
| S2 Kat 1 geç — iş ort (ms) | 21,9–23,3 | 21,5–23,9 | ABAB 2 tur: **gerileme yok** |
| S2 — çizim çağrısı | 109 + 258 | 109 + 258 | aynı |
| **GPU doku, 40 kat geçişi (D kipi)** | 71 → **780** (+16/tur, doğrusal) | 65 → 137 (5. tur) → **140** (40. tur) | sızıntı kapandı; kalan +3/35 tur Kat 1 müşteri havuzunun dolması |
| GPU geometri, 40 geçiş | 380 → 511 | 380 → 499 | önceki rapordaki yavaş artış (kaynağı W3 dışı) aynen |
| JS heap (GC sonrası, 40 geçiş sonu) | 76,9 MB | 77,2 MB | Kat 2'yi takılı tutmanın bellek bedeli ölçülemeyecek kadar küçük |
| **Kat 2'ye giriş — en uzun kare (ms)** | 1.315 (D) · 1.063–1.369 (`ilk.mjs`, 2./3. giriş) | **56** (D) · 81–132 (`ilk.mjs`) | ilk girişten sonra |
| Kat 2'ye İLK giriş — en uzun kare (ms) | 670–703 | 576–673 | değişmedi (ilk kurulum kaçınılmaz, aşağıda) |
| Kat 1'e dönüş — en uzun kare (ms) | 80–134 | 46–65 | |
| konsol hatası | 0 | 0 | |

Doğruluk denetimi (B): 6 tur 1↔2 geçişten sonra Kat 2'deki 20 görünür iskeletin kol kemiği 600 ms içinde oynuyor
(T-poz/donma 0); doku sayısı iki katta da sabit 82; Kat 2 kapanınca (`__resetGame`) katman sökülüyor, doku 85 → 44'e iniyor,
4 tur sıfırla-gir döngüsünde sabit.

## Yapılanlar

1. **Doku sızıntısı (#3).** Klonlanan iskeletlerin kemik dokusu (`Skeleton.dispose`) gerçek sökülmede bırakılıyor:
   `KayActor` (garson/bulaşıkçı/kahve ustası, kıyafet değişiminde sahip), `kat2/Grup` (grup gövdeleri + gövdeye özel
   materyal), Kat 2 katmanının tamamı sökülürse `KatKatmani` (yerleşim efekti, çocuklar ayrılmadan önce).
2. **Gizli kat bedava (#2).** Yeni `katKatmani.tsx`: kat kök grubu gizliyken `updateMatrixWorld`ü erken döner (r184'te
   `matrixWorldAutoUpdate=false` çocukları yine dolaştığı için yetmiyordu); görünür olduğu ilk karede grup kendi matrisini
   tazeleyip `force`u alt ağaca indirir → bayat matris yok. `useKatGizli()`: Kat 1 müşteri döngüsü, Kat 1 personelinin
   iki useFrame'i ve karıştırıcısı (`mixer.update` gizliyken boşa döner) Kat 2'deyken çalışmıyor. Sim (`tick`) etkilenmez.
3. **Giriş takılması (#4).** Kat 2 ilk girişten sonra takılı-gizli kalıyor: React 19.2 `Activity hidden` → gizliyken
   useFrame ve store abonelikleri sökülü (Kat 1'e kare/`set` yükü bindirmez, S2 ölçümü gerilemedi), nesneler ve
   kurulmuş gövdeler yerinde. `Kat2Sahne` öğesi sabit (`useMemo`) — yoksa her kat değişiminde bütün Kat 2 ağacı yeniden
   render oluyordu (ilk denemede giriş hâlâ ~620 ms'ydi, bu düzeltmeyle 81–132 ms). Gizlenirken GPU kaynağı bırakılmıyor
   (`useSokulurkenBirak`): materyal bırakılsaydı dönüşte gölgelendirici yeniden derlenirdi. Para yığınları: dönüşte
   yeniden bağlanan efekt aradaki farkı "toplandı" sanıp uçuş/yazı üretmesin diye dönüşün ilk 250 ms'si yalnız kayıt.
   Kat 2 kapanırsa (sıfırlama/kayıt yükleme) katman söner, sonraki girişte temiz kurulur.
4. **Seçiciler / kare işi (#7, #8, #9).** `kat2/masaIndeks.ts`: dizi kimliği başına tek id → masa haritası (`masaBul`)
   ve oyundaki masaların bit maskesi; `Balon`/`Bulasik`/`Kat2.Masalar` seçicileri dizgi/dizi üretmeyen sayı seçicisi;
   `SvIsaret` `kat2SvCanli`yi `kat2` kimliği değişince, `wallet.toNumber`ı cüzdan kimliği değişince hesaplıyor;
   `useKalkisIzle` her tick yeni `Map` kurmuyor; `Grup` gömlek rengini yalnız yeni ziyarette yazıyor; `Customers` balon
   sayacı her kare yeni dizi değil.

## Yapılmayanlar (gerekçeli)

- **#5 statik matris dondurma — uygulanmadı.** B'de tüm sahneyi dondurma ÜST SINIRI S3'te `umw` 3,7 → 1,7 ms, toplam iş
  −0,7…−1,9 ms (gürültü bandında). Statik Kat 2 kabuğu bunun yalnız bir kısmı; r3f donmuş nesnenin prop değişiminde matrisi
  tazelemiyor (risk) — kazanç gürültünün altında kaldığı için kural gereği eklenmedi.
- **#6 geometri birleştirme / instancing** — görünüş Sv1-5 setleri ister, düşük riskli değil; W3 kapsamı dışında bıraktım.
- **İlk Kat 2 girişi (~600–700 ms, 4×)** aynı kaldı: ilk kurulum (React montajı + 22 masanın gövde klonları). Seçenekler
  (Kat 1'deyken boşta gizli ön-kurulum ya da gövde kurulumunu karelere yaymak) görünür davranış/bellek kararı içeriyor.
- **#1 gölge** — kullanıcı kararı.

## Doğrulama

- `npx vitest run`: 2231/2232 geçti; tek kırmızı `tests/tarama-w4-rehber.test.ts` (HUD bağlantısı, `src/components/ui/HUD.tsx`
  — W4'ün eşzamanlı işi, W3 dosyası değil).
- `DUMAN_PORT=4002 npm run duman`: **78/78** + İngilizce 4/4, çıkış 0 (Kat 2 merdiven/bant/dönüş ve görev hattı denetimleri dahil).
- `tsc` (app): W3 dosyalarında hata yok (kalan 2 hata `src/game/kat.ts`, başka ajanın dosyası). `eslint` W3 dosyaları temiz.
