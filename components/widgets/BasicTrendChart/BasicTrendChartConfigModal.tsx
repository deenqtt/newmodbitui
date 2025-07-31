// File: components/widgets/BasicTrendChart/BasicTrendChartConfigModal.tsx
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

interface LoggingConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const BasicTrendChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("24h");
  const [chartColor, setChartColor] = useState("#10b981"); // Warna hijau
  const [units, setUnits] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWidgetTitle("");
      setSelectedConfigId(null);
      setTimeRange("24h");
      setChartColor("#10b981");
      setUnits("");

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
  }, [isOpen, onClose]);

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
      chartColor,
      units,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Basic Trend Chart
          </DialogTitle>
          <DialogDescription>
            Select a data source to display a simple trend chart.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Temperature"
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
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., °C"
              />
            </div>
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
