/**
 * Deliverable check (Issue 1): concurrent rent payments against ONE resident
 * must not lose updates to duesPaisa / advanceBalancePaisa.
 *
 * record() computes appliedToDues = min(amount, dues) and the advance overflow,
 * then writes both fields as absolute values. Before the fix that read happened
 * outside the transaction, so N payments firing together all split from the same
 * stale snapshot and clobbered each other. The fix moves the read inside the tx
 * behind SELECT ... FOR UPDATE (same pattern as SequenceService.next()); this
 * test fires N parallel payments through the real PaymentsService.record() and
 * asserts the resident's final dues/advance exactly equal the only correct
 * serial outcome.
 *
 * Run: npm run test:advance-concurrency   (needs DATABASE_URL up + migrated)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { AuditService } from "../src/audit/audit.service";
import type { AuthUser } from "../src/common/auth-user";
import { SequenceService } from "../src/common/sequence.service";
import { PaymentsService } from "../src/finance/payments.service";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PdfService } from "../src/pdf/pdf.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const CONCURRENCY = 20;
const START_DUES = 50_000; // ₹500 owed at the start
const PAYMENT = 10_000; // ₹100 per rent payment

// 20 × ₹100 = ₹2000 paid against ₹500 dues → dues clamp to 0, ₹1500 becomes
// advance. Any lost update leaves dues > 0 and/or advance < 150000.
const EXPECTED_APPLIED_TO_DUES = Math.min(CONCURRENCY * PAYMENT, START_DUES);
const EXPECTED_FINAL_DUES = START_DUES - EXPECTED_APPLIED_TO_DUES;
const EXPECTED_FINAL_ADVANCE = CONCURRENCY * PAYMENT - EXPECTED_APPLIED_TO_DUES;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const svc = new PaymentsService(
    prisma as unknown as PrismaService,
    new AuditService(prisma as unknown as PrismaService),
    new SequenceService(prisma as unknown as PrismaService),
    new NotificationsService(prisma as unknown as PrismaService),
    new PdfService(),
  );

  // Isolated scratch org so the test never touches real data.
  const org = await prisma.organization.create({
    data: { name: `advance-concurrency-${Date.now()}` },
  });
  const resident = await prisma.resident.create({
    data: {
      orgId: org.id,
      name: "Test Resident",
      phone: "9999999999",
      joinDate: new Date(),
      duesPaisa: START_DUES,
      monthlyFeePaisa: PAYMENT,
    },
  });
  const user: AuthUser = {
    userId: "concurrency-test",
    orgId: org.id,
    role: "owner",
    name: "Tester",
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      svc.record(user, {
        residentId: resident.id,
        amountPaisa: PAYMENT,
        method: "cash",
        type: "rent",
        paidAt: new Date().toISOString(),
      }),
    ),
  );

  const final = await prisma.resident.findUniqueOrThrow({ where: { id: resident.id } });
  const payments = await prisma.payment.findMany({ where: { orgId: org.id } });
  const advanceSum = payments.reduce((s, p) => s + p.advanceAppliedPaisa, 0);

  console.log(
    `Fired ${CONCURRENCY} × ₹${PAYMENT / 100} rent payments at a resident owing ₹${START_DUES / 100}.`,
  );
  console.log(
    `Final dues=${final.duesPaisa} (expect ${EXPECTED_FINAL_DUES}), ` +
      `advance=${final.advanceBalancePaisa} (expect ${EXPECTED_FINAL_ADVANCE}), ` +
      `Σ advanceApplied=${advanceSum} (expect ${EXPECTED_FINAL_ADVANCE}).`,
  );

  const ok =
    payments.length === CONCURRENCY &&
    final.duesPaisa === EXPECTED_FINAL_DUES &&
    final.advanceBalancePaisa === EXPECTED_FINAL_ADVANCE &&
    advanceSum === EXPECTED_FINAL_ADVANCE;

  if (ok) {
    console.log("PASS: no lost updates — dues/advance match the serial outcome exactly.");
  } else {
    console.error("FAIL: lost update detected — dues/advance drifted from the serial outcome.");
    process.exitCode = 1;
  }

  // Clean up the scratch org (payments reference the resident; delete first).
  await prisma.auditLogEntry.deleteMany({ where: { orgId: org.id } });
  await prisma.payment.deleteMany({ where: { orgId: org.id } });
  await prisma.sequenceCounter.deleteMany({ where: { orgId: org.id } });
  await prisma.resident.deleteMany({ where: { orgId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
}

void main();
