// File: components/widgets/ChartBar/ChartBarConfigModal.tsx
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
import { Checkbox } from "@/components/ui/checkbox"; // <-- Import Checkbox
import Swal from "sweetalert2";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoggingConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const ChartBarConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State disederhanakan untuk satu sumber data
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [barColor, setBarColor] = useState("#82ca9d");
  const [units, setUnits] = useState("");
  const [hasAnimation, setHasAnimation] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5"); // dalam menit
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigId(initialConfig.loggingConfigId || null);
      setTimeRange(initialConfig.timeRange || "7d");
      setBarColor(initialConfig.barColor || "#82ca9d");
      setUnits(initialConfig.units || "");
      setHasAnimation(initialConfig.hasAnimation === false ? false : true);
      setRefreshInterval(String(initialConfig.refreshInterval || 5));
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigId(null);
      setTimeRange("7d");
      setBarColor("#82ca9d");
      setUnits("");
      setHasAnimation(true);
      setRefreshInterval("5");
    }

    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          if (!response.ok)
            throw new Error("Failed to fetch logging configurations");
          setLoggingConfigs(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, initialConfig, onClose]);

  const handleSave = () => {
    if (!widgetTitle || !selectedConfigId) {
      Swal.fire(
        "Incomplete",
        "Widget Title and Log Configuration are required.",
        "warning"
      );
      return;
    }
    onSave({
      widgetTitle,
      loggingConfigId: selectedConfigId,
      timeRange,
      barColor,
      units,
      // --- SIMPAN NILAI BARU ---
      hasAnimation,
      refreshInterval: parseInt(refreshInterval, 10),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Bar Chart" : "Configure Bar Chart"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your bar chart widget configuration."
              : "Select a data source and customize the chart's appearance."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Kolom Kiri: Data Source */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Chart Title</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Daily Temperature"
              />
            </div>
            <div className="grid gap-2">
              <Label>Log Configuration</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={setSelectedConfigId}
                  value={selectedConfigId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a log to display" />
                  </SelectTrigger>
                  <SelectContent>
                    {loggingConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={cfg.id}>
                        {cfg.customName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., °C, %"
              />
            </div>
          </div>
          {/* Kolom Kanan: Tampilan */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Time Range</Label>
              <Select onValueChange={setTimeRange} value={timeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Bar Color</Label>
              <Input
                type="color"
                value={barColor}
                onChange={(e) => setBarColor(e.target.value)}
                className="h-10"
              />
            </div>
            {/* --- UI BARU --- */}
            <div className="grid gap-2">
              <Label>Refresh Interval</Label>
              <Select
                onValueChange={setRefreshInterval}
                value={refreshInterval}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Never</SelectItem>
                  <SelectItem value="1">Every 1 Minute</SelectItem>
                  <SelectItem value="5">Every 5 Minutes</SelectItem>
                  <SelectItem value="15">Every 15 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="animation-bar"
                checked={hasAnimation}
                onCheckedChange={(checked) => setHasAnimation(Boolean(checked))}
              />
              <Label htmlFor="animation-bar">Enable Chart Animation</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
