// File: components/widgets/MultiProtocolMonitor/MultiProtocolMonitorConfigModal.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2 } from "lucide-react";

// Tipe untuk data perangkat dari respons MQTT
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
    part_number: string;
  };
}

// Tipe untuk konfigurasi setiap key yang dimonitor
interface KeyConfig {
  key: string;
  customName: string;
  onValue: string;
  offValue: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

const ALLOWED_PART_NUMBERS = [
  "RELAY",
  "RELAYMINI",
  "TIBBIT_GPIO",
  "TIBBIT_DI",
  "DRYCONTACT_4CH",
  "SOLITUDE_RELAY",
];

export const MultiProtocolMonitorConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();
  const [widgetTitle, setWidgetTitle] = useState("Multi-Protocol Monitor");
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceType, setDeviceType] = useState<"modbus" | "i2c" | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const responseTopicRef = useRef<string | null>(null);

  // State baru untuk alur yang lebih baik
  const [selectedDevice, setSelectedDevice] = useState<MqttDevice | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [keyConfigs, setKeyConfigs] = useState<Record<string, KeyConfig>>({});
  const keySubTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "Multi-Protocol Monitor");
      if (initialConfig.deviceTopic) {
        // In edit mode, we can't easily re-select the device type,
        // so we focus on loading the keys for the saved device.
        const mockDevice = {
          profile: {
            topic: initialConfig.deviceTopic,
            name: initialConfig.widgetTitle, // Fallback name
            part_number: "", // Not critical for re-loading keys
          },
        };
        setSelectedDevice(mockDevice);
      }
      if (initialConfig.monitoredKeys) {
        const configs: Record<string, KeyConfig> = {};
        initialConfig.monitoredKeys.forEach((item: KeyConfig) => {
          configs[item.key] = item;
        });
        setKeyConfigs(configs);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("Multi-Protocol Monitor");
      setDeviceType(null);
      setDiscoveredDevices([]);
      setSelectedDevice(null);
      setAvailableKeys([]);
      setKeyConfigs({});
      setIsLoadingDevices(false);
    }
  }, [isOpen, initialConfig]);

  const handleDeviceListResponse = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const allDevices = JSON.parse(payloadString) as MqttDevice[];
        const filtered = allDevices.filter(
          (d) =>
            d.profile.part_number &&
            ALLOWED_PART_NUMBERS.includes(d.profile.part_number.toUpperCase())
        );
        setDiscoveredDevices(filtered);
      } catch (e) {
        Swal.fire("Error", "Received invalid device list.", "error");
      } finally {
        setIsLoadingDevices(false);
        if (responseTopicRef.current) {
          unsubscribe(responseTopicRef.current, handleDeviceListResponse);
        }
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    if (!deviceType || !isReady) return;
    const commandTopic =
      deviceType === "modbus" ? "command_device_modbus" : "command_device_i2c";
    const responseTopic =
      deviceType === "modbus"
        ? "response_device_modbus"
        : "response_device_i2c";
    const payload = {
      command: deviceType === "modbus" ? "getDataModbus" : "getDataI2C",
    };

    setDiscoveredDevices([]);
    setSelectedDevice(null);
    setAvailableKeys([]);
    setKeyConfigs({});
    setIsLoadingDevices(true);

    subscribe(responseTopic, handleDeviceListResponse);
    responseTopicRef.current = responseTopic;
    publish(commandTopic, JSON.stringify(payload));
  }, [deviceType, isReady, publish, subscribe, handleDeviceListResponse]);

  const handleMqttKeyResponse = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error(e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttKeyResponse);
        keySubTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const topic = selectedDevice?.profile.topic;
    if (keySubTopicRef.current && keySubTopicRef.current !== topic) {
      unsubscribe(keySubTopicRef.current, handleMqttKeyResponse);
    }
    if (topic && topic !== keySubTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(topic, handleMqttKeyResponse);
      keySubTopicRef.current = topic;
    }
  }, [selectedDevice, subscribe, unsubscribe, handleMqttKeyResponse]);

  const handleDeviceChange = (topic: string) => {
    const device = discoveredDevices.find((d) => d.profile.topic === topic);
    setSelectedDevice(device || null);
    setKeyConfigs({}); // Reset konfigurasi key saat device berubah
  };

  const handleKeySelection = (checked: boolean, key: string) => {
    const newKeyConfigs = { ...keyConfigs };
    if (checked) {
      newKeyConfigs[key] = {
        key: key,
        customName: key, // Default custom name
        onValue: "1",
        offValue: "0",
      };
    } else {
      delete newKeyConfigs[key];
    }
    setKeyConfigs(newKeyConfigs);
  };

  const handleKeyConfigChange = (
    key: string,
    field: keyof KeyConfig,
    value: string
  ) => {
    if (keyConfigs[key]) {
      setKeyConfigs((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
    }
  };

  const handleSave = () => {
    const itemsToSave = Object.values(keyConfigs);
    if (!widgetTitle || !selectedDevice || itemsToSave.length === 0) {
      Swal.fire(
        "Incomplete",
        "Widget title, a device, and at least one key are required.",
        "warning"
      );
      return;
    }
    onSave({
      widgetTitle,
      deviceTopic: selectedDevice.profile.topic,
      monitoredKeys: itemsToSave,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Multi-Protocol Monitor"
              : "Configure Multi-Protocol Monitor"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your multi-protocol monitor widget configuration."
              : "Select a device, then choose which keys to monitor."}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Device Type</Label>
              <Select
                onValueChange={(v) => setDeviceType(v as any)}
                value={deviceType || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modbus">Modbus</SelectItem>
                  <SelectItem value="i2c">Modular / Modbit (I2C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Device</Label>
              {isLoadingDevices ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Select
                  onValueChange={handleDeviceChange}
                  value={selectedDevice?.profile.topic || ""}
                  disabled={!deviceType || discoveredDevices.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {discoveredDevices.map((d) => (
                      <SelectItem key={d.profile.topic} value={d.profile.topic}>
                        {d.profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {selectedDevice &&
            (isWaitingForKey ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="space-y-2">
                <Label>Select Keys to Monitor</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {availableKeys.map((key) => (
                    <div
                      key={key}
                      className="flex items-center space-x-2 p-3 border-b last:border-b-0"
                    >
                      <Checkbox
                        id={key}
                        checked={!!keyConfigs[key]}
                        onCheckedChange={(checked) =>
                          handleKeySelection(Boolean(checked), key)
                        }
                      />
                      <Label
                        htmlFor={key}
                        className="flex-1 cursor-pointer font-mono"
                      >
                        {key}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {Object.keys(keyConfigs).length > 0 && (
            <div className="space-y-4">
              <Label>Configure Selected Keys</Label>
              {Object.values(keyConfigs).map((item) => (
                <div
                  key={item.key}
                  className="p-4 border rounded-lg bg-muted/50 space-y-4"
                >
                  <p className="font-semibold">{item.key}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Custom Name</Label>
                      <Input
                        placeholder={item.key}
                        value={item.customName}
                        onChange={(e) =>
                          handleKeyConfigChange(
                            item.key,
                            "customName",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Value for ON</Label>
                      <Input
                        placeholder="1"
                        value={item.onValue}
                        onChange={(e) =>
                          handleKeyConfigChange(
                            item.key,
                            "onValue",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Value for OFF</Label>
                      <Input
                        placeholder="0"
                        value={item.offValue}
                        onChange={(e) =>
                          handleKeyConfigChange(
                            item.key,
                            "offValue",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
