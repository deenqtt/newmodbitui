// File: components/widgets/SldContainer/SldContainerConfigModal.tsx
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

// Definisikan komponen-komponen di dalam SLD yang bisa dihubungkan ke data
const diagramComponents = [
  { id: "mainPower", name: "Main Power Line" },
  { id: "gensetPower", name: "Genset Power Line" },
  { id: "breaker1", name: "Breaker 1 Status" },
  { id: "breaker2", name: "Breaker 2 Status" },
  { id: "outputLoad", name: "Output Load Value" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

// --- DATA DUMMY ---
const createDummyLoggingConfigs = (): LoggingConfig[] => {
  return [
    { id: "log_1", customName: "PLN - Status ON/OFF" },
    { id: "log_2", customName: "Genset - Status ON/OFF" },
    { id: "log_3", customName: "Breaker Panel A - Status" },
    { id: "log_4", customName: "Breaker Panel B - Status" },
    { id: "log_5", customName: "Total Load Output (kW)" },
    { id: "log_6", customName: "Room Temperature" },
  ];
};

export const SldContainerConfigModal = ({ isOpen, onClose, onSave }: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("SLD Container");
  // State untuk menyimpan hubungan antara komponen diagram dan log config
  const [bindings, setBindings] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (isOpen) {
      setWidgetTitle("SLD Container");
      setBindings({});

      // --- PERUBAHAN: Gunakan data dummy ---
      const loadDummyData = () => {
        setIsLoading(true);
        setTimeout(() => {
          setLoggingConfigs(createDummyLoggingConfigs());
          setIsLoading(false);
        }, 500); // Simulasi loading
      };
      loadDummyData();

      /*
      // Kode asli untuk mengambil data dari API (bisa diaktifkan kembali nanti)
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          if (!response.ok) throw new Error("Failed to fetch logging configurations");
          setLoggingConfigs(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
      */
    }
  }, [isOpen, onClose]);

  const handleBindingChange = (componentId: string, configId: string) => {
    setBindings((prev) => ({
      ...prev,
      [componentId]: configId,
    }));
  };

  const handleSave = () => {
    if (!widgetTitle) {
      Swal.fire("Incomplete", "Widget Title is required.", "warning");
      return;
    }
    onSave({
      widgetTitle,
      bindings,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Configure SLD Container</DialogTitle>
          <DialogDescription>
            Link each diagram component to its real-time data source.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-lg font-semibold">Data Bindings</Label>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
                {diagramComponents.map((component) => (
                  <div
                    key={component.id}
                    className="grid grid-cols-3 items-center gap-4"
                  >
                    <Label htmlFor={component.id} className="col-span-1">
                      {component.name}
                    </Label>
                    <div className="col-span-2">
                      <Select
                        onValueChange={(value) =>
                          handleBindingChange(component.id, value)
                        }
                        value={bindings[component.id] || ""}
                      >
                        <SelectTrigger id={component.id}>
                          <SelectValue placeholder="Select data source..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loggingConfigs.map((cfg) => (
                            <SelectItem key={cfg.id} value={cfg.id}>
                              {cfg.customName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
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
