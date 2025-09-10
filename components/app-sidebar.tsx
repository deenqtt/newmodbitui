// File: app-sidebar.tsx

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
  Wrench,
  LogOut,
  User,
  Loader2,
  NetworkIcon,
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- Type Definitions ---
interface Submenus {
  [key: string]: boolean;
}
interface MenuConfigData {
  [key: string]: { enabled: boolean; submenus: Submenus };
}

const defaultMenuConfig: MenuConfigData = {
  Monitoring: { enabled: true, submenus: { "Main Dashboard": true } },
  Devices: {
    enabled: true,
    submenus: {
      "Devices Internal": true,
      "Devices External": true,
      "Devices for Logging": true,
      "Access Controllers": true,
      Zigbee: true,
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
      Gateways: true,
      "EC25-Modem": true,
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
  Maintenance: {
    enabled: true,
    submenus: { "Schedule Management": true, "Task Reports": true },
  },
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
  "Maintenance",
];

const submenuOrder: { [key: string]: string[] } = {
  Devices: [
    "Devices Internal",
    "Devices External",
    "Devices for Logging",
    "Access Controllers",
    "Zigbee",
  ],
  SystemConfig: [
    "User Management",
    "Power Analyzer",
    "Menu Display",
    "System Backup",
  ],
  LoRaWAN: ["Device List", "Device Profiles", "Applications"],
  SecurityAccess: ["Device Access", "Surveillance CCTV"],
  Network: ["Communication Setup", "Register SNMP", "MQTT Broker"],
  Automation: [
    "Automated Scheduling",
    "Smart Logic Automation",
    "Voice Command",
    "Automation Values",
    "Dynamic Payload",
    "Static Payload",
  ],
  Alarms: ["Alarm Management", "Alarm Log Reports"],
  VoiceRecognition: ["Relay Control", "Relay STT"],
  Maintenance: ["Schedule Management", "Task Reports"],
};

const iconMap: { [key: string]: React.ElementType } = {
  "Main Dashboard": LayoutDashboard,
  "Devices Internal": HardDrive,
  "Devices External": HardDrive,
  "Devices for Logging": HardDrive,
  "Access Controllers": Lock,
  Zigbee: NetworkIcon,
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
  "Schedule Management": Wrench,
  "Task Reports": History,
};

const toKebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const formatGroupTitle = (key: string) => key.replace(/([A-Z])/g, " $1").trim();

function SidebarUser() {
  const { user, logout, isLoading } = useAuth();
  const getInitials = (email: string) =>
    email ? email.charAt(0).toUpperCase() : "?";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src="#" alt="User Avatar" />
          <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium leading-none truncate">
            {user.email}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.role}</p>
        </div>
      </div>
      {/* Separator dipindahkan ke sini */}
      <Separator className="my-3" />
      <Button
        variant="ghost"
        className="w-full justify-start rounded-lg text-red-500 bg-red-100 hover:bg-red-300 hover:text-red-600"
        onClick={logout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}

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
    return menuOrder
      .map((menuKey) => {
        const menuData = menuConfig[menuKey];
        if (!menuData || !menuData.enabled) {
          return null;
        }
        return {
          title: formatGroupTitle(menuKey as string),
          items: Object.entries(menuData.submenus)
            .filter(([, submenuEnabled]) => submenuEnabled)
            .sort(([submenuTitleA], [submenuTitleB]) => {
              const orderArray = submenuOrder[menuKey as string] || [];
              return (
                orderArray.indexOf(submenuTitleA) -
                orderArray.indexOf(submenuTitleB)
              );
            })
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
        };
      })
      .filter(
        (group): group is { title: string; items: any[] } =>
          group !== null && group.items.length > 0
      );
  }, [menuConfig]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Modbo</h1>
            <p className="text-xs text-muted-foreground">Monitoring Platform</p>
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
      <SidebarFooter className="mt-auto">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
