"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { showToast } from "@/lib/toast-utils";
// Impor MqttProvider dan useMqtt
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileClock,
  Edit,
  Trash2,
  PlusCircle,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Database,
  Activity,
  Settings,
  FileText,
  Search,
  RefreshCw,
} from "lucide-react";

// --- Type Definitions ---
interface DeviceSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface LoggingConfig {
  id: string;
  customName: string;
  key: string;
  units: string | null;
  multiply: number | null;
  device: DeviceSelection;
}

// --- Helper Function to flatten nested JSON objects ---
const flattenObject = (
  obj: any,
  parent: string = "",
  res: Record<string, any> = {}
) => {
  for (let key in obj) {
    const propName = parent ? `${parent}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      !Array.isArray(obj[key]) &&
      obj[key] !== null
    ) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
};

// Confirmation Dialog State - MOVED INSIDE COMPONENT

// =================================================================
// KONTEN UTAMA HALAMAN DIPINDAHKAN KE KOMPONEN SENDIRI
// =================================================================
function DevicesForLoggingContent() {
  // --- Hooks & State ---
  const { isReady, subscribe, unsubscribe } = useMqtt();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<LoggingConfig>>(
    {}
  );
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<DeviceSelection | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [isPayloadLoading, setIsPayloadLoading] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<LoggingConfig | null>(
    null
  );
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Filter configs based on search term
  const filteredConfigs = useMemo(() => {
    if (!searchTerm) return loggingConfigs;
    return loggingConfigs.filter(
      (config) =>
        config.customName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [loggingConfigs, searchTerm]);

  // --- MQTT Subscription Logic ---
  useEffect(() => {
    if (!isModalOpen || !selectedDeviceForModal || !isReady) {
      return;
    }
    const topic = selectedDeviceForModal.topic;
    const handleMessage = (messageTopic: string, payloadString: string) => {
      if (messageTopic === topic) {
        setIsPayloadLoading(false);
        try {
          const parsedPayload = JSON.parse(payloadString);
          setModalPayload(parsedPayload);
        } catch (e) {
          setModalPayload({ error: "Invalid JSON payload received." });
        }
      }
    };
    subscribe(topic, handleMessage);
    setIsPayloadLoading(true);
    return () => {
      unsubscribe(topic, handleMessage);
      setModalPayload(null);
      setIsPayloadLoading(false);
    };
  }, [isModalOpen, selectedDeviceForModal, isReady, subscribe, unsubscribe]);

  // --- Data Fetching ---
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [configsRes, devicesRes] = await Promise.all([
        fetch("/api/logging-configs"),
        fetch("/api/devices/for-selection"),
      ]);
      if (!configsRes.ok || !devicesRes.ok)
        throw new Error("Failed to load initial data.");
      setLoggingConfigs(await configsRes.json());
      setAllDevices(await devicesRes.json());
    } catch (err: any) {
      showToast.error("Failed to load initial data", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- Form & Modal Handlers ---
  const availableKeys = useMemo(() => {
    if (!modalPayload || typeof modalPayload.value !== "string") return [];
    try {
      const innerPayload = JSON.parse(modalPayload.value);
      return Object.keys(flattenObject(innerPayload));
    } catch (e) {
      return [];
    }
  }, [modalPayload]);

  const handleDeviceSelectInModal = (uniqId: string) => {
    const device = allDevices.find((d) => d.uniqId === uniqId);
    setSelectedDeviceForModal(device || null);
    setModalPayload(null);
    setCurrentConfig((prev) => ({ ...prev, device: device, key: "" }));
  };

  const handleOpenModal = (
    mode: "add" | "edit",
    config: LoggingConfig | null = null
  ) => {
    setIsUpdateMode(mode === "edit");
    if (mode === "edit" && config) {
      setCurrentConfig(config);
      setSelectedDeviceForModal(config.device);
    } else {
      setCurrentConfig({ multiply: 1 });
      setSelectedDeviceForModal(null);
    }
    setModalPayload(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  // --- CRUD Functions ---
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      customName: currentConfig.customName,
      key: currentConfig.key,
      units: currentConfig.units,
      multiply: currentConfig.multiply,
      deviceUniqId: selectedDeviceForModal?.uniqId,
    };
    const url = isUpdateMode
      ? `/api/logging-configs/${currentConfig.id}`
      : "/api/logging-configs";
    const method = isUpdateMode ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save configuration.");
      }
      showToast.success("Configuration saved!");
      handleCloseModal();
      fetchInitialData();
    } catch (error: any) {
      showToast.error("Save failed", error.message);
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    try {
      const response = await fetch(
        `/api/logging-configs/${configToDelete.id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete configuration.");
      }
      showToast.success("Configuration deleted!");
      fetchInitialData();
    } catch (error: any) {
      showToast.error("Deletion failed", error.message);
    } finally {
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
    }
  };

  // --- Download & Upload Handlers ---
  const handleDownload = () => {
    if (loggingConfigs.length === 0) {
      showToast.info("No configuration to download");
      return;
    }
    const dataToDownload = loggingConfigs.map((c) => ({
      customName: c.customName,
      key: c.key,
      units: c.units,
      multiply: c.multiply,
      deviceUniqId: c.device.uniqId,
    }));
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToDownload, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `logging-configurations-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/json") {
      showToast.error("Please select a valid JSON file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
          throw new Error("JSON file must contain an array of configurations.");
        }
        // Show loading state
        showToast.success("Importing configurations...");

        const response = await fetch("/api/logging-configs/batch-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        // Show success result
        showToast.success(`Import Complete! Created/Updated: ${result.created}, Skipped: ${result.skipped}`);
        fetchInitialData();
      } catch (err: any) {
        showToast.error("Import Failed", err.message);
      } finally {
        if (uploadInputRef.current) uploadInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-6 space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileClock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Logging Configuration
                </h1>
                <p className="text-muted-foreground">
                  Configure which data points to log from your MQTT devices
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Configs
                    </p>
                    <p className="text-3xl font-bold">
                      {loggingConfigs.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Available Devices
                    </p>
                    <p className="text-3xl font-bold">{allDevices.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Database className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Logs
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {loggingConfigs.filter((c) => c.key).length}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                    <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File Management Card */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Configuration Management
                  </CardTitle>
                  <CardDescription>
                    Import or export your logging configurations as JSON files
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="file"
                  accept=".json"
                  ref={uploadInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex-1 sm:flex-none"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Configuration
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={loggingConfigs.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Configuration Table */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    Logging Keys Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage which data points are being logged from your devices
                  </CardDescription>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInitialData}
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
                    size="sm"
                    onClick={() => handleOpenModal("add")}
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Configuration
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="pt-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search configurations..."
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
                        Device
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Configuration
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Data Key
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
                              Loading configurations...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-48">
                          <div className="flex flex-col items-center gap-3">
                            <Settings className="h-12 w-12 text-muted-foreground/50" />
                            <div className="space-y-1">
                              <p className="text-muted-foreground font-medium">
                                {searchTerm
                                  ? "No configurations found"
                                  : "No configurations available"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {searchTerm
                                  ? "Try adjusting your search terms"
                                  : "Add your first logging configuration to get started"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConfigs.map((config) => (
                        <TableRow
                          key={config.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                        >
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {config.device.name}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                {config.device.topic}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {config.customName}
                              </p>
                              <div className="flex items-center gap-2">
                                {config.units && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {config.units}
                                  </Badge>
                                )}
                                {config.multiply && config.multiply !== 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    ×{config.multiply}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <code className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border font-mono">
                              {config.key}
                            </code>
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
                                      handleOpenModal("edit", config)
                                    }
                                  >
                                    <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Edit configuration
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      setConfigToDelete(config);
                                      setIsDeleteAlertOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Delete configuration
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configuration Dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isUpdateMode
                ? "Edit Logging Configuration"
                : "Add New Logging Configuration"}
            </DialogTitle>
            <DialogDescription>
              Configure which data points from your MQTT devices should be
              logged
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="device-select" className="text-sm font-medium">
                Select Device *
              </Label>
              <Select
                onValueChange={handleDeviceSelectInModal}
                value={selectedDeviceForModal?.uniqId}
                disabled={isUpdateMode}
              >
                <SelectTrigger id="device-select" className="h-10">
                  <SelectValue placeholder="Choose a device to configure..." />
                </SelectTrigger>
                <SelectContent>
                  {allDevices.map((d) => (
                    <SelectItem key={d.uniqId} value={d.uniqId}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {d.topic}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDeviceForModal && (
              <div className="space-y-2">
                <Label htmlFor="key-select" className="text-sm font-medium">
                  Select Data Key *
                </Label>
                <Select
                  onValueChange={(val) =>
                    setCurrentConfig((prev) => ({ ...prev, key: val }))
                  }
                  value={currentConfig.key}
                  disabled={isPayloadLoading || availableKeys.length === 0}
                >
                  <SelectTrigger id="key-select" className="h-10">
                    <SelectValue placeholder="Choose a data key to log..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isPayloadLoading ? (
                      <div className="p-4 text-sm text-muted-foreground flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Waiting for device data...
                      </div>
                    ) : availableKeys.length > 0 ? (
                      availableKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          <code className="font-mono">{k}</code>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No data received from device. Make sure the device is
                        sending data.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {isPayloadLoading && (
                  <p className="text-xs text-muted-foreground">
                    Listening for data from {selectedDeviceForModal.name}...
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-name" className="text-sm font-medium">
                Display Name *
              </Label>
              <Input
                id="custom-name"
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                placeholder="e.g., Server Room Temperature"
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="units" className="text-sm font-medium">
                  Units (Optional)
                </Label>
                <Input
                  id="units"
                  value={currentConfig.units || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      units: e.target.value,
                    }))
                  }
                  placeholder="e.g., °C, %, V, A"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiply" className="text-sm font-medium">
                  Multiplier (Optional)
                </Label>
                <Input
                  id="multiply"
                  type="number"
                  step="any"
                  value={currentConfig.multiply ?? 1}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      multiply: parseFloat(e.target.value) || 1,
                    }))
                  }
                  placeholder="e.g., 0.1, 100"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Factor to multiply the raw value (default: 1)
                </p>
              </div>
            </div>

            {/* Preview Section */}
            {selectedDeviceForModal && currentConfig.key && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Configuration Preview
                </Label>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Device:</span>
                    <span className="font-medium">
                      {selectedDeviceForModal.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Data Key:</span>
                    <code className="px-1.5 py-0.5 bg-background rounded text-xs">
                      {currentConfig.key}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Display Name:</span>
                    <span className="font-medium">
                      {currentConfig.customName || "Not set"}
                    </span>
                  </div>
                  {currentConfig.units && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Units:</span>
                      <Badge variant="secondary" className="text-xs">
                        {currentConfig.units}
                      </Badge>
                    </div>
                  )}
                  {currentConfig.multiply && currentConfig.multiply !== 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Multiplier:</span>
                      <Badge variant="outline" className="text-xs">
                        ×{currentConfig.multiply}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="deviceForm"
              onClick={handleSave}
              disabled={
                !selectedDeviceForModal ||
                !currentConfig.key ||
                !currentConfig.customName
              }
            >
              {isUpdateMode ? "Update Configuration" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete the logging configuration for "
            {configToDelete?.customName}"? This action cannot be undone and will
            stop logging this data point.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfigToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// =================================================================
// INI KOMPONEN HALAMAN UTAMA YANG SEKARANG MENYEDIAKAN PROVIDER
// =================================================================
export default function DevicesForLoggingPage() {
  return (
    <MqttProvider>
      <DevicesForLoggingContent />
    </MqttProvider>
  );
}
