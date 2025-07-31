// File: components/widgets/SingleValueCard/SingleValueCardConfigModal.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useMqtt } from "@/contexts/MqttContext"; // <-- 1. IMPORT USEMQTT

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

export const SingleValueCardConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const { subscribe, unsubscribe } = useMqtt(); // <-- 2. GUNAKAN HOOK MQTT
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // State untuk form
  const [customName, setCustomName] = useState("");
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [multiply, setMultiply] = useState("1");

  // State untuk key yang didapat dari MQTT
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  // Fetch data perangkat saat modal dibuka
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
    } else {
      // Reset form saat modal ditutup
      setTimeout(() => {
        setCustomName("");
        setSelectedDeviceUniqId(null);
        setSelectedKey(null);
        setMultiply("1");
        setAvailableKeys([]);
        setIsWaitingForKey(false);
      }, 200);
    }
  }, [isOpen, onClose]);

  // --- 3. LOGIKA UTAMA UNTUK SUBSCRIBE & UNSUBSCRIBE ---
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        // Cek jika 'value' adalah string JSON, lalu parse lagi
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const keys = Object.keys(innerPayload);
          setAvailableKeys(keys);
        } else {
          console.warn("Payload 'value' is not a JSON string:", payload.value);
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        // Langsung unsubscribe setelah mendapat data pertama
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

    // Unsubscribe dari topik lama jika ada
    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    // Subscribe ke topik baru jika valid dan berbeda
    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    // Cleanup saat komponen unmount atau modal ditutup
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

  // Handler saat mengganti perangkat di dropdown
  const handleDeviceChange = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey) {
      Swal.fire("Incomplete", "Please fill all fields.", "warning");
      return;
    }
    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      multiply: parseFloat(multiply) || 1,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Single Value Card
          </DialogTitle>
          <DialogDescription>
            Select a device to get available data keys via MQTT.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label htmlFor="customName">Custom Name</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Main Voltage"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="device">Device</Label>
            {isLoadingDevices ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={handleDeviceChange}
                value={selectedDeviceUniqId || ""}
              >
                <SelectTrigger id="device">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.uniqId} value={device.uniqId}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="key">Data Key</Label>
            <Select
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDeviceUniqId || availableKeys.length === 0}
            >
              <SelectTrigger id="key">
                <SelectValue
                  placeholder={
                    isWaitingForKey
                      ? "Waiting for device data..."
                      : "Select a key"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeviceUniqId &&
              !isWaitingForKey &&
              availableKeys.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No keys received. Ensure the device is publishing data.
                </p>
              )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="multiply">Multiplier (Optional)</Label>
            <Input
              id="multiply"
              type="number"
              value={multiply}
              onChange={(e) => setMultiply(e.target.value)}
              placeholder="e.g., 1000 or 0.1"
              step="0.01"
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
