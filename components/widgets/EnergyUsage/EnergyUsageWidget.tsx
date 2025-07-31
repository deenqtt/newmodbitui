// File: components/widgets/EnergyUsage/EnergyUsageWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, BatteryCharging } from "lucide-react";

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

export const EnergyUsageWidget = ({ config }: Props) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

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

    return (
      <div className="text-center">
        <p className="text-5xl font-bold tracking-tighter text-primary truncate">
          {usage !== null
            ? usage.toLocaleString(undefined, { maximumFractionDigits: 1 })
            : "N/A"}
        </p>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          {config.units}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <div className="flex items-center text-sm font-medium text-muted-foreground mb-4">
        <BatteryCharging className="h-4 w-4 mr-2" />
        <p className="truncate">{config.widgetTitle}</p>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
