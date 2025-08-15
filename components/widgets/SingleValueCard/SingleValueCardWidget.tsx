// File: components/widgets/SingleValueCard/SingleValueCardWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, ChevronRightSquare } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string; // Menambahkan units
  };
}

export const SingleValueCardWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // --- Logika untuk Font Responsif ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [valueFontSize, setValueFontSize] = useState(24);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const baseSize = Math.min(width / 4, height / 2);
        setValueFontSize(Math.max(16, baseSize)); // Pastikan tidak terlalu kecil
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

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

  const renderContent = () => {
    if (
      status === "loading" ||
      (status === "waiting" && displayValue === null)
    ) {
      return (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      );
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
      <div className="text-center">
        <p
          className="font-bold tracking-tighter text-primary truncate"
          style={{ fontSize: `${valueFontSize}px`, lineHeight: 1.1 }}
        >
          {typeof displayValue === "number"
            ? displayValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : String(displayValue)}
          <span
            className="font-medium text-muted-foreground ml-1"
            style={{ fontSize: `${valueFontSize * 0.5}px` }}
          >
            {config.units}
          </span>
        </p>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move"
    >
      <div className="flex items-center text-sm font-medium text-muted-foreground mb-2">
        <ChevronRightSquare className="h-4 w-4 mr-2" />
        <p className="truncate">{config.customName}</p>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
