import { randomUUID } from 'node:crypto'

// Almacenamiento TEMPORAL en memoria (se borra al reiniciar el servidor).
// pf7_Prisma reemplaza el cuerpo de estas funciones por consultas a la base;
// los controladores no tienen que cambiar.
const animosPorUsuario = new Map()

export const animosService = {
  async registrar(usuarioId, { emocion, confianza }) {
    const animo = {
      id: randomUUID(),
      emocion,
      confianza,
      creadoEn: new Date().toISOString(),
    }
    const lista = animosPorUsuario.get(usuarioId) ?? []
    lista.push(animo)
    animosPorUsuario.set(usuarioId, lista)
    return animo
  },

  async listar(usuarioId) {
    return animosPorUsuario.get(usuarioId) ?? []
  },
}