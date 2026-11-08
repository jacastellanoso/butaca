import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { crearBaseFalsa } from './prismaFalso.js'

// Perfiles, grupos, invitaciones y notificaciones (auth-service).
// No carga .env ni se conecta a Supabase o PostgreSQL: todo se simula.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL('../.env.example', import.meta.url))
process.env.SUPABASE_URL = 'https://supabase.invalid'
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only'
process.env.DATABASE_URL = 'postgresql://test:test@database.invalid:5432/test'
process.env.DIRECT_URL = process.env.DATABASE_URL

const { supabase } = await import('../src/lib/supabase.js')
const { prisma } = await import('../src/lib/prisma.js')

const CUENTAS = {
  'token-ana': { id: 'usuario-ana', email: 'ana@example.com', nombre: 'Ana', apellido: 'García' },
  'token-beto': { id: 'usuario-beto', email: 'Beto@Example.com', nombre: 'Beto', apellido: 'Paz' },
  'token-caro': { id: 'usuario-caro', email: 'caro@example.com', nombre: null, apellido: null },
}

const getUser = mock.method(supabase.auth, 'getUser', async (token) => {
  const cuenta = CUENTAS[token]
  return cuenta
    ? { data: { user: { id: cuenta.id, email: cuenta.email } }, error: null }
    : { data: { user: null }, error: { status: 401, message: 'detalle privado' } }
})

const DELEGADOS = ['usuario', 'perfil', 'grupo', 'miembroGrupo', 'invitacionGrupo', 'recomendacionGrupo', 'notificacion']
const originales = Object.fromEntries([...DELEGADOS, '$transaction'].map((clave) => [clave, prisma[clave]]))
let db
let principal

function instalarBase() {
  db = crearBaseFalsa()
  for (const clave of [...DELEGADOS, '$transaction']) prisma[clave] = db[clave]
  principal = {}
  // Ana y Beto ya tienen cuenta con su perfil principal (creado por trigger en la base real).
  for (const token of ['token-ana', 'token-beto']) {
    const { id, email, nombre, apellido } = CUENTAS[token]
    db.tablas.usuario.push({ id, email, nombre, apellido, edad: 30, creadoEn: new Date() })
    const perfil = { id: crypto.randomUUID(), propietarioId: id, nombre, apellido, edad: 30, avatar: null, esPrincipal: true, creadoEn: new Date(0) }
    db.tablas.perfil.push(perfil)
    principal[token] = perfil
  }
}

const { app } = await import('../src/app.js')
let server
let baseUrl

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => instalarBase())

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  getUser.mock.restore()
  for (const [clave, valor] of Object.entries(originales)) prisma[clave] = valor
})

async function api(method, ruta, { token = 'token-ana', body, perfil } = {}) {
  const res = await fetch(`${baseUrl}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(perfil ? { 'X-Butaca-Perfil': perfil } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const texto = await res.text()
  return { status: res.status, body: texto ? JSON.parse(texto) : null }
}

const notificacionesDe = (usuarioId) => db.tablas.notificacion.filter((n) => n.usuarioId === usuarioId)

// ── Perfiles ───────────────────────────────────────────────────────────────

test('crea perfiles con nombre, apellido y edad y solo lista los de la propia cuenta', async () => {
  const creado = await api('POST', '/api/perfiles', { body: { nombre: ' Lucía ', apellido: 'García', edad: '12' } })
  assert.equal(creado.status, 201)
  assert.deepEqual(
    { nombre: creado.body.nombre, apellido: creado.body.apellido, edad: creado.body.edad, esPrincipal: creado.body.esPrincipal },
    { nombre: 'Lucía', apellido: 'García', edad: 12, esPrincipal: false },
  )

  const ana = await api('GET', '/api/perfiles')
  assert.deepEqual(ana.body.map((p) => p.nombre), ['Ana', 'Lucía'])
  const beto = await api('GET', '/api/perfiles', { token: 'token-beto' })
  assert.deepEqual(beto.body.map((p) => p.nombre), ['Beto'])
})

test('valida los datos del perfil y limita la cantidad por cuenta', async () => {
  for (const body of [{ nombre: 'L', apellido: 'García', edad: 12 }, { nombre: 'Lucía', apellido: '', edad: 12 }, { nombre: 'Lucía', apellido: 'García', edad: 3 }, { nombre: 'Lucía', apellido: 'García' }]) {
    assert.equal((await api('POST', '/api/perfiles', { body })).status, 400)
  }
  for (let i = 0; i < 5; i++) {
    assert.equal((await api('POST', '/api/perfiles', { body: { nombre: `Perfil ${i}`, apellido: 'García', edad: 20 } })).status, 201)
  }
  const extra = await api('POST', '/api/perfiles', { body: { nombre: 'Sobra', apellido: 'García', edad: 20 } })
  assert.equal(extra.status, 409)
})

test('editar o borrar un perfil ajeno responde 404 y el principal no se puede borrar', async () => {
  const ajeno = principal['token-beto'].id
  assert.equal((await api('PATCH', `/api/perfiles/${ajeno}`, { body: { nombre: 'Intruso' } })).status, 404)
  assert.equal((await api('DELETE', `/api/perfiles/${ajeno}`)).status, 404)
  assert.equal(db.tablas.perfil.find((p) => p.id === ajeno).nombre, 'Beto')

  assert.equal((await api('DELETE', `/api/perfiles/${principal['token-ana'].id}`)).status, 409)

  const { body: hijo } = await api('POST', '/api/perfiles', { body: { nombre: 'Tomás', apellido: 'García', edad: 9 } })
  const editado = await api('PATCH', `/api/perfiles/${hijo.id}`, { body: { edad: 10 } })
  assert.equal(editado.body.edad, 10)
  assert.equal((await api('DELETE', `/api/perfiles/${hijo.id}`)).status, 204)
  assert.equal(db.tablas.perfil.some((p) => p.id === hijo.id), false)
})

test('editar el perfil principal actualiza también los datos de la cuenta', async () => {
  const res = await api('PATCH', `/api/perfiles/${principal['token-ana'].id}`, { body: { apellido: 'Gómez', edad: 31 } })
  assert.equal(res.status, 200)
  const usuario = db.tablas.usuario.find((u) => u.id === 'usuario-ana')
  assert.equal(usuario.apellido, 'Gómez')
  assert.equal(usuario.edad, 31)
})

test('el encabezado X-Butaca-Perfil se verifica contra la cuenta autenticada', async () => {
  assert.equal((await api('GET', '/api/notificaciones', { perfil: 'no-es-uuid' })).status, 400)
  const ajeno = await api('GET', '/api/notificaciones', { perfil: principal['token-beto'].id })
  assert.equal(ajeno.status, 403)
})

// ── Grupos e invitaciones ──────────────────────────────────────────────────

async function grupoConBeto() {
  const { body: grupo } = await api('POST', '/api/grupos', { body: { nombre: 'Cine de los viernes' } })
  const { body: invitacion } = await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'beto@example.com' } })
  const { body: respuesta } = await api('PUT', `/api/invitaciones/${invitacion.id}`, { token: 'token-beto', body: { aceptar: true } })
  assert.equal(respuesta.estado, 'aceptada')
  return grupo
}

test('crear grupo, invitar por correo y aceptar desde la cuenta invitada', async () => {
  const creado = await api('POST', '/api/grupos', { body: { nombre: 'Cine de los viernes', descripcion: 'Pelis' } })
  assert.equal(creado.status, 201)
  assert.equal(creado.body.rol, 'propietario')

  const invitacion = await api('POST', `/api/grupos/${creado.body.id}/invitaciones`, { body: { email: 'BETO@example.com' } })
  assert.equal(invitacion.status, 201)
  assert.equal(invitacion.body.registrado, true)

  // Beto ve la invitación en su lista y en su centro de notificaciones.
  const recibidas = await api('GET', '/api/invitaciones', { token: 'token-beto' })
  assert.deepEqual(recibidas.body.map((i) => [i.grupoNombre, i.remitente]), [['Cine de los viernes', 'Ana García']])
  const avisos = await api('GET', '/api/notificaciones', { token: 'token-beto' })
  assert.equal(avisos.body.noLeidas, 1)
  assert.equal(avisos.body.resultados[0].tipo, 'invitacion-grupo')
  assert.equal(avisos.body.resultados[0].datos.invitacionId, invitacion.body.id)

  // Ana no puede responder una invitación dirigida a Beto.
  assert.equal((await api('PUT', `/api/invitaciones/${invitacion.body.id}`, { body: { aceptar: true } })).status, 404)

  const aceptada = await api('PUT', `/api/invitaciones/${invitacion.body.id}`, { token: 'token-beto', body: { aceptar: true } })
  assert.equal(aceptada.status, 200)

  const detalle = await api('GET', `/api/grupos/${creado.body.id}`, { token: 'token-beto' })
  assert.deepEqual(detalle.body.miembros.map((m) => [m.nombre, m.rol]), [['Ana García', 'propietario'], ['Beto Paz', 'miembro']])
  assert.equal(detalle.body.rol, 'miembro')

  // La notificación de Beto queda leída con el estado final; Ana recibe el aviso.
  const avisoBeto = notificacionesDe('usuario-beto').find((n) => n.tipo === 'invitacion-grupo')
  assert.equal(avisoBeto.leida, true)
  assert.equal(avisoBeto.datos.estado, 'aceptada')
  assert.deepEqual(notificacionesDe('usuario-ana').map((n) => n.tipo), ['invitacion-aceptada'])
})

test('rechazar una invitación avisa a quien invitó y no agrega al grupo', async () => {
  const { body: grupo } = await api('POST', '/api/grupos', { body: { nombre: 'Terror' } })
  const { body: invitacion } = await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'beto@example.com' } })
  const res = await api('PUT', `/api/invitaciones/${invitacion.id}`, { token: 'token-beto', body: { aceptar: false } })
  assert.equal(res.body.estado, 'rechazada')
  assert.equal((await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-beto' })).status, 404)
  assert.deepEqual(notificacionesDe('usuario-ana').map((n) => n.tipo), ['invitacion-rechazada'])
  // Responder dos veces no es posible.
  assert.equal((await api('PUT', `/api/invitaciones/${invitacion.id}`, { token: 'token-beto', body: { aceptar: true } })).status, 404)
})

test('una invitación a un correo sin cuenta se vincula cuando esa persona inicia sesión', async () => {
  const { body: grupo } = await api('POST', '/api/grupos', { body: { nombre: 'Series' } })
  const invitacion = await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'caro@example.com' } })
  assert.equal(invitacion.body.registrado, false)
  assert.equal(notificacionesDe('usuario-caro').length, 0)

  // Caro inicia sesión por primera vez: POST /api/usuarios la sincroniza.
  const original = prisma.usuario.upsert
  prisma.usuario.upsert = async ({ create }) => {
    db.tablas.usuario.push({ ...create, nombre: null, apellido: null, edad: null, creadoEn: new Date() })
    return { ...create, nombre: null, apellido: null, edad: null, creadoEn: new Date() }
  }
  try {
    assert.equal((await api('POST', '/api/usuarios', { token: 'token-caro' })).status, 200)
  } finally {
    prisma.usuario.upsert = original
  }
  const avisos = await api('GET', '/api/notificaciones', { token: 'token-caro' })
  assert.equal(avisos.body.resultados[0].tipo, 'invitacion-grupo')
  const recibidas = await api('GET', '/api/invitaciones', { token: 'token-caro' })
  assert.equal(recibidas.body.length, 1)
})

test('no se puede invitar a quien ya es integrante ni a uno mismo; quien no es integrante no ve el grupo', async () => {
  const grupo = await grupoConBeto()
  assert.equal((await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'beto@example.com' } })).status, 409)
  assert.equal((await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'ana@example.com' } })).status, 400)
  assert.equal((await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'no-es-correo' } })).status, 400)
  assert.equal((await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-caro' })).status, 404)
  assert.equal((await api('POST', `/api/grupos/${grupo.id}/recomendaciones`, {
    token: 'token-caro', body: { tmdbId: 1, tipo: 'movie', titulo: 'X' },
  })).status, 404)
})

test('compartir una recomendación muestra quién la compartió y notifica al resto del grupo', async () => {
  const grupo = await grupoConBeto()
  const { body: hija } = await api('POST', '/api/perfiles', { body: { nombre: 'Lucía', apellido: 'García', edad: 12 } })

  const compartida = await api('POST', `/api/grupos/${grupo.id}/recomendaciones`, {
    perfil: hija.id,
    body: { tmdbId: 101, tipo: 'movie', titulo: 'La gran butaca', poster: 'javascript:alert(1)', mensaje: '¡Mírenla!' },
  })
  assert.equal(compartida.status, 201)
  assert.equal(compartida.body.autorNombre, 'Lucía García')
  assert.equal(compartida.body.poster, null)

  const detalle = await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-beto' })
  assert.deepEqual(detalle.body.recomendaciones.map((r) => [r.titulo, r.autorNombre, r.esMia]), [['La gran butaca', 'Lucía García', false]])

  const aviso = notificacionesDe('usuario-beto').find((n) => n.tipo === 'recomendacion-compartida')
  assert.equal(aviso.titulo, 'Lucía García te recomendó algo')
  assert.equal(notificacionesDe('usuario-ana').some((n) => n.tipo === 'recomendacion-compartida'), false)
})

test('una recomendación dirigida a un integrante solo la ven el autor y el destinatario', async () => {
  const grupo = await grupoConBeto()
  // Caro se une también.
  db.tablas.usuario.push({ id: 'usuario-caro', email: 'caro@example.com', creadoEn: new Date() })
  const { body: inv } = await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'caro@example.com' } })
  await api('PUT', `/api/invitaciones/${inv.id}`, { token: 'token-caro', body: { aceptar: true } })

  const res = await api('POST', `/api/grupos/${grupo.id}/recomendaciones`, {
    body: { tmdbId: 201, tipo: 'tv', titulo: 'Serie del ánimo', destinatarioId: 'usuario-beto' },
  })
  assert.equal(res.status, 201)
  const deBeto = await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-beto' })
  const deCaro = await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-caro' })
  assert.equal(deBeto.body.recomendaciones.length, 1)
  assert.equal(deCaro.body.recomendaciones.length, 0)
  assert.equal(notificacionesDe('usuario-caro').some((n) => n.tipo === 'recomendacion-compartida'), false)

  // Un destinatario que no está en el grupo se rechaza.
  const fuera = await api('POST', `/api/grupos/${grupo.id}/recomendaciones`, {
    body: { tmdbId: 1, tipo: 'tv', titulo: 'X', destinatarioId: 'usuario-desconocido' },
  })
  assert.equal(fuera.status, 400)
})

test('gestión de integrantes: el propietario quita, un integrante sale y el propietario no puede salir', async () => {
  const grupo = await grupoConBeto()
  // Un integrante no puede quitar a otros.
  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}/miembros/usuario-ana`, { token: 'token-beto' })).status, 403)
  // El propietario no puede salir (puede eliminar el grupo).
  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}/miembros/usuario-ana`)).status, 409)

  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}/miembros/usuario-beto`)).status, 204)
  assert.equal((await api('GET', `/api/grupos/${grupo.id}`, { token: 'token-beto' })).status, 404)
  assert.ok(notificacionesDe('usuario-beto').some((n) => n.tipo === 'miembro-removido'))

  const otro = await grupoConBeto()
  assert.equal((await api('DELETE', `/api/grupos/${otro.id}/miembros/usuario-beto`, { token: 'token-beto' })).status, 204)
  assert.ok(notificacionesDe('usuario-ana').some((n) => n.tipo === 'miembro-salio'))
})

test('solo el propietario elimina el grupo y las invitaciones pendientes se pueden cancelar', async () => {
  const grupo = await grupoConBeto()
  const { body: inv } = await api('POST', `/api/grupos/${grupo.id}/invitaciones`, { body: { email: 'caro@example.com' } })
  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}/invitaciones/${inv.id}`)).status, 204)
  assert.equal(db.tablas.invitacionGrupo.find((i) => i.id === inv.id).estado, 'cancelada')

  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}`, { token: 'token-beto' })).status, 403)
  assert.equal((await api('DELETE', `/api/grupos/${grupo.id}`)).status, 204)
  assert.deepEqual((await api('GET', '/api/grupos', { token: 'token-beto' })).body, [])
  assert.ok(notificacionesDe('usuario-beto').some((n) => n.tipo === 'grupo-eliminado'))
})

// ── Notificaciones ─────────────────────────────────────────────────────────

const hoy = () => new Date().toISOString().slice(0, 10)

test('la recomendación del día es una por perfil y día, y solo la ve ese perfil', async () => {
  const { body: hija } = await api('POST', '/api/perfiles', { body: { nombre: 'Lucía', apellido: 'García', edad: 12 } })
  const contenido = { tmdbId: 301, tipo: 'movie', titulo: 'Risas garantizadas', fecha: hoy() }

  const primera = await api('POST', '/api/notificaciones/del-dia', { body: contenido })
  const repetida = await api('POST', '/api/notificaciones/del-dia', { body: contenido })
  assert.equal(primera.status, 201)
  assert.equal(repetida.status, 200)
  assert.equal(repetida.body.id, primera.body.id)

  const principalVe = await api('GET', '/api/notificaciones')
  const hijaVe = await api('GET', '/api/notificaciones', { perfil: hija.id })
  assert.equal(principalVe.body.resultados.length, 1)
  assert.equal(hijaVe.body.resultados.length, 0)

  assert.equal((await api('POST', '/api/notificaciones/del-dia', { body: { ...contenido, fecha: '2020-01-01' } })).status, 400)
})

test('marcar notificaciones como leídas solo afecta a las propias', async () => {
  await grupoConBeto()
  const [aviso] = notificacionesDe('usuario-ana')
  assert.equal((await api('PATCH', `/api/notificaciones/${aviso.id}`, { token: 'token-beto' })).status, 404)
  assert.equal(aviso.leida, false)

  assert.equal((await api('PATCH', `/api/notificaciones/${aviso.id}`)).status, 200)
  assert.equal(aviso.leida, true)

  await api('POST', '/api/notificaciones/del-dia', { body: { tmdbId: 1, tipo: 'tv', titulo: 'Algo', fecha: hoy() } })
  const todas = await api('POST', '/api/notificaciones/leer-todas')
  assert.equal(todas.body.actualizadas, 1)
  assert.equal((await api('GET', '/api/notificaciones')).body.noLeidas, 0)
})
