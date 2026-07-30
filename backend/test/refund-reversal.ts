/**
 * Deliverable check (Issue 2): refunding a rent payment must unwind that
 * payment's effect on the resident's advance balance and dues, in proportion
 * to the amount refunded, using the advance-first ordering record() implies.
 *
 * Scenario (all ₹ shown in paisa):
 *   - Resident owes 50000. A single 80000 rent payment pays down 50000 of dues
 *     and parks 30000 as advance (dues→0, advance→30000).
 *   - Refund 20000: advance-first, so the advance is unwound first → advance
 *     30000→10000, dues stays 0.
 *   - Refund another 40000 (60000 refunded of 80000 total): the remaining 10000
 *     of advance is unwound, then 30000 of dues is restored → advance→0,
 *     dues→30000.
 *   - A non-rent (fine) payment refund leaves dues/advance untouched.
 *
 * Run: npm run test:refund-reversal   (needs DATABASE_URL up + migrated)
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

let failures = 0;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const svc = new PaymentsService(
    prisma as unknown as PrismaService,
    new AuditService(prisma as unknown as PrismaService),
    new SequenceService(prisma as unknown as PrismaService),
    new NotificationsService(prisma as unknown as PrismaService),
    new PdfService(),
  );

  const org = await prisma.organization.create({ data: { name: `refund-reversal-${Date.now()}` } });
  const resident = await prisma.resident.create({
    data: {
      orgId: org.id,
      name: "Test Resident",
      phone: "9999999999",
      joinDate: new Date(),
      duesPaisa: 50_000,
      monthlyFeePaisa: 50_000,
    },
  });
  const user: AuthUser = { userId: "refund-test", orgId: org.id, role: "owner", name: "Tester" };

  const readResident = async () =>
    prisma.resident.findUniqueOrThrow({ where: { id: resident.id } });

  const expect = async (label: string, dues: number, advance: number) => {
    const r = await readResident();
    const ok = r.duesPaisa === dues && r.advanceBalancePaisa === advance;
    if (ok) {
      console.log(`PASS  ${label}: dues=${r.duesPaisa}, advance=${r.advanceBalancePaisa}`);
    } else {
      failures++;
      console.error(
        `FAIL  ${label}: got dues=${r.duesPaisa}, advance=${r.advanceBalancePaisa}; ` +
          `expected dues=${dues}, advance=${advance}`,
      );
    }
  };

  // ---- overpayment creates advance ----
  const rent = await svc.record(user, {
    residentId: resident.id,
    amountPaisa: 80_000,
    method: "cash",
    type: "rent",
    paidAt: new Date().toISOString(),
  });
  await expect("overpay 80000 on 50000 dues", 0, 30_000);
  console.log(`      payment.advanceAppliedPaisa=${(await prisma.payment.findUniqueOrThrow({ where: { id: rent.id } })).advanceAppliedPaisa} (expect 30000)`);

  // ---- partial refund unwinds advance first ----
  await svc.refund(user, { paymentId: rent.id, amountPaisa: 20_000, reason: "overpaid by mistake" });
  await expect("refund 20000 (advance-first)", 0, 10_000);

  // ---- larger refund exhausts advance then restores dues ----
  await svc.refund(user, { paymentId: rent.id, amountPaisa: 40_000, reason: "further correction" });
  await expect("refund another 40000 (advance exhausted, dues restored)", 30_000, 0);

  // ---- non-rent refund leaves dues/advance untouched ----
  const fine = await svc.record(user, {
    residentId: resident.id,
    amountPaisa: 5_000,
    method: "cash",
    type: "fine",
    paidAt: new Date().toISOString(),
  });
  await svc.refund(user, { paymentId: fine.id, amountPaisa: 5_000, reason: "waived" });
  await expect("refund a fine (non-rent, no dues/advance change)", 30_000, 0);

  if (failures === 0) console.log("PASS: refund reversal matches the advance-first formula.");
  else process.exitCode = 1;

  await prisma.auditLogEntry.deleteMany({ where: { orgId: org.id } });
  await prisma.payment.deleteMany({ where: { orgId: org.id } });
  await prisma.sequenceCounter.deleteMany({ where: { orgId: org.id } });
  await prisma.resident.deleteMany({ where: { orgId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
}

void main();
