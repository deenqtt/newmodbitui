// File: components/widgets/AnalogueGauge/AnalogueGaugeWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Atur ukuran font berdasarkan lebar widget
        setFontSize(Math.max(10, width / 18));
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
    if (
      status === "loading" ||
      (status === "waiting" && currentValue === null)
    ) {
      return <Loader2 className="h-1/3 w-1/3 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-1/2 w-1/2 mb-2" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        <GaugeChart
          id={`gauge-chart-${config.deviceUniqId}`}
          nrOfLevels={30}
          colors={["#22c55e", "#f59e0b", "#ef4444"]}
          arcWidth={0.3}
          percent={Math.max(0, Math.min(1, gaugePercent))}
          textColor="transparent" // Sembunyikan teks default
          animate={true}
          animDelay={100}
          // Tampilkan nilai custom di tengah
          formatTextValue={() =>
            currentValue !== null
              ? currentValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : ""
          }
          // Atur ukuran font custom
          textComponent={({ value }) => (
            <text
              x="50%"
              y="85%"
              textAnchor="middle"
              dy="0.35em"
              style={{
                fontSize: `${fontSize * 1.8}px`,
                fill: "#1e293b",
                fontWeight: "bold",
              }}
            >
              {value}
            </text>
          )}
        />
        {/* Label Min dan Max */}
        <div className="absolute bottom-4 w-full flex justify-between px-4">
          <span
            className="text-xs text-muted-foreground"
            style={{ fontSize: `${fontSize * 0.8}px` }}
          >
            {minValue}
          </span>
          <span
            className="font-semibold text-primary"
            style={{ fontSize: `${fontSize}px` }}
          >
            {units}
          </span>
          <span
            className="text-xs text-muted-foreground"
            style={{ fontSize: `${fontSize * 0.8}px` }}
          >
            {maxValue}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center p-2 cursor-move"
    >
      <h3
        className="font-semibold text-center truncate px-2"
        style={{ fontSize: `${fontSize}px` }}
      >
        {config.customName}
      </h3>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
