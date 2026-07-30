/** Expense API backed by the real backend. Gated server-side by the manageExpenses permission (owners always allowed). */
import type {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseListParams,
  Paginated,
  UpdateExpenseCategoryInput,
} from "./types";
import { apiClient } from "./client";

export async function listExpenses(params: ExpenseListParams = {}): Promise<Paginated<Expense>> {
  const { data } = await apiClient.get<Paginated<Expense>>("/expenses", { params });
  return data;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<Expense>("/expenses", input);
  return data;
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await apiClient.get<ExpenseCategory[]>("/expense-categories");
  return data;
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const { data } = await apiClient.post<ExpenseCategory>("/expense-categories", input);
  return data;
}

export async function updateExpenseCategory(
  id: string,
  input: UpdateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const { data } = await apiClient.put<ExpenseCategory>(`/expense-categories/${id}`, input);
  return data;
}
