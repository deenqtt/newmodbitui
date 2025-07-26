"use client";

import {
  LayoutDashboard,
  HardDrive,
  Cog,
  ShieldCheck,
  Network,
  Bot,
  AlarmClock,
  Mic,
  BarChart3,
  Users,
  Power,
  Menu,
  DatabaseBackup,
  Lock,
  Cctv,
  Settings2,
  ListTree,
  GitBranch,
  CalendarClock,
  Lightbulb,
  Voicemail,
  DatabaseZap,
  FileText,
  Package,
  History,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
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
} from "@/components/ui/sidebar";

// Data menu dari Anda
const defaultMenuForm = {
  Monitoring: {
    enabled: true,
    submenus: {
      "Main Dashboard": true,
    },
  },
  Devices: {
    enabled: true,
    submenus: {
      "Devices Internal": true,
      "Devices External": true,
      "Devices for Logging": true,
      "Node Management": true,
    },
  },
  SystemConfig: {
    enabled: true,
    submenus: {
      "User Management": true,
      "Power Analyzer": true,
      "Menu Display": true,
      "System Backup": true,
    },
  },
  SecurityAccess: {
    enabled: true,
    submenus: {
      "Device Access": true,
      "Surveillance CCTV": true,
    },
  },
  Network: {
    enabled: true,
    submenus: {
      "Communication Setup": true,
      "Register SNMP": true,
      "MQTT Broker": true,
    },
  },
  Automation: {
    enabled: true,
    submenus: {
      "Automated Scheduling": true,
      "Smart Logic Automation": true,
      "Voice Command": true,
      "Automation Values": true,
      "Dynamic Payload": true,
      "Static Payload": true,
    },
  },
  Alarms: {
    enabled: true,
    submenus: {
      "Alarm Management": true,
      "Alarm Log Reports": true,
    },
  },
  VoiceRecognition: {
    enabled: true,
    submenus: {
      "Relay Control": true,
      "Relay STT": true,
    },
  },
  Analytics: {
    enabled: true,
    submenus: {
      "Devices Log Report": true,
    },
  },
};

// Pemetaan dari nama submenu ke komponen ikon
const iconMap = {
  "Main Dashboard": LayoutDashboard,
  "Devices Internal": HardDrive,
  "Devices External": HardDrive,
  "Devices for Logging": HardDrive,
  "Node Management": GitBranch,
  "User Management": Users,
  "Power Analyzer": Power,
  "Menu Display": Menu,
  "System Backup": DatabaseBackup,
  "Device Access": Lock,
  "Surveillance CCTV": Cctv,
  "Communication Setup": Settings2,
  "Register SNMP": ListTree,
  "MQTT Broker": GitBranch,
  "Automated Scheduling": CalendarClock,
  "Smart Logic Automation": Lightbulb,
  "Voice Command": Voicemail,
  "Automation Values": DatabaseZap,
  "Dynamic Payload": Package,
  "Static Payload": Package,
  "Alarm Management": AlarmClock,
  "Alarm Log Reports": History,
  "Relay Control": Power,
  "Relay STT": Mic,
  "Devices Log Report": FileText,
};

// Helper function untuk mengubah string menjadi format kebab-case (untuk URL)
const toKebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

// Helper function untuk memformat judul grup menu (e.g., "SystemConfig" -> "System Config")
const formatGroupTitle = (key) => key.replace(/([A-Z])/g, " $1").trim();

export function AppSidebar() {
  const pathname = usePathname();

  // Menggunakan useMemo agar struktur navigasi tidak dibuat ulang di setiap render
  const navigation = useMemo(() => {
    return Object.entries(defaultMenuForm)
      .filter(([, menuData]) => menuData.enabled) // 1. Filter menu utama yang aktif
      .map(([menuKey, menuData]) => ({
        title: formatGroupTitle(menuKey), // Format judul grup
        items: Object.entries(menuData.submenus)
          .filter(([, submenuEnabled]) => submenuEnabled) // 2. Filter submenu yang aktif
          .map(([submenuTitle]) => {
            // 3. Buat URL dan tentukan ikon
            let url = `/${toKebabCase(menuKey)}/${toKebabCase(submenuTitle)}`;
            // Kasus khusus untuk dashboard utama
            if (submenuTitle === "Main Dashboard") {
              url = "/";
            }
            return {
              title: submenuTitle,
              url: url,
              icon: iconMap[submenuTitle] || Menu, // Ambil ikon dari map, atau default ke Menu
            };
          }),
      }))
      .filter((group) => group.items.length > 0); // 4. Sembunyikan grup jika tidak ada submenu yang aktif
  }, []); // Dependensi kosong agar hanya berjalan sekali

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Modbo</h1>
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
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
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
  );
}
