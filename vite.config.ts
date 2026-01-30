import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Importante para Electron carregar assets com caminhos relativos
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Evita problemas com chunks em Electron
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false
  }
})
