import { useCallback, useEffect, useState } from 'react'

import { validarSesion } from '../lib/sesion.js'
import { supabase } from '../lib/supabase.js'
import { sincronizarUsuario } from '../services/usuarios.js'

const esperar = (milisegundos) => new Promise((resolve) => window.setTimeout(resolve, milisegundos))

async function prepararCuenta() {
  let ultimoError
  for (const demora of [0, 1200, 2500]) {
    if (demora) await esperar(demora)
    try {
      return await sincronizarUsuario()
    } catch (error) {
      ultimoError = error
    }
  }
  throw ultimoError
}

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con Supabase Auth */
/**
 * Estado de la sesión validado contra Supabase Auth.
 * estado: 'cargando' | 'autenticado' | 'anonimo' | 'error' | 'sin-configuracion'
 */
export function useSesion() {
  const [sesion, setSesion] = useState({ estado: 'cargando', usuario: null })

  const validar = useCallback(async () => {
    const resultado = await validarSesion(supabase)
    if (resultado.estado === 'autenticado') {
      try {
        const registro = await prepararCuenta()
        setSesion({ estado: 'autenticado', usuario: resultado.usuario, registro })
      } catch {
        setSesion({
          estado: 'error',
          usuario: resultado.usuario,
          registro: null,
          mensaje: 'Tu sesión fue validada, pero no pudimos preparar tu cuenta. Intentá de nuevo.',
        })
      }
      return
    }
    setSesion({
      estado: resultado.estado,
      usuario: resultado.usuario ?? null,
      registro: null,
      mensaje: resultado.estado === 'error'
        ? 'No pudimos verificar tu sesión con Supabase. Revisá tu conexión.'
        : null,
    })
  }, [])

  useEffect(() => {
    if (!supabase) {
      validar()
      return undefined
    }

    const { data } = supabase.auth.onAuthStateChange((evento, sesionInicial) => {
      if (evento === 'SIGNED_OUT') {
        setSesion({ estado: 'anonimo', usuario: null })
      } else if (evento === 'INITIAL_SESSION' && !sesionInicial) {
        setSesion({ estado: 'anonimo', usuario: null, registro: null })
      } else if (
        evento === 'INITIAL_SESSION' || evento === 'SIGNED_IN' ||
        evento === 'USER_UPDATED' || evento === 'TOKEN_REFRESHED'
      ) {
        // No se llama a Supabase dentro del callback: puede bloquear su cola interna.
        window.setTimeout(validar, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [validar])

  const reintentar = useCallback(() => {
    setSesion({ estado: 'cargando', usuario: null })
    validar()
  }, [validar])

  return { ...sesion, reintentar }
}
