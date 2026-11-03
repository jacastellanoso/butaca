// Punto de entrada de las pruebas E2E: extiende `test` de Playwright con
// - backend: el backend falso, conectado automáticamente en cada prueba
//   (ninguna prueba toca servicios reales por accidente).
// - conSesion: true para empezar la prueba con la sesión ya iniciada.

import { test as base, expect } from '@playwright/test'

import { BackendFalso } from './backendFalso.js'
import { estadoConSesion } from './sesion.js'

export const test = base.extend({
  conSesion: [false, { option: true }],

  // El segundo parámetro de una fixture entrega el valor a la prueba. Se llama
  // `entregar` (y no `use`, como en la documentación) para que el linter de
  // React no lo confunda con un hook.
  storageState: async ({ conSesion, baseURL }, entregar) => {
    await entregar(conSesion ? estadoConSesion(baseURL) : undefined)
  },

  backend: [
    async ({ page }, entregar) => {
      const backend = new BackendFalso()
      await backend.conectar(page)
      await entregar(backend)
    },
    { auto: true },
  ],
})

export { expect }

/** Un enlace del encabezado (el footer repite algunos, por eso se acota a la navegación). */
export function menu(page, nombre) {
  return page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: nombre })
}

/** Elige el perfil en "¿Quién va a ver hoy?" y espera la galería. */
export async function entrarComo(page, nombre = 'Majo Prueba') {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(nombre) }).click()
  await expect(page).toHaveURL(/#galeria$/)
}