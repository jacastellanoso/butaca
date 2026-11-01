import { validarConsulta } from '../validators/recomendaciones.validator.js'
import { obtenerRecomendaciones } from '../services/recomendaciones.service.js'

export function crearObtenerRecomendaciones(config) {
  return async function obtener(req, res, next) {
    const { datos, error } = validarConsulta(req.query)
    if (error) return res.status(400).json({ error })
    try {
      const resultado = await obtenerRecomendaciones(datos, {
        consultar: req.consultar, config, authorization: req.get('authorization'),
      })
      if (!req.recommendationsSignal.aborted) return res.json(resultado)
    } catch (fallo) { next(fallo) }
  }
}
