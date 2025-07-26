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
  // --- BARU: Ikon untuk tombol toggle ---
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// --- BARU: Import useState ---
import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter, // <-- Mungkin perlu di-import jika ada
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; // <-- Import Button untuk toggle

// ... (defaultMenuForm, iconMap, dan helper functions tetap sama)
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
const toKebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
const formatGroupTitle = (key) => key.replace(/([A-Z])/g, " $1").trim();

export function AppSidebar() {
  const pathname = usePathname();
  // --- LANGKAH 1: Tambahkan state untuk kontrol ---
  const [isCollapsed, setIsCollapsed] = useState(false); // Defaultnya melebar

  const navigation = useMemo(() => {
    // ... (logika ini tidak berubah)
    return Object.entries(defaultMenuForm)
      .filter(([, menuData]) => menuData.enabled)
      .map(([menuKey, menuData]) => ({
        title: formatGroupTitle(menuKey),
        items: Object.entries(menuData.submenus)
          .filter(([, submenuEnabled]) => submenuEnabled)
          .map(([submenuTitle]) => {
            let url = `/${toKebabCase(menuKey)}/${toKebabCase(submenuTitle)}`;
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
      .filter((group) => group.items.length > 0);
  }, []);

  return (
    // --- LANGKAH 3: Berikan prop `isCollapsed` ke Sidebar ---
    <Sidebar isCollapsed={isCollapsed}>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          {" "}
          {/* Diubah ke justify-between */}
          {/* Logo dan Judul */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            {/* Tampilkan teks hanya jika sidebar tidak diciutkan */}
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-semibold">Modbo</h1>
                <p className="text-xs text-muted-foreground">
                  Recognition Platform
                </p>
              </div>
            )}
          </div>
          {/* --- LANGKAH 2: Tombol Toggle --- */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            {!isCollapsed && ( // Hanya tampilkan label grup jika sidebar tidak diciutkan
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && ( // Hanya tampilkan teks item jika sidebar tidak diciutkan
                          <span>{item.title}</span>
                        )}
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
