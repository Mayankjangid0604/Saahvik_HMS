-- Align ContactRequestStatus with this schema's lowercase enum convention
-- (see HANDOFF.md — complaint status, invoice status, deposit status et al.
-- all use the frontend's lowercase vocabulary).
--
-- Renaming the labels in place rather than dropping and recreating the type:
-- ALTER TYPE ... RENAME VALUE preserves every existing row, whereas the
-- drop-and-recreate Prisma generates by default would fail outright while
-- rows still hold the old labels.
ALTER TYPE "ContactRequestStatus" RENAME VALUE 'NEW' TO 'new';
ALTER TYPE "ContactRequestStatus" RENAME VALUE 'CONTACTED' TO 'contacted';
ALTER TYPE "ContactRequestStatus" RENAME VALUE 'CLOSED' TO 'closed';

-- Restate the column default so it is stored against the renamed label.
ALTER TABLE "ContactRequest" ALTER COLUMN "status" SET DEFAULT 'new';
