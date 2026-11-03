// Backend falso para las pruebas E2E del frontend.
//
// Intercepta en el navegador (page.route) todo lo que la app pide al API
// Gateway (/api/*) y a Supabase Auth, y responde con el MISMO contrato que los
// microservicios reales (documentado en IARECURSO.md, secciones 8 y 9). Así
// las pruebas no necesitan Docker, Supabase, PostgreSQL ni la API key de TMDB,
// corren igual en cualquier máquina y en CI, y no dejan datos en la base real.
//
// Guarda estado en memoria durante la prueba: un favorito agregado en la
// galería aparece después en el dashboard, igual que con la base real.

import { randomUUID } from 'node:crypto'

import { SUPABASE_URL, TOKEN_PRUEBA, USUARIO_PRUEBA } from './sesion.js'

const EMOCIONES = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']

// Catálogo mínimo con la forma normalizada de catalog-service (pf14).
export const CATALOGO = [
  { tmdbId: 101, tipoTmdb: 'movie', titulo: 'La gran butaca', anio: 2025, generos: ['Comedia'], calificacion: 7.8 },
  { tmdbId: 102, tipoTmdb: 'movie', titulo: 'Noche de terror', anio: 2024, generos: ['Terror'], calificacion: 6.4 },
  { tmdbId: 201, tipoTmdb: 'tv', titulo: 'Serie del ánimo', anio: 2026, generos: ['Drama'], calificacion: 8.6 },
].map((item) => ({
  id: `${item.tipoTmdb}-${item.tmdbId}`,
  tipo: item.tipoTmdb === 'movie' ? 'Película' : 'Serie',
  fecha: `${item.anio}-01-15`,
  sinopsis: `Sinopsis de prueba de ${item.titulo}.`,
  portada: null,
  poster: null,
  esDemostracion: false,
  ...item,
}))

// Contenido por emoción con la forma de recommendations-service (pf15).
const RECOMENDACIONES = {
  movie: [
    { tmdbId: 301, titulo: 'Risas garantizadas', fecha: '2025-03-01', calificacion: 7.1 },
    { tmdbId: 302, titulo: 'Un día brillante', fecha: '2024-07-20', calificacion: 6.9 },
  ],
  tv: [{ tmdbId: 401, titulo: 'Temporada feliz', fecha: '2026-02-10', calificacion: 8.2 }],
}

const json = (route, status, cuerpo) =>
  route.fulfill({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(cuerpo) })

const paginar = (lista, url) => {
  const pagina = Number(url.searchParams.get('pagina') ?? 1)
  const limite = Number(url.searchParams.get('limite') ?? 20)
  const inicio = (pagina - 1) * limite
  return {
    resultados: lista.slice(inicio, inicio + limite),
    paginacion: { pagina, limite, total: lista.length, totalPaginas: Math.max(1, Math.ceil(lista.length / limite)) },
  }
}

export class BackendFalso {
  constructor() {
    this.animos = []
    this.favoritos = []
    this.historial = []
    // Todas las peticiones al gateway, para afirmar qué envió el front.
    this.peticiones = []
    // Rutas que deben fallar: { '/api/catalogo': 502 }.
    this.fallas = {}
  }

  /** Simula que un microservicio está caído (el gateway respondería 502). */
  fallar(prefijo, status = 502) {
    this.fallas[prefijo] = status
  }

  peticionesA(metodo, ruta) {
    return this.peticiones.filter((p) => p.metodo === metodo && p.ruta === ruta)
  }

  async conectar(page) {
    await page.route(`${SUPABASE_URL}/**`, (route) => this.#supabase(route))
    await page.route((url) => url.pathname.startsWith('/api/'), (route) => this.#gateway(route))
  }

  #supabase(route) {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/v1/user') {
      const autorizado = route.request().headers().authorization === `Bearer ${TOKEN_PRUEBA}`
      return autorizado ? json(route, 200, USUARIO_PRUEBA) : json(route, 401, { message: 'invalid JWT' })
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })
    return json(route, 404, { message: `Ruta de Supabase no simulada: ${url.pathname}` })
  }

  #gateway(route) {
    const request = route.request()
    const url = new URL(request.url())
    const metodo = request.method()
    const ruta = url.pathname
    const body = request.postData() ? request.postDataJSON() : undefined
    this.peticiones.push({ metodo, ruta, query: url.search, body, authorization: request.headers().authorization })

    const falla = Object.entries(this.fallas).find(([prefijo]) => ruta.startsWith(prefijo))
    if (falla) return json(route, falla[1], { error: 'El servicio solicitado no está disponible temporalmente.' })

    // Igual que requireAuth en cada microservicio (el catálogo es público).
    const conToken = request.headers().authorization === `Bearer ${TOKEN_PRUEBA}`
    if (!ruta.startsWith('/api/catalogo') && !conToken) {
      return json(route, 401, { error: 'Falta el token de sesión o su formato es incorrecto.' })
    }

    if (ruta === '/api/usuarios' && metodo === 'POST') {
      return json(route, 200, { id: USUARIO_PRUEBA.id, email: USUARIO_PRUEBA.email })
    }
    if (ruta === '/api/catalogo' && metodo === 'GET') {
      return json(route, 200, { fuente: 'tmdb', resultados: CATALOGO })
    }
    const detalle = ruta.match(/^\/api\/catalogo\/(movie|tv)\/(\d+)$/)
    if (detalle && metodo === 'GET') {
      const item = CATALOGO.find((c) => c.tipoTmdb === detalle[1] && c.tmdbId === Number(detalle[2]))
      return item ? json(route, 200, item) : json(route, 404, { error: 'No encontrado.' })
    }
    if (ruta === '/api/recomendaciones' && metodo === 'GET') return this.#recomendaciones(route, url)
    if (ruta.startsWith('/api/animos')) return this.#animos(route, metodo, ruta, url, body)
    if (ruta.startsWith('/api/favoritos')) return this.#favoritos(route, metodo, ruta, url, body)
    if (ruta.startsWith('/api/historial')) return this.#historial(route, metodo, ruta, url, body)

    return json(route, 404, { error: 'Ruta no encontrada en el API Gateway.', path: ruta })
  }

  #recomendaciones(route, url) {
    const tipo = url.searchParams.get('tipo') ?? 'movie'
    const animoId = url.searchParams.get('animoId')
    const emocion = animoId ? this.animos.find((a) => a.id === animoId)?.emocion : url.searchParams.get('emocion')
    if (!EMOCIONES.includes(emocion)) return json(route, 400, { error: 'La emoción no es válida.' })

    const resultados = RECOMENDACIONES[tipo].map((item) => ({
      ...item,
      tipo,
      descripcion: `Recomendada para ${emocion}.`,
      poster: null,
    }))
    return json(route, 200, { emocion, tipo, fuente: 'tmdb', resultados })
  }

  #animos(route, metodo, ruta, url, body) {
    if (metodo === 'POST') {
      // Mismas reglas que emotions-service (pf13): consentimiento explícito obligatorio.
      if (body?.consentimientoHistorial !== true) {
        return json(route, 403, { error: 'No se guarda el resultado sin autorización explícita.' })
      }
      if (!EMOCIONES.includes(body.emocion)) return json(route, 400, { error: 'La emoción no es válida.' })
      const animo = {
        id: randomUUID(),
        emocion: body.emocion,
        confianza: body.confianza ?? null,
        origen: body.origen ?? 'deteccion',
        consentimientoHistorial: true,
        consentimientoVersion: 'historial-v1',
        consentimientoEn: new Date().toISOString(),
        creadoEn: new Date().toISOString(),
      }
      this.animos.unshift(animo)
      return json(route, 201, animo)
    }
    const id = ruta.split('/')[3]
    if (id) {
      const animo = this.animos.find((a) => a.id === id)
      return animo ? json(route, 200, animo) : json(route, 404, { error: 'El registro emocional no existe.' })
    }
    return json(route, 200, paginar(this.animos, url))
  }

  #favoritos(route, metodo, ruta, url, body) {
    if (metodo === 'POST') {
      const existente = this.favoritos.find((f) => f.tmdbId === body.tmdbId && f.tipo === body.tipo)
      if (existente) return json(route, 200, existente)
      const favorito = { id: randomUUID(), ...body, poster: body.poster ?? null, creadoEn: new Date().toISOString() }
      this.favoritos.unshift(favorito)
      return json(route, 201, favorito)
    }
    if (metodo === 'DELETE') {
      const id = ruta.split('/')[3]
      const antes = this.favoritos.length
      this.favoritos = this.favoritos.filter((f) => f.id !== id)
      return antes === this.favoritos.length
        ? json(route, 404, { error: 'Ese favorito no existe.' })
        : route.fulfill({ status: 204 })
    }
    const tipo = url.searchParams.get('tipo')
    return json(route, 200, paginar(this.favoritos.filter((f) => !tipo || f.tipo === tipo), url))
  }

  #historial(route, metodo, ruta, url, body) {
    if (metodo === 'POST') {
      const registro = { id: randomUUID(), ...body, creadoEn: new Date().toISOString() }
      this.historial.unshift(registro)
      return json(route, 201, registro)
    }
    if (metodo === 'DELETE') {
      this.historial = this.historial.filter((h) => h.id !== ruta.split('/')[3])
      return route.fulfill({ status: 204 })
    }
    return json(route, 200, paginar(this.historial, url))
  }
}