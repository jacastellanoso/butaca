import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { RUTAS_APLICACION } from './src/lib/rutas.js'

const EMOCIONES = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']

/**
 * Rutas reales (/grupos, /perfiles…) en un sitio estático sin reglas de
 * reescritura: después del build se copia index.html a <ruta>/index.html para
 * cada pantalla, así entrar directo o recargar /grupos responde 200 con la app.
 * Las rutas con un identificador (/grupos/<id>, /recomendaciones/animo/<id>)
 * no se pueden generar de antemano: 404.html es la misma app y Render la sirve
 * para cualquier ruta inexistente. (Con una regla de reescritura /* → /index.html
 * en Render esto deja de ser necesario, pero no estorba.)
 */
function rutasEstaticas() {
  let salida = 'dist'
  return {
    name: 'butaca-rutas-estaticas',
    apply: 'build',
    configResolved(config) {
      salida = config.build.outDir
    },
    closeBundle() {
      const indice = join(salida, 'index.html')
      const rutas = [
        ...RUTAS_APLICACION,
        ...EMOCIONES.map((emocion) => `recomendaciones/emocion/${emocion}`),
      ]
      for (const ruta of rutas) {
        const destino = join(salida, ruta, 'index.html')
        mkdirSync(dirname(destino), { recursive: true })
        copyFileSync(indice, destino)
      }
      copyFileSync(indice, join(salida, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rutasEstaticas()],
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
