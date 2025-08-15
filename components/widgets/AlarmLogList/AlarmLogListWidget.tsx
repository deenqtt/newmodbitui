// File: components/widgets/AlarmLogList/AlarmLogListWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, HardDrive } from "lucide-react";
import { format, formatDistanceToNow, subHours, subMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface AlarmLog {
  id: string;
  deviceName: string;
  alarmName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  status: "ACTIVE" | "CLEARED";
  timestamp: string;
  clearedAt: string | null;
}

interface Props {
  config: {
    widgetTitle: string;
    logLimit: number;
  };
}

const AlarmTypeBadge = ({ type }: { type: AlarmLog["alarmType"] }) => {
  const colorMap = {
    CRITICAL: "bg-red-500 hover:bg-red-500",
    MAJOR: "bg-yellow-500 hover:bg-yellow-500",
    MINOR: "bg-blue-500 hover:bg-blue-500",
  };
  return <Badge className={`${colorMap[type]} text-white`}>{type}</Badge>;
};

export const AlarmLogListWidget = ({ config }: Props) => {
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      // Jangan set loading jika bukan fetch pertama, agar tidak berkedip saat refresh
      if (status !== "ok") setStatus("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/api/alarm-log`);
        if (!response.ok) throw new Error("Failed to fetch alarm logs");
        const allLogs: AlarmLog[] = await response.json();
        setLogs(allLogs.slice(0, config.logLimit || 10)); // Terapkan limit
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchData();
    // Auto-refresh setiap 1 menit
    const intervalId = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [config.logLimit, status]); // Tambahkan status ke dependency array

  const renderTimeline = () => {
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-2">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      );
    }
    if (logs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No alarm logs found.</p>
        </div>
      );
    }

    return (
      <ul>
        {logs.map((log, index) => (
          <li key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full mt-1 ${
                  log.status === "ACTIVE"
                    ? "bg-red-500 ring-4 ring-red-200"
                    : "bg-green-500"
                }`}
              ></div>
              {index < logs.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-300"></div>
              )}
            </div>
            <div className="pb-6 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{log.alarmName}</p>
                <AlarmTypeBadge type={log.alarmType} />
              </div>
              <p className="text-xs text-muted-foreground">{log.deviceName}</p>
              <p className="text-xs mt-1">
                <span
                  className={`font-semibold ${
                    log.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {log.status}
                </span>
                {log.status === "CLEARED" && log.clearedAt
                  ? ` - ${formatDistanceToNow(new Date(log.clearedAt))} ago`
                  : ` - ${formatDistanceToNow(new Date(log.timestamp))} ago`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <div className="flex items-center text-sm font-semibold mb-2">
        <HardDrive className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.widgetTitle}</h3>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 no-drag">
        {renderTimeline()}
      </div>
    </div>
  );
};
