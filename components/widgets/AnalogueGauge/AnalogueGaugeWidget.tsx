// File: components/widgets/AnalogueGauge/AnalogueGaugeWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import GaugeChart from "react-gauge-chart";
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

export const AnalogueGaugeWidget = ({ config }: Props) => {
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
        console.error("Failed to parse MQTT payload for gauge:", e);
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

  const { minValue = 0, maxValue = 100, units = "" } = config;
  const gaugePercent =
    currentValue !== null
      ? (currentValue - minValue) / (maxValue - minValue)
      : 0;

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-10 w-10 mb-2" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <GaugeChart
          id={`gauge-chart-${config.deviceUniqId}`}
          nrOfLevels={20}
          colors={["#22c55e", "#facc15", "#ef4444"]}
          arcWidth={0.3}
          percent={Math.max(0, Math.min(1, gaugePercent))} // Clamp between 0 and 1
          textColor="#374151"
          hideText={true} // Sembunyikan teks default agar kita bisa buat custom
          animate={true}
          animDelay={100}
        />
        <div className="text-center -mt-8">
          {currentValue !== null ? (
            <>
              <p className="text-2xl font-bold text-primary">
                {currentValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </p>
              <p className="text-sm text-muted-foreground">{units}</p>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-2">
        {config.customName}
      </h3>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
