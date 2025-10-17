// File: components/widgets/DashboardShortcut/DashboardShortcutWidget.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";

interface Props {
  config: {
    shortcutTitle: string;
    targetType: "dashboard" | "custom";
    targetDashboardId?: string;
    customRoute?: string;
    icon?: string;
  };
}

export const DashboardShortcutWidget = ({ config }: Props) => {
  const router = useRouter();
  const IconComponent = (Icons as any)[config.icon || 'LayoutDashboard'] || Icons.LayoutDashboard;

  const handleClick = () => {
    if (config.targetType === "dashboard" && config.targetDashboardId) {
      router.push(`/view-dashboard/${config.targetDashboardId}`);
    } else if (config.targetType === "custom" && config.customRoute) {
      router.push(config.customRoute);
    }
  };

  const getSubtitle = () => {
    if (config.targetType === "dashboard") {
      return "View Dashboard";
    } else if (config.targetType === "custom") {
      return "Open Link";
    }
    return "Navigate";
  };

  return (
    <div
      className="w-full h-full min-h-[120px] flex items-center justify-center p-3 sm:p-4 lg:p-6 cursor-default group
                 bg-card hover:bg-accent/50 dark:hover:bg-accent/10
                 border border-border hover:border-border
                 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out
                 transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="text-center w-full max-w-full overflow-hidden cursor-pointer" >
        {/* Icon Container - Responsive sizing */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16
                        mx-auto mb-2 sm:mb-3 lg:mb-4
                        bg-accent text-accent-foreground
                        rounded-full flex items-center justify-center
                        transition-all duration-300 ease-out
                        group-hover:bg-accent group-hover:scale-110 group-hover:rotate-3
                        border-2 border-border group-hover:border-primary"
        onClick={handleClick}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 lg:w-8 lg:h-8" />
        </div>

        {/* Title - Responsive text sizing and truncation */}
        <h3
          className="font-semibold text-sm sm:text-base lg:text-lg
                       text-foreground
                       mb-1 sm:mb-2 leading-tight
                       truncate px-1 cursor-pointer"
          onClick={handleClick}
        >
          {config.shortcutTitle}
        </h3>

        {/* Subtitle with arrow - Responsive and smooth animation */}
        <div
          className="flex items-center justify-center gap-1
                        text-xs sm:text-sm text-muted-foreground
                        transition-all duration-300 ease-out
                        group-hover:text-primary
                        group-hover:translate-x-1 cursor-pointer"
          onClick={handleClick}
        >
          <span className="whitespace-nowrap">{getSubtitle()}</span>
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
