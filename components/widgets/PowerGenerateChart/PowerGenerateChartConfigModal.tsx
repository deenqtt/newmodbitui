// File: components/widgets/PowerGenerateChart/PowerGenerateChartConfigModal.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
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
  initialConfig?: {
    widgetTitle: string;
    loggingConfigId: string;
    units: string;
    timeRange: string;
    chartColor: string;
    hasAnimation: boolean;
    refreshInterval: number;
  };
}

export const PowerGenerateChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || ""
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    initialConfig?.loggingConfigId || null
  );
  const [units, setUnits] = useState(initialConfig?.units || "kW");
  const [timeRange, setTimeRange] = useState(initialConfig?.timeRange || "24h");
  const [chartColor, setChartColor] = useState(
    initialConfig?.chartColor || "#22c55e"
  ); // Warna hijau
  const [hasAnimation, setHasAnimation] = useState(
    initialConfig?.hasAnimation ?? true
  );
  const [refreshInterval, setRefreshInterval] = useState(
    String(initialConfig?.refreshInterval) || "5"
  );

  useEffect(() => {
    if (isOpen) {
      // Set initial values if in edit mode, otherwise reset
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setSelectedConfigId(initialConfig.loggingConfigId);
        setUnits(initialConfig.units);
        setTimeRange(initialConfig.timeRange);
        setChartColor(initialConfig.chartColor);
        setHasAnimation(initialConfig.hasAnimation);
        setRefreshInterval(String(initialConfig.refreshInterval));
      } else {
        setWidgetTitle("");
        setSelectedConfigId(null);
        setUnits("kW");
        setTimeRange("24h");
        setChartColor("#22c55e");
        setHasAnimation(true);
        setRefreshInterval("5");
      }

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
  }, [isOpen, onClose, initialConfig]);

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
      units,
      timeRange,
      chartColor,
      hasAnimation,
      refreshInterval: parseInt(refreshInterval, 10),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Power Generate Chart
          </DialogTitle>
          <DialogDescription>
            Select a data source and customize the chart's appearance.
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
                placeholder="e.g., Genset A Power Output"
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
                placeholder="e.g., kW, MW"
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
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Chart Color</Label>
              <Input
                type="color"
                value={chartColor}
                onChange={(e) => setChartColor(e.target.value)}
                className="h-10"
              />
            </div>
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
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="animation-power"
                checked={hasAnimation}
                onCheckedChange={(checked) => setHasAnimation(Boolean(checked))}
              />
              <Label htmlFor="animation-power">Enable Animation</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={isLoading || !widgetTitle || !selectedConfigId}
          >
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
