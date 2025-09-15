// File: components/widgets/GroupedIconStatus/GroupedIconStatusWidget.tsx
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
  WifiOff,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  List,
} from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface ItemConfig {
  customName: string;
  deviceUniqId: string;
  selectedKey: string;
  units: string;
  multiply: number;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
}

// Clean minimal StatusRow component
const StatusRow = ({
  itemConfig,
  layoutMode,
  dynamicSizes,
}: {
  itemConfig: ItemConfig;
  layoutMode: "mini" | "compact" | "normal";
  dynamicSizes: {
    iconSize: number;
    fontSize: number;
    padding: number;
    gap: number;
  };
}) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [topic, setTopic] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${itemConfig.deviceUniqId}`
        );
        if (!response.ok) {
          setStatus("error");
          return;
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err) {
        setStatus("error");
        console.error(err);
      }
    };
    fetchDeviceTopic();
  }, [itemConfig.deviceUniqId]);

  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(itemConfig.selectedKey)) {
          const rawValue = innerPayload[itemConfig.selectedKey];
          const multiplier = itemConfig.multiply || 1;
          const finalValue =
            typeof rawValue === "number" ? rawValue * multiplier : rawValue;
          setDisplayValue(finalValue);
          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        /* silent fail */
      }
    },
    [itemConfig.selectedKey, itemConfig.multiply]
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => unsubscribe(topic, handleMqttMessage);
    } else if (connectionStatus !== "Connected") {
      setStatus("error");
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const IconComponent = getIconComponent(itemConfig.selectedIcon || "Zap");

  // Clean minimal status styling
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700",
      value: "text-slate-900",
      unit: "text-slate-500",
      iconBg: itemConfig.iconBgColor || "#64748B", // Default neutral
      iconColor: itemConfig.iconColor || "#FFFFFF",
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
        maximumFractionDigits: layoutMode === "mini" ? 0 : 1,
        minimumFractionDigits: 0,
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

  const renderStatusIcon = () => {
    const iconSize = Math.max(dynamicSizes.iconSize * 0.6, 12);

    switch (status) {
      case "loading":
        return (
          <Loader2
            className="animate-spin text-slate-400"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "error":
        return connectionStatus !== "Connected" ? (
          <WifiOff
            className="text-slate-500"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <XCircle
            className="text-red-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "waiting":
        return (
          <Clock
            className="text-slate-400"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "ok":
        return (
          <CheckCircle2
            className="text-emerald-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      default:
        return null;
    }
  };

  const renderValue = () => {
    const styles = getStatusStyles();

    if (
      status === "loading" ||
      status === "error" ||
      (status === "waiting" && displayValue === null)
    ) {
      return (
        <div className="flex items-center gap-1.5">
          {renderStatusIcon()}
          <span
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.8}px` }}
          >
            {status === "loading"
              ? "Loading..."
              : status === "error"
              ? "Error"
              : "Waiting..."}
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-bold tracking-tight transition-colors duration-200 ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.fontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {itemConfig.units && (
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${dynamicSizes.fontSize * 0.7}px` }}
            >
              {itemConfig.units}
            </span>
          )}
        </div>
        {lastUpdate && layoutMode === "normal" && (
          <p
            className={`flex items-center gap-1 ${styles.unit} opacity-60`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.6}px` }}
          >
            <Clock
              style={{
                width: dynamicSizes.fontSize * 0.6,
                height: dynamicSizes.fontSize * 0.6,
              }}
            />
            {formatTime(lastUpdate)}
          </p>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      className={`
        relative group transition-all duration-300 ease-out
        bg-white border border-slate-200/60 rounded-lg 
        shadow-sm hover:shadow-md hover:scale-[1.01] transform-gpu
        overflow-hidden
      `}
      style={{ padding: `${dynamicSizes.padding}px` }}
    >
      {/* Clean status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`
            rounded-full transition-all duration-300
            ${styles.indicator}
            ${styles.pulse ? "animate-pulse" : ""}
          `}
          style={{
            width: Math.max(dynamicSizes.fontSize * 0.4, 6),
            height: Math.max(dynamicSizes.fontSize * 0.4, 6),
          }}
        />
      </div>

      <div
        className="flex items-center"
        style={{ gap: `${dynamicSizes.gap}px` }}
      >
        {/* Icon with clean styling */}
        {IconComponent && (
          <div className="relative flex-shrink-0">
            <div
              className="rounded-lg flex items-center justify-center shadow-sm
                         transition-all duration-300 ease-out transform
                         hover:scale-105 border border-slate-200/50"
              style={{
                backgroundColor: styles.iconBg,
                color: styles.iconColor,
                padding: `${Math.max(dynamicSizes.padding * 0.3, 4)}px`,
              }}
            >
              <IconComponent
                style={{
                  height: dynamicSizes.iconSize,
                  width: dynamicSizes.iconSize,
                }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={`font-medium truncate leading-tight transition-colors duration-200 ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.85}px` }}
            title={itemConfig.customName}
          >
            {layoutMode === "mini" && itemConfig.customName.length > 15
              ? `${itemConfig.customName.substring(0, 15)}...`
              : itemConfig.customName}
          </p>
          {renderValue()}
        </div>
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/2 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

interface Props {
  config: {
    title: string;
    items: ItemConfig[];
  };
}

export const GroupedIconStatusWidget = ({ config }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutConfig, setLayoutConfig] = useState({
    columnCount: 1,
    layoutMode: "normal" as "mini" | "compact" | "normal",
    dynamicSizes: {
      iconSize: 20,
      fontSize: 14,
      padding: 12,
      gap: 12,
      headerHeight: 48,
    },
  });

  // Enhanced responsive system
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Smart layout calculation
      const area = width * height;
      const itemCount = config?.items?.length || 1;
      const aspectRatio = width / height;

      // Determine layout mode
      let layoutMode: "mini" | "compact" | "normal";
      if (area < 15000 || height < 120) {
        layoutMode = "mini";
      } else if (area < 30000 || height < 200) {
        layoutMode = "compact";
      } else {
        layoutMode = "normal";
      }

      // Determine column count
      let columnCount = 1;
      if (width > 400 && itemCount > 2) {
        columnCount =
          aspectRatio > 1.5 ? Math.min(3, Math.ceil(itemCount / 2)) : 2;
      } else if (width > 300 && itemCount > 1 && aspectRatio > 1.2) {
        columnCount = 2;
      }

      // Calculate dynamic sizes
      const itemHeight =
        (height - (layoutMode === "mini" ? 40 : 60)) /
        Math.ceil(itemCount / columnCount);

      const sizes = {
        mini: {
          iconSize: Math.max(12, Math.min(itemHeight / 4, 16)),
          fontSize: Math.max(10, Math.min(itemHeight / 6, 12)),
          padding: Math.max(4, itemHeight / 12),
          gap: Math.max(4, itemHeight / 15),
          headerHeight: 40,
        },
        compact: {
          iconSize: Math.max(16, Math.min(itemHeight / 3.5, 20)),
          fontSize: Math.max(11, Math.min(itemHeight / 5, 14)),
          padding: Math.max(6, itemHeight / 10),
          gap: Math.max(6, itemHeight / 12),
          headerHeight: 48,
        },
        normal: {
          iconSize: Math.max(20, Math.min(itemHeight / 3, 24)),
          fontSize: Math.max(12, Math.min(itemHeight / 4.5, 16)),
          padding: Math.max(8, itemHeight / 8),
          gap: Math.max(8, itemHeight / 10),
          headerHeight: 56,
        },
      };

      setLayoutConfig({
        columnCount,
        layoutMode,
        dynamicSizes: sizes[layoutMode],
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, [config?.items?.length]);

  if (!config || !config.items) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white border border-slate-200/60 rounded-xl shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
        <p className="text-sm font-medium text-red-600 text-center">
          Widget not configured correctly
        </p>
      </div>
    );
  }

  const statusSummary = {
    total: config.items.length,
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col
                 bg-white
                 border border-slate-200/60 rounded-xl
                 shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 overflow-hidden"
    >
      {/* Clean minimal header */}
      <div
        className="flex items-center justify-between px-4 py-3 
                  bg-white border-b border-slate-200/40"
        style={{ height: layoutConfig.dynamicSizes.headerHeight }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 p-2 bg-slate-100 rounded-lg shadow-sm">
            <List
              className="text-slate-600"
              style={{
                width: Math.max(layoutConfig.dynamicSizes.iconSize * 0.7, 14),
                height: Math.max(layoutConfig.dynamicSizes.iconSize * 0.7, 14),
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-slate-900 truncate leading-tight"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.fontSize * 1.1}px`,
              }}
              title={config.title}
            >
              {config.title}
            </h3>
            {layoutConfig.layoutMode === "normal" && (
              <p
                className="text-slate-500 truncate"
                style={{
                  fontSize: `${layoutConfig.dynamicSizes.fontSize * 0.75}px`,
                }}
              >
                {statusSummary.total} device
                {statusSummary.total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Status count indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span
            className="text-slate-600 font-medium"
            style={{
              fontSize: `${layoutConfig.dynamicSizes.fontSize * 0.8}px`,
            }}
          >
            {statusSummary.total}
          </span>
        </div>
      </div>

      {/* Content with clean scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className="p-3"
          style={{
            gap: `${Math.max(layoutConfig.dynamicSizes.gap * 0.5, 4)}px`,
          }}
        >
          <div
            className={`grid transition-all duration-300 ease-out`}
            style={{
              gridTemplateColumns: `repeat(${layoutConfig.columnCount}, minmax(0, 1fr))`,
              gap: `${Math.max(layoutConfig.dynamicSizes.gap * 0.7, 6)}px`,
            }}
          >
            {config.items.map((item, index) => (
              <StatusRow
                key={`${item.deviceUniqId}-${index}`}
                itemConfig={item}
                layoutMode={layoutConfig.layoutMode}
                dynamicSizes={layoutConfig.dynamicSizes}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Clean minimal footer for large widgets */}
      {config.items.length > 6 && layoutConfig.layoutMode === "normal" && (
        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200/40">
          <div className="flex items-center justify-between">
            <p
              className="text-slate-600"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.fontSize * 0.75}px`,
              }}
            >
              Monitoring {config.items.length} devices
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span
                  className="text-slate-500"
                  style={{
                    fontSize: `${layoutConfig.dynamicSizes.fontSize * 0.7}px`,
                  }}
                >
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
