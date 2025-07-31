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
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>(
    {}
  );
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Fetch daftar log config saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setWidgetTitle("");
      setSelectedConfigId(null);
      setYear(new Date().getFullYear());
      setMonthlyTargets({});

      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          setLoggingConfigs(await response.json());
        } catch (error) {
          /* handle error */
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen]);

  // Fetch target yang sudah ada saat config atau tahun berubah
  useEffect(() => {
    if (selectedConfigId && year) {
      const fetchTargets = async () => {
        const res = await fetch(
          `${API_BASE_URL}/api/energy-targets?configId=${selectedConfigId}&year=${year}`
        );
        if (res.ok) {
          setMonthlyTargets(await res.json());
        }
      };
      fetchTargets();
    }
  }, [selectedConfigId, year]);

  const handleTargetChange = (month: string, value: string) => {
    setMonthlyTargets((prev) => ({
      ...prev,
      [month.toLowerCase()]: Number(value) || 0,
    }));
  };

  const handleSaveTargets = async () => {
    if (!selectedConfigId) return;
    setIsSavingTargets(true);
    try {
      await fetch(`${API_BASE_URL}/api/energy-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loggingConfigId: selectedConfigId,
          year,
          monthlyTargets,
        }),
      });
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Targets saved!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to save targets.", "error");
    } finally {
      setIsSavingTargets(false);
    }
  };

  const handleSaveWidget = () => {
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
      year,
    });
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
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">
                  Monthly Targets (kWh)
                </Label>
                <Button onClick={handleSaveTargets} disabled={isSavingTargets}>
                  {isSavingTargets && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Targets
                </Button>
              </div>
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSaveWidget}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
