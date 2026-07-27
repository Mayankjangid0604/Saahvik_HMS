/** Mock auth API. Swap internals for apiClient calls when the backend lands. */
import type {
  AuthSession,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  User,
} from "./types";
import { delay, org, owner } from "./mock/db";

function makeToken(): string {
  // Fake JWT: header.payload.signature (not a real signature, mock only)
  const payload = btoa(JSON.stringify({ sub: owner.id, orgId: org.id, exp: Date.now() + 86400_000 }));
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.mock-signature`;
}

let pendingTwoFactorEmail: string | null = null;

export async function login(input: LoginRequest): Promise<LoginResponse> {
  await delay(500);
  if (input.password === "wrongpass") {
    throw new Error("Incorrect email or password");
  }
  // Emails containing "+2fa" simulate an account with 2FA enabled
  if (input.email.includes("+2fa")) {
    pendingTwoFactorEmail = input.email;
    return { requiresTwoFactor: true };
  }
  return {
    requiresTwoFactor: false,
    token: makeToken(),
    user: { ...owner, email: input.email || owner.email },
    org,
  };
}

export async function verifyTwoFactor(code: string): Promise<AuthSession> {
  await delay(400);
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter the 6-digit code from your authenticator app");
  }
  const email = pendingTwoFactorEmail ?? owner.email;
  pendingTwoFactorEmail = null;
  return { token: makeToken(), user: { ...owner, email, twoFactorEnabled: true }, org };
}

export async function signup(input: SignupRequest): Promise<AuthSession> {
  await delay(600);
  const user: User = {
    ...owner,
    name: input.name,
    email: input.email,
    phone: input.phone,
    createdAt: new Date().toISOString(),
  };
  return {
    token: makeToken(),
    user,
    org: { ...org, hostelName: input.hostelName, setupComplete: false },
  };
}

export async function forgotPassword(email: string): Promise<{ sent: boolean }> {
  await delay(500);
  void email;
  return { sent: true };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  await delay(500);
  if (input.currentPassword === "wrongpass") {
    throw new Error("Current password is incorrect");
  }
  return { ok: true };
}

export async function setupTwoFactor(): Promise<{ secret: string; otpauthUrl: string }> {
  await delay(400);
  const secret = "JBSWY3DPEHPK3PXP";
  return {
    secret,
    otpauthUrl: `otpauth://totp/Saahvik:${owner.email}?secret=${secret}&issuer=Saahvik`,
  };
}

export async function confirmTwoFactor(code: string): Promise<{ enabled: boolean }> {
  await delay(400);
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter the 6-digit code from your authenticator app");
  }
  owner.twoFactorEnabled = true;
  return { enabled: true };
}

export async function disableTwoFactor(): Promise<{ enabled: boolean }> {
  await delay(300);
  owner.twoFactorEnabled = false;
  return { enabled: false };
}

export async function updateProfile(input: { name: string; phone: string }): Promise<User> {
  await delay(400);
  owner.name = input.name;
  owner.phone = input.phone;
  return { ...owner };
}
