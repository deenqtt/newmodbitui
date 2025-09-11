"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import Swal from "sweetalert2";
// Pastikan MqttProvider juga diimpor
import { useMqtt, MqttProvider } from "@/contexts/MqttContext";

// --- Komponen UI & Ikon ---
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  HardDrive,
  PlusCircle,
  Database,
  Wifi,
  WifiOff,
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Loader2,
  UploadCloud,
  Eye,
  Search,
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function DevicesExternalContent() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { isReady, connectionStatus, subscribe, unsubscribe } = useMqtt();
  const [dbStatus, setDbStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [viewingPayload, setViewingPayload] = useState<{
    topic: string;
    payload: string;
  } | null>(null);

  // Filter devices based on search term
  const filteredDevices = useMemo(() => {
    if (!searchTerm) return devices;
    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) throw new Error("Failed to load data.");
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: "Failed to Load Data",
        text: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch("/api/health");
        setDbStatus(res.ok ? "connected" : "disconnected");
      } catch (error) {
        setDbStatus("disconnected");
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
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

  const handleOpenForm = (
    mode: "add" | "edit",
    device: Device | null = null
  ) => {
    setDialogMode(mode);
    setCurrentDevice(device);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      topic: formData.get("topic") as string,
      address: formData.get("address") as string,
    };
    const url =
      dialogMode === "edit"
        ? `/api/devices/external/${currentDevice?.id}`
        : "/api/devices/external";
    const method = dialogMode === "edit" ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      setIsFormOpen(false);
      Toast.fire({ icon: "success", title: "Device data saved!" });
      fetchDevices();
    } else {
      const errorData = await response.json();
      Toast.fire({
        icon: "error",
        title: errorData.message || "Failed to save data.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      Toast.fire({ icon: "success", title: "Device deleted!" });
      fetchDevices();
    } else {
      Toast.fire({ icon: "error", title: "Failed to delete the device." });
    }
    setIsDeleteAlertOpen(false);
  };

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
  };

  const handleImport = async () => {
    if (!fileToImport) return;
    Swal.fire({
      title: "Importing...",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
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
        if (!response.ok) throw new Error(result.message || "Import failed.");
        Swal.close();
        Toast.fire({
          icon: "success",
          title: "Import Complete!",
          html: `Created: <b>${result.created}</b><br>Updated: <b>${result.updated}</b><br>Skipped: <b>${result.skipped}</b>`,
        });
        fetchDevices();
        setIsImportModalOpen(false);
        setFileToImport(null);
      } catch (err: any) {
        Swal.close();
        Toast.fire({
          icon: "error",
          title: "Import Failed",
          text: err.message,
        });
      }
    };
    reader.readAsText(fileToImport);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "Connected":
        return "text-emerald-600 dark:text-emerald-400";
      case "connecting":
      case "Connecting":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-red-600 dark:text-red-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "Connected":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "connecting":
      case "Connecting":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className=" p-4 md:p-6 space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <HardDrive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  External Devices
                </h1>
                <p className="text-muted-foreground">
                  Manage and monitor your external MQTT devices
                </p>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Devices
                    </p>
                    <p className="text-3xl font-bold">{devices.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <HardDrive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Database
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getStatusBadge(dbStatus)}
                        variant="secondary"
                      >
                        {dbStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Database
                      className={`h-6 w-6 ${getStatusColor(dbStatus)}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      MQTT Status
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getStatusBadge(connectionStatus)}
                        variant="secondary"
                      >
                        {connectionStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                    {connectionStatus === "Connected" ? (
                      <Wifi className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    ) : connectionStatus === "Connecting" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                    ) : (
                      <WifiOff className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Device Management</CardTitle>
                  <CardDescription>
                    Monitor real-time data and manage your external devices
                  </CardDescription>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchDevices}
                      disabled={isLoading}
                      className="whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          isLoading ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={devices.length === 0}
                      className="whitespace-nowrap"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImportModalOpen(true)}
                      className="whitespace-nowrap"
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenForm("add")}
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Device
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="pt-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Device Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Topic
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Status & Data
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-48">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">
                              Loading devices...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredDevices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-48">
                          <div className="flex flex-col items-center gap-3">
                            <HardDrive className="h-12 w-12 text-muted-foreground/50" />
                            <div className="space-y-1">
                              <p className="text-muted-foreground font-medium">
                                {searchTerm
                                  ? "No devices found"
                                  : "No devices available"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {searchTerm
                                  ? "Try adjusting your search terms"
                                  : "Add your first external device to get started"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDevices.map((device) => {
                        const latestPayload = payloads[device.topic];
                        const hasData = !!latestPayload;

                        return (
                          <TableRow
                            key={device.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                          >
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {device.name}
                                </p>
                                {device.address && (
                                  <p className="text-xs text-muted-foreground">
                                    {device.address}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {device.topic}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      hasData ? "bg-green-500" : "bg-gray-300"
                                    }`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {hasData ? "Active" : "Waiting"}
                                  </span>
                                </div>

                                {latestPayload && (
                                  <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border max-w-[200px] truncate">
                                      {latestPayload}
                                    </code>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-slate-200 dark:hover:bg-slate-700"
                                          onClick={() =>
                                            setViewingPayload({
                                              topic: device.topic,
                                              payload: latestPayload,
                                            })
                                          }
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        View full payload
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                      onClick={() =>
                                        handleOpenForm("edit", device)
                                      }
                                    >
                                      <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit device</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                      onClick={() => {
                                        setDeviceToDelete(device);
                                        setIsDeleteAlertOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {dialogMode === "edit" ? "Edit Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            id="deviceForm"
            className="space-y-6 pt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Device Name *
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={currentDevice?.name}
                placeholder="Enter device name"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                MQTT Topic *
              </Label>
              <Input
                id="topic"
                name="topic"
                defaultValue={currentDevice?.topic}
                placeholder="e.g. sensors/temperature"
                required
                className="h-10 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Address (Optional)
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={currentDevice?.address ?? ""}
                placeholder="e.g. 192.168.1.100"
                className="h-10"
              />
            </div>
            {dialogMode === "edit" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Unique ID (Read-only)
                </Label>
                <Input
                  value={currentDevice?.uniqId}
                  disabled
                  className="h-10 bg-muted font-mono"
                />
              </div>
            )}
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="deviceForm">
              {dialogMode === "edit" ? "Update Device" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete "{deviceToDelete?.name}"? This
            action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Devices</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Upload a JSON file containing an array of device configurations.
            </p>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                  <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
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
              <p className="text-sm font-medium text-muted-foreground">
                Raw Data
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(viewingPayload?.payload || "");
                  Toast.fire({
                    icon: "success",
                    title: "Copied to clipboard!",
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
    </TooltipProvider>
  );
}

export default function DevicesExternalPage() {
  return (
    <MqttProvider>
      <DevicesExternalContent />
    </MqttProvider>
  );
}
