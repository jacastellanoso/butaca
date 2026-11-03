// Cálculos puros sobre el historial emocional para el dashboard.
// Reciben registros ya validados ({ emocion, confianza, creadoEn: Date }).

export const EMOCIONES_ORDEN = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']

// Color fijo por emoción (sigue a la entidad, nunca al ranking). Paleta
// categórica validada para daltonismo sobre superficie clara, en este orden.
export const COLORES_EMOCION = {
  neutral: '#2a78d6',
  happy: '#eb6834',
  sad: '#1baf7a',
  angry: '#eda100',
  fearful: '#e87ba4',
  disgusted: '#008300',
  surprised: '#6250d6',
}

const DIA_MS = 24 * 60 * 60 * 1000

/** Cantidad y porcentaje por emoción, de mayor a menor (sin emociones en cero). */
export function distribucion(registros) {
  const total = registros.length
  if (total === 0) return []
  const conteos = contar(registros)
  return EMOCIONES_ORDEN
    .filter((emocion) => conteos[emocion] > 0)
    .map((emocion) => ({ emocion, cantidad: conteos[emocion], porcentaje: conteos[emocion] / total }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

/**
 * Emoción más frecuente. Un empate se resuelve por la emoción registrada más
 * recientemente, que describe mejor el ánimo actual.
 */
export function emocionMasFrecuente(registros) {
  if (registros.length === 0) return null
  const conteos = contar(registros)
  const ultimaVez = {}
  for (const { emocion, creadoEn } of registros) {
    ultimaVez[emocion] = Math.max(ultimaVez[emocion] ?? 0, creadoEn.getTime())
  }
  const [emocion] = Object.keys(conteos).sort(
    (a, b) => conteos[b] - conteos[a] || ultimaVez[b] - ultimaVez[a],
  )
  return { emocion, cantidad: conteos[emocion], porcentaje: conteos[emocion] / registros.length }
}

/** Promedio de confianza de las detecciones (las confirmadas no tienen). */
export function confianzaPromedio(registros) {
  const valores = registros.map((r) => r.confianza).filter((c) => typeof c === 'number')
  if (valores.length === 0) return null
  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length
}

/**
 * Serie temporal apilada para el gráfico de evolución. Elige la agrupación
 * según el rango: día (hasta 31 días), semana (hasta ~6 meses) o mes.
 * Rellena con ceros los periodos sin registros para no deformar el tiempo.
 */
export function serieTemporal(registros) {
  if (registros.length === 0) return { agrupacion: 'dia', periodos: [] }

  const tiempos = registros.map((r) => r.creadoEn.getTime())
  const minimo = new Date(Math.min(...tiempos))
  const maximo = new Date(Math.max(...tiempos))
  const dias = Math.round((inicioDia(maximo) - inicioDia(minimo)) / DIA_MS) + 1
  const agrupacion = dias <= 31 ? 'dia' : dias <= 186 ? 'semana' : 'mes'

  const periodos = []
  const indice = new Map()
  for (let cursor = inicioPeriodo(minimo, agrupacion); cursor <= maximo; cursor = siguiente(cursor, agrupacion)) {
    const periodo = { clave: claveFecha(cursor), inicio: cursor, total: 0, conteos: {} }
    indice.set(periodo.clave, periodo)
    periodos.push(periodo)
  }

  for (const { emocion, creadoEn } of registros) {
    const periodo = indice.get(claveFecha(inicioPeriodo(creadoEn, agrupacion)))
    periodo.total += 1
    periodo.conteos[emocion] = (periodo.conteos[emocion] ?? 0) + 1
  }

  return { agrupacion, periodos }
}

function contar(registros) {
  const conteos = {}
  for (const { emocion } of registros) conteos[emocion] = (conteos[emocion] ?? 0) + 1
  return conteos
}

function inicioDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

function inicioPeriodo(fecha, agrupacion) {
  const dia = inicioDia(fecha)
  if (agrupacion === 'semana') {
    // Semanas de lunes a domingo.
    const desplazamiento = (dia.getDay() + 6) % 7
    return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - desplazamiento)
  }
  if (agrupacion === 'mes') return new Date(dia.getFullYear(), dia.getMonth(), 1)
  return dia
}

function siguiente(fecha, agrupacion) {
  if (agrupacion === 'mes') return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
  const pasos = agrupacion === 'semana' ? 7 : 1
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + pasos)
}

function claveFecha(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}
