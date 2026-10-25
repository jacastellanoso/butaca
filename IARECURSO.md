# IARECURSO — Guía permanente de desarrollo de Butaca

> **Consulta obligatoria:** toda persona o asistente de IA debe leer este archivo antes de crear, editar, mover o eliminar código del proyecto. Después de cada cambio se debe actualizar esta guía para mantenerla alineada con la implementación real.

## 1. Estado del proyecto

- Aplicación creada con React 19 y Vite 8.
- Rama de la pantalla inicial: `pf2_InicioPantalla`.
- Pantalla implementada: `Main`, destinada visualmente a visitantes sin sesión.
- Alcance actual: presentación visual y animaciones. No existe autenticación, manejo de sesiones, rutas protegidas ni conexión con servicios externos.
- Tipografía oficial de toda la aplicación: **Montserrat**. Está instalada localmente mediante `@fontsource/montserrat` y se cargan solamente los subconjuntos latinos de los pesos 400, 600, 700 y 800 desde `src/main.jsx`.

## 2. Regla de actualización

Antes de implementar un cambio:

1. Leer este documento completo.
2. Revisar el componente y los estilos relacionados.
3. Mantener la arquitectura y las convenciones aquí descritas.
4. No renombrar recursos existentes sin actualizar todas sus importaciones.
5. No agregar autenticación ni servicios externos hasta que se soliciten expresamente.

Después de implementar un cambio:

1. Documentar los componentes, archivos, estilos o animaciones nuevos.
2. Registrar decisiones técnicas relevantes.
3. Actualizar la lista de funcionalidades pendientes.
4. Ejecutar `npm run lint` y `npm run build`.

## 3. Arquitectura actual

```text
src/
├── App.jsx                  # Punto de composición; renderiza la página Main.
├── App.css                  # Regla mínima del contenedor raíz.
├── index.css                # Estilos globales, Montserrat y normalización.
├── main.jsx                 # Inicio de React y carga local de la tipografía.
├── assets/
│   ├── decorations/         # Ondas y formas gráficas de fondo.
│   ├── icons/               # Logotipos usados por controles de interfaz.
│   ├── images/              # Imágenes PNG decorativas.
│   └── text/                # Seis capas SVG de la composición del título.
└── pages/
    └── Main/
        ├── Main.jsx         # Estructura semántica de la pantalla inicial.
        └── Main.css         # Diseño, responsive y animaciones de Main.
```

Los recursos gráficos están clasificados dentro de `src/assets/` según su función. Conservan exactamente sus nombres originales y se importan desde `Main.jsx`. No se deben duplicar en la raíz ni entre subcarpetas.

## 4. Componentes de Main

- `Main`: organiza tres niveles visuales independientes: fondo, decoraciones y contenido principal.
- `central-scene`: contenedor de escena a pantalla completa que agrupa la onda central y `main-content`. Ambos comparten el mismo centro y escalan mediante reglas responsive sin depender de coordenadas independientes.
- `WaveGroup`: reutiliza `cuadroefecto.svg` en cuatro capas concéntricas. Se instancia en el centro, esquina superior izquierda y esquina inferior derecha.
- `AccessButton`: componente reutilizable para los botones visuales de Google y GitHub. Los botones son deliberadamente inactivos; no deben conectarse a autenticación todavía.
- `textLayers`: arreglo ordenado que registra las seis capas SVG del título. Su orden también determina el `z-index` y el retraso de aparición.

## 5. Recursos gráficos

### Título compuesto

Las siguientes imágenes están en `src/assets/text/`, comparten el mismo lienzo `2608 × 1281` y deben permanecer superpuestas dentro de un único contenedor con relación `2607.4 / 1280.8`:

1. `preparatexto.svg`
2. `tustexto.svg`
3. `palomitastexto.svg`
4. `ytexto.svg`
5. `comienzaentexto.svg`
6. `butacatexto.svg`

No se deben recortar, reposicionar o escalar individualmente. La adaptación de tamaño siempre se realiza sobre el contenedor padre.

### Decoraciones

- `src/assets/decorations/cuadroefecto.svg`: ondas de fondo con rotación de `-3.1deg` y opacidad de `34 %`.
- `src/assets/images/rollodiseño.png`: esquina superior izquierda.
- `src/assets/images/lentesdiseño.png`: esquina superior derecha; oculto en móvil.
- `src/assets/images/ticketdiseño.png`: esquina inferior izquierda; oculto en móvil.
- `src/assets/images/palomitasdiseño.png`: esquina inferior derecha.
- `src/assets/icons/logogoogle.svg` y `src/assets/icons/logogithub.svg`: iconos de los botones de acceso.

## 6. Estilos y responsive

- Fondo a pantalla completa: degradado vertical de `#0470F6` a `#0000B0`.
- La página usa `100svh`, evita barras de desplazamiento y controla los niveles mediante contextos de apilamiento.
- En escritorio, los botones se muestran horizontalmente.
- Hasta `820px`, los botones pasan a columna, se vuelven más compactos y se ocultan lentes y ticket. En ese tamaño aumentan el rollo, las palomitas y moderadamente las ondas de esquina para conservar presencia visual sin competir con el contenido.
- En teléfonos de hasta `480px`, los botones tienen un máximo de `212 × 36 px`; la onda central usa un ancho relativo máximo del `56vw` para enmarcar el contenido sin ocupar excesivamente la pantalla.
- Existe un ajuste adicional para anchos de hasta `480px` o alturas de hasta `560px`.
- Todos los controles interactivos conservan foco visible para navegación con teclado.
- `prefers-reduced-motion: reduce` desactiva animaciones y muestra todas las capas del título directamente.

## 7. Animaciones

- `build-center-wave`: efecto introductorio de expansión elástica controlada de la onda central.
- `build-top-left-wave` y `build-bottom-right-wave`: trasladan y expanden las ondas exteriores hasta sus esquinas definitivas.
- `reveal-layer`: aparición secuencial del título, una sola vez desde los 1650 ms, con intervalos de 140 ms y duración de 320 ms.
- `reveal-button`: entrada independiente de los botones mediante opacidad, desplazamiento vertical y escala. Google comienza a los 2700 ms y GitHub a los 2860 ms, después del título.
- `decoration-enter`: entrada escalonada desde los bordes entre los 900 y 1290 ms, antes de la flotación permanente.
- `wave-breathe`: expansión y contracción lenta e infinita de las ondas después de terminar su construcción inicial.
- `float`: flotación sutil, asíncrona y permanente de las cuatro decoraciones cinematográficas, con duraciones distintas.
- Los botones incluyen transiciones discretas para `hover`, `focus-visible` y `active`.

## 8. Accesibilidad

- El documento usa `lang="es"`.
- El título visual compuesto por SVG cuenta con un `h1` oculto visualmente para lectores de pantalla.
- Las imágenes decorativas se ocultan a tecnologías de asistencia.
- Los botones usan elementos `<button>` reales y no enlaces porque actualmente no navegan.
- Los estados de foco son visibles y las animaciones respetan la preferencia de movimiento reducido.

## 9. Funcionalidades pendientes

- Definir e implementar el flujo real de autenticación cuando se autorice.
- Añadir navegación y rutas cuando existan más pantallas.
- Sustituir el favicon provisional de Vite por el recurso oficial de Butaca cuando se proporcione.
- Incorporar pruebas automatizadas cuando se definan los flujos funcionales.

## 10. Historial

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
