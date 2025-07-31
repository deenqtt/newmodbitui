// File: components/widgets/SingleValueCard/SingleValueCardWidget.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { AlertTriangle, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
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

  // --- START: Logika untuk Font Responsif ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(16); // Ukuran font default

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Observer untuk mendeteksi perubahan ukuran container
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Rumus untuk menghitung ukuran font baru, disesuaikan agar pas
        // Dibagi 5 agar tidak terlalu besar, dan tinggi dibagi 2.5
        const newSize = Math.min(width / 5, height / 2.5);
        // Pastikan font tidak lebih kecil dari 12px
        setFontSize(Math.max(12, newSize));
      }
    });

    resizeObserver.observe(container);

    // Cleanup observer
    return () => resizeObserver.disconnect();
  }, []);
  // --- END: Logika untuk Font Responsif ---

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
    switch (status) {
      case "loading":
      case "waiting":
        return <Loader2 className="h-1/4 w-1/4 animate-spin text-primary" />;
      case "error":
        return (
          <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
            <AlertTriangle className="h-1/3 w-1/3 mb-1" />
            <p className="text-xs font-semibold" style={{ fontSize: "12px" }}>
              {errorMessage}
            </p>
          </div>
        );
      case "ok":
        if (displayValue === null)
          return (
            <Loader2 className="h-1/4 w-1/4 animate-spin text-muted-foreground" />
          );
        const unit = typeof displayValue === "number" ? "" : "";
        return (
          <div
            className="text-center overflow-hidden"
            title={config.customName}
          >
            <p
              className="font-bold tracking-tighter text-primary truncate"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.1 }}
            >
              {typeof displayValue === "number"
                ? displayValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : String(displayValue)}
              <span
                className="font-medium text-muted-foreground ml-1 sm:ml-2"
                style={{ fontSize: `${fontSize * 0.5}px` }}
              >
                {unit}
              </span>
            </p>
            <p
              className="text-muted-foreground truncate"
              style={{ fontSize: `${fontSize * 0.25}px`, marginTop: "4px" }}
            >
              {config.customName}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center p-2 cursor-move"
    >
      {renderContent()}
    </div>
  );
};
