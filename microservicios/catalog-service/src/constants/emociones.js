// Relación entre emociones y géneros: ÚNICA fuente de verdad de Butaca.
//
// La usan el filtro por emoción de la galería (/api/catalogo?emocion=) y
// recommendations-service, que pide al catálogo los títulos de cada emoción.
// Son reglas editoriales de recomendación, no equivalencias psicológicas: la
// emoción detectada orienta qué mostrar, no es un diagnóstico.
//
// Se expresa con los IDs de género de TMDB, que difieren entre películas y
// series. TMDB no tiene género «biografía», «superhéroes», «deportes»,
// «suspenso» ni «drama psicológico»; se aproximan así:
//   biografía / histórico → Historia (películas); en series, Guerra y política
//   superhéroes           → Acción + Ciencia ficción / Fantasía
//   deportes              → Drama y Acción (no hay género propio)
//   suspenso              → Thriller (películas) y Misterio
//   drama psicológico     → Drama, solo combinado con Thriller, Crimen o Misterio
//   musical               → Música (películas; las series no lo tienen)

export const GENERO = Object.freeze({
  // Películas
  accion: 28, aventura: 12, animacion: 16, comedia: 35, crimen: 80, documental: 99, drama: 18,
  familiar: 10751, fantasia: 14, historia: 36, terror: 27, musica: 10402, misterio: 9648,
  romance: 10749, cienciaFiccion: 878, thriller: 53, belica: 10752,
  // Series
  accionAventuraTv: 10759, infantilTv: 10762, cienciaFiccionFantasiaTv: 10765, guerraPoliticaTv: 10768,
})

const G = GENERO

/**
 * Por emoción y tipo:
 * - generos: alguno debe estar presente (se consulta con OR).
 * - excluidos: si el título tiene alguno, no corresponde a la emoción.
 * - soloCombinados: géneros que por sí solos no alcanzan (p. ej. Drama en
 *   Enojo): cuentan solo si el título tiene además otro género de la lista.
 */
export const REGLAS_EMOCION = Object.freeze({
  neutral: {
    etiqueta: 'Calma',
    movie: {
      generos: [G.familiar, G.animacion, G.romance, G.documental, G.aventura, G.fantasia, G.comedia, G.musica],
      excluidos: [G.terror, G.thriller, G.crimen, G.belica],
    },
    tv: {
      generos: [G.familiar, G.animacion, G.infantilTv, G.documental, G.comedia],
      excluidos: [G.crimen, G.guerraPoliticaTv, G.misterio],
    },
  },
  happy: {
    etiqueta: 'Alegría',
    movie: {
      generos: [G.comedia, G.animacion, G.aventura, G.familiar, G.musica, G.fantasia, G.romance, G.accion],
      excluidos: [G.terror, G.belica, G.thriller],
    },
    tv: {
      generos: [G.comedia, G.animacion, G.accionAventuraTv, G.familiar, G.infantilTv],
      excluidos: [G.crimen, G.guerraPoliticaTv, G.misterio],
    },
  },
  sad: {
    etiqueta: 'Tristeza',
    movie: {
      generos: [G.drama, G.romance, G.familiar, G.animacion, G.historia, G.belica, G.musica],
      excluidos: [G.terror, G.thriller],
    },
    tv: {
      generos: [G.drama, G.familiar, G.animacion, G.guerraPoliticaTv],
      excluidos: [G.crimen],
      soloCombinados: [G.animacion, G.familiar],
    },
  },
  angry: {
    etiqueta: 'Enojo',
    movie: {
      generos: [G.accion, G.crimen, G.thriller, G.belica, G.drama],
      excluidos: [G.familiar, G.animacion],
      soloCombinados: [G.drama],
    },
    tv: {
      generos: [G.accionAventuraTv, G.crimen, G.guerraPoliticaTv, G.drama],
      excluidos: [G.familiar, G.infantilTv],
      soloCombinados: [G.drama],
    },
  },
  fearful: {
    etiqueta: 'Miedo',
    movie: {
      generos: [G.terror, G.thriller, G.misterio, G.cienciaFiccion, G.crimen, G.fantasia],
      excluidos: [G.familiar, G.animacion],
    },
    tv: {
      generos: [G.misterio, G.cienciaFiccionFantasiaTv, G.crimen],
      excluidos: [G.familiar, G.infantilTv, G.comedia],
    },
  },
  disgusted: {
    etiqueta: 'Desagrado',
    movie: {
      generos: [G.terror, G.thriller, G.crimen, G.misterio, G.drama, G.documental],
      excluidos: [G.familiar, G.animacion, G.comedia],
      soloCombinados: [G.drama],
    },
    tv: {
      generos: [G.crimen, G.misterio, G.drama, G.documental],
      excluidos: [G.familiar, G.infantilTv, G.comedia],
      soloCombinados: [G.drama],
    },
  },
  surprised: {
    etiqueta: 'Sorpresa',
    movie: {
      generos: [G.misterio, G.cienciaFiccion, G.fantasia, G.aventura, G.thriller, G.accion],
      excluidos: [G.documental],
    },
    tv: {
      generos: [G.misterio, G.cienciaFiccionFantasiaTv, G.accionAventuraTv],
      excluidos: [G.documental],
    },
  },
})

export const EMOCIONES = Object.freeze(Object.keys(REGLAS_EMOCION))

/** Emociones con las que se relaciona un título, según sus géneros de TMDB (puede ser más de una). */
export function emocionesDeGeneros(genreIds = [], tipoTmdb = 'movie') {
  const ids = new Set((genreIds ?? []).map(Number))
  return EMOCIONES.filter((emocion) => coincideConEmocion(ids, emocion, tipoTmdb))
}

/** ¿El título (por sus géneros) corresponde razonablemente a la emoción? */
export function coincideConEmocion(genreIds, emocion, tipoTmdb = 'movie') {
  const regla = REGLAS_EMOCION[emocion]?.[tipoTmdb === 'tv' ? 'tv' : 'movie']
  if (!regla) return false
  const ids = genreIds instanceof Set ? genreIds : new Set((genreIds ?? []).map(Number))
  if (regla.excluidos.some((id) => ids.has(id))) return false
  const coincidencias = regla.generos.filter((id) => ids.has(id))
  if (coincidencias.length === 0) return false
  const combinados = regla.soloCombinados ?? []
  return coincidencias.some((id) => !combinados.includes(id))
}
