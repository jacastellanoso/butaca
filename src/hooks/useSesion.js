import { useCallback, useEffect, useState } from 'react'

import { validarSesion } from '../lib/sesion.js'
import { supabase } from '../lib/supabase.js'
import { sincronizarUsuario } from '../services/usuarios.js'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con Supabase Auth */
/**
 * Estado de la sesión validado contra Supabase Auth.
 * estado: 'cargando' | 'autenticado' | 'anonimo' | 'error' | 'sin-configuracion'
 */
export function useSesion() {
  const [sesion, setSesion] = useState({ estado: 'cargando', usuario: null })

  const validar = useCallback(async () => {
    const resultado = await validarSesion(supabase)
    setSesion({ estado: resultado.estado, usuario: resultado.usuario ?? null })

    if (resultado.estado === 'autenticado') {
      // Crea o actualiza el registro local en Usuario; sin él, emociones y
      // biblioteca responden 409. Un fallo aquí se reintenta en cada guardado.
      sincronizarUsuario().catch((error) => {
        console.warn('No se pudo sincronizar el usuario con auth-service.', error?.codigo ?? error)
      })
    }
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
