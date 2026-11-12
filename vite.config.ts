// `defineConfig` VITEST'ten alınır: `vite`inki `test` alanını tanımıyor (TS2769).
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Sürüm adı tek kaynaktan (package.json) — geri bildirim kaydı hangi sürümden geldiğini taşır.
const SURUM = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __SURUM__: JSON.stringify(SURUM) },
  server: {
    watch: {
      // Gradle, APK derlerken android/ altını yeniden yazar; vite watcher'ı bu sırada scandir
      // hatasıyla ÇÖKÜYORDU (gece 2026-06-10: npm run apk → dev sunucu öldü). Native klasörler
      // web dev'in parçası değil — izleme dışı.
      ignored: ['**/android/**', '**/dist/**', '**/.claude/worktrees/**'],
    },
  },
  test: {
    // `.claude/worktrees/` altında EnterWorktree ile açılan çalışma kopyaları duruyor; onların
    // `tests/` klasörü de bulunuyordu ve `npm run test` her şeyi İKİ KEZ çalıştırıyordu
    // (2026-09-07: 277 yerine 556 test). Worktree kendi kökünde test çalıştırır, buradan değil.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/worktrees/**'],
    // Tam pakette (73 dosya paralel) ağır testler 5 sn varsayılanına takılıyordu — üç turda üç ayrı
    // test (günlük 💎 tavanı · sıra kilidi git · nav 3.000 sorgu), hepsi tek başına yeşil (T9d).
    testTimeout: 20_000,
  },
})
