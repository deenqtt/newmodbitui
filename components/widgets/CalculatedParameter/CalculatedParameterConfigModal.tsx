// File: components/widgets/CalculatedParameter/CalculatedParameterConfigModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useMqtt } from "@/contexts/MqttContext";
import { PlusCircle, Trash2, Info } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Operand {
  id: string;
  deviceUniqId: string | null;
  selectedKey: string | null;
}

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    title: string;
    calculation: string;
    units: string;
    operands: Array<{
      deviceUniqId: string;
      selectedKey: string;
    }>;
  };
}

// Calculation descriptions
const CALCULATION_DESCRIPTIONS: Record<string, string> = {
  SUM: "Add all values together: A + B + C + ...",
  AVERAGE: "Calculate mean: (A + B + C + ...) / count",
  MIN: "Find the lowest value",
  MAX: "Find the highest value",
  DIFFERENCE: "Subtract second from first: A - B",
};

// Operand Form Component
const OperandForm = ({
  operand,
  updateOperand,
  removeOperand,
  allDevices,
  isLoadingDevices,
  isEditMode,
  operandIndex,
}: {
  operand: Operand;
  updateOperand: (id: string, field: keyof Operand, value: any) => void;
  removeOperand: (id: string) => void;
  allDevices: DeviceForSelection[];
  isLoadingDevices: boolean;
  isEditMode: boolean;
  operandIndex: number;
}) => {
  const { subscribe, unsubscribe } = useMqtt();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (isEditMode && operand.selectedKey) {
      setAvailableKeys([operand.selectedKey]);
    }
  }, [isEditMode, operand.selectedKey]);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};

        setAvailableKeys((prevKeys) => {
          const newKeys = Object.keys(innerPayload);
          const allKeys = [...new Set([...prevKeys, ...newKeys])];
          return allKeys;
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload in operand form:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const selectedDevice = allDevices.find(
      (d) => d.uniqId === operand.deviceUniqId
    );
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      if (!isEditMode) {
        setAvailableKeys([]);
      }
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    operand.deviceUniqId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    isEditMode,
  ]);

  const handleDeviceChange = (value: string) => {
    updateOperand(operand.id, "deviceUniqId", value);
    updateOperand(operand.id, "selectedKey", null);
    setAvailableKeys([]);
  };

  return (
    <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      {/* Operand label */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {String.fromCharCode(65 + operandIndex)}
        </span>
      </div>

      {/* Form fields */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">Device</Label>
          {isLoadingDevices ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              onValueChange={handleDeviceChange}
              value={operand.deviceUniqId || ""}
            >
              <SelectTrigger className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                {allDevices.map((d) => (
                  <SelectItem key={d.uniqId} value={d.uniqId}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">Data Key</Label>
          <Select
            onValueChange={(value) =>
              updateOperand(operand.id, "selectedKey", value)
            }
            value={operand.selectedKey || ""}
            disabled={!operand.deviceUniqId || availableKeys.length === 0}
          >
            <SelectTrigger className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 disabled:opacity-50">
              <SelectValue
                placeholder={isWaitingForKey ? "Waiting..." : "Select a key"}
              />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
              {availableKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="mt-6 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
        onClick={() => removeOperand(operand.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const CalculatedParameterConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [operands, setOperands] = useState<Operand[]>([]);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [calculationType, setCalculationType] = useState("SUM");
  const [units, setUnits] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.title || "");
      setCalculationType(initialConfig.calculation || "SUM");
      setUnits(initialConfig.units || "");

      const loadedOperands: Operand[] = initialConfig.operands.map(
        (op, index) => ({
          id: `op-${Date.now()}-${index}`,
          deviceUniqId: op.deviceUniqId || null,
          selectedKey: op.selectedKey || null,
        })
      );

      setOperands(loadedOperands);
    } else if (isOpen) {
      setIsEditMode(false);
      setOperands([]);
      setWidgetTitle("");
      setCalculationType("SUM");
      setUnits("");
      addOperand();
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (isOpen) {
      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          setDevices(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();
    }
  }, [isOpen, onClose]);

  const addOperand = () => {
    setOperands((prev) => [
      ...prev,
      {
        id: `op-${Date.now()}`,
        deviceUniqId: null,
        selectedKey: null,
      },
    ]);
  };

  const removeOperand = (id: string) => {
    if (operands.length > 1) {
      setOperands((prev) => prev.filter((op) => op.id !== id));
    }
  };

  const updateOperand = (id: string, field: keyof Operand, value: any) => {
    setOperands((prev) =>
      prev.map((op) => (op.id === id ? { ...op, [field]: value } : op))
    );
  };

  const handleSave = () => {
    if (!widgetTitle || operands.length === 0) {
      Swal.fire(
        "Incomplete",
        "Widget title and at least one operand are required.",
        "warning"
      );
      return;
    }
    for (const op of operands) {
      if (!op.deviceUniqId || !op.selectedKey) {
        Swal.fire(
          "Incomplete",
          "Please complete all fields for all operands.",
          "warning"
        );
        return;
      }
    }

    onSave({
      title: widgetTitle,
      calculation: calculationType,
      units,
      operands: operands.map(({ id, ...rest }) => rest),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Calculated Parameter"
              : "Configure Calculated Parameter"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your calculated parameter configuration."
              : "Define a calculation based on multiple real-time data points."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Title and Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Widget Title
              </Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Total Power Consumption"
                className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Units
              </Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kW, %"
                className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Calculation Type */}
          <div className="grid gap-2">
            <Label className="text-slate-700 dark:text-slate-300">
              Calculation Type
            </Label>
            <Select onValueChange={setCalculationType} value={calculationType}>
              <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                <SelectItem value="SUM">SUM - Add all values</SelectItem>
                <SelectItem value="AVERAGE">
                  AVERAGE - Calculate mean
                </SelectItem>
                <SelectItem value="MIN">MIN - Lowest value</SelectItem>
                <SelectItem value="MAX">MAX - Highest value</SelectItem>
                <SelectItem value="DIFFERENCE">
                  DIFFERENCE - First minus second
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Calculation Description */}
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {CALCULATION_DESCRIPTIONS[calculationType]}
              </p>
            </div>
          </div>

          {/* Operands Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 dark:text-slate-300 text-base font-semibold">
                Data Sources (Operands)
              </Label>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {operands.length} source{operands.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {operands.map((op, index) => (
                <OperandForm
                  key={op.id}
                  operand={op}
                  updateOperand={updateOperand}
                  removeOperand={removeOperand}
                  allDevices={devices}
                  isLoadingDevices={isLoadingDevices}
                  isEditMode={isEditMode}
                  operandIndex={index}
                />
              ))}
            </div>
          </div>

          {/* Add Operand Button */}
          <Button
            variant="outline"
            onClick={addOperand}
            className="w-full dark:border-slate-600 dark:hover:bg-slate-800"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Data Source
          </Button>

          {/* Helper text */}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Tip: Use 2+ sources. For DIFFERENCE, order matters (A - B).
          </p>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            className="dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
