// File: components/widgets/IconStatusCard/IconStatusCardConfigModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { iconLibrary } from "@/lib/icon-library";

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

export const IconStatusCardConfigModal = ({
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
  const [multiply, setMultiply] = useState("1");
  const [units, setUnits] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Zap");
  const [iconColor, setIconColor] = useState("#FFFFFF");
  const [iconBgColor, setIconBgColor] = useState("#3B82F6");

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setSelectedKey(null);
      setMultiply("1");
      setUnits("");
      setSelectedIcon("Zap");
      setIconColor("#FFFFFF");
      setIconBgColor("#3B82F6");
      setAvailableKeys([]);
      setIsWaitingForKey(false);

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

  // --- START: Logika MQTT yang Ditambahkan Kembali ---
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
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
  // --- END: Logika MQTT yang Ditambahkan Kembali ---

  const handleDeviceChange = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey || !selectedIcon) {
      Swal.fire("Incomplete", "Please fill all required fields.", "warning");
      return;
    }
    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      multiply: parseFloat(multiply) || 1,
      units,
      selectedIcon,
      iconColor,
      iconBgColor,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Icon Status Card
          </DialogTitle>
          <DialogDescription>
            Select device, key, and customize the appearance of the card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[70vh] overflow-y-auto">
          {/* Kolom Kiri: Konfigurasi Data */}
          <div className="space-y-6">
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
                <Label htmlFor="units">Units</Label>
                <Input
                  id="units"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g., V, A, %"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="multiply">Multiplier</Label>
                <Input
                  id="multiply"
                  type="number"
                  value={multiply}
                  onChange={(e) => setMultiply(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Konfigurasi Tampilan */}
          <div className="space-y-4">
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 border p-3 rounded-md mt-2">
                {iconLibrary.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedIcon(name)}
                    className={`flex items-center justify-center p-2 rounded-md transition-all ${
                      selectedIcon === name
                        ? "ring-2 ring-blue-500 bg-blue-100"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="iconColor">Icon Color</Label>
                <Input
                  id="iconColor"
                  type="color"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="iconBgColor">Background Color</Label>
                <Input
                  id="iconBgColor"
                  type="color"
                  value={iconBgColor}
                  onChange={(e) => setIconBgColor(e.target.value)}
                  className="h-10"
                />
              </div>
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
