"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Server, HardDrive, Activity, Building, Search, CheckCircle, XCircle, Wrench, TrendingUp, HardDriveUpload, Plus, AlertCircle, MonitorSpeaker, Cpu, Database as DatabaseIcon, Router, HardDrive as HardDriveIcon } from "lucide-react";

interface Device {
  id: string;
  name: string;
  deviceType: string;
  manufacturer?: string;
  modelId?: string;
  firmware?: string;
  positionU: number | null;
  sizeU: number;
  powerWatt?: number;
  notes?: string;
  status: string;
  ipAddress?: string;
  lastSeen?: string;
  rack: {
    id: string;
    name: string;
  } | null;
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
  devices: Device[];
  _count: {
    devices: number;
  };
}

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [rack, setRack] = useState<Rack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rackUnits, setRackUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);

  // New Device Form State
  const [newDevice, setNewDevice] = useState({
    name: "",
    deviceType: "",
    manufacturer: "",
    modelId: "",
    firmware: "",
    sizeU: 1,
    positionU: 0,
    powerWatt: "",
    ipAddress: "",
    notes: "",
  });

  const rackId = params?.id as string;

  const filteredDevices = rack?.devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Fetch rack data
  const fetchRack = async () => {
    if (!rackId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/racks/${rackId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rack");
      }
      const data = await response.json();
      setRack(data);

      // Generate rack units visualization
      generateRackUnits(data);
    } catch (error) {
      console.error("Error fetching rack:", error);
      toast({
        title: "Error",
        description: "Failed to load rack details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate rack units for 2D visualization
  const generateRackUnits = (rackData: Rack) => {
    const units: any[] = [];
    const deviceMap = new Map<number, Device[]>();

    // Group devices by their position
    rackData.devices.forEach((device) => {
      const pos = device.positionU || 1;
      for (let i = 0; i < device.sizeU; i++) {
        const unitPos = pos + i;
        if (!deviceMap.has(unitPos)) {
          deviceMap.set(unitPos, []);
        }
        deviceMap.get(unitPos)!.push(device);
      }
    });

    // Generate units from top (capacityU) to bottom (1)
    for (let pos = rackData.capacityU; pos >= 1; pos--) {
      const installedDevices = deviceMap.get(pos) || [];
      const isOccupied = installedDevices.length > 0;

      units.push({
        position: pos,
        device: isOccupied ? installedDevices[0] : null,
        isOccupied,
        installedDevices,
      });
    }

    setRackUnits(units);
  };

  // Device type icons
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "server":
        return Server;
      case "cpu":
      case "processor":
        return Cpu;
      case "storage":
      case "nas":
        return DatabaseIcon;
      case "network":
      case "switch":
      case "router":
        return Router;
      case "storage":
        return HardDriveIcon;
      case "monitor":
        return MonitorSpeaker;
      default:
        return Server;
    }
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "text-green-600 bg-green-50 border-green-200";
      case "offline":
        return "text-red-600 bg-red-50 border-red-200";
      case "maintenance":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getDeviceStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return CheckCircle;
      case "offline":
        return XCircle;
      case "maintenance":
        return Wrench;
      default:
        return AlertCircle;
    }
  };

  const getCapacityUtilizationColor = (usedU: number, totalU: number) => {
    if (totalU === 0) return "text-muted-foreground";
    const percentage = (usedU / totalU) * 100;
    if (percentage >= 90) return "text-red-600 dark:text-red-400";
    if (percentage >= 75) return "text-orange-600 dark:text-orange-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getCapacityUtilizationBadge = (usedU: number, totalU: number) => {
    if (totalU === 0) return <Badge variant="secondary">No Capacity</Badge>;
    const percentage = (usedU / totalU) * 100;
    if (percentage >= 90) return <Badge variant="destructive">Critical</Badge>;
    if (percentage >= 75) return <Badge className="bg-orange-500 dark:bg-orange-600 text-white">High</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-500 dark:bg-yellow-600 text-white dark:text-gray-900">Medium</Badge>;
    return <Badge className="bg-green-500 dark:bg-green-600 text-white">Low</Badge>;
  };

  // Initialize
  useEffect(() => {
    if (rackId) {
      fetchRack();
    }
  }, [rackId]);

  // Handle adding new device
  const handleAddDevice = async () => {
    if (!rackId) return;

    const deviceData = {
      ...newDevice,
      positionU: newDevice.positionU || null,
      rackId,
      status: "offline",
      powerWatt: newDevice.powerWatt ? parseInt(newDevice.powerWatt) : null,
    };

    try {
      const response = await fetch("/api/devices-internal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deviceData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add device");
      }

      toast({
        title: "Success",
        description: "Device added successfully",
      });

      setIsAddDeviceOpen(false);
      setNewDevice({
        name: "",
        deviceType: "",
        manufacturer: "",
        modelId: "",
        firmware: "",
        sizeU: 1,
        positionU: 0,
        powerWatt: "",
        ipAddress: "",
        notes: "",
      });
      fetchRack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add device",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <SidebarInset>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (!rack) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <Card>
            <CardContent className="pt-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-center">Rack not found</h2>
              <p className="text-center text-muted-foreground mt-2">
                The requested rack could not be found.
              </p>
              <Button
                onClick={() => router.back()}
                className="mt-4 mx-auto block"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/racks")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
          </Button>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <HardDriveUpload className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Rack Details: {rack.name}
            {rack.location && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {rack.location}
              </span>
            )}
          </h1>
        </div>
      </header>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <HardDriveUpload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rack.capacityU}U</div>
            <p className="text-xs text-muted-foreground">
              Rack size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Capacity</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rack.usedU} U</div>
            <p className="text-xs text-muted-foreground">Units occupied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Capacity</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Building className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rack.availableU} U</div>
            <p className="text-xs text-muted-foreground">Units remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rack.devices.length}</div>
            <p className="text-xs text-muted-foreground">Installed devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rack.utilizationPercent}%</div>
            <p className="text-xs text-muted-foreground">
              {rack.utilizationPercent > 90 ? 'Critical' : rack.utilizationPercent > 70 ? 'High' : 'Normal'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2D Rack Capacity View */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5" />
            Rack Layout - {rack.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Device positions and capacity utilization
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-3 rounded-lg border">
            {/* Rack Header */}
            <div className="bg-card border rounded-t-md p-2 mb-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{rack.name}</div>
                  <div className="text-xs text-muted-foreground">{rack.capacityU}U Server Rack</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {rack.utilizationPercent}% Used
                </Badge>
              </div>
            </div>

            {/* Rack Units Grid - Compact */}
            <div className="bg-background border border-border rounded-b-md min-h-48 p-3 relative">
              {/* Rack Frame */}
              <div className="absolute inset-y-0 left-2 right-2 top-1 bottom-1 border-l-2 border-r-2 border-border"></div>

              {/* Units Display - Smaller */}
              <div className="relative space-y-0.5 px-3 py-1">
                {rackUnits.slice().reverse().map((unit) => {
                  return (
                    <div key={unit.position} className="relative">
                      <div
                        className={`
                          relative cursor-pointer border transition-colors
                          ${unit.isOccupied
                            ? 'bg-primary/10 border-primary/30 text-foreground'
                            : 'bg-background border-border hover:bg-muted/50'
                          }
                        `}
                        style={{ height: '20px' }}
                      >
                        {/* Unit Position Label - Small */}
                        <div className={`absolute -left-8 top-1/2 transform -translate-y-1/2 text-xs font-medium bg-background border border-border px-1 rounded`}>
                          U{unit.position}
                        </div>

                        {/* Unit Content - Compact */}
                        {unit.isOccupied ? (
                          <div className="h-full flex items-center justify-center px-1 overflow-hidden rounded-full">
                            {unit.installedDevices.map((device: Device) => {
                              const Icon = getDeviceIcon(device.deviceType);

                              return (
                                <div key={device.id} className="flex items-center gap-1 min-w-0 flex-1">
                                  <Icon className="h-3 w-3 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-medium">
                                      {device.name}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rack Base - Simple */}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-muted border-t flex justify-center items-center">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Power
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Cool
                </div>
              </div>
            </div>

            {/* Capacity Stats - Simple */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-2 rounded border">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3" />
                  <span className="text-xs font-medium">Free</span>
                </div>
                <div className="text-sm font-bold">{rack.availableU}U</div>
              </div>

              <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-2 rounded border">
                <div className="flex items-center gap-1 mb-1">
                  <Server className="h-3 w-3" />
                  <span className="text-xs font-medium">Used</span>
                </div>
                <div className="text-sm font-bold">{rack.usedU}U</div>
              </div>

              <div className={`p-2 rounded border ${
                rack.utilizationPercent > 90 ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                rack.utilizationPercent > 70 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' :
                'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">Usage</span>
                </div>
                <div className="text-sm font-bold">{rack.utilizationPercent}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Management Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Device Management Summary ({filteredDevices.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-64"
                />
              </div>
              <Button onClick={() => setIsAddDeviceOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDevices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                          <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        {device.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.deviceType}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getCapacityUtilizationColor(device.positionU || 0, rack.capacityU)}`}>
                        U{device.positionU || "?"}
                        {device.sizeU > 1 && `-${(device.positionU || 0) + device.sizeU - 1}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${
                        device.status.toLowerCase() === 'online' ? 'text-green-600 dark:text-green-400' :
                        device.status.toLowerCase() === 'offline' ? 'text-red-600 dark:text-red-400' :
                        device.status.toLowerCase() === 'maintenance' ? 'text-orange-600 dark:text-orange-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {device.status.toLowerCase() === 'online' && <CheckCircle className="h-4 w-4" />}
                        {device.status.toLowerCase() === 'offline' && <XCircle className="h-4 w-4" />}
                        {device.status.toLowerCase() === 'maintenance' && <Wrench className="h-4 w-4" />}
                        <span className="capitalize">{device.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{device.sizeU}U</TableCell>
                    <TableCell>
                      {device.ipAddress ? (
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                          {device.ipAddress}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No devices found matching your search" : "No devices installed"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first device to this rack"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsAddDeviceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Device
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Device Dialog */}
      <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Device to {rack.name}</DialogTitle>
            <DialogDescription>
              Install a new device in this rack
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="device-name">Device Name *</Label>
                <Input
                  id="device-name"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="Server-01"
                />
              </div>
              <div>
                <Label htmlFor="device-type">Device Type *</Label>
                <Select
                  value={newDevice.deviceType}
                  onValueChange={(value) => setNewDevice({ ...newDevice, deviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Network">Network Switch</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="size-u">Size (U) *</Label>
                <Select
                  value={newDevice.sizeU.toString()}
                  onValueChange={(value) => setNewDevice({ ...newDevice, sizeU: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((u) => (
                      <SelectItem key={u} value={u.toString()}>{u}U</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position-u">Start Position (U)</Label>
                <Input
                  id="position-u"
                  type="number"
                  min="1"
                  max={rack.capacityU}
                  value={newDevice.positionU || ""}
                  onChange={(e) => setNewDevice({ ...newDevice, positionU: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ip">IP Address</Label>
                <Input
                  id="ip"
                  value={newDevice.ipAddress}
                  onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label htmlFor="power">Power (Watts)</Label>
                <Input
                  id="power"
                  value={newDevice.powerWatt}
                  onChange={(e) => setNewDevice({ ...newDevice, powerWatt: e.target.value })}
                  placeholder="350"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={newDevice.notes}
                onChange={(e) => setNewDevice({ ...newDevice, notes: e.target.value })}
                placeholder="Additional information..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDevice} disabled={!newDevice.name.trim() || !newDevice.deviceType}>
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
