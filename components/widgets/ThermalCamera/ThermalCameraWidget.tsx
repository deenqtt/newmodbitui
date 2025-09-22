// File: components/widgets/ThermalCamera/ThermalCameraWidget.tsx (Step 5 - Final)
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Thermometer,
  Pause,
  Play,
  RotateCcw,
  Maximize2,
  WifiOff,
  Activity,
  AlertTriangle,
  Settings,
} from "lucide-react";

interface ThermalConfig {
  title?: string;
  deviceId?: string | null; // Device ID from config modal
  customTopic?: string | null; // Custom topic override
  refreshRate?: number;
  colorScheme?: "rainbow" | "ironbow" | "heat" | "cool";
  showStats?: boolean;
  showControls?: boolean;
  showTooltip?: boolean;
  interpolation?: "nearest" | "smooth";
}

interface ThermalData {
  timestamp: string;
  device_id: string;
  device_name: string;
  interface: string;
  location?: string;
  thermal_data: {
    raw_array: number[];
    statistics: {
      min_temp: number;
      max_temp: number;
      avg_temp: number;
      median_temp: number;
      std_temp: number;
    };
    frame_count: number;
    cycle?: number;
    total_frames?: number;
  };
  metadata: {
    resolution: string;
    units: string;
  };
}

interface MousePosition {
  x: number;
  y: number;
  temperature: number;
}

const COLOR_SCHEMES = {
  rainbow: [
    "#000033",
    "#000080",
    "#0000CC",
    "#0040FF",
    "#0080FF",
    "#00CCFF",
    "#00FFCC",
    "#00FF80",
    "#40FF40",
    "#80FF00",
    "#CCFF00",
    "#FFCC00",
    "#FF8000",
    "#FF4000",
    "#FF0000",
    "#FFFFFF",
  ],
  ironbow: [
    "#000000",
    "#1a0033",
    "#330066",
    "#4d0099",
    "#6600cc",
    "#8000ff",
    "#9933ff",
    "#b366ff",
    "#cc99ff",
    "#e6ccff",
    "#ffcccc",
    "#ff9999",
    "#ff6666",
    "#ff3333",
    "#ff0000",
    "#ffffff",
  ],
  heat: [
    "#000000",
    "#330000",
    "#660000",
    "#990000",
    "#cc0000",
    "#ff0000",
    "#ff3300",
    "#ff6600",
    "#ff9900",
    "#ffcc00",
    "#ffff00",
    "#ffffff",
  ],
  cool: [
    "#000066",
    "#0000cc",
    "#0033ff",
    "#0066ff",
    "#0099ff",
    "#00ccff",
    "#33ffff",
    "#66ffff",
    "#99ffff",
    "#ccffff",
    "#ffffff",
  ],
};

export function ThermalCameraWidget({ config }: { config: ThermalConfig }) {
  const { isReady, subscribe, unsubscribe } = useMqtt();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Widget state
  const [thermalData, setThermalData] = useState<ThermalData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [mousePos, setMousePos] = useState<MousePosition | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Device and topic management
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);

  // Configuration with defaults
  const colorScheme = config.colorScheme || "rainbow";
  const showStats = config.showStats !== false;
  const showControls = config.showControls !== false;
  const interpolation = config.interpolation || "nearest";

  // Topic resolution function
  const resolveTopicFromConfig = useCallback(async () => {
    setIsLoadingTopic(true);
    setTopicError(null);

    try {
      // Priority 1: Custom topic override
      if (config.customTopic?.trim()) {
        console.log(`Using custom topic: ${config.customTopic}`);
        setCurrentTopic(config.customTopic.trim());
        setDeviceInfo(null);
        return;
      }

      // Priority 2: Device ID provided - fetch device info
      if (config.deviceId) {
        console.log(`Fetching device info for ID: ${config.deviceId}`);

        const response = await fetch("/api/devices/thermal");
        const data = await response.json();

        if (data.success) {
          const device = data.devices.find(
            (d: any) => d.id === config.deviceId
          );

          if (device) {
            console.log(
              `Found device: ${device.name} with topic: ${device.topic}`
            );
            setDeviceInfo(device);
            setCurrentTopic(device.topic);
            return;
          } else {
            throw new Error(`Device with ID ${config.deviceId} not found`);
          }
        } else {
          throw new Error("Failed to fetch device list");
        }
      }

      // Priority 3: No configuration - show error
      setTopicError(
        "No thermal device configured. Please open widget settings to select a device."
      );
      setCurrentTopic(null);
      setDeviceInfo(null);
    } catch (error) {
      console.error("Error resolving topic:", error);
      setTopicError(
        error instanceof Error ? error.message : "Failed to resolve topic"
      );
      setCurrentTopic(null);
      setDeviceInfo(null);
    } finally {
      setIsLoadingTopic(false);
    }
  }, [config.deviceId, config.customTopic]);

  // Load topic when config changes
  useEffect(() => {
    resolveTopicFromConfig();
  }, [resolveTopicFromConfig]);

  // Reset connection state when topic changes
  useEffect(() => {
    if (currentTopic) {
      setIsConnected(false);
      setThermalData(null);
      setFrameCount(0);
      setLastUpdate(null);
    }
  }, [currentTopic]);

  // Resize observer for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: width - 8, height: height - 8 });
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // MQTT subscription with dynamic topic
  useEffect(() => {
    if (!isReady || !currentTopic || isPaused) return;

    console.log(`ThermalWidget: Subscribing to topic: ${currentTopic}`);

    const handleThermalMessage = (receivedTopic: string, payload: string) => {
      if (receivedTopic === currentTopic) {
        try {
          const data: ThermalData = JSON.parse(payload);

          // Validate thermal data structure
          if (data.thermal_data?.raw_array?.length > 0) {
            setThermalData(data);
            setIsConnected(true);
            setLastUpdate(new Date());
            setFrameCount((prev) => prev + 1);
            setTopicError(null);

            console.log(
              `Received thermal data from ${data.device_id}: ${data.thermal_data.raw_array.length} pixels`
            );
          } else {
            console.warn("Received invalid thermal data structure");
          }
        } catch (error) {
          console.error("Error parsing thermal data:", error);
          setTopicError("Invalid thermal data format received");
        }
      }
    };

    subscribe(currentTopic, handleThermalMessage);

    // Connection timeout - mark as disconnected if no data after 30 seconds
    const timeout = setTimeout(() => {
      if (!thermalData) {
        setIsConnected(false);
        setTopicError(`No thermal data received from topic: ${currentTopic}`);
      }
    }, 30000);

    return () => {
      unsubscribe(currentTopic, handleThermalMessage);
      clearTimeout(timeout);
    };
  }, [isReady, currentTopic, isPaused, subscribe, unsubscribe, thermalData]);

  // Render heatmap
  useEffect(() => {
    if (!thermalData || !canvasSize.width || !canvasSize.height) return;
    renderHeatmap(thermalData);
  }, [thermalData, canvasSize, colorScheme, interpolation]);

  const renderHeatmap = useCallback(
    (data: ThermalData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { raw_array, statistics } = data.thermal_data;
      const { min_temp, max_temp } = statistics;
      const [dataWidth, dataHeight] = data.metadata.resolution
        .split("x")
        .map(Number);

      // Set canvas size
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      // Calculate scaling
      const scaleX = canvasSize.width / dataWidth;
      const scaleY = canvasSize.height / dataHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      const colors = COLOR_SCHEMES[colorScheme];
      const tempRange = max_temp - min_temp;

      // Set interpolation
      ctx.imageSmoothingEnabled = interpolation === "smooth";

      // Draw thermal pixels
      for (let y = 0; y < dataHeight; y++) {
        for (let x = 0; x < dataWidth; x++) {
          const index = y * dataWidth + x;
          const temp = raw_array[index];
          const normalized =
            tempRange > 0
              ? Math.max(0, Math.min(1, (temp - min_temp) / tempRange))
              : 0;
          const colorIndex = Math.floor(normalized * (colors.length - 1));
          const color = colors[colorIndex];

          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(x * scaleX),
            Math.floor(y * scaleY),
            Math.ceil(scaleX),
            Math.ceil(scaleY)
          );
        }
      }
    },
    [canvasSize, colorScheme, interpolation]
  );

  // Mouse interaction
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!thermalData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      const [dataWidth, dataHeight] = thermalData.metadata.resolution
        .split("x")
        .map(Number);

      const dataX = Math.floor((canvasX / rect.width) * dataWidth);
      const dataY = Math.floor((canvasY / rect.height) * dataHeight);

      if (dataX >= 0 && dataX < dataWidth && dataY >= 0 && dataY < dataHeight) {
        const index = dataY * dataWidth + dataX;
        const temperature = thermalData.thermal_data.raw_array[index];

        setMousePos({
          x: 0,
          y: 0,
          temperature,
        });
      }
    },
    [thermalData]
  );

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  // Utility functions
  const formatTemperature = (temp: number) => `${temp.toFixed(1)}°C`;

  const getConnectionStatus = () => {
    if (isLoadingTopic)
      return { color: "bg-blue-500", text: "Loading...", icon: Activity };
    if (!isReady)
      return { color: "bg-slate-500", text: "Connecting...", icon: Activity };
    if (topicError)
      return { color: "bg-red-500", text: "Error", icon: AlertTriangle };
    if (!currentTopic)
      return { color: "bg-yellow-500", text: "No Device", icon: Settings };
    if (!isConnected)
      return { color: "bg-red-500", text: "No Data", icon: WifiOff };
    if (isPaused) return { color: "bg-amber-500", text: "Paused", icon: Pause };
    return { color: "bg-green-500", text: "Live", icon: Activity };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getDisplayTitle = () => {
    if (config.title) return config.title;
    if (deviceInfo?.name) return deviceInfo.name;
    if (config.customTopic) return "Custom Thermal Source";
    return "Thermal Camera";
  };

  return (
    <Card
      className={`h-full flex flex-col transition-all duration-300 ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""
      }`}
    >
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Thermometer className="h-4 w-4 text-orange-500" />
            {getDisplayTitle()}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2 py-1">
              <StatusIcon className="w-2 h-2 mr-1.5" />
              <div
                className={`w-1.5 h-1.5 rounded-full ${connectionStatus.color} mr-1.5`}
              />
              {connectionStatus.text}
            </Badge>

            {showControls && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? "Resume" : "Pause"}
                  disabled={!currentTopic || !isConnected}
                >
                  {isPaused ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setFrameCount(0)}
                  title="Reset counter"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3">
        <div className="h-full flex flex-col gap-3">
          {/* Configuration Error Display */}
          {topicError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Configuration Issue</span>
              </div>
              <p className="text-xs text-red-700 mt-1">{topicError}</p>
              {!config.deviceId && !config.customTopic && (
                <p className="text-xs text-red-600 mt-2">
                  Open widget settings to configure a thermal device.
                </p>
              )}
            </div>
          )}

          {/* Thermal Display */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden border border-slate-700/50"
          >
            {thermalData ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  imageRendering:
                    interpolation === "nearest" ? "pixelated" : "auto",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <div className="text-center max-w-xs">
                  <Thermometer className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    {isLoadingTopic
                      ? "Loading device info..."
                      : topicError
                      ? "Configuration Error"
                      : currentTopic
                      ? "Waiting for thermal data..."
                      : "No device configured"}
                  </p>
                  {currentTopic && !topicError && (
                    <p className="text-xs opacity-70 mt-2 font-mono break-all">
                      {currentTopic}
                    </p>
                  )}
                  {deviceInfo && (
                    <div className="text-xs opacity-70 mt-2">
                      <p>Device: {deviceInfo.name}</p>
                      <p>
                        Status: {deviceInfo.isActive ? "Online" : "Offline"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Device Info Badges */}
            {thermalData && (
              <div className="absolute top-2 left-2 flex gap-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-black/20 text-white border-white/20"
                >
                  {thermalData.interface?.toUpperCase() || "UNKNOWN"}
                </Badge>
                {deviceInfo?.deviceId && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-black/20 text-white border-white/20"
                  >
                    {deviceInfo.deviceId}
                  </Badge>
                )}
                {config.customTopic && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-black/20 text-white border-white/20"
                  >
                    CUSTOM
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          {showStats && thermalData && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Min
                </div>
                <div className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                  {formatTemperature(
                    thermalData.thermal_data.statistics.min_temp
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg p-2 border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Max
                </div>
                <div className="font-mono font-bold text-sm text-red-700 dark:text-red-300">
                  {formatTemperature(
                    thermalData.thermal_data.statistics.max_temp
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-2 border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Avg
                </div>
                <div className="font-mono font-bold text-sm text-green-700 dark:text-green-300">
                  {formatTemperature(
                    thermalData.thermal_data.statistics.avg_temp
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Current
                </div>
                <div className="font-mono font-bold text-sm text-orange-700 dark:text-orange-300">
                  {mousePos ? formatTemperature(mousePos.temperature) : "--°C"}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Frames
                </div>
                <div className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300">
                  {frameCount}
                </div>
              </div>
            </div>
          )}

          {/* Status Footer */}
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>
              {lastUpdate ? lastUpdate.toLocaleTimeString() : "No data"}
            </span>
            <div className="flex items-center gap-2">
              <span className="capitalize font-medium">
                {colorScheme} • {thermalData?.metadata.resolution || "N/A"}
              </span>
              {deviceInfo && (
                <span className="text-slate-400">
                  {deviceInfo.isActive ? "Online" : "Offline"}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
