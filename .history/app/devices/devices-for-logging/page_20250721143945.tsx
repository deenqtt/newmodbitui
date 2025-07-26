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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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

// =================================================================
// KONTEN UTAMA HALAMAN DIPINDAHKAN KE KOMPONEN SENDIRI
// =================================================================
function DevicesForLoggingContent() {
  // --- Hooks & State ---
  const { isReady, subscribe, unsubscribe } = useMqtt();

  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // --- MQTT Subscription Logic (Diperbaiki) ---
  useEffect(() => {
    // Keluar jika modal tidak terbuka, tidak ada device dipilih, atau MQTT belum siap.
    // Ini adalah "guard clause" utama untuk logic subscription.
    if (!isModalOpen || !selectedDeviceForModal || !isReady) {
      return;
    }

    const topic = selectedDeviceForModal.topic;

    // Definisikan message handler di dalam scope useEffect.
    const handleMessage = (messageTopic: string, payloadString: string) => {
      // Pastikan pesan datang dari topic yang benar.
      if (messageTopic === topic) {
        setIsPayloadLoading(false); // Berhenti loading saat pesan pertama datang.
        try {
          const parsedPayload = JSON.parse(payloadString);
          setModalPayload(parsedPayload);
          console.log(
            `[Logging Page] Payload updated for ${topic}`,
            parsedPayload
          );
        } catch (e) {
          console.error(
            `[Logging Page] Could not parse payload for ${topic}:`,
            payloadString,
            e
          );
          setModalPayload({ error: "Invalid JSON payload received." });
        }
      }
    };

    console.log(`[Logging Page] Subscribing to topic: ${topic}`);
    subscribe(topic, handleMessage);
    setIsPayloadLoading(true); // Mulai loading saat subscribe.

    // --- FUNGSI CLEANUP (PEMBERSIHAN) ---
    // Fungsi ini akan dipanggil secara otomatis oleh React ketika:
    // 1. Komponen di-unmount (pindah halaman).
    // 2. Salah satu dependensi di dalam array [..] berubah (misal: modal ditutup atau device lain dipilih).
    // Ini adalah cara yang benar untuk menangani unsubscribe.
    return () => {
      console.log(`[Logging Page] Cleanup: Unsubscribing from topic: ${topic}`);
      unsubscribe(topic, handleMessage);
      setModalPayload(null); // Reset payload saat unsubscribe.
      setIsPayloadLoading(false); // Berhenti loading.
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
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- Form & Modal Handlers ---

  // PERUBAHAN LOGIKA: Mengambil key dari dalam properti `value`
  const availableKeys = useMemo(() => {
    // Cek jika payload ada dan properti 'value' adalah string
    if (!modalPayload || typeof modalPayload.value !== "string") {
      return [];
    }

    try {
      // Coba parse string JSON yang ada di dalam field 'value'
      const innerPayload = JSON.parse(modalPayload.value);

      // Gunakan flattenObject pada objek hasil parse untuk mendapatkan semua key, termasuk yang nested.
      const flattenedKeys = Object.keys(flattenObject(innerPayload));
      console.log("[availableKeys] Found keys inside 'value':", flattenedKeys);
      return flattenedKeys;
    } catch (e) {
      console.error(
        "[availableKeys] Failed to parse modalPayload.value:",
        modalPayload.value,
        e
      );
      return []; // Kembalikan array kosong jika parse gagal
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // State lain akan di-reset oleh useEffect cleanup karena `isModalOpen` berubah.
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    // TODO: Implement save logic to your API
    console.log("Saving config:", currentConfig);
    Swal.fire("Saved!", "Configuration has been saved.", "success");
    handleCloseModal();
    fetchInitialData(); // Refresh data
  };
  const handleDelete = async (id: string) => {
    // TODO: Implement delete logic to your API
    console.log("Deleting config:", id);
    Swal.fire("Deleted!", "Configuration has been deleted.", "success");
    fetchInitialData(); // Refresh data
  };

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <FileClock className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Devices for Logging</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Log File Management</CardTitle>
            <CardDescription>
              Upload or download the logging configuration as a JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input type="file" accept=".json" className="max-w-xs" />
            <Button>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Logging Key Configuration</CardTitle>
                <CardDescription>
                  Select which keys from a device's payload you want to log
                  periodically.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenModal("add")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Custom Name</TableHead>
                    <TableHead>Key to Log</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : loggingConfigs.length > 0 ? (
                    loggingConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.device.name}
                        </TableCell>
                        <TableCell>{config.customName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {config.key}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal("edit", config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center h-24 text-muted-foreground"
                      >
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

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode
                ? "Edit Key Configuration"
                : "Add New Key Configuration"}
            </DialogTitle>
            <DialogDescription>
              Select a device and the key from its payload you wish to log.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label>Select Device</Label>
              <Select
                onValueChange={handleDeviceSelectInModal}
                value={selectedDeviceForModal?.uniqId}
                disabled={isUpdateMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent>
                  {allDevices.map((d) => (
                    <SelectItem key={d.uniqId} value={d.uniqId}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDeviceForModal && (
              <div>
                <Label>Select Key from Payload</Label>
                <Select
                  onValueChange={(val) =>
                    setCurrentConfig((prev) => ({ ...prev, key: val }))
                  }
                  value={currentConfig.key}
                  disabled={isPayloadLoading || availableKeys.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a key..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isPayloadLoading ? (
                      <div className="p-2 text-sm text-muted-foreground flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Waiting for payload...
                      </div>
                    ) : availableKeys.length > 0 ? (
                      availableKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No payload received or payload is empty.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Custom Name</Label>
              <Input
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                placeholder="e.g., Server Room Temperature"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Units (Optional)</Label>
                <Input
                  value={currentConfig.units || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      units: e.target.value,
                    }))
                  }
                  placeholder="e.g., °C, %, Volts"
                />
              </div>
              <div>
                <Label>Multiply Factor (Optional)</Label>
                <Input
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">Save Configuration</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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
