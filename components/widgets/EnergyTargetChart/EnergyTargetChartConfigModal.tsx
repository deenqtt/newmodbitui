// File: components/widgets/EnergyTargetChart/EnergyTargetChartConfigModal.tsx
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
import { Loader2 } from "lucide-react";

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
    year: number;
  };
}

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const EnergyTargetChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Combined saving state

  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || ""
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    initialConfig?.loggingConfigId || null
  );
  const [year, setYear] = useState(
    initialConfig?.year || new Date().getFullYear()
  );
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>(
    {}
  );

  // Fetch daftar log config saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      // Reset state if not in edit mode or if initialConfig changes
      if (!initialConfig) {
        setWidgetTitle("");
        setSelectedConfigId(null);
        setYear(new Date().getFullYear());
      } else {
        setWidgetTitle(initialConfig.widgetTitle);
        setSelectedConfigId(initialConfig.loggingConfigId);
        setYear(initialConfig.year);
      }
      setMonthlyTargets({}); // Always clear and refetch targets based on selected config/year

      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          setLoggingConfigs(await response.json());
        } catch (error) {
          Swal.fire(
            "Error",
            "Failed to fetch logging configurations.",
            "error"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, initialConfig]);

  // Fetch target yang sudah ada saat config atau tahun berubah
  useEffect(() => {
    if (selectedConfigId && year) {
      const fetchTargets = async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/energy-targets?configId=${selectedConfigId}&year=${year}`
          );
          if (res.ok) {
            setMonthlyTargets(await res.json());
          } else {
            setMonthlyTargets({}); // Clear targets if none found or error
          }
        } catch (error) {
          console.error("Failed to fetch energy targets:", error);
          setMonthlyTargets({});
        }
      };
      fetchTargets();
    } else {
      setMonthlyTargets({}); // Clear targets if no config selected or year is invalid
    }
  }, [selectedConfigId, year]);

  const handleTargetChange = (month: string, value: string) => {
    setMonthlyTargets((prev) => ({
      ...prev,
      [month.toLowerCase()]: Number(value) || 0,
    }));
  };

  const handleSave = async () => {
    if (!widgetTitle || !selectedConfigId) {
      Swal.fire(
        "Incomplete",
        "Widget Title and Log Configuration are required.",
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      // First, save the monthly targets
      await fetch(`${API_BASE_URL}/api/energy-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loggingConfigId: selectedConfigId,
          year,
          monthlyTargets,
        }),
      });

      // Then, save the widget configuration
      onSave({
        widgetTitle,
        loggingConfigId: selectedConfigId,
        year,
      });

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: initialConfig ? "Widget updated!" : "Widget added!",
        showConfirmButton: false,
        timer: 1500,
      });
      onClose(); // Close modal after successful save
    } catch (error) {
      Swal.fire("Error", "Failed to save widget or targets.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Energy Target Chart
          </DialogTitle>
          <DialogDescription>
            Select a data source and set the energy targets for each month of
            the year.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Widget Title</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Building A Energy Target"
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
                    <SelectValue placeholder="Select a log source" />
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
              <Label>Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          {selectedConfigId && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-lg font-semibold">
                Monthly Targets (kWh)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {monthLabels.map((month) => (
                  <div key={month} className="grid gap-1.5">
                    <Label htmlFor={`target-${month}`}>{month}</Label>
                    <Input
                      id={`target-${month}`}
                      type="number"
                      placeholder="0"
                      value={monthlyTargets[month.toLowerCase()] || ""}
                      onChange={(e) =>
                        handleTargetChange(month, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={
              isSaving || isLoading || !selectedConfigId || !widgetTitle
            }
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
