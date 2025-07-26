"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";

interface User {
  userId: string;
  role: Role;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const showToast = (icon: "success" | "error", title: string) => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  Toast.fire({ icon, title });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      showToast("success", "Login successful!");
      // Muat ulang seluruh halaman untuk memastikan semua state server (termasuk cookie)
      // dan state client sinkron.
      window.location.href = "/";
    } catch (error: any) {
      showToast("error", error.message || "An error occurred");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      showToast("success", "You have been logged out.");
      // Muat ulang halaman untuk membersihkan semua state
      window.location.href = "/login";
    } catch (error) {
      showToast("error", "Logout failed.");
    }
  }, []);

  // Fungsi untuk memuat data user dari cookie melalui API
  const loadUserFromCookie = useCallback(async () => {
    console.log("[AuthContext] Mencoba mengambil data pengguna dari server...");
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const userData = await res.json();
        console.log(
          "[AuthContext] Pengguna berhasil diidentifikasi:",
          userData
        );
        setUser(userData);
      } else {
        console.log("[AuthContext] Tidak ada sesi login yang valid.");
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext] Gagal mengambil data pengguna:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromCookie();
  }, [loadUserFromCookie]);

  const value = {
    user,
    isAuthenticated: !!user, // Status login sekarang berdasarkan ada atau tidaknya objek user
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
