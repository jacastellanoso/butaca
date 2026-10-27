# IARECURSO — Guía permanente de desarrollo de Butaca

> **Consulta obligatoria:** toda persona o asistente de IA debe leer este archivo antes de crear, editar, mover o eliminar código del proyecto. Después de cada cambio se debe actualizar esta guía para mantenerla alineada con la implementación real.

## 1. Estado del proyecto

- Aplicación creada con React 19 y Vite 8.
- Rama actual de autenticación: `pf3_OAuth20`, basada en `pf2_InicioPantalla`.
- Rama de la pantalla de rostro: `pf4_RostroPantalla`, basada en `dev`.
- Rama del backend: `pf5_Express`, basada en `dev`. API REST con Express 5 en `backend/`, puerto `3010`.
- Rama de configuración PostgreSQL: `pf6_Supabase`. Configuración preparada y conexión verificada con una herramienta temporal; el backend todavía guarda los datos en memoria.
- Pantallas implementadas: `Main`, destinada visualmente a visitantes sin sesión, y `Rostro`, con cámara, consentimiento e interfaz de detección de emociones (accesible temporalmente desde `/#rostro`).
- Alcance actual: presentación visual, animaciones e inicio de sesión OAuth 2.0 con Google o GitHub mediante Supabase. El cliente conserva y renueva la sesión; todavía no existen rutas protegidas ni una pantalla posterior al acceso.
- Tipografía oficial de toda la aplicación: **Montserrat**. Está instalada localmente mediante `@fontsource/montserrat` y se cargan solamente los subconjuntos latinos de los pesos 400, 600, 700 y 800 desde `src/main.jsx`.

## 2. Regla de actualización

Antes de implementar un cambio:

1. Leer este documento completo.
2. Revisar el componente y los estilos relacionados.
3. Mantener la arquitectura y las convenciones aquí descritas.
4. No renombrar recursos existentes sin actualizar todas sus importaciones.
5. La autenticación se centraliza en `src/lib/supabase.js`; no se deben crear clientes adicionales dentro de componentes.
6. Nunca incluir claves secretas, `service_role` ni secretos de proveedores en el frontend. Solo se permite la clave publicable de Supabase mediante variables `VITE_`.
7. En el backend, `process.env` solo se lee en `backend/src/config/env.js`; el resto del código importa `env`.
8. En el backend, los controladores no guardan ni consultan datos directamente: siempre llaman a un service de `backend/src/services/`.
9. El usuario de una petición se obtiene **siempre** de `req.user` (token verificado por `requireAuth`), nunca de un id enviado en el body, la query o la URL.

Después de implementar un cambio:

1. Documentar los componentes, archivos, estilos o animaciones nuevos.
2. Registrar decisiones técnicas relevantes.
3. Actualizar la lista de funcionalidades pendientes.
4. Ejecutar `npm run lint` y `npm run build`.
5. Si se modificó el backend, levantarlo con `npm run dev` dentro de `backend/` y comprobar que `GET /api/health` responde `200`.

## 3. Arquitectura actual

```text
src/
├── App.jsx                  # Punto de composición; muestra Main o Rostro (/#rostro).
├── App.css                  # Regla mínima del contenedor raíz.
├── index.css                # Estilos globales, Montserrat y normalización.
├── main.jsx                 # Inicio de React y carga local de la tipografía.
├── assets/
│   ├── decorations/         # Ondas y formas gráficas de fondo.
│   ├── icons/               # Logotipos usados por controles de interfaz.
│   ├── images/              # Imágenes PNG decorativas.
│   └── text/                # Seis capas SVG de la composición del título.
├── lib/
│   └── supabase.js          # Cliente único de Supabase y entrada a OAuth.
└── pages/
    ├── Main/
    │   ├── Main.jsx         # Estructura semántica de la pantalla inicial.
    │   └── Main.css         # Diseño, responsive y animaciones de Main.
    └── Rostro/
        ├── Rostro.jsx         # Pantalla de cámara, consentimiento y estado de detección.
        ├── Rostro.css         # Diseño, responsive y animaciones de Rostro.
        ├── CameraConsent.jsx  # Solicitud de consentimiento y variante de rechazo.
        ├── EmotionStatus.jsx  # Presentación de los estados de detección.
        ├── emotions.js        # Etiquetas en español de las expresiones de face-api.js.
        └── useCamera.js       # Ciclo de vida de getUserMedia y errores de cámara.
```

```text
backend/                       # API REST (Express 5, ES Modules). Proyecto npm independiente.
├── package.json               # Scripts: dev (node --watch), start, test (node --test).
├── .env.example               # Nombres de las variables del backend, sin valores.
└── src/
    ├── server.js              # Único archivo que hace listen (puerto de env.port).
    ├── app.js                 # Crea y exporta Express sin listen (lo usan las pruebas).
    ├── config/env.js          # Única lectura de process.env.
    ├── constants/emociones.js # Emociones de face-api.js y tipos de contenido válidos.
    ├── lib/supabase.js        # Cliente de servidor para verificar sesiones.
    ├── middlewares/           # requireAuth, notFound y errorHandler.
    ├── routes/                # index.js monta /api; un router por recurso.
    ├── controllers/           # Leen req, validan y eligen el código HTTP.
    └── services/              # Lógica y datos; se reemplazan sin tocar controladores.
```

Los recursos gráficos están clasificados dentro de `src/assets/` según su función. Conservan exactamente sus nombres originales y se importan desde `Main.jsx`. No se deben duplicar en la raíz ni entre subcarpetas.

## 4. Componentes de Main

- `Main`: organiza tres niveles visuales independientes: fondo, decoraciones y contenido principal.
- `central-scene`: contenedor de escena a pantalla completa que agrupa la onda central y `main-content`. Ambos comparten el mismo centro y escalan mediante reglas responsive sin depender de coordenadas independientes.
- `WaveGroup`: reutiliza `cuadroefecto.svg` en cuatro capas concéntricas. Se instancia en el centro, esquina superior izquierda y esquina inferior derecha.
- `AccessButton`: componente reutilizable para Google y GitHub. Recibe la acción OAuth, bloquea ambos controles mientras comienza la redirección y comunica el estado de carga con `aria-busy`.
- `handleSignIn`: limpia errores previos, identifica el proveedor activo y solicita a Supabase el inicio de OAuth. Los errores se muestran en una región con `role="alert"` sin exponer detalles internos al usuario.
- `textLayers`: arreglo ordenado que registra las seis capas SVG del título. Su orden también determina el `z-index` y el retraso de aparición.

## 5. Pantalla Rostro (`pf4_RostroPantalla`)

### Alcance

Diseño de la pantalla de cámara, consentimiento e interfaz de detección. **No** incluye face-api.js ni detecciones simuladas: la integración del motor corresponde a `pf10_FaceAPI`.

### Acceso temporal

`App.jsx` muestra `Rostro` solo cuando el hash es exactamente `#rostro` y escucha `hashchange`. Cualquier otro hash (incluido el retorno de OAuth de Supabase) sigue mostrando `Main`. Cuando exista la navegación definitiva, se reemplaza esta condición por la ruta correspondiente; `Rostro` no depende de ella.

### Flujo

1. **Consentimiento** (`CameraConsent`): explica que Butaca necesita la cámara para analizar expresiones faciales y ofrecer recomendaciones personalizadas, e indica que no se guardan imágenes ni videos. Botones "Activar cámara" y "Ahora no".
2. **Rechazo**: "Ahora no" o "Apagar cámara" muestran la variante "La cámara está desactivada" con la opción de activarla luego.
3. **Solicitud**: mientras el navegador pide permiso, el botón muestra "Esperando permiso…" con `aria-busy`.
4. **Cámara activa**: video en vivo en espejo, guía de encuadre ovalada, `EmotionStatus` y botón "Apagar cámara".
5. **Error de cámara** (`CameraError`): mensaje específico y botón "Intentar de nuevo".

### `useCamera`

- Solicita solo video (`facingMode: 'user'`, ideal 1280 × 720, `audio: false`) y únicamente tras la aceptación del usuario.
- Estados: `idle`, `requesting`, `active`, `error`.
- Errores (`CAMERA_ERRORS`): `denied` (NotAllowedError/SecurityError), `notFound` (NotFoundError/OverconstrainedError), `busy` (NotReadableError/AbortError), `insecure` (contexto no seguro), `unsupported` (sin `mediaDevices`), `interrupted` (el track terminó) y `unknown`.
- Detiene todos los tracks al apagar, al desmontar la pantalla (incluido el cambio de hash), en `pagehide` y si la pantalla se cierra mientras el navegador aún pedía permiso.
- No graba, no captura fotogramas y no almacena imágenes.

### Contrato para `pf10_FaceAPI`

```jsx
<Rostro
  onVideoReady={(video) => { /* <video> en vivo, o null al apagar */ }}
  detection={{ status, emotion, confidence, message }}
/>
```

- `onVideoReady(video)`: se llama en `loadeddata` con el `HTMLVideoElement` que debe usarse como entrada de face-api.js y con `null` en `emptied` (cámara apagada). El espejo es solo visual (CSS); los fotogramas no se alteran.
- `detection.status`: `ready` (por defecto), `analyzing`, `detected`, `inconclusive` o `error`.
- `detection.emotion`: clave de `EMOTIONS` (`neutral`, `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`), las mismas expresiones que entrega face-api.js.
- `detection.confidence`: probabilidad entre 0 y 1; se muestra como barra y porcentaje.
- `detection.message`: texto opcional que reemplaza la descripción por defecto.
- El estado también se refleja en la guía de encuadre mediante `data-detection`: blanco con barrido en `analyzing`, verde en `detected`, amarillo en `inconclusive` y rojo en `error`.

### Diseño

- Reutiliza de `Main.css` el degradado, las ondas de esquina (`WaveGroup` local con las mismas clases) y las cuatro decoraciones con sus animaciones.
- Título en Montserrat 800: "¿Cómo te **sentís** hoy?". La palabra resaltada imita las píldoras blancas con texto `#0072FF` y rotación `-3.1deg` de los títulos SVG.
- Recuadro translúcido con desenfoque; 4:3 en escritorio y 4:5 hasta `820px`, limitado por el ancho del contenedor (`100cqi`) y la altura de la ventana. En consentimiento o error crece si el texto lo necesita.
- `.rostro-scroll` permite desplazamiento vertical en pantallas bajas sin modificar `body { overflow: hidden }`.
- Hasta `1100px` se ocultan lentes y ticket; hasta `820px` las decoraciones bajan al 55 % de opacidad y el panel de estado pasa a columna; hasta `480px` los botones ocupan todo el ancho; con altura de hasta `640px` en escritorio se compacta el contenido.
- Animaciones: `rostro-rise` (entrada del encabezado, recuadro y panel), `face-scan` (barrido al analizar) y `status-pulse` (indicador de análisis). Todas se desactivan con `prefers-reduced-motion`.
- Accesibilidad: `EmotionStatus` usa `role="status"` con `aria-live="polite"`, los errores de cámara usan `role="alert"`, la confianza se expone como `role="meter"` y todos los botones conservan foco visible.

## 6. Backend Express (`pf5_Express`)

### Alcance

Configuración de Express, rutas, controladores y API REST. Los datos se guardan **temporalmente en memoria** (se borran al reiniciar el servidor) y las recomendaciones son **datos de ejemplo**. La base de datos (`pf6_Supabase`, `pf7_Prisma`), TMDB (`pf11_TMDB`), Zod (`pf15_Zod`), pruebas (`pf14_Testing`) y seguridad (`pf16_Seguridad`) se integran en sus ramas sin cambiar el contrato de esta sección.

### Ejecución local

```bash
cd backend
npm.cmd install        # solo la primera vez
npm.cmd run dev        # http://localhost:3010 (se reinicia al guardar)
```

El backend tiene su propio `package.json` y `node_modules`; se instala y ejecuta desde `backend/`, independiente del front.

### Capas

Una petición recorre: **ruta** → `requireAuth` → **controlador** → **service** → respuesta.

- `routes/index.js`: `GET /api/health` es pública y está **antes** de `requireAuth`; todo lo montado después exige sesión.
- `controllers/`: validación mínima con `if` (la reemplaza Zod en `pf15`) y elección del código HTTP.
- `services/`: objetos `animosService`, `favoritosService` y `recomendacionesService` con funciones `async`. Las ramas posteriores reemplazan el **cuerpo** de esas funciones conservando nombres, parámetros y forma de la respuesta.
- `app.js` aplica en orden: `express.json()`, `/api`, `notFound`, `errorHandler`. Los middlewares de `pf16` van antes de las rutas.

### Autenticación

El front debe enviar el token de la sesión de Supabase en cada petición protegida:

```js
const { data } = await supabase.auth.getSession()
fetch('http://localhost:3010/api/animos', {
  headers: { Authorization: `Bearer ${data.session.access_token}` },
})
```

- `requireAuth` exige `Authorization: Bearer <token>` y lo verifica con `supabase.auth.getUser(token)` mediante `authService.obtenerUsuario`.
- Si es válido deja `req.user = { id, email }`; el `id` es el de `auth.users` de Supabase y es la clave para separar los datos de cada persona.
- Sin token o con token inválido/expirado responde `401`. Si Supabase no está configurado o no responde, el error llega a `errorHandler` (`500`), para no culpar al usuario.
- `authService` se exporta como objeto para poder reemplazar `obtenerUsuario` en las pruebas sin iniciar sesión real.

### Endpoints

| Método | Ruta | Sesión | Body / query | Respuestas |
|---|---|---|---|---|
| GET | `/api/health` | No | — | `200 { status: 'ok' }` |
| POST | `/api/animos` | Sí | `{ emocion, confianza }` | `201` ánimo creado · `400` |
| GET | `/api/animos` | Sí | — | `200` lista de ánimos del usuario |
| GET | `/api/recomendaciones` | Sí | `?emocion=happy&tipo=movie` (`tipo` opcional, por defecto `movie`) | `200` · `400` |
| GET | `/api/favoritos` | Sí | — | `200` lista de favoritos del usuario |
| POST | `/api/favoritos` | Sí | `{ tmdbId, tipo, titulo, poster? }` | `201` creado · `200` si ya existía · `400` |
| DELETE | `/api/favoritos/:id` | Sí | — | `204` · `404` si no existe o no pertenece al usuario |

- `emocion`: una de `neutral`, `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised` (las mismas de `src/pages/Rostro/emotions.js`).
- `confianza`: número entre `0` y `1` (la probabilidad de face-api.js).
- `tipo`: `movie` o `tv` (los nombres de TMDB).
- Todas las respuestas de error tienen la forma `{ error: 'mensaje' }`.

### Formas de respuesta

```js
// Ánimo
{ id, emocion, confianza, creadoEn }            // creadoEn en ISO 8601

// Favorito (no se duplica la combinación tmdbId + tipo por usuario)
{ id, tmdbId, tipo, titulo, poster, creadoEn }

// Recomendaciones
{ emocion, tipo, fuente, resultados: [
  { tmdbId, titulo, descripcion, poster, fecha, calificacion, tipo },
] }
```

`fuente` vale `'ejemplo'` mientras no exista la integración con TMDB. Los campos de `resultados` están normalizados en español para que la galería no tenga que distinguir entre películas (`title`, `release_date`) y series (`name`, `first_air_date`) de TMDB.

### Manejo de errores

- `notFound`: `404` en JSON para rutas inexistentes. Dentro de `/api`, sin sesión se responde `401` antes de evaluar la ruta (no se revela qué rutas existen).
- `errorHandler`: JSON mal formado → `400`; cualquier otro error → `500` con mensaje genérico. El detalle solo se imprime en la consola del servidor.

### Contratos para otras ramas

- `pf7_Prisma`: implementar modelos, migraciones, cliente Prisma y persistencia de datos; reemplazar el cuerpo de `animosService` y `favoritosService` por consultas filtradas por `usuarioId`. Conviene un índice único `(usuarioId, tmdbId, tipo)` en favoritos.
- `pf11_TMDB`: reemplazar `recomendacionesService.obtener({ emocion, tipo })`, guardar la API key como variable del backend (agregarla a `config/env.js` y `.env.example`) y devolver la forma documentada con `fuente: 'tmdb'`.
- `pf15_Zod`: reemplazar las validaciones `if` de los controladores y la lectura de `config/env.js` por esquemas.
- `pf14_Testing`: importar `app` desde `src/app.js` con supertest y simular sesiones con `mock.method(authService, 'obtenerUsuario', ...)`.
- `pf16_Seguridad`: agregar helmet, CORS con lista blanca y rate limit en `app.js`, antes de `app.use('/api', ...)`.

## 7. Recursos gráficos

### Título compuesto

Las siguientes imágenes están en `src/assets/text/`, comparten el mismo lienzo `2608 × 1281` y deben permanecer superpuestas dentro de un único contenedor con relación `2607.4 / 1280.8`:

1. `preparatexto.svg`
2. `tustexto.svg`
3. `palomitastexto.svg`
4. `ytexto.svg`
5. `comienzaentexto.svg`
6. `butacatexto.svg`

No se deben recortar, reposicionar o escalar individualmente. La adaptación de tamaño siempre se realiza sobre el contenedor padre.

### Recursos de texto reservados para `pf4`

Los siguientes SVG se conservaron en `src/assets/text/` para la siguiente fase. Comparten un lienzo `2608 × 960`, todavía no se importan en ningún componente y no deben eliminarse por parecer recursos sin uso:

1. `quetexto.svg`
2. `veremostexto.svg`
3. `hoytexto.svg`

Cuando `pf4` defina su composición visual, debe importarlos desde esta carpeta y documentar aquí el componente, orden de superposición y comportamiento responsive que adopte.

`pf4_RostroPantalla` no los utiliza porque componen el texto "¿Qué veremos hoy?" y la pantalla de rostro usa "¿Cómo te sentís hoy?" en Montserrat. Se mantienen reservados para una pantalla futura.

### Decoraciones

- `src/assets/decorations/cuadroefecto.svg`: ondas de fondo con rotación de `-3.1deg` y opacidad de `34 %`.
- `src/assets/images/rollodiseño.png`: esquina superior izquierda.
- `src/assets/images/lentesdiseño.png`: esquina superior derecha; oculto en móvil.
- `src/assets/images/ticketdiseño.png`: esquina inferior izquierda; oculto en móvil.
- `src/assets/images/palomitasdiseño.png`: esquina inferior derecha.
- `src/assets/icons/logogoogle.svg` y `src/assets/icons/logogithub.svg`: iconos de los botones de acceso.

## 8. Estilos y responsive

- Fondo a pantalla completa: degradado vertical de `#0470F6` a `#0000B0`.
- La página usa `100svh`, evita barras de desplazamiento y controla los niveles mediante contextos de apilamiento.
- En escritorio, los botones se muestran horizontalmente.
- Hasta `820px`, los botones pasan a columna, se vuelven más compactos y se ocultan lentes y ticket. En ese tamaño aumentan el rollo, las palomitas y moderadamente las ondas de esquina para conservar presencia visual sin competir con el contenido.
- En teléfonos de hasta `480px`, los botones tienen un máximo de `212 × 36 px`; la onda central usa un ancho relativo máximo del `56vw` para enmarcar el contenido sin ocupar excesivamente la pantalla.
- Existe un ajuste adicional para anchos de hasta `480px` o alturas de hasta `560px`.
- Todos los controles interactivos conservan foco visible para navegación con teclado.
- `prefers-reduced-motion: reduce` desactiva animaciones y muestra todas las capas del título directamente.

## 9. Animaciones

- `build-center-wave`: efecto introductorio de expansión elástica controlada de la onda central.
- `build-top-left-wave` y `build-bottom-right-wave`: trasladan y expanden las ondas exteriores hasta sus esquinas definitivas.
- `reveal-layer`: aparición secuencial del título, una sola vez desde los 1650 ms, con intervalos de 140 ms y duración de 320 ms.
- `reveal-button`: entrada independiente de los botones mediante opacidad, desplazamiento vertical y escala. Google comienza a los 2700 ms y GitHub a los 2860 ms, después del título.
- `decoration-enter`: entrada escalonada desde los bordes entre los 900 y 1290 ms, antes de la flotación permanente.
- `wave-breathe`: expansión y contracción lenta e infinita de las ondas después de terminar su construcción inicial.
- `float`: flotación sutil, asíncrona y permanente de las cuatro decoraciones cinematográficas, con duraciones distintas.
- Los botones incluyen transiciones discretas para `hover`, `focus-visible` y `active`.

## 10. Accesibilidad

- El documento usa `lang="es"`.
- El título visual compuesto por SVG cuenta con un `h1` oculto visualmente para lectores de pantalla.
- Las imágenes decorativas se ocultan a tecnologías de asistencia.
- Los botones usan elementos `<button>` reales porque inician una acción; anuncian el estado de carga y se deshabilitan para evitar solicitudes duplicadas.
- Los estados de foco son visibles y las animaciones respetan la preferencia de movimiento reducido.

## 11. Autenticación y entorno

- Dependencia oficial: `@supabase/supabase-js`.
- Proyecto Supabase: `fxumhujdmabgxjqmzoxs`.
- Proveedores habilitados en Supabase: Google y GitHub.
- `src/lib/supabase.js` crea una única instancia con persistencia, renovación automática y detección de sesión en la URL.
- Variables requeridas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `.env.example` documenta los nombres sin publicar credenciales. `.env.local` contiene la configuración local y Git lo ignora.
- La URL de retorno enviada a Supabase es `window.location.origin`. Cada origen usado en desarrollo o producción debe incluirse en **Authentication > URL Configuration > Redirect URLs** del panel de Supabase.
- Backend: `backend/.env` (ignorado por Git) con `PORT`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `DATABASE_URL`. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` corresponden a las variables `VITE_` del front; el backend los usa solo para verificar tokens. Si faltan, `server.js` muestra un aviso y las rutas protegidas responden `500`.
- El servidor MCP de Supabase para Codex está configurado y autenticado con el proyecto correcto. El MCP sirve para administración y documentación; la aplicación usa el SDK en tiempo de ejecución.

### Configuración PostgreSQL (`pf6_Supabase`)

- Alcance: preparar la configuración de PostgreSQL en Supabase para la futura integración con Prisma, sin implementar modelos, migraciones ni persistencia.
- `SUPABASE_URL` es la URL de API/Auth usada por el cliente Supabase; `DATABASE_URL` es la cadena privada de conexión PostgreSQL. No son intercambiables y `DATABASE_URL` nunca debe exponerse mediante variables `VITE_`.
- `backend/src/config/env.js` lee `DATABASE_URL` y la expone como `env.databaseUrl`, con cadena vacía si no está definida. El resto del backend mantiene la regla de importar `env` sin leer `process.env` directamente. `backend/.env.example` documenta `DATABASE_URL=` sin valores privados.
- Para la prueba local mediante IPv4 se utilizó el Session pooler de Supabase.
- La conexión se verificó con una herramienta temporal de Node.js y `pg`, instalada fuera del repositorio y sin agregar dependencias al proyecto. Se ejecutó únicamente `SELECT 1 AS conexion;`, que devolvió `conexion = 1`, con tiempo límite de conexión y cierre del cliente al finalizar.
- La prueba validó TLS y el hostname mediante la CA oficial descargada de Supabase, configurada en `ssl.ca` con `rejectUnauthorized: true`.
- El certificado y la herramienta temporal permanecen fuera del directorio del repositorio; las credenciales solo se mantienen en el archivo local `backend/.env`, ignorado por Git y fuera del contenido versionado. No se publican contraseñas ni cadenas de conexión.
- **El backend todavía no utiliza PostgreSQL para guardar datos**: ánimos y favoritos continúan en memoria. Prisma no está implementado; los modelos, migraciones, cliente Prisma y persistencia corresponden a `pf7_Prisma`.

## 12. Funcionalidades pendientes

- Definir la pantalla o ruta a mostrar después de una autenticación exitosa.
- Añadir cierre de sesión y una interfaz que represente al usuario autenticado.
- Añadir navegación y rutas cuando existan más pantallas, reemplazando el acceso temporal `/#rostro`.
- Integrar face-api.js en `Rostro` mediante `onVideoReady` y `detection` (`pf10_FaceAPI`).
- Conectar el front con el backend enviando `Authorization: Bearer <access_token>` en cada petición protegida.
- Reemplazar el almacenamiento en memoria del backend por Prisma + Supabase (`pf7_Prisma`) y las recomendaciones de ejemplo por TMDB (`pf11_TMDB`).
- Habilitar CORS con lista blanca, helmet y rate limit en el backend (`pf16_Seguridad`); hasta entonces el navegador bloquea las peticiones desde `localhost:5173`.
- Sustituir el favicon provisional de Vite por el recurso oficial de Butaca cuando se proporcione.
- Incorporar pruebas automatizadas cuando se definan los flujos funcionales.

## 13. Historial

### 2026-10-27 — Modelos, migraciones y CRUD con Prisma (`pf7_Prisma`)

- Se configuró Prisma ORM en `backend/prisma/schema.prisma` conectado a PostgreSQL en Supabase mediante `DATABASE_URL` y `DIRECT_URL`.
- Se definieron los modelos `Usuario`, `Animo` y `Favorito` con relaciones 1–N, borrado en cascada y unicidad `@@unique([usuarioId, tmdbId, tipo])` en favoritos.
- Se ejecutó la migración inicial `init_butaca_models` y se creó la instancia única `PrismaClient` en `backend/src/lib/prisma.js`.
- Se reemplazó el almacenamiento temporal en memoria de `animosService` y `favoritosService` por consultas reales a PostgreSQL sin alterar los controladores.

### 2026-10-26 — Configuración PostgreSQL (`pf6_Supabase`)

- Se agregó `DATABASE_URL` a `backend/.env.example` y su lectura centralizada como `env.databaseUrl` en `backend/src/config/env.js`.
- Se preparó la configuración privada local, ignorada por Git, para el Session pooler de Supabase mediante IPv4.
- Se verificó la conexión con una herramienta temporal externa al repositorio: `SELECT 1 AS conexion;` devolvió `1`, con validación TLS y del hostname mediante la CA oficial de Supabase.
- La prueba no creó tablas, modificó datos ni ejecutó migraciones. El backend conserva el almacenamiento en memoria; la integración con Prisma queda pendiente para `pf7_Prisma`.

### 2026-10-26 — Backend Express (`pf5_Express`)

- Se creó `backend/` como proyecto npm independiente con Express 5, dotenv y `@supabase/supabase-js`.
- Se separó `app.js` (configuración exportable) de `server.js` (único `listen`) para permitir pruebas con supertest.
- Se implementó la API REST de ánimos, recomendaciones y favoritos con arquitectura de rutas, controladores y services.
- Se agregó `requireAuth`, que verifica el token de Supabase y expone `req.user`; `GET /api/health` queda pública.
- Se agregaron `notFound` y `errorHandler` con respuestas JSON y sin exponer detalles internos.
- Los datos se guardan temporalmente en memoria y las recomendaciones son de ejemplo hasta `pf7_Prisma` y `pf11_TMDB`.
- Se documentaron las variables en `backend/.env.example`.

### 2026-10-25 — Pantalla de rostro (`pf4_RostroPantalla`)

- Se creó `src/pages/Rostro/` con la pantalla "¿Cómo te sentís hoy?", consentimiento previo, vista previa de cámara y estados visuales de detección.
- Se implementó `useCamera` sobre `getUserMedia`: activación solo tras el consentimiento, apagado manual, manejo de errores y liberación de la cámara al salir.
- Se creó `EmotionStatus` como componente de presentación listo para recibir resultados de face-api.js, sin implementar ni simular detecciones.
- `App.jsx` habilita temporalmente la pantalla en `/#rostro` sin afectar `Main` ni el retorno de OAuth.
- No se agregaron dependencias.

### 2026-10-25 — OAuth 2.0 con Supabase

- Se instaló el cliente oficial `@supabase/supabase-js` y se creó una instancia centralizada.
- Los botones de Google y GitHub ahora inician el flujo OAuth correspondiente.
- Se incorporaron estados accesibles de carga, bloqueo contra solicitudes duplicadas y mensajes seguros de error.
- Se documentaron las variables de entorno y se protegió la configuración local mediante `.gitignore`.
- Se configuró y autenticó en Codex el MCP de Supabase para el proyecto `fxumhujdmabgxjqmzoxs`.
- Se incorporaron `quetexto.svg`, `veremostexto.svg` y `hoytexto.svg` en `src/assets/text/` como recursos reservados para el desarrollo de `pf4`.

### 2026-10-24 — Secuencia cinematográfica y escena responsive

- Se creó `central-scene` para mantener alineados la onda central, el título y los botones al cambiar la resolución.
- Se añadió una introducción coordinada de aproximadamente 3.3 segundos: ondas, decoraciones, título y botones.
- Las decoraciones ahora entran desde sus bordes correspondientes antes de iniciar la flotación ambiental.
- Se redujeron exclusivamente en móvil la onda central y los botones, manteniendo intacta la composición final de escritorio.
- Se amplió el tratamiento de `prefers-reduced-motion` para omitir la introducción y conservar las escalas finales de las ondas.

### 2026-10-24 — Refinamiento visual y organización de recursos

- Se compactaron los botones en móvil y se añadió su entrada secuencial posterior al título.
- Se redujeron y reposicionaron las ondas de esquina en escritorio para mostrar solo una sección parcial.
- Se aumentó la presencia del rollo, las palomitas y las ondas laterales en móvil.
- Se agregó una entrada escalonada a las decoraciones antes de sus ciclos de flotación asíncronos.
- Se trasladaron los recursos originales a `src/assets/text`, `icons`, `decorations` e `images`, sin duplicarlos ni renombrarlos.

### 2026-10-24 — Pantalla inicial

- Se reemplazó la demostración de Vite por la página `Main`.
- Se integraron todas las capas SVG del título y los PNG cinematográficos proporcionados.
- Se crearon ondas animadas, entrada secuencial del título y botones visuales sin autenticación.
- Se implementó adaptación para escritorio, móvil y movimiento reducido.
- Se estableció Montserrat como tipografía oficial local del proyecto.
