// Fechas de calendario en una zona horaria concreta.
//
// La «recomendación del día» usa el día LOCAL de la persona (src/services/
// notificaciones.js → fechaLocal, que corre en el navegador). En las pruebas,
// el navegador usa la zona configurada en Playwright (timezoneId), mientras que
// el proceso de Node usa la zona de la máquina: UTC en GitHub Actions. Por eso
// la fecha esperada se calcula en la zona del NAVEGADOR, no con new Date() de Node.

/** 'YYYY-MM-DD' del instante indicado en la zona horaria dada (p. ej. 'America/Guatemala'). */
export function fechaEnZona(zona, instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(instante)
  const valor = (tipo) => partes.find((p) => p.type === tipo).value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

// La zona del navegador de cada prueba es el fixture `timezoneId` de Playwright
// (playwright.config.js o test.use): se recibe en la prueba y se pasa aquí.
