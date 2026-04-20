import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Redirect } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AdminUser { username: string; token: string; }
interface AdminAuthContextType {
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  authHeader: () => Record<string, string>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const STORAGE_KEY = "mr_admin_token";
const USER_KEY = "mr_admin_user";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const username = localStorage.getItem(USER_KEY);
    return token && username ? { token, username } : null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY, data.token);
    localStorage.setItem(USER_KEY, data.username);
    setUser({ token: data.token, username: data.username });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const authHeader = useCallback(() =>
    user ? { Authorization: `Bearer ${user.token}` } : {},
  [user]);

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user, authHeader }}>
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
