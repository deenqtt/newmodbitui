"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  HardDrive,
  Server,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Wifi,
  Power,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface InternalDevice {
  id: string;
  name: string;
  deviceType: string;
  manufacturer?: string;
  modelId?: string;
  rackId?: string;
  positionU?: number;
  sizeU: number;
  powerWatt?: number;
  status: string;
  ipAddress?: string;
  notes?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  rack?: {
    id: string;
    name: string;
    capacityU: number;
  } | null;
}

const DEVICE_TYPES = [
  "Server", "Storage", "NAS", "Switch", "Router", "Firewall", "UPS",
  "Sensor", "Camera", "Access Control", "Monitor", "Keyboard", "Mouse", "Other"
];

const STATUS_COLORS: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-red-500",
  maintenance: "bg-amber-500",
  unknown: "bg-gray-500 default"
};

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  maintenance: "Maintenance",
  unknown: "Unknown"
};

export default function DevicesInternalPage() {
  const [devices, setDevices] = useState<InternalDevice[]>([]);
  const [racks, setRacks] = useState<Array<{ id: string; name: string; capacityU: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<InternalDevice | null>(null);
  const [isDeleteDeviceDialogOpen, setIsDeleteDeviceDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<InternalDevice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    deviceType: "",
    manufacturer: "",
    modelId: "",
    rackId: "",
    positionU: "",
    sizeU: "1",
    powerWatt: "",
    ipAddress: "",
    notes: "",
  });

  const { toast } = useToast();

  // Fetch devices and racks
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch devices
      const devicesResponse = await fetch("/api/devices-internal");
      if (!devicesResponse.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devicesData = await devicesResponse.json();

      // Fetch racks for dropdown
      const racksResponse = await fetch("/api/racks");
      if (racksResponse.ok) {
        const racksData = await racksResponse.json();
        setRacks(racksData.map((rack: any) => ({
          id: rack.id,
          name: rack.name,
          capacityU: rack.capacityU
        })));
      }

      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter devices based on search and type
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.deviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (device.manufacturer && device.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || device.deviceType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Create/update device
  const handleDeviceSubmit = async () => {
    if (!deviceForm.name.trim() || !deviceForm.deviceType) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const deviceData = {
        name: deviceForm.name,
        deviceType: deviceForm.deviceType,
        manufacturer: deviceForm.manufacturer || null,
        modelId: deviceForm.modelId || null,
        rackId: deviceForm.rackId || null,
        positionU: deviceForm.positionU ? parseInt(deviceForm.positionU) : null,
        sizeU: parseInt(deviceForm.sizeU) || 1,
        powerWatt: deviceForm.powerWatt ? parseInt(deviceForm.powerWatt) : null,
        ipAddress: deviceForm.ipAddress || null,
        status: "offline", // Default status
        notes: deviceForm.notes || null,
      };

      const isUpdating = selectedDevice !== null;
      const url = isUpdating
        ? `/api/devices-internal/${selectedDevice.id}`
        : "/api/devices-internal";

      const response = await fetch(url, {
        method: isUpdating ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Success",
        description: `Device ${isUpdating ? 'updated' : 'added'} successfully`,
      });

      setIsDeviceDialogOpen(false);
      resetDeviceForm();
      setSelectedDevice(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save device",
        variant: "destructive",
      });
    }
  };

  // Delete device
  const handleDeviceDelete = async () => {
    if (!deviceToDelete) return;

    try {
      const response = await fetch(`/api/devices-internal/${deviceToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete device");
      }

      toast({
        title: "Success",
        description: "Device deleted successfully",
      });

      setIsDeleteDeviceDialogOpen(false);
      setDeviceToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete device",
        variant: "destructive",
      });
    }
  };

  // Open device form for editing
  const openDeviceForm = (device?: InternalDevice) => {
    if (device) {
      setSelectedDevice(device);
      setDeviceForm({
        name: device.name,
        deviceType: device.deviceType,
        manufacturer: device.manufacturer || "",
        modelId: device.modelId || "",
        rackId: device.rackId || "",
        positionU: device.positionU?.toString() || "",
        sizeU: device.sizeU.toString(),
        powerWatt: device.powerWatt?.toString() || "",
        ipAddress: device.ipAddress || "",
        notes: device.notes || "",
      });
    } else {
      resetDeviceForm();
      setSelectedDevice(null);
    }
    setIsDeviceDialogOpen(true);
  };

  // Reset device form
  const resetDeviceForm = () => {
    setDeviceForm({
      name: "",
      deviceType: "",
      manufacturer: "",
      modelId: "",
      rackId: "",
      positionU: "",
      sizeU: "1",
      powerWatt: "",
      ipAddress: "",
      notes: "",
    });
  };

  // Initialize
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Internal Devices
            </h1>
            <p className="text-muted-foreground">
              Manage your server's internal components and rack-mounted equipment
            </p>
          </div>

          <Button onClick={() => openDeviceForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search devices by name, type, or manufacturer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DEVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <HardDrive className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                  <p className="text-2xl font-bold">{devices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Server className="h-6 w-6 text-emerald-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Rack Mounted</p>
                  <p className="text-2xl font-bold">
                    {devices.filter(d => d.rackId).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Wifi className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {devices.filter(d => d.status === 'online').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Power className="h-6 w-6 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Power</p>
                  <p className="text-2xl font-bold">
                    {devices.reduce((sum, d) => sum + (d.powerWatt || 0), 0)}W
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devices List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            // Loading skeletons
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredDevices.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Devices Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== "all"
                  ? "No devices match your current filters"
                  : "Get started by adding your first internal device"}
              </p>
              <Button onClick={() => openDeviceForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          ) : (
            filteredDevices.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{device.deviceType}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDeviceForm(device)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Device
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeviceToDelete(device);
                            setIsDeleteDeviceDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Device
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Status and Rack Position */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center rounded-full h-2 w-2 ${STATUS_COLORS[device.status] || STATUS_COLORS.unknown}`}
                      />
                      <span className="text-sm font-medium">
                        {STATUS_LABELS[device.status] || 'Unknown'}
                      </span>
                    </div>
                    {device.positionU && (
                      <Badge variant="outline">
                        U{device.positionU}
                      </Badge>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2">
                    {device.manufacturer && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Make:</strong> {device.manufacturer}
                        {device.modelId && ` • ${device.modelId}`}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm"><strong>Rack:</strong></span>
                        <span className="text-sm text-muted-foreground">
                          {device.rack ? device.rack.name : 'Not Assigned'}
                        </span>
                      </div>

                      {device.powerWatt && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Power className="h-3 w-3 mr-1" />
                          {device.powerWatt}W
                        </div>
                      )}
                    </div>

                    {device.ipAddress && (
                      <p className="text-sm text-muted-foreground">
                        <strong>IP:</strong> {device.ipAddress}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {device.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {device.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Device Form Dialog */}
        <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDevice ? "Edit Device" : "Add New Device"}
              </DialogTitle>
              <DialogDescription>
                Configure device information and rack positioning (optional)
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name *</Label>
                <Input
                  id="device-name"
                  placeholder="e.g., Server-01"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-type">Device Type *</Label>
                <Select
                  value={deviceForm.deviceType}
                  onValueChange={(value) => setDeviceForm({ ...deviceForm, deviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  placeholder="e.g., Dell, HP"
                  value={deviceForm.manufacturer}
                  onChange={(e) => setDeviceForm({ ...deviceForm, manufacturer: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model ID</Label>
                <Input
                  id="model"
                  placeholder="e.g., PowerEdge R750"
                  value={deviceForm.modelId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, modelId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rack">Assign to Rack (Optional)</Label>
                <Select
                  value={deviceForm.rackId}
                  onValueChange={(value) => setDeviceForm({ ...deviceForm, rackId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Assigned</SelectItem>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id}>
                        {rack.name} ({rack.capacityU}U)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position-u">Position U</Label>
                <Input
                  id="position-u"
                  type="number"
                  placeholder="e.g., 15"
                  value={deviceForm.positionU}
                  onChange={(e) => setDeviceForm({ ...deviceForm, positionU: e.target.value })}
                  disabled={!deviceForm.rackId}
                  min="1"
                />
                {deviceForm.rackId && (
                  <p className="text-xs text-muted-foreground">
                    Available: U1 to U{racks.find(r => r.id === deviceForm.rackId)?.capacityU || 0}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="size-u">Size (U)</Label>
                <Input
                  id="size-u"
                  type="number"
                  placeholder="1"
                  value={deviceForm.sizeU}
                  onChange={(e) => setDeviceForm({ ...deviceForm, sizeU: e.target.value })}
                  min="1"
                  max="42"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="power-watt">Power (Watts)</Label>
                <Input
                  id="power-watt"
                  type="number"
                  placeholder="750"
                  value={deviceForm.powerWatt}
                  onChange={(e) => setDeviceForm({ ...deviceForm, powerWatt: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="ip-address">IP Address</Label>
                <Input
                  id="ip-address"
                  placeholder="192.168.1.100"
                  value={deviceForm.ipAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this device"
                  value={deviceForm.notes}
                  onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeviceSubmit}
                disabled={!deviceForm.name.trim() || !deviceForm.deviceType}
              >
                {selectedDevice ? "Update Device" : "Add Device"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Device Dialog */}
        <AlertDialog open={isDeleteDeviceDialogOpen} onOpenChange={setIsDeleteDeviceDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Device</AlertDialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deviceToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDeviceDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeviceDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Device
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
