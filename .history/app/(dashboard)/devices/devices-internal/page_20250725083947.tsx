"use client";

import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModbusTable } from "@/components/devices/internal/ModbusTable";
import { ModbitTable } from "@/components/devices/internal/ModbitTable";
import { ModularTable } from "@/components/devices/internal/ModularTable";

// --- Import komponen UI & Ikon ---
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

/**
 * Komponen Konten Utama
 * Berisi semua logika dan tampilan untuk halaman ini.
 */
function DevicesInternalContent() {
  const { connectionStatus } = useMqtt();

  return (
    <main className="p-4 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Internal Device Management</CardTitle>
              <CardDescription>
                Manage Modbus, Modbit, and Modular devices.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
                  {connectionStatus === "Connected" ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : connectionStatus === "Connecting" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span>MQTT: {connectionStatus}</span>
                </TooltipTrigger>
                <TooltipContent>MQTT Connection Status</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="modbus" className="w-full">
            <TabsList>
              <TabsTrigger value="modbus">Modbus & SNMP</TabsTrigger>
              <TabsTrigger value="modbit">Modbit</TabsTrigger>
              <TabsTrigger value="modular">Modular</TabsTrigger>
            </TabsList>
            <TabsContent value="modbus" className="mt-4">
              <ModbusTable />
            </TabsContent>
            <TabsContent value="modbit" className="mt-4">
              <ModbitTable />
            </TabsContent>
            <TabsContent value="modular" className="mt-4">
              <ModularTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Komponen Halaman Utama
 * Tugasnya adalah menyediakan semua Provider yang dibutuhkan oleh konten.
 */
export default function DevicesInternalPage() {
  return (
    <MqttProvider>
      <TooltipProvider>
        <DevicesInternalContent />
      </TooltipProvider>
    </MqttProvider>
  );
}
