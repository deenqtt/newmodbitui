// File: components/widgets/Lora/LoraConfigModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Save, X, Loader2, AlertCircle, Radio } from "lucide-react";
import Swal from "sweetalert2";

// --- Tipe Data ---
interface LoraDevice {
  id: string;
  devEui: string;
  name: string;
  lastSeen: string | null;
}

interface ConfigData {
  selectedDevice: {
    id: string;
    devEui: string;
    name: string;
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  initialConfig?: ConfigData | null;
}

// --- Komponen Utama ---
export const LoraConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // --- State ---
  const [devices, setDevices] = useState<LoraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    initialConfig?.selectedDevice?.id || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      fetchDevices();
      // Reset form state based on initialConfig when modal opens
      setSelectedDeviceId(initialConfig?.selectedDevice?.id || null);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialConfig]);

  // --- Handlers ---
  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lorawan/devices");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      const data: LoraDevice[] = await res.json();
      setDevices(data);
      
      // Jika tidak ada device, tampilkan pesan
      if (data.length === 0) {
          setError("No LoRaWAN devices found. Please register devices first.");
      }
    } catch (err: any) {
      console.error("[LoraConfigModal] Fetch devices error:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching devices.";
      setError(errorMessage);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Could not load the list of LoRaWAN devices: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    console.log("=== LoraConfigModal: handleSave dipanggil ===");
    console.log("Selected Device ID:", selectedDeviceId);

    if (!selectedDeviceId) {
      const errorMsg = "Please select a LoRaWAN device.";
      console.warn("[LoraConfigModal] Validation failed:", errorMsg);
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: errorMsg,
      });
      return;
    }

    const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
    if (!selectedDevice) {
      const errorMsg = "Selected device not found in the list.";
      console.error("[LoraConfigModal] Error:", errorMsg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMsg,
      });
      return;
    }

    setIsSaving(true);
    const configData: ConfigData = {
      selectedDevice: {
        id: selectedDevice.id,
        devEui: selectedDevice.devEui,
        name: selectedDevice.name,
      },
    };

    console.log("Data konfigurasi yang akan dikirim:", configData);
    console.log("Memanggil props.onSave...");
    try {
        onSave(configData); // --- PANGGIL ONSAVE ---
        console.log("Memanggil props.onClose...");
        onClose(); // --- PANGGIL ONCLOSE ---
        console.log("=== LoraConfigModal: handleSave selesai ===");
    } catch (err) {
        console.error("[LoraConfigModal] Error during save:", err);
        Swal.fire({
            icon: "error",
            title: "Save Failed",
            text: "An error occurred while saving the configuration.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  // --- Render ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Radio className="mr-2 h-5 w-5 text-muted-foreground" />
            {initialConfig?.selectedDevice
              ? "Edit LoRaWAN Device Widget"
              : "Configure LoRaWAN Device Widget"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Select LoRaWAN Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="device-select">Device *</Label>
                <Select
                  value={selectedDeviceId || undefined}
                  onValueChange={setSelectedDeviceId}
                  disabled={isLoading || isSaving}
                >
                  <SelectTrigger id="device-select" className="w-full">
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading devices...
                      </div>
                    ) : (
                      <SelectValue placeholder="Select a LoRaWAN device" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {devices.length > 0 ? (
                      devices.map((device) => (
                        <SelectItem key={device.id} value={device