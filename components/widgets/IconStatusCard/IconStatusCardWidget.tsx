// File: components/widgets/IconStatusCard/IconStatusCardWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { AlertTriangle, Loader2, WifiOff, Clock, Wifi } from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    selectedIcon?: string;
    iconColor?: string;
    iconBgColor?: string;
  };
}

export const IconStatusCardWidget = ({ config }: Props) => {
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Enhanced responsive layout system
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<
    "horizontal" | "vertical" | "compact"
  >("horizontal");
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 20,
    unitFontSize: 14,
    iconSize: 32,
    titleFontSize: 12,
    padding: 16,
    gap: 12,
  });

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Smart layout mode detection
      const aspectRatio = width / height;
      const area = width * height;
      const minDimension = Math.min(width, height);

      let currentLayoutMode: "horizontal" | "vertical" | "compact";
      if (area < 8000 || minDimension < 100) {
        currentLayoutMode = "compact";
      } else if (aspectRatio > 1.3) {
        currentLayoutMode = "horizontal";
      } else {
        currentLayoutMode = "vertical";
      }

      setLayoutMode(currentLayoutMode);

      // Advanced responsive sizing with better proportions
      const baseScale = Math.sqrt(area) / 140;
      const widthScale = width / 220;
      const heightScale = height / 140;
      const finalScale = Math.min(baseScale, widthScale, heightScale, 2);

      // Dynamic sizes optimized for each layout mode
      const sizes = {
        compact: {
          valueFontSize: Math.max(12, Math.min(minDimension * 0.12, 18)),
          unitFontSize: Math.max(9, Math.min(minDimension * 0.08, 12)),
          iconSize: Math.max(18, Math.min(minDimension * 0.25, 28)),
          titleFontSize: Math.max(9, Math.min(minDimension * 0.08, 11)),
          padding: Math.max(8, minDimension * 0.08),
          gap: Math.max(4, minDimension * 0.04),
        },
        horizontal: {
          valueFontSize: Math.max(16, Math.min(width * 0.1, height * 0.25)),
          unitFontSize: Math.max(11, Math.min(width * 0.07, height * 0.18)),
          iconSize: Math.max(24, Math.min(width * 0.12, height * 0.4)),
          titleFontSize: Math.max(11, Math.min(width * 0.06, height * 0.15)),
          padding: Math.max(12, width * 0.05),
          gap: Math.max(12, width * 0.06),
        },
        vertical: {
          valueFontSize: Math.max(18, Math.min(width * 0.15, height * 0.2)),
          unitFontSize: Math.max(12, Math.min(width * 0.1, height * 0.14)),
          iconSize: Math.max(28, Math.min(width * 0.2, height * 0.25)),
          titleFontSize: Math.max(11, Math.min(width * 0.08, height * 0.1)),
          padding: Math.max(12, height * 0.08),
          gap: Math.max(8, height * 0.06),
        },
      };

      setDynamicSizes(sizes[currentLayoutMode]);
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

          setPreviousValue(displayValue);
          setDisplayValue(finalValue);
          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply, displayValue]
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

  const IconComponent = getIconComponent(config.selectedIcon || "Zap");

  // Clean minimal styling - consistent dengan SingleValueCard
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      // Icon selalu neutral gray kecuali ada custom color
      iconBg: config.iconBgColor || "#64748B",
      iconColor: config.iconColor || "#FFFFFF",
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
      // Smart number formatting
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

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderLoadingState = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            <Loader2
              className="animate-spin text-slate-400 dark:text-slate-500"
              style={{
                width: dynamicSizes.iconSize * 0.6,
                height: dynamicSizes.iconSize * 0.6,
              }}
            />
          </div>
        </div>
        {layoutMode !== "compact" && (
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Loading data...
          </p>
        )}
      </div>
    );
  };

  const renderErrorState = () => {
    const styles = getStatusStyling();
    const isOffline = connectionStatus !== "Connected";

    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            {isOffline ? (
              <WifiOff
                className="text-slate-500 dark:text-slate-300"
                style={{
                  width: dynamicSizes.iconSize * 0.6,
                  height: dynamicSizes.iconSize * 0.6,
                }}
              />
            ) : (
              <AlertTriangle
                className="text-red-500 dark:text-red-400"
                style={{
                  width: dynamicSizes.iconSize * 0.6,
                  height: dynamicSizes.iconSize * 0.6,
                }}
              />
            )}
          </div>
        </div>
        {layoutMode !== "compact" && (
          <div className="space-y-1">
            <p
              className={`font-semibold ${styles.title}`}
              style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
            >
              {isOffline ? "Offline" : "Error"}
            </p>
            <p
              className={`opacity-80 break-words ${styles.value}`}
              style={{ fontSize: `${dynamicSizes.titleFontSize * 0.8}px` }}
            >
              {layoutMode === "horizontal" && errorMessage.length > 20
                ? `${errorMessage.substring(0, 20)}...`
                : errorMessage}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderWaitingState = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            <Clock
              className="text-slate-400"
              style={{
                width: dynamicSizes.iconSize * 0.6,
                height: dynamicSizes.iconSize * 0.6,
              }}
            />
          </div>
        </div>
        {layoutMode !== "compact" && (
          <p
            className="font-medium text-slate-600"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Waiting for data...
          </p>
        )}
      </div>
    );
  };

  const renderMainContent = () => {
    const styles = getStatusStyling();

    if (status === "loading") return renderLoadingState();
    if (status === "error") return renderErrorState();
    if (status === "waiting" && displayValue === null)
      return renderWaitingState();

    // Icon element dengan clean styling
    const iconElement = IconComponent && (
      <div className="relative group">
        <div
          className="rounded-xl shadow-sm flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-105 border border-slate-200/50"
          style={{
            backgroundColor: styles.iconBg,
            color: styles.iconColor,
            width: dynamicSizes.iconSize * 1.3,
            height: dynamicSizes.iconSize * 1.3,
          }}
        >
          <IconComponent
            style={{
              height: dynamicSizes.iconSize * 0.65,
              width: dynamicSizes.iconSize * 0.65,
            }}
          />
        </div>
      </div>
    );

    // Value element dengan clean typography
    const valueElement = (
      <div className="space-y-1">
        <div className="flex items-baseline gap-1 justify-center">
          <span
            className={`font-bold tracking-tight leading-none transition-all duration-300 ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
            >
              {config.units}
            </span>
          )}
        </div>
        {lastUpdate && layoutMode !== "compact" && (
          <div
            className={`flex items-center justify-center gap-1 ${styles.unit} opacity-60`}
            style={{ fontSize: `${dynamicSizes.titleFontSize * 0.8}px` }}
          >
            <Clock
              style={{
                width: dynamicSizes.titleFontSize * 0.8,
                height: dynamicSizes.titleFontSize * 0.8,
              }}
            />
            <span>{formatTime(lastUpdate)}</span>
          </div>
        )}
      </div>
    );

    // Title element
    const titleElement = (
      <p
        className={`font-medium text-center leading-tight transition-colors duration-200 ${styles.title}`}
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
        title={config.customName}
      >
        {layoutMode === "compact" && config.customName.length > 12
          ? `${config.customName.substring(0, 12)}...`
          : config.customName}
      </p>
    );

    // Layout rendering optimized for each mode
    switch (layoutMode) {
      case "compact":
        return (
          <div className="flex flex-col items-center justify-center gap-2 w-full text-center">
            {iconElement}
            <div className="space-y-1 min-w-0 flex-1">{valueElement}</div>
          </div>
        );

      case "horizontal":
        return (
          <div
            className="flex items-center justify-start w-full"
            style={{ gap: `${dynamicSizes.gap}px` }}
          >
            <div className="flex-shrink-0">{iconElement}</div>
            <div className="min-w-0 flex-1 space-y-1">
              {titleElement}
              {valueElement}
            </div>
          </div>
        );

      case "vertical":
      default:
        return (
          <div
            className="flex flex-col items-center justify-center w-full text-center"
            style={{ gap: `${dynamicSizes.gap}px` }}
          >
            {iconElement}
            <div className="space-y-1 min-w-0">
              {valueElement}
              {titleElement}
            </div>
          </div>
        );
    }
  };

  const styles = getStatusStyling();

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
        padding: `${dynamicSizes.padding}px`,
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* Clean minimal status indicators */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Connection status */}
        <div className="flex items-center gap-1">
          {connectionStatus === "Connected" ? (
            <Wifi
              className="text-slate-400"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.8, 10),
                height: Math.max(dynamicSizes.titleFontSize * 0.8, 10),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.8, 10),
                height: Math.max(dynamicSizes.titleFontSize * 0.8, 10),
              }}
            />
          )}
        </div>

        {/* Activity indicator */}
        <div
          className={`rounded-full ${styles.indicator} ${
            styles.pulse ? "animate-pulse" : ""
          } transition-all duration-300`}
          style={{
            width: Math.max(dynamicSizes.titleFontSize * 0.6, 8),
            height: Math.max(dynamicSizes.titleFontSize * 0.6, 8),
          }}
        />
      </div>

      {/* Main content */}
      <div className="w-full h-full flex items-center justify-center">
        {renderMainContent()}
      </div>

      {/* Minimal hover effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
