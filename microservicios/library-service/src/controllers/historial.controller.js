import { historialService } from '../services/historial.service.js'
import {
  esIdValido,
  validarConsultaHistorial,
  validarNuevoHistorial,
} from '../validators/biblioteca.validator.js'

function registrarFallo(operacion, error) {
  console.error(
    `[library-service] Fallo de persistencia en historial al ${operacion}: ${error?.code ?? 'sin código'}`,
  )
}

// GET /api/historial
export async function listarHistorial(req, res) {
  const { status, error, datos } = validarConsultaHistorial(req.query)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const respuesta = await historialService.listar(req.user.id, datos)
    return res.json(respuesta)
  } catch (fallo) {
    registrarFallo('consultar', fallo)
    return res
      .status(500)
      .json({ error: 'No se pudo consultar el historial de recomendaciones.' })
  }
}

// POST /api/historial
export async function registrarHistorial(req, res) {
  const { status, error, datos } = validarNuevoHistorial(req.body)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const registro = await historialService.registrar(req.user.id, datos)
    return res.status(201).json(registro)
  } catch (fallo) {
    if (fallo?.code === 'P2003') {
      return res.status(409).json({
        error:
          'El usuario autenticado no tiene un registro local. Sincronizalo con POST /api/usuarios.',
      })
    }
    registrarFallo('guardar', fallo)
    return res
      .status(500)
      .json({ error: 'No se pudo guardar la recomendación en el historial.' })
  }
}

// DELETE /api/historial/:id
export async function eliminarHistorial(req, res) {
  const noEncontrado = { error: 'El registro del historial no existe.' }
  if (!esIdValido(req.params.id)) {
    return res.status(404).json(noEncontrado)
  }

  try {
    const eliminado = await historialService.eliminar(req.user.id, req.params.id)
    if (!eliminado) {
      return res.status(404).json(noEncontrado)
    }
    return res.status(204).end()
  } catch (fallo) {
    registrarFallo('eliminar', fallo)
    return res
      .status(500)
      .json({ error: 'No se pudo eliminar el registro del historial.' })
  }
}