// File: components/widgets/RunningHoursLog/RunningHoursLogWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, Clock, Activity } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
  };
}

// Get status-specific styling
const getRunningHoursStyle = (status: string, value: number | null) => {
  if (status !== "ok") {
    return {
      border: status === "error" ? "border-red-200" : "border-amber-200",
      bg: status === "error" ? "bg-red-50" : "bg-amber-50",
    };
  }

  // Color based on running hours value (if it's a number)
  if (typeof value === "number") {
    if (value < 100) {
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50", // Low hours - good condition
      };
    } else if (value < 1000) {
      return {
        border: "border-blue-200",
        bg: "bg-blue-50", // Medium hours - normal
      };
    } else if (value < 5000) {
      return {
        border: "border-orange-200",
        bg: "bg-orange-50", // High hours - attention needed
      };
    } else {
      return {
        border: "border-red-200",
        bg: "bg-red-50", // Very high hours - maintenance required
      };
    }
  }

  // Default for non-numeric values
  return {
    border: "border-slate-200",
    bg: "bg-slate-50",
  };
};

export const RunningHoursLogWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // Responsive sizing setup (sama seperti widgets lainnya)
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Advanced responsive scaling
      const area = width * height;
      const baseScale = Math.sqrt(area) / 100;
      const minScale = Math.min(width / 150, height / 100);
      const scale = Math.min(baseScale, minScale);

      // Dynamic font sizes with better proportions
      const newValueSize = Math.max(Math.min(width / 6, height / 2.5), 16);
      const newTitleSize = Math.max(
        Math.min(width / 15, height / 8, newValueSize * 0.5),
        10
      );
      const newUnitSize = Math.max(newValueSize * 0.35, 10);

      setValueFontSize(newValueSize);
      setTitleFontSize(newTitleSize);
      setUnitFontSize(newUnitSize);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch device topic
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

  // Handle MQTT messages
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
          const finalValue =
            typeof rawValue === "number"
              ? rawValue * (config.multiply || 1)
              : rawValue;
          setDisplayValue(finalValue);
          setStatus("ok");
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload for running hours:", e);
      }
    },
    [config.selectedKey, config.multiply]
  );

  // MQTT subscription
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

  const hoursStyle = getRunningHoursStyle(status, displayValue);

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";

    if (typeof value === "number") {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }

    return String(value);
  };

  const getStatusIcon = () => {
    if (typeof displayValue === "number") {
      if (displayValue < 100) return "text-emerald-500";
      if (displayValue < 1000) return "text-blue-500";
      if (displayValue < 5000) return "text-orange-500";
      return "text-red-500";
    }

    switch (status) {
      case "ok":
        return "text-slate-500";
      case "error":
        return "text-red-500";
      default:
        return "text-amber-500";
    }
  };

  const renderContent = () => {
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-amber-500"
              style={{
                width: Math.max(dimensions.width / 8, 24),
                height: Math.max(dimensions.width / 8, 24),
              }}
            />
          </div>
          <p
            className="text-slate-500 font-medium"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Loading...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 8, 24),
              height: Math.max(dimensions.width / 8, 24),
            }}
          />
          <p
            className="text-red-600 font-semibold max-w-full break-words"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="flex items-baseline justify-center gap-1 w-full">
          <span
            className="font-bold tracking-tight text-slate-900 transition-colors duration-200"
            style={{
              fontSize: `${valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className="font-medium text-slate-500 transition-colors duration-200"
              style={{
                fontSize: `${unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {config.units}
            </span>
          )}
        </div>

        {/* Hours indicator */}
        {typeof displayValue === "number" && (
          <div className="mt-2 flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                displayValue < 100
                  ? "bg-emerald-400"
                  : displayValue < 1000
                  ? "bg-blue-400"
                  : displayValue < 5000
                  ? "bg-orange-400"
                  : "bg-red-400"
              } animate-pulse`}
            />
            <span
              className="text-slate-400 font-medium"
              style={{ fontSize: `${Math.max(unitFontSize * 0.8, 8)}px` }}
            >
              {displayValue < 100
                ? "New"
                : displayValue < 1000
                ? "Normal"
                : displayValue < 5000
                ? "High"
                : "Critical"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-gradient-to-br from-white to-slate-50
      
        rounded-xl shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group
      `}
      style={{
        minWidth: 140,
        minHeight: 90,
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 opacity-75 group-hover:opacity-100 transition-opacity">
        <Clock
          className={getStatusIcon()}
          style={{
            width: Math.max(titleFontSize * 0.8, 12),
            height: Math.max(titleFontSize * 0.8, 12),
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3">
        <h3
          className="font-semibold text-slate-700 truncate text-left"
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.2,
          }}
          title={config.customName}
        >
          {config.customName}
        </h3>
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 pt-12 pb-4 px-4 flex items-center justify-center">
        {renderContent()}
      </div>

      {/* Running indicator */}
      <div className="absolute bottom-2 left-2 opacity-50 group-hover:opacity-75 transition-opacity">
        <div className="flex items-center space-x-1">
          <Activity
            className="text-slate-400"
            style={{
              width: `${Math.max(titleFontSize * 0.6, 8)}px`,
              height: `${Math.max(titleFontSize * 0.6, 8)}px`,
            }}
          />
          <span
            className="text-slate-400 font-medium uppercase tracking-wider"
            style={{ fontSize: `${Math.max(titleFontSize * 0.6, 8)}px` }}
          >
            HOURS
          </span>
        </div>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
