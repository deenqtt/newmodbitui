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
import { AlertTriangle, Loader2 } from "lucide-react";
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

        // Rumus dinamis yang disesuaikan untuk setiap mode
        let baseSize;
        if (currentLayoutMode === "horizontal") {
          baseSize = Math.min(width / 7, height / 2.5);
        } else {
          // Vertical
          baseSize = Math.min(width / 4, height / 4);
        }

        setDynamicSizes({
          valueFontSize: Math.max(16, baseSize * 1.5),
          unitFontSize: Math.max(10, baseSize),
          iconSize: Math.max(16, baseSize * 1.2),
          titleFontSize: Math.max(9, baseSize * 0.5),
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

  const renderContent = () => {
    if (
      status === "loading" ||
      (status === "waiting" && displayValue === null)
    ) {
      return <Loader2 className="h-1/3 w-1/3 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-1/3 w-1/3 mb-2" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </div>
      );
    }

    const valueElement = (
      <p
        className="font-bold tracking-tight text-primary truncate"
        style={{ fontSize: `${dynamicSizes.valueFontSize}px`, lineHeight: 1.1 }}
      >
        {typeof displayValue === "number"
          ? displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : String(displayValue)}
        <span
          className="font-medium text-muted-foreground ml-1"
          style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
        >
          {config.units}
        </span>
      </p>
    );

    const titleElement = (
      <p
        className="text-muted-foreground truncate"
        style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
      >
        {config.customName}
      </p>
    );

    const iconElement = IconComponent && (
      <div
        className="p-3 rounded-lg flex items-center justify-center"
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
    );

    // Render berdasarkan mode layout
    if (layoutMode === "horizontal") {
      return (
        <div className="flex items-center justify-center gap-4 w-full px-4">
          {iconElement}
          <div className="overflow-hidden flex-1">
            {titleElement}
            {valueElement}
          </div>
        </div>
      );
    } else {
      // Vertical
      return (
        <div className="flex flex-col items-center justify-center gap-2 w-full text-center px-2">
          {iconElement}
          <div className="overflow-hidden">
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
      className="w-full h-full flex items-center justify-center p-2 cursor-move"
    >
      {renderContent()}
    </div>
  );
};
