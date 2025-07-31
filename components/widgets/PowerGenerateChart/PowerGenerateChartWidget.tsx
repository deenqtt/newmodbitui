// File: components/widgets/PowerGenerateChart/PowerGenerateChartWidget.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Loader2, AlertTriangle, Zap, TrendingUp, Sigma } from "lucide-react";

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
    chartColor?: string;
    hasAnimation?: boolean;
    refreshInterval?: number;
  };
}

export const PowerGenerateChartWidget = ({ config }: Props) => {
  const [data, setData] = useState<LogData[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!config.loggingConfigId || !config.timeRange) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchData = async () => {
      if (status !== "ok") setStatus("loading");
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

  // Hitung data kunci (KPI)
  const kpiData = useMemo(() => {
    if (data.length === 0) {
      return { current: 0, peak: 0, average: 0 };
    }
    const values = data.map((d) => d.value);
    const current = values[values.length - 1];
    const peak = Math.max(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    return { current, peak, average };
  }, [data]);

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <p className="text-muted-foreground">
          No data available for the selected range.
        </p>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* KPI Section */}
        <div className="grid grid-cols-3 gap-2 px-4 text-center">
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-bold text-primary text-lg">
              {kpiData.current.toFixed(1)}
            </p>
          </div>
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">Peak</p>
            <p className="font-bold text-primary text-lg">
              {kpiData.peak.toFixed(1)}
            </p>
          </div>
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-bold text-primary text-lg">
              {kpiData.average.toFixed(1)}
            </p>
          </div>
        </div>
        {/* Chart Section */}
        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`colorGradient-${config.loggingConfigId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={config.chartColor || "#22c55e"}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={config.chartColor || "#22c55e"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timeStr) => format(new Date(timeStr), "HH:mm")}
                fontSize={10}
                stroke="#aaa"
              />
              <YAxis fontSize={10} stroke="#aaa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "0.5rem",
                }}
                labelFormatter={(label) =>
                  format(new Date(label), "dd MMM, HH:mm")
                }
                formatter={(value) => [
                  `${Number(value).toFixed(2)} ${config.units || ""}`,
                  "Power",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.chartColor || "#22c55e"}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorGradient-${config.loggingConfigId})`}
                isAnimationActive={config.hasAnimation}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <div className="flex items-center text-sm font-semibold mb-2">
        <Zap className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.widgetTitle}</h3>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
