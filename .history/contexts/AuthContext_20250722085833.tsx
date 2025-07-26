"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode"; // Gunakan jwt-decode untuk membaca token di client
import { Role } from "@prisma/client";
import Swal from "sweetalert2"; // Import SweetAlert2 untuk notifikasi
interface User {
  userId: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper untuk notifikasi toast
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cek token saat aplikasi pertama kali dimuat
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        const decoded = jwtDecode<User & { exp: number }>(storedToken);
        // Cek apakah token sudah kadaluarsa
        if (decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser({ userId: decoded.userId, role: decoded.role });
        } else {
          localStorage.removeItem("authToken"); // Hapus token kadaluarsa
        }
      }
    } catch (error) {
      console.error("Failed to process token on initial load", error);
      localStorage.removeItem("authToken");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      const { token: newToken } = data;
      const decoded = jwtDecode<User>(newToken);

      localStorage.setItem("authToken", newToken);
      setToken(newToken);
      setUser({ userId: decoded.userId, role: decoded.role });
      showToast("success", "Login successful!");
    } catch (error: any) {
      showToast("error", error.message || "An error occurred");
      throw error; // Lemparkan error agar bisa ditangani di halaman login
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setUser(null);
    setToken(null);
    // Redirect ke halaman login setelah logout
    window.location.href = "/login";
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
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
