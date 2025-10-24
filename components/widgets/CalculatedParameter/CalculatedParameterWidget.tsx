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
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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
        console.error("Failed to parse MQTT payload:", e);
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

  return {
    valuesList: Object.values(values),
    valuesMap: values,
    status,
    lastUpdate,
    connectionStatus,
  };
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

// Get calculation symbol and info
const getCalculationInfo = (
  calculation: string,
  operandCount: number
): { symbol: string; name: string; description: string } => {
  switch (calculation) {
    case "SUM":
      return {
        symbol: "Σ",
        name: "Sum",
        description: `Total of ${operandCount} values`,
      };
    case "AVERAGE":
      return {
        symbol: "μ",
        name: "Average",
        description: `Mean of ${operandCount} values`,
      };
    case "MIN":
      return {
        symbol: "↓",
        name: "Minimum",
        description: `Lowest of ${operandCount} values`,
      };
    case "MAX":
      return {
        symbol: "↑",
        name: "Maximum",
        description: `Highest of ${operandCount} values`,
      };
    case "DIFFERENCE":
      return {
        symbol: "Δ",
        name: "Difference",
        description: "Value A - Value B",
      };
    default:
      return {
        symbol: "Σ",
        name: "Calculation",
        description: "Computing...",
      };
  }
};

export const CalculatedParameterWidget = ({ config }: Props) => {
  const { valuesList, valuesMap, status, lastUpdate, connectionStatus } =
    useOperandValues(config.operands || []);
  const result = useMemo(
    () => calculateResult(valuesList, config.calculation),
    [valuesList, config.calculation]
  );

  // State for operand preview
  const [showOperands, setShowOperands] = useState(false);

  // FIXED: Responsive sizing - consistent with other widgets
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    valueFontSize: 24,
    unitFontSize: 12,
    labelFontSize: 10,
    padding: 16,
    headerHeight: 44,
    badgeSize: 24,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">(
    "normal"
  );

  // FIXED: Enhanced responsive calculation - same as other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Layout mode detection - 3 modes
      const minDimension = Math.min(width, height);
      let currentLayoutMode: "mini" | "compact" | "normal";

      if (minDimension < 160 || availableHeight < 100) {
        currentLayoutMode = "mini";
      } else if (minDimension < 240 || availableHeight < 160) {
        currentLayoutMode = "compact";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // FIXED: Dynamic sizing based on layout mode
      const valueSize = Math.max(
        18,
        Math.min(width * 0.2, availableHeight * 0.28, 64)
      );
      const unitSize = Math.max(12, Math.min(valueSize * 0.45, 28));
      const titleSize = Math.max(11, Math.min(headerHeight * 0.32, 15));
      const labelSize = Math.max(9, Math.min(titleSize * 0.85, 12));
      const padding = Math.max(12, Math.min(width * 0.04, 24));
      const badgeSize = Math.max(20, Math.min(titleSize * 1.8, 28));

      setDynamicSizes({
        titleFontSize: Math.round(titleSize),
        valueFontSize: Math.round(valueSize),
        unitFontSize: Math.round(unitSize),
        labelFontSize: Math.round(labelSize),
        padding,
        headerHeight,
        badgeSize: Math.round(badgeSize),
      });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // FIXED: Status styling - consistent with other widgets
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      label: "text-slate-600 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-500",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
          title: "text-slate-600 dark:text-slate-400",
          value: "text-slate-700 dark:text-slate-300",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "—";

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
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const calcInfo = getCalculationInfo(config.calculation, valuesList.length);

    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
              height: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
            }}
          />
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
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
            className="text-red-500 dark:text-red-400"
            style={{
              width: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
              height: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{
              fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.9, 10)}px`,
            }}
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
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
                height: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
              }}
            />
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
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
          <div className="flex items-baseline justify-center gap-2 w-full flex-wrap">
            <span
              className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
              style={{
                fontSize: `${dynamicSizes.valueFontSize}px`,
                lineHeight: 0.9,
              }}
            >
              {formatValue(result)}
            </span>
            {config.units && (
              <span
                className={`font-medium transition-colors duration-200 ${styles.unit}`}
                style={{
                  fontSize: `${dynamicSizes.unitFontSize}px`,
                  lineHeight: 1,
                }}
              >
                {config.units}
              </span>
            )}
          </div>
        </div>

        {/* FIXED: Calculation context with border */}
        {layoutMode === "normal" && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <span
              className="font-bold text-slate-600 dark:text-slate-300"
              style={{
                fontSize: `${Math.max(dynamicSizes.labelFontSize * 1.2, 13)}px`,
              }}
            >
              {calcInfo.symbol}
            </span>
            <span
              className="text-slate-600 dark:text-slate-300 font-medium"
              style={{
                fontSize: `${Math.max(
                  dynamicSizes.labelFontSize * 0.95,
                  10
                )}px`,
              }}
            >
              {calcInfo.description}
            </span>
          </div>
        )}

        {/* FIXED: Operand preview button - better styling */}
        {valuesList.length > 0 && layoutMode === "normal" && (
          <button
            onClick={() => setShowOperands(!showOperands)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 transition-colors"
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            {showOperands ? (
              <ChevronUp
                className="text-slate-500 dark:text-slate-400"
                style={{
                  width: dynamicSizes.labelFontSize * 1.2,
                  height: dynamicSizes.labelFontSize * 1.2,
                }}
              />
            ) : (
              <ChevronDown
                className="text-slate-500 dark:text-slate-400"
                style={{
                  width: dynamicSizes.labelFontSize * 1.2,
                  height: dynamicSizes.labelFontSize * 1.2,
                }}
              />
            )}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {showOperands ? "Hide" : "Show"} operands
            </span>
          </button>
        )}

        {/* Operand values - collapsible */}
        {showOperands && valuesList.length > 0 && (
          <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-left space-y-1.5">
            {valuesList.map((val, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center"
                style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
              >
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {String.fromCharCode(65 + idx)}:
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {formatValue(val)}
                </span>
              </div>
            ))}
            <div
              className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300"
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              <span>Result:</span>
              <span className="font-mono">{formatValue(result)}</span>
            </div>
          </div>
        )}

        {/* Update time */}
        {layoutMode === "normal" && lastUpdate && (
          <p
            className={`${styles.label}`}
            style={{
              fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.9, 9)}px`,
            }}
          >
            Updated {formatTime(lastUpdate)}
          </p>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();
  const calcInfo = getCalculationInfo(config.calculation, valuesList.length);

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-card
        border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* FIXED: Header - consistent with other widgets */}
      <div
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styles.title} flex-1`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.title}
        >
          {config.title}
        </h3>

        {/* FIXED: Calculation symbol + Wifi + Status */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* FIXED: Calculation badge with responsive sizing */}
          <div
            className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-200/50 dark:border-blue-800/50"
            style={{
              width: dynamicSizes.badgeSize,
              height: dynamicSizes.badgeSize,
            }}
          >
            <span
              className="font-bold text-blue-600 dark:text-blue-400"
              style={{
                fontSize: `${Math.max(dynamicSizes.labelFontSize * 1.1, 12)}px`,
              }}
            >
              {calcInfo.symbol}
            </span>
          </div>

          {/* FIXED: Wifi status */}
          {connectionStatus === "Connected" ? (
            <Wifi
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          )}

          <div
            className={`rounded-full transition-all duration-300 ${
              styles.indicator
            } ${styles.pulse ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* FIXED: Main content with proper spacing */}
      <div
        className="w-full h-full flex items-center justify-center overflow-y-auto"
        style={{
          paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
          paddingBottom: dynamicSizes.padding,
          paddingLeft: dynamicSizes.padding,
          paddingRight: dynamicSizes.padding,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
