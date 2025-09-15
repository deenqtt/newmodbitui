// File: components/widgets/TemperatureIndicatorBar/TemperatureIndicatorBarWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Loader2,
  AlertTriangle,
  Thermometer,
  Snowflake,
  Flame,
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

// Temperature range analysis
const getTemperatureInfo = (
  value: number,
  minValue: number,
  maxValue: number
) => {
  const range = maxValue - minValue;
  const percentage = Math.max(0, Math.min(1, (value - minValue) / range));

  // Temperature zones with more meaningful categorization
  if (percentage < 0.2) {
    return {
      zone: "Very Cold",
      color: "text-blue-600",
      bgColor: "bg-blue-500",
      icon: Snowflake,
      description: "Below normal range",
    };
  } else if (percentage < 0.4) {
    return {
      zone: "Cool",
      color: "text-cyan-600",
      bgColor: "bg-cyan-500",
      icon: Thermometer,
      description: "Lower range",
    };
  } else if (percentage < 0.6) {
    return {
      zone: "Normal",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500",
      icon: Thermometer,
      description: "Optimal range",
    };
  } else if (percentage < 0.8) {
    return {
      zone: "Warm",
      color: "text-orange-600",
      bgColor: "bg-orange-500",
      icon: Thermometer,
      description: "Higher range",
    };
  } else {
    return {
      zone: "Hot",
      color: "text-red-600",
      bgColor: "bg-red-500",
      icon: Flame,
      description: "Above normal range",
    };
  }
};

export const TemperatureIndicatorBarWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Responsive sizing setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);
  const [labelFontSize, setLabelFontSize] = useState(10);
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal">("normal");

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Determine layout mode
      const area = width * height;
      const currentLayoutMode =
        area < 30000 || height < 150 ? "compact" : "normal";
      setLayoutMode(currentLayoutMode);

      // Improved scaling algorithm
      const minDimension = Math.min(width, height);
      const scaleFactor = Math.sqrt(area) / 120;
      const minScaleFactor = Math.min(width / 180, height / 120);
      const finalScale = Math.min(scaleFactor, minScaleFactor, 2);

      const baseValueSize = Math.max(minDimension * 0.12, 16);
      const maxValueSize = Math.min(width * 0.2, height * 0.25);
      const newValueSize = Math.min(baseValueSize * finalScale, maxValueSize);

      const newTitleSize = Math.max(
        Math.min(newValueSize * 0.5, width * 0.08),
        11
      );
      const newUnitSize = Math.max(newValueSize * 0.4, 10);
      const newLabelSize = Math.max(newTitleSize * 0.8, 9);

      setValueFontSize(Math.round(newValueSize));
      setTitleFontSize(Math.round(newTitleSize));
      setUnitFontSize(Math.round(newUnitSize));
      setLabelFontSize(Math.round(newLabelSize));
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

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
        console.error("Failed to parse MQTT payload for temp bar:", e);
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

  const { minValue = 0, maxValue = 100, units = "°C" } = config;

  // Clean minimal status styling
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700",
      value: "text-slate-900",
      unit: "text-slate-500",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500",
          pulse: false,
          title: "text-red-600",
          value: "text-red-700",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500",
          pulse: true,
          title: "text-slate-600",
          value: "text-slate-700",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400",
          pulse: false,
        };
    }
  };

  const percentage =
    currentValue !== null
      ? Math.max(
          0,
          Math.min(1, (currentValue - minValue) / (maxValue - minValue))
        )
      : 0;

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

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderProgressBar = () => {
    if (currentValue === null) return null;

    const tempInfo = getTemperatureInfo(currentValue, minValue, maxValue);

    return (
      <div className="space-y-2">
        {/* Range labels */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-blue-500" />
            <span className="text-slate-500">{formatValue(minValue)}°</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">{formatValue(maxValue)}°</span>
            <Flame className="w-3 h-3 text-red-500" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div
            className="w-full bg-slate-200 rounded-full overflow-hidden"
            style={{ height: Math.max(8, dimensions.height * 0.06) }}
          >
            <div
              className={`h-full ${tempInfo.bgColor} rounded-full transition-all duration-700 ease-out relative`}
              style={{
                width: `${Math.max(2, Math.min(100, percentage * 100))}%`,
              }}
            >
              {/* Subtle animation for active state */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Current position indicator */}
          <div
            className="absolute top-0 w-0.5 h-full bg-slate-800 rounded-full transform -translate-x-0.5"
            style={{ left: `${percentage * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const isLoading =
      status === "loading" || (status === "waiting" && currentValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2
            className="animate-spin text-slate-400"
            style={{
              width: Math.max(dimensions.width / 10, 24),
              height: Math.max(dimensions.width / 10, 24),
            }}
          />
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${labelFontSize}px` }}
          >
            Loading temperature...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-2">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 10, 24),
              height: Math.max(dimensions.width / 10, 24),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{ fontSize: `${labelFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    const tempInfo = getTemperatureInfo(currentValue || 0, minValue, maxValue);

    return (
      <div className="w-full space-y-4">
        {/* Main temperature display */}
        <div className="text-center space-y-2">
          <div className="flex items-baseline justify-center gap-2">
            <span
              className={`font-bold tracking-tight transition-colors duration-300 ${styles.value}`}
              style={{ fontSize: `${valueFontSize}px`, lineHeight: 0.9 }}
            >
              {formatValue(currentValue)}
            </span>
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${unitFontSize}px`, lineHeight: 1 }}
            >
              {units}
            </span>
          </div>

          {/* Temperature zone indicator */}
          <div className="flex items-center justify-center gap-2 px-3 py-1 bg-slate-50 rounded-full">
            <tempInfo.icon
              className={tempInfo.color}
              style={{
                width: Math.max(labelFontSize * 1.2, 12),
                height: Math.max(labelFontSize * 1.2, 12),
              }}
            />
            <span
              className={`font-medium ${tempInfo.color}`}
              style={{ fontSize: `${labelFontSize}px` }}
            >
              {tempInfo.zone}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {layoutMode === "normal" && renderProgressBar()}

        {/* Additional info for normal mode */}
        {layoutMode === "normal" && lastUpdate && (
          <div className="text-center">
            <p
              className="text-slate-400"
              style={{ fontSize: `${Math.max(labelFontSize * 0.9, 8)}px` }}
            >
              Updated {formatTime(lastUpdate)}
            </p>
          </div>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-white
        border border-slate-200/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minWidth: 200,
        minHeight: 120,
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <Thermometer
          className="text-slate-400"
          style={{
            width: Math.max(titleFontSize * 0.8, 12),
            height: Math.max(titleFontSize * 0.8, 12),
          }}
        />

        <div
          className={`rounded-full transition-all duration-300 ${
            styles.indicator
          } ${styles.pulse ? "animate-pulse" : ""}`}
          style={{
            width: Math.max(titleFontSize * 0.6, 8),
            height: Math.max(titleFontSize * 0.6, 8),
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pr-16">
        <h3
          className={`font-medium truncate text-left transition-colors duration-200 ${styles.title}`}
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.customName}
        >
          {config.customName}
        </h3>
      </div>

      {/* Main content area */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingTop: titleFontSize * 2.5,
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
