-- pf13_MSEmociones: evidencia de consentimiento para conservar el historial emocional.
-- Migración aditiva: no elimina tablas, columnas ni datos.

-- AlterTable
ALTER TABLE "Animo" ALTER COLUMN "confianza" DROP NOT NULL;
ALTER TABLE "Animo" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'deteccion';
ALTER TABLE "Animo" ADD COLUMN "consentimientoHistorial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Animo" ADD COLUMN "consentimientoVersion" TEXT;
ALTER TABLE "Animo" ADD COLUMN "consentimientoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Animo_usuarioId_creadoEn_idx" ON "Animo"("usuarioId", "creadoEn");
