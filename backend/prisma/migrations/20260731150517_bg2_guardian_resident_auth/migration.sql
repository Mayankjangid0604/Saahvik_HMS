-- CreateEnum
CREATE TYPE "PortalInviteKind" AS ENUM ('guardian', 'resident');

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianResident" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianResident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" "PortalInviteKind" NOT NULL,
    "residentId" TEXT NOT NULL,
    "phone" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guardian_orgId_idx" ON "Guardian"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_orgId_phone_key" ON "Guardian"("orgId", "phone");

-- CreateIndex
CREATE INDEX "GuardianResident_orgId_residentId_idx" ON "GuardianResident"("orgId", "residentId");

-- CreateIndex
CREATE INDEX "GuardianResident_orgId_guardianId_idx" ON "GuardianResident"("orgId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianResident_guardianId_residentId_key" ON "GuardianResident"("guardianId", "residentId");

-- CreateIndex
CREATE INDEX "PortalInvite_orgId_residentId_idx" ON "PortalInvite"("orgId", "residentId");

-- CreateIndex
CREATE INDEX "PortalInvite_tokenHash_idx" ON "PortalInvite"("tokenHash");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianResident" ADD CONSTRAINT "GuardianResident_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianResident" ADD CONSTRAINT "GuardianResident_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
