import { favoritosService } from '../services/favoritos.service.js'
import {
  esIdValido,
  validarConsultaFavoritos,
  validarNuevoFavorito,
} from '../validators/biblioteca.validator.js'

function registrarFallo(operacion, error) {
  console.error(
    `[library-service] Fallo de persistencia en favoritos al ${operacion}: ${error?.code ?? 'sin código'}`,
  )
}

// GET /api/favoritos
export async function listarFavoritos(req, res) {
  const { status, error, datos } = validarConsultaFavoritos(req.query)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const respuesta = await favoritosService.listar(req.user.id, datos)
    return res.json(respuesta)
  } catch (fallo) {
    registrarFallo('consultar', fallo)
    return res
      .status(500)
      .json({ error: 'No se pudo consultar la lista de favoritos.' })
  }
}

// POST /api/favoritos
export async function agregarFavorito(req, res) {
  const { status, error, datos } = validarNuevoFavorito(req.body)
  if (error) {
    return res.status(status).json({ error })
  }

  try {
    const { favorito, creado } = await favoritosService.agregar(req.user.id, datos)
    return res.status(creado ? 201 : 200).json(favorito)
  } catch (fallo) {
    if (fallo?.code === 'P2003') {
      return res.status(409).json({
        error:
          'El usuario autenticado no tiene un registro local. Sincronizalo con POST /api/usuarios.',
      })
    }
    registrarFallo('guardar', fallo)
    return res.status(500).json({ error: 'No se pudo guardar el favorito.' })
  }
}

// DELETE /api/favoritos/:id
export async function eliminarFavorito(req, res) {
  const noEncontrado = { error: 'Ese favorito no existe.' }
  if (!esIdValido(req.params.id)) {
    return res.status(404).json(noEncontrado)
  }

  try {
    const eliminado = await favoritosService.eliminar(req.user.id, req.params.id)
    if (!eliminado) {
      return res.status(404).json(noEncontrado)
    }
    return res.status(204).end()
  } catch (fallo) {
    registrarFallo('eliminar', fallo)
    return res.status(500).json({ error: 'No se pudo eliminar el favorito.' })
  }
}