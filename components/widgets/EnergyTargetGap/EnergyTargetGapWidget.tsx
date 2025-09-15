// File: components/widgets/EnergyTargetGap/EnergyTargetGapWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    targetValue: number;
    units?: string;
    multiply?: number;
    period: "last_month" | "current_month";
  };
}

export const EnergyTargetGapWidget = ({ config }: Props) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Responsive sizing setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal">("normal");

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Determine layout mode based on size
      const area = width * height;
      const currentLayoutMode = area < 25000 ? "compact" : "normal";
      setLayoutMode(currentLayoutMode);

      // Improved scaling algorithm
      const minDimension = Math.min(width, height);
      const scaleFactor = Math.sqrt(area) / 120;
      const minScaleFactor = Math.min(width / 180, height / 120);
      const finalScale = Math.min(scaleFactor, minScaleFactor, 2);

      const baseValueSize = Math.max(minDimension * 0.12, 16);
      const maxValueSize = Math.min(width * 0.25, height * 0.3);
      const newValueSize = Math.min(baseValueSize * finalScale, maxValueSize);

      const newTitleSize = Math.max(
        Math.min(newValueSize * 0.5, width * 0.08),
        11
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

  // Fetch usage data
  useEffect(() => {
    if (!config.loggingConfigId || !config.period || !config.targetValue) {
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
  }, [
    config.loggingConfigId,
    config.period,
    config.multiply,
    config.targetValue,
  ]);

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

  const formatValue = (value: number) => {
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
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const renderProgressBar = (current: number, target: number) => {
    const progress = Math.min(100, (current / target) * 100);
    const isOverTarget = current > target;

    return (
      <div className="w-full space-y-1">
        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverTarget
                ? "bg-amber-500"
                : progress >= 80
                ? "bg-emerald-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          {/* Target line marker */}
          <div className="absolute top-0 right-0 w-0.5 h-full bg-slate-400" />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>{formatValue(target)}</span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();

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
            Loading data...
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
            {errorMessage}
          </p>
        </div>
      );
    }

    const target = config.targetValue;
    const current = usage || 0;
    const gap = target - current;
    const progress = (current / target) * 100;
    const isAchieved = current >= target;
    const isOverTarget = current > target;

    return (
      <div className="w-full space-y-4">
        {layoutMode === "normal" && (
          <>
            {/* Progress visualization */}
            <div className="space-y-2">
              {renderProgressBar(current, target)}
            </div>

            {/* Current vs Target comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Current</p>
                <p
                  className={`font-bold ${styles.value}`}
                  style={{ fontSize: `${valueFontSize * 0.8}px` }}
                >
                  {formatValue(current)}
                </p>
                <p
                  className={`${styles.unit}`}
                  style={{ fontSize: `${unitFontSize * 0.9}px` }}
                >
                  {config.units}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Target</p>
                <p
                  className="font-bold text-slate-600"
                  style={{ fontSize: `${valueFontSize * 0.8}px` }}
                >
                  {formatValue(target)}
                </p>
                <p
                  className="text-slate-500"
                  style={{ fontSize: `${unitFontSize * 0.9}px` }}
                >
                  {config.units}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 p-2 bg-slate-50 rounded-lg">
          {isAchieved ? (
            <>
              <CheckCircle
                className="text-emerald-600"
                style={{
                  width: titleFontSize * 1.2,
                  height: titleFontSize * 1.2,
                }}
              />
              <span
                className="font-medium text-emerald-700"
                style={{ fontSize: `${titleFontSize}px` }}
              >
                {isOverTarget
                  ? `${formatValue(Math.abs(gap))} over target`
                  : "Target achieved"}
              </span>
            </>
          ) : (
            <>
              <Target
                className="text-slate-500"
                style={{
                  width: titleFontSize * 1.2,
                  height: titleFontSize * 1.2,
                }}
              />
              <span
                className="font-medium text-slate-600"
                style={{ fontSize: `${titleFontSize}px` }}
              >
                {formatValue(gap)} to target
              </span>
            </>
          )}
        </div>

        {/* Compact mode - show only essential info */}
        {layoutMode === "compact" && (
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span
                className={`font-bold ${styles.value}`}
                style={{ fontSize: `${valueFontSize}px` }}
              >
                {formatValue(current)}
              </span>
              <span className="text-slate-400">/</span>
              <span
                className="font-medium text-slate-600"
                style={{ fontSize: `${valueFontSize * 0.7}px` }}
              >
                {formatValue(target)}
              </span>
              <span
                className={`${styles.unit}`}
                style={{ fontSize: `${unitFontSize}px` }}
              >
                {config.units}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();

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
        minWidth: 200,
        minHeight: 120,
      }}
    >
      {/* Status indicators */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <Target
          className="text-slate-400"
          style={{
            width: Math.max(titleFontSize * 0.8, 12),
            height: Math.max(titleFontSize * 0.8, 12),
          }}
        />

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
      <div className="absolute top-0 left-0 right-0 p-4 pr-16">
        <h3
          className={`font-medium truncate text-left transition-colors duration-200 ${styles.title}`}
          style={{
            fontSize: `${titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.widgetTitle}
        >
          {config.widgetTitle}
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
