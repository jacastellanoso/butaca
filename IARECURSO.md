# IARECURSO — Guía permanente de desarrollo de Butaca

> **Consulta obligatoria:** toda persona o asistente de IA debe leer este archivo antes de crear, editar, mover o eliminar código del proyecto. Después de cada cambio se debe actualizar esta guía para mantenerla alineada con la implementación real.

## 1. Estado del proyecto

- Aplicación creada con React 19 y Vite 8.
- Rama actual de autenticación: `pf3_OAuth20`, basada en `pf2_InicioPantalla`.
- Rama de la pantalla de rostro: `pf4_RostroPantalla`, basada en `dev`.
- Rama del backend: `pf5_Express`, basada en `dev`. API REST con Express 5 en `backend/`, puerto `3010`.
- Rama de configuración PostgreSQL: `pf6_Supabase`. Preparó y verificó la conexión que posteriormente utiliza `pf7_Prisma`.
- Rama de persistencia: `pf7_Prisma`, integrada en `dev`. Ánimos y favoritos se guardan mediante Prisma en PostgreSQL de Supabase.
- Rama del API Gateway: `pf8_APIGateway`, basada en `dev`. Gateway Express independiente en `apigateway/`, puerto `3000`, preparado para conectar cinco microservicios mediante Docker.
- Rama de contenedores: `pf9_Docker`, basada en `dev`. Esqueletos de los cinco microservicios en `microservicios/`, cada uno con su `Dockerfile`, y `compose.yaml` que levanta los seis contenedores con health checks.
- Rama del pie de página: `pf11_Pie`, basada en `dev` (con la galería de `pf10_GaleriaPrincipal` ya integrada). Componente reutilizable `Footer` integrado en la galería.
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
10. En el API Gateway, `process.env` solo se lee en `apigateway/src/config/env.js`; las rutas y destinos se declaran en `apigateway/src/config/services.js`.
11. El gateway no procesa el body antes del proxy. Cada microservicio valida su propio contenido y recibe sin cambios el método, ruta, query y encabezado `Authorization`.
12. Cada microservicio es un proyecto npm independiente en `microservicios/<servicio>/`. No importa código de otro servicio ni de `backend/`: si necesita algo, lo copia o lo pide por HTTP a través de su contrato.
13. Los secretos de un microservicio viven en `microservicios/<servicio>/.env` (ignorado por Git y por `.dockerignore`) y se documentan sin valores en su `.env.example`. Nunca se escriben en el `Dockerfile` ni en `compose.yaml`.
14. Solo `api-gateway` publica un puerto en `compose.yaml`. Los microservicios no deben agregar `ports:`.

Después de implementar un cambio:

1. Documentar los componentes, archivos, estilos o animaciones nuevos.
2. Registrar decisiones técnicas relevantes.
3. Actualizar la lista de funcionalidades pendientes.
4. Ejecutar `npm run lint` y `npm run build`.
5. Si se modificó el backend, levantarlo con `npm run dev` dentro de `backend/` y comprobar que `GET /api/health` responde `200`.
6. Si se modificó el gateway, ejecutar `npm test` dentro de `apigateway/`, comprobar `GET /health` y validar `docker compose config` cuando Docker esté disponible.
7. Si se modificó un microservicio, ejecutar `npm test` dentro de su carpeta y `docker compose up --build -d` desde la raíz; `docker compose ps` debe mostrar los seis contenedores `healthy`.

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
├── components/
│   └── Footer/              # Pie de página reutilizable (pf11_Pie).
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

```text
apigateway/                    # Entrada única para los microservicios (Express 5).
├── package.json               # Scripts: dev, start y test con node:test.
├── .env.example               # Puerto, timeout y destinos locales sin secretos.
├── Dockerfile                 # Imagen Node 22 Alpine con health check.
├── README.md                  # Contratos de rutas, ejecución y nombres Docker.
├── src/
│   ├── server.js              # Escucha en GATEWAY_PORT y realiza cierre ordenado.
│   ├── app.js                 # Health check, proxies y middlewares finales.
│   ├── config/
│   │   ├── env.js             # Única lectura y validación de process.env.
│   │   └── services.js        # Cinco destinos y sus rutas públicas.
│   ├── routes/
│   │   └── gateway.routes.js  # Proxies, timeouts y respuesta 502 uniforme.
│   └── middlewares/           # notFound y errorHandler del gateway.
└── test/
    └── gateway.test.js        # Health, 404 y microservicio no disponible.

microservicios/                # Cinco microservicios Express independientes (pf9_Docker).
├── auth-service/              # 3021 · /api/sesiones, /api/usuarios
├── emotions-service/          # 3022 · /api/animos
├── catalog-service/           # 3023 · /api/catalogo
├── recommendations-service/   # 3024 · /api/recomendaciones
└── library-service/           # 3025 · /api/favoritos, /api/historial
    ├── package.json           # Scripts: dev, start y test (node:test).
    ├── .env.example           # SERVICE_NAME, PORT y variables propias sin valores.
    ├── Dockerfile             # Node 22 Alpine, npm ci, usuario node y HEALTHCHECK.
    ├── .dockerignore          # Excluye node_modules, .env y test de la imagen.
    ├── src/
    │   ├── server.js          # listen y cierre ordenado con SIGTERM/SIGINT.
    │   ├── app.js             # /health, punto de montaje de rutas, notFound y errorHandler.
    │   ├── config/env.js      # Única lectura de process.env.
    │   └── middlewares/       # notFound (con nombre del servicio) y errorHandler.
    └── test/
        └── health.test.js     # Health, 404 en JSON y ausencia de X-Powered-By.

compose.yaml                   # Gateway + cinco microservicios en la red butaca-microservices.
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

Configuración de Express, rutas, controladores y API REST. La versión inicial de `pf5_Express` guardaba los datos temporalmente en memoria; `pf7_Prisma`, ya integrada en `dev`, reemplazó esa implementación por PostgreSQL sin cambiar el contrato HTTP. Las recomendaciones continúan siendo **datos de ejemplo** hasta `pf11_TMDB`. Zod (`pf15_Zod`), pruebas (`pf14_Testing`) y seguridad (`pf16_Seguridad`) se integran en sus ramas sin cambiar el contrato de esta sección.

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
- `services/`: objetos `animosService`, `favoritosService` y `recomendacionesService` con funciones `async`. Ánimos y favoritos ya consultan Prisma; recomendaciones conserva datos de ejemplo. Las ramas posteriores deben mantener nombres, parámetros y forma de la respuesta.
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

- `pf7_Prisma` (completada): implementó modelos, migraciones, cliente Prisma, consultas filtradas por `usuarioId` y el índice único `(usuarioId, tmdbId, tipo)` en favoritos.
- `pf11_TMDB`: reemplazar `recomendacionesService.obtener({ emocion, tipo })`, guardar la API key como variable del backend (agregarla a `config/env.js` y `.env.example`) y devolver la forma documentada con `fuente: 'tmdb'`.
- `pf15_Zod`: reemplazar las validaciones `if` de los controladores y la lectura de `config/env.js` por esquemas.
- `pf14_Testing`: importar `app` desde `src/app.js` con supertest y simular sesiones con `mock.method(authService, 'obtenerUsuario', ...)`.
- `pf16_Seguridad`: agregar helmet, CORS con lista blanca y rate limit en `app.js`, antes de `app.use('/api', ...)`.

## 7. API Gateway (`pf8_APIGateway`)

### Responsabilidad

El gateway en `apigateway/` es la única dirección que debe conocer el frontend. No contiene lógica de negocio ni accede directamente a Supabase, Prisma o TMDB: conserva la petición y la delega al microservicio responsable.

- Puerto local y Docker: `3000`.
- Health check público: `GET /health`.
- Los destinos y el timeout se configuran mediante variables de entorno.
- `Authorization: Bearer <token>` se reenvía sin cambios para que el servicio de sesión o cada servicio protegido valide la identidad.
- Si el destino no existe, rechaza la conexión o excede el timeout, el gateway responde `502` con `{ error, service }` sin exponer detalles internos.
- Una ruta que no pertenece a ningún contrato responde `404` en JSON.
- No se usa `express.json()` antes de los proxies porque consumiría el stream del body; cada microservicio es responsable de analizar y validar su contenido.

### Contratos de rutas

| Rutas públicas | Servicio Docker | Puerto | Variable | Responsabilidad futura |
|---|---|---:|---|---|
| `/api/sesiones`, `/api/usuarios` | `auth-service` | 3021 | `AUTH_SERVICE_URL` | Validar sesiones de Supabase y gestionar el usuario |
| `/api/animos` | `emotions-service` | 3022 | `EMOTIONS_SERVICE_URL` | Guardar y consultar resultados emocionales autorizados |
| `/api/catalogo` | `catalog-service` | 3023 | `CATALOG_SERVICE_URL` | Consultar películas, series y detalles en TMDB |
| `/api/recomendaciones` | `recommendations-service` | 3024 | `RECOMMENDATIONS_SERVICE_URL` | Relacionar emociones con contenido recomendado |
| `/api/favoritos`, `/api/historial` | `library-service` | 3025 | `LIBRARY_SERVICE_URL` | Administrar favoritos e historial |

Cada servicio debe aceptar la misma ruta pública recibida. El gateway no elimina `/api` ni renombra recursos.

### Docker

- `compose.yaml` construye `apigateway/Dockerfile`, publica `3000:3000` y crea la red bridge `butaca-microservices`.
- Los contenedores de los cinco microservicios se agregaron en `pf9_Docker` (sección 8).
- Docker resuelve los servicios por nombre dentro de la red; no se deben fijar direcciones IP de contenedores.
- Ejecutado fuera de Docker, el gateway puede iniciar sin los microservicios: `/health` responde normalmente y las rutas sin destino devuelven `502`.
- Para ejecutar solo el gateway: `docker compose up --build api-gateway` desde la raíz.

## 8. Docker y microservicios (`pf9_Docker`)

### Alcance

Infraestructura de contenedores para todo el backend de microservicios. Crea un **esqueleto funcional** de cada uno de los cinco servicios (Express mínimo con `/health`, pruebas y `Dockerfile`) y los conecta con el gateway en `compose.yaml`. **No** implementa lógica de negocio: cada responsable agrega sus rutas en su rama (`pf12` a `pf16`). El frontend no se contenedoriza: se ejecuta con `npm run dev` y se despliega en Vercel. `backend/` (pf5–pf7) no forma parte de `compose.yaml`; su código sirve de referencia para migrar la lógica a los microservicios.

### Ejecución

```bash
# Desde la raíz, con Docker Desktop encendido
docker compose up --build -d     # construye y levanta los seis contenedores
docker compose ps                # todos deben verse (healthy)
docker compose logs -f library-service   # logs de un servicio
docker compose down              # detiene y elimina contenedores y red
```

Para desarrollar un servicio sin Docker: `cd microservicios/<servicio>`, copiar `.env.example` como `.env`, `npm.cmd install` y `npm.cmd run dev`.

### Servicios

| Servicio Docker | Carpeta | Puerto interno | Rutas que recibe | Rama responsable |
|---|---|---:|---|---|
| `api-gateway` | `apigateway/` | 3000 (publicado) | todas | `pf8_APIGateway` |
| `auth-service` | `microservicios/auth-service/` | 3021 | `/api/sesiones`, `/api/usuarios` | `pf12_MSAutenticacion` |
| `emotions-service` | `microservicios/emotions-service/` | 3022 | `/api/animos` | `pf13_MSEmociones` |
| `catalog-service` | `microservicios/catalog-service/` | 3023 | `/api/catalogo` | `pf14_MSCatalogo` |
| `recommendations-service` | `microservicios/recommendations-service/` | 3024 | `/api/recomendaciones` | `pf15_MSRecomendaciones` |
| `library-service` | `microservicios/library-service/` | 3025 | `/api/favoritos`, `/api/historial` | `pf16_MSBiblioteca` |

### Esqueleto común

- Los cinco servicios tienen el mismo `src/`. `SERVICE_NAME` y `PORT` llegan por variables de entorno (`compose.yaml` o `.env`), por lo que cada contenedor se identifica sin cambiar código.
- `GET /health` responde `200 { status: 'ok', service }`. Lo usan el `HEALTHCHECK` del `Dockerfile` y `depends_on` del gateway.
- Rutas inexistentes responden `404 { error, service }`. El campo `service` permite comprobar a qué contenedor llegó una petición.
- `errorHandler` responde `400` ante JSON mal formado y `500` genérico en otros casos; el detalle solo se imprime en el log del contenedor.
- `x-powered-by` está deshabilitado.
- `server.js` atiende `SIGTERM` (la señal de `docker compose down`) y cierra conexiones antes de salir.

### Middleware de autenticación (`pf12_MSAutenticacion`)

- `auth-service/src/middlewares/requireAuth.js` exporta `requireAuth` y la fábrica `createRequireAuth` para inyectar un cliente simulado en pruebas. Verifica `Authorization: Bearer <token>` con el cliente Supabase reutilizable y `auth.getUser(token)`; solo asigna a `req.user` el `id` y el `email` devueltos por Supabase.
- Responde JSON con `401` si falta el token, el formato es incorrecto o la sesión es rechazada; `500` si falta configuración y `503` ante fallos de infraestructura, red o límites de solicitudes. No expone tokens ni detalles internos.
- `auth-service/test/requireAuth.test.js` cubre éxito, encabezados incorrectos, rechazo del token, usuario ausente, falta de configuración y fallos de Supabase mediante clientes simulados, sin credenciales reales ni conexiones externas. El usuario confirmó el resultado final de la suite de `auth-service`: **44/44 pruebas automatizadas aprobadas**.
- El middleware protege `GET /api/sesiones`, `POST /api/usuarios` y `GET /api/usuarios`; `/health` permanece público. La configuración de Prisma y los contratos de usuarios se describen abajo.

### Consulta de sesión (`pf12_MSAutenticacion`)

- `auth-service/src/app.js` monta `sesionesRouter` en `/api/sesiones`. `src/routes/sesiones.routes.js` declara `GET /` con `requireAuth` y el controlador `obtenerSesion` de `src/controllers/sesiones.controller.js`.
- Contrato: `GET /api/sesiones` exige `Authorization: Bearer <token>` y devuelve `200` con `{ "id": "<id de Supabase>", "email": "<email de Supabase>" }`, obtenido exclusivamente de `req.user`. No acepta identificadores del cliente para elegir la identidad ni consulta la base de datos.
- Sin token, con formato incorrecto o token rechazado reutiliza el `401` JSON de `requireAuth`. La falta de configuración y los fallos de infraestructura conservan sus respuestas `500` y `503` respectivamente. No se agregan operaciones POST en `/api/sesiones`.
- `auth-service/test/sesiones.test.js` prueba el endpoint HTTP local con `supabase.auth.getUser` simulado: éxito, rechazo, token ausente, formato incorrecto, `/health` público y POST inexistente. No usa credenciales reales ni conecta con Supabase y forma parte de las 44 pruebas aprobadas. En la integración real confirmada por el usuario, la autenticación con Supabase funcionó: `GET /api/sesiones` con token válido respondió `HTTP 200` mediante el Gateway y las solicitudes sin token fueron rechazadas con `HTTP 401`.

### Preparación de Prisma en auth-service (`pf12_MSAutenticacion`)

- `auth-service` declara `@prisma/client` como dependencia de producción y `prisma` como dependencia de desarrollo, ambos fijados en `6.19.3`, con script `prisma:generate` (`prisma generate`). Instalación y generación local: `npm.cmd ci` y `npm.cmd run prisma:generate` dentro de `microservicios/auth-service/`.
- `auth-service/prisma/schema.prisma` conserva el esquema completo de `backend/prisma/schema.prisma`: `Usuario`, `Animo` y `Favorito`, con sus nombres, relaciones e índices existentes. Describe las mismas tablas; generar el cliente no crea tablas ni modifica datos. No se copia ninguna carpeta de migraciones.
- Las migraciones siguen siendo responsabilidad del esquema principal en `backend/prisma/`. Este microservicio no ejecuta `migrate`, `db push` ni `db pull`; su copia debe mantenerse compatible cuando cambie el esquema principal.
- `src/config/env.js` centraliza `DATABASE_URL` y `DIRECT_URL` como `env.databaseUrl` y `env.directUrl`; `.env.example` documenta ambas sin valores. La configuración privada debe apuntar a la misma base y esquema del backend y se suministra localmente o en el entorno de ejecución, sin incorporarla al repositorio ni a la imagen.
- `src/lib/prisma.js` carga la configuración centralizada y exporta una única instancia de `PrismaClient` por proceso, siguiendo el patrón del backend. No llama a `$connect` ni ejecuta consultas al importarse; solo el servicio de usuarios lo usa para consultar o sincronizar. `/health` y `/api/sesiones` no consultan PostgreSQL.
- El Dockerfile de `auth-service` instala OpenSSL, instala dependencias de desarrollo para generar el cliente y luego las elimina con `npm prune --omit=dev`. La generación usa URLs ficticias limitadas al comando de construcción; las URLs reales solo se inyectan al ejecutar Docker/Render. Mantiene el usuario `node`, el puerto configurable y el health check existente. Para Render sin Docker: instalar incluyendo dependencias de desarrollo y generar durante el build; iniciar con `npm start`.
- El usuario confirmó la instalación, generación del cliente y pruebas reales de persistencia mediante Prisma en PostgreSQL, sin ejecutar migraciones desde este microservicio. La construcción y prueba básica de Docker fueron completadas con variables ficticias; los resultados y las alertas de seguridad pendientes se detallan abajo.

### Usuarios autenticados (`pf12_MSAutenticacion`)

- Arquitectura: `src/routes/usuarios.routes.js` aplica `requireAuth`, llama a `src/controllers/usuarios.controller.js` y este delega en `src/services/usuarios.service.js`, que usa la instancia reutilizable de Prisma. `src/app.js` monta el router en `/api/usuarios`.
- `POST /api/usuarios`: sin body obligatorio. Ejecuta `prisma.usuario.upsert` con `where: { id: req.user.id }`; crea usando el id y correo verificados o actualiza únicamente el correo. El correo ausente se normaliza a `null`. Ignora identidades y correos del body, query y headers personalizados. No modifica `creadoEn`, ánimos ni favoritos y repetir la operación no duplica registros. Devuelve `200` con `{ id, email, creadoEn }`.
- `GET /api/usuarios`: ejecuta `prisma.usuario.findUnique` usando exclusivamente `req.user.id` y selecciona `id`, `email` y `creadoEn`. Devuelve `200` con esos campos o `404 { error: 'El usuario autenticado no tiene un registro local.' }`. No crea ni modifica registros y no permite elegir otro usuario.
- Ambos endpoints requieren `Authorization: Bearer <token>` y conservan las respuestas del middleware: `401` por autenticación ausente o rechazada, `500` si Supabase no está configurado y `503` ante fallos de Supabase. Los fallos de persistencia responden `500` con un mensaje genérico de guardado o consulta; no se envía ni se imprime el error original de Prisma.
- `src/services/usuarios.service.js` usa una selección explícita de los tres campos públicos; no devuelve relaciones ni utiliza el correo como clave de identidad. Las fechas se serializan como cadenas ISO en JSON.
- `test/usuarios.test.js` simula `supabase.auth.getUser`, `prisma.usuario.upsert` y `prisma.usuario.findUnique` antes de utilizar la aplicación HTTP local. Cubre creación, sincronización repetida, correo ausente, conservación de fecha y relaciones, aislamiento entre usuarios, `404`, `401`, errores de persistencia y continuidad de `/health` y `/api/sesiones`, sin conexiones externas. Forma parte de la suite confirmada por el usuario con **44/44 pruebas aprobadas**.
- Integración real confirmada por el usuario: `POST /api/usuarios` directamente a `auth-service` respondió `HTTP 200` y registró al usuario en PostgreSQL mediante Prisma. `GET /api/usuarios` respondió `HTTP 200` tanto directamente como mediante el Gateway, con respuestas coincidentes.
- Dos `POST /api/usuarios` consecutivos mediante el Gateway y un `GET /api/usuarios` final respondieron `HTTP 200`, conservando la identidad y la fecha de creación. El proceso de `auth-service` permaneció estable durante las pruebas de diagnóstico.
- Inicialmente se observó un `HTTP 502` con `ECONNRESET` en un POST mediante el Gateway. El problema no volvió a reproducirse en las pruebas posteriores y su causa original no fue identificada; no se atribuye a una corrección específica.

### Verificación de Docker de auth-service (`pf12_MSAutenticacion`)

- El usuario confirmó que la imagen `butaca-auth-service:pf12` se construyó correctamente: Docker Build finalizó con **14/14 pasos**. El contenedor arrancó y apareció como `healthy`.
- `GET http://localhost:3022/health` respondió `HTTP 200` con `{ status: "ok", service: "butaca-service" }` en el contenedor de prueba. El contenedor se detuvo correctamente al finalizar.
- Se utilizaron variables ficticias: esta prueba confirma la construcción, el arranque y el health check, pero no conexiones reales a Supabase ni a PostgreSQL desde Docker.

### Auditoría de seguridad de auth-service (`pf12_MSAutenticacion`)

- El usuario confirmó que `npm audit` y `npm audit --omit=dev` reportaron las mismas **tres vulnerabilidades altas**, correspondientes a la cadena `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5`. El aviso es `GHSA-ggr8-5vv4-36mx`.
- Se comprobó con `npm ls` dentro de la imagen Docker que los paquetes vulnerables permanecen instalados después de la instalación y poda de dependencias. La construcción exitosa y el health check no implican que la vulnerabilidad esté corregida.
- No se identificó una ruta de explotación desde los endpoints actuales, pero esto no garantiza ausencia de riesgo. **La vulnerabilidad sigue sin corregirse**.
- No se aplicó `npm audit fix --force`, porque propone migrar a Prisma `7.10.1`, un cambio mayor. Se recomienda evaluar una corrección compatible con Prisma 6 y dar seguimiento antes de fusionar el PR.

### Dockerfile

- Base `node:22-alpine`, igual que el gateway.
- Copia `package.json` y `package-lock.json` antes que `src/` para aprovechar la caché de capas: cambiar código no reinstala dependencias.
- `npm ci --omit=dev`: instalación exacta del lockfile, sin dependencias de desarrollo en los esqueletos; `auth-service` instala también las de desarrollo para generar Prisma y luego las elimina, como se describe arriba.
- `ARG PORT` → `ENV PORT`: el mismo `Dockerfile` sirve para los cinco servicios.
- `USER node`: el proceso no se ejecuta como root.
- `HEALTHCHECK` con `node` + `fetch` contra `/health` (Alpine no incluye `curl`).
- `CMD ["node", "src/server.js"]`: Node recibe directamente las señales de Docker.
- `.dockerignore` excluye `node_modules`, `.env`, `.env.*` (excepto `.env.example`), `test` y `coverage`.

### compose.yaml

- Red bridge `butaca-microservices`. Los servicios se resuelven por nombre (`http://library-service:3025`); no se usan IP fijas.
- Solo `api-gateway` publica `3000:3000`. Los microservicios son accesibles únicamente dentro de la red, por lo que no se puede evitar el gateway.
- `api-gateway` declara `depends_on` con `condition: service_healthy` para los cinco servicios: no arranca hasta que todos superan su health check.
- Cada microservicio declara `env_file` apuntando a su `.env` con `required: false`. Los secretos se inyectan al arrancar el contenedor y nunca quedan dentro de la imagen.
- `environment` fija `SERVICE_NAME` y `PORT`, y prevalece sobre el `.env`.
- `restart: unless-stopped` reinicia un contenedor caído salvo que se haya detenido manualmente.

### Cómo agregar la lógica de un microservicio (`pf12` a `pf16`)

1. Trabajar solo dentro de `microservicios/<servicio>/`.
2. Crear rutas, controladores y services siguiendo la arquitectura de `backend/` (sección 6) y montarlos en `src/app.js`, en el bloque marcado, con la **misma ruta pública** del gateway (por ejemplo `app.use('/api/favoritos', favoritosRouter)`).
3. Instalar dependencias con `npm.cmd install <paquete>` dentro de la carpeta del servicio para actualizar su `package-lock.json`.
4. Declarar nuevas variables en `src/config/env.js` y documentarlas sin valores en `.env.example`. Los valores reales van en `.env`.
5. Si el servicio usa Prisma, ajustar su `Dockerfile`: instalar OpenSSL (`RUN apk add --no-cache openssl`, Prisma lo necesita en Alpine), copiar `prisma/` y ejecutar `npx prisma generate` dentro de la imagen. Como `prisma` es dependencia de desarrollo, en ese caso instalar con `npm ci`, generar el cliente y luego `npm prune --omit=dev`.
6. No agregar `ports:` en `compose.yaml`; para probar, pasar por `http://localhost:3000`.
7. Verificar con `npm test`, `docker compose up --build -d` y `docker compose ps`.

### Verificación realizada

- `npm test` en los cinco servicios: 3/3 pruebas en cada uno.
- `docker compose up --build -d`: seis imágenes construidas y seis contenedores `healthy`.
- A través del gateway, cada ruta llegó a su servicio (`404` con el `service` correspondiente, en lugar del `502` previo) y `/api/nada` fue rechazada por el gateway.
- `http://localhost:3021/health` no responde desde el host: los microservicios no están expuestos.

## 9. Galería principal (`pf10_GaleriaPrincipal`)

### Alcance

- La pantalla se abre en `/#galeria` y conserva el sistema de navegación por hash existente. `/#rostro` sigue mostrando la cámara y cualquier otro hash muestra la bienvenida.
- `Rostro` incluye el enlace **Explorar la galería**. Desde la galería, **Escanearme** regresa a `/#rostro` sin recargar la aplicación.
- **Mis Recomendaciones** muestra un aviso temporal hasta que `pf15_MSRecomendaciones` implemente su pantalla y contrato.
- La interfaz usa los SVG oficiales `logobutacaoficial.svg`, `iconoescanearme.svg` e `iconomisreconocimientos.svg` ubicados en la raíz del proyecto.

### Componentes y datos

- `GaleriaPrincipal.jsx`: coordina carga, filtro activo, selección y avisos.
- `components/EncabezadoGaleria.jsx`: logo y acciones de navegación.
- `components/FiltrosGaleria.jsx`: categorías controladas mediante estado de React.
- `components/CuadriculaContenido.jsx` y `TarjetaContenido.jsx`: cuadrícula y tarjetas reutilizables.
- `components/DetalleContenido.jsx`: modal responsive; cierra mediante botón, clic en el fondo o tecla Escape.
- `components/EstadoGaleria.jsx`: skeletons y estados de error o ausencia de resultados.
- `data/contenidosDemo.js`: datos visuales temporales identificados expresamente como demostración; no representan datos de TMDB.
- `services/catalogo.js`: único punto de acceso a datos. `pf14_MSCatalogo` debe reemplazar su respuesta simulada por una solicitud al API Gateway, sin agregar consultas HTTP a las tarjetas.

### Contrato de integración pendiente

- El frontend solo debe consumir la ruta pública existente `/api/catalogo` mediante el API Gateway en el puerto `3000`; nunca debe llamar directamente a `catalog-service:3023`.
- No se definió un formato definitivo ni se inventaron subrutas. `pf14` debe documentar el contrato real antes de sustituir los datos simulados.
- El botón de favoritos es solo visual y permanece deshabilitado. Su persistencia corresponde a `pf16_MSBiblioteca`.

### Diseño y accesibilidad

- Fondo oficial `#0470F6` a `#0000B0`, encabezado blanco fijo, filtros desplazables y hasta siete columnas en escritorio, cinco en pantallas medianas, tres en tabletas y dos en teléfonos.
- Las tarjetas mantienen proporción `2 / 3`, muestran placeholder cuando no hay portada y revelan título/tipo mediante hover o foco.
- Todos los controles usan elementos semánticos, foco visible y nombres accesibles. El modal usa `role="dialog"`, `aria-modal` y recibe foco al abrirse.
- Las animaciones se desactivan con `prefers-reduced-motion`.

## 10. Pie de página (`pf11_Pie`)

### Alcance

- Componente reutilizable `Footer` en `src/components/Footer/` (`Footer.jsx` y `Footer.css`). Es el primer componente compartido entre pantallas; por eso vive fuera de `src/pages/`.
- Distribución inspirada en el pie de AlbaCinema, sin usar su marca: identidad de Butaca, columna **Menú**, columna **Sobre Butaca** y franja inferior con copyright e información legal.
- Integrado únicamente en `GaleriaPrincipal`, después de `<main>` y dentro de `.gallery-page`, que es el contenedor con scroll. `Main` y `Rostro` no lo incluyen: son pantallas de altura fija (`100svh`) con composición centrada y un pie rompería su diseño. Si en el futuro se agrega, debe hacerse una sola vez por pantalla.

### Contenido y enlaces

| Elemento | Destino |
|---|---|
| Inicio | `#` → `Main` |
| Explorar películas | `#galeria` |
| Escanearme | `#rostro` |
| Mis recomendaciones | Prop opcional `onRecommendations`. Si se recibe, se muestra como `<button>` (la galería le pasa el mismo aviso temporal del encabezado); si no, se muestra como texto atenuado no interactivo. Cuando `pf15_MSRecomendaciones` cree su pantalla, reemplazar por su ruta en `menuLinks`. |
| Privacidad, Términos y condiciones | Texto no interactivo (`title="Próximamente"`) hasta que existan sus páginas. |

- No se incluye información de contacto: el proyecto no cuenta todavía con teléfono, correo ni redes sociales oficiales. No se deben inventar.
- El logo es `logobutacaoficial.svg` (raíz). Como es azul `#0470F6`, el pie lo muestra en blanco con `filter: brightness(0) invert(1)`, sin duplicar el recurso.

### Diseño y responsive

- Fondo `#0000B0` → `#00007A` con un brillo radial `#0470F6`, línea superior en `#72B4FF`, texto blanco, separadores `rgb(255 255 255 / 16%)` y títulos de columna en `#9CCAFF`, mayúsculas y Montserrat 800.
- Hover discreto en los enlaces (color, opacidad y desplazamiento de 3 px), foco visible y sin animaciones de entrada. `prefers-reduced-motion` desactiva las transiciones.
- Escritorio: tres columnas (`1.15fr 0.85fr 1.15fr`) con separadores verticales.
- Hasta `900px`: la identidad ocupa todo el ancho y Menú/Sobre Butaca quedan en dos columnas.
- Hasta `560px`: una columna, identidad centrada, enlaces de 40 px de alto y franja inferior centrada.
- Verificado a 1280, 820 y 375 px sin desbordamiento horizontal.

## 11. Recursos gráficos

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

## 12. Estilos y responsive

- Fondo a pantalla completa: degradado vertical de `#0470F6` a `#0000B0`.
- La página usa `100svh`, evita barras de desplazamiento y controla los niveles mediante contextos de apilamiento.
- En escritorio, los botones se muestran horizontalmente.
- Hasta `820px`, los botones pasan a columna, se vuelven más compactos y se ocultan lentes y ticket. En ese tamaño aumentan el rollo, las palomitas y moderadamente las ondas de esquina para conservar presencia visual sin competir con el contenido.
- En teléfonos de hasta `480px`, los botones tienen un máximo de `212 × 36 px`; la onda central usa un ancho relativo máximo del `56vw` para enmarcar el contenido sin ocupar excesivamente la pantalla.
- Existe un ajuste adicional para anchos de hasta `480px` o alturas de hasta `560px`.
- Todos los controles interactivos conservan foco visible para navegación con teclado.
- `prefers-reduced-motion: reduce` desactiva animaciones y muestra todas las capas del título directamente.

## 13. Animaciones

- `build-center-wave`: efecto introductorio de expansión elástica controlada de la onda central.
- `build-top-left-wave` y `build-bottom-right-wave`: trasladan y expanden las ondas exteriores hasta sus esquinas definitivas.
- `reveal-layer`: aparición secuencial del título, una sola vez desde los 1650 ms, con intervalos de 140 ms y duración de 320 ms.
- `reveal-button`: entrada independiente de los botones mediante opacidad, desplazamiento vertical y escala. Google comienza a los 2700 ms y GitHub a los 2860 ms, después del título.
- `decoration-enter`: entrada escalonada desde los bordes entre los 900 y 1290 ms, antes de la flotación permanente.
- `wave-breathe`: expansión y contracción lenta e infinita de las ondas después de terminar su construcción inicial.
- `float`: flotación sutil, asíncrona y permanente de las cuatro decoraciones cinematográficas, con duraciones distintas.
- Los botones incluyen transiciones discretas para `hover`, `focus-visible` y `active`.

## 14. Accesibilidad

- El documento usa `lang="es"`.
- El título visual compuesto por SVG cuenta con un `h1` oculto visualmente para lectores de pantalla.
- Las imágenes decorativas se ocultan a tecnologías de asistencia.
- Los botones usan elementos `<button>` reales porque inician una acción; anuncian el estado de carga y se deshabilitan para evitar solicitudes duplicadas.
- Los estados de foco son visibles y las animaciones respetan la preferencia de movimiento reducido.

## 15. Autenticación y entorno

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
- El backend utiliza PostgreSQL mediante Prisma para guardar ánimos y favoritos. La configuración inicial de `pf6_Supabase` se conserva como antecedente de conexión; los modelos, migraciones y CRUD vigentes están documentados en `pf7_Prisma`.

## 16. Funcionalidades pendientes

- Definir la pantalla o ruta a mostrar después de una autenticación exitosa.
- Añadir cierre de sesión y una interfaz que represente al usuario autenticado.
- Añadir navegación y rutas cuando existan más pantallas, reemplazando el acceso temporal `/#rostro`.
- Integrar face-api.js en `Rostro` mediante `onVideoReady` y `detection` (`pf10_FaceAPI`).
- Conectar el front con el backend enviando `Authorization: Bearer <access_token>` en cada petición protegida.
- Cambiar la URL del frontend para consumir el API Gateway en el puerto `3000` en lugar de conocer cada microservicio.
- Implementar la lógica de los cinco microservicios dentro de sus esqueletos de `microservicios/` (`pf12` a `pf16`).
- Reemplazar las recomendaciones de ejemplo por TMDB (`pf11_TMDB`).
- Habilitar CORS con lista blanca, helmet y rate limit en el backend (`pf16_Seguridad`); hasta entonces el navegador bloquea las peticiones desde `localhost:5173`.
- Sustituir el favicon provisional de Vite por el recurso oficial de Butaca cuando se proporcione.
- Incorporar pruebas automatizadas cuando se definan los flujos funcionales.

## 17. Historial

### 2026-10-29 — Pie de página (`pf11_Pie`)

- Se creó el componente reutilizable `src/components/Footer/` con identidad de Butaca, menú, descripción del proyecto y franja legal.
- Los enlaces del menú usan las rutas por hash existentes; Mis recomendaciones reutiliza el aviso temporal de la galería y los enlaces legales quedan no interactivos hasta que existan sus páginas.
- Se integró una sola vez en `GaleriaPrincipal`; `Main` y `Rostro` no se modificaron.
- Diseño responsive en tres, dos y una columna. Verificado con `npm run lint`, `npm run build` y revisión visual a 1280, 820 y 375 px. No se agregaron dependencias.

### 2026-10-29 — Galería principal (`pf10_GaleriaPrincipal`)

- Se implementó la pantalla `/#galeria` con encabezado oficial, filtros por categoría, cuadrícula responsive, tarjetas y modal de detalle.
- Se separaron componentes, datos simulados y capa de acceso a catálogo para permitir la integración posterior con `/api/catalogo`.
- Se conectó la navegación entre reconocimiento facial y galería sin instalar una librería de rutas ni modificar los microservicios.
- Se prepararon estados de carga, error y vacío, foco visible, cierre con Escape y compatibilidad con movimiento reducido.

### 2026-10-28 — Docker y esqueletos de microservicios (`pf9_Docker`)

- Se creó `microservicios/` con `auth-service`, `emotions-service`, `catalog-service`, `recommendations-service` y `library-service`, cada uno como proyecto Express independiente con `/health`, `notFound`, `errorHandler`, cierre ordenado y tres pruebas con `node:test`.
- Se agregó un `Dockerfile` por servicio (Node 22 Alpine, `npm ci --omit=dev`, usuario `node`, `HEALTHCHECK`) y su `.dockerignore`.
- `compose.yaml` ahora levanta los seis contenedores en la red `butaca-microservices`; solo el gateway publica el puerto `3000` y espera a que los cinco servicios estén `healthy`.
- Cada microservicio puede recibir secretos con `env_file` sin incluirlos en la imagen.
- Verificado con Docker Desktop: seis contenedores `healthy` y enrutamiento correcto del gateway hacia cada servicio.

### 2026-10-28 — API Gateway y contratos de microservicios (`pf8_APIGateway`)

- Se creó `apigateway/` como proyecto Express independiente con configuración centralizada y cinco destinos configurables.
- Se implementaron proxies para sesiones/usuarios, emociones, catálogo TMDB, recomendaciones, favoritos e historial.
- El gateway conserva las rutas y credenciales de autorización, incorpora timeouts y devuelve errores `502` uniformes cuando un servicio no está disponible.
- Se añadieron pruebas con `node:test` para health, rutas desconocidas y destinos desconectados.
- Se agregó una imagen Docker con health check y `compose.yaml` con la red `butaca-microservices`.
- Se verificó la configuración con Docker Engine 29.9.2 y Compose 5.6.1: la imagen construyó correctamente, el contenedor alcanzó estado `healthy`, `/health` respondió `200` y un destino inexistente devolvió `502`.
- Los microservicios no se implementaron; quedaron documentados sus nombres Docker, puertos, variables y contratos para las ramas responsables.

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
