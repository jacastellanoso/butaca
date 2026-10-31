import { animosService } from '../services/animos.service.js'
import {
  esIdValido,
  validarConsultaHistorial,
  validarNuevoAnimo,
} from '../validators/animos.validator.js'

// Solo se registra el código de Prisma (por ejemplo P1001): el mensaje
// original puede contener la cadena de conexión u otros datos privados.
function registrarFallo(operacion, error) {
  console.error(`[emotions-service] Fallo de persistencia al ${operacion}: ${error?.code ?? 'sin código'}`)
}

// POST /api/animos   body: { emocion, confianza, origen?, consentimientoHistorial: true }
export async function registrarAnimo(req, res) {
  const { status, error, datos } = validarNuevoAnimo(req.body)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const animo = await animosService.registrar(req.user.id, datos)
    return res.status(201).json(animo)
  } catch (fallo) {
    if (fallo?.code === 'P2003') {
      return res.status(409).json({
        error: 'El usuario autenticado no tiene un registro local. Sincronizalo con POST /api/usuarios.',
      })
    }
    registrarFallo('guardar', fallo)
    return res.status(500).json({ error: 'No se pudo guardar el resultado emocional. Intentá de nuevo.' })
  }
}

// GET /api/animos   → historial autorizado del usuario autenticado
export async function listarAnimos(req, res) {
  const { status, error, datos } = validarConsultaHistorial(req.query)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    return res.json(await animosService.listar(req.user.id, datos))
  } catch (fallo) {
    registrarFallo('consultar', fallo)
    return res.status(500).json({ error: 'No se pudo consultar el historial emocional. Intentá de nuevo.' })
  }
}

// GET /api/animos/:id   → un registro propio; 404 si no existe o es de otro usuario
export async function obtenerAnimo(req, res) {
  const noEncontrado = { error: 'El registro emocional no existe.' }
  if (!esIdValido(req.params.id)) {
    return res.status(404).json(noEncontrado)
  }

  try {
    const animo = await animosService.obtener(req.user.id, req.params.id)
    return animo ? res.json(animo) : res.status(404).json(noEncontrado)
  } catch (fallo) {
    registrarFallo('consultar', fallo)
    return res.status(500).json({ error: 'No se pudo consultar el historial emocional. Intentá de nuevo.' })
  }
}
