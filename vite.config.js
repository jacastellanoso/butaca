import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Solo en desarrollo: /api/* se reenvía al API Gateway. Para el navegador
    // la petición es del mismo origen (localhost:5173), por eso no aplica CORS.
    // En producción el front usa VITE_API_GATEWAY_URL y el gateway aplica CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})