-- Perfiles con datos propios, separación de datos por perfil, grupos para
-- compartir recomendaciones y centro de notificaciones.
--
-- Migración ADITIVA: no elimina tablas, columnas ni filas. "InvitacionPerfil"
-- (amigos de pf25) se conserva intacta aunque la API ya no la usa.
-- Los únicos objetos que se reemplazan son dos triggers del perfil principal
-- y el índice único de "Favorito" (pasa a incluir el perfil).

-- ── 1. Perfil: nombre, apellido y edad propios ─────────────────────────────
ALTER TABLE "Perfil"
  ADD COLUMN "apellido" TEXT,
  ADD COLUMN "edad" INTEGER;

ALTER TABLE "Perfil"
  ADD CONSTRAINT "Perfil_edad_check" CHECK ("edad" IS NULL OR ("edad" >= 5 AND "edad" <= 120));

-- Permite claves foráneas compuestas (perfilId, usuarioId): un registro nunca
-- puede apuntar al perfil de otra cuenta.
CREATE UNIQUE INDEX "Perfil_id_propietarioId_key" ON "Perfil"("id", "propietarioId");

-- El perfil principal deja de guardar "Nombre Apellido" en un solo campo.
UPDATE "Perfil" p
SET "nombre" = COALESCE(NULLIF(TRIM(u."nombre"), ''), p."nombre"),
    "apellido" = NULLIF(TRIM(u."apellido"), ''),
    "edad" = u."edad"
FROM "Usuario" u
WHERE p."propietarioId" = u."id" AND p."esPrincipal" = true;

CREATE OR REPLACE FUNCTION "crear_perfil_principal_usuario"()
RETURNS trigger AS $$
BEGIN
  INSERT INTO "Perfil" ("propietarioId", "nombre", "apellido", "edad", "esPrincipal")
  VALUES (
    NEW."id",
    COALESCE(NULLIF(TRIM(NEW."nombre"), ''), SPLIT_PART(COALESCE(NEW."email", 'Mi perfil'), '@', 1)),
    NULLIF(TRIM(NEW."apellido"), ''),
    NEW."edad",
    true
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "actualizar_perfil_principal_usuario"()
RETURNS trigger AS $$
BEGIN
  UPDATE "Perfil"
  SET "nombre" = COALESCE(NULLIF(TRIM(NEW."nombre"), ''), SPLIT_PART(COALESCE(NEW."email", 'Mi perfil'), '@', 1)),
      "apellido" = NULLIF(TRIM(NEW."apellido"), ''),
      "edad" = NEW."edad"
  WHERE "propietarioId" = NEW."id" AND "esPrincipal" = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- La edad ahora también se copia al perfil principal.
DROP TRIGGER IF EXISTS "Usuario_actualizar_perfil_principal_trigger" ON "Usuario";
CREATE TRIGGER "Usuario_actualizar_perfil_principal_trigger"
AFTER UPDATE OF "nombre", "apellido", "email", "edad" ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION "actualizar_perfil_principal_usuario"();

-- Toda cuenta debe tener su perfil principal.
INSERT INTO "Perfil" ("propietarioId", "nombre", "apellido", "edad", "esPrincipal")
SELECT u."id",
       COALESCE(NULLIF(TRIM(u."nombre"), ''), SPLIT_PART(COALESCE(u."email", 'Mi perfil'), '@', 1)),
       NULLIF(TRIM(u."apellido"), ''),
       u."edad",
       true
FROM "Usuario" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Perfil" p WHERE p."propietarioId" = u."id" AND p."esPrincipal" = true
);

-- ── 2. Datos personales separados por perfil ───────────────────────────────
ALTER TABLE "Animo" ADD COLUMN "perfilId" TEXT;
ALTER TABLE "Favorito" ADD COLUMN "perfilId" TEXT;
ALTER TABLE "HistorialRecomendacion" ADD COLUMN "perfilId" TEXT;

-- Los registros existentes pertenecen al perfil principal de su cuenta.
UPDATE "Animo" a SET "perfilId" = p."id"
FROM "Perfil" p WHERE p."propietarioId" = a."usuarioId" AND p."esPrincipal" = true AND a."perfilId" IS NULL;
UPDATE "Favorito" f SET "perfilId" = p."id"
FROM "Perfil" p WHERE p."propietarioId" = f."usuarioId" AND p."esPrincipal" = true AND f."perfilId" IS NULL;
UPDATE "HistorialRecomendacion" h SET "perfilId" = p."id"
FROM "Perfil" p WHERE p."propietarioId" = h."usuarioId" AND p."esPrincipal" = true AND h."perfilId" IS NULL;

-- Compatibilidad: si una versión anterior de un servicio inserta sin perfil,
-- el registro queda en el perfil principal en lugar de quedar huérfano.
CREATE OR REPLACE FUNCTION "asignar_perfil_principal"()
RETURNS trigger AS $$
BEGIN
  IF NEW."perfilId" IS NULL THEN
    SELECT p."id" INTO NEW."perfilId"
    FROM "Perfil" p
    WHERE p."propietarioId" = NEW."usuarioId" AND p."esPrincipal" = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Animo_perfil_principal_trigger"
BEFORE INSERT ON "Animo" FOR EACH ROW EXECUTE FUNCTION "asignar_perfil_principal"();
CREATE TRIGGER "Favorito_perfil_principal_trigger"
BEFORE INSERT ON "Favorito" FOR EACH ROW EXECUTE FUNCTION "asignar_perfil_principal"();
CREATE TRIGGER "Historial_perfil_principal_trigger"
BEFORE INSERT ON "HistorialRecomendacion" FOR EACH ROW EXECUTE FUNCTION "asignar_perfil_principal"();

ALTER TABLE "Animo"
  ADD CONSTRAINT "Animo_perfil_fkey" FOREIGN KEY ("perfilId", "usuarioId")
  REFERENCES "Perfil"("id", "propietarioId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorito"
  ADD CONSTRAINT "Favorito_perfil_fkey" FOREIGN KEY ("perfilId", "usuarioId")
  REFERENCES "Perfil"("id", "propietarioId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistorialRecomendacion"
  ADD CONSTRAINT "HistorialRecomendacion_perfil_fkey" FOREIGN KEY ("perfilId", "usuarioId")
  REFERENCES "Perfil"("id", "propietarioId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Animo_perfilId_creadoEn_idx" ON "Animo"("perfilId", "creadoEn");
CREATE INDEX "Favorito_perfilId_creadoEn_idx" ON "Favorito"("perfilId", "creadoEn");
CREATE INDEX "HistorialRecomendacion_perfilId_creadoEn_idx" ON "HistorialRecomendacion"("perfilId", "creadoEn");

-- Dos perfiles de la misma cuenta pueden marcar el mismo título como favorito.
DROP INDEX IF EXISTS "Favorito_usuarioId_tmdbId_tipo_key";
CREATE UNIQUE INDEX "Favorito_usuarioId_perfilId_tmdbId_tipo_key"
  ON "Favorito"("usuarioId", "perfilId", "tmdbId", "tipo");

-- ── 3. Grupos para compartir recomendaciones ───────────────────────────────
CREATE TABLE "Grupo" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "propietarioId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Grupo_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Grupo_propietarioId_idx" ON "Grupo"("propietarioId");

CREATE TABLE "MiembroGrupo" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "grupoId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'miembro',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiembroGrupo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MiembroGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MiembroGrupo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MiembroGrupo_rol" CHECK ("rol" IN ('propietario', 'miembro'))
);
CREATE UNIQUE INDEX "MiembroGrupo_grupoId_usuarioId_key" ON "MiembroGrupo"("grupoId", "usuarioId");
CREATE INDEX "MiembroGrupo_usuarioId_idx" ON "MiembroGrupo"("usuarioId");

-- La invitación se guarda por correo: puede invitarse a alguien que todavía
-- no tiene cuenta; se vincula cuando inicia sesión por primera vez.
CREATE TABLE "InvitacionGrupo" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "grupoId" TEXT NOT NULL,
  "remitenteId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "destinatarioId" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondidoEn" TIMESTAMP(3),
  CONSTRAINT "InvitacionGrupo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvitacionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvitacionGrupo_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvitacionGrupo_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvitacionGrupo_estado" CHECK ("estado" IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'))
);
CREATE UNIQUE INDEX "InvitacionGrupo_grupoId_email_key" ON "InvitacionGrupo"("grupoId", "email");
CREATE INDEX "InvitacionGrupo_destinatarioId_estado_idx" ON "InvitacionGrupo"("destinatarioId", "estado");
CREATE INDEX "InvitacionGrupo_email_idx" ON "InvitacionGrupo"("email");

CREATE TABLE "RecomendacionGrupo" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "grupoId" TEXT NOT NULL,
  "autorId" TEXT NOT NULL,
  "autorPerfilId" TEXT,
  "autorNombre" TEXT NOT NULL,
  "destinatarioId" TEXT,
  "tmdbId" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "poster" TEXT,
  "mensaje" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecomendacionGrupo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecomendacionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecomendacionGrupo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecomendacionGrupo_autorPerfilId_fkey" FOREIGN KEY ("autorPerfilId") REFERENCES "Perfil"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RecomendacionGrupo_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecomendacionGrupo_tipo" CHECK ("tipo" IN ('movie', 'tv'))
);
CREATE INDEX "RecomendacionGrupo_grupoId_creadoEn_idx" ON "RecomendacionGrupo"("grupoId", "creadoEn");

-- ── 4. Centro de notificaciones ────────────────────────────────────────────
-- perfilId NULL: visible para toda la cuenta (invitaciones, grupos).
-- perfilId definido: solo para ese perfil (recomendación del día).
-- clave: evita duplicar notificaciones idempotentes (una por día y perfil).
CREATE TABLE "Notificacion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId" TEXT NOT NULL,
  "perfilId" TEXT,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "datos" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "clave" TEXT,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notificacion_perfil_fkey" FOREIGN KEY ("perfilId", "usuarioId") REFERENCES "Perfil"("id", "propietarioId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notificacion_usuarioId_leida_creadoEn_idx" ON "Notificacion"("usuarioId", "leida", "creadoEn");
CREATE UNIQUE INDEX "Notificacion_usuarioId_clave_key" ON "Notificacion"("usuarioId", "clave");
