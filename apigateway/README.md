# API Gateway de Butaca

El gateway es la única entrada HTTP para el frontend. Enruta cada petición al microservicio responsable, conserva el método, la ruta, la query, el body y el encabezado `Authorization`, y responde `502` si el destino todavía no está disponible.

## Ejecución local

```bash
cd apigateway
npm.cmd install
npm.cmd run dev
```

El gateway escucha en `http://localhost:3000`. Copia `.env.example` como `.env` únicamente si necesitas cambiar puertos o destinos locales.

## Contratos de enrutamiento

| Rutas públicas | Variable de destino | Responsabilidad futura |
|---|---|---|
| `/api/sesiones`, `/api/usuarios` | `AUTH_SERVICE_URL` | Sesiones de Supabase y usuario |
| `/api/animos` | `EMOTIONS_SERVICE_URL` | Resultados emocionales |
| `/api/catalogo` | `CATALOG_SERVICE_URL` | Catálogo y detalles de TMDB |
| `/api/recomendaciones` | `RECOMMENDATIONS_SERVICE_URL` | Recomendaciones por emoción |
| `/api/favoritos`, `/api/historial` | `LIBRARY_SERVICE_URL` | Favoritos e historial |

Los microservicios deben conservar la ruta pública recibida. Por ejemplo, `GET /api/favoritos` llega al servicio de biblioteca como `GET /api/favoritos`.

## Docker

Desde la raíz del repositorio:

```bash
docker compose up --build api-gateway
```

El archivo `compose.yaml` conecta el gateway a la red `butaca-microservices`. Los equipos responsables deben agregar sus contenedores a esa misma red con estos nombres de servicio:

- `auth-service`
- `emotions-service`
- `catalog-service`
- `recommendations-service`
- `library-service`

Hasta que existan, el gateway puede iniciar y su health check funcionará, pero las rutas delegadas responderán `502`.
