"use client";

import { MqttProvider } from "@/contexts/MqttContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Impor komponen-komponen tab yang sudah dipisah ---
import { BillCalculationTab } from "@/components/power-analyzer/BillCalculationTab";
import { PueTab } from "@/components/power-analyzer/PueTab";
import { PowerAnalyzerTab } from "@/components/power-analyzer/PowerAnalyzerTab";

function PowerAnalyzerPageContent() {
  return (
    <main className="p-4 md:p-6">
      <Tabs defaultValue="bill-calculation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bill-calculation">Bill Calculation</TabsTrigger>
          <TabsTrigger value="pue">PUE</TabsTrigger>
          <TabsTrigger value="power-analyzer">Power Analyzer</TabsTrigger>
        </TabsList>
        <TabsContent value="bill-calculation" className="mt-6">
          <BillCalculationTab />
        </TabsContent>
        <TabsContent value="pue" className="mt-6">
          <PueTab />
        </TabsContent>
        <TabsContent value="power-analyzer" className="mt-6">
          <PowerAnalyzerTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default function PowerAnalyzerPage() {
  return (
    <MqttProvider>
      <PowerAnalyzerPageContent />
    </MqttProvider>
  );
}
