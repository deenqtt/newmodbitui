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
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
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

  // FIXED: Enhanced responsive system - consistent with other widgets
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    valueFontSize: 24,
    labelFontSize: 10,
    unitFontSize: 12,
    gaugeSize: 1,
    padding: 16,
    headerHeight: 52,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">(
    "normal"
  );

  // FIXED: Layout calculation - same as other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Better layout mode detection - consistent naming
      const minDimension = Math.min(width, height);
      let currentLayoutMode: "mini" | "compact" | "normal";

      if (minDimension < 160 || availableHeight < 100) {
        currentLayoutMode = "mini";
      } else if (minDimension < 240 || availableHeight < 180) {
        currentLayoutMode = "compact";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // FIXED: Dynamic sizing based on layout mode
      const baseScale = Math.sqrt(width * height) / 130;

      const sizeConfigs = {
        mini: {
          titleFontSize: Math.max(10, Math.min(headerHeight * 0.3, 13)),
          valueFontSize: Math.max(16, Math.min(availableHeight * 0.15, 22)),
          labelFontSize: Math.max(8, Math.min(baseScale * 9, 10)),
          unitFontSize: Math.max(10, Math.min(baseScale * 11, 12)),
          gaugeSize: Math.min(minDimension * 0.85, 140),
          padding: Math.max(8, width * 0.03),
          headerHeight,
        },
        compact: {
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.32, 14)),
          valueFontSize: Math.max(20, Math.min(availableHeight * 0.18, 28)),
          labelFontSize: Math.max(9, Math.min(baseScale * 10, 11)),
          unitFontSize: Math.max(11, Math.min(baseScale * 12, 14)),
          gaugeSize: Math.min(minDimension * 0.9, 180),
          padding: Math.max(10, width * 0.04),
          headerHeight,
        },
        normal: {
          titleFontSize: Math.max(12, Math.min(headerHeight * 0.32, 15)),
          valueFontSize: Math.max(24, Math.min(availableHeight * 0.2, 36)),
          labelFontSize: Math.max(10, Math.min(baseScale * 11, 13)),
          unitFontSize: Math.max(12, Math.min(baseScale * 14, 16)),
          gaugeSize: Math.min(minDimension * 0.95, 240),
          padding: Math.max(12, width * 0.04),
          headerHeight,
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
        console.error("Failed to parse MQTT payload:", e);
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

  const gaugePercent =
    currentValue !== null
      ? Math.max(
          0,
          Math.min(1, (currentValue - minValue) / (maxValue - minValue))
        )
      : 0;

  const getTrend = () => {
    if (currentValue === null || previousValue === null) return null;
    if (currentValue > previousValue) return "up";
    if (currentValue < previousValue) return "down";
    return "stable";
  };

  // FIXED: Simplified status styling - consistent with other widgets
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      label: "text-slate-600 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-500",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
          title: "text-slate-600 dark:text-slate-400",
          value: "text-slate-700 dark:text-slate-300",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  const getGaugeColors = () => {
    if (currentValue === null) {
      return ["#94a3b8", "#cbd5e1", "#e2e8f0"];
    }
    return ["#10b981", "#f59e0b", "#ef4444"];
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
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div
        className="bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-600"
        style={{
          width: Math.max(dynamicSizes.labelFontSize * 4, 48),
          height: Math.max(dynamicSizes.labelFontSize * 4, 48),
        }}
      >
        <Loader2
          className="animate-spin text-slate-400 dark:text-slate-500"
          style={{
            width: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
            height: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
          }}
        />
      </div>
      <p
        className="text-slate-600 dark:text-slate-400 font-medium"
        style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
      >
        Loading gauge...
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full px-4">
      <div
        className="bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-600"
        style={{
          width: Math.max(dynamicSizes.labelFontSize * 4, 48),
          height: Math.max(dynamicSizes.labelFontSize * 4, 48),
        }}
      >
        <AlertTriangle
          className="text-red-600 dark:text-red-400"
          style={{
            width: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
            height: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
          }}
        />
      </div>
      <div className="space-y-1 text-center">
        <p
          className="text-red-700 dark:text-red-300 font-semibold"
          style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
        >
          Connection Error
        </p>
        <p
          className="text-red-600 dark:text-red-400 opacity-80 break-words"
          style={{
            fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.85, 8)}px`,
          }}
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
    const styling = getStatusStyling();

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        {/* FIXED: Gauge Chart with VALUE IN CENTER */}
        <div
          className="relative flex items-center justify-center"
          style={{
            height: `${Math.min(dimensions.height * 0.5, 200)}px`,
            width: "100%",
          }}
        >
          <GaugeChart
            id={`gauge-chart-${config.deviceUniqId}`}
            nrOfLevels={20}
            colors={getGaugeColors()}
            arcWidth={0.25}
            percent={gaugePercent}
            textColor={
              styling.value.includes("dark:text-slate-100")
                ? "#0f172a"
                : "#0f172a"
            }
            animate={true}
            animDelay={200}
            animateDuration={800}
            cornerRadius={3}
            formatTextValue={(value) => ""}
            style={{
              width: `${dynamicSizes.gaugeSize}px`,
              height: `${dynamicSizes.gaugeSize * 0.6}px`,
            }}
          />

          {/* FIXED: Custom value display BELOW needle - safe position */}
          <div
            className="absolute flex flex-col items-center justify-center"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, 60%)",
            }}
          >
            <div className="flex items-baseline gap-1">
              <span
                className={`font-bold tracking-tight transition-colors duration-300 ${styling.value}`}
                style={{
                  fontSize: `${dynamicSizes.valueFontSize}px`,
                  lineHeight: 0.9,
                }}
              >
                {formatValue(currentValue)}
              </span>
              {units && (
                <span
                  className={`font-medium ${styling.unit}`}
                  style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
                >
                  {units}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FIXED: Min/Max Labels with better responsive sizing */}
        <div className="w-full flex justify-between items-end px-4 mt-2">
          <div className="text-left">
            <p
              className={`font-medium ${styling.label}`}
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              Min
            </p>
            <p
              className={`font-semibold ${styling.value}`}
              style={{ fontSize: `${dynamicSizes.labelFontSize * 1.15}px` }}
            >
              {formatValue(minValue)}
            </p>
          </div>

          {/* Center info */}
          <div className="text-center flex flex-col items-center gap-1">
            {/* FIXED: Trend indicator with proper icons */}
            {trend && layoutMode !== "mini" && (
              <div className="flex items-center gap-1.5">
                {trend === "up" ? (
                  <TrendingUp
                    className="text-emerald-500 dark:text-emerald-400"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                ) : trend === "down" ? (
                  <TrendingDown
                    className="text-red-500 dark:text-red-400"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                ) : (
                  <Minus
                    className="text-slate-400 dark:text-slate-500"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                )}
                <span
                  className={`font-medium ${
                    trend === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : trend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                  style={{ fontSize: `${dynamicSizes.labelFontSize * 0.95}px` }}
                >
                  {trend === "up"
                    ? "Rising"
                    : trend === "down"
                    ? "Falling"
                    : "Stable"}
                </span>
              </div>
            )}
            {lastUpdate && layoutMode === "normal" && (
              <p
                className={`${styling.label}`}
                style={{ fontSize: `${dynamicSizes.labelFontSize * 0.9}px` }}
              >
                {formatTime(lastUpdate)}
              </p>
            )}
          </div>

          <div className="text-right">
            <p
              className={`font-medium ${styling.label}`}
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              Max
            </p>
            <p
              className={`font-semibold ${styling.value}`}
              style={{ fontSize: `${dynamicSizes.labelFontSize * 1.15}px` }}
            >
              {formatValue(maxValue)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const styling = getStatusStyling();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full flex flex-col cursor-move
        bg-card border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group overflow-hidden
      `}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* FIXED: Header - consistent with other widgets, NO VALUE */}
      <div
        className="px-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Title */}
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styling.title} flex-1`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.customName}
        >
          {config.customName}
        </h3>

        {/* FIXED: Status Indicators only (value moved to gauge center) */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Gauge icon */}
          <Gauge
            className="text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />

          {/* FIXED: Wifi status */}
          {connectionStatus === "Connected" ? (
            <Wifi
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          )}

          {/* Status Indicator */}
          <div
            className={`rounded-full transition-all duration-300 ${
              styling.indicator
            } ${styling.pulse ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* Gauge Content */}
      <div className="flex-1 w-full relative overflow-hidden">
        {renderGaugeContent()}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
