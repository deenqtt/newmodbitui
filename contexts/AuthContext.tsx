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
  const [hasRedirectedAfterLogin, setHasRedirectedAfterLogin] = useState(false);
  const [isLoginRedirecting, setIsLoginRedirecting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Auto logout function for session expiration
  const performAutoLogout = useCallback(() => {
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
  }, [user, clearSessionCheck, performAutoLogout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);

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

      // Retry mechanism for session verification with exponential backoff
      let retries = 0;
      const maxRetries = 5;
      const baseDelay = 200; // Increased base delay

      const verifySession = async (): Promise<void> => {
        try {
          const meResponse = await fetch("/api/auth/me", {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' },
            credentials: 'include'
          });

          if (meResponse.ok) {
            const userData = await meResponse.json();

            if (userData.userId && userData.email) {
              // Set user state - React state updates are synchronous within the same render cycle
              setUser({
                userId: userData.userId,
                email: userData.email,
                role: userData.role
              });

              // Setup session expiration check
              setupSessionCheck();

              showToast("success", "Login successful!");

              return;
            } else {
              throw new Error("Invalid user data received");
            }
          } else {
            throw new Error("Failed to get user session");
          }
        } catch (err) {
          if (retries < maxRetries - 1) {
            retries++;
            const delay = baseDelay * Math.pow(2, retries); // Exponential backoff
            setTimeout(verifySession, delay);
          } else {
            showToast("error", "Login succeeded but session verification failed. Please refresh and try again.");
            setUser(null);
            setIsLoading(false);
          }
        }
      };

      // Start initial verification attempt after base delay
      setTimeout(verifySession, baseDelay);

        // Clear loading state after verification starts
        setTimeout(() => {
          setIsLoading(false);
        }, baseDelay + 100); // Clear loading shortly after verification starts

    } catch (error: any) {
      showToast("error", error.message || "An error occurred");
      setIsLoading(false);
      throw error;
    }
  }, [router, setupSessionCheck]);

      const logout = useCallback(async () => {
        // 🔄 Set loading state BEFORE any operations
        setIsLoggingOut(true);

        try {
          // First clear the server-side session
          const logoutResponse = await fetch("/api/auth/logout", {
            method: "POST",
            headers: { 'Cache-Control': 'no-cache' },
            credentials: "include"
          });

          if (!logoutResponse.ok) {
            console.warn("[Auth] Logout API call failed, but proceeding with client-side cleanup");
          }

          // Wait a brief moment to ensure cookie is cleared server-side
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn("[Auth] Logout API error, proceeding with client-side cleanup:", error);
        }

        // Clear state immediately for instant UI feedback
        clearSessionCheck();
      setUser(null);
      setIsLoading(false);
      setIsLoggingOut(false); // 🔄 Clear logout loading
      setHasRedirectedAfterLogin(false); // Reset login redirect flag
      setIsLoginRedirecting(false); // Reset login redirecting flag

      showToast("success", "Logged out");

      // Navigate to login page
      router.push("/login");
      }, [clearSessionCheck, router]);

  // Load user from existing session on app start
  const loadUserFromCookie = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });

      if (res.ok) {
        const userData = await res.json();

        if (userData.userId && userData.email) {
          setUser({
            userId: userData.userId,
            email: userData.email,
            role: userData.role
          });

          // Setup session check for existing session
          // setTimeout(() => setupSessionCheck(), 100); // Small delay to ensure state is set
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setupSessionCheck]);

  // Load user on mount and route changes
  useEffect(() => {
    loadUserFromCookie();
  }, []);

  // Disable unauthorized access checks during login flow
  // This prevents conflicts between login redirects and auth checks
  useEffect(() => {
    if (!user && !isLoading && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/api/') && pathname !== '/') {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  // Handle navigation after user state is set - SIMPLIFIED APPROACH
  useEffect(() => {
    // Only redirect if user is authenticated AND we're on login page
    // Don't use complex flags - the pathname check handles the race condition
    if (user && !isLoading && pathname === '/login') {
      // No delay - make it instant
      router.replace("/");
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
