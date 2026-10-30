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
