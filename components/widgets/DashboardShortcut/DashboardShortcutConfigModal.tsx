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
import Swal from "sweetalert2";

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
  const [targetDashboardId, setTargetDashboardId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setShortcutTitle("");
      setTargetDashboardId(null);

      const fetchDashboards = async () => {
        setIsLoading(true);
        try {
          // Kita gunakan API yang sudah ada untuk mengambil daftar dashboard
          const response = await fetch(`${API_BASE_URL}/api/dashboards`);
          if (!response.ok) throw new Error("Failed to fetch dashboards");
          setDashboards(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchDashboards();
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!shortcutTitle || !targetDashboardId) {
      Swal.fire(
        "Incomplete",
        "Shortcut Title and a target dashboard are required.",
        "warning"
      );
      return;
    }
    onSave({
      shortcutTitle,
      targetDashboardId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Dashboard Shortcut
          </DialogTitle>
          <DialogDescription>
            Create a button that links to another dashboard.
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
