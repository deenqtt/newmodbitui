// File: components/widgets/RunningHoursLog/RunningHoursLogConfigModal.tsx
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

export const RunningHoursLogConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const { subscribe, unsubscribe } = useMqtt();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // State untuk form
  const [customName, setCustomName] = useState("");
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [units, setUnits] = useState("Hours"); // Default unit
  const [multiply, setMultiply] = useState("1");

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setSelectedKey(null);
      setUnits("Hours");
      setMultiply("1");
      setAvailableKeys([]);

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

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === selectedDeviceUniqId
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
    selectedDeviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const handleDeviceChange = (value: string) => {
    setSelectedDeviceUniqId(value);
    setSelectedKey(null);
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey) {
      Swal.fire("Incomplete", "Please fill all required fields.", "warning");
      return;
    }
    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      units,
      multiply: parseFloat(multiply) || 1,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Running Hours Log
          </DialogTitle>
          <DialogDescription>
            Select a device and the key that contains the running hours data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Genset A Running Time"
            />
          </div>
          <div className="grid gap-2">
            <Label>Device</Label>
            {isLoadingDevices ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={handleDeviceChange}
                value={selectedDeviceUniqId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
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
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDeviceUniqId || availableKeys.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isWaitingForKey ? "Waiting for data..." : "Select a key"
                  }
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., Hours"
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
