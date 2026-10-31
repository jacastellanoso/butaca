import { catalogoService } from '../services/catalogo.service.js'
import {
  validarConsultaCatalogo,
  validarParametrosDetalle,
} from '../validators/catalogo.validator.js'

// Solo se registra el código interno del error para evitar que una URL o cabecera
// con la clave de TMDB aparezca expuesta en los registros del contenedor.
function registrarFalloCatalogo(operacion, error) {
  console.error(
    `[catalog-service] Fallo al ${operacion}: ${error?.code ?? 'SIN_CODIGO'}`,
  )
}

function responderErrorServicio(res, operacion, error) {
  registrarFalloCatalogo(operacion, error)

  if (error?.code === 'TMDB_CONFIG_MISSING') {
    return res.status(500).json({
      error: 'El servicio de catálogo no tiene configurada la credencial de TMDB.',
    })
  }

  if (error?.code === 'TMDB_TIMEOUT') {
    return res.status(503).json({
      error: 'El catálogo externo de TMDB tardó demasiado en responder.',
    })
  }

  if (error?.code === 'TMDB_UPSTREAM_ERROR') {
    return res.status(502).json({
      error: 'No fue posible consultar el catálogo externo de TMDB en este momento.',
    })
  }

  return res.status(500).json({
    error: 'Ocurrió un error interno al procesar la consulta del catálogo.',
  })
}

// GET /api/catalogo
export async function listarCatalogo(req, res) {
  const { status, error, datos } = validarConsultaCatalogo(req.query)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const catalogo = await catalogoService.listar(datos)
    return res.status(200).json(catalogo)
  } catch (fallo) {
    return responderErrorServicio(res, 'listar el catálogo', fallo)
  }
}

// GET /api/catalogo/:tipo/:tmdbId
export async function obtenerDetalleCatalogo(req, res) {
  const { status, error, datos } = validarParametrosDetalle(req.params)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const detalle = await catalogoService.obtenerDetalle(datos)
    if (!detalle) {
      return res.status(404).json({
        error: 'El contenido solicitado no existe en el catálogo.',
      })
    }

    return res.status(200).json(detalle)
  } catch (fallo) {
    return responderErrorServicio(res, 'consultar el detalle del contenido', fallo)
  }
}