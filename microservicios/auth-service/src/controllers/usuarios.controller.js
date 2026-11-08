import { gruposService } from '../services/grupos.service.js'
import { usuariosService } from '../services/usuarios.service.js'

export async function sincronizarUsuario(req, res) {
  try {
    const usuario = await usuariosService.sincronizar(req.user)
    // Invitaciones a grupos enviadas a este correo antes de que la cuenta existiera.
    // Un fallo aquí no impide iniciar sesión: se reintenta en la próxima sincronización.
    await gruposService.vincularInvitaciones(req.user).catch((fallo) => {
      console.error(`[auth-service] No se pudieron vincular invitaciones: ${fallo?.code ?? 'sin código'}`)
    })
    return res.status(200).json(usuario)
  } catch {
    // No enviar ni registrar el error de Prisma: podría contener datos privados.
    return res.status(500).json({ error: 'No se pudo guardar el usuario. Intentá de nuevo.' })
  }
}

export async function obtenerUsuario(req, res) {
  try {
    const usuario = await usuariosService.obtener(req.user.id)

    if (!usuario) {
      return res.status(404).json({ error: 'El usuario autenticado no tiene un registro local.' })
    }

    return res.json(usuario)
  } catch {
    return res.status(500).json({ error: 'No se pudo consultar el usuario. Intentá de nuevo.' })
  }
}

export async function actualizarUsuario(req, res) {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : ''
  const apellido = typeof req.body?.apellido === 'string' ? req.body.apellido.trim() : ''
  const edad = Number(req.body?.edad)

  if (nombre.length < 2 || nombre.length > 60 || apellido.length < 2 || apellido.length > 60) {
    return res.status(400).json({ error: 'Nombre y apellido deben tener entre 2 y 60 caracteres.' })
  }
  if (!Number.isInteger(edad) || edad < 5 || edad > 120) {
    return res.status(400).json({ error: 'La edad debe ser un entero entre 5 y 120.' })
  }

  try {
    const usuario = await usuariosService.actualizarNombre(req.user.id, { nombre, apellido, edad })
    return res.json(usuario)
  } catch {
    return res.status(500).json({ error: 'No se pudo actualizar el usuario. Intentá de nuevo.' })
  }
}
