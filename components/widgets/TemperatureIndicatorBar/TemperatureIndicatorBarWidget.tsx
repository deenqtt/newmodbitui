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
import { Loader2, AlertTriangle, Thermometer } from "lucide-react";

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

// Enhanced color function for temperature ranges
const getTemperatureStyle = (percentage: number, status: string) => {
  if (status !== "ok") {
    return {
      border: status === "error" ? "border-red-200" : "border-amber-200",
      bg: status === "error" ? "bg-red-50" : "bg-amber-50",
      barColor: "bg-slate-400",
    };
  }

  if (percentage < 0.3) {
    return {
      border: "border-blue-200",
      bg: "bg-blue-50",
      barColor: "bg-gradient-to-r from-blue-400 to-blue-500",
    };
  }
  if (percentage < 0.6) {
    return {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      barColor: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    };
  }
  if (percentage < 0.8) {
    return {
      border: "border-orange-200",
      bg: "bg-orange-50",
      barColor: "bg-gradient-to-r from-orange-400 to-orange-500",
    };
  }
  return {
    border: "border-red-200",
    bg: "bg-red-50",
    barColor: "bg-gradient-to-r from-red-400 to-red-500",
  };
};

export const TemperatureIndicatorBarWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // Responsive sizing setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);
  const [labelFontSize, setLabelFontSize] = useState(10);

  // Enhanced responsive calculation (sama seperti SingleValueCard)
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
      const newValueSize = Math.max(Math.min(width / 8, height / 4), 14);
      const newTitleSize = Math.max(
        Math.min(width / 15, height / 8, newValueSize * 0.6),
        10
      );
      const newUnitSize = Math.max(newValueSize * 0.4, 8);
      const newLabelSize = Math.max(newTitleSize * 0.7, 8);

      setValueFontSize(newValueSize);
      setTitleFontSize(newTitleSize);
      setUnitFontSize(newUnitSize);
      setLabelFontSize(newLabelSize);
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
            setCurrentValue(finalValue);
            setStatus("ok");
          }
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload for temp bar:", e);
      }
    },
    [config.selectedKey, config.multiply]
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
  const percentage =
    currentValue !== null
      ? Math.max(
          0,
          Math.min(1, (currentValue - minValue) / (maxValue - minValue))
        )
      : 0;

  const tempStyle = getTemperatureStyle(percentage, status);

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const renderContent = () => {
    const isLoading =
      status === "loading" || (status === "waiting" && currentValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2
            className="animate-spin text-amber-500"
            style={{
              width: Math.max(dimensions.width / 10, 20),
              height: Math.max(dimensions.width / 10, 20),
            }}
          />
          <p
            className="text-slate-500 font-medium"
            style={{ fontSize: `${labelFontSize}px` }}
          >
            Loading...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 10, 20),
              height: Math.max(dimensions.width / 10, 20),
            }}
          />
          <p
            className="text-red-600 font-semibold max-w-full break-words"
            style={{ fontSize: `${labelFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="w-full space-y-3">
        {/* Value Display */}
        <div className="flex items-baseline justify-center gap-1">
          <span
            className="font-bold text-slate-900 tracking-tight"
            style={{ fontSize: `${valueFontSize}px`, lineHeight: 0.9 }}
          >
            {formatValue(currentValue)}
          </span>
          <span
            className="font-medium text-slate-500"
            style={{ fontSize: `${unitFontSize}px`, lineHeight: 1 }}
          >
            {units}
          </span>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span
              className="text-slate-500 font-medium"
              style={{ fontSize: `${labelFontSize}px` }}
            >
              {minValue}°
            </span>
            <span
              className="text-slate-500 font-medium"
              style={{ fontSize: `${labelFontSize}px` }}
            >
              {maxValue}°
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full bg-slate-200 rounded-full overflow-hidden shadow-inner"
            style={{ height: Math.max(6, dimensions.height * 0.08) }}
          >
            <div
              className={`h-full ${tempStyle.barColor} rounded-full transition-all duration-500 ease-out relative overflow-hidden shadow-sm`}
              style={{
                width: `${Math.max(0, Math.min(100, percentage * 100))}%`,
              }}
            >
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        </div>
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
        minWidth: 200,
        minHeight: 120,
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 opacity-75 group-hover:opacity-100 transition-opacity">
        <Thermometer
          className={
            status === "ok"
              ? percentage < 0.3
                ? "text-blue-500"
                : percentage < 0.6
                ? "text-emerald-500"
                : percentage < 0.8
                ? "text-orange-500"
                : "text-red-500"
              : status === "error"
              ? "text-red-500"
              : "text-amber-500"
          }
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
      <div className="absolute inset-0 pt-10 pb-4 px-4 flex items-center justify-center">
        {renderContent()}
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
