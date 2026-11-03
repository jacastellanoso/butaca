import { z } from 'zod'
import { EMOCIONES, ORIGENES, PAGINACION } from '../constants/emociones.js'

// Adaptador del contrato histórico: solo se publica el primer mensaje.
function validar(esquema, entrada) {
  const resultado = esquema.safeParse(entrada)
  return resultado.success ? { datos: resultado.data }
    : { status: 400, error: resultado.error.issues[0].message }
}

const texto = (nombre) => z.string({ error: `El parámetro ${nombre} no es válido.` })
const opcion = (nombre, opciones, porDefecto) => texto(nombre)
  .pipe(z.enum(opciones, { error: `El parámetro ${nombre} no es válido.` }))
  .optional().default(porDefecto)
function entero(nombre, min, max, porDefecto) {
  return texto(nombre)
    .refine((valor) => /^\d+$/.test(valor) && Number(valor) >= min && Number(valor) <= max,
      `El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.`)
    .transform(Number).optional().default(porDefecto)
}
const fecha = (nombre) => texto(nombre)
  // Se conserva new Date: exigir ISO estricto cambiaría el contrato previo.
  .refine((valor) => !Number.isNaN(new Date(valor).getTime()),
    `El parámetro ${nombre} debe ser una fecha ISO 8601.`)
  .transform((valor) => new Date(valor)).optional()

const mensajeConsentimiento = 'No se guarda el resultado sin autorización explícita para conservar el historial emocional.'
const esquemaConsentimiento = z.object({
  consentimientoHistorial: z.literal(true, { error: mensajeConsentimiento }),
}, { error: 'El cuerpo debe ser un objeto JSON.' }).passthrough()
const esquemaConfianza = z.number().min(0).max(1)
const esquemaNuevoAnimo = esquemaConsentimiento.pipe(z.object({
  emocion: z.enum(EMOCIONES, { error: 'La emoción no es válida.' }),
  origen: z.enum(ORIGENES, { error: 'El origen debe ser "deteccion" o "confirmada".' }).default('deteccion'),
  confianza: z.unknown().optional(),
}).refine(({ origen, confianza }) =>
  (origen === 'confirmada' && confianza == null) || esquemaConfianza.safeParse(confianza).success,
'La confianza debe ser un número entre 0 y 1.')
  .transform(({ emocion, origen, confianza }) => ({ emocion, origen, confianza: confianza ?? null })))

const camposConsulta = {
  pagina: entero('pagina', 1, 10_000, 1),
  limite: entero('limite', 1, PAGINACION.limiteMaximo, PAGINACION.limitePorDefecto),
  emocion: opcion('emocion', EMOCIONES),
  origen: opcion('origen', ORIGENES),
  desde: fecha('desde'),
  hasta: fecha('hasta'),
  orden: opcion('orden', ['desc', 'asc'], 'desc'),
}
const esquemaConsultaHistorial = z.object(camposConsulta)
  .transform((datos) => Object.fromEntries(Object.keys(camposConsulta).map((nombre) => [nombre, datos[nombre]])))
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta,
    'El parámetro desde no puede ser posterior a hasta.')

export function validarNuevoAnimo(body) {
  const resultado = validar(esquemaNuevoAnimo, body)
  if (resultado.error === mensajeConsentimiento) resultado.status = 403
  return resultado
}
export function validarConsultaHistorial(query) {
  return validar(esquemaConsultaHistorial, query)
}

// Conserva las versiones UUID aceptadas por la expresión regular anterior.
const esquemaId = z.custom((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
export const esIdValido = (id) => esquemaId.safeParse(id).success
