// File: app/(dashboard)/layout.tsx

"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { MqttProvider } from "@/contexts/MqttContext";
import { usePagePrefetch } from "@/components/page-prefetch";

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
import { LogOut, Loader2, Settings } from "lucide-react";

import { NotificationBell } from "@/components/notification-bell";
import { Separator } from "@/components/ui/separator"; // Import komponen Separator
import { LoginSuccessLoader } from "@/components/login-success-loader";

function generateTitleFromPathname(pathname: string): string {
  if (pathname === "/") return "Main Dashboard";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .join(" / ");
}

function UserNav() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-gray-400" />;
  }
  if (!user) return null;

  const getInitials = (email: string) =>
    email ? email.charAt(0).toUpperCase() : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="#" alt="User Avatar" />
            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Signed in as</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MainHeader() {
  const pathname = usePathname();
  const isLayout2DPage = pathname.includes('/layout2d');
  const title = isLayout2DPage ? "Layout-2D" : generateTitleFromPathname(pathname);

  // Enable smart prefetching for better navigation performance
  usePagePrefetch();

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
        {!isLayout2DPage && (
          <Link href="/manage-dashboard">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </Link>
        )}
        <NotificationBell />
        <UserNav />
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
    <SidebarProvider defaultOpen={!isLayout2DPage}>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900/50">
        <NavigationSidebar collapsible={true} />
        <div className="flex flex-col flex-1 min-h-0">
          <MainHeader />
          <div className="flex-1 min-h-0">
            {/* Optimasi: Delay MQTT Provider loading untuk performa awal */}
            <MqttProvider>
              {children}
            </MqttProvider>
          </div>
        </div>
        {/* Enhanced loading screen for better user experience */}
        <LoginSuccessLoader />
      </div>
    </SidebarProvider>
  );
}
