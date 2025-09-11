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
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  List,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Router,
  Settings,
  Info,
  Clock,
  HardDrive,
  Cpu,
  Users,
  Fingerprint,
  Activity,
} from "lucide-react";

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
  const { isReady, connectionStatus, publish } = useMqtt();

  // FIXED: Declare the topics BEFORE using them
  const requestTopic = "accessControl/device/command";
  const responseTopic = "accessControl/device/response";

  // Now we can use responseTopic in useConnectivity
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

  // Deklarasikan handleListDevices terlebih dahulu
  const handleListDevices = useCallback(async () => {
    if (!isConnected) return;
    setIsRefreshing(true);
    const command = { command: "listDevices" };
    await publish(requestTopic, JSON.stringify(command));
  }, [isConnected, publish, requestTopic]);

  // Kemudian, deklarasikan handleResponse yang memiliki dependensi pada handleListDevices
  const handleResponse = useCallback(
    (topic: string, message: string) => {
      try {
        const payload: MqttResponsePayload = JSON.parse(message);
        if (payload.status === "success") {
          if (payload.data && payload.data.devices) {
            setDevices(payload.data.devices);
          } else if (payload.data && payload.data.device_info) {
            // Handle device info response
            setSelectedDeviceInfo(payload.data.device_info);
            setIsInfoDialogOpen(true);
          } else if (payload.device || payload.deleted_device) {
            // Re-fetch the list to show the latest changes
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
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 dark:bg-blue-400/10">
              <Router className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Device Management</h1>
              <p className="text-xs text-muted-foreground">
                Manage ZKTeco access control devices
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleListDevices}
            disabled={!isConnected || isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <List className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Device Registry</h3>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Manage all ZKTeco access control devices in your network
                  </div>
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog} size="sm" variant="default">
                    <Plus className="mr-2 h-4 w-4" /> Add Device
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {dialogMode === "add"
                        ? "Add New Device"
                        : "Update Device"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label htmlFor="id">ID</Label>
                      <Input
                        id="id"
                        value={formData.id || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, id: e.target.value })
                        }
                        disabled={dialogMode === "update"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="ip">IP Address</Label>
                      <Input
                        id="ip"
                        value={formData.ip || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, ip: e.target.value })
                        }
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
                      {dialogMode === "add" ? "Add" : "Update"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {isRefreshing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">
                  Loading devices...
                </p>
              </div>
            ) : devices.length > 0 ? (
              <div className="overflow-hidden">
                <UITable>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow
                        key={device.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {device.id}
                        </TableCell>
                        <TableCell>{device.name}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            {device.ip}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              device.enabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }`}
                          >
                            {device.enabled ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {device.enabled ? "Active" : "Inactive"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGetDeviceInfo(device.id)}
                              disabled={isLoadingInfo}
                              className="h-8 w-8 p-0"
                              title="Get Device Info"
                            >
                              {isLoadingInfo ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Info className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUpdateDialog(device)}
                              className="h-8 w-8 p-0"
                              title="Edit Device"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDeviceId(device.id)}
                                  className="h-8 w-8 p-0"
                                  title="Delete Device"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the device.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteDevice}
                                  >
                                    Continue
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
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-muted">
                    <Router className="h-8 w-8 opacity-50" />
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-1">
                  No devices registered
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Add Device" to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Info Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Device Information
            </DialogTitle>
          </DialogHeader>
          {selectedDeviceInfo && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Device Details</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-mono">
                        {selectedDeviceInfo.device_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firmware:</span>
                      <span className="font-mono">
                        {selectedDeviceInfo.firmware_version || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform:</span>
                      <span className="font-mono">
                        {selectedDeviceInfo.platform || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="font-mono">
                        {selectedDeviceInfo.serial_number || "N/A"}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">System Status</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Device Time:
                      </span>
                      <span className="font-mono">
                        {selectedDeviceInfo.device_time
                          ? new Date(
                              selectedDeviceInfo.device_time
                            ).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Usage Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">
                    {selectedDeviceInfo.user_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </Card>

                <Card className="p-4 text-center">
                  <Fingerprint className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">
                    {selectedDeviceInfo.fingerprint_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fingerprints
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">
                    {selectedDeviceInfo.attendance_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Records</div>
                </Card>
              </div>

              {/* Capacity Information */}
              {selectedDeviceInfo.capacity && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Device Capacity</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-500">
                        {selectedDeviceInfo.capacity.users || "N/A"}
                      </div>
                      <div className="text-muted-foreground">Max Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-500">
                        {selectedDeviceInfo.capacity.fingerprints || "N/A"}
                      </div>
                      <div className="text-muted-foreground">
                        Max Fingerprints
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-500">
                        {selectedDeviceInfo.capacity.records || "N/A"}
                      </div>
                      <div className="text-muted-foreground">Max Records</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
