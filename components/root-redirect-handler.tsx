"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface RootRedirectHandlerProps {
  children: React.ReactNode;
}

export function RootRedirectHandler({ children }: RootRedirectHandlerProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Track if we've already redirected to prevent double redirects
  const hasRedirectedRef = useRef(false);
  // Track authentication state changes
  const prevAuthStateRef = useRef({ isAuthenticated, isLoading, pathname });

  useEffect(() => {
    const current = { isAuthenticated, isLoading, pathname };
    const prev = prevAuthStateRef.current;

    // Only process changes when state actually changes
    if (
      current.isAuthenticated !== prev.isAuthenticated ||
      current.isLoading !== prev.isLoading ||
      current.pathname !== prev.pathname
    ) {
      console.log(`[RootRedirectHandler] State changed:`, {
        from: prev,
        to: current,
        hasUser: !!user
      });

      // Update reference for next comparison
      prevAuthStateRef.current = current;

      // Only handle redirection when not in loading state and on root path
      if (!isLoading && pathname === "/") {
        if (isAuthenticated && user) {
          // Authenticated user on root - stay on / which will show dashboard
          console.log("[RootRedirectHandler] User authenticated on root, showing dashboard");
          hasRedirectedRef.current = false; // Reset redirect flag

        } else if (!isAuthenticated && !isLoading) {
          // Unauthenticated user on root - redirect to login
          // Only redirect if we haven't redirected before to prevent loops
          if (!hasRedirectedRef.current) {
            console.log("[RootRedirectHandler] User not authenticated on root, redirecting to login");
            hasRedirectedRef.current = true;
            router.push("/login");
          }
        }
      } else if (pathname !== "/") {
        // Reset redirect flag when not on root path
        hasRedirectedRef.current = false;
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  // Reset redirect flag on pathname change to root
  useEffect(() => {
    if (pathname === "/") {
      hasRedirectedRef.current = false;
    }
  }, [pathname]);

  return <>{children}</>;
}
