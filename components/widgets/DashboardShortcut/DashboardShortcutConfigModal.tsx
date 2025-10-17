// File: components/widgets/DashboardShortcut/DashboardShortcutConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk data dashboard dari API
interface DashboardOption {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const DashboardShortcutConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form
  const [shortcutTitle, setShortcutTitle] = useState("");
  const [shortcutType, setShortcutType] = useState<"dashboard" | "custom">("dashboard");
  const [targetDashboardId, setTargetDashboardId] = useState<string | null>(null);
  const [customRoute, setCustomRoute] = useState("");
  const [manualRoute, setManualRoute] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("LayoutDashboard");

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setShortcutTitle("");
      setShortcutType("dashboard");
      setTargetDashboardId(null);
      setCustomRoute("");
      setManualRoute("");
      setSelectedIcon("LayoutDashboard");

      const fetchDashboards = async () => {
        setIsLoading(true);
        try {
          // Kita gunakan API yang sudah ada untuk mengambil daftar dashboard
          const response = await fetch(`${API_BASE_URL}/api/dashboards`);
          if (!response.ok) throw new Error("Failed to fetch dashboards");
          setDashboards(await response.json());
        } catch (error: any) {
          showToast.error("Error", error.message);
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      if (shortcutType === "dashboard") {
        fetchDashboards();
      }
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!shortcutTitle) {
      showToast.warning("Incomplete", "Shortcut Title is required.");
      return;
    }

    if (manualRoute.trim()) {
      // Prioritize manual route if provided
      const route = manualRoute.startsWith('/') ? manualRoute : `/${manualRoute}`;
      onSave({
        shortcutTitle,
        targetType: "custom",
        customRoute: route,
        icon: selectedIcon,
      });
    } else {
      if (shortcutType === "dashboard") {
        if (!targetDashboardId) {
          showToast.warning("Incomplete", "Please select a target dashboard.");
          return;
        }
        onSave({
          shortcutTitle,
          targetType: "dashboard",
          targetDashboardId,
          icon: selectedIcon,
        });
      } else {
        if (!customRoute.trim()) {
          showToast.warning("Incomplete", "Custom route is required.");
          return;
        }
        // Ensure route starts with /
        const route = customRoute.startsWith('/') ? customRoute : `/${customRoute}`;
        onSave({
          shortcutTitle,
          targetType: "custom",
          customRoute: route,
          icon: selectedIcon,
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Dashboard Shortcut
          </DialogTitle>
          <DialogDescription>
            Create a button that links to a dashboard or custom route.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Shortcut Title</Label>
            <Input
              value={shortcutTitle}
              onChange={(e) => setShortcutTitle(e.target.value)}
              placeholder="e.g., Go to Server Room"
            />
          </div>

          <div className="grid gap-2">
            <Label>Shortcut Icon</Label>
            <Select
              onValueChange={setSelectedIcon}
              value={selectedIcon}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LayoutDashboard">Layout Dashboard</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="UserCheck">User Check</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
                <SelectItem value="Shield">Shield</SelectItem>
                <SelectItem value="Key">Key</SelectItem>
                <SelectItem value="Globe">Globe</SelectItem>
                <SelectItem value="Star">Star</SelectItem>
                <SelectItem value="Monitor">Monitor</SelectItem>
                <SelectItem value="Zap">Zap</SelectItem>
                <SelectItem value="Cog">Cog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Shortcut Type</Label>
            <Select
              onValueChange={(value) => {
                setShortcutType(value as "dashboard" | "custom");
                // Reset values when switching types
                setTargetDashboardId(null);
                setCustomRoute("");
                setManualRoute(""); // Reset manual route too
                if (value === "dashboard") {
                  const fetchDashboards = async () => {
                    setIsLoading(true);
                    try {
                      const response = await fetch(`${API_BASE_URL}/api/dashboards`);
                      if (!response.ok) throw new Error("Failed to fetch dashboards");
                      setDashboards(await response.json());
                    } catch (error: any) {
                      showToast.error("Error", error.message);
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  fetchDashboards();
                }
              }}
              value={shortcutType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="custom">Custom Route</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Manual Route (Optional)</Label>
            <Input
              value={manualRoute}
              onChange={(e) => setManualRoute(e.target.value)}
              placeholder="e.g., /management-user or management-user"
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              If provided, this will override the selected dashboard or custom route above. Leading slash (/) will be added automatically if missing.
            </p>
          </div>

          {shortcutType === "dashboard" ? (
            <div className="grid gap-2">
              <Label>Target Dashboard</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={setTargetDashboardId}
                  value={targetDashboardId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dashboard to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Custom Route</Label>
              <Input
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                placeholder="e.g., /management-user or management-user"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Enter the route path. Leading slash (/) will be added automatically if missing.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
