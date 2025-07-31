// File: components/widgets/CalculatedParameter/CalculatedParameterWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, Sigma } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk operand dari config
interface OperandConfig {
  deviceUniqId: string;
  selectedKey: string;
}

// Hook kustom untuk mengelola nilai dari banyak operand
const useOperandValues = (operands: OperandConfig[]) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [values, setValues] = useState<Record<string, number>>({});
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");

  // 1. Ambil semua topik untuk semua device unik
  useEffect(() => {
    const fetchTopics = async () => {
      const deviceIds = [...new Set(operands.map((op) => op.deviceUniqId))];
      const topicPromises = deviceIds.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/devices/external/${id}`);
          if (!res.ok) return { id, topic: null };
          const data = await res.json();
          return { id, topic: data.topic };
        } catch {
          return { id, topic: null };
        }
      });
      const results = await Promise.all(topicPromises);
      const newTopics = results.reduce((acc, { id, topic }) => {
        if (topic) acc[id] = topic;
        return acc;
      }, {} as Record<string, string>);
      setTopics(newTopics);
      setStatus("ok");
    };
    if (operands.length > 0) {
      fetchTopics();
    }
  }, [operands]);

  // 2. Handler untuk pesan MQTT
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Cari operand mana yang cocok dengan topik ini
        operands.forEach((op, index) => {
          if (
            topics[op.deviceUniqId] === topic &&
            innerPayload.hasOwnProperty(op.selectedKey)
          ) {
            const value = innerPayload[op.selectedKey];
            if (typeof value === "number") {
              setValues((prev) => ({ ...prev, [`operand-${index}`]: value }));
            }
          }
        });
      } catch (e) {
        /* silent fail */
      }
    },
    [operands, topics]
  );

  // 3. Subscribe ke semua topik yang relevan
  useEffect(() => {
    const allTopics = [...new Set(Object.values(topics))];
    if (isReady && connectionStatus === "Connected" && allTopics.length > 0) {
      allTopics.forEach((topic) => subscribe(topic, handleMqttMessage));
      return () => {
        allTopics.forEach((topic) => unsubscribe(topic, handleMqttMessage));
      };
    }
  }, [
    topics,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  return { values: Object.values(values), status };
};

// Fungsi untuk melakukan kalkulasi
const calculateResult = (values: number[], type: string): number | null => {
  if (values.length === 0) return null;

  switch (type) {
    case "SUM":
      return values.reduce((sum, val) => sum + val, 0);
    case "AVERAGE":
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    case "DIFFERENCE":
      return values.length >= 2 ? values[0] - values[1] : null;
    default:
      return null;
  }
};

interface Props {
  config: {
    title: string;
    calculation: "SUM" | "AVERAGE" | "MIN" | "MAX" | "DIFFERENCE";
    units?: string;
    operands: OperandConfig[];
  };
}

export const CalculatedParameterWidget = ({ config }: Props) => {
  const { values, status } = useOperandValues(config.operands || []);
  const result = useMemo(
    () => calculateResult(values, config.calculation),
    [values, config.calculation]
  );

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
    }
    if (status === "error") {
      return <AlertTriangle className="h-10 w-10 text-destructive" />;
    }
    if (result === null) {
      return (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      );
    }
    return (
      <div className="text-center">
        <p className="text-5xl font-bold tracking-tighter text-primary truncate">
          {result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="text-2xl font-medium text-muted-foreground ml-2">
            {config.units}
          </span>
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <div className="flex items-center text-sm font-medium text-muted-foreground mb-4">
        <Sigma className="h-4 w-4 mr-2" />
        <p className="truncate">{config.title}</p>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
