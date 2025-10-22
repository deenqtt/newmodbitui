// File: components/widgets/BasicTrendChart/BasicTrendChartWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import {
  Loader2,
  AlertTriangle,
  LineChart as LineChartIcon,
} from "lucide-react";

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
  };
}

export const BasicTrendChartWidget = ({ config }: Props) => {
  const [data, setData] = useState<LogData[]>([]);
  const [latestValue, setLatestValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!config.loggingConfigId || !config.timeRange) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchData = async () => {
      // Tidak set loading jika bukan fetch pertama, agar tidak berkedip
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
        if (chartData.length > 0) {
          setLatestValue(chartData[chartData.length - 1].value);
        }
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchData();
    // Auto-refresh setiap 5 menit
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [config.loggingConfigId, config.timeRange]);

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-destructive p-2">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">No data available.</p>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="p-2 bg-muted rounded-md">
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-semibold truncate">{config.widgetTitle}</p>
          <p className="font-bold text-primary ml-auto">
            {latestValue?.toFixed(2)}
            <span className="text-sm font-medium text-muted-foreground ml-1">
              {config.units}
            </span>
          </p>
        </div>
        <div className="flex-1 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <Tooltip
                contentStyle={{ display: "none" }}
                cursor={{
                  stroke: config.chartColor,
                  strokeWidth: 2,
                  strokeDasharray: "3 3",
                }}
              />
              <defs>
                <linearGradient
                  id={`color-${config.loggingConfigId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={config.chartColor || "#10b981"}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={config.chartColor || "#10b981"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.chartColor || "#10b981"}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${config.loggingConfigId})`}
                dot={false}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex items-center justify-center cursor-move">
      {renderContent()}
    </div>
  );
};
