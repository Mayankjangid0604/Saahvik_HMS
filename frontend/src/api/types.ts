/**
 * All API request/response shapes. Money fields are ALWAYS integer paisa
 * (₹5,000 = 500000). The mock layer and the real backend share these types.
 */

// ---------- Common ----------

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ---------- Auth / Org ----------

export type UserRole = "owner" | "staff";

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  /** Fine-grained capabilities. Owners hold every StaffPermission; staff hold a subset. */
  permissions?: StaffPermission[];
  createdAt: string;
}

export interface Org {
  id: string;
  name: string;
  hostelName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  plan: "basic";
  setupComplete: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  requiresTwoFactor: boolean;
  /** Present when requiresTwoFactor is true — echo back on /auth/2fa/verify */
  tempSessionId?: string;
  /** Present when requiresTwoFactor is false */
  token?: string;
  user?: User;
  org?: Org;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  hostelName: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface AuthSession {
  token: string;
  user: User;
  org: Org;
}

// ---------- Signup wizard & social auth ----------
// These shapes are consumed by mock flows today (no OAuth/OTP/payment
// provider is wired yet) but are written as the future API contract.

/** What a completed Google sign-in hands back to the app. */
export interface GoogleAuthResult {
  provider: "google";
  /** Google account `sub` claim (mocked until real OAuth exists). */
  googleId: string;
  name: string;
  email: string;
  /** Google verifies email ownership; phone still needs our own OTP. */
  emailVerified: boolean;
}

export type OtpChannel = "phone" | "email";

export interface OtpSendResult {
  channel: OtpChannel;
  sent: boolean;
  /** Where the code went, for display (e.g. masked phone). */
  destination: string;
}

export interface OtpVerifyResult {
  channel: OtpChannel;
  verified: boolean;
  error?: string;
}

export type BillingCycle = "monthly" | "yearly";

/** The plan choice made in the signup wizard. */
export interface PlanSelection {
  planId: "basic";
  /** "pilot" = free 6-month pilot, no payment; "paid" = pay today. */
  mode: "pilot" | "paid";
  /** null while mode is "pilot". */
  billingCycle: BillingCycle | null;
  /** Amount due today. 0 for the pilot. */
  amountPaisa: number;
}

export interface MockPaymentResult {
  status: "success";
  /** Mock stand-in for the Razorpay payment id. */
  paymentId: string;
  method: "card" | "upi";
  amountPaisa: number;
}

// ---------- Rooms & Beds ----------

/** Room type implies capacity: single=1, double=2, triple=3, quad=4; dorm is custom. */
export type RoomType = "single" | "double" | "triple" | "quad" | "dorm";
export type BedStatus = "occupied" | "vacant" | "maintenance";

/** How resident fees work for a room. "fixed" locks every resident's fee to the room's amount. */
export type RoomFeeMode = "fixed" | "variable";

export interface Bed {
  id: string;
  roomId: string;
  label: string; // A, B, C…
  status: BedStatus;
  residentId?: string;
  residentName?: string;
}

export interface Room {
  id: string;
  number: string; // "Room 101"
  floor: number;
  type: RoomType;
  capacity: number;
  monthlyRentPaisa: number;
  feeMode: RoomFeeMode;
  /** Set when feeMode is "fixed"; null otherwise */
  fixedFeeAmountPaisa: number | null;
  /** Optional wing this room belongs to. */
  wingId?: string;
  wingName?: string;
  beds: Bed[];
  occupiedCount: number;
  notes?: string;
}

export interface CreateRoomInput {
  number: string;
  floor: number;
  type: RoomType;
  capacity: number;
  feeMode: RoomFeeMode;
  fixedFeeAmountPaisa: number | null;
  wingId?: string;
  notes?: string;
}

export interface BulkAddRoomsInput {
  floor: number;
  startNumber: number;
  count: number;
  type: RoomType;
  capacity: number;
  feeMode: RoomFeeMode;
  fixedFeeAmountPaisa: number | null;
  wingId?: string;
}

// ---------- Wings ----------

export interface Wing {
  id: string;
  hostelId: string;
  name: string;
  notes?: string;
  roomCount: number;
  createdAt: string;
}

export interface CreateWingInput {
  name: string;
  hostelId?: string;
  notes?: string;
}

export interface UpdateWingInput {
  name?: string;
  notes?: string;
}

export interface UpdateRoomFeeInput {
  feeMode: RoomFeeMode;
  fixedFeeAmountPaisa: number | null;
}

export interface RoomTransferInput {
  residentId: string;
  toRoomId: string;
  toBedId: string;
  effectiveDate: string;
  reason?: string;
}

// ---------- Residents ----------

export type ResidentStatus = "active" | "notice" | "alumni";
export type IdDocumentType = "aadhaar" | "pan" | "passport" | "driving_license" | "voter_id";

export interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  status: ResidentStatus;
  roomId?: string;
  roomNumber?: string;
  bedId?: string;
  bedLabel?: string;
  joinDate: string;
  exitDate?: string;
  guardianName: string;
  guardianPhone: string;
  permanentAddress: string;
  idType: IdDocumentType;
  idNumber: string;
  occupation: "student" | "working";
  institutionOrCompany?: string;
  monthlyFeePaisa: number;
  depositPaisa: number;
  duesPaisa: number;
  notes?: string;
  /** Answers to the configurable admission form, keyed by field key. */
  admissionData?: Record<string, string>;
}

export interface ResidentListParams extends ListParams {
  status?: ResidentStatus | "all";
  roomId?: string;
}

export type CreateResidentInput = Omit<Resident, "id" | "duesPaisa" | "status" | "roomNumber" | "bedLabel"> & {
  status?: ResidentStatus;
};

export interface BulkImportRow {
  name: string;
  phone: string;
  roomNumber: string;
  bedLabel: string;
  monthlyFeeRupees: number;
  joinDate: string;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// ---------- Payments ----------

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "cheque";
export type PaymentType = "rent" | "deposit" | "fine" | "other";
export type PaymentStatus = "completed" | "refunded" | "partially_refunded";

export interface Payment {
  id: string;
  receiptNo: string; // RCP-2026-0041
  residentId: string;
  residentName: string;
  roomNumber?: string;
  amountPaisa: number;
  method: PaymentMethod;
  type: PaymentType;
  status: PaymentStatus;
  paidAt: string;
  periodMonth?: string; // "2026-07" for rent
  refundedPaisa: number;
  notes?: string;
  recordedByName: string;
}

export interface PaymentListParams extends ListParams {
  method?: PaymentMethod | "all";
  type?: PaymentType | "all";
  from?: string;
  to?: string;
}

export interface RecordPaymentInput {
  residentId: string;
  amountPaisa: number;
  method: PaymentMethod;
  type: PaymentType;
  paidAt: string;
  periodMonth?: string;
  notes?: string;
}

export interface RefundInput {
  paymentId: string;
  amountPaisa: number;
  reason: string;
}

// ---------- Fees ----------

export type FeeCycle = "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";

export interface FeeStructure {
  id: string;
  name: string;
  amountPaisa: number;
  cycle: FeeCycle;
  description?: string;
  assignedCount: number;
  createdAt: string;
}

export interface CreateFeeStructureInput {
  name: string;
  amountPaisa: number;
  cycle: FeeCycle;
  description?: string;
}

export interface FeeAssignment {
  id: string;
  feeStructureId: string;
  feeName: string;
  residentId: string;
  residentName: string;
  roomNumber?: string;
  startDate: string;
  amountPaisa: number;
}

export interface AssignFeeInput {
  feeStructureId: string;
  residentIds: string[];
  startDate: string;
}

// ---------- Dues ----------

export type DueSeverity = "low" | "medium" | "high";

export interface DueEntry {
  residentId: string;
  residentName: string;
  phone: string;
  roomNumber?: string;
  duesPaisa: number;
  oldestDueDate: string;
  monthsOverdue: number;
  severity: DueSeverity;
}

export interface DuesSummary {
  totalDuesPaisa: number;
  residentsWithDues: number;
  highSeverityCount: number;
}

// ---------- Invoices ----------

export type InvoiceStatus = "paid" | "unpaid" | "partially_paid" | "overdue" | "cancelled";

export interface InvoiceItem {
  description: string;
  amountPaisa: number;
}

export interface Invoice {
  id: string;
  number: string; // INV-2026-0007
  residentId: string;
  residentName: string;
  roomNumber?: string;
  items: InvoiceItem[];
  totalPaisa: number;
  paidPaisa: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
}

// ---------- Security Deposits ----------

export type DepositStatus = "held" | "partially_refunded" | "refunded" | "forfeited";

export interface SecurityDeposit {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber?: string;
  amountPaisa: number;
  refundedPaisa: number;
  status: DepositStatus;
  collectedOn: string;
  updatedOn: string;
  notes?: string;
}

export interface DepositActionInput {
  depositId: string;
  action: "partial_refund" | "full_refund" | "forfeit";
  amountPaisa?: number; // for partial refund
  reason?: string;
}

// ---------- Complaints ----------

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";
export type ComplaintPriority = "low" | "medium" | "high";
export type ComplaintCategory =
  | "electrical"
  | "plumbing"
  | "cleaning"
  | "food"
  | "wifi"
  | "furniture"
  | "security"
  | "other";

export interface ComplaintEvent {
  id: string;
  status: ComplaintStatus;
  note?: string;
  byName: string;
  at: string;
}

export interface ComplaintAttachment {
  id: string;
  fileName: string;
  fileType: string;
  url: string;
}

export interface Complaint {
  id: string;
  ticketNo: string; // CMP-0031
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  residentId?: string;
  residentName?: string;
  roomNumber?: string;
  createdAt: string;
  updatedAt: string;
  timeline: ComplaintEvent[];
  attachments: ComplaintAttachment[];
}

export interface ComplaintListParams extends ListParams {
  status?: ComplaintStatus | "all";
  category?: ComplaintCategory | "all";
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  residentId?: string;
  attachments?: { fileName: string; fileType: string }[];
}

// ---------- Discounts ----------

export type DiscountKind = "flat" | "percent";

export interface Discount {
  id: string;
  name: string;
  kind: DiscountKind;
  /** paisa when flat, percentage points when percent */
  value: number;
  appliedCount: number;
  active: boolean;
  validTill?: string;
  createdAt: string;
}

export interface CreateDiscountInput {
  name: string;
  kind: DiscountKind;
  value: number;
  validTill?: string;
}

// ---------- Expenses ----------

export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  expenseCount: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  label: string;
  amountPaisa: number;
  method: PaymentMethod;
  spentAt: string;
  notes?: string;
  /** Relative authenticated file path when an attachment exists. */
  attachmentUrl?: string;
  recordedByName: string;
  createdAt: string;
}

export interface ExpenseListParams extends ListParams {
  categoryId?: string | "all";
  method?: PaymentMethod | "all";
  from?: string;
  to?: string;
}

export interface CreateExpenseInput {
  categoryId: string;
  label: string;
  amountPaisa: number;
  method: PaymentMethod;
  spentAt: string;
  notes?: string;
  attachmentKey?: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  active?: boolean;
}

// ---------- Dashboard ----------

export type DashboardRange =
  | "today"
  | "yesterday"
  | "last7"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear";

export interface PropertyOccupancy {
  id: string;
  name: string;
  occupiedBeds: number;
  totalBeds: number;
  occupancyPct: number;
}

/** Collection totals split by payment method (paisa). */
export interface CollectionByMethod {
  cash: number;
  upi: number;
  bank_transfer: number;
  card: number;
  cheque: number;
}

export interface ExpenseBreakdownItem {
  categoryId: string;
  label: string;
  amountPaisa: number;
  /** Share of the range's total expense, 0–100. */
  pct: number;
}

export interface DashboardChartPoint {
  label: string;
  amountPaisa: number;
}

export interface DashboardData {
  range: DashboardRange;
  rangeLabel: string;
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceBeds: number;
    occupancyPct: number;
    /** One entry per hostel/property. Skip the list in the UI when length <= 1. */
    byProperty: PropertyOccupancy[];
  };
  dues: DuesSummary;
  /** Collection for the selected range, net of refunds. */
  collection: {
    totalPaisa: number;
    byMethod: CollectionByMethod;
  };
  /** Collection − expenses for the range. */
  netProfitPaisa: number;
  activeResidents: number;
  advanceCollectedPaisa: number;
  cashInflowPaisa: number;
  complaints: { total: number; active: number; resolved: number };
  expense: {
    totalPaisa: number;
    breakdown: ExpenseBreakdownItem[];
  };
  /** Range-appropriate granularity (hour/day/month). */
  collectionsChart: DashboardChartPoint[];
  recentPayments: Payment[];
  recentComplaints: Complaint[];
  /** Due residents, longest overdue first. */
  dueResidents: DueEntry[];
  /** Current calendar month, NEVER affected by the range filter. */
  thisMonthFixed: {
    collectionPaisa: number;
    advancePaisa: number;
    netProfitPaisa: number;
  };
}

// ---------- Staff ----------

/** Fine-grained staff capabilities (mirrors backend STAFF_PERMISSIONS). */
export type StaffPermission = "manageExpenses";

export type StaffRole = "manager" | "receptionist" | "maintenance";
export type StaffStatus = "active" | "inactive";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  /** Present for staff (not owners). */
  staffRole?: StaffRole;
  status?: StaffStatus;
  /** Capabilities granted to this member. Owners implicitly hold all. */
  permissions?: StaffPermission[];
  addedAt: string;
  lastActiveAt?: string;
  /** One-time password returned ONLY by POST /staff — never retrievable again. */
  tempPassword?: string;
}

export interface StaffList {
  staff: StaffMember[];
  limit: number; // Basic plan: 3 total including owner
  used: number;
}

export interface AddStaffInput {
  name: string;
  email: string;
  phone: string;
  permissions?: StaffPermission[];
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  status?: StaffStatus;
  permissions?: StaffPermission[];
}

// ---------- Notifications ----------

export type NotificationKind = "payment" | "complaint" | "due" | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface NotificationPreferences {
  duesReminder: boolean;
  paymentReceived: boolean;
  newComplaint: boolean;
  complaintResolved: boolean;
  weeklySummary: boolean;
  channelInApp: boolean;
  channelEmail: boolean;
}

// ---------- Settings ----------

export type AdmissionFieldType =
  | "text"
  | "number"
  | "date"
  | "phone"
  | "select"
  | "textarea"
  | "file"
  | "auto"; // system-generated, read-only (e.g. Form No.)

export interface AdmissionFormField {
  key: string;
  label: string;
  type: AdmissionFieldType;
  required: boolean;
  /** Seeded default field (from the Sunrise Hostel paper form) vs user-added custom field. */
  isDefault: boolean;
  /** Choices for type "select" */
  options?: string[];
  /** Extra format check applied on top of the type */
  validation?: "aadhaar" | "pincode";
  /** Auto-fill behavior: "today" pre-fills today's date; "formNo" generates a form number */
  autoFill?: "today" | "formNo";
}

export interface AdmissionFormConfig {
  fields: AdmissionFormField[];
}

export interface Subscription {
  plan: "basic";
  planLabel: string;
  pricePaisaPerMonth: number;
  renewsOn: string;
  limits: { staff: number; residents: number; hostels: number };
  usage: { staff: number; residents: number; hostels: number };
}

export interface ExportJob {
  id: string;
  status: "queued" | "processing" | "ready";
  requestedAt: string;
  downloadUrl?: string;
}

// ---------- Reports ----------

export type ReportType = "occupancy" | "dues" | "residents" | "collections";

export interface ReportFilters {
  from?: string;
  to?: string;
  month?: string;
}

export interface OccupancyReportRow {
  floor: number;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  occupied: number;
  vacant: number;
  occupancyPct: number;
}

export interface CollectionReportRow {
  month: string;
  rentPaisa: number;
  depositPaisa: number;
  otherPaisa: number;
  totalPaisa: number;
  paymentCount: number;
}
