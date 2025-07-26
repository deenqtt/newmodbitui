"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext"; // Ganti useConnectivity dengan useMqtt

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
  WifiOff,
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Loader2,
  UploadCloud,
  Eye,
} from "lucide-react";

interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

export default function DevicesExternalPage() {
  // --- Hooks & State ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- PERUBAHAN UTAMA: Gunakan useMqtt dan state terpisah ---
  const { isReady, connectionStatus, subscribe, unsubscribe } = useMqtt();
  const [dbStatus, setDbStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  // --- AKHIR PERUBAHAN ---

  const importFileRef = useRef<HTMLInputElement>(null);

  // State untuk dialog/modal (tidak berubah)
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

  // --- Functions ---
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) throw new Error("Failed to load data.");
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      Swal.fire({
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

  // useEffect untuk mengecek status database
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

  // Memoize topics untuk efisiensi
  const topics = useMemo(() => devices.map((d) => d.topic), [devices]);

 useEffect(() => {
    // Guard clause ini sudah benar.
    // Proses tidak akan berjalan jika koneksi belum siap atau jika belum ada topic.
    if (!isReady || topics.length === 0) return;

    const handleMessage = (topic: string, payload: string) => {
      if (topics.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };

    // Proses subscribe sudah benar.
    // Fungsi 'subscribe' dari context akan dipanggil untuk setiap topic.
    console.log("Subscribing to topics:", topics);
    topics.forEach((topic) => subscribe(topic, handleMessage));

    // Cleanup function: akan dijalankan saat komponen unmount atau saat dependensi berubah.
    return () => {
        // Tidak perlu memeriksa `isReady` di sini.
        // Logika untuk memeriksa koneksi sudah ada di dalam fungsi `unsubscribe` pada MqttContext.
        // Ini memastikan proses unsubscribe tetap tercatat meskipun koneksi terputus.
        console.log("Unsubscribing from topics:", topics);
        topics.forEach((topic) => unsubscribe(topic, handleMessage));
    };
}, [topics, isReady, subscribe, unsubscribe]); // Dependensi sudah benar
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
        title: "Success!",
        text: "Device data saved successfully.",
      });
      fetchDevices();
    } else {
      const errorData = await response.json();
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: errorData.message || "Failed to save data.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      Swal.fire("Deleted!", "The device has been deleted.", "success");
      fetchDevices();
    } else {
      Swal.fire("Failed!", "Failed to delete the device.", "error");
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
        Swal.fire({
          icon: "success",
          title: "Import Complete!",
          html: `Created: <b>${result.created}</b><br>Updated: <b>${result.updated}</b><br>Skipped: <b>${result.skipped}</b>`,
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
              {connectionStatus === "Connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : connectionStatus === "Connecting" ? (
                <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </TooltipTrigger>
            <TooltipContent>MQTT: {connectionStatus}</TooltipContent>
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

      <main className="p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device Name</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Latest Payload</TableHead>
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
              ) : (
                devices.map((device) => {
                  const latestPayload = payloads[device.topic];
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.name}
                      </TableCell>
                      <TableCell>{device.topic}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {latestPayload ? (
                            <>
                              <span className="font-mono text-xs truncate max-w-[200px]">
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
                              Waiting for data...
                            </span>
                          )}
                        </div>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            id="deviceForm"
            className="space-y-4 pt-4"
          >
            <div>
              <Label htmlFor="name">Device Name</Label>
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
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                name="address"
                defaultValue={currentDevice?.address ?? ""}
              />
            </div>
            {dialogMode === "edit" && (
              <div>
                <Label>Unique ID (Cannot be changed)</Label>
                <Input value={currentDevice?.uniqId} disabled />
              </div>
            )}
          </form>
          <DialogFooter>
            <Button type="submit" form="deviceForm">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This action will permanently delete the device "
            {deviceToDelete?.name}".
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isImportModalOpen}
        onOpenChange={() => {
          setIsImportModalOpen(false);
          setFileToImport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Devices from JSON</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a JSON file containing an array of device data.
            </p>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
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
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!fileToImport}>
              <FileUp className="mr-2 h-4 w-4" />
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingPayload}
        onOpenChange={(isOpen) => !isOpen && setViewingPayload(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payload from Topic: {viewingPayload?.topic}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-muted rounded-md p-4 max-h-[60vh] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-all">
              {(() => {
                try {
                  // Prettify JSON if possible
                  return JSON.stringify(
                    JSON.parse(viewingPayload?.payload || "{}"),
                    null,
                    2
                  );
                } catch {
                  // Otherwise, return as plain text
                  return viewingPayload?.payload;
                }
              })()}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingPayload(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
