/**
 * Email-OTP round trip against a RUNNING API (set API_URL, default
 * http://localhost:3000/api/v1). Covers send → verify, wrong-code attempt
 * counting, lockout, expiry, and that signup stamps emailVerified while
 * leaving phoneVerified false.
 *
 * Reads the issued code straight from the DB (it is only ever stored hashed,
 * so the test re-hashes candidate codes to find it) — no mail inbox needed.
 * Run: npx tsx test/email-otp.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const prisma = new PrismaClient();
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
  data?: T;
  error?: { code: string; message: string; [k: string]: unknown };
}

async function api<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Envelope<T> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Envelope<T> };
}

/**
 * The DB holds only the SHA-256 of the code, so recover it by hashing all
 * 10^6 candidates. Test-only — this is exactly the brute force the 5-attempt
 * lockout exists to prevent over the wire.
 */
async function recoverCode(email: string): Promise<string> {
  const row = await prisma.emailVerification.findUnique({ where: { email } });
  if (!row?.codeHash) throw new Error(`no pending code for ${email}`);
  for (let i = 0; i < 1_000_000; i++) {
    const candidate = String(i).padStart(6, "0");
    if (createHash("sha256").update(candidate).digest("hex") === row.codeHash) return candidate;
  }
  throw new Error("code not recoverable — hashing changed?");
}

/** Clears the per-address 60s cooldown so the test can send back to back. */
async function clearCooldown(email: string): Promise<void> {
  await prisma.emailVerification.updateMany({
    where: { email },
    data: { lastSentAt: new Date(Date.now() - 10 * 60 * 1000) },
  });
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const email = `otp.happy.${stamp}@saahvik.test`;
  const lockEmail = `otp.lock.${stamp}@saahvik.test`;
  const expEmail = `otp.expired.${stamp}@saahvik.test`;

  // ---------- 1. send ----------
  const sent = await api("POST", "/auth/email-otp/send", { email });
  check("send returns 201/200", sent.status < 300, sent);
  check("send reports cooldown", sent.json.data?.cooldownSeconds === 60, sent.json.data);

  const stored = await prisma.emailVerification.findUnique({ where: { email } });
  check("code stored hashed, not raw", !!stored?.codeHash && stored.codeHash.length === 64);
  check("expiry ~10min out", !!stored?.expiresAt && stored.expiresAt.getTime() > Date.now() + 8 * 60_000);

  // ---------- 2. cooldown ----------
  const tooSoon = await api("POST", "/auth/email-otp/send", { email });
  check("second send inside 60s is rejected", tooSoon.status === 429, tooSoon.status);
  check("cooldown error code", tooSoon.json.error?.code === "OTP_COOLDOWN", tooSoon.json.error);

  // ---------- 3. wrong code increments attempts ----------
  const code = await recoverCode(email);
  const wrong = code === "000000" ? "111111" : "000000";
  const bad = await api("POST", "/auth/email-otp/verify", { email, code: wrong });
  check("wrong code rejected", bad.status === 400, bad.status);
  check("wrong code reports attempts left", bad.json.error?.attemptsRemaining === 4, bad.json.error);
  const afterBad = await prisma.emailVerification.findUnique({ where: { email } });
  check("attempts incremented to 1", afterBad?.attempts === 1, afterBad?.attempts);

  // ---------- 4. correct code succeeds ----------
  const good = await api("POST", "/auth/email-otp/verify", { email, code });
  check("correct code verifies", good.status < 300 && good.json.data?.verified === true, good);
  const afterGood = await prisma.emailVerification.findUnique({ where: { email } });
  check("verifiedAt set", !!afterGood?.verifiedAt);
  check("code burned after use", afterGood?.codeHash === null, afterGood?.codeHash);

  const replay = await api("POST", "/auth/email-otp/verify", { email, code });
  check("used code cannot be replayed", replay.status === 400, replay.status);

  // ---------- 5. lockout after 5 wrong attempts ----------
  await api("POST", "/auth/email-otp/send", { email: lockEmail });
  const lockCode = await recoverCode(lockEmail);
  const lockWrong = lockCode === "000000" ? "111111" : "000000";
  const codes: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const r = await api("POST", "/auth/email-otp/verify", { email: lockEmail, code: lockWrong });
    codes.push(`${i}:${r.status}/${r.json.error?.code}`);
  }
  check("attempts 1-4 rejected as OTP_INVALID", codes.slice(0, 4).every((c) => c.endsWith("OTP_INVALID")), codes);
  check("5th attempt exhausts the budget (OTP_LOCKED)", codes[4].endsWith("OTP_LOCKED"), codes);
  check("6th attempt locked out with 429", codes[5] === "6:429/OTP_LOCKED", codes);
  const lockedRow = await prisma.emailVerification.findUnique({ where: { email: lockEmail } });
  check("correct code refused once locked", (await api("POST", "/auth/email-otp/verify", { email: lockEmail, code: lockCode })).status === 429, lockedRow?.attempts);

  // ---------- 6. expired code ----------
  await api("POST", "/auth/email-otp/send", { email: expEmail });
  const expCode = await recoverCode(expEmail);
  await prisma.emailVerification.update({
    where: { email: expEmail },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expired = await api("POST", "/auth/email-otp/verify", { email: expEmail, code: expCode });
  check("expired code rejected", expired.status === 400, expired.status);
  check("expired error code", expired.json.error?.code === "OTP_EXPIRED", expired.json.error);

  // ---------- 7. verify before any send ----------
  const never = await api("POST", "/auth/email-otp/verify", {
    email: `otp.none.${stamp}@saahvik.test`,
    code: "123456",
  });
  check("verify without send rejected", never.json.error?.code === "OTP_NOT_SENT", never.json.error);

  // ---------- 8. malformed input ----------
  const badCode = await api("POST", "/auth/email-otp/verify", { email, code: "12ab" });
  check("non-numeric code rejected by DTO", badCode.status === 400, badCode.status);
  const badEmail = await api("POST", "/auth/email-otp/send", { email: "not-an-email" });
  check("invalid email rejected by DTO", badEmail.status === 400, badEmail.status);

  // ---------- 9. signup consumes the verification ----------
  const signupEmail = `otp.signup.${stamp}@saahvik.test`;
  await api("POST", "/auth/email-otp/send", { email: signupEmail });
  const signupCode = await recoverCode(signupEmail);
  await api("POST", "/auth/email-otp/verify", { email: signupEmail, code: signupCode });
  const signup = await api("POST", "/auth/signup", {
    name: "OTP Tester",
    email: signupEmail,
    phone: "9829012345",
    hostelName: `OTP Test Hostel ${stamp}`,
    password: "correct-horse-8",
  });
  check("signup succeeds after verification", signup.status < 300, signup.json.error);
  const owner = await prisma.owner.findUnique({ where: { email: signupEmail } });
  check("Owner.emailVerified true", owner?.emailVerified === true, owner?.emailVerified);
  check("Owner.phoneVerified stays false", owner?.phoneVerified === false, owner?.phoneVerified);
  const consumed = await prisma.emailVerification.findUnique({ where: { email: signupEmail } });
  check("verification row consumed by signup", consumed === null, consumed);

  // ---------- 10. signup WITHOUT verification still works, unverified ----------
  const unverifiedEmail = `otp.unverified.${stamp}@saahvik.test`;
  const signup2 = await api("POST", "/auth/signup", {
    name: "No OTP Tester",
    email: unverifiedEmail,
    phone: "9829012346",
    hostelName: `No OTP Hostel ${stamp}`,
    password: "correct-horse-8",
  });
  check("signup not blocked without verification", signup2.status < 300, signup2.json.error);
  const owner2 = await prisma.owner.findUnique({ where: { email: unverifiedEmail } });
  check("unverified signup lands emailVerified=false", owner2?.emailVerified === false, owner2?.emailVerified);

  // ---------- 11. password reset still works ----------
  await clearCooldown(signupEmail);
  const forgot = await api("POST", "/auth/forgot-password", { email: signupEmail });
  check("forgot-password returns sent", forgot.json.data?.sent === true, forgot.json);
  const resetOwner = await prisma.owner.findUnique({ where: { email: signupEmail } });
  check("reset token stored (hashed) + expiry", !!resetOwner?.passwordResetToken && !!resetOwner.passwordResetExpiresAt);
  const forgotUnknown = await api("POST", "/auth/forgot-password", { email: "nobody@nowhere.test" });
  check("forgot-password does not leak account existence", forgotUnknown.json.data?.sent === true, forgotUnknown.json);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
