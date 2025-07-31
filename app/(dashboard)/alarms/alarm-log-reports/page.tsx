// File: app/(dashboard)/alarms/alarm-log/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";

import { format } from "date-fns"; // <-- PATH IMPOR DIPERBAIKI DI SINI
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ChevronLeft, ChevronRight, BellRing } from "lucide-react";

// --- Type Definitions ---
type AlarmLog = {
  id: string;
  deviceName: string;
  alarmName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
  timestamp: string;
};

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// =================================================================
// Main Page Component
// =================================================================
export default function AlarmLogPage() {
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alarm-log");
      if (!response.ok) throw new Error("Failed to fetch alarm logs");
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Could not fetch alarm logs." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteAll = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete ALL alarm logs!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete all!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch("/api/alarm-log", { method: "DELETE" });
          if (!response.ok) throw new Error("Failed to delete logs.");
          Toast.fire({
            icon: "success",
            title: "All alarm logs have been deleted.",
          });
          setLogs([]); // Kosongkan data di frontend
        } catch (error: any) {
          Toast.fire({ icon: "error", title: error.message });
        }
      }
    });
  };

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return logs.slice(startIndex, startIndex + itemsPerPage);
  }, [logs, currentPage]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  const getStatusVariant = (status: AlarmLog["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "destructive";
      case "CLEARED":
        return "success";
      case "ACKNOWLEDGED":
        return "default";
      default:
        return "secondary";
    }
  };

  const getTypeVariant = (type: AlarmLog["alarmType"]) => {
    switch (type) {
      case "CRITICAL":
        return "destructive";
      case "MAJOR":
        return "warning";
      case "MINOR":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            System Alarm Logs
          </h1>
          <p className="text-muted-foreground">
            A historical record of all triggered alarm events.
          </p>
        </div>
        <Button
          onClick={handleDeleteAll}
          variant="destructive"
          className="w-full sm:w-auto"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete All Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alarm History</CardTitle>
          <CardDescription>
            Showing the {logs.length} most recent alarm events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Alarm Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.deviceName}
                      </TableCell>
                      <TableCell>{log.alarmName}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeVariant(log.alarmType)}>
                          {log.alarmType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(log.timestamp),
                          "dd MMM yyyy, HH:mm:ss"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No alarm logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
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
