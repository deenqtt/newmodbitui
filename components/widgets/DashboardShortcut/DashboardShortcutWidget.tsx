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
    // Navigasi ke halaman editor dashboard yang dipilih
    if (config.targetDashboardId) {
      router.push(`/dashboard/${config.targetDashboardId}`);
    }
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 cursor-pointer group bg-gradient-to-br from-background to-muted/50 hover:to-muted transition-all"
      onClick={handleClick}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border-2 border-primary/20">
          <LayoutDashboard className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-primary">
          {config.shortcutTitle}
        </h3>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 transition-transform group-hover:translate-x-1">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </p>
      </div>
    </div>
  );
};
