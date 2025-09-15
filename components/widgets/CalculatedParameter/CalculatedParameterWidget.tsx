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
import {
  Loader2,
  AlertTriangle,
  Calculator,
  TrendingUp,
  BarChart3,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Configuration types
interface OperandConfig {
  deviceUniqId: string;
  selectedKey: string;
}

interface Props {
  config: {
    title: string;
    calculation: "SUM" | "AVERAGE" | "MIN" | "MAX" | "DIFFERENCE";
    units?: string;
    operands: OperandConfig[];
  };
}

// Hook for managing operand values
const useOperandValues = (operands: OperandConfig[]) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [values, setValues] = useState<Record<string, number>>({});
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch topics for all unique devices
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
      setStatus(Object.keys(newTopics).length > 0 ? "ok" : "error");
    };

    if (operands.length > 0) {
      fetchTopics();
    }
  }, [operands]);

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Find matching operands for this topic
        operands.forEach((op, index) => {
          if (
            topics[op.deviceUniqId] === topic &&
            innerPayload.hasOwnProperty(op.selectedKey)
          ) {
            const value = innerPayload[op.selectedKey];
            if (typeof value === "number") {
              setValues((prev) => ({ ...prev, [`operand-${index}`]: value }));
              setLastUpdate(new Date());
            }
          }
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload for calculation:", e);
      }
    },
    [operands, topics]
  );

  // Subscribe to relevant topics
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

  return { values: Object.values(values), status, lastUpdate };
};

// Calculation functions
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

export const CalculatedParameterWidget = ({ config }: Props) => {
  const { values, status, lastUpdate } = useOperandValues(
    config.operands || []
  );
  const result = useMemo(
    () => calculateResult(values, config.calculation),
    [values, config.calculation]
  );

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal">("normal");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Determine layout mode
      const area = width * height;
      const currentLayoutMode =
        area < 25000 || height < 130 ? "compact" : "normal";
      setLayoutMode(currentLayoutMode);

      // Improved scaling algorithm
      const minDimension = Math.min(width, height);
      const scaleFactor = Math.sqrt(area) / 120;
      const minScaleFactor = Math.min(width / 180, height / 120);
      const finalScale = Math.min(scaleFactor, minScaleFactor, 2);

      const baseValueSize = Math.max(minDimension * 0.15, 18);
      const maxValueSize = Math.min(width * 0.3, height * 0.4);
      const newValueSize = Math.min(baseValueSize * finalScale, maxValueSize);

      const newTitleSize = Math.max(
        Math.min(newValueSize * 0.45, width * 0.08),
        12
      );
      const newUnitSize = Math.max(newValueSize * 0.4, 10);

      setValueFontSize(Math.round(newValueSize));
      setTitleFontSize(Math.round(newTitleSize));
      setUnitFontSize(Math.round(newUnitSize));
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // Clean minimal status styling
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700",
      value: "text-slate-900",
      unit: "text-slate-500",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500",
          pulse: false,
          title: "text-red-600",
          value: "text-red-700",
        };
      case "loading":
        return {
          ...baseStyles,
          indicator: "bg-amber-500",
          pulse: true,
          title: "text-slate-600",
          value: "text-slate-700",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400",
          pulse: false,
        };
    }
  };

  // Get calculation info for better display
  const getCalculationInfo = () => {
    switch (config.calculation) {
      case "SUM":
        return {
          symbol: "∑",
          name: "Sum",
          description: `Total of ${values.length} values`,
          icon: BarChart3,
        };
      case "AVERAGE":
        return {
          symbol: "μ",
          name: "Average",
          description: `Mean of ${values.length} values`,
          icon: TrendingUp,
        };
      case "MIN":
        return {
          symbol: "↓",
          name: "Minimum",
          description: `Lowest of ${values.length} values`,
          icon: TrendingUp,
        };
      case "MAX":
        return {
          symbol: "↑",
          name: "Maximum",
          description: `Highest of ${values.length} values`,
          icon: TrendingUp,
        };
      case "DIFFERENCE":
        return {
          symbol: "Δ",
          name: "Difference",
          description: "Value A - Value B",
          icon: Calculator,
        };
      default:
        return {
          symbol: "Σ",
          name: "Calculation",
          description: "Computing...",
          icon: Calculator,
        };
    }
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "—";

    // Smart number formatting
    if (Math.abs(value) >= 1000000) {
      return (
        (value / 1000000).toLocaleString(undefined, {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
        }) + "M"
      );
    }
    if (Math.abs(value) >= 1000) {
      return (
        (value / 1000).toLocaleString(undefined, {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
        }) + "K"
      );
    }
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const calcInfo = getCalculationInfo();

    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2
            className="animate-spin text-slate-400"
            style={{
              width: Math.max(dimensions.width / 8, 28),
              height: Math.max(dimensions.width / 8, 28),
            }}
          />
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Loading operands...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-2">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 8, 28),
              height: Math.max(dimensions.width / 8, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{ fontSize: `${Math.max(titleFontSize * 0.9, 11)}px` }}
          >
            Configuration Error
          </p>
        </div>
      );
    }

    if (result === null) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Calculator
              className="text-slate-400"
              style={{
                width: Math.max(dimensions.width / 8, 28),
                height: Math.max(dimensions.width / 8, 28),
              }}
            />
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            </div>
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Calculating {calcInfo.name.toLowerCase()}...
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-3">
        {/* Main result display */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-2 w-full">
            <span
              className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
              style={{
                fontSize: `${valueFontSize}px`,
                lineHeight: 0.9,
              }}
            >
              {formatValue(result)}
            </span>
            {config.units && (
              <span
                className={`font-medium transition-colors duration-200 ${styles.unit}`}
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

        {/* Calculation context */}
        {layoutMode === "normal" && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full">
            <span
              className="font-bold text-slate-600"
              style={{ fontSize: `${Math.max(titleFontSize * 1.1, 14)}px` }}
            >
              {calcInfo.symbol}
            </span>
            <span
              className="text-slate-600 font-medium"
              style={{ fontSize: `${Math.max(titleFontSize * 0.9, 10)}px` }}
            >
              {calcInfo.description}
            </span>
          </div>
        )}

        {/* Update time for normal mode */}
        {layoutMode === "normal" && lastUpdate && (
          <p
            className="text-slate-400"
            style={{ fontSize: `${Math.max(titleFontSize * 0.8, 9)}px` }}
          >
            Updated {formatTime(lastUpdate)}
          </p>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();
  const calcInfo = getCalculationInfo();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-white
        border border-slate-200/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minWidth: 160,
        minHeight: 100,
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Calculation symbol */}
        <div className="flex items-center justify-center w-6 h-6 bg-slate-100 rounded-full">
          <span
            className="font-bold text-slate-600"
            style={{ fontSize: `${Math.max(titleFontSize * 0.8, 10)}px` }}
          >
            {calcInfo.symbol}
          </span>
        </div>

        <div
          className={`rounded-full transition-all duration-300 ${
            styles.indicator
          } ${styles.pulse ? "animate-pulse" : ""}`}
          style={{
            width: Math.max(titleFontSize * 0.6, 8),
            height: Math.max(titleFontSize * 0.6, 8),
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pr-20">
        <h3
          className={`font-medium truncate text-left transition-colors duration-200 ${styles.title}`}
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.title}
        >
          {config.title}
        </h3>
      </div>

      {/* Main content area */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingTop: titleFontSize * 2.5,
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
