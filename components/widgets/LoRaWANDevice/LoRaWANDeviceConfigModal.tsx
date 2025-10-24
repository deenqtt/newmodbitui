// File: components/widgets/LoRaWANDevice/LoRaWANDeviceConfigModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Radio, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoRaDevice {
  id: string;
  devEui: string;
  name: string;
  lastSeen: string | null;
}

interface LoRaWANDeviceConfig {
  deviceId: string;
  deviceName: string;
  refreshInterval?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LoRaWANDeviceConfig) => void;
  initialConfig?: LoRaWANDeviceConfig;
}

export const LoRaWANDeviceConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [devices, setDevices] = useState<LoRaDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Fetch available LoRaWAN devices
  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lorawan/devices`);
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      } else {
        console.error("Failed to fetch LoRaWAN devices");
        setDevices([]);
      }
    } catch (error) {
      console.error("Error fetching LoRaWAN devices:", error);
      setDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Load initial config and fetch devices when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setSelectedDeviceId(initialConfig.deviceId);
        setRefreshInterval(initialConfig.refreshInterval || 10);
      } else {
        setSelectedDeviceId("");
        setRefreshInterval(10);
      }
      fetchDevices();
    }
  }, [isOpen, initialConfig, fetchDevices]);

  const handleSave = () => {
    if (!selectedDeviceId) return;

    const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
    if (!selectedDevice) return;

    const config: LoRaWANDeviceConfig = {
      deviceId: selectedDeviceId,
      deviceName: selectedDevice.name,
      refreshInterval,
    };

    onSave(config);
  };

  const isDeviceOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastSeenTime > fiveMinutesAgo;
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Radio className="h-5 w-5 mr-2" />
            Configure LoRaWAN Device Widget
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="device-select">Select LoRaWAN Device</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDevices}
                disabled={isLoadingDevices}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoadingDevices ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>

            <Select
              value={selectedDeviceId}
              onValueChange={setSelectedDeviceId}
              disabled={isLoadingDevices}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingDevices
                      ? "Loading devices..."
                      : devices.length === 0
                      ? "No devices found"
                      : "Select a device"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {device.devEui}
                        </div>
                      </div>
                      <Badge
                        variant={
                          isDeviceOnline(device.lastSeen)
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2 text-xs"
                      >
                        {isDeviceOnline(device.lastSeen) ? (
                          <>
                            <Wifi className="h-3 w-3 mr-1" />
                            Online
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {devices.length === 0 && !isLoadingDevices && (
              <p className="text-sm text-muted-foreground">
                No LoRaWAN devices found. Make sure devices are connected and
                sending data.
              </p>
            )}
          </div>

          {/* Device Details */}
          {selectedDevice && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium">Device Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <div className="font-medium">{selectedDevice.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">DevEUI:</span>
                  <div className="font-mono">{selectedDevice.devEui}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div>
                    <Badge
                      variant={
                        isDeviceOnline(selectedDevice.lastSeen)
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {isDeviceOnline(selectedDevice.lastSeen)
                        ? "Online"
                        : "Offline"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Seen:</span>
                  <div className="text-xs">
                    {selectedDevice.lastSeen
                      ? format(new Date(selectedDevice.lastSeen), "dd/MM HH:mm")
                      : "Never"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refresh Interval */}
          <div className="space-y-2">
            <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
            <Input
              id="refresh-interval"
              type="number"
              min="5"
              max="300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              How often to update the widget data (5-300 seconds)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedDeviceId || isLoadingDevices}
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
