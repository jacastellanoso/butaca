import { notificacionesService } from '../services/notificaciones.service.js'
import { UUID, validarDelDia } from '../validators/social.validator.js'

// Centro de notificaciones de la cuenta autenticada y su perfil activo.

function fallar(res, mensaje, fallo) {
  console.error(`[auth-service] ${mensaje}: ${fallo?.code ?? 'sin código'}`)
  return res.status(500).json({ error: `${mensaje}. Intentá de nuevo.` })
}

export async function listarNotificaciones(req, res) {
  const limite = Number(req.query.limite ?? 30)
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    return res.status(400).json({ error: 'El parámetro limite debe ser un entero entre 1 y 100.' })
  }
  try {
    return res.json(await notificacionesService.listar(req.user.id, req.perfil?.id ?? null, limite))
  } catch (fallo) {
    return fallar(res, 'No se pudieron consultar las notificaciones', fallo)
  }
}

export async function marcarLeida(req, res) {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'La notificación no existe.' })
  try {
    const ok = await notificacionesService.marcarLeida(req.user.id, req.perfil?.id ?? null, req.params.id)
    return ok ? res.json({ leida: true }) : res.status(404).json({ error: 'La notificación no existe.' })
  } catch (fallo) {
    return fallar(res, 'No se pudo actualizar la notificación', fallo)
  }
}

export async function marcarTodas(req, res) {
  try {
    return res.json({ actualizadas: await notificacionesService.marcarTodas(req.user.id, req.perfil?.id ?? null) })
  } catch (fallo) {
    return fallar(res, 'No se pudieron actualizar las notificaciones', fallo)
  }
}

export async function registrarDelDia(req, res) {
  if (!req.perfil) {
    return res.status(409).json({ error: 'Tu cuenta todavía no tiene perfiles. Sincronizala con POST /api/usuarios.' })
  }
  const { datos, error } = validarDelDia(req.body)
  if (error) return res.status(400).json({ error })
  try {
    const { notificacion, creada } = await notificacionesService.delDia(req.user.id, req.perfil.id, datos)
    return res.status(creada ? 201 : 200).json(notificacion)
  } catch (fallo) {
    return fallar(res, 'No se pudo registrar la recomendación del día', fallo)
  }
}
