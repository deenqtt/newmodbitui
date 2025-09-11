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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SidebarInset } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Router,
  Info,
  HardDrive,
  Cpu,
  Users,
  Fingerprint,
  Activity,
  ArrowLeft,
  Network,
  Wifi,
  Clock,
  RefreshCw,
  Monitor,
  Server,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Interfaces
interface Device {
  id: string;
  name: string;
  ip: string;
  port?: number;
  password?: number;
  timeout?: number;
  force_udp?: boolean;
  enabled?: boolean;
}

interface DeviceInfo {
  firmware_version?: string;
  device_name?: string;
  serial_number?: string;
  platform?: string;
  device_time?: string;
  user_count?: number;
  attendance_count?: number;
  fingerprint_count?: number;
  capacity?: {
    users?: number;
    fingerprints?: number;
    records?: number;
  };
}

interface MqttResponsePayload {
  status: "success" | "error";
  message: string;
  data?: {
    devices?: Device[];
    total_devices?: number;
    device_info?: DeviceInfo;
    device_id?: string;
    device_name?: string;
  };
  device?: Device;
  deleted_device?: Device;
}

// --- Main Component
export default function DeviceManagement() {
  const router = useRouter();
  const { isReady, connectionStatus, publish } = useMqtt();

  const requestTopic = "accessControl/device/command";
  const responseTopic = "accessControl/device/response";

  const { payloads } = useConnectivity([responseTopic]);

  const isConnected = connectionStatus === "Connected";
  const [devices, setDevices] = useState<Device[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<Partial<Device>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "update">("add");
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [selectedDeviceInfo, setSelectedDeviceInfo] =
    useState<DeviceInfo | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const handleListDevices = useCallback(async () => {
    if (!isConnected) return;
    setIsRefreshing(true);
    const command = { command: "listDevices" };
    await publish(requestTopic, JSON.stringify(command));
  }, [isConnected, publish, requestTopic]);

  const handleResponse = useCallback(
    (topic: string, message: string) => {
      try {
        const payload: MqttResponsePayload = JSON.parse(message);
        if (payload.status === "success") {
          if (payload.data && payload.data.devices) {
            setDevices(payload.data.devices);
          } else if (payload.data && payload.data.device_info) {
            setSelectedDeviceInfo(payload.data.device_info);
            setIsInfoDialogOpen(true);
          } else if (payload.device || payload.deleted_device) {
            handleListDevices();
          }
        } else {
          console.error("MQTT Error:", payload.message);
          alert(`Error: ${payload.message}`);
        }
      } catch (e) {
        console.error("Failed to parse MQTT message:", e);
      } finally {
        setIsRefreshing(false);
        setIsDialogOpen(false);
        setDeleteDeviceId(null);
        setIsLoadingInfo(false);
      }
    },
    [handleListDevices]
  );

  const handleAddDevice = async () => {
    if (!formData.id || !formData.name || !formData.ip) {
      alert("ID, Name, and IP are required.");
      return;
    }
    const command = {
      command: "addDevice",
      data: formData,
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleUpdateDevice = async () => {
    if (!formData.id) {
      alert("Device ID is required for update.");
      return;
    }
    const command = {
      command: "updateDevice",
      data: {
        device_id: formData.id,
        ...formData,
      },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleDeleteDevice = async () => {
    if (!deleteDeviceId) return;
    const command = {
      command: "deleteDevice",
      data: {
        device_id: deleteDeviceId,
      },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setFormData({});
    setIsDialogOpen(true);
  };

  const openUpdateDialog = (device: Device) => {
    setDialogMode("update");
    setFormData(device);
    setIsDialogOpen(true);
  };

  const handleGetDeviceInfo = async (deviceId: string) => {
    if (!isConnected) return;
    setIsLoadingInfo(true);
    const command = {
      command: "getDeviceInfo",
      data: { device_id: deviceId },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  // Handle MQTT responses using payloads from useConnectivity
  useEffect(() => {
    const response = payloads[responseTopic];
    if (response) {
      handleResponse(responseTopic, response);
    }
  }, [payloads, responseTopic, handleResponse]);

  // Initialize data fetching when MQTT is ready
  useEffect(() => {
    if (isReady && isConnected) {
      handleListDevices();
    }
  }, [isReady, isConnected, handleListDevices]);

  return (
    <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4 md:p-6">
          {/* Header Section */}
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

              {/* Connection Status & Refresh */}
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-slate-800 shadow-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span>{connectionStatus}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleListDevices}
                  disabled={!isConnected || isRefreshing}
                  size="sm"
                >
                  {isRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>

            {/* Page Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <Router className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Device Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Manage ZKTeco access control devices in your network
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Devices
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {devices.length}
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
                        Active Devices
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {devices.filter((d) => d.enabled).length}
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
                        Inactive Devices
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {devices.filter((d) => !d.enabled).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Network Status
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {Math.round(
                          (devices.filter((d) => d.enabled).length /
                            Math.max(devices.length, 1)) *
                            100
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Device Registry Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Device Registry</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Manage all ZKTeco access control devices in your network
                    </p>
                  </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={openAddDialog}
                      className="whitespace-nowrap"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {dialogMode === "add"
                          ? "Add New Device"
                          : "Update Device"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="id" className="text-sm font-medium">
                          Device ID
                        </Label>
                        <Input
                          id="id"
                          placeholder="e.g., device_001"
                          value={formData.id || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, id: e.target.value })
                          }
                          disabled={dialogMode === "update"}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          Device Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g., Main Entrance"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ip" className="text-sm font-medium">
                          IP Address
                        </Label>
                        <Input
                          id="ip"
                          placeholder="e.g., 192.168.1.100"
                          value={formData.ip || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, ip: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={
                          dialogMode === "add"
                            ? handleAddDevice
                            : handleUpdateDevice
                        }
                      >
                        {dialogMode === "add" ? "Add Device" : "Update Device"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                    Loading devices...
                  </p>
                </div>
              ) : devices.length > 0 ? (
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Device ID
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Device Name
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          IP Address
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Status
                        </TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => (
                        <TableRow
                          key={device.id}
                          className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <HardDrive className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <span className="font-mono text-sm">
                                {device.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {device.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Wifi className="h-4 w-4 text-slate-500" />
                              <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                {device.ip}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                device.enabled ? "default" : "destructive"
                              }
                              className="font-medium shadow-sm"
                            >
                              {device.enabled ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {device.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGetDeviceInfo(device.id)}
                                disabled={isLoadingInfo}
                                className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Get Device Info"
                              >
                                {isLoadingInfo ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Info className="h-4 w-4 text-blue-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUpdateDialog(device)}
                                className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                                title="Edit Device"
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteDeviceId(device.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Delete Device"
                                  >
                                    <Trash className="h-4 w-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Device
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete device "
                                      {device.name}"? This action cannot be
                                      undone and will remove the device from
                                      your network.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteDevice}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete Device
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                      <Router className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                        No devices registered
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Get started by adding your first ZKTeco device to the
                        network
                      </p>
                      <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Device
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Device Info Dialog */}
        <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-600" />
                Device Information
                {selectedDeviceInfo?.device_name && (
                  <Badge variant="outline">
                    {selectedDeviceInfo.device_name}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedDeviceInfo && (
              <div className="space-y-6">
                {/* Device Details Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        System Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Device Name:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDeviceInfo.device_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Firmware:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDeviceInfo.firmware_version || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Platform:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDeviceInfo.platform || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Serial Number:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDeviceInfo.serial_number || "N/A"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-green-600" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Device Time:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDeviceInfo.device_time
                            ? new Date(
                                selectedDeviceInfo.device_time
                              ).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Status:
                        </span>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-slate-200 dark:border-slate-700 text-center">
                    <CardContent className="p-6">
                      <Users className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedDeviceInfo.user_count || 0}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Registered Users
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-700 text-center">
                    <CardContent className="p-6">
                      <Fingerprint className="h-8 w-8 mx-auto mb-3 text-green-500" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedDeviceInfo.fingerprint_count || 0}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Fingerprint Templates
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-700 text-center">
                    <CardContent className="p-6">
                      <Activity className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedDeviceInfo.attendance_count || 0}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Attendance Records
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Capacity Information */}
                {selectedDeviceInfo.capacity && (
                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-orange-600" />
                        Device Capacity Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {selectedDeviceInfo.capacity.users || "N/A"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Maximum Users
                          </div>
                          {selectedDeviceInfo.capacity.users &&
                            selectedDeviceInfo.user_count && (
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      (selectedDeviceInfo.user_count /
                                        selectedDeviceInfo.capacity.users) *
                                        100,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            )}
                        </div>

                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {selectedDeviceInfo.capacity.fingerprints || "N/A"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Maximum Fingerprints
                          </div>
                          {selectedDeviceInfo.capacity.fingerprints &&
                            selectedDeviceInfo.fingerprint_count && (
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      (selectedDeviceInfo.fingerprint_count /
                                        selectedDeviceInfo.capacity
                                          .fingerprints) *
                                        100,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            )}
                        </div>

                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {selectedDeviceInfo.capacity.records || "N/A"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Maximum Records
                          </div>
                          {selectedDeviceInfo.capacity.records &&
                            selectedDeviceInfo.attendance_count && (
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      (selectedDeviceInfo.attendance_count /
                                        selectedDeviceInfo.capacity.records) *
                                        100,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}
