"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import MqttStatus from "@/components/ui/mqtt-status";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Server, Cpu, Database, Router, HardDrive, MonitorSpeaker, Zap, Wrench, AlertCircle, CheckCircle, XCircle, Minus, Plus } from "lucide-react";

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

interface RackUnit {
  position: number; // 1 to capacityU (top is 1, bottom is capacityU)
  device: Device | null;
  isOccupied: boolean;
  installedDevices: Device[]; // For multi-U devices
}

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [rack, setRack] = useState<Rack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rackUnits, setRackUnits] = useState<RackUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
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
    const units: RackUnit[] = [];
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

    // Generate units from top (U=1) to bottom (U=capacityU)
    for (let pos = rackData.capacityU; pos >= 1; pos--) {
      const installedDevices = deviceMap.get(pos) || [];
      const isOccupied = installedDevices.length > 0;

      units.push({
        position: pos,
        device: isOccupied ? installedDevices[0] : null, // Primary device for display
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
        return Database;
      case "network":
      case "switch":
      case "router":
        return Router;
      case "storage":
        return HardDrive;
      case "monitor":
        return MonitorSpeaker;
      case "ups":
      case "power":
        return Zap;
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
        return Minus;
    }
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
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
          <button
            onClick={() => router.push("/racks")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Racks
          </button>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Server className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{rack.name}</h1>
          {rack.location && (
            <Badge variant="secondary" className="ml-2">
              {rack.location}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={fetchRack}
            disabled={isLoading}
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAddDeviceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rack.capacityU}U</div>
              <p className="text-xs text-muted-foreground">
                Server rack size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Space</CardTitle>
              <Server className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rack.usedU}U</div>
              <p className="text-xs text-muted-foreground">
                Rack units occupied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Space</CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rack.availableU}U</div>
              <p className="text-xs text-muted-foreground">
                Free rack units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <MonitorSpeaker className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rack.utilizationPercent}%</div>
              <p className="text-xs text-muted-foreground">
                {rack.devices.length} device{rack.devices.length !== 1 ? "s" : ""} installed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 2D Rack Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>2D Rack Layout</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visual representation of rack unit allocation
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex">
              {/* Rack Side View */}
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50/50">
                {/* Rack Title */}
                <div className="text-center mb-4">
                  <h3 className="font-semibold text-sm">{rack.name}</h3>
                  <p className="text-xs text-muted-foreground">{rack.capacityU}U Rack</p>
                </div>

                {/* Rack Units */}
                <div className="space-y-1" style={{ width: '280px' }}>
                  {rackUnits.map((unit) => (
                    <div
                      key={unit.position}
                      className={`
                        relative border border-gray-200 rounded-sm transition-all duration-200
                        ${unit.isOccupied
                          ? 'bg-blue-600 border-blue-700 hover:bg-blue-500 cursor-pointer'
                          : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
                        }
                      `}
                      style={{ height: '40px', width: '100%' }}
                      onClick={() => setSelectedUnit(unit.position)}
                    >
                      {/* Unit Position Label */}
                      <div className={`absolute -left-8 top-1/2 transform -translate-y-1/2 text-xs font-medium w-6 text-center ${
                        unit.isOccupied ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        U{unit.position}
                      </div>

                      {/* Unit Content */}
                      {unit.isOccupied ? (
                        <>
                          {/* Device Indicator */}
                          <div className="h-full flex items-center justify-center p-1">
                            <div className="flex items-center gap-2 text-white text-xs">
                              {(() => {
                                const Icon = getDeviceIcon(unit.device?.deviceType || "server");
                                const StatusIcon = getDeviceStatusIcon(unit.device?.status || "offline");
                                return (
                                  <>
                                    <Icon className="h-3 w-3 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">
                                        {unit.device?.name || "Unknown"}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <StatusIcon className="h-2 w-2" />
                                        {unit.device?.sizeU && unit.device.sizeU > 1 && (
                                          <span className="text-xs opacity-75">
                                            {unit.device.sizeU}U
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Multiple devices indicator */}
                          {unit.installedDevices.length > 1 && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              {unit.installedDevices.length}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Empty unit indicator */
                        <div className="h-full flex items-center justify-center">
                          <div className="text-gray-400 text-xs">Empty</div>
                        </div>
                      )}

                      {/* Selected indicator */}
                      {selectedUnit === unit.position && (
                        <div className="absolute inset-0 border-2 border-yellow-400 rounded-sm"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rack Footer */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Click on any unit for details
                  </p>
                </div>
              </div>

              {/* Selected Unit Details */}
              <div className="ml-6 flex-1">
                {selectedUnit ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unit U{selectedUnit}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {rackUnits.find(u => u.position === selectedUnit)?.isOccupied ? "Occupied" : "Available"}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const unit = rackUnits.find(u => u.position === selectedUnit);
                        if (!unit) return null;

                        return unit.isOccupied ? (
                          <div className="space-y-4">
                            {unit.installedDevices.map((device, index) => (
                              <div key={device.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    {(() => {
                                      const Icon = getDeviceIcon(device.deviceType);
                                      const StatusIcon = getDeviceStatusIcon(device.status);
                                      return (
                                        <>
                                          <Icon className="h-5 w-5 text-blue-600" />
                                          <div>
                                            <h4 className="font-semibold">{device.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge className={getDeviceStatusColor(device.status)}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {device.status}
                                              </Badge>
                                              {device.sizeU > 1 && (
                                                <Badge variant="outline">
                                                  {device.sizeU}U Device
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  {unit.installedDevices.length > 1 && index === 0 && (
                                    <Badge variant="secondary">
                                      Primary Device
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Type:</span>{" "}
                                      {device.deviceType}
                                    </div>
                                    {device.manufacturer && (
                                      <div className="text-sm">
                                        <span className="font-medium text-muted-foreground">Manufacturer:</span>{" "}
                                        {device.manufacturer}
                                      </div>
                                    )}
                                    {device.modelId && (
                                      <div className="text-sm">
                                        <span className="font-medium text-muted-foreground">Model:</span>{" "}
                                        {device.modelId}
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {device.ipAddress && (
                                      <div className="text-sm">
                                        <span className="font-medium text-muted-foreground">IP:</span>{" "}
                                        {device.ipAddress}
                                      </div>
                                    )}
                                    {device.powerWatt && (
                                      <div className="text-sm">
                                        <span className="font-medium text-muted-foreground">Power:</span>{" "}
                                        {device.powerWatt}W
                                      </div>
                                    )}
                                    {device.lastSeen && (
                                      <div className="text-sm">
                                        <span className="font-medium text-muted-foreground">Last Seen:</span>{" "}
                                        {new Date(device.lastSeen).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {device.notes && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <h5 className="text-sm font-medium text-muted-foreground mb-1">Notes</h5>
                                    <p className="text-sm">{device.notes}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <h3 className="font-semibold text-lg">Available Unit</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                              This rack unit is currently empty and available for device installation.
                            </p>
                            <Button onClick={() => setIsAddDeviceOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Install Device
                            </Button>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Select a rack unit to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device List */}
        <Card>
          <CardHeader>
            <CardTitle>Installed Devices ({rack.devices.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              All devices currently installed in this rack
            </p>
          </CardHeader>
          <CardContent>
            {rack.devices.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No devices installed</h3>
                <p className="text-muted-foreground mb-4">
                  This rack doesn't have any devices installed yet. Add your first device below.
                </p>
                <Button onClick={() => setIsAddDeviceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Install First Device
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rack.devices
                  .sort((a, b) => (b.positionU || 0) - (a.positionU || 0)) // Sort by position (highest first)
                  .map((device) => {
                    const Icon = getDeviceIcon(device.deviceType);
                    const StatusIcon = getDeviceStatusIcon(device.status);

                    return (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{device.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getDeviceStatusColor(device.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {device.status}
                              </Badge>
                              <Badge variant="outline">
                                U{device.positionU || "?"}-{device.sizeU > 1 ? (device.positionU! + device.sizeU - 1) : device.positionU}
                              </Badge>
                              <Badge variant="secondary">
                                {device.deviceType}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          {device.powerWatt && (
                            <div className="text-muted-foreground">
                              {device.powerWatt}W
                            </div>
                          )}
                          {device.ipAddress && (
                            <div className="text-muted-foreground">
                              {device.ipAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
