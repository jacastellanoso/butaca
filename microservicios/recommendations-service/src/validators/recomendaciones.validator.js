import { esEmocionValida } from '../constants/recomendaciones.js'

export function validarConsulta(query) {
  const permitidos = ['emocion', 'animoId', 'tipo']
  if (Object.entries(query).some(([key, value]) =>
    !permitidos.includes(key) || typeof value !== 'string')) {
    return { error: 'Los parámetros deben ser conocidos y no repetirse.' }
  }
  const { emocion, animoId, tipo = 'movie' } = query
  if ((emocion !== undefined) === (animoId !== undefined)) {
    return { error: 'Indicá exactamente uno de emocion o animoId.' }
  }
  if (emocion !== undefined && !esEmocionValida(emocion)) return { error: 'La emoción no es válida.' }
  if (animoId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(animoId)) {
    return { error: 'animoId debe ser un UUID.' }
  }
  if (!['movie', 'tv'].includes(tipo)) return { error: 'El tipo debe ser movie o tv.' }
  return { datos: { emocion, animoId, tipo } }
}
