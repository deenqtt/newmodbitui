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
  const {
    isReady,
    connectionStatus: mqttStatus,
    subscribe,
    unsubscribe,
  } = useMqtt();
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

  // --- Fungsi-Fungsi ---
  const fetchDevices = async () => {
    /* ... (fungsi sama seperti sebelumnya) ... */
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

  // useEffect untuk subscribe ke topic MQTT
  useEffect(() => {
    if (!isReady || topics.length === 0) return;

    const handleMessage = (topic: string, payload: string) => {
      if (topics.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };

    topics.forEach((topic) => subscribe(topic, handleMessage));

    return () => {
      if (isReady) {
        topics.forEach((topic) => unsubscribe(topic, handleMessage));
      }
    };
  }, [topics, subscribe, unsubscribe, isReady]);

  const handleOpenForm = (
    mode: "add" | "edit",
    device: Device | null = null
  ) => {
    /* ... (fungsi sama) ... */
  };
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    /* ... (fungsi sama) ... */
  };
  const handleDelete = async () => {
    /* ... (fungsi sama) ... */
  };
  const handleExport = () => {
    /* ... (fungsi sama) ... */
  };
  const handleImport = async () => {
    /* ... (fungsi sama) ... */
  };

  return (
    <TooltipProvider>
      {/* --- SELURUH BAGIAN JSX (HEADER, MAIN, DIALOG) TIDAK ADA PERUBAHAN --- */}
      {/* React akan secara otomatis me-render ulang dengan data dari state yang baru */}
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
              {mqttStatus === "Connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : mqttStatus === "Connecting" ? (
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
           {" "}
      <main className="p-6">
               {" "}
        <div className="rounded-lg border">
                   {" "}
          <Table>
                       {" "}
            <TableHeader>
                           {" "}
              <TableRow>
                                <TableHead>Device Name</TableHead>             
                  <TableHead>Topic</TableHead>               {" "}
                <TableHead>Latest Payload</TableHead>               {" "}
                <TableHead className="text-right">Actions</TableHead>           
                 {" "}
              </TableRow>
                         {" "}
            </TableHeader>
                       {" "}
            <TableBody>
                           {" "}
              {isLoading ? (
                <TableRow>
                                   {" "}
                  <TableCell colSpan={4} className="text-center h-24">
                                       {" "}
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />       
                             {" "}
                  </TableCell>
                                 {" "}
                </TableRow>
              ) : (
                devices.map((device) => {
                  const latestPayload = payloads[device.topic];

                  return (
                    <TableRow key={device.id}>
                                           {" "}
                      <TableCell className="font-medium">
                                                {device.name}                   
                         {" "}
                      </TableCell>
                                           {" "}
                      <TableCell>{device.topic}</TableCell>                     {" "}
                      <TableCell>
                                               {" "}
                        <div className="flex items-center gap-2">
                                                   {" "}
                          {latestPayload ? (
                            <>
                                                           {" "}
                              <span className="font-mono text-xs truncate max-w-[200px]">
                                                                {latestPayload} 
                                                           {" "}
                              </span>
                                                           {" "}
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
                                                               {" "}
                                <Eye className="h-4 w-4" />                     
                                       {" "}
                              </Button>
                                                         {" "}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                                                            Waiting for data...
                                                         {" "}
                            </span>
                          )}
                                                 {" "}
                        </div>
                                             {" "}
                      </TableCell>
                                           {" "}
                      <TableCell className="text-right">
                                               {" "}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm("edit", device)}
                        >
                                                    <Edit className="h-4 w-4" />
                                                 {" "}
                        </Button>
                                               {" "}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeviceToDelete(device);

                            setIsDeleteAlertOpen(true);
                          }}
                        >
                                                   {" "}
                          <Trash2 className="h-4 w-4 text-red-500" />           
                                     {" "}
                        </Button>
                                             {" "}
                      </TableCell>
                                         {" "}
                    </TableRow>
                  );
                })
              )}
                         {" "}
            </TableBody>
                     {" "}
          </Table>
                 {" "}
        </div>
             {" "}
      </main>
      {/* ... (Semua komponen Dialog dan AlertDialog sama persis) ... */}
    </TooltipProvider>
  );
}
