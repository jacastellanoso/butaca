// Emociones que reconoce Butaca (face-api.js). La relación emoción → géneros
// NO vive aquí: es única y está en catalog-service (src/constants/emociones.js);
// este servicio le pide al catálogo los títulos de cada emoción.
// Son preferencias editoriales; no representan efectos terapéuticos.
export const EMOCIONES = Object.freeze(['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'])

// Páginas del catálogo que se combinan para tener variedad sin pedir de más.
export const PAGINAS_CANDIDATAS = 2
export const MAXIMO_RESULTADOS = 20

export const esEmocionValida = (value) => EMOCIONES.includes(value)
