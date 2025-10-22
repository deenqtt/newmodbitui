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
  CheckCircle2,
  XCircle,
  List,
  Wifi,
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

// FIXED: Clean minimal StatusRow component with smaller icons
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

  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      iconBg: itemConfig.iconBgColor || "#64748B",
      iconColor: itemConfig.iconColor || "#FFFFFF",
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
    const iconSize = Math.max(dynamicSizes.iconSize * 0.5, 10);

    switch (status) {
      case "loading":
        return (
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "error":
        return connectionStatus !== "Connected" ? (
          <WifiOff
            className="text-slate-500 dark:text-slate-400"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <XCircle
            className="text-red-500 dark:text-red-400"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "waiting":
        return (
          <Clock
            className="text-slate-400 dark:text-slate-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "ok":
        return (
          <CheckCircle2
            className="text-emerald-500 dark:text-emerald-400"
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
            style={{ fontSize: `${dynamicSizes.fontSize * 0.75}px` }}
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
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className={`font-bold tracking-tight transition-colors duration-200 ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.fontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {itemConfig.units && (
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${dynamicSizes.fontSize * 0.65}px` }}
            >
              {itemConfig.units}
            </span>
          )}
        </div>
        {lastUpdate && layoutMode === "normal" && (
          <p
            className={`flex items-center gap-1 ${styles.unit} opacity-60`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.55}px` }}
          >
            <Clock
              style={{
                width: dynamicSizes.fontSize * 0.55,
                height: dynamicSizes.fontSize * 0.55,
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
        relative group transition-all duration-200 ease-out
        bg-card border border-border/60 rounded-lg 
        shadow-sm hover:shadow-md hover:scale-[1.01] transform-gpu
        overflow-hidden
      `}
      style={{ padding: `${dynamicSizes.padding}px` }}
    >
      <div
        className="flex items-center"
        style={{ gap: `${dynamicSizes.gap}px` }}
      >
        {/* FIXED: Smaller icon with better proportions */}
        {IconComponent && (
          <div className="relative flex-shrink-0">
            <div
              className="rounded-lg flex items-center justify-center shadow-sm
                         transition-all duration-200 ease-out
                         border border-slate-200/50 dark:border-slate-600/50"
              style={{
                backgroundColor: styles.iconBg,
                color: styles.iconColor,
                width: dynamicSizes.iconSize * 1.15,
                height: dynamicSizes.iconSize * 1.15,
                minWidth: dynamicSizes.iconSize * 1.15,
                minHeight: dynamicSizes.iconSize * 1.15,
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
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={`font-medium truncate leading-tight transition-colors duration-200 ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.8}px` }}
            title={itemConfig.customName}
          >
            {layoutMode === "mini" && itemConfig.customName.length > 15
              ? `${itemConfig.customName.substring(0, 15)}...`
              : itemConfig.customName}
          </p>
          {renderValue()}
        </div>

        {/* FIXED: Status indicator moved to right side */}
        <div className="flex-shrink-0 ml-2">
          <div
            className={`
              rounded-full transition-all duration-300
              ${styles.indicator}
              ${styles.pulse ? "animate-pulse" : ""}
            `}
            style={{
              width: Math.max(dynamicSizes.fontSize * 0.5, 7),
              height: Math.max(dynamicSizes.fontSize * 0.5, 7),
            }}
          />
        </div>
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
  const { connectionStatus } = useMqtt();
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
      titleFontSize: 14,
    },
  });

  // FIXED: Enhanced responsive system with better thresholds
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      const itemCount = config?.items?.length || 1;
      const aspectRatio = width / height;

      // FIXED: Calculate header height first
      const headerHeight = Math.max(36, Math.min(height * 0.2, 56));
      const availableHeight = height - headerHeight - 24; // 24 for padding

      // FIXED: Better layout mode detection
      let layoutMode: "mini" | "compact" | "normal";
      const minDimension = Math.min(width, height);

      if (minDimension < 200 || availableHeight < 120) {
        layoutMode = "mini";
      } else if (minDimension < 320 || availableHeight < 220) {
        layoutMode = "compact";
      } else {
        layoutMode = "normal";
      }

      // FIXED: Smarter column count based on width AND height
      let columnCount = 1;
      const minCardWidth =
        layoutMode === "mini" ? 140 : layoutMode === "compact" ? 180 : 220;
      const maxPossibleColumns = Math.floor(width / minCardWidth);

      if (maxPossibleColumns >= 2 && itemCount > 1) {
        // Calculate optimal rows
        const itemsPerColumn = Math.ceil(itemCount / maxPossibleColumns);
        const estimatedRowHeight =
          layoutMode === "mini" ? 60 : layoutMode === "compact" ? 80 : 100;
        const neededHeight = itemsPerColumn * estimatedRowHeight;

        if (neededHeight <= availableHeight) {
          columnCount = Math.min(maxPossibleColumns, Math.ceil(itemCount / 2));
        }
      }

      // Calculate items per column for sizing
      const itemsPerColumn = Math.ceil(itemCount / columnCount);
      const availableHeightPerItem = availableHeight / itemsPerColumn;

      // FIXED: More proportional sizes
      const sizes = {
        mini: {
          iconSize: Math.max(14, Math.min(availableHeightPerItem / 4.5, 18)),
          fontSize: Math.max(10, Math.min(availableHeightPerItem / 6, 13)),
          padding: Math.max(6, Math.min(availableHeightPerItem / 10, 10)),
          gap: Math.max(6, Math.min(availableHeightPerItem / 12, 10)),
          headerHeight,
          titleFontSize: Math.max(10, Math.min(headerHeight * 0.32, 13)),
        },
        compact: {
          iconSize: Math.max(16, Math.min(availableHeightPerItem / 4, 22)),
          fontSize: Math.max(12, Math.min(availableHeightPerItem / 5.5, 15)),
          padding: Math.max(8, Math.min(availableHeightPerItem / 9, 12)),
          gap: Math.max(8, Math.min(availableHeightPerItem / 10, 12)),
          headerHeight,
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 15)),
        },
        normal: {
          iconSize: Math.max(18, Math.min(availableHeightPerItem / 3.5, 26)),
          fontSize: Math.max(13, Math.min(availableHeightPerItem / 5, 17)),
          padding: Math.max(10, Math.min(availableHeightPerItem / 7, 14)),
          gap: Math.max(10, Math.min(availableHeightPerItem / 8, 14)),
          headerHeight,
          titleFontSize: Math.max(12, Math.min(headerHeight * 0.35, 16)),
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
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-card border border-border/60 rounded-xl shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-3" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
          Widget not configured correctly
        </p>
      </div>
    );
  }

  // FIXED: Calculate status summary for header
  const statusSummary = {
    total: config.items.length,
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col
                 bg-card
                 border border-border/60 rounded-xl
                 shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 overflow-hidden"
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* FIXED: Header consistent with other widgets */}
      <div
        className="flex items-center justify-between px-4 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${layoutConfig.dynamicSizes.headerHeight}px` }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex-shrink-0 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <List
              className="text-slate-600 dark:text-slate-400"
              style={{
                width: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.95,
                  13
                ),
                height: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.95,
                  13
                ),
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-medium text-slate-700 dark:text-slate-300 truncate leading-tight"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.titleFontSize}px`,
              }}
              title={config.title}
            >
              {config.title}
            </h3>
          </div>
        </div>

        {/* FIXED: Status indicators in header like other widgets */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Device count badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
            style={{
              fontSize: `${layoutConfig.dynamicSizes.titleFontSize * 0.75}px`,
            }}
          >
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {statusSummary.total}
            </span>
          </div>

          {/* Wifi status */}
          {connectionStatus === "Connected" ? (
            <Wifi
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.9,
                  12
                ),
                height: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.9,
                  12
                ),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.9,
                  12
                ),
                height: Math.max(
                  layoutConfig.dynamicSizes.titleFontSize * 0.9,
                  12
                ),
              }}
            />
          )}

          {/* Overall status dot */}
          <div
            className="rounded-full bg-slate-400 dark:bg-slate-500"
            style={{
              width: Math.max(
                layoutConfig.dynamicSizes.titleFontSize * 0.65,
                8
              ),
              height: Math.max(
                layoutConfig.dynamicSizes.titleFontSize * 0.65,
                8
              ),
            }}
          />
        </div>
      </div>

      {/* FIXED: Content fills all available space */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        <div className="flex-1 p-3 flex flex-col">
          <div
            className="grid flex-1 transition-all duration-300 ease-out"
            style={{
              gridTemplateColumns: `repeat(${layoutConfig.columnCount}, minmax(0, 1fr))`,
              gridAutoRows: "1fr",
              gap: `${Math.max(layoutConfig.dynamicSizes.gap * 0.8, 8)}px`,
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
    </div>
  );
};
