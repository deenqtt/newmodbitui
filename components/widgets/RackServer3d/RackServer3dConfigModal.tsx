// File: components/widgets/RackServer3d/RackServer3dConfigModal.tsx
"use client";

import React, { useState, ChangeEvent, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import Swal from "sweetalert2";

interface ServerConfig {
  position: number;
  height: number;
  imageFile: File | null;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const RackServer3dConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // State untuk AC/Cooling
  const [showAC, setShowAC] = useState(false);
  const [acImageFile, setAcImageFile] = useState<File | null>(null);

  // State untuk UPS
  const [showUPS, setShowUPS] = useState(false);
  const [upsPosition, setUpsPosition] = useState(1);
  const [upsHeight, setUpsHeight] = useState(2);
  const [upsImageFile, setUpsImageFile] = useState<File | null>(null);

  // State untuk Server
  const [showServers, setShowServers] = useState(false);
  const [serverCount, setServerCount] = useState(1);
  const [serverPositions, setServerPositions] = useState<ServerConfig[]>([
    { position: 1, height: 1, imageFile: null, topic: "" },
  ]);

  // Handler untuk AC Image
  const handleACImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAcImageFile(file);
    }
  };

  // Handler untuk UPS Image
  const handleUPSImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUpsImageFile(file);
    }
  };

  // Handler untuk Server Image
  const handleServerImage = (
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const updatedServers = [...serverPositions];
      updatedServers[index].imageFile = file;
      setServerPositions(updatedServers);
    }
  };

  // Update jumlah server dan array serverPositions
  const handleServerCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value) || 0;
    setServerCount(count);
    const newServers = Array.from({ length: count }, (_, i) => ({
      position: serverPositions[i]?.position || 1,
      height: serverPositions[i]?.height || 1,
      imageFile: serverPositions[i]?.imageFile || null,
      topic: serverPositions[i]?.topic || "",
    }));
    setServerPositions(newServers);
  };

  // Update posisi/tinggi server
  const handleServerDetailChange = (
    index: number,
    field: "position" | "height" | "topic",
    value: string | number
  ) => {
    const updatedServers = [...serverPositions];
    if (field === "position" || field === "height") {
      updatedServers[index][field] = Number(value);
    } else {
      updatedServers[index][field] = value as string;
    }
    setServerPositions(updatedServers);
  };

  // Initialize state from initialConfig for edit mode
  useEffect(() => {
    if (isOpen && initialConfig) {
      setShowAC(initialConfig.showAC || false);
      setShowUPS(initialConfig.showUPS || false);
      setUpsPosition(initialConfig.upsPosition || 1);
      setUpsHeight(initialConfig.upsHeight || 2);
      setShowServers(initialConfig.showServers || false);
      setServerCount(initialConfig.serverCount || 1);
      setServerPositions(
        initialConfig.serverPositions?.map((server: any) => ({
          position: server.position || 1,
          height: server.height || 1,
          imageFile: null, // Files need to be re-uploaded on edit
          topic: server.topic || "",
        })) || [{ position: 1, height: 1, imageFile: null, topic: "" }]
      );
    } else if (isOpen && !initialConfig) {
      // Reset to defaults when creating new widget
      setShowAC(false);
      setAcImageFile(null);
      setShowUPS(false);
      setUpsPosition(1);
      setUpsHeight(2);
      setUpsImageFile(null);
      setShowServers(false);
      setServerCount(1);
      setServerPositions([{ position: 1, height: 1, imageFile: null, topic: "" }]);
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    // Validasi dasar (bisa ditambahkan lebih lanjut)
    if (showServers && serverCount <= 0) {
      Swal.fire(
        "Invalid Input",
        "Jumlah server harus lebih dari 0.",
        "warning"
      );
      return;
    }

    onSave({
      showAC,
      acImageFile: acImageFile ? URL.createObjectURL(acImageFile) : null,
      showUPS,
      upsPosition,
      upsHeight,
      upsImageFile: upsImageFile ? URL.createObjectURL(upsImageFile) : null,
      showServers,
      serverCount,
      serverPositions: serverPositions.map((s) => ({
        ...s,
        imageFile: s.imageFile ? URL.createObjectURL(s.imageFile) : null,
      })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig ? "Edit 3D Rack Server View" : "Configure 3D Rack Server View"}
          </DialogTitle>
          <DialogDescription>
            Atur komponen-komponen dalam rack server 3D Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AC/Cooling Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acCheckbox"
                checked={showAC}
                onCheckedChange={(checked) => setShowAC(!!checked)}
              />
              <Label htmlFor="acCheckbox">Tampilkan AC/Cooling?</Label>
            </div>

            {showAC && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="acImage">Upload Gambar AC/Cooling:</Label>
                <Input
                  id="acImage"
                  type="file"
                  accept="image/*"
                  onChange={handleACImage}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* UPS Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="upsCheckbox"
                checked={showUPS}
                onCheckedChange={(checked) => setShowUPS(!!checked)}
              />
              <Label htmlFor="upsCheckbox">Tampilkan UPS?</Label>
            </div>

            {showUPS && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="upsPosition">Position UPS (U):</Label>
                    <Input
                      id="upsPosition"
                      type="number"
                      min="1"
                      value={upsPosition}
                      onChange={(e) =>
                        setUpsPosition(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="upsHeight">Height UPS (U):</Label>
                    <Input
                      id="upsHeight"
                      type="number"
                      min="1"
                      value={upsHeight}
                      onChange={(e) =>
                        setUpsHeight(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="upsImage">Upload Gambar UPS:</Label>
                  <Input
                    id="upsImage"
                    type="file"
                    accept="image/*"
                    onChange={handleUPSImage}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Server Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="serversCheckbox"
                checked={showServers}
                onCheckedChange={(checked) => setShowServers(!!checked)}
              />
              <Label htmlFor="serversCheckbox">Tampilkan Server?</Label>
            </div>

            {showServers && (
              <div className="ml-6 space-y-4">
                <div>
                  <Label htmlFor="serverCount">Jumlah Server:</Label>
                  <Input
                    id="serverCount"
                    type="number"
                    min="1"
                    value={serverCount}
                    onChange={handleServerCountChange}
                  />
                </div>

                {serverPositions.map((server, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-3">
                    <h4 className="font-medium">Server {index + 1}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Position Server (U):</Label>
                        <Input
                          type="number"
                          min="1"
                          value={server.position}
                          onChange={(e) =>
                            handleServerDetailChange(
                              index,
                              "position",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Height Server (U):</Label>
                        <Input
                          type="number"
                          min="1"
                          value={server.height}
                          onChange={(e) =>
                            handleServerDetailChange(
                              index,
                              "height",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Upload Gambar Server:</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleServerImage(index, e)}
                      />
                    </div>
                    <div>
                      <Label>Topic (Opsional):</Label>
                      <Input
                        placeholder="Masukkan topik MQTT..."
                        value={server.topic}
                        onChange={(e) =>
                          handleServerDetailChange(
                            index,
                            "topic",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {initialConfig ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
