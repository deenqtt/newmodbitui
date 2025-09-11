"use client";

import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Loader2,
  Users,
  Wifi,
  Clock4,
  CheckCircle,
  XCircle,
  User,
  HardDrive,
  Fingerprint,
  Smile,
  CreditCard,
  Lock,
  RotateCw,
  Monitor, // Add Sliders icon
  Settings, // Add Settings icon\n  Monitor, // Add Monitor icon
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Interfaces
interface User {
  uid: number;
  name: string;
  privilege: number;
  user_id: string;
  devices: string[];
}

interface DeviceStatus {
  device_id: string;
  device_name: string;
  status: "online" | "offline";
  response_time_ms?: number;
  error?: string;
}

interface AttendanceRecord {
  status: "success" | "error";
  data: {
    timestamp: string;
    name: string;
    uid: number;
    device_name: string;
    deviceId: string;
    via: number;
    access_action: string;
    message: string;
  };
}

// --- Helper Functions
const getPrivilegeLabel = (privilege: number) => {
  switch (privilege) {
    case 0:
      return "User";
    case 1:
      return "Admin";
    case 2:
      return "Super Admin";
    default:
      return "Unknown";
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// --- Main Dashboard Component
export default function UnifiedDashboard() {
  const router = useRouter();
  const { isReady, connectionStatus, publish } = useMqtt();
  const { payloads } = useConnectivity([
    "accessControl/user/response",
    "accessControl/device/response",
  ]);

  const isConnected = connectionStatus === "Connected";

  const [users, setUsers] = useState<User[]>([]);
  const [isUsersRefreshing, setIsUsersRefreshing] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [deviceSummary, setDeviceSummary] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    success_rate: 0,
  });
  const [isDevicesRefreshing, setIsDevicesRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isAttendanceRefreshing, setIsAttendanceRefreshing] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const handleFetchUsers = useCallback(async () => {
    if (!isConnected) return;
    setIsUsersRefreshing(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "getData" })
    );
  }, [isConnected, publish]);

  // Handle MQTT responses using payloads from useConnectivity
  useEffect(() => {
    const userResponse = payloads["accessControl/user/response"];
    if (userResponse) {
      try {
        const payload = JSON.parse(userResponse);
        if (payload.status === "success" && payload.data?.unique_users) {
          setUsers(payload.data.unique_users);
        }
      } catch (e) {
        console.error("Failed to parse user MQTT message:", e);
      } finally {
        setIsUsersRefreshing(false);
      }
    }
  }, [payloads]);

  const handleTestConnection = useCallback(async () => {
    if (!isConnected) return;
    setIsDevicesRefreshing(true);
    const command = { command: "testConnection", data: { device_id: "all" } };
    await publish("accessControl/device/command", JSON.stringify(command));
  }, [isConnected, publish]);

  useEffect(() => {
    const deviceResponse = payloads["accessControl/device/response"];
    if (deviceResponse) {
      try {
        const payload = JSON.parse(deviceResponse);
        if (payload.status === "success" && payload.data?.devices) {
          setDeviceStatuses(payload.data.devices);
          setDeviceSummary(payload.data.summary);
        }
      } catch (e) {
        console.error("Failed to parse device MQTT message:", e);
      } finally {
        setIsDevicesRefreshing(false);
      }
    }
  }, [payloads]);

  // Initialize data fetching when MQTT is ready
  useEffect(() => {
    if (isReady && isConnected) {
      handleFetchUsers();
      handleTestConnection();
    }
  }, [isReady, isConnected, handleFetchUsers, handleTestConnection]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold">
            Unified Access Control Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              MQTT: {connectionStatus}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Enhanced Navigation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-blue-600" />
              </div>
              Quick Navigation
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Access key features and management tools
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200 "
                onClick={() => router.push("/access-control/device")}
              >
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <Wifi className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 mb-1">
                    Device Management
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Monitor & manage access control hardware
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {deviceSummary.online_devices}/{deviceSummary.total_devices}{" "}
                    Online
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200 "
                onClick={() => router.push("/access-control/user")}
              >
                <div className="p-3 bg-green-100 rounded-full mr-4">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 mb-1">
                    User Management
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Add, edit, and manage user access & biometrics
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {users.length} Registered Users
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200  "
                onClick={() => router.push("/access-control/configuration")}
              >
                <div className="p-3 bg-orange-100 rounded-full mr-4">
                  <Settings className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 mb-1">
                    System Configuration
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Network settings & system preferences
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Settings Panel
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200"
                onClick={() => router.push("/access-control/attendance")}
              >
                <div className="p-3 bg-purple-100 rounded-full mr-4">
                  <Clock4 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 mb-1">
                    Attendance Logs
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    View real-time access logs & reports
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {attendanceRecords.length} Recent Records
                  </Badge>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device Status Summary Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Online Devices
              </CardTitle>
              <div className="p-2 bg-green-100 text-green-500 rounded-full">
                <Wifi className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {deviceSummary.online_devices}
              </div>
              <p className="text-xs text-muted-foreground">
                {deviceSummary.success_rate.toFixed(1)}% Success Rate
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offline Devices
              </CardTitle>
              <div className="p-2 bg-red-100 text-red-500 rounded-full">
                <XCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {deviceSummary.offline_devices}
              </div>
              <p className="text-xs text-muted-foreground">
                {deviceSummary.total_devices - deviceSummary.online_devices}{" "}
                Failed
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <div className="p-2 bg-muted rounded-full">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{users.length}</div>
              <p className="text-xs text-muted-foreground">Unique Records</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Access Logs
              </CardTitle>
              <div className="p-2 bg-blue-100 text-blue-500 rounded-full">
                <Clock4 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {attendanceRecords.length}
              </div>
              <p className="text-xs text-muted-foreground">Recent Records</p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all registered users
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">{users.length}</div>
                  <div className="text-xs text-muted-foreground">
                    Total Users
                  </div>
                </div>
                <Button
                  onClick={handleFetchUsers}
                  disabled={!isConnected || isUsersRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isUsersRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Users
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isUsersRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Loading users...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-auto max-h-[500px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                      <TableHead>UID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Privilege</TableHead>
                      <TableHead>Devices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          {user.uid}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="bg-muted p-2 rounded-full">
                            {user.user_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPrivilegeLabel(user.privilege)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.devices.map((device, idx) => (
                              <Badge key={idx} variant="secondary">
                                <HardDrive className="h-3 w-3 mr-1" />
                                {device}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Status Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Device Status
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time connection status monitoring
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {deviceStatuses.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Devices
                  </div>
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={!isConnected || isDevicesRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isDevicesRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Test Connections
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isDevicesRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Checking connections...</p>
              </div>
            ) : deviceStatuses.length > 0 ? (
              <div className="overflow-auto max-h-[500px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceStatuses.map((device, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          {device.device_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                device.status === "online"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-destructive text-destructive-foreground"
                              }`}
                            >
                              {device.status === "online" ? (
                                <Wifi className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </div>
                            {device.device_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              device.status === "online"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {device.status === "online" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {device.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.status === "online" ? (
                            <span className="font-medium">
                              {device.response_time_ms?.toFixed(1)} ms
                            </span>
                          ) : (
                            <span className="text-destructive">
                              {device.error || "Connection failed"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No devices to display status for.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Log Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Clock4 className="h-5 w-5" />
                  Attendance Log
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time access event monitoring
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {attendanceRecords.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recent Logs
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isAttendanceRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Loading logs...</p>
              </div>
            ) : attendanceError ? (
              <div className="text-center py-12 text-red-500">
                <p>{attendanceError}</p>
              </div>
            ) : attendanceRecords.length > 0 ? (
              <div className="overflow-auto max-h-[400px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(record.data.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "success"
                                ? "default"
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
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {record.data.name}
                              </div>
                              {record.data.uid && (
                                <div className="text-xs text-muted-foreground">
                                  UID: {record.data.uid}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.data.device_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.data.deviceId}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {record.data.access_action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="text-sm truncate"
                            title={record.data.message}
                          >
                            {record.data.message}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock4 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance logs found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
