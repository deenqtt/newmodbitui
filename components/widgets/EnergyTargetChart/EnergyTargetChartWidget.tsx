// File: components/widgets/EnergyTargetChart/EnergyTargetChartWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface ChartData {
  month: string;
  target: number;
  actual: number;
}

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    year: number;
  };
}

export const EnergyTargetChartWidget = ({ config }: Props) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!config.loggingConfigId || !config.year) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchData = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/historical/energy-target-data?configId=${config.loggingConfigId}&year=${config.year}`
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
    // Widget ini tidak perlu auto-refresh karena datanya bersifat tahunan/bulanan
  }, [config.loggingConfigId, config.year]);

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
          No data available for the selected year.
        </p>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="month" fontSize={12} stroke="#888" />
          <YAxis fontSize={12} stroke="#888" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #cccccc",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Bar dataKey="actual" name="Actual Usage" fill="#8884d8" />
          <Line
            type="monotone"
            dataKey="target"
            name="Target"
            stroke="#ff7300"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-2">
        {config.widgetTitle} - {config.year}
      </h3>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
