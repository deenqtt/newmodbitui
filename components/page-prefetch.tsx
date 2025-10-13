"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMenu } from "@/contexts/MenuContext";

// Hook for strategic page prefetching
export function usePagePrefetch() {
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const { menuData } = useMenu();

  useEffect(() => {
    // Prefetch core pages on initial load for better performance
    const coreRoutes = [
      '/devices/devices-internal',
      '/lo-ra-wan/device-list',
      '/system-config/user-management'
    ];

    coreRoutes.forEach(route => {
      if (!prefetchedRoutesRef.current.has(route)) {
        router.prefetch(route);
        prefetchedRoutesRef.current.add(route);
      }
    });
  }, [router]);

  // Prefetch menu routes when menuData is available
  useEffect(() => {
    if (menuData?.menuGroups) {
      // Flatten all menu items from all groups
      const allRoutes = menuData.menuGroups.flatMap(group =>
        group.menuItems.map(item => item.path)
      );

      // Prefetch all menu routes in batches to avoid overwhelming
      allRoutes.forEach((route, index) => {
        if (!prefetchedRoutesRef.current.has(route)) {
          // Delay prefetch to avoid blocking main thread
          setTimeout(() => {
            router.prefetch(route);
            prefetchedRoutesRef.current.add(route);
          }, index * 100); // Stagger by 100ms each
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
