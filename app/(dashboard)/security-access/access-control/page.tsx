"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useSortableTable } from "@/hooks/use-sort-table";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUsersPage, setCurrentUsersPage] = useState(1);
  const [usersItemsPerPage, setUsersItemsPerPage] = useState(10);
  const [currentDevicesPage, setCurrentDevicesPage] = useState(1);
  const [devicesItemsPerPage, setDevicesItemsPerPage] = useState(10);
  const [currentAttendancePage, setCurrentAttendancePage] = useState(1);
  const [attendanceItemsPerPage, setAttendanceItemsPerPage] = useState(10);

  // Sorting hook for users table
  const { sorted: sortedUsers, sortKey, sortDirection, handleSort } = useSortableTable(
    useMemo(() => users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.uid.toString().includes(searchTerm) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm])
  );

  // Pagination calculations for users
  const { filteredUsers, totalUsersPages, paginatedUsers } = useMemo(() => {
    const filtered = sortedUsers;
    const total = Math.ceil(filtered.length / usersItemsPerPage);
    const startIndex = (currentUsersPage - 1) * usersItemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + usersItemsPerPage);
    return {
      filteredUsers: filtered,
      totalUsersPages: total,
      paginatedUsers: paginated,
    };
  }, [sortedUsers, currentUsersPage, usersItemsPerPage]);

  // Reset user page when filters change
  useEffect(() => {
    setCurrentUsersPage(1);
  }, [searchTerm, sortKey, sortDirection, usersItemsPerPage]);

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
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 space-y-8">
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
                  onClick={() =>
                    router.push("/security-access/access-control/device")
                  }
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
                      {deviceSummary.online_devices}/
                      {deviceSummary.total_devices} Online
                    </Badge>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200 "
                  onClick={() =>
                    router.push("/security-access/access-control/user")
                  }
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
                  onClick={() =>
                    router.push("/security-access/access-control/configuration")
                  }
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
                  onClick={() =>
                    router.push("/security-access/access-control/attendance")
                  }
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
            <Card className="shadow-md bg-card backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Online Devices</p>
                    <p className="text-3xl font-bold">
                      {deviceSummary.online_devices}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md bg-card backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Offline Devices</p>
                    <p className="text-3xl font-bold text-red-600">
                      {deviceSummary.offline_devices}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md bg-card backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">
                      {users.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md bg-card backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock4 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Access Logs</p>
                    <p className="text-3xl font-bold">
                      {attendanceRecords.length}
                    </p>
                  </div>
                </div>
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users by name, UID, or user ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Items per page:
                  </span>
                  <select
                    value={usersItemsPerPage}
                    onChange={(e) => setUsersItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {isUsersRefreshing ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p>Loading users...</p>
                </div>
              ) : users.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="border rounded-lg">
                    <UITable>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-20 cursor-pointer hover:bg-muted/70 select-none" onClick={() => handleSort('uid')}>
                            <div className="flex items-center gap-2">
                              <span>UID</span>
                              {!sortKey || sortKey !== 'uid' ? (
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              ) : sortDirection === 'asc' ? (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                                </svg>
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/70 select-none" onClick={() => handleSort('name')}>
                            <div className="flex items-center gap-2">
                              <span>Name</span>
                              {!sortKey || sortKey !== 'name' ? (
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              ) : sortDirection === 'asc' ? (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                                </svg>
                              )}
                            </div>
                          </TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Privilege</TableHead>
                          <TableHead>Devices</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user, index) => (
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
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found.</p>
                </div>
              )}

              {/* Pagination for Users */}
              {totalUsersPages > 1 && (
                <div className="flex items-center justify-between border-t border-border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {Math.min((currentUsersPage - 1) * usersItemsPerPage + 1, filteredUsers.length)} to{" "}
                      {Math.min(currentUsersPage * usersItemsPerPage, filteredUsers.length)} of{" "}
                      {filteredUsers.length} results
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUsersPage(currentUsersPage - 1)}
                      disabled={currentUsersPage === 1}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalUsersPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalUsersPages - 4, currentUsersPage - 2)) + i;
                        if (page > totalUsersPages) return null;
                        return (
                          <Button
                            key={page}
                            variant={page === currentUsersPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentUsersPage(page)}
                            className="min-w-9"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUsersPage(currentUsersPage + 1)}
                      disabled={currentUsersPage === totalUsersPages}
                    >
                      Next
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
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
      </div>
    </SidebarInset>
  );
}
