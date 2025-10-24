// File: components/widgets/ChartBar/ChartBarWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
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
    timeRange: "24h" | "7d" | "30d";
    barColor?: string;
    hasAnimation?: boolean;
    refreshInterval?: number; // in minutes
  };
}

export const ChartBarWidget = ({ config }: Props) => {
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
      setStatus("loading");
      try {
        // API untuk Bar Chart bisa menggunakan endpoint yang sama dengan Line Chart
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

    // Set up auto-refresh
    const intervalMinutes = config.refreshInterval || 0;
    if (intervalMinutes > 0) {
      const intervalId = setInterval(fetchData, intervalMinutes * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [config.loggingConfigId, config.timeRange, config.refreshInterval]);

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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timeStr) => format(new Date(timeStr), "dd/MM")}
            fontSize={12}
            stroke="#888"
          />
          <YAxis
            domain={["dataMin - 1", "auto"]}
            tickFormatter={(value) => value.toFixed(1)}
            fontSize={12}
            stroke="#888"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #cccccc",
              borderRadius: "0.5rem",
            }}
            labelFormatter={(label) =>
              format(new Date(label), "dd MMM yyyy, HH:mm")
            }
            formatter={(value) => [
              `${Number(value).toFixed(2)} ${config.units || ""}`,
              "Value",
            ]}
          />
          <Legend />
          <Bar
            dataKey="value"
            fill={config.barColor || "#82ca9d"}
            isAnimationActive={config.hasAnimation}
            name={config.widgetTitle}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-2">
        {config.widgetTitle}
      </h3>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
