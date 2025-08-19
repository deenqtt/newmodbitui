// File: components/widgets/RunningHoursLog/RunningHoursLogWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
  };
}

interface DynamicSizes {
  valueFontSize: number;
  iconSize: number;
  titleFontSize: number;
}

export const RunningHoursLogWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [dynamicSizes, setDynamicSizes] = useState<DynamicSizes>({
    valueFontSize: 32,
    iconSize: 48,
    titleFontSize: 14,
  });

  const widgetRef = useRef<HTMLDivElement>(null);

  // Responsive sizing dengan ResizeObserver
  useEffect(() => {
    if (!widgetRef.current) return;

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
          baseSize = Math.min(width / 12, height / 3.5);
        } else {
          baseSize = Math.min(width / 6, height / 5.5);
        }

        setDynamicSizes({
          valueFontSize: Math.max(16, baseSize * 1.2),
          iconSize: Math.max(24, baseSize * 1.8),
          titleFontSize: Math.max(12, baseSize * 0.7),
        });
      }
    });

    resizeObserver.observe(widgetRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch device topic
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

  // Handle MQTT messages
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
        console.error("Failed to parse MQTT payload for running hours:", e);
      }
    },
    [config.selectedKey, config.multiply]
  );

  // MQTT subscription
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

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="w-full flex flex-col items-center justify-center">
      <div
        className="bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse rounded-lg"
        style={{
          width: `${dynamicSizes.valueFontSize * 3}px`,
          height: `${dynamicSizes.valueFontSize * 1.5}px`,
        }}
      />
      <div
        className="mt-2 bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse rounded"
        style={{
          width: `${dynamicSizes.valueFontSize * 2}px`,
          height: `${dynamicSizes.titleFontSize * 0.8}px`,
        }}
      />
    </div>
  );

  // Render content with animations
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Loader2
              className="animate-spin text-primary"
              style={{
                width: `${dynamicSizes.iconSize}px`,
                height: `${dynamicSizes.iconSize}px`,
              }}
            />
          </motion.div>
        </div>
      );
    }

    if (status === "error") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center text-center p-2"
        >
          <AlertTriangle
            className="text-destructive mb-2"
            style={{
              width: `${dynamicSizes.iconSize * 0.8}px`,
              height: `${dynamicSizes.iconSize * 0.8}px`,
            }}
          />
          <p
            className="font-semibold text-destructive text-center"
            style={{
              fontSize: `${Math.max(12, dynamicSizes.titleFontSize)}px`,
            }}
          >
            {errorMessage}
          </p>
        </motion.div>
      );
    }

    if (displayValue === null || status === "waiting") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSkeleton />
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={displayValue}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center"
        >
          <p
            className="font-bold tracking-tight text-primary truncate"
            style={{
              fontSize: `${dynamicSizes.valueFontSize}px`,
              lineHeight: 1.2,
            }}
          >
            {typeof displayValue === "number"
              ? displayValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : String(displayValue)}
          </p>
          <p
            className="font-medium text-muted-foreground mt-1"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            {config.units}
          </p>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div
      ref={widgetRef}
      className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move bg-card/30 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm"
    >
      <motion.div
        className="flex items-center w-full mb-3"
        style={{
          justifyContent: layoutMode === "horizontal" ? "flex-start" : "center",
        }}
      >
        <Clock
          className="text-muted-foreground mr-2 flex-shrink-0"
          style={{
            width: `${dynamicSizes.iconSize * 0.5}px`,
            height: `${dynamicSizes.iconSize * 0.5}px`,
          }}
        />
        <p
          className="font-medium text-muted-foreground truncate"
          style={{ fontSize: `${dynamicSizes.titleFontSize * 0.9}px` }}
        >
          {config.customName}
        </p>
      </motion.div>

      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
