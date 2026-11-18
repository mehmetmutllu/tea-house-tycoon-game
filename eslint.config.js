import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // android/: Capacitor derleme çıktısı (native-bridge.js kopyaları) — kaynak değil.
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Bilerek kullanılmayan parametreler `_` ile işaretlenir (imza sözleşme gereği durur:
      // ör. `defaultFloorTheme(_area)` — B2'de cevap alandan bağımsız, B3'te yine alana bakacak).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // R3F sahne kodu: three nesneleri (malzeme, grup, havuz) useFrame içinde YERİNDE değiştirilir —
    // R3F'in belgelenmiş kalıbı; React Compiler kullanılmıyor. Mesh bileşenleri yardımcılarıyla aynı
    // dosyada durur (HMR uyarısı yalnız geliştirmeyi ilgilendirir).
    files: ['src/components/three/**/*.tsx'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Kat 2 maket araçları (tools/kat2-*.tsx): tek seferlik kadraj sayfaları, HMR'li bileşen modülü değil;
    // kadraj kamerası useThree'den alınıp yerinde ayarlanır (R3F kalıbı, yukarıdaki sahne bloğu gibi).
    files: ['tools/kat2-*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
