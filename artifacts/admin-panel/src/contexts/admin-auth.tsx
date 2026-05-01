import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Redirect } from "wouter";

/**
 * Admin auth context.
 *
 * Login still goes through `POST /api/admin/login` on api-server (bcrypt
 * compare lives there) — but the response now also includes `role` and
 * `permissions`, persisted to localStorage so a hard refresh keeps UI
 * gating intact without an extra round-trip.
 *
 * `hasPermission(key)` returns true for any superadmin; otherwise checks
 * the persisted permissions allowlist. Server-side enforcement is the
 * authoritative gate — this is for hiding sidebar items / dim buttons.
 */
export type AdminRole = "superadmin" | "admin" | "support";

interface AdminUser {
  username: string;
  token: string;
  role: AdminRole;
  permissions: string[];
}

interface AdminAuthContextType {
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  authHeader: () => Record<string, string>;
  hasPermission: (key: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const STORAGE_KEY = "mr_admin_token";
const USER_KEY    = "mr_admin_user";
const ROLE_KEY    = "mr_admin_role";
const PERMS_KEY   = "mr_admin_perms";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const username = localStorage.getItem(USER_KEY);
    if (!token || !username) return null;
    const role = (localStorage.getItem(ROLE_KEY) as AdminRole | null) ?? "admin";
    const permsRaw = localStorage.getItem(PERMS_KEY);
    let permissions: string[] = [];
    try { permissions = permsRaw ? JSON.parse(permsRaw) : []; } catch { permissions = []; }
    return { token, username, role, permissions };
  });

  const login = useCallback(async (username: string, password: string) => {
    // Cloudflare Pages static rewrites (`_redirects` 200) don't proxy POST
    // bodies cleanly — they tend to drop the body or coerce to GET. Use the
    // api-server's absolute URL when VITE_API_BASE_URL is set so POST flows
    // direct (api-server enables CORS permissively). Falls back to relative
    // for local dev where Vite proxies /api → :3000.
    const base =
      (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
    const res = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    const role: AdminRole = (data.role as AdminRole) ?? "admin";
    const permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
    localStorage.setItem(STORAGE_KEY, data.token);
    localStorage.setItem(USER_KEY, data.username);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(PERMS_KEY, JSON.stringify(permissions));
    setUser({ token: data.token, username: data.username, role, permissions });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PERMS_KEY);
    setUser(null);
  }, []);

  const authHeader = useCallback(
    () => (user ? { Authorization: `Bearer ${user.token}` } : {}),
    [user],
  );

  const hasPermission = useCallback(
    (key: string) => {
      if (!user) return false;
      if (user.role === "superadmin") return true;
      return user.permissions.includes(key);
    },
    [user],
  );

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user, authHeader, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth outside provider");
  return ctx;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAdminAuth();
  if (!isLoggedIn) return <Redirect to="/login" />;
  return <>{children}</>;
}
