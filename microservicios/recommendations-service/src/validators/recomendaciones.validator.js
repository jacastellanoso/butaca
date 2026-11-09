import { z } from 'zod'
import { esEmocionValida } from '../constants/recomendaciones.js'

const mensajeParametros = 'Los parámetros deben ser conocidos y no repetirse.'
const esquemaParametros = z.record(z.string(), z.string({ error: mensajeParametros }))
  .refine((query) => Object.keys(query).every((key) => ['emocion', 'animoId', 'tipo'].includes(key)), mensajeParametros)
const esquemaConsulta = esquemaParametros
  .refine(({ emocion, animoId }) => (emocion !== undefined) !== (animoId !== undefined),
    'Indicá exactamente uno de emocion o animoId.')
  .pipe(z.object({
    emocion: z.custom(esEmocionValida, 'La emoción no es válida.').optional(),
    animoId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'animoId debe ser un UUID.').optional(),
    tipo: z.enum(['movie', 'tv'], { error: 'El tipo debe ser movie o tv.' }).default('movie'),
  }))

export function validarConsulta(query) {
  const resultado = esquemaConsulta.safeParse(query)
  if (!resultado.success) return { error: resultado.error.issues[0].message }
  const { emocion, animoId, tipo } = resultado.data
  return { datos: { emocion, animoId, tipo } }
}