// File: components/widgets/Containment3d/Containment3dConfigModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox"; // Tambahkan import Checkbox
import { Save, X, Info } from "lucide-react";
import Swal from "sweetalert2";

// --- Tipe Data ---
interface RackTopic {
  rackNumber: number;
  topic: string;
}

interface ConfigData {
  customName: string;
  totalRack: number;
  dummyRack: number[];
  topics: string[];
  topicOptional?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  initialConfig?: ConfigData | null; // Untuk mode edit
}

// --- Komponen Utama ---
export const Containment3dConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // --- State ---
  const [customName, setCustomName] = useState(initialConfig?.customName || "");
  const [totalRack, setTotalRack] = useState(initialConfig?.totalRack || 8);
  const [dummyRacks, setDummyRacks] = useState<Set<number>>(
    new Set(initialConfig?.dummyRack || [])
  );
  const [rackTopics, setRackTopics] = useState<RackTopic[]>(
    initialConfig?.topics?.map((topic, index) => ({
      rackNumber: index + 1,
      topic,
    })) ||
      Array.from({ length: initialConfig?.totalRack || 8 }, (_, i) => ({
        rackNumber: i + 1,
        topic: "",
      }))
  );
  const [optionalTopic, setOptionalTopic] = useState(
    initialConfig?.topicOptional || ""
  );

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      setCustomName(initialConfig?.customName || "");
      const initialTotalRack = initialConfig?.totalRack || 8;
      setTotalRack(initialTotalRack);
      setDummyRacks(new Set(initialConfig?.dummyRack || []));

      // Inisialisasi atau sesuaikan rackTopics berdasarkan totalRack
      const initialTopics = initialConfig?.topics || [];
      const topicsArray: RackTopic[] = [];
      for (let i = 1; i <= initialTotalRack; i++) {
        topicsArray.push({
          rackNumber: i,
          topic: initialTopics[i - 1] || "", // Gunakan topik yang ada atau string kosong
        });
      }
      setRackTopics(topicsArray);

      setOptionalTopic(initialConfig?.topicOptional || "");
    }
  }, [isOpen, initialConfig]);

  // --- Handler untuk mengubah jumlah rack ---
  const handleTotalRackChange = (value: string) => {
    const numRacks = Math.max(1, parseInt(value) || 1);
    setTotalRack(numRacks);

    // Sesuaikan array rackTopics
    setRackTopics((prev) => {
      const newTopics = [...prev];
      if (numRacks > prev.length) {
        // Tambahkan entry baru jika jumlah rack bertambah
        for (let i = prev.length + 1; i <= numRacks; i++) {
          newTopics.push({ rackNumber: i, topic: "" });
        }
      } else if (numRacks < prev.length) {
        // Potong array jika jumlah rack berkurang
        newTopics.splice(numRacks);
        // Hapus rack yang dihapus dari dummyRacks
        const newDummySet = new Set(
          Array.from(dummyRacks).filter((r) => r <= numRacks)
        );
        setDummyRacks(newDummySet);
      }
      return newTopics;
    });
  };

  // --- Handler untuk toggle dummy rack ---
  const handleDummyRackToggle = (rackNumber: number) => {
    setDummyRacks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rackNumber)) {
        newSet.delete(rackNumber);
      } else {
        newSet.add(rackNumber);
      }
      return newSet;
    });
  };

  // --- Handler untuk mengubah topik ---
  const handleTopicChange = (rackNumber: number, topic: string) => {
    setRackTopics((prev) =>
      prev.map((rt) => (rt.rackNumber === rackNumber ? { ...rt, topic } : rt))
    );
  };

  // --- Handlers untuk Save ---
  const handleSave = () => {
    console.log("=== Containment3dConfigModal: handleSave dipanggil ===");
    console.log("State saat ini:", {
      customName,
      totalRack,
      dummyRacks: Array.from(dummyRacks),
      rackTopics,
      optionalTopic,
    });

    if (!customName.trim()) {
      console.warn("Validation failed: customName is empty");
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please enter a custom name for the device.",
      });
      return;
    }

    // Validasi topik tidak kosong untuk rack yang bukan dummy
    for (const rt of rackTopics) {
      if (!dummyRacks.has(rt.rackNumber) && !rt.topic.trim()) {
        const errorMsg = `MQTT topic for Rack ${rt.rackNumber} cannot be empty.`;
        console.warn("Validation failed:", errorMsg);
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: errorMsg,
        });
        return;
      }
    }

    const configData: ConfigData = {
      customName,
      totalRack,
      dummyRack: Array.from(dummyRacks), // Konversi Set ke Array
      topics: rackTopics.map((rt) => rt.topic), // Ambil hanya string topiknya
      ...(optionalTopic && { topicOptional: optionalTopic }),
    };

    console.log("Data konfigurasi yang akan dikirim:", configData);
    console.log("Memanggil props.onSave...");
    onSave(configData); // --- PANGGIL ONSAVE ---
    console.log("Memanggil props.onClose...");
    onClose(); // --- PANGGIL ONCLOSE ---
    console.log("=== Containment3dConfigModal: handleSave selesai ===");
  };

  // --- Render ---
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig
              ? "Edit 3D Containment View"
              : "Configure 3D Containment View"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* --- Basic Configuration --- */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customName">Device Custom Name *</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Main Server Room"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalRack">Total Number of Racks *</Label>
                <Input
                  id="totalRack"
                  type="number"
                  min="1"
                  value={totalRack}
                  onChange={(e) => handleTotalRackChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Changing this will update the topic list below.
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* --- Dummy Racks --- */}
          <Card>
            <CardHeader>
              <CardTitle>Dummy Racks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select racks that should be marked as dummy (will not display
                data).
              </p>
              {totalRack > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {Array.from({ length: totalRack }, (_, i) => i + 1).map(
                    (rackNum) => (
                      <div
                        key={rackNum}
                        className="flex items-center space-x-2 p-2 border rounded bg-secondary/10"
                      >
                        <Checkbox
                          id={`dummy-rack-${rackNum}`}
                          checked={dummyRacks.has(rackNum)}
                          onCheckedChange={() => handleDummyRackToggle(rackNum)}
                        />
                        <Label
                          htmlFor={`dummy-rack-${rackNum}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Rack {rackNum}
                        </Label>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Please set the number of racks first.
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* --- MQTT Topics --- */}
          <Card>
            <CardHeader>
              <CardTitle>MQTT Topics Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign an MQTT topic for each rack. Topics for dummy racks can
                be left empty.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                {rackTopics.map((rt) => (
                  <div key={rt.rackNumber} className="flex items-center gap-2">
                    <div className="w-24 flex-shrink-0">
                      <Label
                        htmlFor={`topic-${rt.rackNumber}`}
                        className="flex items-center"
                      >
                        Rack {rt.rackNumber}
                        {dummyRacks.has(rt.rackNumber) && (
                          <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                            Dummy
                          </span>
                        )}
                      </Label>
                    </div>
                    <Input
                      id={`topic-${rt.rackNumber}`}
                      value={rt.topic}
                      onChange={(e) =>
                        handleTopicChange(rt.rackNumber, e.target.value)
                      }
                      placeholder={`e.g., room1/rack${rt.rackNumber}/sensors`}
                      className="flex-1"
                      disabled={dummyRacks.has(rt.rackNumber)} // Nonaktifkan input untuk dummy rack
                    />
                  </div>
                ))}
                {totalRack === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Please set the number of racks first.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="optionalTopic">Optional Topic</Label>
                <Input
                  id="optionalTopic"
                  value={optionalTopic}
                  onChange={(e) => setOptionalTopic(e.target.value)}
                  placeholder="e.g., room1/emergency"
                />
                <p className="text-xs text-muted-foreground">
                  Topic for additional controls or status (e.g., emergency
                  button, ceiling, doors).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
