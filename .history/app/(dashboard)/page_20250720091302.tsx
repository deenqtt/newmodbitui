"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function OverviewDashboard() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Modbo Monitoring System</h1>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm"></Button>
        </div>
      </header>
    </SidebarInset>
  );
}
