// File: components/widgets/PowerAnalyzerChart/PowerAnalyzerChartWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk data yang diterima dari API
interface BillLogData {
  rupiahCost: number;
  dollarCost: number;
  timestamp: string;
}

interface Props {
  config: {
    widgetTitle: string;
    billConfigId: string;
    chartType: "line" | "bar" | "area";
    timeRange: "today" | "1h" | "24h" | "7d";
    hasAnimation?: boolean;
    refreshInterval?: number;
  };
}

// API endpoint ini perlu dimodifikasi untuk mengembalikan semua data biaya
const API_ENDPOINT = "/api/historical/bill-chart-data";

export const PowerAnalyzerChartWidget = ({ config }: Props) => {
  const [data, setData] = useState<BillLogData[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!config.billConfigId || !config.timeRange) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchData = async () => {
      if (status !== "ok") setStatus("loading");
      try {
        // Kita panggil API tanpa dataType, API harus mengembalikan semua nilai
        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINT}?billConfigId=${config.billConfigId}&timeRange=${config.timeRange}`
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
  }, [config.billConfigId, config.timeRange, config.refreshInterval]);

  const renderChart = () => {
    const ChartComponent = {
      line: LineChart,
      bar: BarChart,
      area: AreaChart,
    }[config.chartType];

    const SeriesComponent = {
      line: Line,
      bar: Bar,
      area: Area,
    }[config.chartType];

    return (
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(timeStr) => format(new Date(timeStr), "HH:mm")}
          fontSize={12}
          stroke="#888"
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          stroke="#8884d8"
          fontSize={12}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#82ca9d"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #cccccc",
            borderRadius: "0.5rem",
          }}
          labelFormatter={(label) => format(new Date(label), "dd MMM, HH:mm")}
        />
        <Legend />
        <SeriesComponent
          yAxisId="left"
          type="monotone"
          dataKey="rupiahCost"
          name="Cost (IDR)"
          stroke="#8884d8"
          fill="#8884d8"
          isAnimationActive={config.hasAnimation}
        />
        <SeriesComponent
          yAxisId="right"
          type="monotone"
          dataKey="dollarCost"
          name="Cost (USD)"
          stroke="#82ca9d"
          fill="#82ca9d"
          isAnimationActive={config.hasAnimation}
        />
      </ChartComponent>
    );
  };

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
        {renderChart()}
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
