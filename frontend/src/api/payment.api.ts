/** Finance API backed by the real backend: payments, fees, dues, invoices, deposits, discounts. */
import type {
  AssignFeeInput,
  CreateDiscountInput,
  CreateFeeStructureInput,
  DepositActionInput,
  Discount,
  DueEntry,
  DuesSummary,
  FeeAssignment,
  FeeStructure,
  Invoice,
  ListParams,
  Paginated,
  Payment,
  PaymentListParams,
  RecordPaymentInput,
  RefundInput,
  SecurityDeposit,
} from "./types";
import { apiClient } from "./client";

// ---------- Payments ----------

export async function listPayments(params: PaymentListParams = {}): Promise<Paginated<Payment>> {
  const { data } = await apiClient.get<Paginated<Payment>>("/payments", { params });
  return data;
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await apiClient.get<Payment>(`/payments/${id}`);
  return data;
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const { data } = await apiClient.post<Payment>("/payments", input);
  return data;
}

export async function refundPayment(input: RefundInput): Promise<Payment> {
  const { data } = await apiClient.post<Payment>("/payments/refund", input);
  return data;
}

// ---------- Fee structures ----------

export async function listFeeStructures(): Promise<FeeStructure[]> {
  const { data } = await apiClient.get<FeeStructure[]>("/fees/structures");
  return data;
}

export async function createFeeStructure(input: CreateFeeStructureInput): Promise<FeeStructure> {
  const { data } = await apiClient.post<FeeStructure>("/fees/structures", input);
  return data;
}

export async function deleteFeeStructure(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/fees/structures/${id}`);
  return data;
}

export async function listFeeAssignments(params: ListParams = {}): Promise<Paginated<FeeAssignment>> {
  const { data } = await apiClient.get<Paginated<FeeAssignment>>("/fees/assignments", { params });
  return data;
}

export async function assignFee(input: AssignFeeInput): Promise<{ assigned: number }> {
  const { data } = await apiClient.post<{ assigned: number }>("/fees/assignments", input);
  return data;
}

export async function removeFeeAssignment(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/fees/assignments/${id}`);
  return data;
}

// ---------- Dues ----------

export async function listDues(params: ListParams = {}): Promise<Paginated<DueEntry>> {
  const { data } = await apiClient.get<Paginated<DueEntry>>("/dues", { params });
  return data;
}

export async function getDuesSummary(): Promise<DuesSummary> {
  const { data } = await apiClient.get<DuesSummary>("/dues/summary");
  return data;
}

// ---------- Invoices ----------

export interface InvoiceListParams extends ListParams {
  status?: Invoice["status"] | "all";
}

export async function listInvoices(params: InvoiceListParams = {}): Promise<Paginated<Invoice>> {
  const { data } = await apiClient.get<Paginated<Invoice>>("/invoices", { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(input: {
  residentId: string;
  items: Invoice["items"];
  dueDate: string;
}): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>("/invoices", input);
  return data;
}

// ---------- Security deposits ----------

export interface DepositListParams extends ListParams {
  status?: SecurityDeposit["status"] | "all";
}

export async function listDeposits(params: DepositListParams = {}): Promise<Paginated<SecurityDeposit>> {
  const { data } = await apiClient.get<Paginated<SecurityDeposit>>("/deposits", { params });
  return data;
}

export async function actOnDeposit(input: DepositActionInput): Promise<SecurityDeposit> {
  if (input.action === "forfeit") {
    const { data } = await apiClient.put<SecurityDeposit>(
      `/deposits/${input.depositId}/forfeit`,
      { reason: input.reason },
    );
    return data;
  }
  // Full refund omits amountPaisa — the backend refunds the remaining balance.
  const { data } = await apiClient.put<SecurityDeposit>(`/deposits/${input.depositId}/refund`, {
    amountPaisa: input.action === "partial_refund" ? input.amountPaisa : undefined,
    reason: input.reason,
  });
  return data;
}

// ---------- Discounts ----------

export async function listDiscounts(): Promise<Discount[]> {
  const { data } = await apiClient.get<Discount[]>("/discounts");
  return data;
}

export async function createDiscount(input: CreateDiscountInput): Promise<Discount> {
  const { data } = await apiClient.post<Discount>("/discounts", input);
  return data;
}

export async function toggleDiscount(id: string): Promise<Discount> {
  const { data } = await apiClient.put<Discount>(`/discounts/${id}/toggle`);
  return data;
}

export async function applyDiscount(input: {
  discountId: string;
  residentIds: string[];
}): Promise<{ applied: number }> {
  const { data } = await apiClient.post<{ applied: number }>(
    `/discounts/${input.discountId}/apply`,
    { residentIds: input.residentIds },
  );
  return data;
}
