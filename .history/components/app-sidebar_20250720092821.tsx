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
import { useState } from "react";
import { Sidebar, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";

// Data menu dan icon grup
const groupIconMap = {
  Monitoring: LayoutDashboard,
  Devices: HardDrive,
  SystemConfig: Cog,
  SecurityAccess: ShieldCheck,
  Network: Network,
  Automation: Bot,
  Alarms: AlarmClock,
  VoiceRecognition: Mic,
  Analytics: BarChart3,
};

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

export function AppSidebar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState(null);

  const groups = Object.entries(defaultMenuForm).filter(
    ([, menuData]) => menuData.enabled
  );

  return (
    <Sidebar className="w-16 flex flex-col items-center">
      <SidebarHeader className="border-b px-2 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
        </div>
      </SidebarHeader>
      <div className="flex-1 flex flex-col items-center gap-4 mt-4">
        {groups.map(([groupKey, groupData]) => {
          const GroupIcon = groupIconMap[groupKey] || Menu;
          return (
            <div
              key={groupKey}
              className="relative group"
              onMouseEnter={() => setOpenGroup(groupKey)}
              onMouseLeave={() => setOpenGroup(null)}
            >
              <button
                className={`p-2 rounded-lg hover:bg-primary/20 ${
                  openGroup === groupKey ? "bg-primary/10" : ""
                }`}
                aria-label={groupKey}
              >
                <GroupIcon className="h-6 w-6" />
              </button>
              {openGroup === groupKey && (
                <div className="absolute left-12 top-1 z-20 min-w-max bg-white shadow-lg rounded-lg p-2 flex flex-col">
                  {Object.entries(groupData.submenus)
                    .filter(([, enabled]) => enabled)
                    .map(([submenuTitle]) => {
                      let url = `/${toKebabCase(groupKey)}/${toKebabCase(
                        submenuTitle
                      )}`;
                      if (submenuTitle === "Main Dashboard") url = "/";
                      const SubIcon = iconMap[submenuTitle] || Menu;
                      return (
                        <Link
                          key={submenuTitle}
                          href={url}
                          className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/10 ${
                            pathname === url
                              ? "bg-primary/10 font-semibold"
                              : ""
                          }`}
                        >
                          <SubIcon className="h-4 w-4" />
                          <span className="whitespace-nowrap text-sm">
                            {submenuTitle}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
