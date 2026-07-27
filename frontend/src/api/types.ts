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

// ---------- Rooms & Beds ----------

export type RoomType = "single" | "double" | "triple" | "dorm";
export type BedStatus = "occupied" | "vacant" | "maintenance";

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
  beds: Bed[];
  occupiedCount: number;
  notes?: string;
}

export interface CreateRoomInput {
  number: string;
  floor: number;
  type: RoomType;
  capacity: number;
  monthlyRentPaisa: number;
  notes?: string;
}

export interface BulkAddRoomsInput {
  floor: number;
  startNumber: number;
  count: number;
  type: RoomType;
  capacity: number;
  monthlyRentPaisa: number;
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

// ---------- Dashboard ----------

export interface DashboardData {
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceBeds: number;
    occupancyPct: number;
  };
  dues: DuesSummary;
  thisMonth: {
    collectedPaisa: number;
    expectedPaisa: number;
  };
  recentPayments: Payment[];
  recentComplaints: Complaint[];
  collectionsChart: { month: string; amountPaisa: number }[]; // last 6 months
}

// ---------- Staff ----------

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  addedAt: string;
  lastActiveAt?: string;
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

export interface AdmissionFormField {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  builtIn: boolean;
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
