"use client";

import { useState, useEffect, useRef, type FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useConnectivity } from "@/hooks/useConnectivity";

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
  Eye,
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
} from "lucide-react";

// Definisikan tipe data untuk sebuah device
interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

export default function DevicesExternalPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const topics = useMemo(() => devices.map((d) => d.topic), [devices]);

  const { dbStatus, mqttStatus, payloads } = useConnectivity(topics);
  const [viewingPayload, setViewingPayload] = useState<{
    topic: string;
    payload: string;
  } | null>(null);

  const router = useRouter();
  const importFileRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);

  // --- Fungsi-Fungsi ---
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) throw new Error("Gagal memuat data.");
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

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
      Swal.fire({
        icon: "success",
        title: "Sukses!",
        text: "Data device berhasil disimpan.",
      });
      fetchDevices();
    } else {
      const errorData = await response.json();
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: errorData.message || "Gagal menyimpan data.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      Swal.fire("Terhapus!", "Device telah dihapus.", "success");
      fetchDevices();
    } else {
      Swal.fire("Gagal!", "Device gagal dihapus.", "error");
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
      title: "Mengimpor...",
      text: "Mohon tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

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
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.message || "Gagal mengimpor data.");

        Swal.fire({
          icon: "success",
          title: "Impor Selesai!",
          html: `Dibuat: <b>${result.created}</b><br>Diperbarui: <b>${result.updated}</b><br>Dilewati: <b>${result.skipped}</b>`,
        });

        fetchDevices();
        setIsImportModalOpen(false);
        setFileToImport(null);
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Oops...", text: err.message });
      }
    };
    reader.readAsText(fileToImport);
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
                  dbStatus === "connected"
                    ? "text-green-500"
                    : dbStatus === "connecting"
                    ? "text-yellow-400"
                    : "text-red-500"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>Database: {dbStatus}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              {mqttStatus === "connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : mqttStatus === "connecting" ? (
                <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
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
            onClick={() => setIsImportModalOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
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
                <TableHead>Payload Terbaru</TableHead>
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
                    {/* --- SEL PAYLOAD BARU --- */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {latestPayload ? (
                          <>
                            <span className="font-mono text-xs truncate max-w-[150px]">
                              {latestPayload}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                setViewingPayload({
                                  topic: device.topic,
                                  payload: latestPayload,
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Menunggu data...
                          </span>
                        )}
                      </div>
                    </TableCell>
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
          <form
            onSubmit={handleSubmit}
            id="deviceForm"
            className="space-y-4 pt-4"
          >
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
          </form>
          <DialogFooter>
            <Button type="submit" form="deviceForm">
              Simpan
            </Button>
          </DialogFooter>
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
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL BARU UNTUK IMPORT ===== */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Devices dari JSON</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Pilih file JSON yang berisi array data device.
            </p>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Klik untuk unggah</span>{" "}
                    atau seret file
                  </p>
                  {fileToImport && (
                    <p className="text-xs text-foreground font-semibold">
                      {fileToImport.name}
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportModalOpen(false);
                setFileToImport(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={handleImport} disabled={!fileToImport}>
              <FileUp className="mr-2 h-4 w-4" />
              Mulai Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ===== MODAL BARU UNTUK MELIHAT PAYLOAD LENGKAP ===== */}
      <Dialog
        open={!!viewingPayload}
        onOpenChange={(isOpen) => !isOpen && setViewingPayload(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payload dari Topic: {viewingPayload?.topic}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-muted rounded-md p-4 max-h-[60vh] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-all">
              {/* Coba format jika payload adalah JSON, jika tidak tampilkan apa adanya */}
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
          <DialogFooter>
            <Button onClick={() => setViewingPayload(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
