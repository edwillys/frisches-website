import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { imagetools } from 'vite-imagetools'
import { templateCompilerOptions } from '@tresjs/core'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(templateCompilerOptions),
    vueJsx(),
    vueDevTools(),
    imagetools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Put Three.js example loaders (GLTFLoader, DRACOLoader, etc.) in a separate chunk
            if (id.includes('three/examples')) return 'three-loaders'
            // Split Three core from example utilities
            if (id.includes('three')) return 'three-vendor'
            // Split Tres packages further if needed
            if (id.includes('@tresjs/cientos')) return 'tres-cientos'
            if (id.includes('@tresjs/core')) return 'tres-core'
            if (id.includes('@tresjs')) return 'tres-vendor'
            if (id.includes('gsap')) return 'gsap'
            return 'vendor'
          }
        }
      }
    }
  }
})
