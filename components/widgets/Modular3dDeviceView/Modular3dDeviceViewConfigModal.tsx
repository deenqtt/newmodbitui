// File: components/widgets/Modular3dDeviceView/Modular3dDeviceViewConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const Modular3dDeviceViewConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [customName, setCustomName] = useState("");
  const [deviceUniqId, setDeviceUniqId] = useState("");
  const [topic, setTopic] = useState(""); // <-- Tambahkan topic
  const [subrackType, setSubrackType] = useState("");
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomName("");
      setDeviceUniqId("");
      setTopic(""); // <-- Reset topic
      setSubrackType("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !deviceUniqId || !topic || !subrackType) {
      setError("All fields are required");
      return;
    }

    onSave({
      customName,
      deviceUniqId,
      topic, // <-- Simpan topic
      subrackType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure 3D Device View</DialogTitle>
          <DialogDescription>
            Set up your modular device 3D visualization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customName" className="text-right">
                Widget Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter widget name"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceUniqId" className="text-right">
                Device ID
              </Label>
              <div className="col-span-3">
                <Input
                  id="deviceUniqId"
                  value={deviceUniqId}
                  onChange={(e) => setDeviceUniqId(e.target.value)}
                  placeholder="Enter unique device ID"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="text-right">
                MQTT Topic
              </Label>
              <div className="col-span-3">
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter MQTT topic (e.g., device/status)"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subrackType" className="text-right">
                Device Type
              </Label>
              <div className="col-span-3">
                <Select value={subrackType} onValueChange={setSubrackType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Relay">Relay</SelectItem>
                    <SelectItem value="Relay Mini">Relay Mini</SelectItem>
                    <SelectItem value="Drycontact">Dry Contact</SelectItem>
                    <SelectItem value="Digital IO">Digital IO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="col-span-4 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
