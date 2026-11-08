import { usuariosService } from '../services/usuarios.service.js'

export async function sincronizarUsuario(req, res) {
  try {
    const usuario = await usuariosService.sincronizar(req.user)
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

  if (nombre.length < 2 || nombre.length > 60 || apellido.length < 2 || apellido.length > 60) {
    return res.status(400).json({ error: 'Nombre y apellido deben tener entre 2 y 60 caracteres.' })
  }

  try {
    const usuario = await usuariosService.actualizarNombre(req.user.id, { nombre, apellido })
    return res.json(usuario)
  } catch {
    return res.status(500).json({ error: 'No se pudo actualizar el usuario. Intentá de nuevo.' })
  }
}
