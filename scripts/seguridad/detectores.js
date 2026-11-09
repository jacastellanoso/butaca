// Detectores de secretos de Butaca (pf23). Lógica pura: recibe texto y
// devuelve hallazgos, sin leer archivos, para poder probarla con node:test.
//
// Se buscan SOLO los secretos que este proyecto usa de verdad, para no llenar
// el reporte de falsos positivos (las pruebas usan tokens y URLs inventadas).

const PLACEHOLDERS = /^(\[?your-password\]?|password|pass|secret|test|build|generate|user|postgres|tu[_-]?clave.*|x+|\*+|changeme|clave|contrase(ñ|n)a|\$\{.*\}|<.*>)$/i
const HOSTS_DE_PRUEBA = /(localhost|127\.0\.0\.1|\.invalid|\.example|\.test|database\.invalid)(:\d+)?$/i

function decodificarJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
}

/** Oculta el valor: solo deja ver los primeros 6 caracteres. */
export const enmascarar = (valor) => `${valor.slice(0, 6)}…(${valor.length} caracteres)`

// Valores ficticios exactos utilizados exclusivamente en pruebas de los detectores
// y registrados en el commit histórico 24a3eb1 de pf23_Seguridad.
export const ES_EJEMPLO_FICTICIO = (coincidencia, lineaCompleta = '') => {
  if (coincidencia === 'sb_secret_AbCdEfGhIjKlMnOpQrSt') return true
  if (coincidencia.includes('postgres.abcd:Cl4veReal!@aws-0-us-east-1.pooler.supabase.com')) return true
  if (coincidencia.includes('b3e7a06d85c97108194829ca46b85e85')) return true
  if (coincidencia.includes('PRIVATE KEY')) {
    return /buscarSecretos|assert|detectores|\.test/i.test(lineaCompleta)
  }
  return false
}

const DETECTORES = [
  {
    tipo: 'Clave secreta de Supabase (sb_secret_)',
    patron: /sb_secret_[A-Za-z0-9_-]{16,}/g,
  },
  {
    tipo: 'Token JWT con privilegios (service_role) o token de lectura de TMDB',
    patron: /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g,
    confirmar: (token) => {
      const payload = decodificarJwt(token)
      if (!payload) return false
      const esServiceRole = payload.role === 'service_role'
      const esTmdb = Array.isArray(payload.scopes) && payload.scopes.includes('api_read')
      return esServiceRole || esTmdb
    },
  },
  {
    tipo: 'Cadena de conexión PostgreSQL con contraseña real',
    patron: /postgres(?:ql)?:\/\/([^:\s'"`/]+):([^@\s'"`]+)@([^/\s'"`?]+)/g,
    confirmar: (_, usuario, clave, host) => !PLACEHOLDERS.test(clave) && !HOSTS_DE_PRUEBA.test(host),
  },
  {
    tipo: 'API key de TMDB asignada en el archivo',
    patron: /TMDB_API_KEY\s*[=:]\s*['"]?([a-f0-9]{32})\b/gi,
  },
  {
    tipo: 'Llave privada',
    patron: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
]

/** Busca secretos en un texto. Devuelve [{ tipo, linea, valor }]. */
export function buscarSecretos(texto, { ignorarEjemplosDePrueba = false } = {}) {
  const hallazgos = []
  const lineas = texto.split('\n')

  lineas.forEach((contenido, indice) => {
    for (const { tipo, patron, confirmar } of DETECTORES) {
      for (const coincidencia of contenido.matchAll(patron)) {
        if (confirmar && !confirmar(...coincidencia)) continue
        if (ignorarEjemplosDePrueba && ES_EJEMPLO_FICTICIO(coincidencia[0], contenido)) continue
        hallazgos.push({ tipo, linea: indice + 1, valor: enmascarar(coincidencia[0]) })
      }
    }
  })
  return hallazgos
}

/** Archivos .env reales que nunca deben estar en Git (.env.example sí). */
export function esArchivoDeSecretos(ruta) {
  const nombre = ruta.split('/').pop()
  return /^\.env(\..+)?$/.test(nombre) && nombre !== '.env.example'
}
