// File: components/widgets/SingleValueCard/SingleValueCardWidget.tsx
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
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

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

export const SingleValueCardWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [previousValue, setPreviousValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "stable" | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);

  // Enhanced responsive calculation with better proportions
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Improved scaling algorithm
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      const area = width * height;

      // Dynamic font scaling based on container size
      const scaleFactor = Math.sqrt(area) / 120;
      const minScaleFactor = Math.min(width / 180, height / 120);
      const finalScale = Math.min(scaleFactor, minScaleFactor, 2);

      // Better proportioned font sizes
      const baseValueSize = Math.max(minDimension * 0.15, 18);
      const maxValueSize = Math.min(width * 0.3, height * 0.4);
      const newValueSize = Math.min(baseValueSize * finalScale, maxValueSize);

      const newTitleSize = Math.max(
        Math.min(newValueSize * 0.45, width * 0.08),
        12
      );
      const newUnitSize = Math.max(newValueSize * 0.4, 10);

      setValueFontSize(Math.round(newValueSize));
      setTitleFontSize(Math.round(newTitleSize));
      setUnitFontSize(Math.round(newUnitSize));
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
          const finalValue =
            typeof rawValue === "number"
              ? rawValue * (config.multiply || 1)
              : rawValue;

          // Calculate trend
          if (
            previousValue !== null &&
            typeof finalValue === "number" &&
            typeof previousValue === "number"
          ) {
            const diff = finalValue - previousValue;
            const threshold = Math.abs(previousValue * 0.01); // 1% threshold

            if (Math.abs(diff) <= threshold) {
              setTrend("stable");
            } else if (diff > 0) {
              setTrend("up");
            } else {
              setTrend("down");
            }
          }

          setPreviousValue(displayValue);
          setDisplayValue(finalValue);
          setStatus("ok");
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply, displayValue, previousValue]
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

  const getStatusStyles = () => {
    // Clean minimal approach - always white background, hanya status di indicator dan text
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-400",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-400",
          pulse: false,
          // Sedikit hint warna di text untuk error
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-400",
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

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";

    if (typeof value === "number") {
      if (Math.abs(value) >= 1000000) {
        return (
          (value / 1000000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "M"
        );
      }
      if (Math.abs(value) >= 1000) {
        return (
          (value / 1000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "K"
        );
      }
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }

    return String(value);
  };

  const renderTrendIndicator = () => {
    if (!trend || status !== "ok") return null;

    const trendConfig = {
      up: { icon: TrendingUp, color: "text-emerald-500" },
      down: { icon: TrendingDown, color: "text-red-500" },
      stable: { icon: Minus, color: "text-slate-400" },
    };

    const { icon: Icon, color } = trendConfig[trend];

    return (
      <div
        className="flex items-center justify-center p-1.5 rounded-full bg-white shadow-sm border border-slate-200/50"
        style={{
          width: Math.max(titleFontSize * 1.8, 20),
          height: Math.max(titleFontSize * 1.8, 20),
        }}
      >
        <Icon
          className={color}
          style={{
            width: Math.max(titleFontSize * 0.9, 12),
            height: Math.max(titleFontSize * 0.9, 12),
          }}
        />
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-slate-400"
              style={{
                width: Math.max(dimensions.width / 8, 28),
                height: Math.max(dimensions.width / 8, 28),
              }}
            />
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Loading data...
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
              width: Math.max(dimensions.width / 8, 28),
              height: Math.max(dimensions.width / 8, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{ fontSize: `${Math.max(titleFontSize * 0.9, 11)}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-1">
        <div className="flex items-baseline justify-center gap-2 w-full">
          <span
            className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
            style={{
              fontSize: `${valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium transition-colors duration-200 ${styles.unit}`}
              style={{
                fontSize: `${unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {config.units}
            </span>
          )}
        </div>
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-card
        border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minWidth: 120,
        minHeight: 80,
      }}
    >
      {/* Status indicators - clean minimal approach */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-2">
          {renderTrendIndicator()}
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
      </div>

      {/* Header with clean typography */}
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

      {/* Subtle hover effect - minimal */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
