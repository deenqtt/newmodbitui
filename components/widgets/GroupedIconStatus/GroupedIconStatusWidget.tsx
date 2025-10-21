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

  // Enhanced status styling with dark mode support
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-muted-foreground",
      value: "text-foreground",
      unit: "text-muted-foreground/70",
      iconBg: itemConfig.iconBgColor || "#64748B", // Default neutral
      iconColor: itemConfig.iconColor || "#FFFFFF",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-green-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-400",
          pulse: true,
          title: "text-muted-foreground/80",
          value: "text-muted-foreground",
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
        bg-card border border-border rounded-lg
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

  // Advanced dynamic responsive layout system
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      if (width === 0 || height === 0) return; // Prevent division by zero

      const area = width * height;
      const itemCount = config?.items?.length || 1;
      const aspectRatio = width / height;

      // Enhanced layout mode detection based on viewport and content
      let layoutMode: "mini" | "compact" | "normal";

      // Smallest areas are mini
      if (area < 12000) {
        layoutMode = "mini";
      } else if (area < 25000 || height < 180 || (width < 350 && itemCount > 2)) {
        layoutMode = "compact";
      } else {
        layoutMode = "normal";
      }

      // Advanced column calculation based on multiple factors
      let columnCount = 1;

      if (itemCount === 1) {
        columnCount = 1; // Single item always full width
      } else if (itemCount === 2) {
        columnCount = aspectRatio > 1.3 ? 2 : 1; // 2 items: wide layout gets 2 cols
      } else if (itemCount === 3) {
        columnCount = width > 450 && aspectRatio > 1.2 ? (width > 600 ? 3 : 2) : 1;
      } else if (itemCount === 4) {
        columnCount = width > 500 ? (aspectRatio > 1.5 ? 2 : Math.min(2, Math.ceil(itemCount / 2))) : 1;
      } else {
        // For 5+ items: complex calculation
        const idealItemsPerCol = Math.ceil(itemCount / 4); // Max 4 rows per col
        const colsByWidth = Math.floor(width / 250); // Min 250px per col
        const colsByHeight = Math.floor(height / 120); // Min 120px per col per item

        columnCount = Math.min(
          Math.max(1, colsByWidth),
          Math.max(1, idealItemsPerCol),
          Math.max(1, colsByHeight),
          4 // Max 4 columns
        );
      }

      // Prevent overly tall columns by allowing more rows
      const rows = Math.ceil(itemCount / columnCount);
      if (rows > 5 && columnCount > 1) {
        columnCount = Math.ceil(itemCount / 5); // Limit to 5 rows max
      }

      // Ensure column count works with available space
      const availableContentHeight = height - (layoutMode === "mini" ? 36 : layoutMode === "compact" ? 44 : 52);
      const maxRowsBySpace = Math.floor(availableContentHeight / (layoutMode === "mini" ? 80 : layoutMode === "compact" ? 100 : 120));
      if (maxRowsBySpace < rows && columnCount > 1) {
        // Adjust to fit vertically
        const adjustedCols = Math.ceil(itemCount / maxRowsBySpace);
        columnCount = Math.min(columnCount, adjustedCols);
      }

      // Final safety check
      if (columnCount > itemCount) columnCount = itemCount;
      if (columnCount < 1) columnCount = 1;

      // Calculate dynamic sizes with improved formulas
      const contentAreaHeight = height - (layoutMode === "mini" ? 36 : layoutMode === "compact" ? 44 : 52);
      const cellHeight = contentAreaHeight / Math.ceil(itemCount / columnCount);
      const cellWidth = width / columnCount;

      // Size calculations with better proportions - INCREASED TEXT SIZE BY 50%
      const sizes = {
        mini: {
          iconSize: Math.max(12, Math.min(cellHeight * 0.45, cellWidth * 0.3, 24)),
          fontSize: Math.max(15, Math.min(cellHeight * 0.375, cellWidth * 0.225, 18)),
          padding: Math.max(4, Math.min(cellHeight * 0.18, cellWidth * 0.12, 9)),
          gap: Math.max(4, cellHeight * 0.12, 6),
          headerHeight: 42,
        },
        compact: {
          iconSize: Math.max(24, Math.min(cellHeight * 0.525, cellWidth * 0.33, 33)),
          fontSize: Math.max(16, Math.min(cellHeight * 0.405, cellWidth * 0.255, 21)),
          padding: Math.max(7, Math.min(cellHeight * 0.225, cellWidth * 0.15, 12)),
          gap: Math.max(6, cellHeight * 0.15, 9),
          headerHeight: 48,
        },
        normal: {
          iconSize: Math.max(30, Math.min(cellHeight * 0.6, cellWidth * 0.375, 39)),
          fontSize: Math.max(18, Math.min(cellHeight * 0.45, cellWidth * 0.27, 24)),
          padding: Math.max(10, Math.min(cellHeight * 0.27, cellWidth * 0.18, 15)),
          gap: Math.max(9, cellHeight * 0.18, 12),
          headerHeight: 54,
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
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-card border border-border rounded-xl shadow-sm">
        <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
        <p className="text-sm font-medium text-destructive text-center">
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
                 bg-card
                 border border-border rounded-xl
                 shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 overflow-hidden"
    >
      {/* Clean minimal header */}
      <div
        className="flex items-center justify-between px-4 py-3
                  bg-card border-b border-border"
        style={{ height: layoutConfig.dynamicSizes.headerHeight }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 p-2 bg-muted rounded-lg shadow-sm">
            <List
              className="text-muted-foreground"
              style={{
                width: Math.max(layoutConfig.dynamicSizes.iconSize * 0.5, 10),
                height: Math.max(layoutConfig.dynamicSizes.iconSize * 0.5, 10),
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-foreground truncate leading-tight"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.fontSize * 1}px`,
              }}
              title={config.title}
            >
              {config.title}
            </h3>
            
          </div>
        </div>

        {/* Status count indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          <span
            className="text-muted-foreground font-medium"
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
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <div className="flex items-center justify-between">
            <p
              className="text-muted-foreground"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.fontSize * 0.75}px`,
              }}
            >
              Monitoring {config.items.length} devices
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                <span
                  className="text-muted-foreground"
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
