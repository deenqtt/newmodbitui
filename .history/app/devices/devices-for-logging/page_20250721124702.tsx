"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useConnectivity } from "@/hooks/useConnectivity";

// --- Komponen UI & Ikon ---
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

// --- Tipe Data ---
interface Device {
  id: string;
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
  device: Device;
}

// --- Fungsi Helper untuk meratakan JSON ---
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

export default function DevicesForLoggingPage() {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk modal & form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<LoggingConfig>>(
    {}
  );
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<Device | null>(null);

  // State untuk upload/download
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const topics = useMemo(() => allDevices.map((d) => d.topic), [allDevices]);
  const { payloads } = useConnectivity(topics);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [configsRes, devicesRes] = await Promise.all([
        fetch("/api/logging-configs"),
        fetch("/api/devices/for-selection"), // <-- MENJADI SEPERTI INI
      ]);
      if (!configsRes.ok || !devicesRes.ok)
        throw new Error("Gagal memuat data awal.");

      const configsData = await configsRes.json();
      const devicesData = await devicesRes.json();

      setLoggingConfigs(configsData);
      setAllDevices(devicesData);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Logika Modal ---
  const availableKeysForSelectedDevice = useMemo(() => {
    if (!selectedDeviceForModal) return [];
    const payload = payloads[selectedDeviceForModal.topic];
    if (!payload) return [];
    try {
      const parsedPayload = JSON.parse(payload);
      return Object.keys(flattenObject(parsedPayload));
    } catch {
      return [];
    }
  }, [selectedDeviceForModal, payloads]);

  const handleDeviceSelect = (uniqId: string) => {
    const device = allDevices.find((d) => d.uniqId === uniqId);
    setSelectedDeviceForModal(device || null);
    setCurrentConfig((prev) => ({ ...prev, deviceUniqId: uniqId }));
  };

  const handleOpenModal = (
    mode: "add" | "edit",
    config: LoggingConfig | null = null
  ) => {
    setIsUpdateMode(mode === "edit");
    if (mode === "edit" && config) {
      setCurrentConfig(config);
      const device = allDevices.find((d) => d.uniqId === config.device.uniqId);
      setSelectedDeviceForModal(device || null);
    } else {
      setCurrentConfig({ multiply: 1 });
      setSelectedDeviceForModal(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const url = isUpdateMode
      ? `/api/logging-configs/${currentConfig.id}`
      : "/api/logging-configs";
    const method = isUpdateMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentConfig),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      Swal.fire("Sukses!", "Konfigurasi berhasil disimpan.", "success");
      setIsModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  // --- Upload/Download Handlers ---
  const handleDownload = () => {
    /* Logika untuk download */
  };
  const handleUpload = async () => {
    /* Logika untuk upload */
  };

  return (
    <div className="flex flex-col h-screen">
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
            <CardTitle>Manajemen File Log</CardTitle>
            <CardDescription>
              Upload atau download konfigurasi logging dalam format JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="file"
              accept=".json"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}{" "}
              Upload
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Konfigurasi Key untuk Logging</CardTitle>
                <CardDescription>
                  Pilih key dari payload device yang ingin Anda simpan secara
                  periodik.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenModal("add")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Custom Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Data Real-time</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : (
                  loggingConfigs.map((config) => {
                    const latestPayload = payloads[config.device.topic];
                    let realtimeValue = "Menunggu data...";
                    if (latestPayload) {
                      try {
                        const parsed = flattenObject(JSON.parse(latestPayload));
                        realtimeValue =
                          parsed[config.key] !== undefined
                            ? `${(
                                parsed[config.key] * (config.multiply || 1)
                              ).toFixed(2)} ${config.units || ""}`
                            : "Key tidak ditemukan";
                      } catch {
                        realtimeValue = "Payload error";
                      }
                    }
                    return (
                      <TableRow key={config.id}>
                        <TableCell>{config.device.name}</TableCell>
                        <TableCell>{config.customName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {config.key}
                        </TableCell>
                        <TableCell>{realtimeValue}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal("edit", config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Tombol Delete bisa ditambahkan di sini */}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode
                ? "Edit Konfigurasi Key"
                : "Tambah Konfigurasi Key Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label>Pilih Device</Label>
              <Select
                onValueChange={handleDeviceSelect}
                value={currentConfig.deviceUniqId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih device..." />
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
                <Label>Pilih Key dari Payload</Label>
                <Select
                  onValueChange={(val) =>
                    setCurrentConfig((prev) => ({ ...prev, key: val }))
                  }
                  value={currentConfig.key}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih key..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKeysForSelectedDevice.length > 0 ? (
                      availableKeysForSelectedDevice.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        Menunggu payload...
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Nama Custom</Label>
              <Input
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                placeholder="e.g., Suhu Ruang Server"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Satuan (Opsional)</Label>
                <Input
                  value={currentConfig.units || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      units: e.target.value,
                    }))
                  }
                  placeholder="e.g., °C, %, Volt"
                />
              </div>
              <div>
                <Label>Faktor Pengali (Opsional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={currentConfig.multiply || 1}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      multiply: parseFloat(e.target.value),
                    }))
                  }
                  placeholder="e.g., 0.1, 100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Simpan Konfigurasi</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
