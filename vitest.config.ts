import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import { mergeConfig } from 'vite'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'istanbul',
        reporter: ['json', 'lcov', 'text'],
        reportsDirectory: 'coverage',
      },
    },
    resolve: {
      alias: {
        'three-custom-shader-material/vanilla': 'three-custom-shader-material/vanilla/dist/three-custom-shader-material-vanilla.cjs.js',
      },
    },
  }),
)
