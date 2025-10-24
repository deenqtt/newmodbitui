"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Server,
  HardDrive,
  Plus,
  Edit,
  Trash2,
  Database,
  Activity,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  X,
  ShieldCheck,
} from "lucide-react";

interface RackDevice {
  id: string;
  rackId: string;
  deviceId: string;
  positionU: number;
  sizeU: number;
  deviceType: "SERVER" | "SWITCH" | "STORAGE" | "PDU" | "SENSOR";
  status: "PLANNED" | "INSTALLED" | "MAINTENANCE" | "REMOVED";
  createdAt: string;
  updatedAt: string;
  device: {
    id: string;
    uniqId: string;
    name: string;
    topic: string;
    address: string | null;
    lastPayload: any;
    lastUpdatedByMqtt: string | null;
  };
}

interface Rack {
  id: string;
  name: string;
  capacityU: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  usedU: number;
  availableU: number;
  utilizationPercent: number;
  devices: RackDevice[];
}

interface DeviceOption {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rackId = params.id as string;

  const [rack, setRack] = useState<Rack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<DeviceOption[]>([]);
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false);
  const [isEditDeviceDialogOpen, setIsEditDeviceDialogOpen] = useState(false);
  const [isRemoveDeviceDialogOpen, setIsRemoveDeviceDialogOpen] = useState(false);
  const [selectedRackDevice, setSelectedRackDevice] = useState<RackDevice | null>(null);
  const [deviceForm, setDeviceForm] = useState<{
    deviceId: string;
    positionU: number;
    sizeU: number;
    deviceType: "SERVER" | "SWITCH" | "STORAGE" | "PDU" | "SENSOR";
    status: "PLANNED" | "INSTALLED" | "MAINTENANCE" | "REMOVED";
  }>({
    deviceId: "",
    positionU: 1,
    sizeU: 1,
    deviceType: "SERVER",
    status: "PLANNED",
  });
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [isReverseLayout, setIsReverseLayout] = useState(true); // Default to true (bottom-up: 1 at bottom)

  const { toast } = useToast();

  // Fetch rack details
  const fetchRackDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/racks/${rackId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rack details");
      }
      const data = await response.json();
      setRack(data);
    } catch (error) {
      console.error("Error fetching rack details:", error);
      toast({
        title: "Error",
        description: "Failed to load rack details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available devices (not assigned to any rack)
  const fetchAvailableDevices = async () => {
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devices = await response.json();

      // Filter devices that are not already assigned to this rack
      const assignedDeviceIds = new Set(rack?.devices.map(rd => rd.deviceId) || []);
      const available = devices.filter((device: DeviceOption) => !assignedDeviceIds.has(device.uniqId));

      setAvailableDevices(available);
    } catch (error) {
      console.error("Error fetching available devices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available devices",
        variant: "destructive",
      });
    }
  };

  // Check if position is available for new device
  // Note: Sensor devices don't occupy physical rack space, so they don't conflict with positions
  const isPositionAvailable = (positionU: number, sizeU: number, excludeDeviceId?: string): boolean => {
    if (!rack) return false;

    // Calculate the range this device would occupy
    const startU = positionU;
    const endU = positionU + sizeU - 1;

    // Check if any existing NON-SENSOR device conflicts with this range
    // Sensor devices don't occupy physical space, so they don't cause position conflicts
    for (const device of rack.devices) {
      // Skip the device we're editing (if any)
      if (excludeDeviceId && device.deviceId === excludeDeviceId) continue;

      // Skip sensor devices as they don't occupy physical rack space
      if (device.deviceType === "SENSOR") continue;

      const deviceStartU = device.positionU;
      const deviceEndU = device.positionU + device.sizeU - 1;

      // Check for overlap
      if (startU <= deviceEndU && endU >= deviceStartU) {
        return false;
      }
    }

    return true;
  };

  // Add device to rack
  const handleAddDevice = async () => {
    if (!deviceForm.deviceId) {
      toast({
        title: "Validation Error",
        description: "Please select a device",
        variant: "destructive",
      });
      return;
    }

    // For sensor devices, set default values for size and position
    const formData = { ...deviceForm };
    if (deviceForm.deviceType === "SENSOR") {
      formData.sizeU = 1; // Default size for sensors
      formData.positionU = 1; // Default position for sensors
    }

    // Frontend validation for position availability (only for non-sensor devices)
    if (deviceForm.deviceType !== "SENSOR" && !isPositionAvailable(formData.positionU, formData.sizeU)) {
      toast({
        title: "Position Conflict",
        description: `Position ${formData.positionU} to ${formData.positionU + formData.sizeU - 1}U is already occupied by another device`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/racks/${rackId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      toast({
        title: "Success",
        description: "Device added to rack successfully",
      });

      setIsAddDeviceDialogOpen(false);
      resetDeviceForm();
      fetchRackDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add device to rack",
        variant: "destructive",
      });
    }
  };

  // Edit device
  const handleEditDevice = (rackDevice: RackDevice) => {
    setSelectedRackDevice(rackDevice);
    setDeviceForm({
      deviceId: rackDevice.deviceId,
      positionU: rackDevice.positionU,
      sizeU: rackDevice.sizeU,
      deviceType: rackDevice.deviceType,
      status: rackDevice.status,
    });
    setIsEditDeviceDialogOpen(true);
  };

  // Remove device
  const handleRemoveDevice = (rackDevice: RackDevice) => {
    setSelectedRackDevice(rackDevice);
    setIsRemoveDeviceDialogOpen(true);
  };

  // Update device
  const handleUpdateDevice = async () => {
    if (!selectedRackDevice) return;

    // Frontend validation for position availability (exclude current device)
    // Skip position validation for sensor devices as they don't occupy physical space
    if (selectedRackDevice.deviceType !== "SENSOR" && !isPositionAvailable(deviceForm.positionU, deviceForm.sizeU, selectedRackDevice.deviceId)) {
      toast({
        title: "Position Conflict",
        description: `Position ${deviceForm.positionU} to ${deviceForm.positionU + deviceForm.sizeU - 1}U is already occupied by another device`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/racks/${rackId}/devices/${selectedRackDevice.deviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      toast({
        title: "Success",
        description: "Device updated successfully",
      });

      setIsEditDeviceDialogOpen(false);
      setSelectedRackDevice(null);
      resetDeviceForm();
      fetchRackDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update device",
        variant: "destructive",
      });
    }
  };

  // Confirm remove device
  const handleConfirmRemoveDevice = async () => {
    if (!selectedRackDevice) return;

    try {
      const response = await fetch(`/api/racks/${rackId}/devices/${selectedRackDevice.deviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      toast({
        title: "Success",
        description: "Device removed from rack successfully",
      });

      setIsRemoveDeviceDialogOpen(false);
      setSelectedRackDevice(null);
      fetchRackDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove device",
        variant: "destructive",
      });
    }
  };

  // Reset device form
  const resetDeviceForm = () => {
    setDeviceForm({
      deviceId: "",
      positionU: 1,
      sizeU: 1,
      deviceType: "SERVER",
      status: "PLANNED",
    });
  };

  // Get status color - Dark mode compatible
  const getStatusColor = (status: string) => {
    switch (status) {
      case "INSTALLED":
        return "text-green-600 bg-green-100 border-green-300 dark:text-green-200 dark:bg-green-900/20 dark:border-green-500";
      case "PLANNED":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800";
      case "MAINTENANCE":
        return "text-orange-600 bg-orange-100 border-orange-300 dark:text-orange-200 dark:bg-orange-900/20 dark:border-orange-500";
      case "REMOVED":
        return "text-red-600 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/20 dark:border-red-500";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "INSTALLED":
        return <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "PLANNED":
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "MAINTENANCE":
        return <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case "REMOVED":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Toggle rack layout view (normal/reverse)
  const toggleRackLayout = () => {
    setIsReverseLayout(!isReverseLayout);
  };

  // Generate rack layout visualization with bottom-up positioning and search filtering
  // Only show non-sensor devices in rack layout - sensors don't occupy physical rack space
  const generateRackLayout = (): Array<{
    u: number;
    device: RackDevice | undefined;
    isOccupied: boolean;
    isDeviceStart: boolean;
    isDeviceContinuation: boolean;
  }> => {
    if (!rack) return [];

    const layout: Array<{
      u: number;
      device: RackDevice | undefined;
      isOccupied: boolean;
      isDeviceStart: boolean;
      isDeviceContinuation: boolean;
    }> = [];
    const deviceMap = new Map<number, RackDevice>();
    const deviceStartPositions = new Map<string, number>(); // Track where each device starts

    // Filter devices: exclude ALL sensors from rack layout (they don't occupy physical space)
    let filteredDevices = rack.devices.filter(device => device.deviceType !== "SENSOR");

    // Note: Search functionality is now only for device list, not rack layout
    // Rack layout shows all devices regardless of search query

    // Map devices by their bottom position (positionU represents bottom of device)
    filteredDevices.forEach(device => {
      const startPos = device.positionU;
      deviceStartPositions.set(device.deviceId, startPos);

      // Calculate the actual rack units occupied by this device
      // positionU is the bottom position, device occupies positionU to positionU + sizeU - 1
      for (let u = startPos; u < startPos + device.sizeU; u++) {
        deviceMap.set(u, device);
      }
    });

    // Generate U positions - support reverse layout
    const positions = isReverseLayout
      ? Array.from({ length: rack.capacityU }, (_, i) => rack.capacityU - i) // 42, 41, 40, ..., 1
      : Array.from({ length: rack.capacityU }, (_, i) => i + 1); // 1, 2, 3, ..., 42

    positions.forEach(u => {
      const device = deviceMap.get(u);
      const isDeviceStart = device && deviceStartPositions.get(device.deviceId) === u;
      const isDeviceContinuation = device && deviceStartPositions.get(device.deviceId) !== u;

      layout.push({
        u,
        device,
        isOccupied: !!device,
        isDeviceStart: !!isDeviceStart,
        isDeviceContinuation: !!isDeviceContinuation,
      });
    });

    return layout;
  };

  useEffect(() => {
    if (rackId) {
      fetchRackDetails();
    }
  }, [rackId]);

  useEffect(() => {
    if (rack) {
      fetchAvailableDevices();
    }
  }, [rack]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Server className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Loading rack details...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!rack) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Rack not found</h3>
            <Button onClick={() => router.push("/racks")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Racks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rackLayout = generateRackLayout();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push("/racks")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Racks
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {rack.name}
            </h1>
            <p className="text-muted-foreground">
              Rack Layout & Device Management
            </p>
          </div>
        </div>

        {/* Rack Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Server className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                  <p className="text-2xl font-bold">{rack.capacityU}U</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <HardDrive className="h-6 w-6 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Used</p>
                  <p className="text-2xl font-bold">{rack.usedU}U</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{rack.availableU}U</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-6 w-6 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Devices</p>
                  <p className="text-2xl font-bold">{rack.devices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rack Layout Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Rack Layout</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Server className="h-4 w-4" />
                    <span className="font-medium">Rack Layout Guide:</span>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• <strong>Rack Position</strong>: Bottom position of device (1 = bottom, {rack.capacityU} = top)</p>
                    <p>• <strong>Size (U)</strong>: How many rack units the device occupies upward</p>
                    <p>• <strong>Status</strong>: Current installation status of the device</p>
                    <p>• <strong>Colors</strong>: Green = Installed, Blue = Planned, Orange = Maintenance, Red = Removed</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden bg-card dark:border-gray-700 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 dark:bg-muted/5 border-b">
                        <TableHead className="w-20 font-semibold text-foreground py-4 text-center">(U) Location</TableHead>
                        <TableHead className="font-semibold text-foreground py-4 text-center">Device</TableHead>
                        <TableHead className="w-20 font-semibold text-foreground py-4 text-center">Size</TableHead>
                        <TableHead className="w-28 font-semibold text-foreground py-4 text-center">Status</TableHead>
                        <TableHead className="w-24 font-semibold text-foreground py-4 text-center">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rackLayout.map(({ u, device, isOccupied, isDeviceStart, isDeviceContinuation }) => {
                        const isLastContinuation = device && isDeviceContinuation && (u === device.positionU + device.sizeU - 1);

                        return (
                          <TableRow
                            key={u}
                            className={`
                              border-b border-border/50 hover:bg-muted/20 dark:hover:bg-muted/5 transition-colors
                              ${isOccupied && isDeviceStart ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-8 border-l-blue-500 rounded-l-lg' : ''}
                              ${isOccupied && isDeviceContinuation ? 'bg-blue-50/20 dark:bg-blue-950/5 border-l-8 border-l-blue-400 rounded-l-lg' : ''}
                              ${!isOccupied ? 'bg-muted/10 dark:bg-muted/5' : ''}
                            `}
                          >
                            {/* Position Column */}
                            <TableCell className="py-3">
                              <div className="flex items-center justify-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {u}
                                </span>
                              </div>
                            </TableCell>

                            {/* Device Column */}
                            <TableCell className="py-3">
                              {isOccupied && device ? (
                                <div className="flex items-center gap-3">
                                  {isDeviceStart ? (
                                    <>
                                      <div className="flex items-center gap-2 flex-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-foreground text-sm leading-tight">
                                            {device.device.name}
                                          </span>
                                        </div>
                                      </div>
                                      {device.device.lastPayload && (
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                          <Wifi className="h-3 w-3" />
                                          <span className="text-xs font-medium">Live</span>
                                        </div>
                                      )}
                                    </>
                                  ) : isDeviceContinuation ? (
                                    <div className="flex items-center gap-2 ml-6">
                                      <div className="w-px h-4 bg-border"></div>
                                      <span className="text-xs text-muted-foreground italic">
                                        Continuation of {device.device.name} ({u - device.positionU + 1}/{device.sizeU})
                                      </span>
                                      {isLastContinuation && (
                                        <div className="w-px h-4 bg-border"></div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground text-sm">
                                        {device.device.name}
                                      </span>
                                      {device.device.lastPayload && (
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                          <Wifi className="h-3 w-3" />
                                          <span className="text-xs font-medium">Live</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                  <span className="text-muted-foreground text-sm italic">Empty slot</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Size Column */}
                            <TableCell className="py-3 text-center">
                              {isOccupied && device && isDeviceStart ? (
                                <Badge variant="secondary" className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {device.sizeU}U
                                </Badge>
                              ) : isDeviceContinuation ? (
                                <div className="w-px h-4 bg-border mx-auto"></div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>

                            {/* Status Column */}
                            <TableCell className="py-3 text-center">
                              {isOccupied && device && isDeviceStart ? (
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(device.status)} shadow-sm`}>
                                  {getStatusIcon(device.status)}
                                  <span className="ml-2">{device.status}</span>
                                </div>
                              ) : isDeviceContinuation ? (
                                <div className="w-px h-4 bg-border mx-auto"></div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>

                            {/* Type Column */}
                            <TableCell className="py-3 text-center">
                              {isOccupied && device && isDeviceStart ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
                                >
                                  {device.deviceType}
                                </Badge>
                              ) : isDeviceContinuation ? (
                                <div className="w-px h-4 bg-border mx-auto"></div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device List */}
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      DEVICES ({rack.devices.length})
                    </CardTitle>
                    <Button onClick={() => {
                      resetDeviceForm();
                      setIsAddDeviceDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Device
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Search devices..."
                      className="flex-1"
                      value={deviceSearchQuery}
                      onChange={(e) => setDeviceSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  // Filter devices based on search query
                  const filteredDevices = deviceSearchQuery.trim()
                    ? rack.devices.filter(device =>
                        device.device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
                        device.device.topic.toLowerCase().includes(deviceSearchQuery.toLowerCase())
                      )
                    : rack.devices;

                  return filteredDevices.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Server className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        {deviceSearchQuery.trim() ? "No devices found" : "No devices installed"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {deviceSearchQuery.trim()
                          ? "Try adjusting your search criteria"
                          : "Add devices to see them here"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDevices.map((rackDevice) => (
                        <div key={rackDevice.id} className="group p-4 border rounded-lg hover:shadow-sm transition-all duration-200 bg-card hover:bg-muted/20 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground text-sm leading-tight mb-1">
                                  {rackDevice.device.name}
                                </h4>
                                <div className="flex items-center gap-2">
                                  {rackDevice.deviceType !== "SENSOR" && (
                                    <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">
                                      {rackDevice.positionU}U - {rackDevice.positionU + rackDevice.sizeU - 1}U
                                    </Badge>
                                  )}
                                  {rackDevice.deviceType === "SENSOR" && (
                                    <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400">
                                      Sensor Device
                                    </Badge>
                                  )}
                                  <Badge className={`text-xs ${getStatusColor(rackDevice.status)}`}>
                                    {getStatusIcon(rackDevice.status)}
                                    <span className="ml-1">{rackDevice.status}</span>
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDevice(rackDevice)}
                              className="h-8 px-3 text-xs font-medium hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors"
                            >
                              <Edit className="h-3 w-3 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDevice(rackDevice)}
                              className="h-8 px-3 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="h-3 w-3 mr-1.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Device Dialog */}
        <Dialog open={isAddDeviceDialogOpen} onOpenChange={setIsAddDeviceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Device to Rack</DialogTitle>
              <DialogDescription>
                Assign a device to a specific position in this rack
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-select">Device *</Label>
                <Select value={deviceForm.deviceId} onValueChange={(value) => setDeviceForm({ ...deviceForm, deviceId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevices.map((device) => (
                      <SelectItem key={device.uniqId} value={device.uniqId}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-type">Device Type *</Label>
                <Select value={deviceForm.deviceType} onValueChange={(value: any) => setDeviceForm({ ...deviceForm, deviceType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="SWITCH">Switch</SelectItem>
                    <SelectItem value="STORAGE">Storage</SelectItem>
                    <SelectItem value="PDU">PDU</SelectItem>
                    <SelectItem value="SENSOR">Sensor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the type of device being installed
                </p>
              </div>

              {/* Show Size and Location fields only for non-sensor devices */}
              {deviceForm.deviceType !== "SENSOR" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="size-u">(U) Size *</Label>
                    <Input
                      id="size-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.sizeU}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > rack.capacityU) {
                          toast({
                            title: "Invalid Size",
                            description: `Size cannot exceed rack capacity (${rack.capacityU}U)`,
                            variant: "destructive",
                          });
                          return;
                        }
                        setDeviceForm({ ...deviceForm, sizeU: value });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many rack units this device occupies (max: {rack.capacityU}U)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position-u">(U) Location *</Label>
                    <Input
                      id="position-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.positionU}
                      onChange={(e) => setDeviceForm({ ...deviceForm, positionU: parseInt(e.target.value) })}
                      className={!isPositionAvailable(deviceForm.positionU, deviceForm.sizeU) ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {!isPositionAvailable(deviceForm.positionU, deviceForm.sizeU) && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Position {deviceForm.positionU} to {deviceForm.positionU + deviceForm.sizeU - 1}U is already occupied
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Bottom position of the device (1 = bottom, {rack.capacityU} = top)
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={deviceForm.status} onValueChange={(value: any) => setDeviceForm({ ...deviceForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="INSTALLED">Installed</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="REMOVED">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDeviceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDevice} disabled={!deviceForm.deviceId}>
                Add Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Device Dialog */}
        <Dialog open={isEditDeviceDialogOpen} onOpenChange={setIsEditDeviceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
              <DialogDescription>
                Update device position, size, or status in this rack
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-device-select">Device *</Label>
                <Select
                  value={deviceForm.deviceId}
                  onValueChange={(value) => setDeviceForm({ ...deviceForm, deviceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevices.concat(selectedRackDevice ? [{
                      id: selectedRackDevice.device.id,
                      uniqId: selectedRackDevice.device.uniqId,
                      name: selectedRackDevice.device.name,
                      topic: selectedRackDevice.device.topic,
                      address: selectedRackDevice.device.address
                    }] : []).map((device) => (
                      <SelectItem key={device.uniqId} value={device.uniqId}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Size and Location fields only for non-sensor devices */}
              {deviceForm.deviceType !== "SENSOR" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position-u">(U) Location *</Label>
                    <Input
                      id="edit-position-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.positionU}
                      onChange={(e) => setDeviceForm({ ...deviceForm, positionU: parseInt(e.target.value) })}
                      className={!isPositionAvailable(deviceForm.positionU, deviceForm.sizeU, selectedRackDevice?.deviceId) ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {!isPositionAvailable(deviceForm.positionU, deviceForm.sizeU, selectedRackDevice?.deviceId) && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Position {deviceForm.positionU} to {deviceForm.positionU + deviceForm.sizeU - 1}U is already occupied
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Bottom position of the device (1 = bottom, {rack.capacityU} = top)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-size-u">Size (U) *</Label>
                    <Input
                      id="edit-size-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.sizeU}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > rack.capacityU) {
                          toast({
                            title: "Invalid Size",
                            description: `Size cannot exceed rack capacity (${rack.capacityU}U)`,
                            variant: "destructive",
                          });
                          return;
                        }
                        setDeviceForm({ ...deviceForm, sizeU: value });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many rack units this device occupies (max: {rack.capacityU}U)
                    </p>
                  </div>
                </>
              )}

              {/* Show sensor info for sensor devices */}
              {deviceForm.deviceType === "SENSOR" && (
                <div className="space-y-2">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <Activity className="h-4 w-4" />
                      <span className="font-medium">Sensor Device</span>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• Sensor devices don't occupy physical rack space</p>
                      <p>• They are only used for monitoring and data collection</p>
                      <p>• Position and size are automatically set to default values</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-device-type">Device Type *</Label>
                <Select value={deviceForm.deviceType} onValueChange={(value: any) => setDeviceForm({ ...deviceForm, deviceType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="SWITCH">Switch</SelectItem>
                    <SelectItem value="STORAGE">Storage</SelectItem>
                    <SelectItem value="PDU">PDU</SelectItem>
                    <SelectItem value="SENSOR">Sensor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the type of device being installed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={deviceForm.status} onValueChange={(value: any) => setDeviceForm({ ...deviceForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="INSTALLED">Installed</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="REMOVED">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDeviceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateDevice}>
                Update Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Device Dialog */}
        <Dialog open={isRemoveDeviceDialogOpen} onOpenChange={setIsRemoveDeviceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Device</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this device from the rack?
              </DialogDescription>
            </DialogHeader>

            {selectedRackDevice && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium">{selectedRackDevice.device.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedRackDevice.positionU}U</Badge>
                    <Badge className={`text-xs ${getStatusColor(selectedRackDevice.status)}`}>
                      {getStatusIcon(selectedRackDevice.status)}
                      <span className="ml-1">{selectedRackDevice.status}</span>
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  This action cannot be undone. The device will be removed from this rack but will remain available for assignment to other racks.
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemoveDeviceDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRemoveDevice}>
                Remove Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
