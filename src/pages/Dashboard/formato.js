import { EMOTIONS } from '../Rostro/emotions.js'

const fechaHora = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
const fechaLarga = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })
const diaCorto = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const mesCorto = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' })

export const formatearFechaHora = (fecha) => fechaHora.format(fecha)
export const formatearFecha = (fecha) => fechaLarga.format(fecha)

/** Etiqueta de un periodo del gráfico de evolución según su agrupación. */
export function etiquetaPeriodo(inicio, agrupacion) {
  if (agrupacion === 'mes') return mesCorto.format(inicio)
  if (agrupacion === 'semana') return `Sem. ${diaCorto.format(inicio)}`
  return diaCorto.format(inicio)
}

export const etiquetaEmocion = (emocion) => EMOTIONS[emocion]?.label ?? emocion

export const formatearPorcentaje = (valor) => `${Math.round(valor * 100)} %`

export const ORIGEN_ETIQUETA = { deteccion: 'Detectada', confirmada: 'Confirmada' }

// Valores iniciales de FiltrosHistorial (fechas en formato YYYY-MM-DD).
export const FILTROS_VACIOS = { emocion: '', desde: '', hasta: '', tipo: '' }
