// File: components/widgets/MultiSeriesChart/MultiSeriesChartConfigModal.tsx
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
import { PlusCircle, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap data series (chartType dihilangkan)
interface DataSeries {
  id: string; // ID unik sementara
  name: string;
  loggingConfigId: string | null;
  color: string;
}

interface LoggingConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const MultiSeriesChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("");
  const [series, setSeries] = useState<DataSeries[]>([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [hasAnimation, setHasAnimation] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  // --- PERUBAHAN: State untuk chartType dipindah ke sini ---
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("line");

  useEffect(() => {
    if (isOpen) {
      setWidgetTitle("");
      setSeries([]);
      addSeries(); // Mulai dengan satu series
      setTimeRange("24h");
      setHasAnimation(true);
      setRefreshInterval("5");
      setChartType("line"); // Reset chartType

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

  const getRandomColor = () =>
    `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;

  const addSeries = () => {
    setSeries((prev) => [
      ...prev,
      {
        id: `series-${Date.now()}`,
        name: "",
        loggingConfigId: null,
        color: getRandomColor(),
      },
    ]);
  };

  const removeSeries = (id: string) => {
    if (series.length > 1) {
      setSeries((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const updateSeries = (id: string, field: keyof DataSeries, value: any) => {
    setSeries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = () => {
    if (!widgetTitle || series.length === 0) {
      Swal.fire(
        "Incomplete",
        "Widget title and at least one data series are required.",
        "warning"
      );
      return;
    }
    for (const s of series) {
      if (!s.name || !s.loggingConfigId) {
        Swal.fire(
          "Incomplete",
          `Please complete all fields for all data series.`,
          "warning"
        );
        return;
      }
    }
    onSave({
      widgetTitle,
      timeRange,
      hasAnimation,
      refreshInterval: parseInt(refreshInterval, 10),
      chartType, // --- PERUBAHAN: Simpan chartType global ---
      series: series.map(({ id, ...rest }) => rest),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Multi-Series Chart
          </DialogTitle>
          <DialogDescription>
            Add and configure multiple data series to display in one chart.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh]">
          {/* Kolom Kiri: Konfigurasi Global */}
          <div className="md:col-span-1 space-y-4">
            <div className="grid gap-2">
              <Label>Chart Title</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Environment Monitoring"
              />
            </div>
            {/* --- PERUBAHAN: Pilihan Chart Type dipindah ke sini --- */}
            <div className="grid gap-2">
              <Label>Chart Type</Label>
              <Select
                onValueChange={(value) => setChartType(value as any)}
                value={chartType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                id="anim-multi"
                checked={hasAnimation}
                onCheckedChange={(checked) => setHasAnimation(Boolean(checked))}
              />
              <Label htmlFor="anim-multi">Enable Animation</Label>
            </div>
          </div>

          {/* Kolom Kanan: Konfigurasi Series */}
          <div className="md:col-span-2 space-y-4 overflow-y-auto pr-2">
            {series.map((s) => (
              <div
                key={s.id}
                className="p-4 border rounded-lg bg-muted/50 space-y-4 relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => removeSeries(s.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid gap-2">
                  <Label>Series Name</Label>
                  <Input
                    value={s.name}
                    onChange={(e) => updateSeries(s.id, "name", e.target.value)}
                    placeholder="e.g., Temperature"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Log Configuration</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        updateSeries(s.id, "loggingConfigId", value)
                      }
                      value={s.loggingConfigId || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a log" />
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
                {/* --- PERUBAHAN: Pilihan Chart Type per series dihapus --- */}
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={s.color}
                    onChange={(e) =>
                      updateSeries(s.id, "color", e.target.value)
                    }
                    className="h-10"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addSeries} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Data Series
            </Button>
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
