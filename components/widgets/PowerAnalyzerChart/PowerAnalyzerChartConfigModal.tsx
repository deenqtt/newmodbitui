// File: components/widgets/PowerAnalyzerChart/PowerAnalyzerChartConfigModal.tsx
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

interface BillConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const PowerAnalyzerChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [billConfigs, setBillConfigs] = useState<BillConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedBillConfigId, setSelectedBillConfigId] = useState<
    string | null
  >(null);
  const [chartType, setChartType] = useState("line");
  const [timeRange, setTimeRange] = useState("24h");
  const [color, setColor] = useState("#8884d8");
  const [hasAnimation, setHasAnimation] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setWidgetTitle("");
      setSelectedBillConfigId(null);
      setChartType("line");
      setTimeRange("24h");
      setColor("#8884d8");
      setHasAnimation(true);
      setRefreshInterval("5");

      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/bill-configs`);
          if (!response.ok)
            throw new Error("Failed to fetch bill configurations");
          setBillConfigs(await response.json());
          // --- PERBAIKAN: Menambahkan { setelah catch ---
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
    if (!widgetTitle || !selectedBillConfigId) {
      Swal.fire("Incomplete", "All fields are required.", "warning");
      return;
    }
    onSave({
      widgetTitle,
      billConfigId: selectedBillConfigId,
      chartType,
      timeRange,
      color,
      hasAnimation,
      refreshInterval: parseInt(refreshInterval, 10),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Power Analyzer Chart
          </DialogTitle>
          <DialogDescription>
            Select a bill configuration and customize the chart.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Kolom Kiri */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Chart Title</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Main Power Cost"
              />
            </div>
            <div className="grid gap-2">
              <Label>Bill Configuration</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={setSelectedBillConfigId}
                  value={selectedBillConfigId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bill log source" />
                  </SelectTrigger>
                  <SelectContent>
                    {billConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={cfg.id}>
                        {cfg.customName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {/* Kolom Kanan */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Chart Type</Label>
                <Select onValueChange={setChartType} value={chartType}>
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
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Base Color</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
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
                  <SelectItem value="5">Every 5 Minutes</SelectItem>
                  <SelectItem value="15">Every 15 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="anim-pa"
                checked={hasAnimation}
                onCheckedChange={(checked) => setHasAnimation(Boolean(checked))}
              />
              <Label htmlFor="anim-pa">Enable Animation</Label>
            </div>
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
