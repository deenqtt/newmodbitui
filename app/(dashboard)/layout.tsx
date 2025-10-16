// File: app/(dashboard)/layout.tsx

"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePagePrefetch } from "@/components/page-prefetch";
import { MqttProvider } from "@/contexts/MqttContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, Settings, RefreshCw } from "lucide-react";

import { NotificationBell } from "@/components/notification-bell";
import { Separator } from "@/components/ui/separator"; // Import komponen Separator
import { LoginSuccessLoader } from "@/components/login-success-loader";

function generateTitleFromPathname(pathname: string): string {
  if (pathname === "/") return "Main Dashboard";

  // Handle specific routes with better titles
  const routeMap: Record<string, string> = {
    "alarms": "Alarms",
    "analytics": "Analytics",
    "control": "Control Panel",
    "devices": "Devices",
    "info": "Information",
    "layout2d": "2D Layout",
    "lorawan": "LoRaWAN",
    "maintenance": "Maintenance",
    "manage-dashboard": "Manage Dashboards",
    "manage-menu": "Menu Management",
    "network": "Network",
    "payload": "Payload Data",
    "racks": "Racks",
    "security-access": "Security Access",
    "snmp-data-get": "SNMP Data",
    "system-config": "System Configuration",
    "test": "Test Panel",
    "view-dashboard": "Dashboard View",
    "whatsapp-test": "WhatsApp Test",
    "monitoring": "Monitoring",
  };

  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => routeMap[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()))
    .join(" > ");
}

function MainHeader() {
  const pathname = usePathname();
  const isLayout2DPage = pathname.includes('/layout2d');
  const title = generateTitleFromPathname(pathname);

  // Enable smart prefetching for better navigation performance
  usePagePrefetch();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-white dark:bg-gray-950 px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hidden lg:flex" />
        <SidebarTrigger className="lg:hidden" />
        {/* Tambahkan Separator di sini */}
        <Separator orientation="vertical" className="h-8" />
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {pathname === "/" && (
          <Link href="/manage-dashboard">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <NotificationBell />
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLayout2DPage = pathname.includes('/layout2d');

  return (
    <MqttProvider>
      <SidebarProvider defaultOpen={!isLayout2DPage}>
        <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900/50">
          <NavigationSidebar collapsible={true} />
          <div className="flex flex-col flex-1 min-h-0">
            <MainHeader />
            <div className="flex-1 min-h-0">
              {children}
            </div>
          </div>
          {/* Enhanced loading screen for better user experience */}
          <LoginSuccessLoader />
        </div>
      </SidebarProvider>
    </MqttProvider>
  );
}
