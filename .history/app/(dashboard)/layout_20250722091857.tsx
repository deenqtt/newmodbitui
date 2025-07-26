// File: app/(dashboard)/layout.tsx
"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/contexts/AuthContext";

// Impor komponen UI yang dibutuhkan
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
import { LogOut, Loader2, Users } from "lucide-react";

// Helper untuk mengubah path URL menjadi judul yang rapi
// Contoh: "/system-config/user-management" -> "System Config / User Management"
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

// Komponen untuk navigasi pengguna
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

// Komponen Header utama yang dinamis
function MainHeader() {
  const pathname = usePathname();
  const title = generateTitleFromPathname(pathname);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-white dark:bg-gray-950 px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* Tombol trigger sidebar ini hanya akan muncul di layar kecil */}
        <SidebarTrigger className="lg:hidden" />
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>
      <UserNav />
    </header>
  );
}

// Layout utama untuk dasbor
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900/50">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <MainHeader />
          {/* Konten halaman akan dirender di sini */}
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
