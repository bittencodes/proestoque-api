-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "refreshTokenExpiracao" DATETIME;
