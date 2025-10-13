"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { MenuGroupWithItems, UserMenuData } from "@/lib/types/menu";

interface MenuContextType {
  menuData: UserMenuData | null;
  loading: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
  isDeveloper: boolean;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [menuData, setMenuData] = useState<UserMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  const fetchMenu = async () => {
    if (!isAuthenticated) {
      setMenuData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/menu');

      if (!response.ok) {
        throw new Error('Failed to fetch menu');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch menu');
      }

      setMenuData({
        menuGroups: data.data || [],
        isDeveloper: data.isDeveloper || false,
      });
      setIsDeveloper(data.isDeveloper || false);

    } catch (err: any) {
      setError(err.message);
      console.error('Menu fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshMenu = async () => {
    await fetchMenu();
  };

  // Fetch menu immediately when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("[MenuContext] User authenticated, fetching menu...");
      fetchMenu();
    } else {
      console.log("[MenuContext] User not authenticated, clearing menu data");
      setMenuData(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated]);

  // Periodic refresh every 5 minutes to ensure menu stays up to date
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchMenu();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value: MenuContextType = {
    menuData,
    loading,
    error,
    refreshMenu,
    isDeveloper,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}

// Hook for accessing current user's menu permissions for a specific menu item
export function useMenuItemPermissions(menuItemName: string) {
  const { menuData, isDeveloper } = useMenu();

  const findMenuItem = (groups: MenuGroupWithItems[] | undefined, name: string) => {
    if (!groups) return null;

    for (const group of groups) {
      for (const item of group.menuItems) {
        if (item.name === name) {
          return item;
        }
      }
    }
    return null;
  };

  const menuItem = menuData ? findMenuItem(menuData.menuGroups, menuItemName) : null;

  return {
    canView: menuItem?.permissions.canView ?? false,
    canCreate: menuItem?.permissions.canCreate ?? false,
    canUpdate: menuItem?.permissions.canUpdate ?? false,
    canDelete: menuItem?.permissions.canDelete ?? false,
    menuItem,
    isDeveloper,
  };
}
