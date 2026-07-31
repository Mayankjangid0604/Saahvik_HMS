import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, Org, User } from "@/api/types";
import { ORG_KEY, TOKEN_KEY, USER_KEY } from "@/api/client";
import { logoutServer } from "@/api/auth.api";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  org: Org | null;
  orgId: string | null;
  isAuthenticated: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  updateOrg: (org: Org) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readJSON<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => readJSON<User>(USER_KEY));
  const [org, setOrg] = useState<Org | null>(() => readJSON<Org>(ORG_KEY));

  const login = useCallback((session: AuthSession) => {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
    sessionStorage.setItem(ORG_KEY, JSON.stringify(session.org));
    setToken(session.token);
    setUser(session.user);
    setOrg(session.org);
  }, []);

  const logout = useCallback(() => {
    logoutServer().catch(() => {});
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ORG_KEY);
    setToken(null);
    setUser(null);
    setOrg(null);
  }, []);

  const updateUser = useCallback((u: User) => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const updateOrg = useCallback((o: Org) => {
    sessionStorage.setItem(ORG_KEY, JSON.stringify(o));
    setOrg(o);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      org,
      orgId: org?.id ?? null,
      isAuthenticated: !!token,
      login,
      logout,
      updateUser,
      updateOrg,
    }),
    [token, user, org, login, logout, updateUser, updateOrg],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
