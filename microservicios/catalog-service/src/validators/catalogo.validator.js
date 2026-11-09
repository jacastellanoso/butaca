import { z } from 'zod'
import { CATEGORIAS_GALERIA, PAGINACION_CATALOGO, TIPOS_CATALOGO, TIPOS_DETALLE } from '../constants/catalogo.js'
import { EMOCIONES } from '../constants/emociones.js'

const texto = (nombre) => z.string({ error: `El parámetro ${nombre} no es válido.` })
const opcion = (nombre, opciones, porDefecto) => texto(nombre)
  .pipe(z.enum(opciones, { error: `El parámetro ${nombre} no es válido.` }))
  .optional().default(porDefecto)
function entero(nombre, min, max, porDefecto) {
  return texto(nombre).trim()
    .refine((valor) => /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) >= min && Number(valor) <= max,
      `El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.`)
    .transform(Number).optional().default(porDefecto)
}

const esquemaConsultaCatalogo = z.object({
  tipo: opcion('tipo', TIPOS_CATALOGO, 'all'),
  categoria: opcion('categoria', CATEGORIAS_GALERIA, 'Todos'),
  pagina: entero('pagina', PAGINACION_CATALOGO.paginaMinima, PAGINACION_CATALOGO.paginaMaxima, PAGINACION_CATALOGO.paginaPorDefecto),
  busqueda: texto('busqueda').trim()
    .max(PAGINACION_CATALOGO.longitudMaximaBusqueda,
      `El parámetro busqueda no puede superar ${PAGINACION_CATALOGO.longitudMaximaBusqueda} caracteres.`)
    .optional().transform((valor) => valor || null),
  // Filtro opcional por emoción (constants/emociones.js).
  emocion: texto('emocion').pipe(z.enum(EMOCIONES, { error: 'El parámetro emocion no es válido.' })).optional()
    .transform((valor) => valor ?? null),
})
const tmdbIdMaximo = 999_999_999
const esquemaIdDetalle = entero('tmdbId', 1, tmdbIdMaximo)
const esquemaParametrosDetalle = z.object({
  tipo: z.enum(TIPOS_DETALLE, { error: 'El parámetro tipo debe ser "movie" o "tv".' }),
  tmdbId: z.custom((valor) => valor !== undefined && esquemaIdDetalle.safeParse(valor).success,
    `El parámetro tmdbId debe ser un entero positivo entre 1 y ${tmdbIdMaximo}.`).transform(Number),
})
function validar(esquema, entrada) {
  const resultado = esquema.safeParse(entrada)
  return resultado.success ? { datos: resultado.data }
    : { status: 400, error: resultado.error.issues[0].message }
}
export const validarConsultaCatalogo = (query = {}) => validar(esquemaConsultaCatalogo, query ?? {})
export const validarParametrosDetalle = (params = {}) => validar(esquemaParametrosDetalle, params ?? {})
