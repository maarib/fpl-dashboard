import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/fpl-dashboard/
  base: '/fpl-dashboard/',
  plugins: [react()],
})
