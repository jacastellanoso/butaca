import { entrarComo, expect, menu, test } from './support/pruebas.js'

test.use({ conSesion: true })

async function analizarRostro(page) {
  await entrarComo(page)
  await menu(page, 'Escanearme').click()
  await page.getByRole('button', { name: 'Activar cámara' }).click()

  // face-api.js analiza el video de la cámara falsa: un rostro sonriendo.
  const estado = page.getByRole('status').filter({ hasText: 'Emoción detectada' })
  await expect(estado).toBeVisible({ timeout: 60_000 })
  await expect(estado).toContainText('Alegría')
}

test('detecta la emoción, recomienda y guarda solo con autorización', async ({ page, backend }) => {
  await analizarRostro(page)

  // Recomendaciones para la emoción detectada (sin guardar nada todavía).
  await expect(page.getByRole('heading', { name: 'Para tu alegría' })).toBeVisible()
  expect(backend.peticionesA('POST', '/api/animos')).toHaveLength(0)

  // Guardar exige la casilla de autorización, separada del permiso de cámara.
  const guardar = page.getByRole('button', { name: 'Guardar resultado' })
  await expect(guardar).toBeDisabled()
  await page.getByLabel(/Autorizo guardar esta emoción/).check()
  await guardar.click()
  await expect(page.getByText('Guardado en tu historial emocional.')).toBeVisible()

  // Al backend viajan solo la emoción y su confianza: nunca una imagen.
  const [post] = backend.peticionesA('POST', '/api/animos')
  expect(Object.keys(post.body).sort()).toEqual(['confianza', 'consentimientoHistorial', 'emocion', 'origen'])
  expect(post.body).toMatchObject({ emocion: 'happy', origen: 'deteccion', consentimientoHistorial: true })
  expect(post.body.confianza).toBeGreaterThanOrEqual(0.5)

  // El registro aparece en el dashboard.
  await menu(page, 'Dashboard').click()
  await expect(page.getByRole('heading', { name: 'Mis emociones' })).toBeVisible()
  await expect(page.getByText('Último registro').locator('..')).toContainText('Alegría')
})

test('apagar la cámara vuelve al consentimiento sin guardar nada', async ({ page, backend }) => {
  await analizarRostro(page)

  await page.getByRole('button', { name: 'Apagar cámara' }).click()

  await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeVisible()
  await expect(page.locator('video')).toBeHidden()
  expect(backend.peticionesA('POST', '/api/animos')).toHaveLength(0)
})