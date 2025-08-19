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
  RadioTower,
  WifiOff,
  Clock,
} from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap item dari config
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

// Sub-komponen untuk setiap baris status
const StatusRow = ({
  itemConfig,
  isCompact,
}: {
  itemConfig: ItemConfig;
  isCompact: boolean;
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

  // 1. Ambil topic untuk item ini
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

  // 2. Handler MQTT
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

  // 3. Subscribe/Unsubscribe
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

  // Status colors
  const getStatusIndicator = () => {
    switch (status) {
      case "ok":
        return "bg-green-500 shadow-green-500/50";
      case "error":
        return "bg-red-500 shadow-red-500/50";
      case "waiting":
        return "bg-yellow-500 shadow-yellow-500/50 animate-pulse";
      default:
        return "bg-gray-400 shadow-gray-400/50";
    }
  };

  const renderValue = () => {
    if (status === "loading") {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (status === "error") {
      return (
        <div className="flex items-center gap-1 text-red-600">
          {connectionStatus !== "Connected" ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          <span className="text-xs">Error</span>
        </div>
      );
    }
    if (status === "waiting" && displayValue === null) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Clock className="h-3 w-3" />
          <span className="text-xs">Waiting</span>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-bold text-gray-900 dark:text-gray-100 ${
              isCompact ? "text-sm" : "text-lg"
            }`}
          >
            {typeof displayValue === "number"
              ? displayValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : displayValue}
          </span>
          {itemConfig.units && (
            <span
              className={`font-medium text-gray-500 dark:text-gray-400 ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              {itemConfig.units}
            </span>
          )}
        </div>
        {lastUpdate && !isCompact && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative group transition-all duration-300 ease-out
                  bg-white dark:bg-gray-900 
                  border border-gray-200 dark:border-gray-700
                 
                  rounded-lg ${isCompact ? "p-3" : "p-3"}`}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 opacity-60 ">
        <div
          className={`w-1.5 h-1.5 rounded-full shadow-lg ${getStatusIndicator()}`}
        ></div>
      </div>

      <div className="flex items-center gap-3">
        {/* Icon */}
        {IconComponent && (
          <div className="relative">
            <div
              className={`rounded-lg flex items-center justify-center shadow-sm
                         transition-all duration-300 ease-out
                        
                         ${isCompact ? "p-2" : "p-2.5"}`}
              style={{
                backgroundColor: itemConfig.iconBgColor || "#3B82F6",
                color: itemConfig.iconColor || "#FFFFFF",
              }}
            >
              <IconComponent className={isCompact ? "h-4 w-4" : "h-5 w-5"} />
            </div>
            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-lg opacity-20 blur-md transition-opacity duration-300"
              style={{ backgroundColor: itemConfig.iconBgColor || "#3B82F6" }}
            ></div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden space-y-1">
          <p
            className={`font-medium text-gray-700 dark:text-gray-300 truncate leading-tight
                       ${isCompact ? "text-xs" : "text-sm"}`}
            title={itemConfig.customName}
          >
            {itemConfig.customName}
          </p>
          {renderValue()}
        </div>
      </div>
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
  const [columnCount, setColumnCount] = useState(1);
  const [isCompact, setIsCompact] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;

        // Responsive column calculation
        if (width > 450) {
          setColumnCount(2);
        } else {
          setColumnCount(1);
        }

        // Compact mode for small heights
        setIsCompact(height < 200);
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  if (!config || !config.items) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-4 
                      bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900
                      border border-red-200 dark:border-red-800 rounded-lg"
      >
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 mb-2" />
        <p className="text-sm font-medium text-red-700 dark:text-red-300 text-center">
          Widget not configured correctly
        </p>
      </div>
    );
  }

  // Count status for header indicator
  const statusCount = {
    total: config.items.length,
    // We could track individual statuses if needed
  };

  return (
    <div
      className="w-full h-full flex flex-col
                 bg-gradient-to-br from-gray-50 to-white 
                 dark:from-gray-900 dark:to-gray-800
                 border border-gray-200 dark:border-gray-700
                 rounded-lg shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 
                      bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm
                      border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-md">
            <RadioTower className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
            {config.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {statusCount.total} items
          </span>
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3">
        <div
          className={`grid gap-2 ${
            columnCount === 2 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {config.items.map((item, index) => (
            <StatusRow key={index} itemConfig={item} isCompact={isCompact} />
          ))}
        </div>
      </div>

      {/* Footer - Optional summary */}
      {config.items.length > 4 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Monitoring {config.items.length} devices
          </p>
        </div>
      )}
    </div>
  );
};
