/**
 * Deliverable check: sequential invoice numbering must survive concurrent
 * writes without duplicates or gaps (business rule 7).
 *
 * Fires N invoice creations in parallel against one org through the SAME
 * SELECT ... FOR UPDATE path the API uses, then asserts every allocated
 * number is unique and the sequence is dense (1..N).
 *
 * Run: npm run test:invoice-concurrency   (needs DATABASE_URL up + migrated)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SequenceService } from "../src/common/sequence.service";
import type { PrismaService } from "../src/prisma/prisma.service";

const CONCURRENCY = 25;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const sequence = new SequenceService(prisma as unknown as PrismaService);

  // Isolated scratch org so the test never touches real data.
  const org = await prisma.organization.create({
    data: { name: `concurrency-test-${Date.now()}` },
  });
  const resident = await prisma.resident.create({
    data: { orgId: org.id, name: "Test Resident", phone: "9999999999", joinDate: new Date() },
  });

  const year = new Date().getFullYear();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) =>
      prisma.$transaction(async (tx) => {
        const seq = await sequence.next(tx, org.id, "invoice", year);
        const invoiceNumber = sequence.formatInvoiceNo(year, seq);
        await tx.invoice.create({
          data: {
            orgId: org.id,
            residentId: resident.id,
            invoiceNumber,
            amountPaisa: 100 * (i + 1),
            lineItems: [{ description: "load test", amountPaisa: 100 * (i + 1) }],
            issuedAt: new Date(),
          },
        });
        return invoiceNumber;
      }),
    ),
  );

  const unique = new Set(results);
  const sorted = [...results].sort();
  const expected = Array.from({ length: CONCURRENCY }, (_, i) =>
    sequence.formatInvoiceNo(year, i + 1),
  ).sort();

  console.log(`Allocated ${results.length} invoice numbers, ${unique.size} unique.`);
  if (unique.size !== CONCURRENCY) {
    console.error("FAIL: duplicate invoice numbers detected:", results);
    process.exitCode = 1;
  } else if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    console.error("FAIL: sequence has gaps:", sorted);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${sorted[0]} … ${sorted[sorted.length - 1]} — dense, no duplicates.`);
  }

  // Clean up the scratch org.
  await prisma.invoice.deleteMany({ where: { orgId: org.id } });
  await prisma.sequenceCounter.deleteMany({ where: { orgId: org.id } });
  await prisma.resident.deleteMany({ where: { orgId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
}

void main();
