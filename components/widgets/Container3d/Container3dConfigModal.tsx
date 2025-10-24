// File: components/widgets/Container3d/Container3dConfigModal.tsx
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
import { Switch } from "@/components/ui/switch"; // Pastikan komponen Switch diimpor
import { PlusCircle, Trash2, Save, X } from "lucide-react";
import Swal from "sweetalert2";

// --- Tipe Data untuk Konfigurasi ---
interface ConfigData {
  customName: string;
  topicsTemp: [string[], string[]]; // [ [frontTopics], [backTopics] ]
  topicPower: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  initialConfig?: ConfigData | null; // Untuk mode edit
}

// --- Fungsi Pembantu ---
const chunkArray = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

// --- Komponen Utama ---
export const Container3dConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // --- State ---
  const [customName, setCustomName] = useState(initialConfig?.customName || "");
  const [frontTopics, setFrontTopics] = useState<string[]>(
    initialConfig?.topicsTemp?.[0] || [""]
  );
  const [backTopics, setBackTopics] = useState<string[]>(
    initialConfig?.topicsTemp?.[1] || []
  );
  const [powerTopic, setPowerTopic] = useState(initialConfig?.topicPower || "");
  const [enableBack, setEnableBack] = useState(
    !!initialConfig?.topicsTemp?.[1]?.length // true jika ada back topics
  );

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      setCustomName(initialConfig?.customName || "");
      setFrontTopics(initialConfig?.topicsTemp?.[0] || [""]);
      setBackTopics(initialConfig?.topicsTemp?.[1] || []);
      setPowerTopic(initialConfig?.topicPower || "");
      setEnableBack(!!initialConfig?.topicsTemp?.[1]?.length);
    }
  }, [isOpen, initialConfig]);

  // --- Handlers ---
  const handleSave = () => {
    console.log("=== Container3dConfigModal: handleSave dipanggil ===");
    console.log("State saat ini:", {
      customName,
      frontTopics,
      backTopics,
      powerTopic,
      enableBack,
    });

    if (!customName.trim()) {
      console.warn("Validation failed: customName is empty");
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please enter a custom name for the container.",
      });
      return;
    }

    // Pastikan jumlah back topic sesuai dengan front jika enableBack
    let finalBackTopics = enableBack ? backTopics : [];
    if (enableBack && backTopics.length !== frontTopics.length) {
      // Isi back topic yang kurang dengan string kosong atau potong yang berlebih
      finalBackTopics = [...backTopics];
      while (finalBackTopics.length < frontTopics.length) {
        finalBackTopics.push("");
      }
      finalBackTopics = finalBackTopics.slice(0, frontTopics.length);
      setBackTopics(finalBackTopics);
    }

    const configData: ConfigData = {
      customName,
      topicsTemp: [frontTopics, finalBackTopics],
      topicPower: powerTopic,
    };

    console.log("Data konfigurasi yang akan dikirim:", configData);
    console.log("Memanggil props.onSave...");
    onSave(configData); // --- PANGGIL ONSAVE ---
    console.log("Memanggil props.onClose...");
    onClose(); // --- PANGGIL ONCLOSE ---
    console.log("=== Container3dConfigModal: handleSave selesai ===");
  };

  const handleAddFrontTopic = () => {
    setFrontTopics([...frontTopics, ""]);
    if (enableBack) {
      setBackTopics([...backTopics, ""]); // Tambahkan back topic kosong juga
    }
  };

  const handleRemoveFrontTopic = (index: number) => {
    const newFrontTopics = [...frontTopics];
    newFrontTopics.splice(index, 1);
    setFrontTopics(newFrontTopics);

    if (enableBack) {
      const newBackTopics = [...backTopics];
      newBackTopics.splice(index, 1);
      setBackTopics(newBackTopics);
    }
  };

  const handleFrontTopicChange = (index: number, value: string) => {
    const newFrontTopics = [...frontTopics];
    newFrontTopics[index] = value;
    setFrontTopics(newFrontTopics);
  };

  const handleBackTopicChange = (index: number, value: string) => {
    const newBackTopics = [...backTopics];
    newBackTopics[index] = value;
    setBackTopics(newBackTopics);
  };

  const handleEnableBackChange = (checked: boolean) => {
    setEnableBack(checked);
    if (checked && backTopics.length < frontTopics.length) {
      // Isi back topics jika diaktifkan dan jumlahnya kurang
      const newBackTopics = [...backTopics];
      while (newBackTopics.length < frontTopics.length) {
        newBackTopics.push("");
      }
      setBackTopics(newBackTopics);
    }
  };

  // --- Chunked Topics for UI ---
  const chunkedFrontTopics = chunkArray(frontTopics, 2);
  const chunkedBackTopics = enableBack ? chunkArray(backTopics, 2) : [];

  // --- Render ---
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig
              ? "Edit 3D Container View"
              : "Configure 3D Container View"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* --- Basic Configuration --- */}
          <Card>
            <CardHeader>
              <CardTitle>Container Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customName">Custom Name *</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Main Server Container"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* --- Front Topics --- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Front Topics</span>
                <Button
                  onClick={handleAddFrontTopic}
                  variant="outline"
                  size="sm"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Rack
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter MQTT topics for the front side of each rack. Each row
                represents a rack.
              </p>

              {chunkedFrontTopics.length > 0 ? (
                chunkedFrontTopics.map((rowChunk, rowIndex) => (
                  <div key={`front-row-${rowIndex}`} className="flex gap-4">
                    {rowChunk.map((_, colIndex) => {
                      const topicIndex = rowIndex * 2 + colIndex;
                      return (
                        <div
                          key={`front-col-${rowIndex}-${colIndex}`}
                          className="flex-1 space-y-2"
                        >
                          <Label htmlFor={`frontTopic${topicIndex}`}>
                            Front Topic {topicIndex + 1}:
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`frontTopic${topicIndex}`}
                              value={frontTopics[topicIndex] || ""}
                              onChange={(e) =>
                                handleFrontTopicChange(
                                  topicIndex,
                                  e.target.value
                                )
                              }
                              placeholder="(kosongkan jika tidak diisi)"
                            />
                            {frontTopics.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleRemoveFrontTopic(topicIndex)
                                }
                                className="h-9 w-9"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Jika hanya 1 kolom di baris ini, tambahkan placeholder untuk layout */}
                    {rowChunk.length === 1 && <div className="flex-1"></div>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click &apos;Add Rack&apos; to start adding front topics.
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* --- Enable Back & Back Topics --- */}
          <Card>
            <CardHeader>
              <CardTitle>Back Topics Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableBackSwitch">Enable Back Topics</Label>
                <Switch
                  id="enableBackSwitch"
                  checked={enableBack}
                  onCheckedChange={handleEnableBackChange}
                />
              </div>

              {enableBack && (
                <div className="pt-2 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter MQTT topics for the back side of each rack.
                  </p>
                  {chunkedBackTopics.length > 0 ? (
                    chunkedBackTopics.map((rowChunk, rowIndex) => (
                      <div key={`back-row-${rowIndex}`} className="flex gap-4">
                        {rowChunk.map((_, colIndex) => {
                          const topicIndex = rowIndex * 2 + colIndex;
                          return (
                            <div
                              key={`back-col-${rowIndex}-${colIndex}`}
                              className="flex-1 space-y-2"
                            >
                              <Label htmlFor={`backTopic${topicIndex}`}>
                                Back Topic {topicIndex + 1}:
                              </Label>
                              <Input
                                id={`backTopic${topicIndex}`}
                                value={backTopics[topicIndex] || ""}
                                onChange={(e) =>
                                  handleBackTopicChange(
                                    topicIndex,
                                    e.target.value
                                  )
                                }
                                placeholder="(kosongkan jika tidak diisi)"
                              />
                            </div>
                          );
                        })}
                        {rowChunk.length === 1 && (
                          <div className="flex-1"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No racks defined. Add front topics first.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* --- Power Topic --- */}
          <Card>
            <CardHeader>
              <CardTitle>Power Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="powerTopic">Power Topic:</Label>
              <Input
                id="powerTopic"
                value={powerTopic}
                onChange={(e) => setPowerTopic(e.target.value)}
                placeholder="e.g., container1/power"
              />
              <p className="text-xs text-muted-foreground">
                Enter the MQTT topic for container power data.
              </p>
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
