"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarInset } from "@/components/ui/sidebar";
import {
  Clock,
  CheckCircle,
  XCircle,
  List,
  ArrowLeft,
  Activity,
  Calendar,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";

// --- Interfaces
interface AttendanceRecord {
  timestamp: string;
  deviceId: string;
  deviceName: string;
  status: "success" | "failed";
  uid: string | null;
  name: string;
  via: number;
  message: string;
}

// Map verify_code to human-readable strings
const ACCESS_VIA: { [key: number]: string } = {
  1: "Fingerprint",
  2: "Password",
  3: "PIN",
  4: "Card",
  5: "Face",
  6: "System Software",
};

// --- Main Component
export default function LiveAttendance() {
  const router = useRouter();
  const attendanceTopic = "accessControl/attendance/live";

  const { connectionStatus } = useMqtt();
  const { payloads } = useConnectivity([attendanceTopic]);
  const isConnected = connectionStatus === "Connected";

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  // Memoize the attendance list to prevent re-rendering on every payload
  const reversedRecords = useMemo(
    () => [...attendanceRecords].reverse(),
    [attendanceRecords]
  );

  // MQTT Payload Handler
  const handleAttendanceMessage = useCallback((message: string) => {
    try {
      const parsedPayload = JSON.parse(message);
      if (parsedPayload.event_type === "realtime_access") {
        const record: AttendanceRecord = {
          timestamp: parsedPayload.data.timestamp,
          deviceId: parsedPayload.data.deviceId,
          deviceName: parsedPayload.data.device_name,
          status: parsedPayload.status,
          uid: parsedPayload.data.uid,
          name: parsedPayload.data.name,
          via: parsedPayload.data.via,
          message: parsedPayload.data.message,
        };
        setAttendanceRecords((prevRecords) => [record, ...prevRecords]);
      }
    } catch (e) {
      console.error("Failed to parse attendance payload:", e);
    }
  }, []);

  // Use useEffect to process new payloads safely
  useEffect(() => {
    if (payloads && payloads[attendanceTopic]) {
      const payload = payloads[attendanceTopic];
      handleAttendanceMessage(payload);
    }
  }, [payloads, handleAttendanceMessage, attendanceTopic]);

  return (
    <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4 md:p-6 ">
          {/* Header Section with Back Button */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {/* Connection Status */}
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-slate-800 shadow-sm">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>{connectionStatus}</span>
              </div>
            </div>

            {/* Page Title & Description */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Live Attendance
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Real-time monitoring of access events across all devices
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <List className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Events
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {attendanceRecords.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Successful
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {
                          attendanceRecords.filter(
                            (r) => r.status === "success"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Failed
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {
                          attendanceRecords.filter((r) => r.status === "failed")
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Access Events Log
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-white dark:bg-slate-800 shadow-sm"
                >
                  Live Updates
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        User ID
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Method
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Message
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Device
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        Timestamp
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reversedRecords.length > 0 ? (
                      reversedRecords.map((record, index) => (
                        <TableRow
                          key={`${record.timestamp}-${
                            record.uid || "null"
                          }-${index}`}
                          className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "success"
                                  ? "default"
                                  : "destructive"
                              }
                              className="font-medium shadow-sm"
                            >
                              {record.status === "success" ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md w-fit">
                              {record.uid || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-500" />
                              {record.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-white dark:bg-slate-800"
                            >
                              {ACCESS_VIA[record.via] || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="truncate" title={record.message}>
                              {record.message}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              {record.deviceName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-slate-600 dark:text-slate-400 font-mono text-sm">
                            <div className="flex flex-col items-end gap-1">
                              <span>
                                {moment(record.timestamp).format("HH:mm:ss")}
                              </span>
                              <span className="text-xs opacity-70">
                                {moment(record.timestamp).format("DD/MM/YY")}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-16 text-slate-500 dark:text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Clock className="h-12 w-12 opacity-30" />
                            <div>
                              <p className="font-medium">
                                No attendance data yet
                              </p>
                              <p className="text-sm opacity-70">
                                Waiting for real-time access events...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
