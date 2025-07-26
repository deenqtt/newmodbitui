// File: app/devices/devices-internal/page.tsx
"use client";

import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModbusTable } from "@/components/devices/internal/ModbusTable";
import { ModbitTable } from "@/components/devices/internal/ModbitTable";
import { ModularTable } from "@/components/devices/internal/ModularTable";

// --- Import komponen yang dibutuhkan untuk Header ---
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Cpu, Wifi, WifiOff } from "lucide-react"; // Menggunakan ikon CPU untuk Internal Devices

/**
 * Komponen Header Kustom untuk Halaman Ini
 * Dibuat terpisah agar rapi dan bisa menggunakan hook `useMqtt`.
 */
function InternalPageHeader() {
  // Mengambil status koneksi dari MqttContext
  const { connectionStatus } = useMqtt();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Internal Device Management</h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger>
            {connectionStatus === "Connected" ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </TooltipTrigger>
          <TooltipContent>MQTT: {connectionStatus}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

/**
 * Komponen Halaman Utama
 */
export default function DevicesInternalPage() {
  return (
    // MqttProvider harus membungkus semua komponen yang butuh akses ke MQTT
    <MqttProvider>
      {/* TooltipProvider untuk mengaktifkan tooltip di dalam header */}
      <TooltipProvider>
        <div className="flex flex-col h-screen bg-muted/40">
          {/* 1. Tampilkan Header di bagian atas */}
          <InternalPageHeader />

          {/* 2. Konten utama (Tabs) dibuat scrollable jika isinya panjang */}
          <main className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="modbus" className="w-full">
              <TabsList>
                <TabsTrigger value="modbus">Modbus & SNMP</TabsTrigger>
                <TabsTrigger value="modbit">Modbit</TabsTrigger>
                <TabsTrigger value="modular">Modular</TabsTrigger>
              </TabsList>
              <TabsContent value="modbus">
                <ModbusTable />
              </TabsContent>
              <TabsContent value="modbit">
                <ModbitTable />
              </TabsContent>
              <TabsContent value="modular">
                <ModularTable />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </TooltipProvider>
    </MqttProvider>
  );
}
