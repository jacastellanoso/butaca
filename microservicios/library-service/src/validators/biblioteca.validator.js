import { z } from 'zod'
import { EMOCIONES, LIMITES_TEXTO, PAGINACION, TIPOS_CONTENIDO } from '../constants/biblioteca.js'

function validar(esquema, entrada) {
  const resultado = esquema.safeParse(entrada)
  return resultado.success ? { datos: resultado.data }
    : { status: 400, error: resultado.error.issues[0].message }
}

const esquemaId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
export const esIdValido = (id) => esquemaId.safeParse(id).success

const mensajeTmdb = `tmdbId debe ser un entero entre 1 y ${LIMITES_TEXTO.tmdbIdMaximo}.`
const camposContenido = {
  tmdbId: z.number({ error: mensajeTmdb }).int(mensajeTmdb).min(1, mensajeTmdb)
    .max(LIMITES_TEXTO.tmdbIdMaximo, mensajeTmdb),
  tipo: z.enum(TIPOS_CONTENIDO, { error: 'El tipo debe ser "movie" o "tv".' }),
  titulo: z.string({ error: 'El título es obligatorio.' }).trim().min(1, 'El título es obligatorio.')
    .max(LIMITES_TEXTO.tituloMaximo, `El título no puede superar los ${LIMITES_TEXTO.tituloMaximo} caracteres.`),
  poster: z.string({ error: 'El póster debe ser una cadena de texto o nulo.' }).trim()
    .min(1, 'El póster no puede ser una cadena vacía.')
    .max(LIMITES_TEXTO.posterMaximo, `El póster no puede superar los ${LIMITES_TEXTO.posterMaximo} caracteres.`)
    .nullish().transform((valor) => valor ?? null),
}
const esquemaNuevoFavorito = z.object(camposContenido, { error: 'El cuerpo debe ser un objeto JSON.' })
const mensajeCalificacion = 'La calificación debe ser un número entre 0 y 10.'
const esquemaNuevoHistorial = z.object({
  emocion: z.enum(EMOCIONES, { error: 'La emoción no es válida.' }),
  ...camposContenido,
  calificacion: z.number({ error: mensajeCalificacion }).min(0, mensajeCalificacion).max(10, mensajeCalificacion)
    .nullish().transform((valor) => valor == null ? null : Math.round(valor * 10) / 10),
}, { error: 'El cuerpo debe ser un objeto JSON.' })

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
  // Mantiene las fechas aceptadas por new Date, sin endurecer el contrato.
  .refine((valor) => !Number.isNaN(new Date(valor).getTime()),
    `El parámetro ${nombre} debe ser una fecha ISO 8601.`)
  .transform((valor) => new Date(valor)).optional()
function consulta(campos, conFechas = false) {
  const esquema = z.object(campos).transform((datos) =>
    Object.fromEntries(Object.keys(campos).map((nombre) => [nombre, datos[nombre]])))
  return conFechas ? esquema.refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta,
    'El parámetro desde no puede ser posterior a hasta.') : esquema
}
const camposPaginacion = {
  pagina: entero('pagina', 1, PAGINACION.paginaMaxima, 1),
  limite: entero('limite', 1, PAGINACION.limiteMaximo, PAGINACION.limitePorDefecto),
}
const esquemaConsultaFavoritos = consulta({
  ...camposPaginacion,
  tipo: opcion('tipo', TIPOS_CONTENIDO),
  orden: opcion('orden', ['desc', 'asc'], 'desc'),
})
const esquemaConsultaHistorial = consulta({
  ...camposPaginacion,
  emocion: opcion('emocion', EMOCIONES),
  tipo: opcion('tipo', TIPOS_CONTENIDO),
  desde: fecha('desde'),
  hasta: fecha('hasta'),
  orden: opcion('orden', ['desc', 'asc'], 'desc'),
}, true)

export const validarNuevoFavorito = (body) => validar(esquemaNuevoFavorito, body)
export const validarNuevoHistorial = (body) => validar(esquemaNuevoHistorial, body)
export const validarConsultaFavoritos = (query = {}) => validar(esquemaConsultaFavoritos, query)
export const validarConsultaHistorial = (query = {}) => validar(esquemaConsultaHistorial, query)
