// File: components/widgets/MultiProtocolMonitor/MultiProtocolMonitorWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, RadioTower } from "lucide-react";

// Tipe untuk konfigurasi setiap key
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
        setIsLoading(false);
      } catch (e) {
        console.error(
          "Failed to parse MQTT payload for multi-protocol monitor:",
          e
        );
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
    }
  }, [
    config.deviceTopic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const renderContent = () => {
    if (isLoading) {
      return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />;
    }

    return (
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {config.monitoredKeys.map((item) => {
          const status = keyStatuses[item.key] || "UNKNOWN";
          let statusColor = "bg-gray-400"; // UNKNOWN
          if (status === "ON") statusColor = "bg-green-500";
          if (status === "OFF") statusColor = "bg-red-500";

          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
            >
              <span className="text-sm font-medium truncate">
                {item.customName}
              </span>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${statusColor}`}></span>
                <span className="text-sm font-semibold w-12 text-right">
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <div className="flex items-center text-sm font-semibold mb-2">
        <RadioTower className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.widgetTitle}</h3>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
