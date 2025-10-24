// File: components/widgets/DashboardShortcut/DashboardShortcutWidget.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRight,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
};

interface Props {
  config: {
    shortcutTitle: string;
    targetType?: "dashboard" | "custom" | "manual";
    targetDashboardId?: string;
    customRoute?: string;
    icon?: string;
  };
}

export const DashboardShortcutWidget = ({ config }: Props) => {
  const router = useRouter();

  // Get icon component from config or fallback to LayoutDashboard
  const IconComponent = config.icon && iconMap[config.icon]
    ? iconMap[config.icon]
    : LayoutDashboard;

  const handleClick = () => {
    const targetType = config.targetType || "dashboard";

    if (targetType === "dashboard" && config.targetDashboardId) {
      // Navigate to view dashboard (read-only mode)
      router.push(`/view-dashboard/${config.targetDashboardId}`);
    } else if ((targetType === "custom" || targetType === "manual") && config.customRoute) {
      // Navigate to custom/manual route
      router.push(config.customRoute);
    } else {
      console.warn("Dashboard Shortcut: No valid target configured");
    }
  };

  // If no config, show placeholder
  if (!config || !config.shortcutTitle) {
    return (
      <div className="w-full h-full min-h-[120px] flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure shortcut</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full min-h-[120px] flex items-center justify-center p-3 sm:p-4 lg:p-6 cursor-pointer group
                 bg-card
                 border border-border/60 rounded-xl
                 shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 group hover:scale-[1.01] transform-gpu"
      onClick={handleClick}
    >
      <div className="text-center w-full max-w-full overflow-hidden">
        {/* Icon Container - Responsive sizing */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16
                        mx-auto mb-2 sm:mb-3 lg:mb-4
                        bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300
                        rounded-full flex items-center justify-center
                        transition-all duration-300 ease-out
                        group-hover:bg-slate-200 dark:group-hover:bg-slate-600
                        group-hover:scale-110 group-hover:rotate-3
                        border-2 border-slate-200 dark:border-slate-600
                        group-hover:border-slate-300 dark:group-hover:border-slate-500"
        >
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 lg:w-8 lg:h-8" />
        </div>

        {/* Title - Responsive text sizing and truncation */}
        <h3
          className="font-semibold text-sm sm:text-base lg:text-lg
                       text-slate-700 dark:text-slate-300
                       mb-1 sm:mb-2 leading-tight
                       truncate px-1"
        >
          {config.shortcutTitle}
        </h3>

        {/* Subtitle with arrow - Responsive and smooth animation */}
        <div
          className="flex items-center justify-center gap-1 
                        text-xs sm:text-sm text-gray-500 dark:text-gray-400
                        transition-all duration-300 ease-out
                        group-hover:text-blue-600 dark:group-hover:text-blue-400
                        group-hover:translate-x-1"
        >
          <span className="whitespace-nowrap">
            {(config.targetType || "dashboard") === "dashboard"
              ? "View Dashboard"
              : "Go to Page"}
          </span>
          <ArrowRight
            className="w-3 h-3 sm:w-4 sm:h-4 
                                 transition-transform duration-300 ease-out 
                                 group-hover:translate-x-1"
          />
        </div>
      </div>
    </div>
  );
};
