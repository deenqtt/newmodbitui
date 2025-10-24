// File: components/widgets/DashboardShortcut/DashboardShortcutWidget.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ArrowRight } from "lucide-react";

interface Props {
  config: {
    shortcutTitle: string;
    targetDashboardId: string;
  };
}

export const DashboardShortcutWidget = ({ config }: Props) => {
  const router = useRouter();

  const handleClick = () => {
    // Navigasi ke halaman view dashboard yang dipilih (read-only mode)
    if (config.targetDashboardId) {
      router.push(`/view-dashboard/${config.targetDashboardId}`);
    }
  };

  return (
    <div
      className="w-full h-full min-h-[120px] flex items-center justify-center p-3 sm:p-4 lg:p-6 cursor-pointer group
                 bg-card
                 border border-border/60 rounded-xl
                 shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 group hover:scale-[1.01] transform-gpu"
     
    >
      <div  onClick={handleClick}>

      <div className="text-center w-full max-w-full overflow-hidden">
        {/* Icon Container - Responsive sizing */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 
          mx-auto mb-2 sm:mb-3 lg:mb-4
          bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 
          rounded-full flex items-center justify-center 
          transition-all duration-300 ease-out
          group-hover:bg-blue-100 dark:group-hover:bg-blue-900
          group-hover:scale-110 group-hover:rotate-3
          border-2 border-blue-100 dark:border-blue-800 
          group-hover:border-blue-200 dark:group-hover:border-blue-700"
          >
          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-8 lg:h-8" />
        </div>

        {/* Title - Responsive text sizing and truncation */}
        <h3
          className="font-semibold text-sm sm:text-base lg:text-lg 
          text-gray-900 dark:text-gray-100
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
          <span className="whitespace-nowrap">View Dashboard</span>
          <ArrowRight
            className="w-3 h-3 sm:w-4 sm:h-4 
            transition-transform duration-300 ease-out 
                                 group-hover:translate-x-1"
                                 />
                                 </div>
        </div>
      </div>
    </div>
  );
};
