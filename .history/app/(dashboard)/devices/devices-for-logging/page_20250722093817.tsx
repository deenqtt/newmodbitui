"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import Swal from "sweetalert2";
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
import {
  FileClock,
  Edit,
  Trash2,
  PlusCircle,
  Download,
  Upload,
  Loader2,
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

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function DevicesForLoggingContent() {
  const { isReady, subscribe, unsubscribe } = useMqtt();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<LoggingConfig>>({});
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<DeviceSelection | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [isPayloadLoading, setIsPayloadLoading] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<LoggingConfig | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen || !selectedDeviceForModal || !isReady) return;
    const topic = selectedDeviceForModal.topic;
    const handleMessage = (messageTopic: string, payloadString: string) => {
      if (messageTopic === topic) {
        setIsPayloadLoading(false);
        try {
          setModalPayload(JSON.parse(payloadString));
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
      Toast.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      customName: currentConfig.customName,
      key: currentConfig.key,
      units: currentConfig.units,
      multiply: currentConfig.multiply,
      deviceUniqId: selectedDeviceForModal?.uniqId,
    };
    const url = isUpdateMode ? `/api/logging-configs/${currentConfig.id}` : "/api/logging-configs";
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
      Toast.fire({ icon: "success", title: "Configuration saved!" });
      handleCloseModal();
      fetchInitialData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    try {
      const response = await fetch(`/api/logging-configs/${configToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete configuration.");
      }
      Toast.fire({ icon: "success", title: "Configuration deleted!" });
      fetchInitialData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleDownload = () => {
    if (loggingConfigs.length === 0) {
      Toast.fire({ icon: "info", title: "No configuration to download." });
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
    link.download = `logging-configurations-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      Toast.fire({ icon: "error", title: "Please select a valid JSON file." });
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
        Swal.fire({
          title: "Importing...",
          text: "Please wait while we process your file.",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const response = await fetch("/api/logging-configs/batch-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        Swal.close();
        Toast.fire({
          icon: "success",
          title: "Import Complete!",
          html: `Created/Updated: <b>${result.created}</b><br>Skipped: <b>${result.skipped}</b>`,
        });
        fetchInitialData();
      } catch (err: any) {
        Swal.close();
        Toast.fire({ icon: "error", title: "Import Failed", text: err.message });
      } finally {
        if (uploadInputRef.current) uploadInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="p-4 md:p-6 space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Log File Management</CardTitle>
          <CardDescription>
            Upload or download the logging configuration as a JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <input
            type="file"
            accept=".json"
            ref={uploadInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => uploadInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Logging Key Configuration</CardTitle>
              <CardDescription>
                Select keys from a device's payload to log periodically.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal("add")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Device</TableHead>
                  <TableHead className="font-semibold">Custom Name</TableHead>
                  <TableHead className="font-semibold">Key to Log</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : loggingConfigs.length > 0 ? (
                  loggingConfigs.map((config) => (
                    <TableRow key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                        {config.device.name}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {config.customName}
                      </TableCell>
                      <TableCell className="font-mono text-xs bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 inline-block">
                        {config.key}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal("edit", config)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setConfigToDelete(config); setIsDeleteAlertOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-48 text-gray-500">
                      No configurations found. Click "Add Key" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>

    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isUpdateMode ? "Edit Key Configuration" : "Add New Key Configuration"}</DialogTitle>
          <DialogDescription>
            Select a device and the key from its payload you wish to log.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="device-select">Select Device</Label>
            <Select onValueChange={handleDeviceSelectInModal} value={selectedDeviceForModal?.uniqId} disabled={isUpdateMode}>
              <SelectTrigger id="device-select"><SelectValue placeholder="Select a device..." /></SelectTrigger>
              <SelectContent>
                {allDevices.map((d) => (<SelectItem key={d.uniqId} value={d.uniqId}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {selectedDeviceForModal && (
            <div>
              <Label htmlFor="key-select">Select Key from Payload</Label>
              <Select onValueChange={(val) => setCurrentConfig((prev) => ({ ...prev, key: val }))} value={currentConfig.key} disabled={isPayloadLoading || availableKeys.length === 0}>
                <SelectTrigger id="key-select"><SelectValue placeholder="Select a key..." /></SelectTrigger>
                <SelectContent>
                  {isPayloadLoading ? (
                    <div className="p-4 text-sm text-muted-foreground flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Waiting for payload...
                    </div>
                  ) : availableKeys.length > 0 ? (
                    availableKeys.map((k) => (<SelectItem key={k} value={k}>{k}</SelectItem>))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No payload received or payload is empty.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="custom-name">Custom Name</Label>
            <Input id="custom-name" value={currentConfig.customName || ""} onChange={(e) => setCurrentConfig((prev) => ({ ...prev, customName: e.target.value }))} placeholder="e.g., Server Room Temperature" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="units">Units (Optional)</Label>
              <Input id="units" value={currentConfig.units || ""} onChange={(e) => setCurrentConfig((prev) => ({ ...prev, units: e.target.value }))} placeholder="e.g., °C, %, Volts" />
            </div>
            <div>
              <Label htmlFor="multiply">Multiply Factor (Optional)</Label>
              <Input id="multiply" type="number" step="any" value={currentConfig.multiply ?? 1} onChange={(e) => setCurrentConfig((prev) => ({ ...prev, multiply: parseFloat(e.target.value) || 1, }))} placeholder="e.g., 0.1, 100" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the logging configuration for "{configToDelete?.customName}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfigToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  );
}

export default function DevicesForLoggingPage() {
  return (
    <MqttProvider>
      <DevicesForLoggingContent />
    </MqttProvider>
  );
}
