import { validarConsulta } from '../validators/recomendaciones.validator.js'
import { obtenerRecomendaciones } from '../services/recomendaciones.service.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function crearObtenerRecomendaciones(config) {
  return async function obtener(req, res, next) {
    const { datos, error } = validarConsulta(req.query)
    if (error) return res.status(400).json({ error })
    const perfil = req.get('x-butaca-perfil')
    if (perfil !== undefined && !UUID.test(perfil)) return res.status(400).json({ error: 'El perfil indicado no es válido.' })
    try {
      const resultado = await obtenerRecomendaciones(datos, {
        consultar: req.consultar, config, authorization: req.get('authorization'), perfil,
      })
      if (!req.recommendationsSignal.aborted) return res.json(resultado)
    } catch (fallo) { next(fallo) }
  }
}
