import axios from "axios";

export const TOKEN_KEY = "saahvik.token";
export const USER_KEY = "saahvik.user";
export const ORG_KEY = "saahvik.org";

/**
 * Real HTTP client for the Saahvik backend. The feature code imports API
 * functions from the `*.api.ts` modules; today those modules are backed by
 * the mock layer (src/api/mock/db.ts). When the backend is ready, swap the
 * implementations inside each `*.api.ts` to use this client — the function
 * signatures and types stay identical.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  timeout: 15000,
});

// Attach JWT + org context to every request (multi-tenancy)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const orgRaw = localStorage.getItem(ORG_KEY);
  if (orgRaw) {
    try {
      config.headers["X-Org-Id"] = (JSON.parse(orgRaw) as { id: string }).id;
    } catch {
      /* corrupt storage — ignore */
    }
  }
  return config;
});

// On 401, clear the session and bounce to login
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ORG_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
