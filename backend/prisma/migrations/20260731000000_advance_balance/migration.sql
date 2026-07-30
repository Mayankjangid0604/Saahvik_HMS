-- Advance (prepaid rent) balance tracking.
-- Additive only: two new integer columns with default 0. No existing rows break
-- (every current row gets 0), no data loss, no backfill required.

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN "advanceBalancePaisa" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "advanceAppliedPaisa" INTEGER NOT NULL DEFAULT 0;
