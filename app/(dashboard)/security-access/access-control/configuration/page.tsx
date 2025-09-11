"use client";

import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Loader2,
  Settings,
  Clock,
  Globe,
  Network,
  Power,
  RotateCcw,
  Trash2,
  Calendar,
  Languages,
  Wifi,
  Server,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

// --- Interfaces
interface Device {
  id: string;
  name: string;
  ip: string;
  port?: number;
  enabled?: boolean;
}

interface ConfigurationResponse {
  status: "success" | "error";
  message: string;
  data?: any;
}

// Interface untuk payload MQTT
interface MqttPayload {
  topic: string;
  payload: string;
}

// Language options
const LANGUAGES = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "id", label: "Indonesian", flag: "🇮🇩" },
  { value: "zh", label: "Chinese", flag: "🇨🇳" },
  { value: "ko", label: "Korean", flag: "🇰🇷" },
  { value: "jp", label: "Japanese", flag: "🇯🇵" },
  { value: "th", label: "Thai", flag: "🇹🇭" },
  { value: "vi", label: "Vietnamese", flag: "🇻🇳" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "pt", label: "Portuguese", flag: "🇵🇹" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "ru", label: "Russian", flag: "🇷🇺" },
];

const RESET_TYPES = [
  { value: "users", label: "Users Only", description: "Clear all user data" },
  {
    value: "attendance",
    label: "Attendance Records",
    description: "Clear attendance logs",
  },
  {
    value: "templates",
    label: "Fingerprint Templates",
    description: "Clear biometric data",
  },
  { value: "all", label: "All Data", description: "Complete device reset" },
];

// --- Main Component
export default function DeviceConfiguration() {
  const requestTopic = "accessControl/device/command";
  const responseTopic = "accessControl/device/response";

  const { isReady, connectionStatus, publish } = useMqtt();
  const { payloads } = useConnectivity([responseTopic]);
  const isConnected = connectionStatus === "Connected";

  // Device selection and configuration state
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<ConfigurationResponse | null>(null);

  // Time configuration
  const [timeConfig, setTimeConfig] = useState({
    datetime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
    useSystemTime: true,
  });

  // Language configuration
  const [languageConfig, setLanguageConfig] = useState({
    language: "en",
  });

  // Reset configuration
  const [resetConfig, setResetConfig] = useState({
    resetType: "users" as string,
    confirmText: "",
  });

  // MQTT Response Handler
  const handleResponse = useCallback((topic: string, message: string) => {
    try {
      const payload: ConfigurationResponse = JSON.parse(message);
      setLastResponse(payload);

      if (payload.status === "success") {
        // Handle specific successful operations
        if (
          payload.message.includes("restarted") ||
          payload.message.includes("reset")
        ) {
          // Show success for destructive operations
        }
      }
    } catch (e) {
      console.error("Failed to parse MQTT response:", e);
      setLastResponse({
        status: "error",
        message: "Failed to parse response",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Device List Handler
  const handleDeviceListResponse = useCallback(
    (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        if (payload.status === "success" && payload.data?.devices) {
          setDevices(payload.data.devices);
        }
      } catch (e) {
        console.error("Failed to parse device list:", e);
      }
    },
    []
  );

  // Fetch device list
  const fetchDeviceList = useCallback(async () => {
    if (!isConnected) return;
    await publish(requestTopic, JSON.stringify({ command: "listDevices" }));
  }, [isConnected, publish, requestTopic]);

  // Configuration Actions
  const handleSetTime = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }

    setIsLoading(true);
    const timestamp = timeConfig.useSystemTime
      ? new Date().toISOString()
      : new Date(timeConfig.datetime).toISOString();

    const command = {
      command: "setDeviceTime",
      data: {
        device_id: selectedDevice,
        timestamp: timestamp,
      },
    };

    await publish(requestTopic, JSON.stringify(command));
  };

  const handleGetTime = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }

    setIsLoading(true);
    const command = {
      command: "getDeviceTime",
      data: {
        device_id: selectedDevice,
      },
    };

    await publish(requestTopic, JSON.stringify(command));
  };

  const handleSetLanguage = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }

    setIsLoading(true);
    const command = {
      command: "setDeviceLanguage",
      data: {
        device_id: selectedDevice,
        language: languageConfig.language,
      },
    };

    await publish(requestTopic, JSON.stringify(command));
  };

  const handleRestartDevice = async () => {
    if (!selectedDevice) {
      alert("Please select a device first");
      return;
    }

    setIsLoading(true);
    const command = {
      command: "restartDevice",
      data: {
        device_id: selectedDevice,
        ...(selectedDevice === "all" && { force: true }),
      },
    };

    await publish(requestTopic, JSON.stringify(command));
  };

  const handleResetDevice = async () => {
    if (!selectedDevice || resetConfig.confirmText !== "CONFIRM") {
      alert("Please select a device and type 'CONFIRM' to proceed");
      return;
    }

    setIsLoading(true);
    const command = {
      command: "resetDevice",
      data: {
        device_id: selectedDevice,
        reset_type: resetConfig.resetType,
        confirm: true,
        ...(selectedDevice === "all" && { confirm_all: true }),
      },
    };

    await publish(requestTopic, JSON.stringify(command));
  };

  // Handle MQTT payloads - FIXED VERSION
  useEffect(() => {
    if (payloads && Array.isArray(payloads) && payloads.length > 0) {
      const latestPayload = payloads[payloads.length - 1];
      // Pastikan latestPayload adalah object dengan property topic dan payload
      if (
        latestPayload &&
        typeof latestPayload === "object" &&
        "topic" in latestPayload &&
        "payload" in latestPayload
      ) {
        handleResponse(latestPayload.topic, latestPayload.payload);
        handleDeviceListResponse(latestPayload.topic, latestPayload.payload);
      }
    }
  }, [payloads, handleResponse, handleDeviceListResponse]);

  // Initialize when MQTT is ready
  useEffect(() => {
    if (isReady && isConnected) {
      fetchDeviceList();
    }
  }, [isReady, isConnected, fetchDeviceList]);

  // Get selected device info
  const selectedDeviceInfo = devices.find((d) => d.id === selectedDevice);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-400/10">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Device Configuration</h1>
              <p className="text-xs text-muted-foreground">
                Configure ZKTeco device settings and parameters
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span>{connectionStatus}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Device Selection */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Device Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="device-select">Select Device</Label>
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a device to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌐 All Devices</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              device.enabled ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          {device.name} ({device.ip})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchDeviceList} variant="outline" size="sm">
                <Wifi className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {selectedDeviceInfo && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Selected Device:
                </div>
                <div className="font-medium">{selectedDeviceInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedDeviceInfo.ip}:{selectedDeviceInfo.port || 4370}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Status */}
        {lastResponse && (
          <Card
            className={`border shadow-sm ${
              lastResponse.status === "success"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {lastResponse.status === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`font-medium ${
                    lastResponse.status === "success"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {lastResponse.message}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Time Configuration */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-system-time"
                    checked={timeConfig.useSystemTime}
                    onCheckedChange={(checked) =>
                      setTimeConfig({ ...timeConfig, useSystemTime: checked })
                    }
                  />
                  <Label htmlFor="use-system-time">
                    Use current system time
                  </Label>
                </div>
              </div>

              {!timeConfig.useSystemTime && (
                <div>
                  <Label htmlFor="datetime">Set Custom Time</Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={timeConfig.datetime}
                    onChange={(e) =>
                      setTimeConfig({ ...timeConfig, datetime: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSetTime}
                  disabled={!isConnected || isLoading || !selectedDevice}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Set Time
                </Button>
                <Button
                  onClick={handleGetTime}
                  variant="outline"
                  disabled={!isConnected || isLoading || !selectedDevice}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Get Time
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Language Configuration */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Language Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">Device Language</Label>
                <Select
                  value={languageConfig.language}
                  onValueChange={(value) =>
                    setLanguageConfig({ language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSetLanguage}
                disabled={!isConnected || isLoading || !selectedDevice}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Set Language
              </Button>
            </CardContent>
          </Card>

          {/* Device Control */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Device Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Restart Device */}
              <div>
                <h4 className="font-medium mb-2">Device Restart</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Restart the device. Device will be offline for 30-60 seconds.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!isConnected || isLoading || !selectedDevice}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Restart Device
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Confirm Device Restart
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restart the selected device. The device will
                        be offline for 30-60 seconds.
                        {selectedDevice === "all" &&
                          " This will restart ALL devices simultaneously."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestartDevice}>
                        Restart
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Separator />

              {/* Reset Device Data */}
              <div>
                <h4 className="font-medium mb-2">Reset Device Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Clear device data. This action cannot be undone.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="reset-type">Reset Type</Label>
                    <Select
                      value={resetConfig.resetType}
                      onValueChange={(value) =>
                        setResetConfig({ ...resetConfig, resetType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESET_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {type.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="confirm-text">
                      Type "CONFIRM" to proceed
                    </Label>
                    <Input
                      id="confirm-text"
                      placeholder="CONFIRM"
                      value={resetConfig.confirmText}
                      onChange={(e) =>
                        setResetConfig({
                          ...resetConfig,
                          confirmText: e.target.value,
                        })
                      }
                    />
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={
                          !isConnected ||
                          isLoading ||
                          !selectedDevice ||
                          resetConfig.confirmText !== "CONFIRM"
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Device Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ⚠️ DESTRUCTIVE ACTION
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete{" "}
                          {resetConfig.resetType === "all"
                            ? "ALL DATA"
                            : resetConfig.resetType}{" "}
                          from the device. This action cannot be undone.
                          {selectedDevice === "all" &&
                            " This will affect ALL devices."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetDevice}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Reset Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
