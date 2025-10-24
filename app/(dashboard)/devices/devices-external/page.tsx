"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  HardDrive,
  Plus,
  Database,
  Wifi,
  WifiOff,
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Activity,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UploadCloud,
  Copy,
} from "lucide-react";

interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

const DevicesExternalContent = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDeleteDeviceDialogOpen, setIsDeleteDeviceDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [viewingPayload, setViewingPayload] = useState<{
    topic: string;
    payload: string;
  } | null>(null);
  const [dbStatus, setDbStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  const [deviceForm, setDeviceForm] = useState({
    name: "",
    topic: "",
    address: "",
  });

  const { toast } = useToast();

  const { isReady, connectionStatus, subscribe, unsubscribe } = useMqtt();

  // Filter devices based on search term
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (device.address && device.address.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Apply sorting using useSortableTable hook
  const { sorted: sortedDevices, sortField, sortDirection, handleSort } = useSortableTable(filteredDevices);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = sortedDevices.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  // Fetch devices and check database status
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch devices
      const devicesResponse = await fetch("/api/devices/external");
      if (!devicesResponse.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devicesData = await devicesResponse.json();

      // Check database status
      const healthResponse = await fetch("/api/health");
      if (healthResponse.ok) {
        setDbStatus("connected");
      } else {
        setDbStatus("disconnected");
      }

      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setDbStatus("disconnected");
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize and setup MQTT subscriptions
  useEffect(() => {
    fetchData();
  }, []);

  const topics = useMemo(() => devices.map((d) => d.topic), [devices]);

  useEffect(() => {
    if (!isReady || topics.length === 0) return;
    const handleMessage = (topic: string, payload: string) => {
      if (topics.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };
    topics.forEach((topic) => subscribe(topic, handleMessage));
    return () => {
      topics.forEach((topic) => unsubscribe(topic, handleMessage));
    };
  }, [topics, isReady, subscribe, unsubscribe]);

  // Form submission
  const handleDeviceSubmit = async () => {
    if (!deviceForm.name.trim() || !deviceForm.topic.trim()) {
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
        topic: deviceForm.topic,
        address: deviceForm.address || null,
      };

      const isUpdating = selectedDevice !== null;
      const url = isUpdating
        ? `/api/devices/external/${selectedDevice.id}`
        : "/api/devices/external";

      const response = await fetch(url, {
        method: isUpdating ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
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
      const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, {
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
  const openDeviceForm = (device?: Device) => {
    if (device) {
      setSelectedDevice(device);
      setDeviceForm({
        name: device.name,
        topic: device.topic,
        address: device.address || "",
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
      topic: "",
      address: "",
    });
  };

  // Export devices
  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(devices, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `devices-external-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();

    toast({
      title: "Export Complete",
      description: "Devices exported successfully",
    });
  };

  // Import devices
  const handleImport = async () => {
    if (!fileToImport) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        const data = JSON.parse(content as string);
        if (!Array.isArray(data))
          throw new Error("The JSON file must contain an array.");

        const response = await fetch("/api/devices/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Import failed.");

        toast({
          title: "Import Complete!",
          description: `Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`,
        });

        fetchDevices();
        setIsImportModalOpen(false);
        setFileToImport(null);
      } catch (err: any) {
        toast({
          title: "Import Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(fileToImport);
  };

  // Mock functions to avoid errors
  const fetchDevices = fetchData;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                External Devices
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your external MQTT devices
              </p>
            </div>

            <Button onClick={() => openDeviceForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>

          {/* Search and Controls */}
          

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
                  <Database className={`h-6 w-6 ${dbStatus === 'connected' ? 'text-emerald-600' : 'text-red-600'}`} />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Database</p>
                    <p className={`text-sm font-medium ${dbStatus === 'connected' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  {connectionStatus === "Connected" ? (
                    <Wifi className="h-6 w-6 text-blue-600" />
                  ) : connectionStatus === "Connecting" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-600" />
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">MQTT Status</p>
                    <p className={`text-sm font-medium ${
                      connectionStatus === 'Connected' ? 'text-emerald-600' :
                      connectionStatus === 'Connecting' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {connectionStatus}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">Active Topics</p>
                    <p className="text-2xl font-bold">
                      {Object.keys(payloads).filter(topic => payloads[topic]).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search devices by name, topic, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={devices.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          {/* Items per page control */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {paginatedDevices.length} of {sortedDevices.length} devices
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="items-per-page" className="text-sm">Items per page:</label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Devices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Device Name
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('topic')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Topic
                        {sortField === 'topic' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-80">Status & Data</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-48"></div></TableCell>
                        <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-8 ml-auto"></div></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No Devices Found</h3>
                          <p className="text-muted-foreground">
                            {searchTerm ? "No devices match your search" : "Get started by adding your first external device"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDevices.map((device) => {
                      const latestPayload = payloads[device.topic];
                      const hasData = !!latestPayload;

                      return (
                        <TableRow key={device.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {device.topic}
                              </Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(device.topic);
                                      toast({
                                        title: "Copied",
                                        description: "Topic copied to clipboard",
                                      });
                                    }}
                                    className="h-6 w-6"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy topic</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {device.address || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`inline-flex items-center rounded-full h-2 w-2 ${
                                    hasData ? "bg-green-500" : "bg-gray-300"
                                  }`}
                                />
                                <span className="text-sm">
                                  {hasData ? "Active" : "Waiting"}
                                </span>
                              </div>

                              {latestPayload && (
                                <div className="flex items-center gap-2">
                                  <code className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border max-w-[150px] truncate">
                                    {latestPayload}
                                  </code>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(latestPayload);
                                          toast({
                                            title: "Copied",
                                            description: "Payload data copied to clipboard",
                                          });
                                        }}
                                        className="h-6 w-6"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy payload data</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setViewingPayload({
                                            topic: device.topic,
                                            payload: latestPayload,
                                          })
                                        }
                                        className="h-7 w-7"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View full payload</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeviceForm(device)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit device</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeviceToDelete(device);
                                      setIsDeleteDeviceDialogOpen(true);
                                    }}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete device</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {/* Page Numbers */}
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10 p-0"
                    >
                      {page}
                    </Button>
                  ))
                ) : (
                  <>
                    {currentPage <= 4 && (
                      <>
                        {[1, 2, 3, 4, 5].map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                        <span className="px-2 text-muted-foreground">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-10 h-10 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}

                    {currentPage > 4 && currentPage < totalPages - 3 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="w-10 h-10 p-0"
                        >
                          1
                        </Button>
                        <span className="px-2 text-muted-foreground">...</span>
                        {[currentPage - 1, currentPage, currentPage + 1].map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                        <span className="px-2 text-muted-foreground">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-10 h-10 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}

                    {currentPage >= totalPages - 3 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="w-10 h-10 p-0"
                        >
                          1
                        </Button>
                        <span className="px-2 text-muted-foreground">...</span>
                        {[totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </>
                    )}
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Device Form Dialog */}
          <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedDevice ? "Edit Device" : "Add New Device"}
                </DialogTitle>
                <DialogDescription>
                  Configure MQTT device information for external monitoring
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name *</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Temperature Sensor"
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-topic">MQTT Topic *</Label>
                  <Input
                    id="device-topic"
                    placeholder="e.g., sensors/temperature"
                    value={deviceForm.topic}
                    onChange={(e) => setDeviceForm({ ...deviceForm, topic: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-address">Address (Optional)</Label>
                  <Input
                    id="device-address"
                    placeholder="e.g., 192.168.1.100"
                    value={deviceForm.address}
                    onChange={(e) => setDeviceForm({ ...deviceForm, address: e.target.value })}
                  />
                </div>

                {selectedDevice && (
                  <div className="space-y-2">
                    <Label>Unique ID (Read-only)</Label>
                    <Input
                      value={selectedDevice.uniqId}
                      disabled
                      className="bg-muted font-mono"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeviceSubmit}
                  disabled={!deviceForm.name.trim() || !deviceForm.topic.trim()}
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
                <AlertDialogDescription>
                  Are you sure you want to delete "{deviceToDelete?.name}"? This action cannot be undone.
                </AlertDialogDescription>
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

          {/* Import Dialog */}
          <Dialog
            open={isImportModalOpen}
            onOpenChange={() => {
              setIsImportModalOpen(false);
              setFileToImport(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Devices</DialogTitle>
                <DialogDescription>
                  Upload a JSON file containing device configurations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">JSON files only</p>
                      {fileToImport && (
                        <p className="text-xs text-primary font-semibold mt-2">
                          Selected: {fileToImport.name}
                        </p>
                      )}
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept=".json"
                      onChange={(e) => setFileToImport(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setFileToImport(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!fileToImport}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Import Devices
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Payload Viewer Dialog */}
          <Dialog
            open={!!viewingPayload}
            onOpenChange={(isOpen) => !isOpen && setViewingPayload(null)}
          >
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Payload Data
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Topic:{" "}
                  <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                    {viewingPayload?.topic}
                  </code>
                </p>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Raw Data</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingPayload?.payload || "");
                      toast({
                        title: "Copied",
                        description: "Payload copied to clipboard",
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border p-4 max-h-[50vh] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap break-all font-mono text-slate-700 dark:text-slate-300">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(viewingPayload?.payload || "{}"),
                          null,
                          2
                        );
                      } catch {
                        return viewingPayload?.payload;
                      }
                    })()}
                  </pre>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setViewingPayload(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default function DevicesExternalPage() {
  return (
    <DevicesExternalContent />
  );
}
