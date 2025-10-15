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
  retryMenuLoad: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [menuData, setMenuData] = useState<UserMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [menuCache, setMenuCache] = useState<Map<string, UserMenuData>>(new Map());

  const fetchMenu = async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setMenuData(null);
      setLoading(false);
      return;
    }

      // Check cache first (skip if force refresh)
    if (!forceRefresh && menuCache.has('menuData')) {
      const cachedData = menuCache.get('menuData');
      if (cachedData) {
        setMenuData(cachedData);
        setIsDeveloper(!!cachedData.isDeveloper);
        setLoading(false);
        setError(null);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/menu', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch menu');
      }

      const menuDataResult = {
        menuGroups: data.data || [],
        isDeveloper: data.isDeveloper || false,
      };

      // Cache the result
      setMenuCache(prev => new Map(prev).set('menuData', menuDataResult));

      setMenuData(menuDataResult);
      setIsDeveloper(!!data.isDeveloper);

    } catch (err: any) {
      // If cache exists and request fails, use cached data but show error
      const cached = menuCache.get('menuData');
      if (cached && !forceRefresh) {
        setMenuData(cached);
        setIsDeveloper(!!cached.isDeveloper);
        setLoading(false);
        setError(`Using cached menu data: ${err.message}`);
        return;
      }

      setError(err.message);
      setMenuData(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshMenu = async () => {
    await fetchMenu();
  };

  const retryMenuLoad = () => {
    if (isAuthenticated) {
      setError(null);
      fetchMenu();
    }
  };

  // Fetch menu immediately when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMenu();
    } else {
      setMenuData(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated]);

  // Reduced refresh frequency to 15 minutes and increased cache validity for better performance
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchMenu(true); // Force refresh occasionally
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value: MenuContextType = {
    menuData,
    loading,
    error,
    refreshMenu,
    isDeveloper,
    retryMenuLoad,
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
