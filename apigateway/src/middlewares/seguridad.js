// Capas de seguridad del API Gateway (pf23_Seguridad).
//
// El gateway es la ÚNICA puerta pública de Butaca (compose.yaml solo publica
// su puerto), así que aquí se aplican las defensas que valen para todos los
// microservicios, en este orden (Clase 19: casco → portero → límite):
//
//   helmet → cors → rate limit → tamaño del body → token → proxy
//
// La verificación REAL del token la sigue haciendo cada microservicio con
// Supabase (requireAuth). El gateway solo rechaza antes lo que es seguro
// rechazar sin consultar a nadie: peticiones privadas sin token.

import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'

import { env } from '../config/env.js'
import { services } from '../config/services.js'

const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const BEARER = /^Bearer [^\s]+$/

// ── Casco: encabezados de seguridad ─────────────────────────────────────
// El gateway solo devuelve JSON: la política de contenido más estricta
// posible ('none') no rompe nada y bloquea cualquier intento de ejecutar
// algo si una respuesta se abriera como página.
export const casco = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  // Las respuestas se leen desde otro origen (el front) mediante CORS.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
})

// ── Portero: CORS con lista blanca ──────────────────────────────────────
// Nunca '*'. A un origen que no está en la lista no se le envía
// Access-Control-Allow-Origin y el navegador bloquea la respuesta.
const permitidos = new Set(env.corsOrigins)

export const portero = cors({
  origin: (origen, listo) => listo(null, !origen || permitidos.has(origen)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // X-Butaca-Perfil: perfil activo de la cuenta; cada microservicio verifica que sea propio.
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Butaca-Perfil'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
  credentials: false,
  maxAge: 600,
})

// ── Límite de golpes: rate limit por IP ─────────────────────────────────
const demasiadas = (req, res, next, opciones) =>
  res.status(opciones.statusCode).json({
    error: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.',
  })

const comun = {
  windowMs: env.rateLimitWindowMs,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: demasiadas,
  // El preflight de CORS no cuenta: lo dispara el navegador, no el usuario.
  skip: (req) => req.method === 'OPTIONS',
}

// Todas las rutas /api/*: una pantalla del dashboard hace varias consultas
// seguidas, por eso el límite general es amplio.
export const limiteGeneral = rateLimit({ ...comun, limit: env.rateLimitMax, identifier: 'general' })

// Escrituras (guardar ánimo, favorito, historial): límite más estricto.
export const limiteEscritura = rateLimit({
  ...comun,
  limit: env.rateLimitWriteMax,
  identifier: 'escritura',
  skip: (req) => !METODOS_ESCRITURA.has(req.method),
})

// ── Tamaño máximo del body ──────────────────────────────────────────────
// El gateway no lee el body (lo reenvía como stream), pero puede rechazar
// por Content-Length antes de abrir una conexión con el microservicio.
export function limiteCuerpo(req, res, next) {
  const largo = Number(req.get('content-length') ?? 0)
  if (largo > env.maxBodyBytes) {
    return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande.' })
  }
  return next()
}

// ── Rutas privadas: exigir token antes del proxy ────────────────────────
// Solo los prefijos privados conocidos: una ruta inexistente sigue llegando
// a notFound (404) en lugar de responder 401.
const prefijosPrivados = services.filter((s) => !s.publico).flatMap((s) => s.paths)
const esPrivada = (ruta) =>
  prefijosPrivados.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`))

export function exigirToken(req, res, next) {
  // Montado en '/api': req.path no incluye ese prefijo, req.baseUrl sí.
  const ruta = `${req.baseUrl}${req.path}`
  if (req.method === 'OPTIONS' || !esPrivada(ruta)) return next()

  if (!BEARER.test(req.get('authorization') ?? '')) {
    return res.status(401).json({ error: 'Falta el token de sesión o su formato es incorrecto.' })
  }
  return next()
}
