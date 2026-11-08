import { useCallback, useEffect, useState } from 'react'

import { validarSesion } from '../lib/sesion.js'
import { prepararSesionOAuth, supabase } from '../lib/supabase.js'
import { sincronizarUsuario } from '../services/usuarios.js'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con Supabase Auth */
/**
 * Estado de la sesión validado contra Supabase Auth.
 * estado: 'cargando' | 'autenticado' | 'anonimo' | 'error' | 'sin-configuracion'
 */
export function useSesion() {
  const [sesion, setSesion] = useState({ estado: 'cargando', usuario: null })

  const validar = useCallback(async () => {
    try {
      await prepararSesionOAuth()
    } catch {
      setSesion({
        estado: 'error',
        usuario: null,
        registro: null,
        mensaje: 'No pudimos completar el inicio de sesión. Volvé a intentarlo con Google o GitHub.',
      })
      return
    }
    const resultado = await validarSesion(supabase)
    if (resultado.estado === 'autenticado') {
      try {
        const registro = await sincronizarUsuario()
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
    validar()
    if (!supabase) return undefined

    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setSesion({ estado: 'anonimo', usuario: null })
      } else if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
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
