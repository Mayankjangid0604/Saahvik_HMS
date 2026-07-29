/** Auth API backed by the real backend (see backend/HANDOFF.md). */
import type {
  AuthSession,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  User,
} from "./types";
import { apiClient, TOKEN_KEY } from "./client";

/**
 * Challenge id handed out by POST /auth/login when 2FA is on; the verify
 * step must echo it back. Kept in sessionStorage so a reload on the 2FA
 * page doesn't strand the user.
 */
const TEMP_SESSION_KEY = "saahvik.tempSessionId";

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", input);
  if (data.requiresTwoFactor && data.tempSessionId) {
    sessionStorage.setItem(TEMP_SESSION_KEY, data.tempSessionId);
  } else {
    sessionStorage.removeItem(TEMP_SESSION_KEY);
  }
  return data;
}

export async function verifyTwoFactor(code: string): Promise<AuthSession> {
  const tempSessionId = sessionStorage.getItem(TEMP_SESSION_KEY);
  if (!tempSessionId) {
    throw new Error("Your login session expired — please sign in again");
  }
  const { data } = await apiClient.post<AuthSession>("/auth/2fa/verify", {
    tempSessionId,
    token: code,
  });
  sessionStorage.removeItem(TEMP_SESSION_KEY);
  return data;
}

export async function signup(input: SignupRequest): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/signup", input);
  return data;
}

export async function forgotPassword(email: string): Promise<{ sent: boolean }> {
  const { data } = await apiClient.post<{ sent: boolean }>("/auth/forgot-password", { email });
  return data;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean; token?: string }>(
    "/auth/change-password",
    input,
  );
  // Password change bumps tokenVersion server-side; the old JWT is revoked
  // and the response carries a fresh one — swap it in or the next request 401s.
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

export async function setupTwoFactor(): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
}> {
  const { data } = await apiClient.get<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl?: string;
  }>("/auth/2fa/setup");
  return data;
}

export async function confirmTwoFactor(
  code: string,
): Promise<{ enabled: boolean; backupCodes?: string[] }> {
  const { data } = await apiClient.post<{ enabled: boolean; backupCodes?: string[] }>(
    "/auth/2fa/verify-setup",
    { token: code },
  );
  return data;
}

export async function disableTwoFactor(code: string): Promise<{ enabled: boolean }> {
  const { data } = await apiClient.post<{ enabled: boolean }>("/auth/2fa/disable", {
    token: code,
  });
  return data;
}

export async function updateProfile(input: { name: string; phone: string }): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/profile", input);
  return data;
}
