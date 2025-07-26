"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
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

  const verifyToken = useCallback(() => {
    // Fungsi ini bisa dipanggil untuk memverifikasi token dari cookie jika diperlukan,
    // tapi middleware sudah menangani sebagian besar.
    // Untuk saat ini, kita akan mengandalkan data dari server-side props atau initial load.
    // Kita akan menyederhanakan ini untuk fokus pada login/logout.
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Cukup set loading ke false. Middleware akan menangani redirect.
    // Jika halaman bisa diakses, berarti token valid.
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
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
        // Arahkan ke halaman utama, middleware akan menangani sisanya.
        router.push("/");
        router.refresh(); // Refresh halaman untuk mendapatkan state server terbaru
      } catch (error: any) {
        showToast("error", error.message || "An error occurred");
        throw error;
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      showToast("success", "You have been logged out.");
      router.push("/login");
      router.refresh();
    } catch (error) {
      showToast("error", "Logout failed.");
    }
  }, [router]);

  // Fungsi untuk memuat data user di sisi client
  const loadUserFromCookie = useCallback(async () => {
    // Ini adalah cara untuk mendapatkan data dari token di client-side
    // dengan asumsi kita tidak bisa membaca cookie httpOnly secara langsung.
    // Kita buat endpoint API baru untuk ini.
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
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
    isAuthenticated: !!user,
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
