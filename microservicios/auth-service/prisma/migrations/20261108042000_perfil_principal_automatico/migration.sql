CREATE OR REPLACE FUNCTION "crear_perfil_principal_usuario"()
RETURNS trigger AS $$
BEGIN
  INSERT INTO "Perfil" ("propietarioId", "nombre", "esPrincipal")
  VALUES (
    NEW."id",
    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(NEW."nombre", ''), ' ', COALESCE(NEW."apellido", ''))), ''), SPLIT_PART(COALESCE(NEW."email", 'Mi perfil'), '@', 1)),
    true
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Usuario_perfil_principal_trigger"
AFTER INSERT ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION "crear_perfil_principal_usuario"();

CREATE OR REPLACE FUNCTION "actualizar_perfil_principal_usuario"()
RETURNS trigger AS $$
BEGIN
  UPDATE "Perfil"
  SET "nombre" = COALESCE(NULLIF(TRIM(CONCAT(COALESCE(NEW."nombre", ''), ' ', COALESCE(NEW."apellido", ''))), ''), SPLIT_PART(COALESCE(NEW."email", 'Mi perfil'), '@', 1))
  WHERE "propietarioId" = NEW."id" AND "esPrincipal" = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Usuario_actualizar_perfil_principal_trigger"
AFTER UPDATE OF "nombre", "apellido", "email" ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION "actualizar_perfil_principal_usuario"();
