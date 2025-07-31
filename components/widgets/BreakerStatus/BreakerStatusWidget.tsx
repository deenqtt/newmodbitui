// File: components/widgets/BreakerStatus/BreakerStatusWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, Power, PowerOff, Zap } from "lucide-react";

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

  const [monitoringStatus, setMonitoringStatus] = useState<
    "UNKNOWN" | "ON" | "OFF"
  >("UNKNOWN");
  const [tripStatus, setTripStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      );
    }

    switch (finalStatus) {
      case "TRIP":
        return (
          <div className="flex flex-col items-center justify-center gap-2 text-yellow-500">
            <Zap className="h-12 w-12" />
            <span className="text-lg font-bold">TRIP</span>
          </div>
        );
      case "ON":
        return (
          <div className="flex flex-col items-center justify-center gap-2 text-green-500">
            <Power className="h-12 w-12" />
            <span className="text-lg font-bold">ON</span>
          </div>
        );
      case "OFF":
        return (
          <div className="flex flex-col items-center justify-center gap-2 text-red-500">
            <PowerOff className="h-12 w-12" />
            <span className="text-lg font-bold">OFF</span>
          </div>
        );
      default: // UNKNOWN
        return (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <AlertTriangle className="h-12 w-12" />
            <span className="text-lg font-bold">UNKNOWN</span>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-2">
        {config.widgetTitle}
      </h3>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
