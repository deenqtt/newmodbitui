"use client";

import { memo, useState, useRef, useEffect } from "react";
import { LogOut, BarChart3, ChevronDown, ChevronRight, LogIn, Loader2, AlertCircle, BlocksIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useMenu } from "@/contexts/MenuContext";
import { useRouter } from "next/navigation";
import { getIconWithFallback } from "@/lib/icon-library";

// Dynamic icon mapping function with all Lucide icons from dynamic import
const getIconComponent = (iconName: string) => {
  // Use getIconWithFallback instead for better compatibility
  return getIconWithFallback(iconName)?.type || BarChart3;
};

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Universal Dashboard";

export const NavigationSidebar = memo(function NavigationSidebar({
  collapsible = false
}: { collapsible?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const { menuData, loading, error } = useMenu();
  const { logout, user, isAuthenticated, isLoggingOut } = useAuth();

  // Toggle group open/close state
  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Handle logout
  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center border-gray-400 justify-center rounded-lg bg-primary text-primary-foreground">
              <BlocksIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">
                Nexus
              </h1>
              <p className="text-xs text-sidebar-foreground/70">{appName}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent
        className="bg-background overflow-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-4 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sidebar-foreground/50" />
            <div className="text-sm text-sidebar-foreground/70 text-center">Loading menu...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-4 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div className="text-sm text-red-400 text-center">Error loading menu</div>
          </div>
        ) : menuData?.menuGroups && menuData.menuGroups.length > 0 ? (
          menuData.menuGroups
            .filter((group) => group.isActive === true)
            .map((group, groupIndex) => {
            const groupId = group.id || `group-${groupIndex}`;
            if (collapsible) {
              const isOpen = openGroups.has(groupId);
              return (
                <SidebarGroup key={groupId}>
                  <Collapsible open={isOpen} onOpenChange={() => toggleGroup(groupId)}>
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors rounded-md px-2 py-1">
                        <div className="flex items-center gap-2">
                          {group.icon && getIconWithFallback(group.icon)}
                          <span className="text-sidebar-foreground/80 font-medium text-base">{group.label}</span>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 -rotate-90" />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {(group.menuItems || group.items || [])
                            .filter((item) => item.isActive !== false)
                            .map((item, itemIndex) => {
                            const IconComponent = getIconComponent(item.icon || 'BarChart3');
                            return (
                            <SidebarMenuItem key={item.id || itemIndex} className="relative">
                              <SidebarMenuButton
                                asChild
                                isActive={pathname === item.path}
                                className="group flex items-center gap-2 px-3 py-2 rounded-md w-full transition-colors text-sidebar-foreground hover:bg-muted/50 hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium data-[active=true]:shadow-md"
                              >
                                  <Link
                                    href={item.path}
                                    prefetch={true}
                                    onMouseEnter={(e) => {
                                      // Prefetch on hover for immediate next clicks
                                      if (!prefetchedRoutesRef.current.has(item.path)) {
                                        router.prefetch(item.path);
                                        prefetchedRoutesRef.current.add(item.path);
                                      }
                                    }}
                                  >
                                    {/* <IconComponent className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground ml-4" /> */}
                                    <span className="ml-5">{item.label}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              );
            } else {
              return (
                <SidebarGroup key={groupId}>
                  <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground/80">
                    {group.icon && getIconWithFallback(group.icon)}
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {(group.menuItems || group.items || [])
                        .filter((item) => item.isActive !== false)
                        .map((item, itemIndex) => {
                        const IconComponent = getIconComponent(item.icon || 'BarChart3');
                        return (
                          <SidebarMenuItem key={item.id || itemIndex} className="relative">
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.path}
                              className="group flex items-center gap-2 px-3 py-2 rounded-md w-full transition-colors text-sidebar-foreground hover:bg-muted/50 hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:border-l-primary"
                            >
                              <Link
                                href={item.path}
                                prefetch={true}
                                onMouseEnter={(e) => {
                                  // Prefetch on hover for immediate next clicks
                                  if (!prefetchedRoutesRef.current.has(item.path)) {
                                    router.prefetch(item.path);
                                    prefetchedRoutesRef.current.add(item.path);
                                  }
                                }}
                              >
                                <IconComponent className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            }
          })
        ) : menuData?.menuGroups ? (
          <div className="flex items-center justify-center p-4">
            <div className="text-sm text-sidebar-foreground/70">Menu loading...</div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4">
            <div className="text-sm text-sidebar-foreground/70">No menu items available</div>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 bg-background border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-primary font-medium text-sm">
              {user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="flex items-center gap-2 text-destructive bg-destructive/5 hover:bg-destructive/20 hover:text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-3 py-3 rounded-md w-full border border-transparent hover:border-destructive/40"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <ConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        type="warning"
        title="Confirm Logout"
        description="Are you sure you want to log out? You will need to log in again to access the system."
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        destructive={true}
      />
    </Sidebar>
  );
});
