# Archivos de prueba E2E

- `rostro-sonriente.y4m`: video de un solo fotograma (320 × 240, YUV 4:2:0) que Chromium usa como cámara falsa (`--use-file-for-fake-video-capture`). face-api.js debe detectar **Alegría**.
  - Origen: retrato oficial de la astronauta Eileen Collins (NASA, dominio público), incluido como imagen de ejemplo `astronaut` en scikit-image.
  - Se usa Y4M porque Chromium lo reproduce sin códecs; con MJPEG mostraba el patrón de prueba por defecto.
  - Para regenerarlo: `ffmpeg -i retrato.png -vf "scale=-2:240,pad=320:240:(ow-iw)/2:0" -frames:v 1 -pix_fmt yuv420p rostro-sonriente.y4m`.