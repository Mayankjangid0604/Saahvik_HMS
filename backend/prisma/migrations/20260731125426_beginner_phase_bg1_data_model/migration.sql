-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('id_proof', 'admission_form', 'medical_certificate', 'agreement', 'photo', 'other');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('held', 'confirmed', 'converted', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('groceries', 'maintenance', 'utilities', 'furniture', 'services', 'supplies', 'other');

-- CreateEnum
CREATE TYPE "SearchEntity" AS ENUM ('residents', 'rooms', 'staff', 'complaints', 'global');

-- CreateEnum
CREATE TYPE "ScheduledReportType" AS ENUM ('occupancy', 'dues', 'residents', 'monthly_collection', 'staff');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('pdf', 'xlsx');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('expense', 'purchase', 'discount', 'refund', 'room_block', 'other');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstRatePercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "logoKey" TEXT,
ADD COLUMN     "themeColorAccent" TEXT,
ADD COLUMN     "themeColorPrimary" TEXT;

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "dietaryPreference" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "idDocExpiryDate" TIMESTAMP(3),
ADD COLUMN     "medicalNotes" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedReason" TEXT;

-- CreateTable
CREATE TABLE "ResidentDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'other',
    "fileKey" TEXT NOT NULL,
    "label" TEXT,
    "expiryDate" TIMESTAMP(3),
    "uploadedByName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedId" TEXT,
    "residentName" TEXT NOT NULL,
    "residentPhone" TEXT NOT NULL,
    "residentId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'held',
    "expectedCheckIn" TIMESTAMP(3) NOT NULL,
    "holdUntil" TIMESTAMP(3),
    "monthlyFeePaisa" INTEGER NOT NULL DEFAULT 0,
    "depositPaisa" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "category" "VendorCategory" NOT NULL DEFAULT 'other',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "category" "VendorCategory" NOT NULL DEFAULT 'other',
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "invoiceRef" TEXT,
    "expenseId" TEXT,
    "notes" TEXT,
    "attachmentKey" TEXT,
    "recordedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" "SearchEntity" NOT NULL DEFAULT 'global',
    "query" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ScheduledReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'pdf',
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'weekly',
    "filters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "reportType" "ScheduledReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "requestedByUserId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "decidedByUserId" TEXT,
    "decidedByName" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidentDocument_orgId_residentId_idx" ON "ResidentDocument"("orgId", "residentId");

-- CreateIndex
CREATE INDEX "ResidentDocument_orgId_category_idx" ON "ResidentDocument"("orgId", "category");

-- CreateIndex
CREATE INDEX "ResidentDocument_orgId_expiryDate_idx" ON "ResidentDocument"("orgId", "expiryDate");

-- CreateIndex
CREATE INDEX "Reservation_orgId_status_idx" ON "Reservation"("orgId", "status");

-- CreateIndex
CREATE INDEX "Reservation_orgId_roomId_idx" ON "Reservation"("orgId", "roomId");

-- CreateIndex
CREATE INDEX "Vendor_orgId_active_idx" ON "Vendor"("orgId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_orgId_name_key" ON "Vendor"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRecord_expenseId_key" ON "PurchaseRecord"("expenseId");

-- CreateIndex
CREATE INDEX "PurchaseRecord_orgId_purchasedAt_idx" ON "PurchaseRecord"("orgId", "purchasedAt");

-- CreateIndex
CREATE INDEX "PurchaseRecord_orgId_vendorId_idx" ON "PurchaseRecord"("orgId", "vendorId");

-- CreateIndex
CREATE INDEX "SavedSearch_orgId_userId_userType_idx" ON "SavedSearch"("orgId", "userId", "userType");

-- CreateIndex
CREATE INDEX "ReportSchedule_orgId_active_idx" ON "ReportSchedule"("orgId", "active");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRunAt_idx" ON "ReportSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "ReportRun_orgId_createdAt_idx" ON "ReportRun"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_orgId_status_idx" ON "ApprovalRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_orgId_createdAt_idx" ON "ApprovalRequest"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
