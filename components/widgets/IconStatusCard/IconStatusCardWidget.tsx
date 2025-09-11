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
import { AlertTriangle, Loader2, WifiOff, Clock } from "lucide-react";
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

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Enhanced layout mode detection
      const aspectRatio = width / height;
      const area = width * height;

      let currentLayoutMode: "horizontal" | "vertical" | "compact";
      if (area < 8000) {
        // Very small widgets
        currentLayoutMode = "compact";
      } else if (aspectRatio > 1.4) {
        currentLayoutMode = "horizontal";
      } else {
        currentLayoutMode = "vertical";
      }

      setLayoutMode(currentLayoutMode);

      // Advanced responsive sizing
      const baseScale = Math.sqrt(area) / 120;
      const widthScale = width / 200;
      const heightScale = height / 120;
      const scale = Math.min(baseScale, widthScale, heightScale);

      // Dynamic sizes based on layout mode and scale
      const sizes = {
        compact: {
          valueFontSize: Math.max(10, scale * 16),
          unitFontSize: Math.max(8, scale * 10),
          iconSize: Math.max(16, scale * 20),
          titleFontSize: Math.max(8, scale * 9),
          padding: Math.max(8, scale * 10),
          gap: Math.max(4, scale * 6),
        },
        horizontal: {
          valueFontSize: Math.max(14, Math.min(width / 8, height / 2.5)),
          unitFontSize: Math.max(10, Math.min(width / 12, height / 4)),
          iconSize: Math.max(24, Math.min(width / 6, height / 1.8)),
          titleFontSize: Math.max(10, Math.min(width / 15, height / 6)),
          padding: Math.max(12, width / 20),
          gap: Math.max(8, width / 25),
        },
        vertical: {
          valueFontSize: Math.max(16, Math.min(width / 5, height / 3.5)),
          unitFontSize: Math.max(11, Math.min(width / 8, height / 5)),
          iconSize: Math.max(28, Math.min(width / 4, height / 2.5)),
          titleFontSize: Math.max(10, Math.min(width / 12, height / 8)),
          padding: Math.max(12, height / 15),
          gap: Math.max(8, height / 20),
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
          setDisplayValue(finalValue);
          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
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

  const IconComponent = getIconComponent(config.selectedIcon || "Zap");

  // Enhanced status styling
  const getStatusStyling = () => {
    switch (status) {
      case "ok":
        return {
          bg: "bg-gradient-to-br from-white to-emerald-50",
          border: "border-emerald-200",
          indicator: "bg-emerald-500 shadow-emerald-400/50",
          pulse: false,
        };
      case "error":
        return {
          bg: "bg-gradient-to-br from-white to-red-50",
          border: "border-red-200",
          indicator: "bg-red-500 shadow-red-400/50",
          pulse: false,
        };
      case "waiting":
        return {
          bg: "bg-gradient-to-br from-white to-amber-50",
          border: "border-amber-200",
          indicator: "bg-amber-500 shadow-amber-400/50",
          pulse: true,
        };
      default:
        return {
          bg: "bg-gradient-to-br from-white to-slate-50",
          border: "border-slate-200",
          indicator: "bg-slate-400 shadow-slate-400/50",
          pulse: false,
        };
    }
  };

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";

    if (typeof value === "number") {
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

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div
          className="bg-blue-100 rounded-2xl flex items-center justify-center border-2 border-blue-200"
          style={{
            width: dynamicSizes.iconSize * 1.5,
            height: dynamicSizes.iconSize * 1.5,
          }}
        >
          <Loader2
            className="animate-spin text-blue-600"
            style={{
              width: dynamicSizes.iconSize * 0.7,
              height: dynamicSizes.iconSize * 0.7,
            }}
          />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-300 animate-ping opacity-30"></div>
      </div>
      <p
        className="text-slate-600 font-medium"
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
      >
        Loading...
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div
          className="bg-red-100 rounded-2xl flex items-center justify-center border-2 border-red-200"
          style={{
            width: dynamicSizes.iconSize * 1.5,
            height: dynamicSizes.iconSize * 1.5,
          }}
        >
          {connectionStatus !== "Connected" ? (
            <WifiOff
              className="text-red-600"
              style={{
                width: dynamicSizes.iconSize * 0.7,
                height: dynamicSizes.iconSize * 0.7,
              }}
            />
          ) : (
            <AlertTriangle
              className="text-red-600"
              style={{
                width: dynamicSizes.iconSize * 0.7,
                height: dynamicSizes.iconSize * 0.7,
              }}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p
          className="text-red-700 font-semibold"
          style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
        >
          {connectionStatus !== "Connected" ? "Disconnected" : "Error"}
        </p>
        {layoutMode !== "compact" && (
          <p
            className="text-red-600 opacity-80 break-words"
            style={{ fontSize: `${dynamicSizes.titleFontSize * 0.8}px` }}
          >
            {errorMessage.length > 25
              ? `${errorMessage.substring(0, 25)}...`
              : errorMessage}
          </p>
        )}
      </div>
    </div>
  );

  const renderWaitingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div
          className="bg-amber-100 rounded-2xl flex items-center justify-center border-2 border-amber-200"
          style={{
            width: dynamicSizes.iconSize * 1.5,
            height: dynamicSizes.iconSize * 1.5,
          }}
        >
          <Clock
            className="text-amber-600"
            style={{
              width: dynamicSizes.iconSize * 0.7,
              height: dynamicSizes.iconSize * 0.7,
            }}
          />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-amber-300 animate-pulse opacity-50"></div>
      </div>
      <p
        className="text-amber-700 font-medium"
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
      >
        Waiting...
      </p>
    </div>
  );

  const renderMainContent = () => {
    if (status === "loading") return renderLoadingState();
    if (status === "error") return renderErrorState();
    if (status === "waiting" && displayValue === null)
      return renderWaitingState();

    const iconElement = IconComponent && (
      <div className="relative group">
        <div
          className="rounded-2xl shadow-lg flex items-center justify-center 
                     transition-all duration-300 ease-out transform
                     hover:scale-105 border border-white/30
                     backdrop-blur-sm"
          style={{
            backgroundColor: config.iconBgColor || "#3B82F6",
            color: config.iconColor || "#FFFFFF",
            width: dynamicSizes.iconSize * 1.4,
            height: dynamicSizes.iconSize * 1.4,
          }}
        >
          <IconComponent
            style={{
              height: dynamicSizes.iconSize,
              width: dynamicSizes.iconSize,
            }}
          />
        </div>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-20 blur-lg transition-opacity duration-300 group-hover:opacity-30"
          style={{ backgroundColor: config.iconBgColor || "#3B82F6" }}
        ></div>
      </div>
    );

    const valueElement = (
      <div className="space-y-1">
        <div className="flex items-baseline gap-1 justify-center">
          <span
            className="font-bold tracking-tight text-slate-900 leading-none"
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className="font-medium text-slate-500"
              style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
            >
              {config.units}
            </span>
          )}
        </div>
        {lastUpdate && layoutMode !== "compact" && (
          <p
            className="text-slate-400 text-center flex items-center justify-center gap-1"
            style={{ fontSize: `${dynamicSizes.titleFontSize * 0.8}px` }}
          >
            <Clock
              style={{
                width: dynamicSizes.titleFontSize * 0.8,
                height: dynamicSizes.titleFontSize * 0.8,
              }}
            />
            {formatTime(lastUpdate)}
          </p>
        )}
      </div>
    );

    const titleElement = (
      <p
        className="text-slate-700 font-semibold text-center leading-tight"
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
        title={config.customName}
      >
        {layoutMode === "compact" && config.customName.length > 12
          ? `${config.customName.substring(0, 12)}...`
          : config.customName}
      </p>
    );

    // Layout rendering based on mode
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
            className="flex items-center justify-center w-full"
            style={{ gap: `${dynamicSizes.gap}px` }}
          >
            {iconElement}
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

  const statusStyling = getStatusStyling();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
     
        transition-all duration-300 ease-out
        group
      `}
      style={{
        padding: `${dynamicSizes.padding}px`,
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className={`
            w-2.5 h-2.5 rounded-full shadow-lg
            ${statusStyling.indicator}
            ${statusStyling.pulse ? "animate-pulse" : ""}
            transition-all duration-300
          `}
        />
      </div>

      {/* Main content */}
      <div className="w-full h-full flex items-center justify-center">
        {renderMainContent()}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
