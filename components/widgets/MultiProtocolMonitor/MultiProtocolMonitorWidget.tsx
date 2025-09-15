// File: components/widgets/MultiProtocolMonitor/MultiProtocolMonitorWidget.tsx
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
  RadioTower,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

// Configuration type for each monitored key
interface MonitoredKeyConfig {
  key: string;
  customName: string;
  onValue: string;
  offValue: string;
}

interface Props {
  config: {
    widgetTitle: string;
    deviceTopic: string;
    monitoredKeys: MonitoredKeyConfig[];
  };
}

export const MultiProtocolMonitorWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [keyStatuses, setKeyStatuses] = useState<
    Record<string, "ON" | "OFF" | "UNKNOWN">
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [itemFontSize, setItemFontSize] = useState(12);
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "grid">(
    "normal"
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const area = width * height;
      const itemCount = config.monitoredKeys?.length || 1;
      const aspectRatio = width / height;

      // Smart layout mode detection
      let currentLayoutMode: "compact" | "normal" | "grid";
      if (area < 20000 || height < 120) {
        currentLayoutMode = "compact";
      } else if (itemCount > 4 && aspectRatio > 1.2 && width > 300) {
        currentLayoutMode = "grid";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // Calculate responsive font sizes
      const baseScale = Math.sqrt(area) / 150;
      const titleSize = Math.max(11, Math.min(16, baseScale * 12));
      const itemSize = Math.max(10, Math.min(14, baseScale * 10));

      setTitleFontSize(Math.round(titleSize));
      setItemFontSize(Math.round(itemSize));
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, [config.monitoredKeys?.length]);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        const newStatuses: Record<string, "ON" | "OFF" | "UNKNOWN"> = {};

        config.monitoredKeys.forEach((keyConfig) => {
          if (innerPayload.hasOwnProperty(keyConfig.key)) {
            const rawValue = String(innerPayload[keyConfig.key]);
            if (rawValue === String(keyConfig.onValue)) {
              newStatuses[keyConfig.key] = "ON";
            } else if (rawValue === String(keyConfig.offValue)) {
              newStatuses[keyConfig.key] = "OFF";
            } else {
              newStatuses[keyConfig.key] = "UNKNOWN";
            }
          } else {
            newStatuses[keyConfig.key] = "UNKNOWN";
          }
        });

        setKeyStatuses(newStatuses);
        setLastUpdate(new Date());
        setIsLoading(false);
      } catch (e) {
        console.error(
          "Failed to parse MQTT payload for multi-protocol monitor:",
          e
        );
        setIsLoading(false);
      }
    },
    [config.monitoredKeys]
  );

  useEffect(() => {
    if (config.deviceTopic && isReady && connectionStatus === "Connected") {
      setIsLoading(true);
      subscribe(config.deviceTopic, handleMqttMessage);
      return () => {
        unsubscribe(config.deviceTopic, handleMqttMessage);
      };
    } else {
      setIsLoading(false);
    }
  }, [
    config.deviceTopic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Clean status styling
  const getStatusConfig = (status: "ON" | "OFF" | "UNKNOWN") => {
    switch (status) {
      case "ON":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
          label: "ON",
        };
      case "OFF":
        return {
          icon: XCircle,
          color: "text-slate-600",
          bg: "bg-slate-50",
          border: "border-slate-200",
          dot: "bg-slate-400",
          label: "OFF",
        };
      default:
        return {
          icon: HelpCircle,
          color: "text-amber-600",
          bg: "bg-amber-50",
          border: "border-amber-200",
          dot: "bg-amber-500",
          label: "UNKNOWN",
        };
    }
  };

  // Calculate status summary
  const getStatusSummary = () => {
    const total = config.monitoredKeys.length;
    const statuses = Object.values(keyStatuses);
    const onCount = statuses.filter((s) => s === "ON").length;
    const offCount = statuses.filter((s) => s === "OFF").length;
    const unknownCount = statuses.filter((s) => s === "UNKNOWN").length;

    return { total, onCount, offCount, unknownCount };
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderStatusItem = (item: MonitoredKeyConfig, index: number) => {
    const status = keyStatuses[item.key] || "UNKNOWN";
    const statusConfig = getStatusConfig(status);
    const Icon = statusConfig.icon;

    return (
      <div
        key={item.key}
        className={`
          flex items-center justify-between p-2 rounded-lg border transition-all duration-200
          ${statusConfig.bg} ${statusConfig.border}
          hover:shadow-sm
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            className={statusConfig.color}
            style={{
              width: Math.max(itemFontSize * 1.2, 14),
              height: Math.max(itemFontSize * 1.2, 14),
            }}
          />
          <span
            className={`font-medium truncate ${statusConfig.color}`}
            style={{ fontSize: `${itemFontSize}px` }}
            title={item.customName}
          >
            {layoutMode === "compact" && item.customName.length > 12
              ? `${item.customName.substring(0, 12)}...`
              : item.customName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`rounded-full ${statusConfig.dot} transition-all duration-200`}
            style={{
              width: Math.max(itemFontSize * 0.6, 6),
              height: Math.max(itemFontSize * 0.6, 6),
            }}
          />
          <span
            className={`font-semibold ${statusConfig.color} min-w-fit`}
            style={{ fontSize: `${Math.max(itemFontSize * 0.9, 10)}px` }}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!config.monitoredKeys || config.monitoredKeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-sm font-medium text-amber-600">
            No keys configured for monitoring
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <Loader2
            className="animate-spin text-slate-400"
            style={{
              width: Math.max(dimensions.width / 10, 24),
              height: Math.max(dimensions.width / 10, 24),
            }}
          />
          <p
            className="text-slate-600 font-medium"
            style={{ fontSize: `${itemFontSize}px` }}
          >
            Loading protocols...
          </p>
        </div>
      );
    }

    const summary = getStatusSummary();

    return (
      <div className="w-full h-full flex flex-col space-y-3">
        {/* Status summary for normal/grid mode */}
        {layoutMode !== "compact" && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span
                  className="font-bold text-emerald-600"
                  style={{ fontSize: `${itemFontSize}px` }}
                >
                  {summary.onCount}
                </span>
              </div>
              <p
                className="text-slate-500"
                style={{ fontSize: `${Math.max(itemFontSize * 0.8, 9)}px` }}
              >
                Online
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span
                  className="font-bold text-slate-600"
                  style={{ fontSize: `${itemFontSize}px` }}
                >
                  {summary.offCount}
                </span>
              </div>
              <p
                className="text-slate-500"
                style={{ fontSize: `${Math.max(itemFontSize * 0.8, 9)}px` }}
              >
                Offline
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span
                  className="font-bold text-amber-600"
                  style={{ fontSize: `${itemFontSize}px` }}
                >
                  {summary.unknownCount}
                </span>
              </div>
              <p
                className="text-slate-500"
                style={{ fontSize: `${Math.max(itemFontSize * 0.8, 9)}px` }}
              >
                Unknown
              </p>
            </div>
          </div>
        )}

        {/* Protocol list */}
        <div
          className={`
            flex-1 overflow-y-auto space-y-2
            ${layoutMode === "grid" ? "grid grid-cols-2 gap-2 space-y-0" : ""}
          `}
        >
          {config.monitoredKeys.map((item, index) =>
            renderStatusItem(item, index)
          )}
        </div>

        {/* Footer with last update */}
        {layoutMode === "normal" && lastUpdate && (
          <div className="text-center pt-2 border-t border-slate-200">
            <p
              className="text-slate-400"
              style={{ fontSize: `${Math.max(itemFontSize * 0.8, 9)}px` }}
            >
              Updated {formatTime(lastUpdate)}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Overall status for header indicator
  const getOverallStatus = () => {
    const summary = getStatusSummary();
    if (summary.unknownCount > 0) return "warning";
    if (summary.onCount > 0) return "ok";
    return "inactive";
  };

  const overallStatus = getOverallStatus();

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
        minWidth: 250,
        minHeight: 150,
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {connectionStatus === "Connected" ? (
          <Wifi
            className="text-slate-400"
            style={{ width: titleFontSize * 0.8, height: titleFontSize * 0.8 }}
          />
        ) : (
          <WifiOff
            className="text-slate-400"
            style={{ width: titleFontSize * 0.8, height: titleFontSize * 0.8 }}
          />
        )}

        <div
          className={`rounded-full transition-all duration-300 ${
            overallStatus === "ok"
              ? "bg-emerald-500"
              : overallStatus === "warning"
              ? "bg-amber-500"
              : "bg-slate-400"
          }`}
          style={{
            width: Math.max(titleFontSize * 0.6, 8),
            height: Math.max(titleFontSize * 0.6, 8),
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pr-16">
        <div className="flex items-center gap-2">
          <RadioTower
            className="text-slate-600 flex-shrink-0"
            style={{
              width: Math.max(titleFontSize * 0.9, 14),
              height: Math.max(titleFontSize * 0.9, 14),
            }}
          />
          <h3
            className="font-medium text-slate-700 truncate leading-tight"
            style={{
              fontSize: `${titleFontSize}px`,
              lineHeight: 1.3,
            }}
            title={config.widgetTitle}
          >
            {config.widgetTitle}
          </h3>
        </div>
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
