# Düzeltme W5: güvenlik, yayın bayrağı, lint, Firestore kuralı (tarama 6: #1, #2, #10, #11, #12, #14)

Tarih: 2026-11-18 · Taban: `main` @ 8bfc8ba · Commit/push YOK (orkestratör toplar). `package.json` sürümü değişmedi (1.0.7).

## Yapılanlar

| # | iş | dosya | sonuç |
|---|---|---|---|
| 2 | Capacitor açığı GHSA-rvm3-566m-v7fv (`>=8.3.5 <8.4.3`, critical) | `package.json`, `package-lock.json` | `@capacitor/core`, `cli`, `android`, `ios` **8.4.0 → 8.6.2** (en son 8.x, dördü aynı sürüm). Eklenti peer'ları uyumlu: admob 8.1.0 (peer yok), firebase/analytics 8.6.0, app 8.1.1, preferences 8.0.1, RevenueCat 13.6.1, `bulut-kayit` hepsi `@capacitor/core >=8.0.0`. |
| 2 | iOS yerel çerçeve | `ios/App/CapApp-SPM/Package.swift` | `capacitor-swift-pm` `exact: "8.4.0"` → `"8.6.2"` (`npx cap sync ios` üretti). **iOS'ta açık bu satırdan geliyordu**; Codemagic `ios:sync` zaten yeniden üretirdi ama depodaki dosya artık doğru. Yollar düz bölülü kaldı (tek satır fark). |
| 2 | Android eşitleme | `android/` | `npx cap sync android` başarılı (5 eklenti). Takip edilen dosyada fark yok (Android çerçevesi Gradle'da `node_modules`'tan geliyor). |
| 12 | `npm audit fix` (`--force` YOK) | `package-lock.json` | Doğrudan bağımlılıkta major sıçrama yok. Geçişli güncellemeler üst paketlerin aralığında: `tar` 7.5.23, `fflate` 0.6.11, `glob` 14, `minimatch` 11, `rimraf` 6.1.4; geliştirme tarafı `vite` 8.0.16→8.3.8, `vitest` 4.1.8→4.1.12, `eslint` 10.4→10.15, `typescript-eslint` 8.73. **Kalan: 0 açık** (`npm audit --omit=dev` ve tam `npm audit`). |
| 1 | 1.1 Kat 2 bayrağı | `codemagic.yaml` | `vars`: `VITE_KAT2: "1"`. Yeni adım "Yayın derlemesinde Kat 2 açık, deneme düğmesi yok": `grep -qE 'VITE_KAT2:.?1.?[,}]'` yoksa düşer; `set-deneme-kat1` varsa düşer. |
| 1, 14 | Android yayın hattı | `tools/play-hazir-mi.mjs` | Derleme env'i `VITE_KAT2: '1'`. Derlemeden sonra aynı iki bekçi (Kat 2 bayrağı var, deneme düğmesi yok), `test:!1,birim` bekçisinin yanında. |
| 11 | Lint | `eslint.config.js`, `tools/kat2-esya.tsx` | `tools/kat2-*.tsx` için ayrı blok: `react-hooks/immutability` ve `react-refresh/only-export-components` kapalı (`src/` kuralları değişmedi). `kat2-esya.tsx`'teki kullanılmayan `CAMERA_LOOK_Y` import'u silindi (tek satır). Maket araçlarından 68 hata → 0. |
| 10 | Firestore kuralı | `firestore.rules` | `kisa(alan)` işlevi: `surum/platform/dil/cihaz/ilerleme` yoksa geçer, varsa `string` ve `size() <= 200`. `metin` 1–1000 aynen. İstemcinin gönderdiği değerlerin hepsi kısa metin (`GeriBildirimKutusu.tsx:30-34`). **DEPLOY GEREKLİ** (`firebase deploy --only firestore:rules`); yapılmadı. |

## Bildirilen (dokunulmadı)

- **#14 `denemeKat1Bitir`** (`src/game/store.ts:556`) hâlâ koşulsuz store eylemi. `store.ts` başka ajanda; `VITE_DENEME` arkasına alınması önerilir. Düğme yayında yok, yeni bekçiler sızmasını engelliyor.
- **Paket boyutu:** `index` 489,71 kB (tarama 6: 445,70). Artışın kaynağı eşzamanlı `src/` değişiklikleri ya da vite 8.3 olabilir; ayrıştırılmadı.
- `npm install` uyarısı: `esbuild@0.28.2` kurulum betiği `allowScripts` dışında. Derleme etkilenmedi (vite 8 rolldown kullanıyor).

## Denetim çıktıları

| Denetim | Sonuç |
|---|---|
| `npm audit --omit=dev` / `npm audit` | 0 / 0 açık (önce 9 → 7 → 0) |
| `npx cap sync android` · `npx cap sync ios` | Başarılı |
| `VITE_KAT2=1 npm run build` (tsc -b dahil) | Başarılı · tek uyarı KareTavani 954 kB > 500 kB (eskiden de vardı) |
| dist bekçileri | `VITE_KAT2:\`1\`` var, `set-deneme-kat1` yok |
| Mutasyon 1: bayraksız derleme | Kat 2 bekçisi **yakaladı** |
| Mutasyon 2: `VITE_KAT2=1 VITE_DENEME=1` derleme | Deneme düğmesi bekçisi **yakaladı** |
| `npm run lint` | 2 hata, ikisi de `src/components/ui/HUD.tsx:8-9` (kullanılmayan `kat2Gorevleri`, `Kat2Ayar`): başka ajanın süren düzenlemesi. Maket araçlarından 0. |
| `npx vitest run` | 120 dosya / 2208 test: **12 hata, 5 dosya** (`i18n`, `kat2-altyapi`, `kat2-masasv`, `kat2-salon`, izlenmeyen `tarama-w2-personel`). Temiz HEAD worktree'sinde YENİ `node_modules` ile ilk dördü **60/60 geçti** → hatalar eşzamanlı `src/` düzenlemelerinden, bağımlılık güncellemesinden değil. |

## Orkestratöre notlar

- 1.1 sürüm artışı (`package.json` → 1.1.0) yapılmadı, kullanıcı kararı bekliyor.
- Cihazda duman + reklam/IAP denemesi Capacitor 8.6.2 ile yapılmalı (8.4 → 8.6 minor; değişiklik notları okunmadı).
- Firestore kuralı deploy edilmeden REST yazma açığı sürüyor.
