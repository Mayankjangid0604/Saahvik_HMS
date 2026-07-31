import axios from "axios";

export const TOKEN_KEY = "saahvik.token";
export const USER_KEY = "saahvik.user";
export const ORG_KEY = "saahvik.org";

/** Error payload of the backend envelope: { success:false, error:{code,message,…} } */
interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

/** Normalized API error. `code` carries structured backend codes (e.g. STAFF_CAP_EXCEEDED). */
export class ApiRequestError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, opts: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

/**
 * HTTP client for the Saahvik backend. Every JSON response is wrapped in the
 * envelope { success, apiVersion, data | error }; the response interceptor
 * below unwraps it, so the `*.api.ts` functions receive the payload directly.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  timeout: 15000,
});

// Attach the logged-in user's JWT. Tenancy (orgId) is derived server-side
// from the verified token — the backend ignores any org header.
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ORG_KEY);
}

/** Credential endpoints where a 401 means "bad input", not "stale session". */
const NO_LOGOUT_URLS = [
  "/auth/login",
  "/auth/signup",
  "/auth/2fa/verify",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
];

apiClient.interceptors.response.use(
  (res) => {
    const body = res.data as { success?: boolean; data?: unknown; error?: ApiErrorBody } | null;
    // Blob responses (PDF streams) pass through untouched.
    if (body && typeof body === "object" && !(body instanceof Blob) && "success" in body) {
      if (body.success) {
        res.data = body.data;
      } else {
        throw new ApiRequestError(body.error?.message ?? "Request failed", {
          code: body.error?.code,
          status: res.status,
          details: body.error?.details,
        });
      }
    }
    return res;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? "";
      if (status === 401 && !NO_LOGOUT_URLS.some((u) => url.startsWith(u))) {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
      const body = error.response?.data as { error?: ApiErrorBody } | undefined;
      return Promise.reject(
        new ApiRequestError(body?.error?.message ?? error.message, {
          code: body?.error?.code,
          status,
          details: body?.error?.details,
        }),
      );
    }
    return Promise.reject(error);
  },
);
