"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Cpu, Network } from "lucide-react";
import DeviceManagerPage from "./modbus";
import DeviceManagerPageModular from "./modular";

export default function DeviceInternalPage() {
  const [selectedTab, setSelectedTab] = useState("modbus");

  return (
    <div>
      <div className="flex-1 p-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="modbus">Modbus SNMP Devices</TabsTrigger>
            <TabsTrigger value="modular">Modular Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="modbus" className="mt-6">
            <DeviceManagerPage />
          </TabsContent>

          <TabsContent value="modular" className="mt-6">
            <DeviceManagerPageModular />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
