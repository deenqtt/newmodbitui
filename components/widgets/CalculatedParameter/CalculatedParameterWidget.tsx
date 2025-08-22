// File: components/widgets/CalculatedParameter/CalculatedParameterWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, Sigma, Calculator } from "lucide-react";

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

// Get calculation-specific styling
const getCalculationStyle = (calculation: string, status: string) => {
  if (status !== "ok") {
    return {
      border: status === "error" ? "border-red-200" : "border-amber-200",
      bg: status === "error" ? "bg-red-50" : "bg-amber-50",
    };
  }

  switch (calculation) {
    case "SUM":
      return {
        border: "border-blue-200",
        bg: "bg-blue-50",
      };
    case "AVERAGE":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
      };
    case "MIN":
      return {
        border: "border-purple-200",
        bg: "bg-purple-50",
      };
    case "MAX":
      return {
        border: "border-orange-200",
        bg: "bg-orange-50",
      };
    case "DIFFERENCE":
      return {
        border: "border-pink-200",
        bg: "bg-pink-50",
      };
    default:
      return {
        border: "border-slate-200",
        bg: "bg-slate-50",
      };
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

  // Responsive sizing setup (sama seperti SingleValueCard)
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Advanced responsive scaling
      const area = width * height;
      const baseScale = Math.sqrt(area) / 100;
      const minScale = Math.min(width / 150, height / 100);
      const scale = Math.min(baseScale, minScale);

      // Dynamic font sizes with better proportions
      const newValueSize = Math.max(Math.min(width / 6, height / 2.5), 16);
      const newTitleSize = Math.max(
        Math.min(width / 15, height / 8, newValueSize * 0.5),
        10
      );
      const newUnitSize = Math.max(newValueSize * 0.35, 10);

      setValueFontSize(newValueSize);
      setTitleFontSize(newTitleSize);
      setUnitFontSize(newUnitSize);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  const calcStyle = getCalculationStyle(config.calculation, status);

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const getCalculationIcon = () => {
    switch (config.calculation) {
      case "SUM":
        return "∑";
      case "AVERAGE":
        return "μ";
      case "MIN":
        return "↓";
      case "MAX":
        return "↑";
      case "DIFFERENCE":
        return "Δ";
      default:
        return "Σ";
    }
  };

  const renderContent = () => {
    const isLoading = status === "loading" || result === null;

    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-amber-500"
              style={{
                width: Math.max(dimensions.width / 8, 24),
                height: Math.max(dimensions.width / 8, 24),
              }}
            />
          </div>
          <p
            className="text-slate-500 font-medium"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Loading...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 8, 24),
              height: Math.max(dimensions.width / 8, 24),
            }}
          />
          <p
            className="text-red-600 font-semibold max-w-full break-words"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Configuration Error
          </p>
        </div>
      );
    }

    if (result === null) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2
            className="animate-spin text-slate-400"
            style={{
              width: Math.max(dimensions.width / 8, 24),
              height: Math.max(dimensions.width / 8, 24),
            }}
          />
          <p
            className="text-slate-500 font-medium"
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Calculating...
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="flex items-baseline justify-center gap-1 w-full">
          <span
            className="font-bold tracking-tight text-slate-900 transition-colors duration-200"
            style={{
              fontSize: `${valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(result)}
          </span>
          {config.units && (
            <span
              className="font-medium text-slate-500 transition-colors duration-200"
              style={{
                fontSize: `${unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {config.units}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-gradient-to-br from-white to-slate-50
     
        rounded-xl shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group
      `}
      style={{
        minWidth: 160,
        minHeight: 100,
      }}
    >
      {/* Status indicator dengan calculation icon */}
      <div className="absolute top-2 right-2 opacity-75 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          <span
            className={`
              font-bold text-center leading-none
              ${
                status === "ok"
                  ? config.calculation === "SUM"
                    ? "text-blue-500"
                    : config.calculation === "AVERAGE"
                    ? "text-emerald-500"
                    : config.calculation === "MIN"
                    ? "text-purple-500"
                    : config.calculation === "MAX"
                    ? "text-orange-500"
                    : "text-pink-500"
                  : status === "error"
                  ? "text-red-500"
                  : "text-amber-500"
              }
            `}
            style={{ fontSize: `${Math.max(titleFontSize * 0.8, 10)}px` }}
          >
            {getCalculationIcon()}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3">
        <h3
          className="font-semibold text-slate-700 truncate text-left"
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.2,
          }}
          title={config.title}
        >
          {config.title}
        </h3>
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 pt-12 pb-4 px-4 flex items-center justify-center">
        {renderContent()}
      </div>

      {/* Calculation type badge */}
      <div className="absolute bottom-2 left-2 opacity-50 group-hover:opacity-75 transition-opacity">
        <span
          className="text-slate-400 font-medium uppercase tracking-wider"
          style={{ fontSize: `${Math.max(titleFontSize * 0.6, 8)}px` }}
        >
          {config.calculation}
        </span>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
