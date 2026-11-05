import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Inline small assets into the plugin JS so host pages don't need extra files.
    assetsInlineLimit: 20480,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'AssisPlugin',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  }
})