// File: app/devices/devices-internal/page.tsx
"use client";

import { MqttProvider } from "@/contexts/MqttContext"; // Sesuaikan path jika perlu
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Kita akan buat komponen-komponen ini di langkah berikutnya
import { ModbusTable } from "@/components/devices/internal/ModbusTable";
import { ModbitTable } from "@/components/devices/internal/ModbitTable";
import { ModularTable } from "@/components/devices/internal/ModularTable";

export default function DevicesInternalPage() {
  return (
    <MqttProvider>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Internal Device Management</h1>
        <Tabs defaultValue="modbus">
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
      </div>
    </MqttProvider>
  );
}
