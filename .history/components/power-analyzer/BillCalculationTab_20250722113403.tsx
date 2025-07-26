"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Loader2, Search } from "lucide-react";

// --- Type Definitions ---
interface DeviceSelection {
  id: string;
  name: string;
  topic: string;
}

interface BillConfig {
  id: string;
  customName: string;
  sourceDevice: DeviceSelection;
  sourceDeviceKey: string;
  rupiahRatePerKwh: number;
  dollarRatePerKwh: number;
  value?: number; // Nilai real-time dari MQTT
}

interface BillLog {
  // Definisikan struktur log di sini nanti
}

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function BillCalculationTab() {
  const { isReady, subscribe, unsubscribe } = useMqtt();
  const [configs, setConfigs] = useState<BillConfig[]>([]);
  const [externalDevices, setExternalDevices] = useState<DeviceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<
    Partial<BillConfig & { sourceDeviceId: string }>
  >({});
  const [selectedDevice, setSelectedDevice] = useState<DeviceSelection | null>(
    null
  );
  const [payloadKeys, setPayloadKeys] = useState<string[]>([]);

  // --- Delete State ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<BillConfig | null>(null);

  // --- Data Fetching ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mengambil data konfigurasi dan daftar perangkat secara bersamaan
      const [configsRes, devicesRes] = await Promise.all([
        fetch("/api/bill-configs"),
        fetch("/api/devices/external"),
      ]);

      if (!configsRes.ok)
        throw new Error("Failed to fetch bill configurations.");
      if (!devicesRes.ok) throw new Error("Failed to fetch external devices.");

      const configsData = await configsRes.json();
      const devicesData = await devicesRes.json();

      setConfigs(configsData);
      setExternalDevices(devicesData);
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
      // Atur ke array kosong jika terjadi error untuk menghindari crash
      setConfigs([]);
      setExternalDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- MQTT Logic for Modal ---
  useEffect(() => {
    if (!isModalOpen || !selectedDevice || !isReady) {
      return;
    }
    const topic = selectedDevice.topic;
    const handleMessage = (msgTopic: string, payloadStr: string) => {
      if (msgTopic === topic) {
        try {
          const payload = JSON.parse(payloadStr);
          const value = JSON.parse(payload.value); // Parse inner JSON string
          setPayloadKeys(Object.keys(value));
        } catch (e) {
          console.error("Failed to parse payload", e);
          setPayloadKeys([]);
        }
      }
    };
    subscribe(topic, handleMessage);

    return () => {
      unsubscribe(topic, handleMessage);
    };
  }, [isModalOpen, selectedDevice, isReady, subscribe, unsubscribe]);

  const handleDeviceChange = (deviceId: string) => {
    const device = externalDevices.find((d) => d.id === deviceId);
    setSelectedDevice(device || null);
    setCurrentConfig((prev) => ({
      ...prev,
      sourceDeviceId: deviceId,
      sourceDeviceKey: undefined,
    }));
    setPayloadKeys([]);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      customName: currentConfig.customName,
      sourceDeviceId: currentConfig.sourceDeviceId,
      sourceDeviceKey: currentConfig.sourceDeviceKey,
      rupiahRatePerKwh: currentConfig.rupiahRatePerKwh,
      dollarRatePerKwh: currentConfig.dollarRatePerKwh,
    };

    if (
      !dataToSave.customName ||
      !dataToSave.sourceDeviceId ||
      !dataToSave.sourceDeviceKey
    ) {
      Toast.fire({ icon: "error", title: "Please fill all required fields." });
      return;
    }

    const url = isEditMode
      ? `/api/bill-configs/${currentConfig.id}`
      : "/api/bill-configs";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save configuration.");
      }

      Toast.fire({
        icon: "success",
        title: `Configuration ${isEditMode ? "updated" : "saved"}!`,
      });
      setIsModalOpen(false);
      fetchInitialData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    }
  };

  // --- Helper Functions ---
  const formatNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return "0.00";
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateCost = (value: number | undefined | null, rate: number) => {
    if (value === null || value === undefined) return 0;
    const energyKwh = (value * 1) / 1000;
    return energyKwh * rate;
  };

  const filteredConfigs = useMemo(
    () =>
      configs.filter((c) =>
        c.customName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [configs, searchQuery]
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bill Calculation Configurations</CardTitle>
              <CardDescription>
                Configure items to calculate electricity costs.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                setCurrentConfig({
                  rupiahRatePerKwh: 1467,
                  dollarRatePerKwh: 0.1,
                });
                setSelectedDevice(null);
                setIsModalOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Data
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Custom Name..."
              className="pl-8 w-full sm:w-1/3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custom Name</TableHead>
                  <TableHead>Source Device</TableHead>
                  <TableHead>Data (Watts)</TableHead>
                  <TableHead>Cost (IDR/hour)</TableHead>
                  <TableHead>Cost (USD/hour)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredConfigs.length > 0 ? (
                  filteredConfigs.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <TableCell className="font-medium">
                        {item.customName}
                      </TableCell>
                      <TableCell>
                        {item.sourceDevice.name} ({item.sourceDeviceKey})
                      </TableCell>
                      <TableCell>{formatNumber(item.value)} W</TableCell>
                      <TableCell>
                        Rp{" "}
                        {formatNumber(
                          calculateCost(item.value, item.rupiahRatePerKwh)
                        )}
                      </TableCell>
                      <TableCell>
                        ${" "}
                        {formatNumber(
                          calculateCost(item.value, item.dollarRatePerKwh)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-48 text-muted-foreground"
                    >
                      No configurations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit" : "Add"} Bill Configuration
            </DialogTitle>
            <DialogDescription>
              Configure a new item for cost calculation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customName">Custom Name</Label>
              <Input
                id="customName"
                placeholder="e.g., Biaya Server Rack A"
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <Label>Select Device (Source)</Label>
              <Select
                onValueChange={handleDeviceChange}
                value={currentConfig.sourceDeviceId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent>
                  {externalDevices.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDevice && (
              <div>
                <Label>Select Key from Payload</Label>
                <Select
                  onValueChange={(value) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      sourceDeviceKey: value,
                    }))
                  }
                  value={currentConfig.sourceDeviceKey}
                  disabled={payloadKeys.length === 0}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        payloadKeys.length > 0
                          ? "Select a key..."
                          : "Waiting for payload..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {payloadKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IDR Rate (/kWh)</Label>
                <Input
                  type="number"
                  value={currentConfig.rupiahRatePerKwh || 1467}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      rupiahRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label>USD Rate (/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.dollarRatePerKwh || 0.1}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      dollarRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
