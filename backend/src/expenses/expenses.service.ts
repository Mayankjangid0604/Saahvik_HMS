import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Expense, ExpenseCategory, PaymentMethod, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { userHasPermission } from "../common/permissions";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseListParamsDto,
  UpdateExpenseCategoryDto,
} from "./dto";

/** Seeded for every org on first access to the category list. */
const DEFAULT_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Maintenance",
  "Groceries",
  "Miscellaneous",
];

type ExpenseWithCategory = Expense & { category: { name: string } };
type CategoryWithCount = ExpenseCategory & { _count: { expenses: number } };

export function toExpenseDto(e: ExpenseWithCategory) {
  return {
    id: e.id,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    label: e.label,
    amountPaisa: e.amountPaisa,
    method: e.method,
    spentAt: e.spentAt.toISOString(),
    notes: e.notes ?? undefined,
    attachmentUrl: e.attachmentKey ? `/api/v1/files/${e.attachmentKey}` : undefined,
    recordedByName: e.recordedByName,
    createdAt: e.createdAt.toISOString(),
  };
}

export function toCategoryDto(c: CategoryWithCount) {
  return {
    id: c.id,
    name: c.name,
    active: c.active,
    sortOrder: c.sortOrder,
    expenseCount: c._count.expenses,
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Expenses and their categories. Create/list/manage are gated behind the
 * "manageExpenses" staff permission (owners always allowed) — enforced here,
 * never trusting the frontend to have hidden the UI.
 */
@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Throws 403 unless the caller is an owner or a staff member with manageExpenses. */
  async requireManageExpenses(user: AuthUser): Promise<void> {
    if (!(await userHasPermission(this.prisma, user, "manageExpenses"))) {
      throw new ForbiddenException("You do not have permission to manage expenses");
    }
  }

  // ---------- categories ----------

  /** Lazily seed the default categories the first time an org reads them. */
  private async ensureCategories(orgId: string): Promise<void> {
    const count = await this.prisma.expenseCategory.count({ where: { orgId } });
    if (count > 0) return;
    await this.prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name, i) => ({ orgId, name, sortOrder: i })),
      skipDuplicates: true,
    });
  }

  async listCategories(user: AuthUser, opts: { onlyActive?: boolean } = {}) {
    await this.requireManageExpenses(user);
    await this.ensureCategories(user.orgId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { orgId: user.orgId, ...(opts.onlyActive ? { active: true } : {}) },
      include: { _count: { select: { expenses: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return categories.map(toCategoryDto);
  }

  async createCategory(user: AuthUser, dto: CreateExpenseCategoryDto) {
    await this.requireManageExpenses(user);
    const dupe = await this.prisma.expenseCategory.findFirst({
      where: { orgId: user.orgId, name: { equals: dto.name, mode: "insensitive" } },
    });
    if (dupe) throw new ConflictException(`A category named "${dto.name}" already exists`);

    const max = await this.prisma.expenseCategory.aggregate({
      where: { orgId: user.orgId },
      _max: { sortOrder: true },
    });
    const category = await this.prisma.expenseCategory.create({
      data: { orgId: user.orgId, name: dto.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      include: { _count: { select: { expenses: true } } },
    });
    await this.audit.log(user, {
      action: "created_expense_category",
      entityType: "expense_category",
      entityId: category.id,
      entityLabel: category.name,
    });
    return toCategoryDto(category);
  }

  async updateCategory(user: AuthUser, id: string, dto: UpdateExpenseCategoryDto) {
    await this.requireManageExpenses(user);
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Expense category");

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dupe = await this.prisma.expenseCategory.findFirst({
        where: {
          orgId: user.orgId,
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: existing.id },
        },
      });
      if (dupe) throw new ConflictException(`A category named "${dto.name}" already exists`);
    }

    const data: Prisma.ExpenseCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.active !== undefined) data.active = dto.active;
    const category = await this.prisma.expenseCategory.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { expenses: true } } },
    });
    await this.audit.log(user, {
      action: "updated_expense_category",
      entityType: "expense_category",
      entityId: category.id,
      entityLabel: category.name,
      details: { changes: dto },
    });
    return toCategoryDto(category);
  }

  // ---------- expenses ----------

  async list(user: AuthUser, params: ExpenseListParamsDto): Promise<Paginated<unknown>> {
    await this.requireManageExpenses(user);
    const where: Prisma.ExpenseWhereInput = { orgId: user.orgId };
    if (params.categoryId && params.categoryId !== "all") where.categoryId = params.categoryId;
    if (params.method && params.method !== "all") where.method = params.method as PaymentMethod;
    if (params.from || params.to) {
      where.spentAt = {};
      if (params.from) where.spentAt.gte = new Date(params.from);
      if (params.to) where.spentAt.lte = new Date(`${params.to}T23:59:59.999Z`);
    }
    if (params.search) {
      where.OR = [
        { label: { contains: params.search, mode: "insensitive" } },
        { notes: { contains: params.search, mode: "insensitive" } },
        { category: { is: { name: { contains: params.search, mode: "insensitive" } } } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const orderBy: Prisma.ExpenseOrderByWithRelationInput =
      params.sortBy === "amountPaisa"
        ? { amountPaisa: params.sortDir ?? "desc" }
        : { spentAt: params.sortDir ?? "desc" };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy,
        skip,
        take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return paginated(rows.map(toExpenseDto), total, page, pageSize);
  }

  async create(user: AuthUser, dto: CreateExpenseDto) {
    await this.requireManageExpenses(user);
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, orgId: user.orgId },
    });
    if (!category) throw ApiError.badRequest("Unknown expense category");

    const expense = await this.prisma.expense.create({
      data: {
        orgId: user.orgId,
        categoryId: category.id,
        label: dto.label,
        amountPaisa: dto.amountPaisa,
        method: dto.method,
        spentAt: new Date(dto.spentAt),
        notes: dto.notes,
        attachmentKey: dto.attachmentKey,
        recordedByName: user.name,
      },
      include: { category: { select: { name: true } } },
    });
    await this.audit.log(user, {
      action: "recorded_expense",
      entityType: "expense",
      entityId: expense.id,
      entityLabel: expense.label,
      details: {
        category: category.name,
        amountPaisa: dto.amountPaisa,
        method: dto.method,
      },
    });
    return toExpenseDto(expense);
  }
}
