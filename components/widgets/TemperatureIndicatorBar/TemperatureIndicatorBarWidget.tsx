// File: components/widgets/TemperatureIndicatorBar/TemperatureIndicatorBarWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    minValue?: number;
    maxValue?: number;
  };
}

// Fungsi untuk mendapatkan warna berdasarkan persentase
const getColorForPercentage = (percentage: number) => {
  if (percentage < 0.5) return "bg-green-500"; // Dingin
  if (percentage < 0.8) return "bg-yellow-500"; // Hangat
  return "bg-red-500"; // Panas
};

export const TemperatureIndicatorBarWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

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
          if (typeof rawValue === "number") {
            const finalValue = rawValue * (config.multiply || 1);
            setCurrentValue(finalValue);
            setStatus("ok");
          }
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload for temp bar:", e);
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

  const { minValue = 0, maxValue = 100, units = "°C" } = config;
  const percentage =
    currentValue !== null
      ? ((currentValue - minValue) / (maxValue - minValue)) * 100
      : 0;
  const barColorClass = getColorForPercentage(percentage / 100);

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="w-full px-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm text-muted-foreground">{minValue}</span>
          {currentValue !== null ? (
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">
                {currentValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="text-lg text-muted-foreground ml-1">
                {units}
              </span>
            </div>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">{maxValue}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${barColorClass}`}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-4">
        {config.customName}
      </h3>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
