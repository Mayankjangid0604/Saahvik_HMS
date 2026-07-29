import { Controller, Get, Inject, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";

class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  from?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  to?: string; // YYYY-MM-DD
}

/** Read-only. There is no write/update/delete endpoint for the audit log. */
@Controller("audit-log")
@Roles("owner")
export class AuditController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(AuditLogQueryDto) q: AuditLogQueryDto,
  ): Promise<Paginated<unknown>> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;

    const where: Prisma.AuditLogEntryWhereInput = { orgId: user.orgId };
    if (q.actor) where.actorName = { contains: q.actor, mode: "insensitive" };
    if (q.action) where.action = q.action;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(`${q.to}T23:59:59.999Z`);
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLogEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLogEntry.count({ where }),
    ]);
    return paginated(rows, total, page, limit);
  }
}
