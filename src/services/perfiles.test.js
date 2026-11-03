import assert from 'node:assert/strict'
import { test } from 'node:test'

import { guardarPerfilActivo, limpiarPerfilActivo, obtenerPerfilActivo, perfilDeCuenta } from './perfiles.js'

function memoria() {
  const datos = new Map()
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  }
}

test('el perfil usa el nombre y avatar HTTPS de Supabase Auth', () => {
  const perfil = perfilDeCuenta({
    id: 'u-1',
    email: 'ana@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: ' Ana Pérez ', avatar_url: 'https://lh3.example.com/a.png' },
  })
  assert.deepEqual(perfil, {
    id: 'u-1', nombre: 'Ana Pérez', email: 'ana@example.com',
    avatar: 'https://lh3.example.com/a.png', proveedor: 'google', inicial: 'A',
  })
})

test('sin nombre se usa el usuario de GitHub o el correo; avatares no HTTPS se descartan', () => {
  assert.equal(perfilDeCuenta({ id: 'u', user_metadata: { user_name: 'octo' } }).nombre, 'octo')
  const porCorreo = perfilDeCuenta({ id: 'u', email: 'luis@example.com', user_metadata: { avatar_url: 'javascript:alert(1)' } })
  assert.equal(porCorreo.nombre, 'luis')
  assert.equal(porCorreo.avatar, null)
  assert.equal(perfilDeCuenta(null), null)
})

test('el perfil activo solo vale para la misma cuenta', () => {
  const store = memoria()
  guardarPerfilActivo('u-1', 'u-1', store)
  assert.equal(obtenerPerfilActivo('u-1', store), 'u-1')
  assert.equal(obtenerPerfilActivo('u-2', store), null)
  limpiarPerfilActivo(store)
  assert.equal(obtenerPerfilActivo('u-1', store), null)
})

test('un valor corrupto en el almacenamiento no rompe la selección', () => {
  const store = memoria()
  store.setItem('butaca:perfil-activo', '{no-json')
  assert.equal(obtenerPerfilActivo('u-1', store), null)
})
