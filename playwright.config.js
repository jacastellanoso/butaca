import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

import { SUPABASE_KEY, SUPABASE_URL } from './e2e/support/sesion.js'

// Puerto propio para E2E: así nunca se reutiliza tu `npm run dev` (5173),
// que apunta al Supabase real.
const PUERTO = 5174
const BASE_URL = `http://localhost:${PUERTO}`

// Cámara falsa: Chromium reproduce este video (un rostro sonriendo) en lugar
// de la webcam. Y4M porque es el formato que el navegador lee sin códecs.
const VIDEO_CAMARA = fileURLToPath(new URL('./e2e/fixtures/rostro-sonriente.y4m', import.meta.url))

export default defineConfig({
  testDir: './e2e',
  // face-api.js analiza varios segundos; en CI sin GPU puede tardar más.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-GT',
    timezoneId: 'America/Guatemala',
    permissions: ['camera'],
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${VIDEO_CAMARA}`,
          ],
        },
      },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PUERTO} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Variables de prueba: tienen prioridad sobre tu .env.local, así el
    // front nunca habla con el Supabase real durante los E2E.
    env: {
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
      VITE_API_GATEWAY_URL: '',
    },
  },
})