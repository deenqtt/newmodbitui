"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Clock, CheckCircle, XCircle, List } from "lucide-react";
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
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-500/10 dark:bg-sky-400/10">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Live Attendance</h1>
              <p className="text-xs text-muted-foreground">
                Real-time monitoring of access events
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span>{connectionStatus}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Access Log
              <Badge variant="outline" className="ml-2">
                Total: {attendanceRecords.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reversedRecords.length > 0 ? (
                    reversedRecords.map((record, index) => (
                      // FIX: Use a unique key to ensure proper rendering and avoid bugs.
                      <TableRow
                        key={`${record.timestamp}-${
                          record.uid || "null"
                        }-${index}`}
                        className="[&:not(:last-child)]:border-b"
                      >
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "success"
                                ? "success"
                                : "destructive"
                            }
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
                          {record.uid ? (
                            record.uid
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>
                          {ACCESS_VIA[record.via] || "Unknown"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.deviceName}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {moment(record.timestamp).fromNow()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No real-time attendance data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
