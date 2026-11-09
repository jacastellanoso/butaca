ALTER TABLE "Usuario"
ADD COLUMN "datosJson" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION "sincronizar_configuracion_usuario_json"()
RETURNS trigger AS $$
BEGIN
  NEW."datosJson" := jsonb_set(
    COALESCE(NEW."datosJson", '{}'::jsonb),
    '{configuracion}',
    jsonb_strip_nulls(jsonb_build_object(
      'email', NEW."email",
      'nombre', NEW."nombre",
      'apellido', NEW."apellido",
      'edad', NEW."edad"
    )),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Usuario_configuracion_json_trigger"
BEFORE INSERT OR UPDATE OF "email", "nombre", "apellido", "edad" ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION "sincronizar_configuracion_usuario_json"();

CREATE OR REPLACE FUNCTION "sincronizar_favoritos_usuario_json"()
RETURNS trigger AS $$
DECLARE
  usuario_objetivo TEXT := COALESCE(NEW."usuarioId", OLD."usuarioId");
  lista JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(to_jsonb(f) - 'usuarioId' ORDER BY f."creadoEn" DESC, f."id" DESC),
    '[]'::jsonb
  ) INTO lista
  FROM "Favorito" f
  WHERE f."usuarioId" = usuario_objetivo;

  UPDATE "Usuario"
  SET "datosJson" = jsonb_set(COALESCE("datosJson", '{}'::jsonb), '{favoritos}', lista, true)
  WHERE "id" = usuario_objetivo;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Favorito_usuario_json_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "Favorito"
FOR EACH ROW EXECUTE FUNCTION "sincronizar_favoritos_usuario_json"();

CREATE OR REPLACE FUNCTION "sincronizar_reconocimientos_usuario_json"()
RETURNS trigger AS $$
DECLARE
  usuario_objetivo TEXT := COALESCE(NEW."usuarioId", OLD."usuarioId");
  lista JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(to_jsonb(a) - 'usuarioId' ORDER BY a."creadoEn" DESC, a."id" DESC),
    '[]'::jsonb
  ) INTO lista
  FROM "Animo" a
  WHERE a."usuarioId" = usuario_objetivo;

  UPDATE "Usuario"
  SET "datosJson" = jsonb_set(COALESCE("datosJson", '{}'::jsonb), '{reconocimientos}', lista, true)
  WHERE "id" = usuario_objetivo;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Animo_usuario_json_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "Animo"
FOR EACH ROW EXECUTE FUNCTION "sincronizar_reconocimientos_usuario_json"();

CREATE OR REPLACE FUNCTION "sincronizar_recomendaciones_usuario_json"()
RETURNS trigger AS $$
DECLARE
  usuario_objetivo TEXT := COALESCE(NEW."usuarioId", OLD."usuarioId");
  lista JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(to_jsonb(r) - 'usuarioId' ORDER BY r."creadoEn" DESC, r."id" DESC),
    '[]'::jsonb
  ) INTO lista
  FROM "HistorialRecomendacion" r
  WHERE r."usuarioId" = usuario_objetivo;

  UPDATE "Usuario"
  SET "datosJson" = jsonb_set(COALESCE("datosJson", '{}'::jsonb), '{recomendaciones}', lista, true)
  WHERE "id" = usuario_objetivo;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Historial_usuario_json_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "HistorialRecomendacion"
FOR EACH ROW EXECUTE FUNCTION "sincronizar_recomendaciones_usuario_json"();

UPDATE "Usuario" u
SET "datosJson" = jsonb_build_object(
  'configuracion', jsonb_strip_nulls(jsonb_build_object(
    'email', u."email",
    'nombre', u."nombre",
    'apellido', u."apellido",
    'edad', u."edad"
  )),
  'favoritos', COALESCE((
    SELECT jsonb_agg(to_jsonb(f) - 'usuarioId' ORDER BY f."creadoEn" DESC, f."id" DESC)
    FROM "Favorito" f WHERE f."usuarioId" = u."id"
  ), '[]'::jsonb),
  'reconocimientos', COALESCE((
    SELECT jsonb_agg(to_jsonb(a) - 'usuarioId' ORDER BY a."creadoEn" DESC, a."id" DESC)
    FROM "Animo" a WHERE a."usuarioId" = u."id"
  ), '[]'::jsonb),
  'recomendaciones', COALESCE((
    SELECT jsonb_agg(to_jsonb(r) - 'usuarioId' ORDER BY r."creadoEn" DESC, r."id" DESC)
    FROM "HistorialRecomendacion" r WHERE r."usuarioId" = u."id"
  ), '[]'::jsonb)
);
