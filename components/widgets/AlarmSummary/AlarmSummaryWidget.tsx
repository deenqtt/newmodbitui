// File: components/widgets/AlarmSummary/AlarmSummaryWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Bell } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface SummaryData {
  CRITICAL: number;
  MAJOR: number;
  MINOR: number;
}

interface Props {
  config: {
    widgetTitle: string;
  };
}

export const AlarmSummaryWidget = ({ config }: Props) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (status !== "ok") setStatus("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/api/alarms/summary`);
        if (!response.ok) throw new Error("Failed to fetch alarm summary");
        setSummary(await response.json());
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchData();
    // Auto-refresh setiap 30 detik
    const intervalId = setInterval(fetchData, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [status]);

  const renderContent = () => {
    if (status === "loading") {
      return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    }
    if (status === "error") {
      return (
        <div className="text-center text-destructive p-2">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      );
    }
    if (!summary) {
      return <p className="text-muted-foreground">No data.</p>;
    }

    return (
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="p-4 rounded-lg text-center bg-red-100 dark:bg-red-900/50">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">
            CRITICAL
          </p>
          <p className="text-3xl font-bold text-red-700 dark:text-red-300">
            {summary.CRITICAL}
          </p>
        </div>
        <div className="p-4 rounded-lg text-center bg-yellow-100 dark:bg-yellow-900/50">
          <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
            MAJOR
          </p>
          <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
            {summary.MAJOR}
          </p>
        </div>
        <div className="p-4 rounded-lg text-center bg-blue-100 dark:bg-blue-900/50">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
            MINOR
          </p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {summary.MINOR}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <div className="flex items-center text-sm font-semibold mb-4">
        <Bell className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.widgetTitle}</h3>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
