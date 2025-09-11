"use client";

import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SidebarInset } from "@/components/ui/sidebar";
import {
  Loader2,
  Settings,
  Clock,
  Globe,
  Power,
  Trash2,
  Calendar,
  Languages,
  Server,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Monitor,
  Cpu,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  {
    value: "users",
    label: "Users Only",
    description: "Clear all user data",
    icon: "👥",
  },
  {
    value: "attendance",
    label: "Attendance Records",
    description: "Clear attendance logs",
    icon: "📊",
  },
  {
    value: "templates",
    label: "Fingerprint Templates",
    description: "Clear biometric data",
    icon: "👆",
  },
  {
    value: "all",
    label: "All Data",
    description: "Complete device reset",
    icon: "⚠️",
  },
];

// --- Main Component
export default function DeviceConfiguration() {
  const router = useRouter();
  const requestTopic = "accessControl/device/command";
  const responseTopic = "accessControl/device/response";

  const { isReady, connectionStatus, publish } = useMqtt();
  const { payloads } = useConnectivity([responseTopic]);
  const isConnected = connectionStatus === "Connected";

  // States
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<ConfigurationResponse | null>(null);

  // Time configuration
  const [timeConfig, setTimeConfig] = useState({
    datetime: new Date().toISOString().slice(0, 16),
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
      data: { device_id: selectedDevice, timestamp: timestamp },
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
      data: { device_id: selectedDevice },
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
      data: { device_id: selectedDevice, language: languageConfig.language },
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

  // Handle MQTT payloads
  useEffect(() => {
    if (payloads && Array.isArray(payloads) && payloads.length > 0) {
      const latestPayload = payloads[payloads.length - 1];
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4 md:p-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {/* Connection Status */}
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-slate-800 shadow-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>{connectionStatus}</span>
              </div>
            </div>

            {/* Page Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Device Configuration
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Configure ZKTeco device settings and parameters
                </p>
              </div>
            </div>
          </div>

          {/* Device Selection Card */}
          <Card className="mb-6 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <CardTitle className="flex items-center gap-3">
                <Server className="h-5 w-5 text-blue-600" />
                Device Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex-1 w-full">
                  <Label
                    htmlFor="device-select"
                    className="text-sm font-medium mb-2 block"
                  >
                    Select Target Device
                  </Label>
                  <Select
                    value={selectedDevice}
                    onValueChange={setSelectedDevice}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a device to configure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          All Devices
                        </div>
                      </SelectItem>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                device.enabled ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <span>{device.name}</span>
                            <span className="text-slate-500">
                              ({device.ip})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={fetchDeviceList}
                  variant="outline"
                  className="whitespace-nowrap"
                  disabled={!isConnected}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Refresh Devices
                </Button>
              </div>

              {selectedDeviceInfo && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <HardDrive className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {selectedDeviceInfo.name}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedDeviceInfo.ip}:
                        {selectedDeviceInfo.port || 4370}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Status */}
          {lastResponse && (
            <Card
              className={`mb-6 border-0 shadow-lg ${
                lastResponse.status === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {lastResponse.status === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <span
                    className={`font-medium ${
                      lastResponse.status === "success"
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}
                  >
                    {lastResponse.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Configuration */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                <CardTitle className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Time Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="use-system-time"
                      checked={timeConfig.useSystemTime}
                      onCheckedChange={(checked) =>
                        setTimeConfig({ ...timeConfig, useSystemTime: checked })
                      }
                    />
                    <Label htmlFor="use-system-time" className="font-medium">
                      Use current system time
                    </Label>
                  </div>

                  {!timeConfig.useSystemTime && (
                    <div className="space-y-2">
                      <Label htmlFor="datetime" className="text-sm font-medium">
                        Set Custom Time
                      </Label>
                      <Input
                        id="datetime"
                        type="datetime-local"
                        value={timeConfig.datetime}
                        onChange={(e) =>
                          setTimeConfig({
                            ...timeConfig,
                            datetime: e.target.value,
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleSetTime}
                      disabled={!isConnected || isLoading || !selectedDevice}
                      className="flex-1"
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
                      className="flex-1"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Get Time
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Configuration */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                <CardTitle className="flex items-center gap-3">
                  <Languages className="h-5 w-5 text-purple-600" />
                  Language Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium">
                      Device Language
                    </Label>
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
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4 mr-2" />
                    )}
                    Set Language
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Control Section */}
          <Card className="mt-6 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <CardTitle className="flex items-center gap-3">
                <Power className="h-5 w-5 text-red-600" />
                Device Control & Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Restart Device */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Power className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Device Restart</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Restart the device safely
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Device will be offline for 30-60 seconds during restart.
                      {selectedDevice === "all" &&
                        " This will restart ALL devices simultaneously."}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!isConnected || isLoading || !selectedDevice}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
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

                {/* Reset Device Data */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Reset Device Data
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Permanently clear device data
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="reset-type"
                        className="text-sm font-medium mb-2 block"
                      >
                        Reset Type
                      </Label>
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
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <div>
                                  <div className="font-medium">
                                    {type.label}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {type.description}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="confirm-text"
                        className="text-sm font-medium mb-2 block"
                      >
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
                        className="font-mono"
                      />
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800 dark:text-red-200">
                          Warning: Destructive Action
                        </span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This action cannot be undone. All selected data will be
                        permanently deleted.
                      </p>
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
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reset Device Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            DESTRUCTIVE ACTION
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
