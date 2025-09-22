// File: components/widgets/ThermalCamera/ThermalCameraConfigModal.tsx (Step 4)
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Thermometer,
  Palette,
  Settings,
  Monitor,
  MousePointer,
  Maximize2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
} from "lucide-react";

interface ThermalDevice {
  id: string;
  name: string;
  topic: string;
  deviceId: string;
  isActive: boolean;
  lastSeen: string | null;
  interface?: string;
  location?: string;
  status: "online" | "offline";
  lastTemperature?: {
    min: number;
    max: number;
    avg: number;
  } | null;
}

interface DeviceApiResponse {
  success: boolean;
  devices: ThermalDevice[];
  summary: {
    totalDevices: number;
    activeDevices: number;
    inactiveDevices: number;
    listenerConnected: boolean;
    autoDiscovery: boolean;
  };
}

interface ThermalCameraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export function ThermalCameraConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig = {},
}: ThermalCameraConfigModalProps) {
  // Basic config states
  const [title, setTitle] = useState(initialConfig.title || "Thermal Camera");
  const [refreshRate, setRefreshRate] = useState(
    initialConfig.refreshRate || 1000
  );
  const [colorScheme, setColorScheme] = useState(
    initialConfig.colorScheme || "rainbow"
  );
  const [showStats, setShowStats] = useState(initialConfig.showStats !== false);
  const [showControls, setShowControls] = useState(
    initialConfig.showControls !== false
  );
  const [showTooltip, setShowTooltip] = useState(
    initialConfig.showTooltip !== false
  );
  const [interpolation, setInterpolation] = useState(
    initialConfig.interpolation || "nearest"
  );

  // NEW: Device selection states
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    initialConfig.deviceId || ""
  );
  const [customTopic, setCustomTopic] = useState(
    initialConfig.customTopic || ""
  );
  const [useCustomTopic, setUseCustomTopic] = useState(
    !!initialConfig.customTopic
  );

  // Device management states
  const [devices, setDevices] = useState<ThermalDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [apiSummary, setApiSummary] = useState<any>(null);

  // Manual device registration states
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceTopic, setNewDeviceTopic] = useState("");
  const [addingDevice, setAddingDevice] = useState(false);

  // Load devices when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    setDeviceError(null);

    try {
      const response = await fetch("/api/devices/thermal");
      const data: DeviceApiResponse = await response.json();

      if (data.success) {
        setDevices(data.devices);
        setApiSummary(data.summary);
        console.log(`Loaded ${data.devices.length} thermal devices`);
      } else {
        throw new Error("Failed to fetch devices");
      }
    } catch (error) {
      console.error("Error loading thermal devices:", error);
      setDeviceError(
        "Failed to load thermal devices. Please check your connection."
      );
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const addNewDevice = async () => {
    if (!newDeviceName.trim() || !newDeviceTopic.trim()) {
      setDeviceError("Device name and topic are required");
      return;
    }

    setAddingDevice(true);
    setDeviceError(null);

    try {
      const response = await fetch("/api/devices/thermal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDeviceName.trim(),
          topic: newDeviceTopic.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("Device added successfully:", data.device);

        // Refresh device list
        await loadDevices();

        // Auto-select the new device
        setSelectedDeviceId(data.device.id);

        // Reset form
        setNewDeviceName("");
        setNewDeviceTopic("");
        setShowAddDevice(false);
      } else {
        setDeviceError(data.error || "Failed to add device");
      }
    } catch (error) {
      console.error("Error adding device:", error);
      setDeviceError("Failed to add device. Please try again.");
    } finally {
      setAddingDevice(false);
    }
  };

  const getSelectedDevice = () => {
    return devices.find((d) => d.id === selectedDeviceId) || null;
  };

  const getEffectiveTopic = () => {
    if (useCustomTopic && customTopic.trim()) {
      return customTopic.trim();
    }

    const selectedDevice = getSelectedDevice();
    return selectedDevice?.topic || null;
  };

  const handleSave = () => {
    const config = {
      title,
      refreshRate,
      colorScheme,
      showStats,
      showControls,
      showTooltip,
      interpolation,
      // NEW: Device selection
      deviceId: useCustomTopic ? null : selectedDeviceId,
      customTopic: useCustomTopic ? customTopic.trim() : null,
    };

    console.log("Saving thermal widget config:", config);
    onSave(config);
  };

  const handleCancel = () => {
    // Reset to initial values
    setTitle(initialConfig.title || "Thermal Camera");
    setRefreshRate(initialConfig.refreshRate || 1000);
    setColorScheme(initialConfig.colorScheme || "rainbow");
    setShowStats(initialConfig.showStats !== false);
    setShowControls(initialConfig.showControls !== false);
    setShowTooltip(initialConfig.showTooltip !== false);
    setInterpolation(initialConfig.interpolation || "nearest");
    setSelectedDeviceId(initialConfig.deviceId || "");
    setCustomTopic(initialConfig.customTopic || "");
    setUseCustomTopic(!!initialConfig.customTopic);

    onClose();
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" />
            Configure Thermal Camera Widget
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="device" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="device" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Device
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Display
            </TabsTrigger>
            <TabsTrigger
              value="interaction"
              className="flex items-center gap-2"
            >
              <MousePointer className="h-4 w-4" />
              Interaction
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* DEVICE SELECTION TAB */}
          <TabsContent value="device" className="space-y-6 mt-6">
            {/* Widget Title */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium">
                Widget Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter widget title"
                className="w-full"
              />
            </div>

            {/* Device List Header */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  Thermal Device Source
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which thermal camera device to display
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDevices}
                  disabled={loadingDevices}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loadingDevices ? "animate-spin" : ""
                    }`}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDevice(!showAddDevice)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Connection Status */}
            {apiSummary && (
              <div
                className={`p-3 rounded-lg border ${
                  apiSummary.listenerConnected
                    ? "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800"
                    : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {apiSummary.listenerConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="font-medium">
                    MQTT Listener:{" "}
                    {apiSummary.listenerConnected
                      ? "Connected"
                      : "Disconnected"}
                  </span>
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {apiSummary.totalDevices} devices • {apiSummary.activeDevices}{" "}
                  active • Auto-discovery:{" "}
                  {apiSummary.autoDiscovery ? "enabled" : "disabled"}
                </div>
              </div>
            )}

            {/* Error Display */}
            {deviceError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-xs text-red-700 mt-1">{deviceError}</p>
              </div>
            )}

            {/* Add New Device Form */}
            {showAddDevice && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium text-sm mb-3">
                  Add New Thermal Device
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="newDeviceName" className="text-xs">
                        Device Name
                      </Label>
                      <Input
                        id="newDeviceName"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                        placeholder="Thermal Zone 1"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newDeviceTopic" className="text-xs">
                        MQTT Topic
                      </Label>
                      <Input
                        id="newDeviceTopic"
                        value={newDeviceTopic}
                        onChange={(e) => setNewDeviceTopic(e.target.value)}
                        placeholder="factory/thermal/zone1/data"
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={addNewDevice}
                      disabled={
                        addingDevice ||
                        !newDeviceName.trim() ||
                        !newDeviceTopic.trim()
                      }
                    >
                      {addingDevice ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Add Device
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddDevice(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Device Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="useCustomTopic"
                  checked={!useCustomTopic}
                  onCheckedChange={(checked) => setUseCustomTopic(!checked)}
                />
                <Label htmlFor="useCustomTopic" className="text-sm">
                  Select from registered devices
                </Label>
              </div>

              {!useCustomTopic ? (
                <Select
                  value={selectedDeviceId}
                  onValueChange={setSelectedDeviceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select thermal device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDevices ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading devices...
                        </div>
                      </SelectItem>
                    ) : devices.length === 0 ? (
                      <SelectItem value="no-devices" disabled>
                        No thermal devices found
                      </SelectItem>
                    ) : (
                      devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          <div className="flex items-center gap-2 w-full">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                device.isActive ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{device.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {device.topic} •{" "}
                                {formatLastSeen(device.lastSeen)}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customTopic" className="text-sm">
                    Custom MQTT Topic
                  </Label>
                  <Input
                    id="customTopic"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="sensors/custom_thermal/data"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a custom MQTT topic for specialized thermal data sources
                  </p>
                </div>
              )}
            </div>

            {/* Selected Device Info */}
            {!useCustomTopic && selectedDeviceId && (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                {(() => {
                  const device = getSelectedDevice();
                  if (!device) return null;

                  return (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">
                        Selected Device: {device.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">
                            Topic:
                          </span>
                          <div className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded mt-1">
                            {device.topic}
                          </div>
                        </div>
                        <div>
                          <span className="text-blue-700 dark:text-blue-300">
                            Status:
                          </span>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                device.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  device.isActive
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                              />
                              {device.status}
                            </span>
                          </div>
                        </div>
                        {device.interface && (
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">
                              Interface:
                            </span>
                            <div className="mt-1 font-medium">
                              {device.interface.toUpperCase()}
                            </div>
                          </div>
                        )}
                        {device.lastTemperature && (
                          <div>
                            <span className="text-blue-700 dark:text-blue-300">
                              Last Reading:
                            </span>
                            <div className="mt-1 font-mono">
                              {device.lastTemperature.avg.toFixed(1)}°C
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Effective Topic Display */}
            {getEffectiveTopic() && (
              <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">
                  Effective MQTT Topic:
                </Label>
                <div className="font-mono text-sm mt-1 break-all">
                  {getEffectiveTopic()}
                </div>
              </div>
            )}
          </TabsContent>

          {/* DISPLAY TAB */}
          <TabsContent value="display" className="space-y-6 mt-6">
            {/* Color Scheme */}
            <div className="space-y-3">
              <Label
                htmlFor="colorScheme"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Color Scheme
              </Label>
              <Select value={colorScheme} onValueChange={setColorScheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rainbow">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded-sm"></div>
                      Rainbow (Full Spectrum)
                    </div>
                  </SelectItem>
                  <SelectItem value="ironbow">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-gradient-to-r from-purple-900 via-red-600 to-yellow-300 rounded-sm"></div>
                      Ironbow (Metal Heat)
                    </div>
                  </SelectItem>
                  <SelectItem value="heat">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-gradient-to-r from-black via-red-600 to-white rounded-sm"></div>
                      Heat (Red-Yellow-White)
                    </div>
                  </SelectItem>
                  <SelectItem value="cool">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-gradient-to-r from-blue-900 via-cyan-400 to-white rounded-sm"></div>
                      Cool (Blue-White)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interpolation */}
            <div className="space-y-3">
              <Label htmlFor="interpolation" className="text-sm font-medium">
                Image Quality
              </Label>
              <Select value={interpolation} onValueChange={setInterpolation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">
                    Pixelated (Sharp edges)
                  </SelectItem>
                  <SelectItem value="smooth">Smooth (Interpolated)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Display Elements</Label>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="showStats" className="text-sm font-medium">
                      Temperature Statistics
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Show min, max, average temperature and frame count
                    </div>
                  </div>
                  <Switch
                    id="showStats"
                    checked={showStats}
                    onCheckedChange={setShowStats}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="showControls"
                      className="text-sm font-medium"
                    >
                      Playback Controls
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Display pause/play, reset, and fullscreen buttons
                    </div>
                  </div>
                  <Switch
                    id="showControls"
                    checked={showControls}
                    onCheckedChange={setShowControls}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* INTERACTION TAB */}
          <TabsContent value="interaction" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Mouse Interaction
              </Label>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="showTooltip" className="text-sm font-medium">
                    Temperature Tooltip
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Show temperature value when hovering over thermal image
                  </div>
                </div>
                <Switch
                  id="showTooltip"
                  checked={showTooltip}
                  onCheckedChange={setShowTooltip}
                />
              </div>
            </div>

            {/* Refresh Rate */}
            <div className="space-y-3">
              <Label htmlFor="refreshRate" className="text-sm font-medium">
                Refresh Rate
              </Label>
              <Select
                value={refreshRate.toString()}
                onValueChange={(value) => setRefreshRate(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="250">
                    250ms (4 FPS) - Ultra High
                  </SelectItem>
                  <SelectItem value="500">500ms (2 FPS) - High</SelectItem>
                  <SelectItem value="1000">1000ms (1 FPS) - Normal</SelectItem>
                  <SelectItem value="2000">2000ms (0.5 FPS) - Low</SelectItem>
                  <SelectItem value="5000">
                    5000ms (0.2 FPS) - Very Low
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to update the thermal display. Lower values use more
                resources.
              </p>
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-sm text-amber-900 dark:text-amber-100">
                    Configuration Notes
                  </div>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <li>
                      • Device selection determines which thermal camera data to
                      display
                    </li>
                    <li>
                      • Custom topics override device selection and allow manual
                      MQTT topic specification
                    </li>
                    <li>
                      • Auto-discovery will detect new thermal devices
                      automatically
                    </li>
                    <li>
                      • Widget will show error if selected device goes offline
                    </li>
                    <li>
                      • Lower refresh rates improve performance and reduce
                      bandwidth usage
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Configuration Summary */}
            <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3">
                Configuration Summary
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Data Source:</span>
                  <span className="font-mono">
                    {useCustomTopic
                      ? customTopic || "Custom topic"
                      : getSelectedDevice()?.name || "No device selected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Topic:</span>
                  <span className="font-mono">
                    {getEffectiveTopic() || "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Color Scheme:</span>
                  <span className="capitalize">{colorScheme}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refresh Rate:</span>
                  <span>{refreshRate}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Statistics:</span>
                  <span>{showStats ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Controls:</span>
                  <span>{showControls ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={!getEffectiveTopic()}
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
