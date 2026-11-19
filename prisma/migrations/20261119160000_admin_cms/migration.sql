-- Replaces the starter Category / Project / ProjectImage models with the dashboard content model.
-- The old tables held no real content (starter scaffolding), so they are dropped, not migrated.

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_categoryId_fkey";
ALTER TABLE "ProjectImage" DROP CONSTRAINT IF EXISTS "ProjectImage_projectId_fkey";

-- DropTable
DROP TABLE IF EXISTS "ProjectImage";
DROP TABLE IF EXISTS "Project";
DROP TABLE IF EXISTS "Category";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "AdminUser"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SiteSection" (
    "key" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SiteSection_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL DEFAULT 0,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Media_url_key" ON "Media"("url");
