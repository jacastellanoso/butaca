CREATE TABLE "Perfil" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "propietarioId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "avatar" TEXT,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Perfil_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Perfil_propietarioId_idx" ON "Perfil"("propietarioId");
CREATE UNIQUE INDEX "Perfil_principal_por_usuario" ON "Perfil"("propietarioId") WHERE "esPrincipal" = true;

CREATE TABLE "InvitacionPerfil" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "remitenteId" TEXT NOT NULL,
  "destinatarioId" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvitacionPerfil_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvitacionPerfil_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvitacionPerfil_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvitacionPerfil_no_propia" CHECK ("remitenteId" <> "destinatarioId"),
  CONSTRAINT "InvitacionPerfil_estado" CHECK ("estado" IN ('pendiente','aceptada','rechazada'))
);
CREATE UNIQUE INDEX "InvitacionPerfil_remitenteId_destinatarioId_key" ON "InvitacionPerfil"("remitenteId", "destinatarioId");
CREATE INDEX "InvitacionPerfil_destinatarioId_estado_idx" ON "InvitacionPerfil"("destinatarioId", "estado");

INSERT INTO "Perfil" ("propietarioId", "nombre", "esPrincipal")
SELECT "id", COALESCE(NULLIF(TRIM(CONCAT(COALESCE("nombre", ''), ' ', COALESCE("apellido", ''))), ''), SPLIT_PART(COALESCE("email", 'Mi perfil'), '@', 1)), true
FROM "Usuario";
