import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntryInput {
  action: string; // "recorded_payment", "added_resident", …
  entityType: string; // "payment", "resident", …
  entityId: string;
  entityLabel: string;
  details?: Record<string, unknown>;
}

/**
 * Injected into every service that mutates data. Controllers never write
 * audit entries. The AuditLogEntry table has no update/delete API — ever.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Write an audit entry. Pass `tx` to make the entry atomic with the
   * mutation it describes; without it the write still happens but a crash
   * between mutation and log could drop the entry.
   */
  async log(
    actor: AuthUser,
    entry: AuditEntryInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLogEntry.create({
        data: {
          orgId: actor.orgId,
          actorUserId: actor.userId,
          actorName: actor.name,
          actorRole: actor.role === "staff" ? `staff:${actor.staffRole ?? "unknown"}` : "owner",
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityLabel: entry.entityLabel,
          details: (entry.details ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Inside a transaction a failure must roll the mutation back with it;
      // outside one, the mutation already committed, so log loudly instead
      // of failing the request after the fact.
      if (tx) throw err;
      this.logger.error(`Audit write failed for ${entry.action}`, err as Error);
    }
  }
}
