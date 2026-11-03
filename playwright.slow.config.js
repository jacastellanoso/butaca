// Igual que playwright.config.js, pero con la ventana visible y en cámara
// lenta (1 s por acción) para VER al robot recorrer la app en la demo.
import base from './playwright.config.js'

export default {
  ...base,
  timeout: 180_000,
  use: {
    ...base.use,
    headless: false,
    launchOptions: { slowMo: 1000 },
  },
  projects: base.projects.map((proyecto) => ({
    ...proyecto,
    use: {
      ...proyecto.use,
      launchOptions: { ...proyecto.use.launchOptions, slowMo: 1000 },
    },
  })),
}