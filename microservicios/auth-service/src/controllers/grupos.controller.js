import { GrupoError, gruposService } from '../services/grupos.service.js'
import { nombrePerfil } from '../services/notificaciones.service.js'
import { UUID, validarEmail, validarGrupo, validarRecomendacion } from '../validators/social.validator.js'

// Grupos para compartir recomendaciones. La membresía es de la cuenta; el
// nombre de quien comparte sale del perfil activo verificado (req.perfil).

function manejar(mensaje, accion) {
  return async (req, res) => {
    try {
      return await accion(req, res)
    } catch (fallo) {
      if (fallo instanceof GrupoError) return res.status(fallo.status).json({ error: fallo.message })
      if (fallo?.code === 'P2003') {
        return res.status(409).json({ error: 'Tu cuenta todavía no está lista. Sincronizala con POST /api/usuarios.' })
      }
      console.error(`[auth-service] ${mensaje}: ${fallo?.code ?? 'sin código'}`)
      return res.status(500).json({ error: `${mensaje}. Intentá de nuevo.` })
    }
  }
}

function idsValidos(req, res, ...claves) {
  if (claves.every((clave) => UUID.test(req.params[clave] ?? ''))) return true
  res.status(404).json({ error: 'El recurso solicitado no existe.' })
  return false
}

export const listarGrupos = manejar('No se pudieron consultar los grupos', async (req, res) =>
  res.json(await gruposService.listar(req.user.id)))

export const crearGrupo = manejar('No se pudo crear el grupo', async (req, res) => {
  const { datos, error } = validarGrupo(req.body)
  if (error) return res.status(400).json({ error })
  return res.status(201).json(await gruposService.crear(req.user.id, datos))
})

export const obtenerGrupo = manejar('No se pudo consultar el grupo', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  return res.json(await gruposService.detalle(req.user.id, req.params.id))
})

export const eliminarGrupo = manejar('No se pudo eliminar el grupo', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  await gruposService.eliminar(req.user.id, req.params.id)
  return res.status(204).end()
})

export const invitarAlGrupo = manejar('No se pudo enviar la invitación', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  const { datos, error } = validarEmail(req.body)
  if (error) return res.status(400).json({ error })
  const autor = nombrePerfil(req.perfil, req.user)
  return res.status(201).json(await gruposService.invitar(req.user, autor, req.params.id, datos.email))
})

export const cancelarInvitacion = manejar('No se pudo cancelar la invitación', async (req, res) => {
  if (!idsValidos(req, res, 'id', 'invitacionId')) return undefined
  await gruposService.cancelarInvitacion(req.user.id, req.params.id, req.params.invitacionId)
  return res.status(204).end()
})

export const quitarMiembro = manejar('No se pudo actualizar el grupo', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  const objetivo = String(req.params.usuarioId ?? '')
  if (!objetivo || objetivo.length > 64) return res.status(404).json({ error: 'Esa persona no forma parte del grupo.' })
  await gruposService.quitarMiembro(req.user.id, req.params.id, objetivo)
  return res.status(204).end()
})

export const compartirRecomendacion = manejar('No se pudo compartir la recomendación', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  const { datos, error } = validarRecomendacion(req.body)
  if (error) return res.status(400).json({ error })
  const autor = nombrePerfil(req.perfil, req.user)
  return res.status(201).json(
    await gruposService.compartir(req.user.id, req.perfil?.id ?? null, autor, req.params.id, datos),
  )
})

export const listarInvitaciones = manejar('No se pudieron consultar las invitaciones', async (req, res) =>
  res.json(await gruposService.invitacionesRecibidas(req.user)))

export const responderInvitacion = manejar('No se pudo responder la invitación', async (req, res) => {
  if (!idsValidos(req, res, 'id')) return undefined
  const aceptar = req.body?.aceptar
  if (typeof aceptar !== 'boolean') return res.status(400).json({ error: 'Indicá si aceptás o rechazás la invitación.' })
  return res.json(await gruposService.responder(req.user, req.params.id, aceptar))
})
