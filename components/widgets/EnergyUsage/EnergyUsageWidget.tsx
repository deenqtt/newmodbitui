// File: components/widgets/EnergyUsage/EnergyUsageWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    units?: string;
    multiply?: number;
    period: "last_month" | "current_month";
  };
}

// Get energy-specific styling based on usage level and period
const getEnergyStyle = (
  status: string,
  usage: number | null,
  period: string
) => {
  if (status !== "ok") {
    return {
      border: status === "error" ? "border-red-200" : "border-amber-200",
      bg: status === "error" ? "bg-red-50" : "bg-amber-50",
    };
  }

  // Color based on energy usage level (if it's a number)
  if (typeof usage === "number") {
    if (usage < 100) {
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50", // Low usage - efficient
      };
    } else if (usage < 500) {
      return {
        border: "border-blue-200",
        bg: "bg-blue-50", // Normal usage
      };
    } else if (usage < 1000) {
      return {
        border: "border-orange-200",
        bg: "bg-orange-50", // High usage - monitor
      };
    } else {
      return {
        border: "border-red-200",
        bg: "bg-red-50", // Very high usage - attention needed
      };
    }
  }

  // Default period-based styling
  return period === "current_month"
    ? { border: "border-blue-200", bg: "bg-blue-50" }
    : { border: "border-slate-200", bg: "bg-slate-50" };
};

export const EnergyUsageWidget = ({ config }: Props) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Responsive sizing setup (sama seperti widgets lainnya)
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

  // Fetch usage data
  useEffect(() => {
    if (!config.loggingConfigId || !config.period) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchUsageData = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/historical/usage?configId=${config.loggingConfigId}&period=${config.period}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch data");
        }
        const data = await response.json();
        const finalUsage = data.usage * (config.multiply || 1);
        setUsage(finalUsage);
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchUsageData();
  }, [config.loggingConfigId, config.period, config.multiply]);

  const energyStyle = getEnergyStyle(status, usage, config.period);

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const getStatusIcon = () => {
    if (typeof usage === "number") {
      if (usage < 100) return "text-emerald-500";
      if (usage < 500) return "text-blue-500";
      if (usage < 1000) return "text-orange-500";
      return "text-red-500";
    }

    switch (status) {
      case "ok":
        return "text-slate-500";
      case "error":
        return "text-red-500";
      default:
        return "text-amber-500";
    }
  };

  const getPeriodIcon = () => {
    return config.period === "current_month" ? TrendingUp : TrendingDown;
  };

  const renderContent = () => {
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
            {errorMessage}
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
            {formatValue(usage)}
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

        {/* Usage level indicator */}
        {typeof usage === "number" && (
          <div className="mt-2 flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                usage < 100
                  ? "bg-emerald-400"
                  : usage < 500
                  ? "bg-blue-400"
                  : usage < 1000
                  ? "bg-orange-400"
                  : "bg-red-400"
              } animate-pulse`}
            />
            <span
              className="text-slate-400 font-medium"
              style={{ fontSize: `${Math.max(unitFontSize * 0.8, 8)}px` }}
            >
              {usage < 100
                ? "Efficient"
                : usage < 500
                ? "Normal"
                : usage < 1000
                ? "High"
                : "Critical"}
            </span>
          </div>
        )}
      </div>
    );
  };

  const PeriodIcon = getPeriodIcon();

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
      {/* Status indicator */}
      <div className="absolute top-2 right-2 opacity-75 group-hover:opacity-100 transition-opacity">
        <Zap
          className={getStatusIcon()}
          style={{
            width: Math.max(titleFontSize * 0.8, 12),
            height: Math.max(titleFontSize * 0.8, 12),
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3">
        <h3
          className="font-semibold text-slate-700 truncate text-left"
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.2,
          }}
          title={config.widgetTitle}
        >
          {config.widgetTitle}
        </h3>
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 pt-12 pb-4 px-4 flex items-center justify-center">
        {renderContent()}
      </div>

      {/* Period indicator */}
      <div className="absolute bottom-2 left-2 opacity-50 group-hover:opacity-75 transition-opacity">
        <div className="flex items-center space-x-1">
          <PeriodIcon
            className="text-slate-400"
            style={{
              width: `${Math.max(titleFontSize * 0.6, 8)}px`,
              height: `${Math.max(titleFontSize * 0.6, 8)}px`,
            }}
          />
          <span
            className="text-slate-400 font-medium uppercase tracking-wider"
            style={{ fontSize: `${Math.max(titleFontSize * 0.6, 8)}px` }}
          >
            {config.period === "current_month" ? "CURRENT" : "LAST"}
          </span>
        </div>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
