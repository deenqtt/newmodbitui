// File: components/widgets/BreakerStatus/BreakerStatusWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Loader2,
  AlertTriangle,
  Power,
  PowerOff,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react";

// --- PERBAIKAN: Perbarui struktur Props agar sesuai dengan data yang disimpan ---
interface Props {
  config: {
    widgetTitle: string;
    isTripEnabled: boolean;
    monitoring: {
      deviceTopic: string;
      selectedKey: string;
      onValue: string;
      offValue: string;
    };
    trip: {
      deviceTopic: string;
      selectedKey: string;
    } | null;
  };
}

export const BreakerStatusWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const containerRef = useRef<HTMLDivElement>(null);

  const [monitoringStatus, setMonitoringStatus] = useState<
    "UNKNOWN" | "ON" | "OFF"
  >("UNKNOWN");
  const [tripStatus, setTripStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(
    "vertical"
  );
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 24,
    iconSize: 48,
    titleFontSize: 16,
  });

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // --- PERBAIKAN: Akses properti dari objek 'trip' ---
        if (
          config.isTripEnabled &&
          config.trip &&
          config.trip.selectedKey &&
          innerPayload.hasOwnProperty(config.trip.selectedKey)
        ) {
          // Cek jika topik pesan cocok dengan topik trip
          if (topic === config.trip.deviceTopic) {
            setTripStatus(Boolean(innerPayload[config.trip.selectedKey]));
          }
        }

        // --- PERBAIKAN: Akses properti dari objek 'monitoring' ---
        if (
          config.monitoring &&
          config.monitoring.selectedKey &&
          innerPayload.hasOwnProperty(config.monitoring.selectedKey)
        ) {
          // Cek jika topik pesan cocok dengan topik monitoring
          if (topic === config.monitoring.deviceTopic) {
            const rawValue = String(
              innerPayload[config.monitoring.selectedKey]
            );
            if (rawValue === String(config.monitoring.onValue)) {
              setMonitoringStatus("ON");
            } else if (rawValue === String(config.monitoring.offValue)) {
              setMonitoringStatus("OFF");
            } else {
              setMonitoringStatus("UNKNOWN");
            }
          }
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Failed to parse MQTT payload for breaker status:", e);
      }
    },
    [config]
  );

  useEffect(() => {
    if (!containerRef.current) return;

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
          baseSize = Math.min(width / 12, height / 4.5); // Lebih kecil dari 7 & 2.5
        } else {
          // Vertical
          baseSize = Math.min(width / 10, height / 7.5); // Lebih kecil dari 4 & 4
        }

        // Multiplier yang lebih kecil untuk menghasilkan font size yang lebih reasonable
        setDynamicSizes({
          valueFontSize: Math.max(16, baseSize * 1.2), // Status text size
          iconSize: Math.max(24, baseSize * 1.8), // Icon size
          titleFontSize: Math.max(12, baseSize * 0.7), // Title size
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (
      !config.monitoring?.deviceTopic ||
      !isReady ||
      connectionStatus !== "Connected"
    ) {
      setIsLoading(false); // Hentikan loading jika config tidak valid
      return;
    }

    setIsLoading(true);

    const monitoringTopic = config.monitoring.deviceTopic;
    const tripTopic = config.isTripEnabled ? config.trip?.deviceTopic : null;

    // Subscribe ke topik monitoring
    subscribe(monitoringTopic, handleMqttMessage);

    // Subscribe ke topik trip jika ada dan berbeda
    if (tripTopic && tripTopic !== monitoringTopic) {
      subscribe(tripTopic, handleMqttMessage);
    }

    return () => {
      unsubscribe(monitoringTopic, handleMqttMessage);
      if (tripTopic && tripTopic !== monitoringTopic) {
        unsubscribe(tripTopic, handleMqttMessage);
      }
    };
  }, [
    config,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Logika prioritas: TRIP > ON/OFF > UNKNOWN
  const finalStatus = tripStatus ? "TRIP" : monitoringStatus;

  const getStatusConfig = (status: string) => {
    const configs = {
      TRIP: {
        icon: Zap,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
        label: "TRIP",
      },
      ON: {
        icon: Power,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        dotColor: "bg-green-500",
        label: "ON",
      },
      OFF: {
        icon: PowerOff,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        dotColor: "bg-red-500",
        label: "OFF",
      },
      UNKNOWN: {
        icon: AlertTriangle,
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        dotColor: "bg-gray-400",
        label: "UNKNOWN",
      },
    };
    return configs[status as keyof typeof configs] || configs.UNKNOWN;
  };

  const statusConfig = getStatusConfig(finalStatus);
  const StatusIcon = statusConfig.icon;

  const renderConnectionIndicator = () => {
    const isConnected = connectionStatus === "Connected" && isReady;
    return (
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
          </div>
          <div className="text-sm font-medium text-gray-500">Loading...</div>
        </div>
      );
    }

    return (
      <div
        className={`
        flex flex-col items-center justify-center gap-4 w-full
        ${layoutMode === "horizontal" ? "md:flex-row md:gap-6" : ""}
      `}
      >
        {/* Status Icon */}
        <div className="relative">
          {/* Pulse effect for active states */}
          {(finalStatus === "TRIP" || finalStatus === "ON") && (
            <div
              className={`absolute inset-0 rounded-full ${statusConfig.dotColor} opacity-20 animate-ping`}
            />
          )}

          {/* Icon container */}
          <div
            className={`
            relative p-4 rounded-xl border-2 transition-all duration-300
            ${statusConfig.bgColor} ${statusConfig.borderColor}
            hover:scale-105 hover:shadow-lg
          `}
          >
            <StatusIcon
              className={`${statusConfig.color}`}
              style={{
                width: dynamicSizes.iconSize,
                height: dynamicSizes.iconSize,
              }}
            />
          </div>

          {/* Status dot */}
          <div
            className={`
            absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
            ${statusConfig.dotColor}
            ${
              finalStatus === "TRIP" || finalStatus === "ON"
                ? "animate-pulse"
                : ""
            }
          `}
          />
        </div>

        {/* Status label */}
        <div
          className={`font-bold ${statusConfig.color}`}
          style={{ fontSize: dynamicSizes.valueFontSize }}
        >
          {statusConfig.label}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-move"
    >
      {/* Connection indicator */}
      {renderConnectionIndicator()}

      {/* Header */}
      <div className="p-4 pb-2 border-b border-gray-100">
        <h3
          className="font-semibold text-gray-800 text-center truncate"
          style={{ fontSize: dynamicSizes.titleFontSize }}
        >
          {config.widgetTitle}
        </h3>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {renderContent()}
      </div>
    </div>
  );
};
