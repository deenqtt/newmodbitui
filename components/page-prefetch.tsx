"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMenu } from "@/contexts/MenuContext";

// Hook for strategic page prefetching - optimized for performance
export function usePagePrefetch() {
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const { menuData } = useMenu();

  useEffect(() => {
    // Prefetch only essential pages on initial load - reduced from 20+ to 4-5 core routes
    const essentialRoutes = [
      '/devices', // Main devices page
      '/alarms',  // Critical alarms page
      '/dashboard', // Main dashboard
      '/network',  // Network monitoring
    ];

    essentialRoutes.forEach(route => {
      if (!prefetchedRoutesRef.current.has(route)) {
        router.prefetch(route);
        prefetchedRoutesRef.current.add(route);
      }
    });
  }, [router]);

  // Reduced prefetching: Only prefetch menu routes on user interaction, not automatically
  useEffect(() => {
    if (menuData?.menuGroups) {
      // Only prefetch frequently accessed routes, not all routes
      const frequentRoutes = menuData.menuGroups.flatMap(group =>
        group.menuItems
          .filter(item =>
            item.path.includes('/devices') ||
            item.path.includes('/alarms') ||
            item.path.includes('/dashboard') ||
            item.path.includes('/network')
          )
          .map(item => item.path)
      );

      // Limit to maximum 5 additional prefetches and stagger them
      frequentRoutes.slice(0, 5).forEach((route, index) => {
        if (!prefetchedRoutesRef.current.has(route)) {
          // Increased delay to prevent blocking and added more stagger
          setTimeout(() => {
            router.prefetch(route);
            prefetchedRoutesRef.current.add(route);
          }, index * 200); // Increased stagger to 200ms
        }
      });
    }
  }, [menuData, router]);

  const prefetchRoute = (route: string) => {
    if (!prefetchedRoutesRef.current.has(route)) {
      router.prefetch(route);
      prefetchedRoutesRef.current.add(route);
    }
  };

  return { prefetchRoute };
}
