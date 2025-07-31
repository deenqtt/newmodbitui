// File: components/widgets/EnergyTargetGap/EnergyTargetGapWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Asumsi Anda menggunakan shadcn/ui

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

    const target = config.targetValue || 0;
    const current = usage || 0;
    const progress = target > 0 ? (current / target) * 100 : 0;
    const isAchieved = current >= target;

    return (
      <div className="w-full px-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Usage
          </span>
          {isAchieved ? (
            <span className="text-sm font-bold text-green-600 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Achieved
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              Target: {target.toLocaleString()} {config.units}
            </span>
          )}
        </div>
        <Progress value={progress} className="w-full h-3" />
        <div className="mt-2 text-center">
          <p className="text-3xl font-bold text-primary">
            {current.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-lg text-muted-foreground ml-1">
              {config.units}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <div className="flex items-center text-sm font-medium text-muted-foreground mb-4">
        <TrendingUp className="h-4 w-4 mr-2" />
        <p className="truncate">{config.widgetTitle}</p>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
