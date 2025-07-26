// app/layout.tsx
"use client";
import "../app/globals.css";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, History } from "lucide-react";

// Komponen-komponen "sidebar modular" seperti di kode kamu
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
} from "../components/ui/sidebar";

export const metadata = {
  title: "Modbo Monitoring",
  description: "Monitoring System for MODbit",
};

const navigation = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        url: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "User Management",
        url: "/users",
        icon: Users,
      },
      {
        title: "History Log",
        url: "/history",
        icon: History,
      },
    ],
  },
];
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-100 text-gray-900">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Modbo Monitoring</h1>
                <p className="text-xs text-muted-foreground">
                  Recognition Platform
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navigation.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarRail />
        </Sidebar>

        <div className="flex flex-col flex-1">
          {/* Optional: Header di atas halaman */}
          <header className="bg-white px-6 py-4 border-b shadow-sm">
            <h1 className="text-lg font-bold">Welcome to Modbo</h1>
          </header>

          <main className="p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
