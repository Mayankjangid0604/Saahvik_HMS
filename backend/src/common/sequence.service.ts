import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type SequenceScope = "invoice" | "receipt" | "complaint" | "form";

/**
 * Concurrent-safe sequential numbers (INV-2026-0001, RCP-2026-0001, CMP-0031).
 *
 * A naive count-and-increment races under concurrent inserts and produces
 * duplicates. Instead the counter row is locked with SELECT ... FOR UPDATE
 * inside the SAME transaction as the insert that consumes the number, so two
 * concurrent requests serialize on the row lock.
 */
@Injectable()
export class SequenceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Must be called with the transaction client of the surrounding insert. */
  async next(
    tx: Prisma.TransactionClient,
    orgId: string,
    scope: SequenceScope,
    year: number,
  ): Promise<number> {
    // Ensure the counter row exists (no-op when it already does).
    await tx.$executeRaw`
      INSERT INTO "SequenceCounter" ("id", "orgId", "scope", "year", "lastSeq")
      VALUES (gen_random_uuid(), ${orgId}, ${scope}, ${year}, 0)
      ON CONFLICT ("orgId", "scope", "year") DO NOTHING`;

    const rows = await tx.$queryRaw<Array<{ lastSeq: number }>>`
      SELECT "lastSeq" FROM "SequenceCounter"
      WHERE "orgId" = ${orgId} AND "scope" = ${scope} AND "year" = ${year}
      FOR UPDATE`;
    const nextSeq = rows[0].lastSeq + 1;

    await tx.$executeRaw`
      UPDATE "SequenceCounter" SET "lastSeq" = ${nextSeq}
      WHERE "orgId" = ${orgId} AND "scope" = ${scope} AND "year" = ${year}`;
    return nextSeq;
  }

  formatInvoiceNo(year: number, seq: number): string {
    return `INV-${year}-${String(seq).padStart(4, "0")}`;
  }

  formatReceiptNo(year: number, seq: number): string {
    return `RCP-${year}-${String(seq).padStart(4, "0")}`;
  }

  formatTicketNo(seq: number): string {
    return `CMP-${String(seq).padStart(4, "0")}`;
  }
}
