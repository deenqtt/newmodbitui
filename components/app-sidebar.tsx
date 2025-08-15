"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
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
} from "@/components/ui/sidebar";

// --- Type Definitions ---
interface Submenus {
  [key: string]: boolean;
}
interface MenuConfigData {
  [key: string]: { enabled: boolean; submenus: Submenus };
}

// Data menu default sebagai fallback
const defaultMenuConfig: MenuConfigData = {
  Monitoring: { enabled: true, submenus: { "Main Dashboard": true } },
  Devices: {
    enabled: true,
    submenus: {
      "Devices Internal": true,
      "Devices External": true,
      "Devices for Logging": true,
      "Access Controllers": true,
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
  LoRaWAN: {
    enabled: true,
    submenus: {
      "Device List": true,
      "Device Profiles": true,
      Applications: true,
    },
  },
  SecurityAccess: {
    enabled: true,
    submenus: { "Device Access": true, "Surveillance CCTV": true },
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
    submenus: { "Alarm Management": true, "Alarm Log Reports": true },
  },
  VoiceRecognition: {
    enabled: true,
    submenus: { "Relay Control": true, "Relay STT": true },
  },
  Analytics: { enabled: true, submenus: { "Devices Log Report": true } },
};
const menuOrder = [
  "Monitoring",
  "Devices",
  "SystemConfig",
  "LoRaWAN",
  "SecurityAccess",
  "Network",
  "Automation",
  "Alarms",
  "VoiceRecognition",
  "Analytics",
];

// Pemetaan dari nama submenu ke komponen ikon
const iconMap: { [key: string]: React.ElementType } = {
  "Main Dashboard": LayoutDashboard,
  "Devices Internal": HardDrive,
  "Devices External": HardDrive,
  "Devices for Logging": HardDrive,
  "Access Controllers": Lock,
  "Device List": ListTree,
  "Device Profiles": Package,
  Applications: GitBranch,
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
const toKebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

// Helper function untuk memformat judul grup menu
const formatGroupTitle = (key: string) => key.replace(/([A-Z])/g, " $1").trim();

export function AppSidebar() {
  const pathname = usePathname();

  const [menuConfig, setMenuConfig] =
    useState<MenuConfigData>(defaultMenuConfig);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get<MenuConfigData | null>(
          "/api/menu-configuration"
        );
        if (data) {
          setMenuConfig(data);
        }
      } catch (error) {
        console.error(
          "Could not fetch menu configuration, using default.",
          error
        );
      }
    };
    fetchConfig();
  }, []);

  const navigation = useMemo(() => {
    // 1. Mulai dari array 'menuOrder' yang sudah pasti urutannya
    return (
      menuOrder
        .map((menuKey) => {
          // 2. Ambil data menu dari state 'menuConfig' berdasarkan urutan 'menuKey'
          const menuData = menuConfig[menuKey];
          // 3. Kembalikan array [key, data] agar strukturnya mirip Object.entries
          return [menuKey, menuData];
        })
        // 4. Proses filter dan map selanjutnya tidak perlu diubah
        .filter(([, menuData]) => menuData && menuData.enabled)
        .map(([menuKey, menuData]) => ({
          title: formatGroupTitle(menuKey as string),
          items: Object.entries((menuData as any).submenus)
            .filter(([, submenuEnabled]) => submenuEnabled)
            .map(([submenuTitle]) => {
              let url = `/${toKebabCase(menuKey as string)}/${toKebabCase(
                submenuTitle
              )}`;
              if (submenuTitle === "Main Dashboard") {
                url = "/";
              }
              return {
                title: submenuTitle,
                url: url,
                icon: iconMap[submenuTitle] || Menu,
              };
            }),
        }))
        .filter((group) => group.items.length > 0)
    );
  }, [menuConfig]); // Dependensi tetap 'menuConfig'

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
    </Sidebar>
  );
}
