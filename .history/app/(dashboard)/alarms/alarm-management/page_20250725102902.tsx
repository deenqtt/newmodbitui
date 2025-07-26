// File: app/(dashboard)/alarm-management/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext"; // <-- IMPORT MQTT

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// --- Type Definitions ---
type DeviceExternal = {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
};

type AlarmBit = {
  id?: string;
  bitPosition: number;
  customName: string;
  alertToWhatsApp: boolean;
};

type AlarmConfig = {
  id: string;
  customName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  keyType: "DIRECT" | "THRESHOLD" | "BIT_VALUE";
  key: string;
  device: { name: string };
  deviceUniqId: string;
  bits: AlarmBit[];
  minValue?: number | null;
  maxValue?: number | null;
  maxOnly?: boolean | null;
};

type ManualAlarmFormData = {
  deviceUniqId: string;
  key: string;
  customName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  keyType: "DIRECT" | "THRESHOLD" | "BIT_VALUE";
  minValue?: number | string | null;
  maxValue?: number | string | null;
  maxOnly: boolean;
  bits: { bit: string; customName: string; alertToWhatsApp: boolean }[];
};

// =================================================================
// Sub-Component: AlarmDialog (Add/Edit Form) - Versi Manual
// =================================================================
interface AlarmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  initialData?: AlarmConfig | null;
}

const AlarmDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
}: AlarmDialogProps) => {
  const { client, subscribe, unsubscribe } = useMqtt(); // <-- Gunakan hook MQTT
  const [devices, setDevices] = useState<DeviceExternal[]>([]);
  const [subscribedTopic, setSubscribedTopic] = useState<string | null>(null);
  const [livePayload, setLivePayload] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ManualAlarmFormData>({
    deviceUniqId: "",
    key: "",
    customName: "",
    alarmType: "MINOR",
    keyType: "DIRECT",
    bits: [],
    maxOnly: false,
    minValue: "",
    maxValue: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ManualAlarmFormData, string>>
  >({});

  // Fetch daftar device ketika dialog dibuka
  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch("/api/devices/for-selection");
        if (!res.ok) throw new Error("Failed to fetch devices");
        const data: DeviceExternal[] = await res.json();
        setDevices(data);
      } catch (error) {
        console.error(error);
      }
    }
    if (isOpen) fetchDevices();
  }, [isOpen]);

  // Efek untuk subscribe/unsubscribe topik MQTT
  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === formData.deviceUniqId
    );
    const newTopic = selectedDevice?.topic || null;

    if (subscribedTopic && subscribedTopic !== newTopic) {
      unsubscribe(subscribedTopic);
    }
    if (newTopic && newTopic !== subscribedTopic) {
      subscribe(newTopic);
      setSubscribedTopic(newTopic);
      setLivePayload({}); // Reset payload saat ganti topik
      handleFormChange("key", ""); // Reset key saat ganti topik
    }
  }, [formData.deviceUniqId, devices, subscribe, unsubscribe, subscribedTopic]);

  // Efek untuk menangani pesan MQTT yang masuk
  useEffect(() => {
    if (!client || !subscribedTopic) return;

    const handleMessage = (topic: string, message: Buffer) => {
      if (topic === subscribedTopic) {
        try {
          const payloadStr = message.toString();
          const outerPayload = JSON.parse(payloadStr);

          // Cek jika ada 'value' yang merupakan string JSON
          if (typeof outerPayload.value === "string") {
            const innerPayload = JSON.parse(outerPayload.value);
            setLivePayload(innerPayload);
          } else {
            setLivePayload(outerPayload);
          }
        } catch (e) {
          console.error("Failed to parse MQTT payload:", e);
        }
      }
    };

    client.on("message", handleMessage);

    return () => {
      client.off("message", handleMessage);
    };
  }, [client, subscribedTopic]);

  // Efek untuk cleanup (unsubscribe) saat dialog ditutup
  useEffect(() => {
    return () => {
      if (subscribedTopic) {
        unsubscribe(subscribedTopic);
      }
    };
  }, [subscribedTopic, unsubscribe]);

  // Isi form dengan data awal (untuk mode edit) atau reset (untuk mode add)
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        deviceUniqId: initialData.deviceUniqId,
        key: initialData.key,
        customName: initialData.customName,
        alarmType: initialData.alarmType,
        keyType: initialData.keyType,
        minValue: initialData.minValue ?? "",
        maxValue: initialData.maxValue ?? "",
        maxOnly: initialData.maxOnly || false,
        bits:
          initialData.bits?.map((b) => ({
            bit: String(b.bitPosition),
            customName: b.customName,
            alertToWhatsApp: b.alertToWhatsApp,
          })) || [],
      });
    } else if (isOpen && !initialData) {
      setFormData({
        deviceUniqId: "",
        key: "",
        customName: "",
        alarmType: "MINOR",
        keyType: "DIRECT",
        bits: [],
        maxOnly: false,
        minValue: "",
        maxValue: "",
      });
    }
  }, [initialData, isOpen]);

  const handleFormChange = (field: keyof ManualAlarmFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ManualAlarmFormData, string>> = {};
    if (!formData.deviceUniqId) newErrors.deviceUniqId = "Device is required.";
    if (!formData.customName || formData.customName.length < 3)
      newErrors.customName = "Custom name must be at least 3 characters.";
    if (!formData.key) newErrors.key = "Key is required.";
    if (formData.keyType === "THRESHOLD") {
      if (
        !formData.maxOnly &&
        (formData.minValue === null || formData.minValue === "")
      )
        newErrors.minValue = "Min Value is required.";
      if (formData.maxValue === null || formData.maxValue === "")
        newErrors.maxValue = "Max Value is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/alarms/${initialData.id}` : "/api/alarms";
      const method = initialData ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save alarm.");
      }
      Swal.fire(
        "Success!",
        `Alarm has been ${initialData ? "updated" : "created"}.`,
        "success"
      );
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      Swal.fire("Error!", error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const payloadKeys = useMemo(() => {
    if (!livePayload) return [];
    const isNumber = (value: any) => typeof value === "number";
    const isBooleanOrBinary = (value: any) =>
      typeof value === "boolean" || value === 0 || value === 1;

    switch (formData.keyType) {
      case "THRESHOLD":
        return Object.keys(livePayload).filter((k) => isNumber(livePayload[k]));
      case "DIRECT":
        return Object.keys(livePayload).filter((k) =>
          isBooleanOrBinary(livePayload[k])
        );
      case "BIT_VALUE":
        return Object.keys(livePayload).filter((k) =>
          Number.isInteger(livePayload[k])
        );
      default:
        return Object.keys(livePayload);
    }
  }, [livePayload, formData.keyType]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Alarm" : "Create New Alarm"}
          </DialogTitle>
          <DialogDescription>
            Configure the conditions that will trigger a system alarm.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4"
        >
          {/* --- ROW 1: Device, Custom Name --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceUniqId">Device</Label>
              <Select
                onValueChange={(value) =>
                  handleFormChange("deviceUniqId", value)
                }
                value={formData.deviceUniqId}
              >
                <SelectTrigger id="deviceUniqId">
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.uniqId} value={d.uniqId}>
                      {d.name} ({d.topic})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.deviceUniqId && (
                <p className="text-sm text-red-500">{errors.deviceUniqId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customName">Alarm Name</Label>
              <Input
                id="customName"
                value={formData.customName}
                onChange={(e) => handleFormChange("customName", e.target.value)}
                placeholder="e.g., Server Room Overheat"
              />
              {errors.customName && (
                <p className="text-sm text-red-500">{errors.customName}</p>
              )}
            </div>
          </div>

          {/* --- ROW 2: Alarm Type, Key Type, Key --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alarmType">Alarm Type</Label>
              <Select
                onValueChange={(value) => handleFormChange("alarmType", value)}
                value={formData.alarmType}
              >
                <SelectTrigger id="alarmType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="MAJOR">Major</SelectItem>
                  <SelectItem value="MINOR">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyType">Key Type</Label>
              <Select
                onValueChange={(value) => handleFormChange("keyType", value)}
                value={formData.keyType}
              >
                <SelectTrigger id="keyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Direct</SelectItem>
                  <SelectItem value="THRESHOLD">Threshold</SelectItem>
                  <SelectItem value="BIT_VALUE">Bit Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Monitored Key</Label>
              <Select
                onValueChange={(value) => handleFormChange("key", value)}
                value={formData.key}
                disabled={!subscribedTopic || payloadKeys.length === 0}
              >
                <SelectTrigger id="key">
                  <SelectValue placeholder="Waiting for payload..." />
                </SelectTrigger>
                <SelectContent>
                  {payloadKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k} (Value: {livePayload[k]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.key && (
                <p className="text-sm text-red-500">{errors.key}</p>
              )}
            </div>
          </div>

          {/* --- KONDISIONAL: THRESHOLD --- */}
          {formData.keyType === "THRESHOLD" && (
            <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-medium">Threshold Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="minValue">Min Value</Label>
                  <Input
                    id="minValue"
                    type="number"
                    value={formData.minValue ?? ""}
                    onChange={(e) =>
                      handleFormChange("minValue", e.target.value)
                    }
                    disabled={formData.maxOnly}
                  />
                  {errors.minValue && (
                    <p className="text-sm text-red-500">{errors.minValue}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Max Value</Label>
                  <Input
                    id="maxValue"
                    type="number"
                    value={formData.maxValue ?? ""}
                    onChange={(e) =>
                      handleFormChange("maxValue", e.target.value)
                    }
                  />
                  {errors.maxValue && (
                    <p className="text-sm text-red-500">{errors.maxValue}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="maxOnly"
                    checked={formData.maxOnly}
                    onCheckedChange={(checked) =>
                      handleFormChange("maxOnly", !!checked)
                    }
                  />
                  <Label
                    htmlFor="maxOnly"
                    className="text-sm font-medium leading-none"
                  >
                    Max Value Only
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* --- KONDISIONAL: BIT VALUE (Implementasi lebih lanjut jika diperlukan) --- */}
          {formData.keyType === "BIT_VALUE" && (
            <div className="p-4 border rounded-md space-y-2 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-medium">
                Bit Configuration (Not Implemented)
              </h4>
              <p className="text-sm text-muted-foreground">
                Functionality for Bit Value configuration can be added here.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Save Changes" : "Create Alarm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// Main Page Component
// =================================================================
function AlarmManagementPage() {
  const [alarms, setAlarms] = useState<AlarmConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alarms");
      if (!response.ok) throw new Error("Failed to fetch alarms");
      const data = await response.json();
      setAlarms(data);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Could not fetch alarm configurations.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const handleAdd = () => {
    setSelectedAlarm(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (alarm: AlarmConfig) => {
    setSelectedAlarm(alarm);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/alarms/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete alarm.");
          Swal.fire("Deleted!", "The alarm has been deleted.", "success");
          fetchAlarms();
        } catch (error: any) {
          Swal.fire("Error!", error.message, "error");
        }
      }
    });
  };

  const paginatedAlarms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return alarms.slice(startIndex, startIndex + itemsPerPage);
  }, [alarms, currentPage]);

  const totalPages = Math.ceil(alarms.length / itemsPerPage);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Alarm Management
          </h1>
          <p className="text-muted-foreground">
            Define, view, and manage all system alarm configurations.
          </p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Alarm
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alarm Configurations</CardTitle>
          <CardDescription>
            A list of all configured alarms in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Alarm Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Key Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Skeleton className="h-8 w-8 inline-block" />
                        <Skeleton className="h-8 w-8 inline-block" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedAlarms.length > 0 ? (
                  paginatedAlarms.map((alarm) => (
                    <TableRow key={alarm.id}>
                      <TableCell className="font-medium">
                        {alarm.device?.name || "N/A"}
                      </TableCell>
                      <TableCell>{alarm.customName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alarm.alarmType === "CRITICAL"
                              ? "destructive"
                              : alarm.alarmType === "MAJOR"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {alarm.alarmType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alarm.keyType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(alarm)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alarm.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No alarms configured yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" /> Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlarmDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={fetchAlarms}
        initialData={selectedAlarm}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function AlarmManagementPageWithProvider() {
  return (
    <MqttProvider>
      <AlarmManagementPage />
    </MqttProvider>
  );
}
