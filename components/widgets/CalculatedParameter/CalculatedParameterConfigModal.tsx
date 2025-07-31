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
import { PlusCircle, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap operand dalam kalkulasi
interface Operand {
  id: string; // ID unik sementara untuk list di React
  deviceUniqId: string | null;
  selectedKey: string | null;
}

// Tipe untuk data perangkat dari API
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

// Komponen Form untuk satu operand
const OperandForm = ({
  operand,
  updateOperand,
  removeOperand,
  allDevices,
  isLoadingDevices,
}: {
  operand: Operand;
  updateOperand: (id: string, field: keyof Operand, value: any) => void;
  removeOperand: (id: string) => void;
  allDevices: DeviceForSelection[];
  isLoadingDevices: boolean;
}) => {
  const { subscribe, unsubscribe } = useMqtt();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
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
      setAvailableKeys([]);
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
  ]);

  const handleDeviceChange = (value: string) => {
    updateOperand(operand.id, "deviceUniqId", value);
    updateOperand(operand.id, "selectedKey", null); // Reset key
  };

  return (
    <div className="flex items-start gap-2 p-4 border rounded-lg bg-muted/50">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Device</Label>
          {isLoadingDevices ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              onValueChange={handleDeviceChange}
              value={operand.deviceUniqId || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
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
          <Label>Data Key</Label>
          <Select
            onValueChange={(value) =>
              updateOperand(operand.id, "selectedKey", value)
            }
            value={operand.selectedKey || ""}
            disabled={!operand.deviceUniqId || availableKeys.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isWaitingForKey ? "Waiting..." : "Select a key"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="mt-6"
        onClick={() => removeOperand(operand.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

export const CalculatedParameterConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [operands, setOperands] = useState<Operand[]>([]);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [calculationType, setCalculationType] = useState("SUM");
  const [units, setUnits] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOperands([]);
      setWidgetTitle("");
      setCalculationType("SUM");
      setUnits("");
      addOperand(); // Mulai dengan satu operand

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
      // Jaga agar minimal ada 1
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
          `Please complete all fields for all operands.`,
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
            Configure Calculated Parameter
          </DialogTitle>
          <DialogDescription>
            Define a calculation based on multiple real-time data points.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Widget Title</Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Total Power Consumption"
              />
            </div>
            <div className="grid gap-2">
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kW, %"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Calculation Type</Label>
            <Select onValueChange={setCalculationType} value={calculationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUM">SUM (A + B + ...)</SelectItem>
                <SelectItem value="AVERAGE">
                  AVERAGE ((A + B + ...) / n)
                </SelectItem>
                <SelectItem value="MIN">MIN (Minimum of A, B, ...)</SelectItem>
                <SelectItem value="MAX">MAX (Maximum of A, B, ...)</SelectItem>
                <SelectItem value="DIFFERENCE">DIFFERENCE (A - B)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Operands</Label>
            <div className="space-y-4">
              {operands.map((op) => (
                <OperandForm
                  key={op.id}
                  operand={op}
                  updateOperand={updateOperand}
                  removeOperand={removeOperand}
                  allDevices={devices}
                  isLoadingDevices={isLoadingDevices}
                />
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={addOperand} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Operand
          </Button>
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
