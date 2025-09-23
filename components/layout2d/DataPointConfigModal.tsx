"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMqtt } from "@/contexts/MqttContext";
import IconPicker from "./IconPicker";

interface Device {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload?: string | null;
}

interface KeyConfig {
  key: string;
  units?: string;
  multiply?: number;
  customName?: string;
}

interface DataPointConfig {
  id?: string;
  deviceUniqId: string;
  selectedKeys: KeyConfig[];
  customName: string;
  positionX: number;
  positionY: number;
  fontSize?: number;
  color?: string;
  iconName?: string;
  iconColor?: string;
  showIcon?: boolean;
  displayLayout?: "vertical" | "horizontal" | "grid";
}

interface DataPointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DataPointConfig) => void;
  initialConfig?: DataPointConfig | null;
  position?: { x: number; y: number } | null;
}

export default function DataPointConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  position,
}: DataPointConfigModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);

  const { subscribe, unsubscribe } = useMqtt();
  const subscribedTopicRef = useRef<string | null>(null);

  const [config, setConfig] = useState<DataPointConfig>({
    deviceUniqId: "",
    selectedKeys: [],
    customName: "",
    positionX: position?.x || 50,
    positionY: position?.y || 50,
    fontSize: 14,
    color: "#000000",
    iconName: "",
    iconColor: "#666666",
    showIcon: false,
    displayLayout: "vertical",
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else if (position) {
      setConfig((prev) => ({
        ...prev,
        positionX: position.x,
        positionY: position.y,
      }));
    }
  }, [initialConfig, position]);

  // Fetch devices
  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  // MQTT message handler for real-time key fetching
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        const keys = Object.keys(innerPayload);
        setAvailableKeys(keys);
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        if (subscribedTopicRef.current) {
          unsubscribe(subscribedTopicRef.current, handleMqttMessage);
          subscribedTopicRef.current = null;
        }
      }
    },
    [unsubscribe]
  );

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/devices/for-selection`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication required. Please refresh the page.");
          onClose();
          return;
        }
        throw new Error(
          `Failed to fetch devices: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      toast.error("Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup MQTT subscription on modal close
  useEffect(() => {
    if (!isOpen && subscribedTopicRef.current) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
      setIsWaitingForKey(false);
    }
  }, [isOpen, unsubscribe, handleMqttMessage]);

  // Real-time device key fetching via MQTT
  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === config.deviceUniqId
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
    } else if (!newTopic) {
      setAvailableKeys([]);
      setIsWaitingForKey(false);
    }
  }, [config.deviceUniqId, devices, subscribe, unsubscribe, handleMqttMessage]);

  // Add key to selected keys
  const addKey = (key: string) => {
    if (config.selectedKeys.some((k) => k.key === key)) {
      toast.error("Key already added");
      return;
    }

    const newKeyConfig: KeyConfig = {
      key,
      units: "",
      multiply: 1,
      customName: key,
    };

    setConfig((prev) => ({
      ...prev,
      selectedKeys: [...prev.selectedKeys, newKeyConfig],
    }));
  };

  // Remove key from selected keys
  const removeKey = (keyToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedKeys: prev.selectedKeys.filter((k) => k.key !== keyToRemove),
    }));
  };

  // Update key configuration
  const updateKeyConfig = (key: string, updates: Partial<KeyConfig>) => {
    setConfig((prev) => ({
      ...prev,
      selectedKeys: prev.selectedKeys.map((k) =>
        k.key === key ? { ...k, ...updates } : k
      ),
    }));
  };

  const handleSave = () => {
    if (
      !config.deviceUniqId ||
      config.selectedKeys.length === 0 ||
      !config.customName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSave(config);
    handleClose();
  };

  const handleClose = () => {
    setConfig({
      deviceUniqId: "",
      selectedKeys: [],
      customName: "",
      positionX: position?.x || 50,
      positionY: position?.y || 50,
      fontSize: 14,
      color: "#000000",
      iconName: "",
      iconColor: "#666666",
      showIcon: false,
      displayLayout: "vertical",
    });
    setAvailableKeys([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig
              ? "Edit Multi-Key Data Point"
              : "Add Multi-Key Data Point"}
          </DialogTitle>
          <DialogDescription>
            Configure a data point that displays multiple keys from a single
            device with individual settings for each key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Device Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Device Configuration
            </h3>

            <div>
              <Label htmlFor="device">Device *</Label>
              <Select
                value={config.deviceUniqId}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    deviceUniqId: value,
                    selectedKeys: [], // Reset keys when device changes
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoading ? "Loading devices..." : "Select device"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading devices...
                    </SelectItem>
                  ) : devices.length === 0 ? (
                    <SelectItem value="no-devices" disabled>
                      No devices available
                    </SelectItem>
                  ) : (
                    devices.map((device) => (
                      <SelectItem key={device.uniqId} value={device.uniqId}>
                        {device.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {devices.length > 0 && !isLoading && (
                <div className="text-xs mt-1 text-green-600">
                  ✓ {devices.length} device{devices.length > 1 ? "s" : ""}{" "}
                  available
                </div>
              )}
            </div>

            {/* Available Keys */}
            {config.deviceUniqId && (
              <div>
                <Label>Available Keys</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableKeys.map((key) => {
                    const isSelected = config.selectedKeys.some(
                      (k) => k.key === key
                    );
                    return (
                      <Button
                        key={key}
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() =>
                          isSelected ? removeKey(key) : addKey(key)
                        }
                        className="text-xs"
                      >
                        {isSelected ? (
                          <X className="w-3 h-3 mr-1" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        {key}
                      </Button>
                    );
                  })}
                </div>
                {config.deviceUniqId && (
                  <div className="text-xs mt-1">
                    {isWaitingForKey ? (
                      <p className="text-blue-600">
                        ⏳ Waiting for real-time data...
                      </p>
                    ) : availableKeys.length === 0 ? (
                      <p className="text-yellow-600">
                        No data available from this device
                      </p>
                    ) : (
                      <p className="text-green-600">
                        ✓ {availableKeys.length} keys available •{" "}
                        {config.selectedKeys.length} selected
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="customName">Display Name *</Label>
              <Input
                id="customName"
                value={config.customName}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, customName: e.target.value }))
                }
                placeholder="e.g., Sensor Data Display"
              />
            </div>
          </div>

          {/* Selected Keys Configuration */}
          {config.selectedKeys.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Key Configurations ({config.selectedKeys.length} keys)
              </h3>

              <div className="space-y-3">
                {config.selectedKeys.map((keyConfig, index) => (
                  <Card key={keyConfig.key} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="font-medium">{keyConfig.key}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeKey(keyConfig.key)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Custom Name</Label>
                        <Input
                          value={keyConfig.customName || ""}
                          onChange={(e) =>
                            updateKeyConfig(keyConfig.key, {
                              customName: e.target.value,
                            })
                          }
                          placeholder={keyConfig.key}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Multiplier</Label>
                        <Input
                          type="number"
                          value={keyConfig.multiply || 1}
                          onChange={(e) =>
                            updateKeyConfig(keyConfig.key, {
                              multiply: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Units</Label>
                        <Input
                          value={keyConfig.units || ""}
                          onChange={(e) =>
                            updateKeyConfig(keyConfig.key, {
                              units: e.target.value,
                            })
                          }
                          placeholder="e.g., °C, %"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Display Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <IconPicker
                  showIcon={config.showIcon || false}
                  iconName={config.iconName}
                  iconColor={config.iconColor}
                  onShowIconChange={(show) =>
                    setConfig((prev) => ({ ...prev, showIcon: show }))
                  }
                  onIconChange={(iconName) =>
                    setConfig((prev) => ({ ...prev, iconName }))
                  }
                  onIconColorChange={(iconColor) =>
                    setConfig((prev) => ({ ...prev, iconColor }))
                  }
                />

                <div>
                  <Label htmlFor="layout">Layout Style</Label>
                  <Select
                    value={config.displayLayout || "vertical"}
                    onValueChange={(
                      value: "vertical" | "horizontal" | "grid"
                    ) =>
                      setConfig((prev) => ({ ...prev, displayLayout: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical Stack</SelectItem>
                      <SelectItem value="horizontal">Horizontal Row</SelectItem>
                      <SelectItem value="grid">Grid Layout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fontSize">Font Size (px)</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      min="8"
                      max="48"
                      value={config.fontSize}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fontSize: parseInt(e.target.value) || 14,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={config.color}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={config.color}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                        placeholder="#000000"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">
                    Position on Canvas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="positionX">X Position (%)</Label>
                      <input
                        id="positionX"
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        value={Math.round(config.positionX * 10) / 10}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            setConfig((prev) => ({
                              ...prev,
                              positionX: Math.max(0, Math.min(100, value)),
                            }));
                          }
                        }}
                        placeholder="0-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="positionY">Y Position (%)</Label>
                      <input
                        id="positionY"
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        value={Math.round(config.positionY * 10) / 10}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            setConfig((prev) => ({
                              ...prev,
                              positionY: Math.max(0, Math.min(100, value)),
                            }));
                          }
                        }}
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Position relative to canvas (0,0 = top-left, 100,100 =
                    bottom-right)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {initialConfig ? "Update" : "Add"} Multi-Key Data Point
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
