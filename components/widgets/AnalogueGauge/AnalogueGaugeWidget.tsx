// File: components/widgets/AnalogueGauge/AnalogueGaugeWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import GaugeChart from "react-gauge-chart";
import {
  Loader2,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Activity,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    minValue?: number;
    maxValue?: number;
  };
}

export const AnalogueGaugeWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Enhanced responsive system
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    valueFontSize: 24,
    labelFontSize: 10,
    unitFontSize: 12,
    gaugeSize: 1,
    padding: 16,
  });
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "large">(
    "normal"
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Determine layout mode based on size
      const area = width * height;
      let currentLayoutMode: "compact" | "normal" | "large";

      if (area < 20000 || Math.min(width, height) < 120) {
        currentLayoutMode = "compact";
      } else if (area > 60000 && Math.min(width, height) > 200) {
        currentLayoutMode = "large";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // Calculate responsive sizes
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      const baseScale = minDimension / 150;

      const sizeConfigs = {
        compact: {
          titleFontSize: Math.max(10, baseScale * 12),
          valueFontSize: Math.max(14, baseScale * 20),
          labelFontSize: Math.max(8, baseScale * 9),
          unitFontSize: Math.max(9, baseScale * 11),
          gaugeSize: Math.max(0.7, Math.min(1, minDimension / 120)),
          padding: Math.max(8, baseScale * 10),
        },
        normal: {
          titleFontSize: Math.max(12, baseScale * 14),
          valueFontSize: Math.max(18, baseScale * 26),
          labelFontSize: Math.max(9, baseScale * 11),
          unitFontSize: Math.max(11, baseScale * 13),
          gaugeSize: Math.max(0.8, Math.min(1.2, minDimension / 140)),
          padding: Math.max(12, baseScale * 16),
        },
        large: {
          titleFontSize: Math.max(14, baseScale * 16),
          valueFontSize: Math.max(22, baseScale * 32),
          labelFontSize: Math.max(10, baseScale * 12),
          unitFontSize: Math.max(12, baseScale * 15),
          gaugeSize: Math.max(1, Math.min(1.5, minDimension / 160)),
          padding: Math.max(16, baseScale * 20),
        },
      };

      setDynamicSizes(sizeConfigs[currentLayoutMode]);
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setStatus("error");
      setErrorMessage("Device not configured.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Device not found`);
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchDeviceTopic();
  }, [config.deviceUniqId]);

  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(config.selectedKey)) {
          const rawValue = innerPayload[config.selectedKey];
          if (typeof rawValue === "number") {
            const finalValue = rawValue * (config.multiply || 1);
            setPreviousValue(currentValue);
            setCurrentValue(finalValue);
            setStatus("ok");
            setLastUpdate(new Date());
          }
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload for gauge:", e);
      }
    },
    [config.selectedKey, config.multiply, currentValue]
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => {
        unsubscribe(topic, handleMqttMessage);
      };
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const { minValue = 0, maxValue = 100, units = "" } = config;

  // Enhanced gauge calculations
  const gaugePercent =
    currentValue !== null
      ? Math.max(
          0,
          Math.min(1, (currentValue - minValue) / (maxValue - minValue))
        )
      : 0;

  // Calculate trend
  const getTrend = () => {
    if (currentValue === null || previousValue === null) return null;
    if (currentValue > previousValue) return "up";
    if (currentValue < previousValue) return "down";
    return "stable";
  };

  // Enhanced status styling
  const getStatusStyling = () => {
    switch (status) {
      case "ok":
        return {
          bg: "bg-gradient-to-br from-white to-emerald-50",
          border: "border-emerald-200",
          indicator: "bg-emerald-500 shadow-emerald-400/50",
        };
      case "error":
        return {
          bg: "bg-gradient-to-br from-white to-red-50",
          border: "border-red-200",
          indicator: "bg-red-500 shadow-red-400/50",
        };
      case "waiting":
        return {
          bg: "bg-gradient-to-br from-white to-amber-50",
          border: "border-amber-200",
          indicator: "bg-amber-500 shadow-amber-400/50",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-white to-slate-50",
          border: "border-slate-200",
          indicator: "bg-slate-400 shadow-slate-400/50",
        };
    }
  };

  // Enhanced gauge colors based on value ranges
  const getGaugeColors = () => {
    const range = maxValue - minValue;
    const lowThreshold = minValue + range * 0.3;
    const highThreshold = minValue + range * 0.7;

    if (currentValue === null) {
      return ["#e2e8f0", "#cbd5e1", "#94a3b8"]; // Gray for no data
    }

    return ["#10b981", "#f59e0b", "#ef4444"]; // Green -> Yellow -> Red
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-4 text-center h-full">
      <div className="relative">
        <div
          className="bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200"
          style={{
            width: Math.max(dimensions.width / 4, 60),
            height: Math.max(dimensions.width / 4, 60),
          }}
        >
          <Loader2
            className="animate-spin text-blue-600"
            style={{
              width: Math.max(dimensions.width / 8, 24),
              height: Math.max(dimensions.width / 8, 24),
            }}
          />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-ping opacity-30" />
      </div>
      <p
        className="text-slate-600 font-medium"
        style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
      >
        Loading gauge...
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-4 text-center h-full">
      <div className="relative">
        <div
          className="bg-red-100 rounded-full flex items-center justify-center border-2 border-red-200"
          style={{
            width: Math.max(dimensions.width / 4, 60),
            height: Math.max(dimensions.width / 4, 60),
          }}
        >
          <AlertTriangle
            className="text-red-600"
            style={{
              width: Math.max(dimensions.width / 8, 24),
              height: Math.max(dimensions.width / 8, 24),
            }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <p
          className="text-red-700 font-semibold"
          style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
        >
          Connection Error
        </p>
        <p
          className="text-red-600 opacity-80 break-words max-w-full"
          style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
        >
          {errorMessage.length > 40
            ? `${errorMessage.substring(0, 40)}...`
            : errorMessage}
        </p>
      </div>
    </div>
  );

  const renderGaugeContent = () => {
    if (
      status === "loading" ||
      (status === "waiting" && currentValue === null)
    ) {
      return renderLoadingState();
    }

    if (status === "error") {
      return renderErrorState();
    }

    const trend = getTrend();

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        {/* Main Gauge */}
        <div
          className="relative w-full flex items-center justify-center"
          style={{ height: `${dimensions.height * 0.7}px` }}
        >
          <GaugeChart
            id={`gauge-chart-${config.deviceUniqId}`}
            nrOfLevels={20}
            colors={getGaugeColors()}
            arcWidth={0.25}
            percent={gaugePercent}
            textColor="transparent"
            animate={true}
            animDelay={200}
            animateDuration={800}
            cornerRadius={3}
            style={{
              width: `${
                Math.min(dimensions.width, dimensions.height) *
                dynamicSizes.gaugeSize
              }px`,
              height: `${
                Math.min(dimensions.width, dimensions.height) *
                dynamicSizes.gaugeSize *
                0.6
              }px`,
            }}
          />

          {/* Enhanced Value Display */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              marginTop: `${
                Math.min(dimensions.width, dimensions.height) * 0.1
              }px`,
            }}
          >
            <div className="flex items-baseline gap-1">
              <span
                className="font-bold text-slate-900 tracking-tight"
                style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
              >
                {formatValue(currentValue)}
              </span>
              {units && (
                <span
                  className="font-medium text-slate-500"
                  style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
                >
                  {units}
                </span>
              )}
            </div>

            {/* Trend indicator */}
            {trend && layoutMode !== "compact" && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp
                  className={`${
                    trend === "up"
                      ? "text-emerald-500 rotate-0"
                      : trend === "down"
                      ? "text-red-500 rotate-180"
                      : "text-slate-400"
                  } transition-all duration-300`}
                  style={{
                    width: dynamicSizes.labelFontSize * 1.2,
                    height: dynamicSizes.labelFontSize * 1.2,
                  }}
                />
                <span
                  className={`font-medium ${
                    trend === "up"
                      ? "text-emerald-600"
                      : trend === "down"
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                  style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
                >
                  {trend === "up"
                    ? "Rising"
                    : trend === "down"
                    ? "Falling"
                    : "Stable"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Min/Max Labels */}
        <div className="absolute bottom-0 w-full flex justify-between items-center px-4">
          <div className="flex flex-col items-start">
            <span
              className="text-slate-500 font-medium"
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              Min
            </span>
            <span
              className="text-slate-700 font-semibold"
              style={{ fontSize: `${dynamicSizes.labelFontSize * 1.1}px` }}
            >
              {formatValue(minValue)}
            </span>
          </div>

          {/* Center status */}
          <div className="flex flex-col items-center">
            <Activity
              className="text-blue-500 mb-1"
              style={{
                width: dynamicSizes.labelFontSize * 1.2,
                height: dynamicSizes.labelFontSize * 1.2,
              }}
            />
            {lastUpdate && layoutMode !== "compact" && (
              <span
                className="text-slate-400"
                style={{ fontSize: `${dynamicSizes.labelFontSize * 0.9}px` }}
              >
                {formatTime(lastUpdate)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span
              className="text-slate-500 font-medium"
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              Max
            </span>
            <span
              className="text-slate-700 font-semibold"
              style={{ fontSize: `${dynamicSizes.labelFontSize * 1.1}px` }}
            >
              {formatValue(maxValue)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const statusStyling = getStatusStyling();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full flex flex-col cursor-move
       
        transition-all duration-300 ease-out
        group overflow-hidden
      `}
      style={{
        padding: `${dynamicSizes.padding}px`,
        minWidth: 120,
        minHeight: 120,
      }}
    >
      {/* Minimal Header - hanya untuk compact mode */}
      {layoutMode === "compact" && (
        <div className="flex items-center justify-between mb-1 relative">
          <h3
            className="font-semibold text-slate-800 truncate leading-tight flex-1"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
            title={config.customName}
          >
            {config.customName}
          </h3>
          <div
            className={`
              w-2 h-2 rounded-full shadow-sm transition-all duration-300
              ${statusStyling.indicator}
              ${status === "waiting" ? "animate-pulse" : ""}
            `}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full relative">{renderGaugeContent()}</div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
