/** Mock finance API: payments, fees, dues, invoices, deposits, discounts. */
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
import {
  delay,
  deposits,
  discounts,
  feeAssignments,
  feeStructures,
  invoices,
  nextId,
  nextInvoiceNo,
  nextReceiptNo,
  paginate,
  payments,
  residents,
  sortBy,
} from "./mock/db";

// ---------- Payments ----------

export async function listPayments(params: PaymentListParams = {}): Promise<Paginated<Payment>> {
  await delay();
  let list = [...payments];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.residentName.toLowerCase().includes(q) ||
        p.receiptNo.toLowerCase().includes(q) ||
        p.roomNumber?.toLowerCase().includes(q),
    );
  }
  if (params.method && params.method !== "all") list = list.filter((p) => p.method === params.method);
  if (params.type && params.type !== "all") list = list.filter((p) => p.type === params.type);
  if (params.from) list = list.filter((p) => p.paidAt >= params.from!);
  if (params.to) list = list.filter((p) => p.paidAt <= `${params.to}T23:59:59`);
  list = sortBy(list, params.sortBy ?? "paidAt", params.sortDir ?? "desc");
  return paginate(list, params.page, params.pageSize);
}

export async function getPayment(id: string): Promise<Payment> {
  await delay(300);
  const p = payments.find((x) => x.id === id);
  if (!p) throw new Error("Payment not found");
  return { ...p };
}

export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  await delay(600);
  const resident = residents.find((r) => r.id === input.residentId);
  if (!resident) throw new Error("Resident not found");
  const payment: Payment = {
    id: nextId("pay"),
    receiptNo: nextReceiptNo(),
    residentId: resident.id,
    residentName: resident.name,
    roomNumber: resident.roomNumber,
    amountPaisa: input.amountPaisa,
    method: input.method,
    type: input.type,
    status: "completed",
    paidAt: input.paidAt,
    periodMonth: input.periodMonth,
    refundedPaisa: 0,
    notes: input.notes,
    recordedByName: "Mayank Jangid",
  };
  payments.unshift(payment);
  if (input.type === "rent") {
    resident.duesPaisa = Math.max(0, resident.duesPaisa - input.amountPaisa);
  }
  return payment;
}

export async function refundPayment(input: RefundInput): Promise<Payment> {
  await delay(600);
  const p = payments.find((x) => x.id === input.paymentId);
  if (!p) throw new Error("Payment not found");
  const remaining = p.amountPaisa - p.refundedPaisa;
  if (input.amountPaisa > remaining) {
    throw new Error("Refund exceeds the remaining amount on this payment");
  }
  p.refundedPaisa += input.amountPaisa;
  p.status = p.refundedPaisa >= p.amountPaisa ? "refunded" : "partially_refunded";
  p.notes = [p.notes, `Refund: ${input.reason}`].filter(Boolean).join(" | ");
  return { ...p };
}

// ---------- Fee structures ----------

export async function listFeeStructures(): Promise<FeeStructure[]> {
  await delay();
  return [...feeStructures];
}

export async function createFeeStructure(input: CreateFeeStructureInput): Promise<FeeStructure> {
  await delay(500);
  const fee: FeeStructure = {
    id: nextId("fee"),
    ...input,
    assignedCount: 0,
    createdAt: new Date().toISOString(),
  };
  feeStructures.push(fee);
  return fee;
}

export async function deleteFeeStructure(id: string): Promise<{ ok: boolean }> {
  await delay(400);
  const idx = feeStructures.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error("Fee structure not found");
  if (feeStructures[idx].assignedCount > 0) {
    throw new Error("Cannot delete a fee that is assigned to residents");
  }
  feeStructures.splice(idx, 1);
  return { ok: true };
}

export async function listFeeAssignments(params: ListParams = {}): Promise<Paginated<FeeAssignment>> {
  await delay();
  let list = [...feeAssignments];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (a) => a.residentName.toLowerCase().includes(q) || a.feeName.toLowerCase().includes(q),
    );
  }
  list = sortBy(list, params.sortBy ?? "residentName", params.sortDir ?? "asc");
  return paginate(list, params.page, params.pageSize);
}

export async function assignFee(input: AssignFeeInput): Promise<{ assigned: number }> {
  await delay(700);
  const fee = feeStructures.find((f) => f.id === input.feeStructureId);
  if (!fee) throw new Error("Fee structure not found");
  let assigned = 0;
  for (const rid of input.residentIds) {
    const r = residents.find((x) => x.id === rid);
    if (!r) continue;
    if (feeAssignments.some((a) => a.feeStructureId === fee.id && a.residentId === rid)) continue;
    feeAssignments.push({
      id: nextId("fa"),
      feeStructureId: fee.id,
      feeName: fee.name,
      residentId: r.id,
      residentName: r.name,
      roomNumber: r.roomNumber,
      startDate: input.startDate,
      amountPaisa: fee.amountPaisa,
    });
    assigned++;
  }
  fee.assignedCount += assigned;
  return { assigned };
}

export async function removeFeeAssignment(id: string): Promise<{ ok: boolean }> {
  await delay(400);
  const idx = feeAssignments.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Assignment not found");
  const fee = feeStructures.find((f) => f.id === feeAssignments[idx].feeStructureId);
  if (fee) fee.assignedCount = Math.max(0, fee.assignedCount - 1);
  feeAssignments.splice(idx, 1);
  return { ok: true };
}

// ---------- Dues ----------

function severityFor(months: number): DueEntry["severity"] {
  if (months >= 3) return "high";
  if (months >= 2) return "medium";
  return "low";
}

function buildDues(): DueEntry[] {
  return residents
    .filter((r) => r.status === "active" && r.duesPaisa > 0)
    .map((r) => {
      const months = Math.max(1, Math.round(r.duesPaisa / Math.max(1, r.monthlyFeePaisa)));
      const oldest = new Date();
      oldest.setMonth(oldest.getMonth() - months);
      oldest.setDate(10);
      return {
        residentId: r.id,
        residentName: r.name,
        phone: r.phone,
        roomNumber: r.roomNumber,
        duesPaisa: r.duesPaisa,
        oldestDueDate: oldest.toISOString(),
        monthsOverdue: months,
        severity: severityFor(months),
      };
    })
    .sort((a, b) => b.duesPaisa - a.duesPaisa);
}

export async function listDues(params: ListParams = {}): Promise<Paginated<DueEntry>> {
  await delay();
  let list = buildDues();
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (d) => d.residentName.toLowerCase().includes(q) || d.roomNumber?.toLowerCase().includes(q),
    );
  }
  if (params.sortBy) list = sortBy(list, params.sortBy, params.sortDir ?? "desc");
  return paginate(list, params.page, params.pageSize);
}

export async function getDuesSummary(): Promise<DuesSummary> {
  await delay(200);
  const dues = buildDues();
  return {
    totalDuesPaisa: dues.reduce((s, d) => s + d.duesPaisa, 0),
    residentsWithDues: dues.length,
    highSeverityCount: dues.filter((d) => d.severity === "high").length,
  };
}

// ---------- Invoices ----------

export interface InvoiceListParams extends ListParams {
  status?: Invoice["status"] | "all";
}

export async function listInvoices(params: InvoiceListParams = {}): Promise<Paginated<Invoice>> {
  await delay();
  let list = [...invoices];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (i) => i.number.toLowerCase().includes(q) || i.residentName.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== "all") list = list.filter((i) => i.status === params.status);
  list = sortBy(list, params.sortBy ?? "issueDate", params.sortDir ?? "desc");
  return paginate(list, params.page, params.pageSize);
}

export async function getInvoice(id: string): Promise<Invoice> {
  await delay(300);
  const i = invoices.find((x) => x.id === id);
  if (!i) throw new Error("Invoice not found");
  return { ...i };
}

export async function createInvoice(input: {
  residentId: string;
  items: Invoice["items"];
  dueDate: string;
}): Promise<Invoice> {
  await delay(600);
  const r = residents.find((x) => x.id === input.residentId);
  if (!r) throw new Error("Resident not found");
  const total = input.items.reduce((s, it) => s + it.amountPaisa, 0);
  const inv: Invoice = {
    id: nextId("inv"),
    number: nextInvoiceNo(),
    residentId: r.id,
    residentName: r.name,
    roomNumber: r.roomNumber,
    items: input.items,
    totalPaisa: total,
    paidPaisa: 0,
    status: "unpaid",
    issueDate: new Date().toISOString(),
    dueDate: input.dueDate,
  };
  invoices.unshift(inv);
  return inv;
}

// ---------- Security deposits ----------

export interface DepositListParams extends ListParams {
  status?: SecurityDeposit["status"] | "all";
}

export async function listDeposits(params: DepositListParams = {}): Promise<Paginated<SecurityDeposit>> {
  await delay();
  let list = [...deposits];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (d) => d.residentName.toLowerCase().includes(q) || d.roomNumber?.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== "all") list = list.filter((d) => d.status === params.status);
  list = sortBy(list, params.sortBy ?? "collectedOn", params.sortDir ?? "desc");
  return paginate(list, params.page, params.pageSize);
}

export async function actOnDeposit(input: DepositActionInput): Promise<SecurityDeposit> {
  await delay(600);
  const d = deposits.find((x) => x.id === input.depositId);
  if (!d) throw new Error("Deposit not found");
  if (d.status === "refunded" || d.status === "forfeited") {
    throw new Error("This deposit is already settled");
  }
  if (input.action === "full_refund") {
    d.refundedPaisa = d.amountPaisa;
    d.status = "refunded";
  } else if (input.action === "partial_refund") {
    const amt = input.amountPaisa ?? 0;
    if (amt <= 0 || amt > d.amountPaisa - d.refundedPaisa) {
      throw new Error("Invalid partial refund amount");
    }
    d.refundedPaisa += amt;
    d.status = d.refundedPaisa >= d.amountPaisa ? "refunded" : "partially_refunded";
  } else {
    d.status = "forfeited";
  }
  if (input.reason) d.notes = input.reason;
  d.updatedOn = new Date().toISOString();
  return { ...d };
}

// ---------- Discounts ----------

export async function listDiscounts(): Promise<Discount[]> {
  await delay();
  return [...discounts];
}

export async function createDiscount(input: CreateDiscountInput): Promise<Discount> {
  await delay(500);
  const d: Discount = {
    id: nextId("disc"),
    ...input,
    appliedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  };
  discounts.push(d);
  return d;
}

export async function toggleDiscount(id: string): Promise<Discount> {
  await delay(300);
  const d = discounts.find((x) => x.id === id);
  if (!d) throw new Error("Discount not found");
  d.active = !d.active;
  return { ...d };
}

export async function applyDiscount(input: {
  discountId: string;
  residentIds: string[];
}): Promise<{ applied: number }> {
  await delay(600);
  const d = discounts.find((x) => x.id === input.discountId);
  if (!d) throw new Error("Discount not found");
  d.appliedCount += input.residentIds.length;
  return { applied: input.residentIds.length };
}
