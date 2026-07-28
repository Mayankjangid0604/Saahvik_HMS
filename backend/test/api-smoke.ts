/**
 * End-to-end smoke test against a RUNNING API (set API_URL, default
 * http://localhost:3000/api/v1). Exercises the business rules the frozen
 * spec cares about and prints PASS/FAIL per check.
 * Run: npx tsx test/api-smoke.ts
 */
import { authenticator } from "otplib";

const BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
let failures = 0;

function check(name: string, ok: boolean, detail?: unknown): void {
  if (ok) console.log(`PASS  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`, detail ?? "");
  }
}

interface Envelope<T = any> {
  success: boolean;
  apiVersion: string;
  data?: T;
  error?: { code: string; message: string; [k: string]: unknown };
}

async function api<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; json: Envelope<T> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      // Deliberately hostile X-Org-Id — the backend must ignore it.
      "X-Org-Id": "some-other-org",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  return { status: res.status, json };
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const email = `owner${stamp}@test.dev`;

  // ---- signup ----
  const signup = await api("POST", "/auth/signup", {
    body: {
      name: "Test Owner",
      email,
      phone: "9829000000",
      password: "supersecret1",
      hostelName: "Smoke Test Hostel",
    },
  });
  check("signup returns wrapped envelope", signup.json.success === true && signup.json.apiVersion === "v1");
  const token = signup.json.data!.token as string;
  const orgId = signup.json.data!.org.id as string;
  check("signup issues token + org", Boolean(token && orgId));

  // ---- unauthenticated requests are rejected ----
  const noAuth = await api("GET", "/rooms");
  check("JWT guard blocks missing token", noAuth.status === 401);

  // ---- admission form seeded ----
  const form = await api("GET", "/settings/admission-form-fields", { token });
  check("28 default admission fields seeded", form.json.data!.fields.length === 28, form.json.data!.fields.length);

  // ---- rooms ----
  const room = await api("POST", "/rooms", {
    token,
    body: { number: "Room 101", floor: 1, type: "double", capacity: 2, feeMode: "fixed", fixedFeeAmountPaisa: 550000 },
  });
  check("create fixed-fee room", room.status === 201 && room.json.data!.beds.length === 2, room.json);
  const roomId = room.json.data!.id as string;
  const bedA = room.json.data!.beds[0].id as string;

  // ---- fee lock on resident create ----
  const badFee = await api("POST", "/residents", {
    token,
    body: { name: "Wrong Fee", phone: "9000000001", joinDate: "2026-07-01", roomId, bedId: bedA, monthlyFeePaisa: 400000 },
  });
  check(
    "FEE_LOCKED_BY_ROOM enforced",
    badFee.status === 422 && badFee.json.error?.code === "FEE_LOCKED_BY_ROOM" && badFee.json.error?.expectedPaisa === 550000,
    badFee.json,
  );

  // ---- resident create with matching fee + admission data ----
  const resident = await api("POST", "/residents", {
    token,
    body: {
      name: "Rahul Sharma",
      phone: "9000000002",
      joinDate: "2026-07-01",
      roomId,
      bedId: bedA,
      monthlyFeePaisa: 550000,
      depositPaisa: 1000000,
      admissionData: { candidateName: "Rahul Sharma", fatherName: "S. Sharma", contactNo: "9000000002", aadharNo: "123412341234" },
    },
  });
  check("resident created + bed occupied", resident.status === 201 && resident.json.data!.bedLabel === "A", resident.json);
  const residentId = resident.json.data!.id as string;

  const badAadhaar = await api("PUT", `/residents/${residentId}`, {
    token,
    body: { admissionData: { aadharNo: "12" } },
  });
  check("aadhaar format rejected", badAadhaar.status === 422, badAadhaar.json);

  const unknownField = await api("PUT", `/residents/${residentId}`, {
    token,
    body: { admissionData: { notAField: "x" } },
  });
  check("unknown admission key rejected", unknownField.json.error?.code === "UNKNOWN_ADMISSION_FIELD", unknownField.json);

  // ---- deposit auto-created ----
  const deposits = await api("GET", "/deposits", { token });
  check("deposit record auto-created", deposits.json.data!.total === 1 && deposits.json.data!.data[0].amountPaisa === 1000000, deposits.json);

  // ---- payment + receipt + money-as-integer ----
  const payment = await api("POST", "/payments", {
    token,
    body: { residentId, amountPaisa: 550000, method: "upi", type: "rent", paidAt: new Date().toISOString(), periodMonth: "2026-07" },
  });
  const p = payment.json.data!;
  check("payment recorded with RCP number", /^RCP-\d{4}-0001$/.test(p.receiptNo), p);
  check("money fields are integers", Number.isInteger(p.amountPaisa) && Number.isInteger(p.refundedPaisa));

  const pdf = await fetch(`${BASE}/payments/${p.id}/receipt.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(
    "receipt PDF streams as application/pdf",
    pdf.status === 200 && (pdf.headers.get("content-type") ?? "").includes("application/pdf"),
    pdf.status,
  );

  // ---- invoices ----
  const inv = await api("POST", "/invoices", {
    token,
    body: { residentId, items: [{ description: "Rent 2026-07", amountPaisa: 550000 }], dueDate: "2026-08-10" },
  });
  check("invoice numbered INV-YYYY-0001", /^INV-\d{4}-0001$/.test(inv.json.data!.number), inv.json);

  // ---- staff cap ----
  const s1 = await api("POST", "/staff", { token, body: { name: "S1", email: `s1${stamp}@t.dev`, phone: "1" } });
  const s2 = await api("POST", "/staff", { token, body: { name: "S2", email: `s2${stamp}@t.dev`, phone: "2" } });
  const s3 = await api("POST", "/staff", { token, body: { name: "S3", email: `s3${stamp}@t.dev`, phone: "3" } });
  check("staff #2 and #3 (owner+2) allowed", s1.status === 201 && s2.status === 201);
  check(
    "staff cap blocks 4th login with STAFF_CAP_EXCEEDED",
    s3.status === 422 && s3.json.error?.code === "STAFF_CAP_EXCEEDED" && s3.json.error?.limit === 3,
    s3.json,
  );
  check("temp password returned once", typeof s1.json.data!.tempPassword === "string");

  // ---- staff login + role guard ----
  const staffLogin = await api("POST", "/auth/login", {
    body: { email: `s1${stamp}@t.dev`, password: s1.json.data!.tempPassword },
  });
  check("staff can log in", staffLogin.json.data?.token != null, staffLogin.json);
  const staffToken = staffLogin.json.data!.token as string;

  const staffReports = await api("GET", "/reports/occupancy", { token: staffToken });
  check("reports blocked for staff (403)", staffReports.status === 403, staffReports.status);
  const staffDelete = await api("DELETE", `/residents/${residentId}`, { token: staffToken });
  check("resident delete blocked for staff (403)", staffDelete.status === 403, staffDelete.status);
  const staffPayment = await api("POST", "/payments", {
    token: staffToken,
    body: { residentId, amountPaisa: 1000, method: "cash", type: "fine", paidAt: new Date().toISOString() },
  });
  check("staff CAN record payments", staffPayment.status === 201, staffPayment.json);

  // ---- complaints + notifications ----
  const complaint = await api("POST", "/complaints", {
    token: staffToken,
    body: { title: "Fan broken", description: "Ceiling fan not working", category: "electrical", priority: "high", residentId },
  });
  check("complaint CMP-0001 created", complaint.json.data?.ticketNo === "CMP-0001", complaint.json);
  const upd = await api("PUT", `/complaints/${complaint.json.data!.id}`, {
    token,
    body: { status: "resolved", note: "Fixed" },
  });
  check("complaint timeline grows on status change", upd.json.data!.timeline.length === 2, upd.json);

  const staffNotifs = await api("GET", "/notifications", { token: staffToken });
  check(
    "staff notified of resolution (not the actor)",
    staffNotifs.json.data!.data.some((n: any) => n.kind === "complaint"),
    staffNotifs.json.data,
  );

  // ---- reports (owner) ----
  const occ = await api("GET", "/reports/occupancy", { token });
  check("occupancy report JSON", occ.json.data?.[0]?.occupied === 1, occ.json);
  const reportPdf = await fetch(`${BASE}/reports/dues?format=pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check("dues report PDF streams", (reportPdf.headers.get("content-type") ?? "").includes("pdf"));

  // ---- audit log ----
  const audit = await api("GET", "/audit-log?limit=100", { token });
  const actions = new Set((audit.json.data!.data as any[]).map((e) => e.action));
  const expected = [
    "created_organization",
    "created_room",
    "added_resident",
    "recorded_payment",
    "created_invoice",
    "added_staff",
    "created_complaint",
    "updated_complaint",
  ];
  check(
    "audit log captured every mutating action",
    expected.every((a) => actions.has(a)),
    [...actions],
  );
  const staffAudit = await api("GET", "/audit-log", { token: staffToken });
  check("audit log blocked for staff", staffAudit.status === 403);

  // ---- tenant isolation: second org cannot see first org's data ----
  const org2 = await api("POST", "/auth/signup", {
    body: { name: "Other", email: `other${stamp}@t.dev`, phone: "1", password: "supersecret1", hostelName: "Other Hostel" },
  });
  const t2 = org2.json.data!.token as string;
  const crossRead = await api("GET", `/residents/${residentId}`, { token: t2 });
  check("cross-org resident read → 404", crossRead.status === 404, crossRead.status);
  const org2Rooms = await api("GET", "/rooms", { token: t2 });
  check("X-Org-Id header ignored (org2 sees no rooms)", org2Rooms.json.data!.total === 0, org2Rooms.json);

  // ---- 2FA full loop ----
  const setup = await api("GET", "/auth/2fa/setup", { token });
  check("2fa setup returns qr + secret", Boolean(setup.json.data?.qrCodeDataUrl && setup.json.data?.secret), setup.json);
  const secret = setup.json.data!.secret as string;
  const enable = await api("POST", "/auth/2fa/verify-setup", {
    token,
    body: { token: authenticator.generate(secret) },
  });
  check("2fa enabled with 8 backup codes", enable.json.data?.backupCodes?.length === 8, enable.json);

  const relogin = await api("POST", "/auth/login", { body: { email, password: "supersecret1" } });
  check(
    "login now demands 2FA + tempSessionId",
    relogin.json.data?.requiresTwoFactor === true && Boolean(relogin.json.data?.tempSessionId),
    relogin.json,
  );
  const bad2fa = await api("POST", "/auth/2fa/verify", {
    body: { tempSessionId: relogin.json.data!.tempSessionId, token: "000000" },
  });
  check("wrong TOTP rejected", bad2fa.status === 401);
  const good2fa = await api("POST", "/auth/2fa/verify", {
    body: { tempSessionId: relogin.json.data!.tempSessionId, token: authenticator.generate(secret) },
  });
  check("correct TOTP issues full JWT", Boolean(good2fa.json.data?.token), good2fa.json);
  const backup2fa = await api("POST", "/auth/login", { body: { email, password: "supersecret1" } });
  const viaBackup = await api("POST", "/auth/2fa/verify", {
    body: {
      tempSessionId: backup2fa.json.data!.tempSessionId,
      token: enable.json.data!.backupCodes[0],
    },
  });
  check("backup code works once", Boolean(viaBackup.json.data?.token), viaBackup.json);

  // ---- password change revokes old tokens ----
  const newOwnerToken = good2fa.json.data!.token as string;
  const change = await api("POST", "/auth/change-password", {
    token: newOwnerToken,
    body: { currentPassword: "supersecret1", newPassword: "evenmoresecret2" },
  });
  check("password change returns fresh token", Boolean(change.json.data?.token), change.json);
  const revoked = await api("GET", "/rooms", { token: newOwnerToken });
  check("old token revoked after password change", revoked.status === 401, revoked.status);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
