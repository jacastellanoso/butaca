// Prisma simulado en memoria para las pruebas de perfiles, grupos y
// notificaciones. Implementa solo las operaciones que usan esos servicios:
// filtros por igualdad, `in`, `OR`, `equals` sin distinguir mayúsculas,
// claves únicas compuestas, select, orderBy y take. No toca ninguna base real.

import { randomUUID } from 'node:crypto'

function valorCumple(valor, condicion) {
  if (condicion !== null && typeof condicion === 'object' && !(condicion instanceof Date)) {
    if ('in' in condicion) return condicion.in.includes(valor)
    if ('equals' in condicion) {
      return condicion.mode === 'insensitive'
        ? String(valor ?? '').toLowerCase() === String(condicion.equals).toLowerCase()
        : valor === condicion.equals
    }
    if ('not' in condicion) return valor !== condicion.not
  }
  return (valor ?? null) === condicion
}

export function cumple(registro, where = {}) {
  return Object.entries(where).every(([campo, condicion]) => {
    if (campo === 'OR') return condicion.some((alternativa) => cumple(registro, alternativa))
    // Clave única compuesta de Prisma: { grupoId_email: { grupoId, email } }.
    if (campo.includes('_') && condicion && typeof condicion === 'object' && !('in' in condicion)) {
      return cumple(registro, condicion)
    }
    return valorCumple(registro[campo], condicion)
  })
}

const elegir = (registro, select) =>
  select ? Object.fromEntries(Object.keys(select).map((campo) => [campo, registro[campo] ?? null])) : { ...registro }

function ordenar(lista, orderBy = []) {
  const criterios = Array.isArray(orderBy) ? orderBy : [orderBy]
  return [...lista].sort((a, b) => {
    for (const criterio of criterios) {
      const [[campo, sentido]] = Object.entries(criterio)
      const x = a[campo] instanceof Date ? a[campo].getTime() : a[campo]
      const y = b[campo] instanceof Date ? b[campo].getTime() : b[campo]
      if (x < y) return sentido === 'asc' ? -1 : 1
      if (x > y) return sentido === 'asc' ? 1 : -1
    }
    return 0
  })
}

function delegado(tabla, { defaults = () => ({}), unico } = {}) {
  let reloj = 0
  // Fechas estrictamente crecientes: el orden por creadoEn es determinista.
  const ahora = () => new Date(Date.UTC(2026, 10, 9, 12, 0, 0) + ++reloj * 1000)
  const crear = (data) => {
    const registro = { id: randomUUID(), creadoEn: ahora(), ...defaults(), ...data }
    if (unico?.(tabla, registro)) {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    }
    tabla.push(registro)
    return registro
  }
  return {
    findMany: async ({ where, select, orderBy, take } = {}) =>
      ordenar(tabla.filter((r) => cumple(r, where)), orderBy).slice(0, take ?? Infinity).map((r) => elegir(r, select)),
    findUnique: async ({ where, select } = {}) => {
      const registro = tabla.find((r) => cumple(r, where))
      return registro ? elegir(registro, select) : null
    },
    findFirst: async ({ where, select } = {}) => {
      const registro = tabla.find((r) => cumple(r, where))
      return registro ? elegir(registro, select) : null
    },
    count: async ({ where } = {}) => tabla.filter((r) => cumple(r, where)).length,
    create: async ({ data, select }) => elegir(crear(data), select),
    createMany: async ({ data, skipDuplicates }) => {
      let count = 0
      for (const fila of data) {
        try {
          crear(fila)
          count += 1
        } catch (error) {
          if (!skipDuplicates) throw error
        }
      }
      return { count }
    },
    update: async ({ where, data, select }) => {
      const registro = tabla.find((r) => cumple(r, where))
      if (!registro) throw Object.assign(new Error('Record not found'), { code: 'P2025' })
      Object.assign(registro, data)
      return elegir(registro, select)
    },
    updateMany: async ({ where, data }) => {
      const lista = tabla.filter((r) => cumple(r, where))
      for (const registro of lista) Object.assign(registro, data)
      return { count: lista.length }
    },
    upsert: async ({ where, create, update, select }) => {
      const registro = tabla.find((r) => cumple(r, where))
      if (registro) {
        Object.assign(registro, update)
        return elegir(registro, select)
      }
      return elegir(crear(create), select)
    },
    deleteMany: async ({ where }) => {
      const antes = tabla.length
      const quedan = tabla.filter((r) => !cumple(r, where))
      tabla.splice(0, tabla.length, ...quedan)
      return { count: antes - quedan.length }
    },
    delete: async ({ where }) => {
      const indice = tabla.findIndex((r) => cumple(r, where))
      if (indice < 0) throw Object.assign(new Error('Record not found'), { code: 'P2025' })
      return tabla.splice(indice, 1)[0]
    },
  }
}

/** Base en memoria con las tablas del dominio social. */
export function crearBaseFalsa() {
  const tablas = {
    usuario: [], perfil: [], grupo: [], miembroGrupo: [], invitacionGrupo: [], recomendacionGrupo: [], notificacion: [],
  }
  const db = {
    tablas,
    usuario: delegado(tablas.usuario),
    perfil: delegado(tablas.perfil, { defaults: () => ({ apellido: null, edad: null, avatar: null, esPrincipal: false }) }),
    grupo: delegado(tablas.grupo, { defaults: () => ({ descripcion: null }) }),
    miembroGrupo: delegado(tablas.miembroGrupo, {
      defaults: () => ({ rol: 'miembro' }),
      unico: (tabla, r) => tabla.some((o) => o.grupoId === r.grupoId && o.usuarioId === r.usuarioId),
    }),
    invitacionGrupo: delegado(tablas.invitacionGrupo, {
      defaults: () => ({ estado: 'pendiente', destinatarioId: null, respondidoEn: null }),
    }),
    recomendacionGrupo: delegado(tablas.recomendacionGrupo, {
      defaults: () => ({ destinatarioId: null, poster: null, mensaje: null, autorPerfilId: null }),
    }),
    notificacion: delegado(tablas.notificacion, {
      defaults: () => ({ perfilId: null, datos: {}, clave: null, leida: false }),
      unico: (tabla, r) => r.clave != null && tabla.some((o) => o.usuarioId === r.usuarioId && o.clave === r.clave),
    }),
  }
  // ON DELETE CASCADE de Grupo y Perfil, como en la migración.
  const borrarGrupo = db.grupo.delete
  db.grupo.delete = async (args) => {
    const grupo = await borrarGrupo(args)
    for (const tabla of ['miembroGrupo', 'invitacionGrupo', 'recomendacionGrupo']) {
      await db[tabla].deleteMany({ where: { grupoId: grupo.id } })
    }
    return grupo
  }
  db.$transaction = async (accion) => accion(db)
  return db
}
