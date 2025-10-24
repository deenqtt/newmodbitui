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

  // Responsive sizing - SAMA SEPERTI ICON WIDGET
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 24,
    unitFontSize: 14,
    titleFontSize: 12,
    padding: 16,
    headerHeight: 40,
    trendIconSize: 16,
  });

  // Enhanced responsive calculation - CONSISTENT DENGAN ICON WIDGET
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // Dynamic sizing based on available space
      const minDimension = Math.min(width, height);
      const area = width * height;

      // Value font size - larger than icon widget since no icon
      const valueSize = Math.max(
        22,
        Math.min(width * 0.22, availableHeight * 0.28, 72)
      );
      const unitSize = Math.max(14, Math.min(valueSize * 0.5, 32));
      const titleSize = Math.max(11, Math.min(headerHeight * 0.35, 16));
      const padding = Math.max(16, Math.min(width * 0.04, 32));
      const trendSize = Math.max(14, Math.min(titleSize * 1.4, 20));

      setDynamicSizes({
        valueFontSize: Math.round(valueSize),
        unitFontSize: Math.round(unitSize),
        titleFontSize: Math.round(titleSize),
        padding,
        headerHeight,
        trendIconSize: Math.round(trendSize),
      });
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
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
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
      up: { icon: TrendingUp, color: "text-emerald-500 dark:text-emerald-400" },
      down: { icon: TrendingDown, color: "text-red-500 dark:text-red-400" },
      stable: { icon: Minus, color: "text-slate-400 dark:text-slate-500" },
    };

    const { icon: Icon, color } = trendConfig[trend];

    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
        style={{
          width: Math.max(dynamicSizes.trendIconSize * 1.6, 22),
          height: Math.max(dynamicSizes.trendIconSize * 1.6, 22),
        }}
      >
        <Icon
          className={color}
          style={{
            width: Math.max(dynamicSizes.trendIconSize * 0.9, 14),
            height: Math.max(dynamicSizes.trendIconSize * 0.9, 14),
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
              className="animate-spin text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
                height: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
              }}
            />
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
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
            className="text-red-500 dark:text-red-400"
            style={{
              width: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
              height: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.9, 11)}px`,
            }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-1">
        <div className="flex items-baseline justify-center gap-2 w-full flex-wrap">
          <span
            className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
            style={{
              fontSize: `${dynamicSizes.valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium transition-colors duration-200 ${styles.unit}`}
              style={{
                fontSize: `${dynamicSizes.unitFontSize}px`,
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
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* Header - SAMA SEPERTI ICON WIDGET */}
      <div
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styles.title}`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
            flex: 1,
          }}
          title={config.customName}
        >
          {config.customName}
        </h3>

        {/* Status indicators in header */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Trend indicator */}
          {renderTrendIndicator()}

          {/* Wifi status */}
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

          {/* Status dot */}
          <div
            className={`rounded-full ${styles.indicator} ${
              styles.pulse ? "animate-pulse" : ""
            } transition-all duration-300`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* Main content area */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
          paddingBottom: dynamicSizes.padding,
          paddingLeft: dynamicSizes.padding,
          paddingRight: dynamicSizes.padding,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
