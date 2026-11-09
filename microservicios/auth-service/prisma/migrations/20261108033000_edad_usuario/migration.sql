ALTER TABLE "Usuario"
ADD COLUMN "edad" INTEGER;

ALTER TABLE "Usuario"
ADD CONSTRAINT "Usuario_edad_check" CHECK ("edad" IS NULL OR ("edad" >= 5 AND "edad" <= 120));
