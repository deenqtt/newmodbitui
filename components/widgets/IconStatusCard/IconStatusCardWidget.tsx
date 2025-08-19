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
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
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

  // --- START: Logika untuk Font & Layout Responsif ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 24,
    unitFontSize: 16,
    iconSize: 24,
    titleFontSize: 12,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const aspectRatio = width / height;

        // Tentukan mode layout berdasarkan aspek rasio
        const currentLayoutMode = aspectRatio > 1.3 ? "horizontal" : "vertical";
        setLayoutMode(currentLayoutMode);

        // Rumus dinamis yang lebih conservative untuk card kecil
        let baseSize;
        if (currentLayoutMode === "horizontal") {
          baseSize = Math.min(width / 10, height / 3.5); // Lebih kecil dari 7 & 2.5
        } else {
          // Vertical
          baseSize = Math.min(width / 6, height / 5.5); // Lebih kecil dari 4 & 4
        }

        // Multiplier yang lebih kecil untuk menghasilkan font size yang lebih reasonable
        setDynamicSizes({
          valueFontSize: Math.max(12, baseSize * 1.0), // Dari 16 & 1.5 jadi 12 & 1.0
          unitFontSize: Math.max(8, baseSize * 0.6), // Dari 10 & 1.0 jadi 8 & 0.6
          iconSize: Math.max(14, baseSize * 0.9), // Dari 16 & 1.2 jadi 14 & 0.9
          titleFontSize: Math.max(8, baseSize * 0.4), // Dari 9 & 0.5 jadi 8 & 0.4
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  // --- END: Logika untuk Font & Layout Responsif ---

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

  // Status indicator colors
  const getStatusColor = () => {
    switch (status) {
      case "ok":
        return "bg-green-100 border-green-200";
      case "error":
        return "bg-red-100 border-red-200";
      case "waiting":
        return "bg-yellow-100 border-yellow-200";
      default:
        return "bg-gray-100 border-gray-200";
    }
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-pulse"></div>
      </div>
      <div className="space-y-1">
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-2 w-12 bg-gray-100 rounded animate-pulse"></div>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center p-3">
      <div className="relative group">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center  transition-transform duration-200">
          {connectionStatus !== "Connected" ? (
            <WifiOff className="h-6 w-6 text-red-600" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          )}
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-red-200 opacity-50"></div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-red-700 leading-tight">
          {connectionStatus !== "Connected" ? "Connection Lost" : "Error"}
        </p>
        <p className="text-xs text-red-600 opacity-80">
          {errorMessage.length > 30
            ? `${errorMessage.substring(0, 30)}...`
            : errorMessage}
        </p>
      </div>
    </div>
  );

  const renderWaitingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-ping"></div>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-yellow-200 animate-pulse"></div>
      </div>
      <div className="space-y-1">
        <div className="h-3 w-20 bg-yellow-200 rounded animate-pulse"></div>
        <p className="text-xs text-yellow-700">Waiting for data...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (status === "loading") {
      return renderLoadingState();
    }
    if (status === "error") {
      return renderErrorState();
    }
    if (status === "waiting" && displayValue === null) {
      return renderWaitingState();
    }

    const valueElement = (
      <div className="space-y-1">
        <p
          className="font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate leading-none"
          style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
        >
          {typeof displayValue === "number"
            ? displayValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : String(displayValue)}
          {config.units && (
            <span
              className="font-medium text-gray-500 dark:text-gray-400 ml-1"
              style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
            >
              {config.units}
            </span>
          )}
        </p>
        {lastUpdate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>
    );

    const titleElement = (
      <p
        className="text-gray-600 dark:text-gray-300 truncate font-medium leading-tight"
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
      >
        {config.customName}
      </p>
    );

    const iconElement = IconComponent && (
      <div className="relative group">
        <div
          className="p-3 rounded-xl shadow-sm flex items-center justify-center 
                     transition-all duration-300 ease-out
                    
                     border border-white/20"
          style={{
            backgroundColor: config.iconBgColor || "#3B82F6",
            color: config.iconColor || "#FFFFFF",
          }}
        >
          <IconComponent
            style={{
              height: `${dynamicSizes.iconSize}px`,
              width: `${dynamicSizes.iconSize}px`,
            }}
          />
        </div>
        <div
          className="absolute inset-0 rounded-xl opacity-20 blur-xl transition-opacity duration-300 "
          style={{ backgroundColor: config.iconBgColor || "#3B82F6" }}
        ></div>
      </div>
    );

    // Render berdasarkan mode layout
    if (layoutMode === "horizontal") {
      return (
        <div className="flex items-center justify-center gap-4 w-full px-4">
          {iconElement}
          <div className="overflow-hidden flex-1 space-y-1">
            {titleElement}
            {valueElement}
          </div>
        </div>
      );
    } else {
      // Vertical
      return (
        <div className="flex flex-col items-center justify-center gap-3 w-full text-center px-3">
          {iconElement}
          <div className="overflow-hidden space-y-1">
            {valueElement}
            {titleElement}
          </div>
        </div>
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center 
                  transition-all duration-300 ease-out
                    bg-white dark:bg-gray-900  ${getStatusColor()}`}
    >
      {renderContent()}

      {/* Status indicator dot */}
      <div className="absolute top-2 right-2 opacity-60  transition-opacity">
        <div
          className={`w-2 h-2 rounded-full ${
            status === "ok"
              ? "bg-green-500 shadow-green-500/50"
              : status === "error"
              ? "bg-red-500 shadow-red-500/50"
              : status === "waiting"
              ? "bg-yellow-500 shadow-yellow-500/50 animate-pulse"
              : "bg-gray-500 shadow-gray-500/50"
          } shadow-lg`}
        ></div>
      </div>
    </div>
  );
};
