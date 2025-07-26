"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useConnectivity } from "@/hooks/useConnectivity"; // Pastikan path ini benar

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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  HardDrive,
  PlusCircle,
  Database,
  Wifi,
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";

// Definisikan interface untuk tipe data Device
interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

export default function DevicesExternalPage() {
  const { dbStatus, mqttStatus } = useConnectivity();
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk dialog form (Add & Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);

  // State untuk dialog konfirmasi hapus
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  // Fungsi untuk mengambil data dari API
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) throw new Error("Gagal memuat data.");
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil data saat halaman pertama dimuat
  useEffect(() => {
    fetchDevices();
  }, []);

  // Handler untuk membuka dialog form
  const handleOpenForm = (
    mode: "add" | "edit",
    device: Device | null = null
  ) => {
    setDialogMode(mode);
    setCurrentDevice(device);
    setIsFormOpen(true);
    setError(null);
  };

  // Handler untuk submit form (Add & Edit)
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
      fetchDevices(); // Refresh data
    } else {
      const errorData = await response.json();
      setError(errorData.message || "Gagal menyimpan data.");
    }
  };

  // Handler untuk menghapus device
  const handleDelete = async () => {
    if (!deviceToDelete) return;
    const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      fetchDevices(); // Refresh data
    } else {
      alert("Gagal menghapus device.");
    }
    setIsDeleteAlertOpen(false);
  };

  // Handler untuk ekspor data ke JSON
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

  // Handler untuk impor data dari JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        const data = JSON.parse(content as string);
        if (!Array.isArray(data))
          throw new Error("File JSON harus berisi sebuah array.");

        const response = await fetch("/api/devices/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Gagal mengimpor data.");
        }

        alert("Data berhasil diimpor!");
        fetchDevices(); // Refresh data
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input file
  };

  const getStatusColor = (status: string) => {
    if (status === "connecting") return "bg-yellow-400";
    if (status === "connected") return "bg-green-500";
    return "bg-red-500";
  };

  return (
    <TooltipProvider>
      {/* ===== HEADER ===== */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          <h1 className="text-lg font-semibold">External Devices</h1>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger>
              <Database
                className={`h-5 w-5 ${
                  dbStatus === "connected" ? "text-green-500" : "text-red-500"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>Database: {dbStatus}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              {mqttStatus === "connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </TooltipTrigger>
            <TooltipContent>MQTT: {mqttStatus}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={devices.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => importFileRef.current?.click()}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            type="file"
            ref={importFileRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />

          <Button onClick={() => handleOpenForm("add")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Device
          </Button>
        </div>
      </header>

      {/* ===== KONTEN UTAMA HALAMAN ===== */}
      <main className="p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Device</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Unique ID</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : devices.length > 0 ? (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.topic}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {device.uniqId}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm("edit", device)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeviceToDelete(device);
                          setIsDeleteAlertOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Belum ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* ===== DIALOG UNTUK ADD/EDIT FORM ===== */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Device" : "Tambah Device Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Nama Device</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={currentDevice?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  name="topic"
                  defaultValue={currentDevice?.topic}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address (Opsional)</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={currentDevice?.address ?? ""}
                />
              </div>
              {dialogMode === "edit" && (
                <div>
                  <Label>Unique ID (Tidak bisa diubah)</Label>
                  <Input value={currentDevice?.uniqId} disabled />
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== ALERT DIALOG UNTUK KONFIRMASI HAPUS ===== */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Aksi ini tidak dapat dibatalkan. Ini akan menghapus device "
            {deviceToDelete?.name}" secara permanen.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
