// File: components/widgets/ChartLine/ChartLineWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LogData {
  value: number;
  timestamp: string;
}

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    units?: string;
    timeRange: "1h" | "24h" | "7d";
    lineColor?: string;
    hasAnimation?: boolean;
    refreshInterval?: number;
  };
}

export const ChartLineWidget = ({ config }: Props) => {
  const [data, setData] = useState<LogData[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!config.loggingConfigId || !config.timeRange) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchData = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/historical/chart-data?configId=${config.loggingConfigId}&timeRange=${config.timeRange}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch chart data");
        }
        const chartData = await response.json();
        setData(chartData);
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchData();

    const intervalMinutes = config.refreshInterval || 0;
    if (intervalMinutes > 0) {
      const intervalId = setInterval(fetchData, intervalMinutes * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [config.loggingConfigId, config.timeRange, config.refreshInterval]);

  // Dark mode aware colors
  const colors = {
    grid: isDarkMode ? "#404854" : "#e0e0e0",
    axis: isDarkMode ? "#94a3b8" : "#888888",
    tooltip: isDarkMode ? "#1e293b" : "#ffffff",
    tooltipBorder: isDarkMode ? "#475569" : "#cccccc",
    tooltipText: isDarkMode ? "#f1f5f9" : "#000000",
    legend: isDarkMode ? "#cbd5e1" : "#000000",
  };

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-4 h-full">
          <AlertTriangle className="h-8 w-8 mb-2 text-red-500 dark:text-red-400" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-300">
            {errorMessage}
          </p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <p className="text-slate-500 dark:text-slate-400 text-center">
          No data available for the selected range.
        </p>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.grid}
            opacity={isDarkMode ? 0.3 : 1}
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timeStr) => format(new Date(timeStr), "HH:mm")}
            fontSize={12}
            stroke={colors.axis}
            tick={{ fill: colors.axis }}
          />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(value) => value.toFixed(1)}
            fontSize={12}
            stroke={colors.axis}
            tick={{ fill: colors.axis }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltip,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: "0.5rem",
              color: colors.tooltipText,
            }}
            labelStyle={{ color: colors.tooltipText }}
            labelFormatter={(label) => format(new Date(label), "dd MMM, HH:mm")}
            formatter={(value) => [
              `${Number(value).toFixed(2)} ${config.units || ""}`,
              "Value",
            ]}
            cursor={{
              stroke: isDarkMode ? "#64748b" : "#e0e0e0",
              strokeWidth: 1,
            }}
          />
          <Legend wrapperStyle={{ color: colors.legend }} iconType="line" />
          <Line
            type="monotone"
            dataKey="value"
            stroke={config.lineColor || (isDarkMode ? "#60a5fa" : "#8884d8")}
            strokeWidth={2}
            dot={false}
            isAnimationActive={config.hasAnimation !== false}
            name={config.widgetTitle}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div
      className="w-full h-full flex flex-col cursor-move
        bg-card
        border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300
      "
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700  flex-shrink-0">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
          {config.widgetTitle}
        </h3>
      </div>

      {/* Chart content */}
      <div className="flex-1 w-full flex items-center justify-center p-4">
        {renderContent()}
      </div>
    </div>
  );
};
