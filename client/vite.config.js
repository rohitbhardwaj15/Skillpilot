import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Only group stable, rarely-changing core libs here so browsers
          // can cache them across deploys. Deliberately NOT grouping
          // three.js or recharts — those should stay wherever Vite's
          // default splitting puts them (inside the lazy page chunk that
          // actually imports them), so a login/profile/assessment visit
          // never has to download either library.
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion']
        }
      }
    }
  }
})
