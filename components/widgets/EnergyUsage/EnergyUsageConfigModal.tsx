// File: components/widgets/EnergyUsage/EnergyUsageConfigModal.tsx
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
  // Properti untuk membedakan 'last_month' dan 'current_month'
  period: "last_month" | "current_month";
  title: string;
}

export const EnergyUsageConfigModal = ({
  isOpen,
  onClose,
  onSave,
  period,
  title,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [units, setUnits] = useState("kWh");
  const [multiply, setMultiply] = useState("1");

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setWidgetTitle("");
      setSelectedConfigId(null);
      setUnits("kWh");
      setMultiply("1");

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
      Swal.fire("Incomplete", "Please fill all required fields.", "warning");
      return;
    }
    onSave({
      widgetTitle,
      loggingConfigId: selectedConfigId,
      units,
      multiply: parseFloat(multiply) || 1,
      period, // Simpan periode yang sesuai
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            Select a pre-defined logging configuration to calculate energy
            usage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Gedung A - Last Month"
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
                  <SelectValue placeholder="Select a log to track" />
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
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kWh"
              />
            </div>
            <div className="grid gap-2">
              <Label>Multiplier</Label>
              <Input
                type="number"
                value={multiply}
                onChange={(e) => setMultiply(e.target.value)}
              />
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
