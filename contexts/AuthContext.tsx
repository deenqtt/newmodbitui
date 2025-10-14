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
import { useRouter, usePathname } from "next/navigation";
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
  isLoggingOut: boolean; // ✅ Tambah prop untuk logout loading state
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionCheck: () => void;
  performAutoLogout: () => void;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false); // ✅ Tambah state untuk logout loading
  const [sessionTimeoutRef, setSessionTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Auto logout function for session expiration
  const performAutoLogout = useCallback(() => {
    console.log("[AuthContext] Session expired, performing auto logout...");
    clearSessionCheck();
    setUser(null);
    setIsLoading(false);

    showToast("error", "Session expired. Please login again.");
    router.push("/login");
  }, [router]);

  // Function to clear session check timeout
  const clearSessionCheck = useCallback(() => {
    if (sessionTimeoutRef) {
      clearTimeout(sessionTimeoutRef);
      setSessionTimeoutRef(null);
    }
  }, [sessionTimeoutRef]);

  // Setup session check based on JWT expiration
  const setupSessionCheck = useCallback(() => {
    if (!user) return;

    clearSessionCheck();

    // JWT tokens typically expire in 8 hours or based on JWT_EXPIRATION env var
    const jwtExpiration = process.env.NEXT_PUBLIC_JWT_EXPIRATION ? parseInt(process.env.NEXT_PUBLIC_JWT_EXPIRATION) * 1000 : 8 * 60 * 60 * 1000;

    const timeout = setTimeout(() => {
      performAutoLogout();
    }, jwtExpiration);

    setSessionTimeoutRef(timeout);
    console.log(`[AuthContext] Session check setup for ${jwtExpiration / 1000}s`);
  }, [user, clearSessionCheck, performAutoLogout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);

      console.log("[AuthContext] Attempting login...");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Ensure cookies are included
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      console.log("[AuthContext] Login successful, checking session...");

      // Wait a bit for cookie to be set server-side, then check auth status
      setTimeout(async () => {
        try {
          const meResponse = await fetch("/api/auth/me", {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' },
            credentials: 'include'
          });

          if (meResponse.ok) {
            const userData = await meResponse.json();

            if (userData.userId && userData.email) {
              console.log("[AuthContext] User data loaded:", userData.email);

              setUser({
                userId: userData.userId,
                email: userData.email,
                role: userData.role
              });

              // Setup session expiration check
              setupSessionCheck();
              showToast("success", "Login successful!");

              console.log("[AuthContext] Redirecting to dashboard...");
              router.push("/");
            } else {
              throw new Error("Invalid user data received");
            }
          } else {
            throw new Error("Failed to get user session");
          }
        } catch (err) {
          console.error("[AuthContext] Session check failed after login:", err);
          showToast("error", "Login succeeded but session failed. Please try again.");
          setUser(null);
          router.push("/login");
        } finally {
          setIsLoading(false);
        }
      }, 100); // Small delay to ensure cookie synchronization

    } catch (error: any) {
      console.error("[AuthContext] Login failed:", error);
      showToast("error", error.message || "An error occurred");
      setIsLoading(false);
      throw error;
    }
  }, [router, setupSessionCheck]);

    const logout = useCallback(async () => {
      console.log("[Auth] Logout initiated with loading screen");

      // 🔄 Set loading state BEFORE any operations
      setIsLoggingOut(true);

      // Add small delay for better UX (like login has)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Clear state immediately for instant UI feedback
      clearSessionCheck();
      setUser(null);
      setIsLoading(false);
      setIsLoggingOut(false); // 🔄 Clear logout loading

      // Silent server logout - cookies will be cleared server-side
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { 'Cache-Control': 'no-cache' },
        credentials: "include"
      }).catch(() => {}); // Ignore errors

      showToast("success", "Logged out");
      router.push("/login");
    }, [clearSessionCheck, router]);

  // Load user from existing session on app start
  const loadUserFromCookie = useCallback(async () => {
    try {
      console.log("[AuthContext] Checking existing session...");

      const res = await fetch("/api/auth/me", {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });

      if (res.ok) {
        const userData = await res.json();

        if (userData.userId && userData.email) {
          console.log("[AuthContext] Found existing session for:", userData.email);

          setUser({
            userId: userData.userId,
            email: userData.email,
            role: userData.role
          });

          // Setup session check for existing session
          setTimeout(() => setupSessionCheck(), 100); // Small delay to ensure state is set
        } else {
          console.log("[AuthContext] Invalid session data");
          setUser(null);
        }
      } else {
        console.log("[AuthContext] No existing session found");
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext] Session check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setupSessionCheck]);

  // Load user on mount and route changes
  useEffect(() => {
    loadUserFromCookie();
  }, []);

  // Handle unauthorized access
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/api/')) {
        console.log(`[AuthContext] Unauthorized access to ${pathname}, redirecting to login`);
        router.push('/login');
      }
    }
  }, [user, isLoading, pathname, router]);

  // Setup/clean session check when user changes - FIXED INFINITE LOOP
  useEffect(() => {
    if (user && !isLoading) {
      setupSessionCheck();
    } else {
      clearSessionCheck();
    }
  }, [user, isLoading]); // Removed function dependencies to prevent infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionCheck();
    };
  }, [clearSessionCheck]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
    login,
    logout,
    clearSessionCheck,
    performAutoLogout,
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
