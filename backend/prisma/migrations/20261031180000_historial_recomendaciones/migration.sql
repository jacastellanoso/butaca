-- pf16_MSBiblioteca: tabla de historial de recomendaciones e índices de consulta por usuario y fecha.
-- Migración aditiva: no elimina tablas, columnas ni datos existentes.

-- CreateTable
CREATE TABLE "HistorialRecomendacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "emocion" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "poster" TEXT,
    "calificacion" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialRecomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorito_usuarioId_creadoEn_idx" ON "Favorito"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "HistorialRecomendacion_usuarioId_creadoEn_idx" ON "HistorialRecomendacion"("usuarioId", "creadoEn");

-- AddForeignKey
ALTER TABLE "HistorialRecomendacion" ADD CONSTRAINT "HistorialRecomendacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;