import { PerfilError, perfilesService } from '../services/perfiles.service.js'
import { UUID, validarPerfil } from '../validators/social.validator.js'

// Perfiles de visualización de la cuenta autenticada (req.user.id).
// Los vínculos entre cuentas ya no aparecen como perfiles: se comparten
// recomendaciones mediante grupos (/api/grupos).

function responderError(res, fallo, mensaje) {
  if (fallo instanceof PerfilError) return res.status(fallo.status).json({ error: fallo.message })
  if (fallo?.code === 'P2003') {
    return res.status(409).json({ error: 'Tu cuenta todavía no está lista. Sincronizala con POST /api/usuarios.' })
  }
  console.error(`[auth-service] ${mensaje}: ${fallo?.code ?? 'sin código'}`)
  return res.status(500).json({ error: `${mensaje}. Intentá de nuevo.` })
}

export async function listarPerfiles(req, res) {
  try {
    return res.json(await perfilesService.listar(req.user.id))
  } catch (fallo) {
    return responderError(res, fallo, 'No se pudieron consultar los perfiles')
  }
}

export async function crearPerfil(req, res) {
  const { datos, error } = validarPerfil(req.body)
  if (error) return res.status(400).json({ error })
  try {
    return res.status(201).json(await perfilesService.crear(req.user.id, datos))
  } catch (fallo) {
    return responderError(res, fallo, 'No se pudo crear el perfil')
  }
}

export async function actualizarPerfil(req, res) {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'El perfil no existe.' })
  const { datos, error } = validarPerfil(req.body, { parcial: true })
  if (error) return res.status(400).json({ error })
  try {
    return res.json(await perfilesService.actualizar(req.user.id, req.params.id, datos))
  } catch (fallo) {
    return responderError(res, fallo, 'No se pudo actualizar el perfil')
  }
}

export async function eliminarPerfil(req, res) {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'El perfil no existe.' })
  try {
    await perfilesService.eliminar(req.user.id, req.params.id)
    return res.status(204).end()
  } catch (fallo) {
    return responderError(res, fallo, 'No se pudo eliminar el perfil')
  }
}
