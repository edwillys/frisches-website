import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/test/setup.ts'],
    },
    resolve: {
      alias: {
        'three-custom-shader-material/vanilla': 'three-custom-shader-material/vanilla/dist/three-custom-shader-material-vanilla.cjs.js',
      },
    },
  }),
)
