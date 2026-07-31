-- Additive, nullable column — no backfill needed, no risk to existing rows.
-- Tracks the last "YYYY-MM" (Asia/Kolkata) period this resident's rent was
-- accrued into duesPaisa by the monthly dues-accrual cron
-- (src/finance/dues-accrual.service.ts). Guards against double-accrual on
-- cron restart/overlap.
ALTER TABLE "Resident" ADD COLUMN "lastDuesAccrualPeriod" TEXT;
