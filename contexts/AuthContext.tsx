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
import { MenuItemWithPermissions, MenuGroupWithItems } from "@/lib/types/menu";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
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

      // Simpan token ke localStorage sementara untuk update state segera
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        // Update user state secara optimistik
        const userData = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
        setUser({
          userId: userData.userId,
          role: userData.role,
          email: userData.email
        });
        setIsLoading(false);
      }

      showToast("success", "Login successful!");

      // Direct redirect setelah semua state terupdate
      setTimeout(() => {
        console.log("[AuthContext] Redirecting to dashboard...");
        router.push("/");
      }, 200); // Slightly longer delay to ensure state propagation
    } catch (error: any) {
      showToast("error", error.message || "An error occurred");
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      // Optimistic update - immediately clear user and redirect
      setUser(null);
      setIsLoading(false);

      // Send logout request in background (don't await to avoid delay)
      fetch("/api/auth/logout", { method: "POST" })
        .then(() => {
          showToast("success", "You have been logged out.");
        })
        .catch((error) => {
          console.error("Logout API error:", error);
          // Don't show error toast since user is already logged out optimistically
        });

      // Immediate redirect without waiting for API response
      router.push("/login");
    } catch (error) {
      showToast("error", "Logout failed.");
    }
  }, [router]);

  // Fungsi untuk memuat data user dari cookie melalui API
  const loadUserFromCookie = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const userData = await res.json();

        setUser(userData);
      } else {
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
