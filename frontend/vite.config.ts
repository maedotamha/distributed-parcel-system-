
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    strictPort: true, // Fail if port is in use
    hmr: {
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
    }
  }
})
