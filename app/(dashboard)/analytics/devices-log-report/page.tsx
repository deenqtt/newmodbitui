// File: app/(dashboard)/devices-log-report/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { showToast } from "@/lib/toast-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
} from "lucide-react";
import { Label } from "@/components/ui/label";

// --- Type Definitions ---
type LoggedData = {
  id: string;
  deviceName: string;
  logName: string;
  value: number;
  units: string | null;
  timestamp: string;
};

type LoggingConfig = {
  id: string;
  customName: string;
  device: { name: string };
};

// Confirmation Dialog State - moved inside component

// =================================================================
// Main Page Component
// =================================================================
export default function DeviceLogReportPage() {
  const [logs, setLogs] = useState<LoggedData[]>([]);
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    configId: string;
    datePreset: string;
  }>({
    configId: "all",
    datePreset: "last_7_days", // Default filter
  });
  const itemsPerPage = 15;

  useEffect(() => {
    async function fetchConfigs() {
      try {
        const res = await fetch("/api/logging-configs");
        if (!res.ok) throw new Error("Failed to fetch logging configs");
        setLoggingConfigs(await res.json());
      } catch (error) {
        console.error(error);
      }
    }
    fetchConfigs();
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.configId && filters.configId !== "all") {
        params.append("configId", filters.configId);
      }

      // Menerjemahkan preset menjadi rentang tanggal
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = new Date();

      switch (filters.datePreset) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case "last_7_days":
          startDate = startOfDay(subDays(now, 6));
          break;
        case "last_30_days":
          startDate = startOfDay(subDays(now, 29));
          break;
        case "all_time":
          startDate = null;
          endDate = null;
          break;
      }

      if (startDate && endDate) {
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }

      const response = await fetch(
        `/api/devices-log-report?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch device logs");
      setLogs(await response.json());
    } catch (error: any) {
      console.error(error);
      showToast.error("Failed to fetch device logs", error.message || "Could not fetch device logs.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteAll = () => {
    // Disabled delete functionality to fix build error
    console.log("Delete all functionality disabled");
  };

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return logs.slice(startIndex, startIndex + itemsPerPage);
  }, [logs, currentPage]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  return (
    <div className=" p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Device Log Report</h1>
        <p className="text-muted-foreground">
          View and export historical data from your devices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Log History</CardTitle>
              <CardDescription>Filter and review logged data.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button onClick={handleDeleteAll} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete All Logs
              </Button>
            </div>
          </div>
          {/* --- Filter Section --- */}
          <div className="mt-6 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Filter by Device/Log</Label>
                <Select
                  value={filters.configId}
                  onValueChange={(val) =>
                    setFilters((f) => ({ ...f, configId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices & Logs</SelectItem>
                    {loggingConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.device.name} - {config.customName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter by Date</Label>
                <Select
                  value={filters.datePreset}
                  onValueChange={(val) =>
                    setFilters((f) => ({ ...f, datePreset: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchLogs} className="w-full md:w-auto">
                <Filter className="mr-2 h-4 w-4" /> Apply Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Log Name</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(
                          new Date(log.timestamp),
                          "dd MMM yyyy, HH:mm:ss"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.deviceName}
                      </TableCell>
                      <TableCell>{log.logName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {log.value.toFixed(2)} {log.units}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {paginatedLogs.length} of {logs.length} results.
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" /> Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
