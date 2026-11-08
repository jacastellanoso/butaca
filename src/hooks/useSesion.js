import { useCallback, useEffect, useRef, useState } from 'react'

import { esSesionRechazada, prepararCuenta } from '../lib/cuenta.js'
import { validarSesion } from '../lib/sesion.js'
import { supabase } from '../lib/supabase.js'
import { olvidarSincronizacion, sincronizarUsuario } from '../services/usuarios.js'

const esperar = (milisegundos) => new Promise((resolve) => window.setTimeout(resolve, milisegundos))

async function renovarToken() {
  if (!supabase) return false
  const { data, error } = await supabase.auth.refreshSession()
  return !error && Boolean(data?.session?.access_token)
}

const MENSAJE_ESPERA = 'Estamos despertando los servicios de Butaca. Puede tardar hasta un minuto…'

/* oxlint-disable react/set-state-in-effect -- sincronización asíncrona con Supabase Auth */
/**
 * Estado de la sesión validado contra Supabase Auth.
 * estado: 'cargando' | 'autenticado' | 'anonimo' | 'error' | 'sin-configuracion'
 *
 * Cada ingreso (nuevo o repetido) llama a POST /api/usuarios, que crea o
 * recupera la cuenta sin duplicarla. Los fallos transitorios (Render
 * despertando) se reintentan; Reintentar vuelve a empezar desde cero.
 */
export function useSesion() {
  const [sesion, setSesion] = useState({ estado: 'cargando', usuario: null })
  const actual = useRef(sesion)
  // Supabase puede emitir INITIAL_SESSION y SIGNED_IN casi juntos: solo la
  // última validación en curso puede cambiar el estado.
  const generacion = useRef(0)

  const fijar = useCallback((nuevo) => {
    actual.current = nuevo
    setSesion(nuevo)
  }, [])

  const validar = useCallback(async ({ silenciosa = false } = {}) => {
    const id = ++generacion.current
    const vigente = () => id === generacion.current
    const resultado = await validarSesion(supabase)
    if (!vigente()) return

    if (resultado.estado === 'autenticado') {
      const previo = actual.current
      // Renovación de token de una cuenta ya preparada: no se vuelve a la pantalla de carga.
      if (silenciosa && previo.estado === 'autenticado' && previo.usuario?.id === resultado.usuario.id) {
        fijar({ ...previo, usuario: resultado.usuario })
        return
      }
      try {
        const registro = await prepararCuenta({
          sincronizar: sincronizarUsuario,
          renovarToken,
          esperar,
          alEsperar: () => {
            if (vigente()) fijar({ estado: 'cargando', usuario: null, mensaje: MENSAJE_ESPERA })
          },
        })
        if (vigente()) fijar({ estado: 'autenticado', usuario: resultado.usuario, registro })
      } catch (error) {
        if (!vigente()) return
        fijar({
          estado: 'error',
          usuario: resultado.usuario,
          registro: null,
          mensaje: esSesionRechazada(error)
            ? 'Tu sesión expiró. Reintentá para volver a iniciar sesión.'
            : 'Tu sesión fue validada, pero no pudimos preparar tu cuenta. Intentá de nuevo.',
        })
      }
      return
    }
    fijar({
      estado: resultado.estado,
      usuario: resultado.usuario ?? null,
      registro: null,
      mensaje: resultado.estado === 'error'
        ? 'No pudimos verificar tu sesión con Supabase. Revisá tu conexión.'
        : null,
    })
  }, [fijar])

  useEffect(() => {
    if (!supabase) {
      validar()
      return undefined
    }

    const { data } = supabase.auth.onAuthStateChange((evento, sesionInicial) => {
      if (evento === 'SIGNED_OUT') {
        generacion.current += 1
        // La próxima cuenta que ingrese en esta pestaña debe sincronizarse de nuevo.
        olvidarSincronizacion()
        fijar({ estado: 'anonimo', usuario: null, registro: null })
      } else if (evento === 'INITIAL_SESSION' && !sesionInicial) {
        generacion.current += 1
        fijar({ estado: 'anonimo', usuario: null, registro: null })
      } else if (evento === 'INITIAL_SESSION' || evento === 'SIGNED_IN') {
        // No se llama a Supabase dentro del callback: puede bloquear su cola interna.
        window.setTimeout(() => validar({ silenciosa: evento === 'SIGNED_IN' }), 0)
      } else if (evento === 'USER_UPDATED' || evento === 'TOKEN_REFRESHED') {
        window.setTimeout(() => validar({ silenciosa: true }), 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [validar, fijar])

  const reintentar = useCallback(() => {
    fijar({ estado: 'cargando', usuario: null })
    validar()
  }, [validar, fijar])

  return { ...sesion, reintentar }
}
