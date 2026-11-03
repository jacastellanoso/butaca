# Guía de Pruebas de Integración en Postman — API Gateway de Butaca

Este directorio reúne los recursos necesarios para comprobar, de principio a fin, el funcionamiento del sistema de microservicios de Butaca a través de su única puerta de entrada pública: el API Gateway (`http://localhost:3000`).

-------

## 1. Propósito de los archivos incluidos

El paquete de pruebas se compone de dos archivos complementarios que trabajan en conjunto dentro de Postman:

1. `Butaca_API_Gateway.postman_collection.json`: contiene la colección completa de peticiones HTTP organizadas en seis carpetas secuenciales. Cada carpeta representa un módulo del sistema (salud del Gateway, autenticación y usuarios, emociones, catálogo de películas y series, recomendaciones por estado de ánimo y biblioteca personal). Incluye pruebas automatizadas (`pm.test`) que validan los códigos de respuesta, el formato de los datos devueltos y el bloqueo de accesos sin autorización.
2. `Butaca_Local.postman_environment.json`: define el entorno de trabajo local (`Butaca Local`). Almacena la dirección del Gateway (`gatewayUrl`), los identificadores de contenido de referencia (`tmdbIdPelicula` y `tmdbIdSerie`), la credencial de sesión del usuario (`accessToken`) y los identificadores temporales que las peticiones generan y comparten automáticamente durante la corrida (`usuarioId`, `animoId`, `favoritoId` e `historialId`).

El diseño del flujo permite que todas las peticiones se comuniquen únicamente con el puerto `3000` del API Gateway, confirmando que este redirige cada solicitud al microservicio interno correspondiente sin exponer los puertos privados.

-------

## 2. Preparación de los archivos `.env` de los microservicios

Antes de encender los contenedores de Docker o iniciar los servicios de manera individual, es indispensable configurar las variables de entorno privadas en cada uno de los cinco microservicios ubicados dentro de la carpeta `microservicios/`. Por motivos de seguridad, estos archivos `.env` no se incluyen en el repositorio.

En cada carpeta de microservicio se debe crear un archivo llamado `.env` tomando como plantilla su respectivo archivo `.env.example`:

- `microservicios/auth-service/.env`: requiere `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` y `DIRECT_URL`.
- `microservicios/emotions-service/.env`: requiere `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` y `DIRECT_URL`.
- `microservicios/catalog-service/.env`: requiere `TMDB_API_KEY` (credencial de acceso a The Movie Database), además de las direcciones `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL` y el tiempo de espera `TMDB_TIMEOUT_MS`.
- `microservicios/recommendations-service/.env`: define las direcciones internas `AUTH_SERVICE_URL`, `EMOTIONS_SERVICE_URL` y `CATALOG_SERVICE_URL`, junto con los tiempos máximos de respuesta `REQUEST_TIMEOUT_MS` y `UPSTREAM_TIMEOUT_MS`.
- `microservicios/library-service/.env`: requiere `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` y `DIRECT_URL`.

### Advertencia importante sobre la contraseña en `DATABASE_URL` y `DIRECT_URL`

Al copiar las cadenas de conexión de PostgreSQL desde el panel de Supabase (**Connect → ORMs → Prisma**), la plantilla original incluye el marcador `[YOUR-PASSWORD]` encerrado entre corchetes.

Al sustituir ese marcador por la contraseña real de la base de datos, **se deben eliminar ambos corchetes (`[` y `]`)** tanto en `DATABASE_URL` como en `DIRECT_URL`. Si permanece alguno de los corchetes en cualquiera de las dos variables, el cliente de base de datos interpreta el símbolo como parte de la contraseña, lo que provoca fallos de conexión (`P1001: Can't reach database server`) o rechazos de autenticación (`28P01 password authentication failed`).

Asimismo, si se modifica un archivo `.env` después de haber creado los contenedores, es necesario recrear el contenedor correspondiente para que Docker cargue los valores actualizados:

```bash
docker compose up -d --force-recreate <nombre-del-servicio>
```

-------

## 3. Encendido y verificación de los servicios

Existen dos modalidades para poner en marcha la infraestructura antes de ejecutar las pruebas en Postman. Se recomienda utilizar Docker Compose para reproducir el entorno completo de red interna.

### Opción A: Ejecución con Docker Compose (recomendada)

Con Docker Desktop activo y desde la raíz del proyecto, se construyen y levantan en segundo plano los seis contenedores (el API Gateway y los cinco microservicios):

```bash
docker compose up --build -d
```

Una vez finalizado el arranque, se comprueba el estado de salud de los contenedores con el siguiente comando:

```bash
docker compose ps
```

En la salida de la consola, los seis servicios (`api-gateway`, `auth-service`, `emotions-service`, `catalog-service`, `recommendations-service` y `library-service`) deben mostrar la indicación `(healthy)` en la columna de estado. El API Gateway aguarda automáticamente a que los cinco microservicios superen su revisión de salud antes de abrir el puerto `3000`.

### Opción B: Ejecución local sin Docker

Si no se utiliza Docker, es posible iniciar cada componente en una terminal independiente ejecutando `npm.cmd install` y `npm.cmd run dev` dentro de su carpeta respectiva:

1. `apigateway/` (puerto `3000`).
2. `microservicios/auth-service/` (puerto `3021`).
3. `microservicios/emotions-service/` (puerto `3022`).
4. `microservicios/catalog-service/` (puerto `3023`).
5. `microservicios/recommendations-service/` (puerto `3024`, ajustando en su `.env` las URLs de destino a `http://localhost:3021`, `http://localhost:3022` y `http://localhost:3023`).
6. `microservicios/library-service/` (puerto `3025`).

En los servicios que utilizan Prisma (`auth-service`, `emotions-service` y `library-service`), se debe ejecutar previamente `npm.cmd run prisma:generate` dentro de cada carpeta para generar el cliente local.

-------

## 4. Obtención del `access_token` desde una sesión real de Supabase

Las rutas protegidas del sistema verifican la identidad del usuario mediante un token de sesión real emitido por Supabase Auth. Para obtenerlo, se realiza el siguiente procedimiento desde el navegador web:

1. En una terminal ubicada en la raíz del repositorio, se inicia la aplicación frontend ejecutando `npm.cmd run dev`.
2. Se abre el navegador en `http://localhost:5173` y se inicia sesión con una cuenta válida mediante el botón de **Google** o **GitHub**.
3. Una vez completado el inicio de sesión, se abren las **Herramientas de desarrollador** del navegador (`F12` o clic derecho → **Inspeccionar**).
4. Se extrae el valor de `access_token` utilizando cualquiera de estos dos métodos:
   - **Desde el Almacenamiento Local (Application / Almacenamiento)**: se despliega la sección **Local Storage** → `http://localhost:5173`, se selecciona la clave que comienza con `sb-` y termina en `-auth-token` (por ejemplo, `sb-fxumhujdmabgxjqmzoxs-auth-token`), y se copia el contenido del campo `access_token` (una cadena larga que inicia con `eyJ...`, sin comillas).
   - **Desde la Consola (Console)**: se pega y ejecuta la siguiente instrucción para imprimir directamente el token en pantalla:
     ```javascript
     JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('-auth-token')))).access_token
     ```
5. En Postman, se importan los archivos `postman/Butaca_API_Gateway.postman_collection.json` y `postman/Butaca_Local.postman_environment.json`.
6. En la esquina superior derecha de Postman, se selecciona el entorno **Butaca Local**, se abre la vista de edición del entorno y se pega el token copiado en la columna **Current Value** de la variable `accessToken`. Finalmente, se guardan los cambios del entorno (`Ctrl + S`).

-------

## 5. Ejecución automatizada con el Collection Runner y encadenamiento de datos

La colección está diseñada para ejecutarse de forma continua y sin intervención manual mediante el **Collection Runner** de Postman:

1. En el panel izquierdo de Postman, se hace clic en el menú de opciones de la colección **Butaca — API Gateway y Microservicios** y se selecciona **Run collection**.
2. Se verifica que el entorno **Butaca Local** esté activo y que las seis carpetas aparezcan marcadas en su orden original:
   - `1. API Gateway y Salud`: comprueba que `GET /health` responda `200` con el listado de rutas configuradas y que una ruta inexistente devuelva `404`.
   - `2. Autenticación y Usuarios (auth-service)`: valida el rechazo `401` sin token, consulta la sesión activa en `GET /api/sesiones`, sincroniza el usuario en PostgreSQL mediante `POST /api/usuarios` (guardando automáticamente `usuarioId`) y verifica su perfil local con `GET /api/usuarios`.
   - `3. Emociones y Consentimiento (emotions-service)`: comprueba que el sistema rechace con `403` un intento de guardado sin consentimiento de historial, valida el rechazo `400` ante una confianza inválida, registra un estado de ánimo autorizado con `POST /api/animos` (almacenando automáticamente su identificador en la variable `animoId`), lista el historial paginado y consulta el detalle individual mediante `GET /api/animos/{{animoId}}`.
   - `4. Catálogo TMDB (catalog-service)`: consulta el catálogo general filtrado por tipo y categoría (`GET /api/catalogo`), realiza una búsqueda por título y obtiene la ficha detallada de la película indicada en `{{tmdbIdPelicula}}` (`GET /api/catalogo/movie/550`), además de validar los rechazos `404` y `400` ante identificadores inexistentes o parámetros inválidos.
   - `5. Recomendaciones por Ánimo (recommendations-service)`: solicita películas recomendadas a partir de una emoción explícita (`GET /api/recomendaciones?emocion=happy&tipo=movie`), solicita series recomendadas reutilizando el `{{animoId}}` creado en la carpeta 3 (`GET /api/recomendaciones?animoId={{animoId}}&tipo=tv`) y comprueba los errores `400` y `401` en llamadas inválidas o sin sesión.
   - `6. Biblioteca: Favoritos e Historial (library-service)`: agrega una película a favoritos (`POST /api/favoritos`) guardando `favoritoId`, repite el envío para demostrar la idempotencia (`200 OK` sin duplicar el registro), consulta la lista de favoritos, crea una entrada en el historial de recomendaciones (`POST /api/historial`) guardando `historialId`, consulta el listado paginado y finalmente elimina ambos registros temporales (`DELETE /api/favoritos/{{favoritoId}}` y `DELETE /api/historial/{{historialId}}`), verificando el código `204 No Content` y el código `404 Not Found` al intentar borrarlos por segunda vez.
3. Se presiona el botón **Run Butaca — API Gateway y Microservicios**.

-------

## 6. Evidencias y capturas de pantalla requeridas

Para documentar la verificación del sistema, se deben tomar y conservar las siguientes capturas de pantalla:

1. **Estado de los contenedores en consola**: salida del comando `docker compose ps` mostrando los seis contenedores en estado `healthy` y el puerto `3000` publicado únicamente en `api-gateway`.
2. **Resumen global del Collection Runner**: pantalla final del **Collection Runner** en Postman donde se observe el total de pruebas ejecutadas con `0 Failed` (todas las aserciones aprobadas en verde) a lo largo de las seis carpetas.
3. **Flujo de autenticación y emociones**: detalle de las respuestas `200 OK` en `POST /api/usuarios` y `201 Created` en `POST /api/animos` evidenciando los campos de consentimiento (`consentimientoHistorial: true` y `consentimientoVersion: "historial-v1"`).
4. **Flujo de catálogo y recomendaciones**: respuesta `200 OK` de `GET /api/recomendaciones?animoId={{animoId}}&tipo=tv` mostrando la integración entre el servicio de recomendaciones, el servicio de emociones y el catálogo de TMDB.
5. **Flujo completo de biblioteca y limpieza**: respuestas `201 Created`, `200 OK`, `204 No Content` y `404 Not Found` en las operaciones de creación, consulta y eliminación sobre `/api/favoritos` y `/api/historial`.