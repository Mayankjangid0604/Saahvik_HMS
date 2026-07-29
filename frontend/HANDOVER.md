# Saahvik Frontend — Handover Report

Generated 2026-07-29 by direct inspection of the code in `frontend/` plus a live run of the
dev server (`npm run dev`, Vite on port 5173) with every route visited in a browser.
Every claim below is traceable to a file that was actually read.

**The single most important fact:** the entire `src/api/*.api.ts` layer is a **mock**.
No function in it makes an HTTP request. `src/api/client.ts` defines a fully configured
axios instance (`apiClient`) with auth/org interceptors, but **nothing imports it** —
a grep for `apiClient` matches only `client.ts` itself and three comments saying
"Swap internals for apiClient calls later." There are therefore **no real HTTP method +
path strings anywhere in the codebase**. The contract a backend must satisfy is the
*function signatures and TypeScript types* of the `*.api.ts` modules, plus the base-URL,
header, and 401 conventions in `client.ts`. Section 3 reports exactly that and does not
invent paths.

---

## 1. What Was Built

Router: `src/main.tsx` (`createBrowserRouter`). Public routes at top level; all app routes
are children of a pathless route wrapped in `<ProtectedRoute><AppShell/></ProtectedRoute>`.

Verification method: dev server actually run; logged in through the mock login
(any email + any password except the magic string `"wrongpass"`); every route below
navigated to and its rendered body text inspected. Zero console errors were observed on
the final page state, and no route showed the router's error boundary.

| Route | Renders against mock data? | Notes |
|---|---|---|
| `/` | ✅ yes | Landing page. Contains the only `TODO` in src (brand wordmark, `LandingPage.tsx:66`). |
| `/login` | ✅ yes | Subtitle literally says "Any email and password works in this demo build." |
| `/signup` | ✅ yes | Mock signup returns a session immediately. |
| `/forgot-password` | ✅ yes | Mock always returns `{ sent: true }`. |
| `/2fa` | ✅ yes | Renders even when visited directly with no pending login (mock falls back to owner email). |
| `/dashboard` | ✅ yes | Full data: occupancy 20/38, dues ₹44,100, collections chart. |
| `/setup` | ✅ yes | Hostel setup form. |
| `/rooms` | ✅ yes | Table + floor/type filters, transfer/bulk-add/add-room dialogs. |
| `/residents` | ✅ yes | 20 active residents listed. |
| `/residents/new` | ✅ yes | Form is generated from the admission-form config. |
| `/residents/import` | ✅ yes | CSV import (client-side parse; template columns: name, phone, roomNumber, bedLabel, monthlyFeeRupees, joinDate). |
| `/residents/alumni` | ✅ yes | 4 alumni. |
| `/residents/:id` | ✅ yes (tested `res_1`) | Detail with payment/transfer/checkout actions. |
| `/payments` | ✅ yes | 68 mock payments. |
| `/payments/:id` | ✅ yes (tested `pay_1`) | Receipt PDF is generated client-side with jsPDF. |
| `/fees` | ✅ yes | 6 fee structures. |
| `/fees/assign` | ✅ yes | |
| `/fees/bulk-assign` | ✅ yes | |
| `/dues` | ✅ yes | Dues are **derived**, not stored (see §9). |
| `/invoices` | ✅ yes | 30 mock invoices. |
| `/invoices/:id` | ✅ yes (tested `inv_1`) | Invoice PDF via jsPDF. |
| `/deposits` | ✅ yes | |
| `/complaints` | ✅ yes | 8 tickets. |
| `/complaints/:id` | ✅ yes (tested `cmp_1`) | Timeline + attachments (file names only — see §7). |
| `/discounts` | ✅ yes | Apply-to-residents only increments a counter (see §9). |
| `/reports` | ✅ yes | 4 report cards. |
| `/reports/:type` | ✅ yes (all four tested: `occupancy`, `dues`, `residents`, `collections`) | PDF download via jsPDF. |
| `/staff` | ✅ yes | 2 of 3 slots. |
| `/staff/:id` | ✅ yes (tested `user_2`) | "Permissions" card is a **static hardcoded matrix**, read-only, no API behind it (`StaffDetailPage.tsx:74-92`). |
| `/notifications` | ✅ yes | |
| `/notifications/preferences` | ✅ yes | |
| `/settings` | ✅ yes | Org settings form. |
| `/settings/admission-form` | ✅ yes | 28 default fields, drag-order editor. |
| `/settings/subscription` | ✅ yes | Basic ₹999/mo, limits 3 staff / 100 residents / 1 hostel. |
| `/settings/export` | ✅ yes | Mock job; `downloadUrl` resolves to the placeholder string `"#mock-export.zip"` (`settings.api.ts:143`). |
| `/profile` | ✅ yes | |
| `/profile/password` | ✅ yes | |
| `/profile/2fa` | ✅ yes | Hardcoded TOTP secret `JBSWY3DPEHPK3PXP` (`auth.api.ts:82`). |
| `*` (404) | ✅ yes | `NotFoundPage` renders inside the AppShell. |

No route is a throwing stub. The placeholders are: data export (fake job + `#mock-export.zip`),
staff permissions (static display), landing-page wordmark (TODO), and — globally — the fact
that every "API" is in-memory.

## 2. Folder Structure

Real output of `find src -type f | sort` run in `frontend/`:

```
src/api/auth.api.ts
src/api/client.ts
src/api/complaint.api.ts
src/api/dashboard.api.ts
src/api/hostel.api.ts
src/api/mock/db.ts
src/api/notification.api.ts
src/api/payment.api.ts
src/api/report.api.ts
src/api/resident.api.ts
src/api/settings.api.ts
src/api/staff.api.ts
src/api/types.ts
src/components/layout/AppShell.tsx
src/components/layout/MobileDrawer.tsx
src/components/layout/ProtectedRoute.tsx
src/components/layout/Sidebar.tsx
src/components/layout/TopBar.tsx
src/components/layout/nav.ts
src/components/shared/BedPicker.tsx
src/components/shared/DateDisplay.tsx
src/components/shared/FileUpload.tsx
src/components/shared/MoneyDisplay.tsx
src/components/shared/PDFViewer.tsx
src/components/shared/ResidentPicker.tsx
src/components/shared/RoomPicker.tsx
src/components/shared/StatusBadge.tsx
src/components/ui/Avatar.tsx
src/components/ui/Badge.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Dropdown.tsx
src/components/ui/EmptyState.tsx
src/components/ui/FormField.tsx
src/components/ui/Input.tsx
src/components/ui/Modal.tsx
src/components/ui/PageHeader.tsx
src/components/ui/PasswordInput.tsx
src/components/ui/Select.tsx
src/components/ui/Skeleton.tsx
src/components/ui/Table.tsx
src/components/ui/Tabs.tsx
src/components/ui/Toast.tsx
src/features/NotFoundPage.tsx
src/features/auth/AuthContext.tsx
src/features/auth/AuthLayout.tsx
src/features/auth/ForgotPasswordPage.tsx
src/features/auth/LoginPage.tsx
src/features/auth/SignupPage.tsx
src/features/auth/TwoFactorPage.tsx
src/features/complaints/ComplaintDetailPage.tsx
src/features/complaints/ComplaintsPage.tsx
src/features/complaints/NewComplaintDialog.tsx
src/features/dashboard/DashboardPage.tsx
src/features/deposits/SecurityDepositsPage.tsx
src/features/discounts/DiscountsPage.tsx
src/features/dues/DuesPage.tsx
src/features/export/DataExportPage.tsx
src/features/fees/BulkFeeAssignPage.tsx
src/features/fees/FeeAssignmentPage.tsx
src/features/fees/FeeStructuresPage.tsx
src/features/hostel/HostelSettingsPage.tsx
src/features/hostel/HostelSetupPage.tsx
src/features/invoices/InvoiceDetailPage.tsx
src/features/invoices/InvoicesPage.tsx
src/features/notifications/NotificationPreferencesPage.tsx
src/features/notifications/NotificationsPage.tsx
src/features/payments/PaymentDetailPage.tsx
src/features/payments/PaymentsPage.tsx
src/features/payments/RecordPaymentDialog.tsx
src/features/payments/RefundDialog.tsx
src/features/profile/ChangePasswordPage.tsx
src/features/profile/ProfilePage.tsx
src/features/profile/TwoFactorSetupPage.tsx
src/features/reports/ReportDetailPage.tsx
src/features/reports/ReportsPage.tsx
src/features/residents/AddResidentPage.tsx
src/features/residents/AlumniPage.tsx
src/features/residents/BulkImportPage.tsx
src/features/residents/ResidentDetailPage.tsx
src/features/residents/ResidentsPage.tsx
src/features/rooms/AddRoomDialog.tsx
src/features/rooms/BulkAddDialog.tsx
src/features/rooms/RoomFeeDialog.tsx
src/features/rooms/RoomTransferDialog.tsx
src/features/rooms/RoomsPage.tsx
src/features/settings/AdmissionFormConfigPage.tsx
src/features/settings/OrgSettingsPage.tsx
src/features/settings/SubscriptionPage.tsx
src/features/staff/StaffDetailPage.tsx
src/features/staff/StaffPage.tsx
src/hooks/useAuth.ts
src/hooks/useDebounce.ts
src/hooks/useMediaQuery.ts
src/hooks/useModal.ts
src/hooks/usePagination.ts
src/hooks/useToast.ts
src/index.css
src/lib/cn.ts
src/lib/format.ts
src/lib/pdf.ts
src/lib/validators.ts
src/main.tsx
src/pages/Landing/LandingPage.css
src/pages/Landing/LandingPage.tsx
src/pages/Landing/icons.tsx
src/types/index.ts
src/vite-env.d.ts
```

Note: `src/features/hostel/HostelSettingsPage.tsx` exists on disk but is **not imported by
the router** in `main.tsx` (only `HostelSetupPage` is routed at `/setup`; org settings are
served by `features/settings/OrgSettingsPage.tsx` at `/settings`). It is dead-from-routing
code.

## 3. API Contract

**There are no HTTP calls.** Every exported function below is an `async` function that
reads/writes the in-memory arrays in `src/api/mock/db.ts` behind an artificial
`delay(ms)` (default 350 ms). File headers in `auth.api.ts`, `hostel.api.ts`, and
`resident.api.ts` say: *"Swap internals for apiClient calls when the backend lands."*
So there are no verbatim path strings, no axios `params` objects, and no per-endpoint
HTTP methods to copy. What IS pinned down in code:

- **Base URL convention** (`client.ts:15`): `import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"`.
- **The function signatures + types below are the contract** the feature code compiles
  against. A backend + thin fetch layer must reproduce these inputs/outputs exactly.

Everything below is extracted verbatim from the function signatures. "Params" =
the TypeScript parameter type; there is no serialization into query strings anywhere yet,
so query-parameter names are *the field names of these types* only by convention.

### Pagination — checked per-endpoint

One envelope is used by **every** paginated function, produced by `paginate()` in
`mock/db.ts:564-571`:

```ts
{ data: T[], total: number, page: number, pageSize: number }   // = Paginated<T>
```

This IS consistent across all paginated endpoints. Inconsistencies that do exist:

- **Default pageSize differs**: `paginate()` defaults to `10`; `listRooms` and
  `listNotifications` override with `pageSize ?? 20`; all other list functions fall
  through to 10 (`hostel.api.ts:44`, `notification.api.ts:15`).
- **Not everything list-shaped is paginated.** Plain arrays: `listAllRooms(): Room[]`,
  `listAllActiveResidents(): Resident[]`, `listFeeStructures(): FeeStructure[]`,
  `listDiscounts(): Discount[]`, all four report functions.
  Custom envelopes: `listStaff(): { staff, limit, used }` (`StaffList`),
  `getUnreadCount(): number` (a bare number).
- `page` is 1-based (`paginate` slices `(page-1)*pageSize`).

### auth.api.ts

| Function | Input | Returns |
|---|---|---|
| `login(input: LoginRequest)` | `{ email: string; password: string }` | `LoginResponse` = `{ requiresTwoFactor: boolean; token?: string; user?: User; org?: Org }` |
| `verifyTwoFactor(code: string)` | 6-digit string | `AuthSession` = `{ token: string; user: User; org: Org }` |
| `signup(input: SignupRequest)` | `{ name; email; phone; password; hostelName: string }` | `AuthSession` |
| `forgotPassword(email: string)` | — | `{ sent: boolean }` |
| `changePassword(input)` | `{ currentPassword: string; newPassword: string }` | `{ ok: boolean }` |
| `setupTwoFactor()` | — | `{ secret: string; otpauthUrl: string }` |
| `confirmTwoFactor(code: string)` | — | `{ enabled: boolean }` |
| `disableTwoFactor()` | — | `{ enabled: boolean }` |
| `updateProfile(input)` | `{ name: string; phone: string }` | `User` |

### hostel.api.ts

| Function | Input | Returns |
|---|---|---|
| `getHostel()` | — | `Org` |
| `updateHostel(input: Partial<Org>)` | partial org | `Org` |
| `listRooms(params: RoomListParams = {})` | `ListParams & { floor?: number; type?: RoomType \| "all" }` (interface declared in this file, not types.ts) | `Paginated<Room>` |
| `listAllRooms()` | — | `Room[]` (unpaginated, for pickers) |
| `createRoom(input: CreateRoomInput)` | see §4 | `Room` |
| `bulkAddRooms(input: BulkAddRoomsInput)` | see §4 | `{ created: number }` |
| `transferResident(input: RoomTransferInput)` | see §4 | `{ ok: boolean }` |
| `updateRoomFee(roomId: string, input: UpdateRoomFeeInput)` | see §4 | `Room` |

### resident.api.ts

| Function | Input | Returns |
|---|---|---|
| `listResidents(params: ResidentListParams = {})` | `ListParams & { status?: ResidentStatus \| "all"; roomId?: string }` | `Paginated<Resident>` — default excludes alumni unless `status` given |
| `listAlumni(params)` | same | `Paginated<Resident>` (delegates with `status:"alumni"`) |
| `listAllActiveResidents()` | — | `Resident[]` |
| `getResident(id: string)` | — | `Resident` |
| `createResident(input: CreateResidentInput)` | see §4 | `Resident` |
| `updateResident(id: string, input: Partial<Resident>)` | — | `Resident` |
| `checkoutResident(id: string, exitDate: string)` | — | `Resident` (frees bed, sets status `alumni`) |
| `importResidents(mappedRows: BulkImportRow[])` | see §4 — note `monthlyFeeRupees` is **rupees** here | `BulkImportResult` = `{ imported: number; skipped: number; errors: { row: number; message: string }[] }` |

### payment.api.ts

| Function | Input | Returns |
|---|---|---|
| `listPayments(params: PaymentListParams = {})` | `ListParams & { method?; type?; from?: string; to?: string }` | `Paginated<Payment>` |
| `getPayment(id: string)` | — | `Payment` |
| `recordPayment(input: RecordPaymentInput)` | see §4 | `Payment` |
| `refundPayment(input: RefundInput)` | `{ paymentId; amountPaisa; reason }` | `Payment` |
| `listFeeStructures()` | — | `FeeStructure[]` (NOT paginated) |
| `createFeeStructure(input: CreateFeeStructureInput)` | see §4 | `FeeStructure` |
| `deleteFeeStructure(id: string)` | — | `{ ok: boolean }` (errors if assignedCount > 0) |
| `listFeeAssignments(params: ListParams = {})` | — | `Paginated<FeeAssignment>` |
| `assignFee(input: AssignFeeInput)` | `{ feeStructureId; residentIds: string[]; startDate }` | `{ assigned: number }` |
| `removeFeeAssignment(id: string)` | — | `{ ok: boolean }` |
| `listDues(params: ListParams = {})` | — | `Paginated<DueEntry>` |
| `getDuesSummary()` | — | `DuesSummary` |
| `listInvoices(params: InvoiceListParams = {})` | `ListParams & { status?: InvoiceStatus \| "all" }` (declared in this file) | `Paginated<Invoice>` |
| `getInvoice(id: string)` | — | `Invoice` |
| `createInvoice(input)` | inline type `{ residentId: string; items: Invoice["items"]; dueDate: string }` | `Invoice` |
| `listDeposits(params: DepositListParams = {})` | `ListParams & { status?: DepositStatus \| "all" }` (declared in this file) | `Paginated<SecurityDeposit>` |
| `actOnDeposit(input: DepositActionInput)` | see §4 | `SecurityDeposit` |
| `listDiscounts()` | — | `Discount[]` (NOT paginated) |
| `createDiscount(input: CreateDiscountInput)` | see §4 | `Discount` |
| `toggleDiscount(id: string)` | — | `Discount` |
| `applyDiscount(input)` | inline type `{ discountId: string; residentIds: string[] }` | `{ applied: number }` |

### complaint.api.ts

| Function | Input | Returns |
|---|---|---|
| `listComplaints(params: ComplaintListParams = {})` | `ListParams & { status?; category? }` | `Paginated<Complaint>` |
| `getComplaint(id: string)` | — | `Complaint` |
| `createComplaint(input: CreateComplaintInput)` | see §4 — attachments are **metadata only** `{ fileName, fileType }[]` | `Complaint` |
| `updateComplaintStatus(id: string, status: ComplaintStatus, note?: string)` | positional args | `Complaint` |

### dashboard.api.ts

| Function | Input | Returns |
|---|---|---|
| `getDashboard()` | — | `DashboardData` (see §4) |

### notification.api.ts

| Function | Input | Returns |
|---|---|---|
| `listNotifications(params: NotificationListParams = {})` | `ListParams & { onlyUnread?: boolean }` (declared in this file) | `Paginated<AppNotification>` |
| `getUnreadCount()` | — | `number` (bare) |
| `markNotificationRead(id: string)` | — | `{ ok: boolean }` |
| `markAllNotificationsRead()` | — | `{ ok: boolean }` |

### report.api.ts

| Function | Input | Returns |
|---|---|---|
| `getOccupancyReport(filters: ReportFilters = {})` | `{ from?; to?; month? }` — filters currently **ignored** (`_filters`) | `OccupancyReportRow[]` |
| `getDuesReport(filters: ReportFilters = {})` | ignored | `DueEntry[]` |
| `getResidentListReport(filters: ReportFilters = {})` | `from`/`to` filter joinDate | `Resident[]` |
| `getMonthlyCollectionReport(filters: ReportFilters = {})` | `from`/`to` filter month | `CollectionReportRow[]` |

### settings.api.ts

| Function | Input | Returns |
|---|---|---|
| `getOrgSettings()` | — | `Org` |
| `updateOrgSettings(input: Partial<Org>)` | — | `Org` |
| `getAdmissionFormConfig()` | — | `AdmissionFormConfig` = `{ fields: AdmissionFormField[] }` |
| `updateAdmissionFormConfig(input: AdmissionFormConfig)` | — | `AdmissionFormConfig` |
| `resetAdmissionFormConfig()` | — | `AdmissionFormConfig` |
| `getSubscription()` | — | `Subscription` |
| `getNotificationPreferences()` | — | `NotificationPreferences` |
| `updateNotificationPreferences(input: NotificationPreferences)` | — | `NotificationPreferences` |
| `requestExport()` | — | `ExportJob` |
| `getExportStatus()` | — | `ExportJob \| null` |

### staff.api.ts

| Function | Input | Returns |
|---|---|---|
| `listStaff()` | — | `StaffList` = `{ staff: StaffMember[]; limit: number; used: number }` — NOT the standard envelope |
| `getStaffMember(id: string)` | — | `StaffMember` |
| `addStaff(input: AddStaffInput)` | `{ name; email; phone }` | `StaffMember` |
| `removeStaff(id: string)` | — | `{ ok: boolean }` |

### Param-type ambiguity worth flagging

Several list-params interfaces live in the `*.api.ts` files rather than `types.ts`:
`RoomListParams` (hostel.api.ts:14), `InvoiceListParams` (payment.api.ts:240),
`DepositListParams` (payment.api.ts:293), `NotificationListParams` (notification.api.ts:5).
`types.ts` alone is therefore **not** the complete contract — these four must be included.

## 4. All TypeScript Types

API-relevant types live in **`src/api/types.ts`** (pasted unmodified below).
`src/types/index.ts` is only `export * from "@/api/types";`. The four list-param
interfaces named at the end of §3 live in the `*.api.ts` files. `UploadedFile` (a purely
client-side shape, `{ file: File; previewUrl?: string }`) lives in
`src/components/shared/FileUpload.tsx`.

```ts
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
```

## 5. Auth Assumptions

Sources read: `src/features/auth/AuthContext.tsx`, `src/features/auth/LoginPage.tsx`,
`src/api/auth.api.ts`, `src/api/client.ts`.

- **Login response shape** (exact field names, `types.ts:58-64`):
  `{ requiresTwoFactor: boolean, token?: string, user?: User, org?: Org }`.
  When `requiresTwoFactor` is true the other three fields are absent and the UI navigates
  to `/2fa`; `verifyTwoFactor` then returns the full `{ token, user, org }` session.
  `LoginPage.tsx:42` consumes it with non-null assertions: `login({ token: res.token!, user: res.user!, org: res.org! })`.
- **Where orgId comes from**: the **response body `org` object only**. The whole `Org` is
  stored as JSON in localStorage; `AuthContext` exposes `orgId: org?.id ?? null`
  (`AuthContext.tsx:73`). The JWT is **never decoded** anywhere in src (grep for
  atob/decode/jwt confirms; the mock builds a fake JWT but nothing reads its payload).
- **Headers sent on requests** (`client.ts:20-34`):
  - `Authorization: Bearer <token>` (token read raw from localStorage)
  - `X-Org-Id: <org.id>` (parsed from the stored org JSON; skipped silently if corrupt)
  Note: since no code calls `apiClient` yet, these interceptors are configured but
  currently never fire.
- **On 401** (`client.ts:37-50`): response interceptor removes all three localStorage keys
  and does a hard redirect `window.location.href = "/login"` unless the current path
  already starts with `/login`. **No retry, no token refresh, no refresh-token concept
  anywhere.** The error is still rejected onward.
- **localStorage keys** (exact, `client.ts:3-5`): `saahvik.token` (raw JWT string),
  `saahvik.user` (JSON `User`), `saahvik.org` (JSON `Org`). One additional non-auth key:
  `saahvik.draft.add-resident` (add-resident form draft, `AddResidentPage.tsx:25`).
- **Auth gating**: `ProtectedRoute` checks only `isAuthenticated = !!token` — presence of
  the string, no expiry validation client-side.

## 6. Money Handling

Convention stated at the top of both `types.ts` and `lib/format.ts`: **all money is
integer paisa**; `lib/format.ts` is the only conversion point (`formatMoney`,
`rupeesToPaisa`, `paisaToRupees`).

Fields carrying money, all suffixed `Paisa` and all genuinely paisa in the mock data:

- `Room.monthlyRentPaisa`, `Room.fixedFeeAmountPaisa` — mock 380000–850000 (₹3,800–₹8,500/mo, plausible hostel rents; as rupees they'd be absurd)
- `Resident.monthlyFeePaisa`, `depositPaisa` (1000000 = ₹10,000), `duesPaisa`
- `Payment.amountPaisa`, `refundedPaisa`; `RecordPaymentInput.amountPaisa`; `RefundInput.amountPaisa`
- `FeeStructure.amountPaisa`, `FeeAssignment.amountPaisa`
- `DueEntry.duesPaisa`, `DuesSummary.totalDuesPaisa`
- `InvoiceItem.amountPaisa`, `Invoice.totalPaisa`, `Invoice.paidPaisa`
- `SecurityDeposit.amountPaisa`, `refundedPaisa`; `DepositActionInput.amountPaisa`
- `DashboardData.thisMonth.collectedPaisa/expectedPaisa`, `collectionsChart[].amountPaisa`
- `Subscription.pricePaisaPerMonth` (99900 = ₹999, with comment)
- `CollectionReportRow.rentPaisa/depositPaisa/otherPaisa/totalPaisa`

Mock data spot-check confirms paisa: seeds comment `rent: number; // paisa`; fine of
50000 renders as ₹500; deposit note "₹3,000 withheld" pairs with `refunded = 700000` of a
1000000 deposit. The UI (verified live) shows ₹5,500 for 550000. Consistent.

Fields that are **not** paisa or are ambiguous by design:

1. **`Discount.value`** — dual-meaning number: *paisa* when `kind === "flat"`,
   *percentage points* when `kind === "percent"` (doc comment `types.ts:427`). Mock flat
   value 50000 renders "₹500 off". The unit depends on a sibling field — flag for backend.
2. **`BulkImportRow.monthlyFeeRupees`** — the only rupee-denominated API field (CSV
   import). Converted with `Math.round(row.monthlyFeeRupees * 100)` at `resident.api.ts:149`.
3. **`AppNotification.body`** — contains pre-formatted rupee strings as free text
   ("paid ₹5,500 rent"); no numeric money field on notifications.
4. One internal inconsistency in the notification seed data, not a type issue: `ntf_3`
   says "Dues crossed ₹15,000 … (₹14,100)" while Nikhil Rao's computed dues are 3 ×
   450000 = ₹13,500 (`mock/db.ts:554` vs seeds) — mock copy drift, shows the body text
   is fabricated rather than derived.
5. `Room.monthlyRentPaisa` vs `fixedFeeAmountPaisa` overlap: for fixed-fee rooms both are
   set to the same value; for variable rooms created via `createRoom`, `monthlyRentPaisa`
   is set to **0** (`hostel.api.ts:65`) even though seeded variable rooms have real rents.
   Semantics of `monthlyRentPaisa` for variable rooms is therefore inconsistent between
   seeded and user-created rooms.

## 7. File Upload Assumptions

Sources read: `src/components/shared/FileUpload.tsx`, `NewComplaintDialog.tsx`,
`AddResidentPage.tsx`, `ComplaintDetailPage.tsx`, `PDFViewer.tsx`.

- **There is no upload API function at all.** No endpoint, no FormData, no expected
  upload-response shape exists in code. `FileUpload.tsx:12-13` comment: *"Files stay in
  memory (mock mode) — the real API will get FormData later."* The component's value type
  is `UploadedFile = { file: File; previewUrl?: string }`, where `previewUrl` is a local
  `URL.createObjectURL` blob for images only.
- **What the frontend currently sends "upstream"**:
  - Complaints: `CreateComplaintInput.attachments` is metadata only —
    `{ fileName: string; fileType: string }[]` (`NewComplaintDialog.tsx:48`). The mock
    stores `ComplaintAttachment` with `url: ""`.
  - Residents: `AddResidentPage.tsx:162` sets `photoUrl: files.photo?.[0]?.previewUrl` —
    i.e. a **session-local blob URL** is persisted as the resident's `photoUrl`. It dies on
    reload; the mock's seeded residents have no `photoUrl` at all.
- **How files are displayed afterward**: there is **no `useAuthImage` hook or any
  authenticated file-fetch mechanism** (grep confirms nothing named like it exists).
  - Resident photos: `<Avatar src={resident.photoUrl}>` — a plain `<img src>` of whatever
    string is in `photoUrl`. So the implied contract is that `photoUrl` must be a
    **directly loadable URL** (public or cookie/query-auth), because no Authorization
    header can be attached to an `<img>` tag as written.
  - Complaint attachments: `ComplaintDetailPage.tsx:91-99` renders **file names only**
    (paperclip + `a.fileName`); the `ComplaintAttachment.url` field exists in the type but
    is never read for display or download anywhere.
  - `PDFViewer` is unrelated to server files — it displays **client-generated jsPDF blobs**
    (receipts, invoices, reports) via blob URL in an iframe.
- Accepted types default: `.jpg,.jpeg,.png,.pdf,.doc,.docx`; no size limit enforced in code.

## 8. Deviations From Original Spec

Caveat first: the original build prompts are **not in the repository**, so a line-by-line
diff against them is not possible from code alone. Per the project's own memory/handoff
notes, the prompts described a fictional Nx monorepo/pilot setup. What can be stated
factually from the repo:

1. **Not an Nx monorepo.** `frontend/` is a plain Vite + React 19 app (`vite.config.ts`,
   `package.json` — no nx.json, no workspace config anywhere in the repo root).
2. **No real API integration was built**, despite `client.ts` being production-shaped.
   Evidence: grep shows `apiClient` referenced only in `client.ts` itself; every
   `*.api.ts` imports from `./mock/db` instead.
3. **`HostelSettingsPage.tsx` was superseded but not deleted** — org settings shipped as
   `features/settings/OrgSettingsPage.tsx` at `/settings`; the hostel-feature version is
   unrouted (`main.tsx` imports only `HostelSetupPage` from that folder).
4. **Admission form is config-driven, not a fixed form**: `/residents/new` renders from
   `getAdmissionFormConfig()` (28 seeded fields modeled on the "Sunrise Hostel paper
   form" — `settings.api.ts:30-59`), and `AddResidentPage.tsx:140-164` maps those free-form
   answers onto the fixed `Resident` fields with fallbacks (e.g. `guardianName:
   v.localGuardianName || v.fatherName || ""`, `idType` hardcoded `"aadhaar"`,
   `occupation` hardcoded `"student"`). All answers are also kept verbatim in
   `admissionData: Record<string, string>`.
5. **PDFs (receipts, invoices, 4 reports) are generated client-side with jsPDF**
   (`lib/pdf.ts`, `package.json` dependency `jspdf`) — no server rendering assumed.
6. **Room-level fee locking exists** (`feeMode: "fixed" | "variable"` +
   `fixedFeeAmountPaisa`): fixed rooms overwrite residents' `monthlyFeePaisa` on create,
   transfer, and room-fee update (`resident.api.ts:63-66`, `hostel.api.ts:137-142,152-161`).
   This is business logic currently implemented in the mock that the backend must own.

## 9. Known Gaps

Grep results: `TODO|FIXME|HACK` → exactly one TODO (`LandingPage.tsx:66`, brand wordmark).
`hardcoded` → zero matches. `mock` → the entire `src/api` layer self-identifies as mock.
Gaps that will need rework against a real API:

- **Everything in `src/api/*.api.ts` is in-memory** (`src/api/mock/db.ts`): data resets on
  reload, mutations are session-only.
- **Magic strings in mock auth**: password `"wrongpass"` triggers the failure path
  (login and change-password); an email containing `"+2fa"` triggers the 2FA path
  (`auth.api.ts:21-27,74`). Any other credentials succeed — the login page says so in its UI.
- **`recordedByName` / `byName` hardcoded to `"Mayank Jangid"`** in `recordPayment`
  (`payment.api.ts:84`) and complaint timeline events (`complaint.api.ts:55,79`) — the real
  backend must derive the acting user from the token.
- **Dues are derived, not stored**: no dues table/endpoint of record. `resident.duesPaisa`
  is the source; `buildDues()` (`payment.api.ts:193-213`) *fabricates* `monthsOverdue`
  (dues ÷ monthly fee, rounded) and `oldestDueDate` (now minus that many months, day 10).
  Recording a rent payment simply decrements `duesPaisa` (`payment.api.ts:87-89`). No link
  between payments/invoices and dues beyond that.
- **Invoices have no lifecycle**: `createInvoice` exists, but there is no update, cancel,
  or mark-paid endpoint; nothing connects a `Payment` to an `Invoice`. `partially_paid`
  and `cancelled` statuses are defined but unreachable through the API surface.
- **`applyDiscount` only increments `appliedCount`** (`payment.api.ts:364-373`); nothing
  records *which* residents got it and no fee/invoice amount ever changes.
- **Data export is fake**: `requestExport` flips to `ready` after a 4 s `setTimeout` with
  `downloadUrl: "#mock-export.zip"` (`settings.api.ts:140-145`).
- **2FA setup uses a fixed secret** `JBSWY3DPEHPK3PXP` and `verifyTwoFactor` accepts any
  6-digit code (`auth.api.ts:37-45,80-87`).
- **Report filters partially ignored**: occupancy and dues reports take `_filters` and
  discard them (`report.api.ts:12,28`).
- **Staff permissions UI is static** — a hardcoded allowed/denied matrix, read-only, no
  API (`StaffDetailPage.tsx`).
- **`ResidentStatus` includes `"notice"`** and the residents list has an "On notice"
  filter, but no mock resident ever has that status and no API sets it — a status with no
  writer.
- **File upload/storage entirely missing** (see §7): resident `photoUrl` persists a blob
  URL; complaint attachments persist name+type with `url: ""`.
- **Aadhaar numbers in mock data are masked** (`"XXXX XXXX 1234"`) — fine for demo, but
  means `idNumber` formats in mock data don't exercise real validation.
- Unread notification count endpoint returns a bare `number`, not an object.

## 10. Environment & Config

Full contents of `frontend/.env.example` (one line):

```
VITE_API_URL=http://localhost:3000/api/v1
```

Also present (not requested but exists): `frontend/.env.production`:

```
VITE_API_URL=https://api.saahvik.com/api/v1
```

- **Dev server port**: 5173 (`vite.config.ts` → `server: { port: 5173 }`). No dev proxy is
  configured — the axios client would call the API origin directly, so **CORS from
  `http://localhost:5173` to `http://localhost:3000` must be allowed by the backend**,
  including the custom `X-Org-Id` request header and `Authorization` (both trigger
  preflight). `apiClient` does not set `withCredentials`; auth is header-based, no cookies
  assumed. Request timeout is 15 000 ms (`client.ts:16`).
- Path alias `@` → `src` (`vite.config.ts:9-11`).
- Build: `tsc -b && vite build`. React 19, react-router-dom 7 (`createBrowserRouter` —
  the server must serve `index.html` for all paths in production), TanStack Query 5
  (`retry: 1`, `staleTime: 30s`, no refetch on window focus — `main.tsx:52-56`).
