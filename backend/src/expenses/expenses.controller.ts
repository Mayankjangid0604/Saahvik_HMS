import { Controller, Get, Inject, Param, Post, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseListParamsDto,
  UpdateExpenseCategoryDto,
} from "./dto";
import { ExpensesService } from "./expenses.service";

/**
 * Access is gated on the "manageExpenses" permission inside the service
 * (owners always allowed), not via @Roles — staff with the permission need in.
 */
@Controller("expenses")
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(ExpenseListParamsDto) params: ExpenseListParamsDto) {
    return this.expenses.list(user, params);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateExpenseDto) dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }
}

@Controller("expense-categories")
export class ExpenseCategoriesController {
  constructor(@Inject(ExpensesService) private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.expenses.listCategories(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ValidatedBody(CreateExpenseCategoryDto) dto: CreateExpenseCategoryDto,
  ) {
    return this.expenses.createCategory(user, dto);
  }

  @Put(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateExpenseCategoryDto) dto: UpdateExpenseCategoryDto,
  ) {
    return this.expenses.updateCategory(user, id, dto);
  }
}
