/**
 * Deliverable checks for the two dues-ordering rules:
 *
 * 1. Residents list sorted by duesPaisa must rank by the NETTED
 *    effectiveDues(dues, advance) that is displayed — a resident whose advance
 *    fully offsets large raw dues must NOT outrank one who genuinely owes.
 * 2. The /dues list must sort by days-overdue (monthsOverdue), longest first —
 *    a resident 5 months behind on a small fee ranks above one 1 month behind
 *    on a large fee, with amount owed only breaking ties.
 *
 * Run: npm run test:dues-sort   (needs DATABASE_URL up + migrated)
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
import { ResidentsService } from "../src/residents/residents.service";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const ps = prisma as unknown as PrismaService;
  const audit = new AuditService(ps);
  const notifications = new NotificationsService(ps);
  const residentsSvc = new ResidentsService(ps, audit, notifications);
  const paymentsSvc = new PaymentsService(ps, audit, new SequenceService(ps), notifications, new PdfService());
  let failures = 0;

  // Isolated scratch org so the test never touches real data.
  const org = await prisma.organization.create({ data: { name: `dues-sort-${Date.now()}` } });
  const user: AuthUser = { userId: "dues-sort-test", orgId: org.id, role: "owner", name: "Tester" };

  const mk = (name: string, dues: number, advance: number, fee: number) =>
    prisma.resident.create({
      data: {
        orgId: org.id,
        name,
        phone: "9999999999",
        joinDate: new Date(),
        status: "active",
        duesPaisa: dues,
        advanceBalancePaisa: advance,
        monthlyFeePaisa: fee,
      },
    });

  // A: raw dues ₹1000 fully offset by ₹1000 advance → net 0.
  // B: raw dues ₹500, no advance → net ₹500. Genuinely owes more than A.
  // C: ₹250 owed at ₹50/month fee → 5 months overdue (longest).
  // D: ₹600 owed at ₹600/month fee → 1 month overdue, but largest amount.
  await mk("A net-zero", 100_000, 100_000, 100_000);
  await mk("B owes-500", 50_000, 0, 50_000);
  await mk("C five-months", 25_000, 0, 5_000);
  await mk("D one-month-big", 60_000, 0, 60_000);

  const check = (label: string, got: string[], want: string[]) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}: [${got.join(", ")}] (expect [${want.join(", ")}])`);
    if (!ok) failures++;
  };

  // ---- residents list, dues descending: netted values must rank ----
  const list = await residentsSvc.list(user, { sortBy: "duesPaisa", sortDir: "desc" } as never);
  check(
    "residents sorted by NETTED dues desc",
    (list.data as Array<{ name: string }>).map((r) => r.name),
    ["D one-month-big", "B owes-500", "C five-months", "A net-zero"],
  );

  // ---- dues list: longest-overdue first, amount only breaks ties ----
  const dues = await paymentsSvc.listDues(user, {});
  check(
    "dues list sorted by months-overdue desc",
    (dues.data as Array<{ residentName: string }>).map((d) => d.residentName),
    ["C five-months", "D one-month-big", "B owes-500"],
  );
  const c = (dues.data as Array<{ residentName: string; monthsOverdue: number }>).find(
    (d) => d.residentName === "C five-months",
  );
  console.log(`      C monthsOverdue=${c?.monthsOverdue} (expect 5); A absent from dues list: ${
    !(dues.data as Array<{ residentName: string }>).some((d) => d.residentName === "A net-zero")
  }`);

  if (failures === 0) console.log("PASS: both dues orderings match the displayed/netted values.");
  else process.exitCode = 1;

  await prisma.resident.deleteMany({ where: { orgId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
}

void main();
