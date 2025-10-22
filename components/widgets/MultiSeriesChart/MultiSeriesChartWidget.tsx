// File: components/widgets/MultiSeriesChart/MultiSeriesChartWidget.tsx
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
} from "recharts";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk data series dari config
interface DataSeriesConfig {
  name: string;
  loggingConfigId: string;
  color: string;
}

interface Props {
  config: {
    widgetTitle: string;
    timeRange: "1h" | "24h" | "7d";
    hasAnimation?: boolean;
    refreshInterval?: number;
    chartType: "line" | "bar" | "area";
    series: DataSeriesConfig[];
  };
}

// Fungsi untuk menggabungkan data dari beberapa series
const mergeChartData = (
  seriesData: Record<string, any[]>,
  seriesConfig: DataSeriesConfig[]
) => {
  const allTimestamps = new Set<string>();
  Object.values(seriesData).forEach((data) => {
    data.forEach((point) => allTimestamps.add(point.timestamp));
  });

  const sortedTimestamps = Array.from(allTimestamps).sort();

  return sortedTimestamps.map((ts) => {
    const dataPoint: { [key: string]: any } = { timestamp: ts };
    seriesConfig.forEach((series) => {
      const seriesPoints = seriesData[series.loggingConfigId] || [];
      const point = seriesPoints.find((p) => p.timestamp === ts);
      dataPoint[series.name] = point ? point.value : null;
    });
    return dataPoint;
  });
};

export const MultiSeriesChartWidget = ({ config }: Props) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!config.series || config.series.length === 0) {
      setStatus("error");
      setErrorMessage("No data series configured.");
      return;
    }

    const fetchData = async () => {
      setStatus("loading");
      try {
        const promises = config.series.map((s) =>
          fetch(
            `${API_BASE_URL}/api/historical/chart-data?configId=${s.loggingConfigId}&timeRange=${config.timeRange}`
          ).then((res) => {
            if (!res.ok) throw new Error(`Failed to fetch data for ${s.name}`);
            return res.json();
          })
        );

        const results = await Promise.all(promises);

        const seriesDataMap: Record<string, any[]> = {};
        config.series.forEach((s, index) => {
          seriesDataMap[s.loggingConfigId] = results[index];
        });

        const mergedData = mergeChartData(seriesDataMap, config.series);
        setChartData(mergedData);
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
  }, [config]);

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
        data={chartData}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(timeStr) => format(new Date(timeStr), "HH:mm")}
          fontSize={12}
          stroke="#888"
        />
        <YAxis fontSize={12} stroke="#888" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #cccccc",
            borderRadius: "0.5rem",
          }}
          labelFormatter={(label) => format(new Date(label), "dd MMM, HH:mm")}
        />
        <Legend />
        {config.series.map((s) => (
          <SeriesComponent
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            fill={s.color} // Untuk bar dan area
            strokeWidth={2}
            dot={false}
            isAnimationActive={config.hasAnimation}
            connectNulls={true}
          />
        ))}
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
    if (chartData.length === 0) {
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
