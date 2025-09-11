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
  Router,
  Smartphone,
  ChevronRight,
  Dot,
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
import { Badge } from "@/components/ui/badge";

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

// Reorder menu untuk flow yang lebih logis
const menuOrder = [
  "Monitoring",
  "Devices",
  "LoRaWAN",
  "Network",
  "SecurityAccess",
  "Automation",
  "Alarms",
  "VoiceRecognition",
  "Analytics",
  "Maintenance", // Dipindahkan ke bagian akhir sebelum system config
  "SystemConfig",
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
  LoRaWAN: [
    "Device List",
    "Device Profiles",
    "Applications",
    "Gateways",
    "EC25-Modem",
  ],
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

// Enhanced icon mapping with more appropriate icons
const iconMap: { [key: string]: React.ElementType } = {
  "Main Dashboard": LayoutDashboard,
  "Devices Internal": HardDrive,
  "Devices External": Package,
  "Devices for Logging": FileText,
  "Access Controllers": Lock,
  Zigbee: NetworkIcon,
  "Device List": ListTree,
  "Device Profiles": Package,
  Applications: GitBranch,
  Gateways: Router,
  "EC25-Modem": Smartphone,
  "User Management": Users,
  "Power Analyzer": Power,
  "Menu Display": Menu,
  "System Backup": DatabaseBackup,
  "Device Access": ShieldCheck,
  "Surveillance CCTV": Cctv,
  "Communication Setup": Settings2,
  "Register SNMP": Network,
  "MQTT Broker": GitBranch,
  "Automated Scheduling": CalendarClock,
  "Smart Logic Automation": Bot,
  "Voice Command": Voicemail,
  "Automation Values": DatabaseZap,
  "Dynamic Payload": Package,
  "Static Payload": Package,
  "Alarm Management": AlarmClock,
  "Alarm Log Reports": History,
  "Relay Control": Power,
  "Relay STT": Mic,
  "Devices Log Report": BarChart3,
  "Schedule Management": CalendarClock,
  "Task Reports": FileText,
};

// Group icon mapping
const groupIconMap: { [key: string]: React.ElementType } = {
  Monitoring: LayoutDashboard,
  Devices: HardDrive,
  LoRaWAN: Router,
  SystemConfig: Cog,
  SecurityAccess: ShieldCheck,
  Network: Network,
  Automation: Bot,
  Alarms: AlarmClock,
  VoiceRecognition: Mic,
  Analytics: BarChart3,
  Maintenance: Wrench,
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
        <Avatar className="h-10 w-10 ring-2 ring-sidebar-border">
          <AvatarImage src="#" alt="User Avatar" />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {getInitials(user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-semibold leading-none truncate text-sidebar-foreground">
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        onClick={logout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
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

        const GroupIcon = groupIconMap[menuKey] || Menu;

        return {
          title: formatGroupTitle(menuKey as string),
          icon: GroupIcon,
          key: menuKey,
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
                isActive: pathname === url,
              };
            }),
        };
      })
      .filter(
        (
          group
        ): group is {
          title: string;
          icon: React.ElementType;
          key: string;
          items: any[];
        } => group !== null && group.items.length > 0
      );
  }, [menuConfig, pathname]);

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              UniBoard
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Universal Monitoring Dashboard
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {navigation.map((group, groupIndex) => {
          const GroupIcon = group.icon;
          return (
            <SidebarGroup key={group.key} className="mb-6">
              <SidebarGroupLabel className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <GroupIcon className="h-4 w-4" />
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.isActive}
                          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md"
                        >
                          <Link
                            href={item.url}
                            className="flex items-center gap-3 w-full"
                          >
                            <ItemIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.title}</span>
                            {item.isActive && (
                              <div className="ml-auto">
                                <Dot className="h-4 w-4" />
                              </div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
