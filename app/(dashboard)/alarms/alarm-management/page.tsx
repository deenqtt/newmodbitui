// File: app/(dashboard)/alarm-management/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext"; // <-- IMPORT MQTT
import { useSortableTable } from "@/hooks/use-sort-table";
import { showToast } from "@/lib/toast-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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

// Confirmation Dialog State
const [confirmationProps, setConfirmationProps] = useState<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "info" | "warning" | "destructive";
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}>({
  open: false,
  onOpenChange: () => {},
  type: "info",
  title: "",
  description: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  onConfirm: () => {},
  onCancel: () => {},
});

const showConfirmation = (props: Partial<typeof confirmationProps>) => {
  setConfirmationProps(prev => ({
    ...prev,
    ...props,
    open: true,
    onOpenChange: (open) => setConfirmationProps(prev => ({ ...prev, open })),
  }));
};

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
  const { subscribe, unsubscribe } = useMqtt();
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

  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch("/api/devices/for-selection");
        if (!res.ok) throw new Error("Failed to fetch devices");
        setDevices(await res.json());
      } catch (error) {
        console.error(error);
      }
    }
    if (isOpen) fetchDevices();
  }, [isOpen]);

  const handleMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      const outerPayload = JSON.parse(payloadStr);
      if (typeof outerPayload.value === "string") {
        const innerPayload = JSON.parse(outerPayload.value);
        setLivePayload(innerPayload);
      } else {
        setLivePayload(outerPayload.value || outerPayload);
      }
    } catch (e) {
      console.error("Failed to parse MQTT payload:", e);
    }
  }, []);

  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === formData.deviceUniqId
    );
    const newTopic = selectedDevice?.topic || null;

    if (subscribedTopic && subscribedTopic !== newTopic) {
      unsubscribe(subscribedTopic, handleMessage);
    }
    if (newTopic && newTopic !== subscribedTopic) {
      subscribe(newTopic, handleMessage);
      setSubscribedTopic(newTopic);
      setLivePayload({});
      handleFormChange("key", "");
    }
  }, [
    formData.deviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    subscribedTopic,
    handleMessage,
  ]);

  useEffect(() => {
    return () => {
      if (subscribedTopic) {
        unsubscribe(subscribedTopic, handleMessage);
      }
    };
  }, [subscribedTopic, unsubscribe, handleMessage]);

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

  const handleBitChange = (
    index: number,
    field: "bit" | "customName" | "alertToWhatsApp",
    value: any
  ) => {
    const newBits = [...formData.bits];
    newBits[index] = { ...newBits[index], [field]: value };
    handleFormChange("bits", newBits);
  };

  const addBit = () => {
    handleFormChange("bits", [
      ...formData.bits,
      { bit: "0", customName: "", alertToWhatsApp: false },
    ]);
  };

  const removeBit = (index: number) => {
    const newBits = [...formData.bits];
    newBits.splice(index, 1);
    handleFormChange("bits", newBits);
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
      showToast.success(`Alarm has been ${initialData ? "updated" : "created"}.`);
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      showToast.error("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const payloadKeys = useMemo(() => {
    if (!livePayload || typeof livePayload !== "object") return [];
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
          {/* --- ROW 1 & 2 --- */}
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

          {/* --- KONDISIONAL: BIT VALUE --- */}
          {formData.keyType === "BIT_VALUE" && (
            <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-medium">Bit Configuration</h4>
              {formData.bits.map((bit, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-b-0"
                >
                  <div className="space-y-2 col-span-3">
                    <Label>Bit Position</Label>
                    <Select
                      onValueChange={(value) =>
                        handleBitChange(index, "bit", value)
                      }
                      value={bit.bit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }).map((_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-6">
                    <Label>Custom Name</Label>
                    <Input
                      value={bit.customName}
                      onChange={(e) =>
                        handleBitChange(index, "customName", e.target.value)
                      }
                      placeholder="e.g., Door Open Alarm"
                    />
                  </div>
                  <div className="flex items-center space-x-2 col-span-2 pb-2">
                    <Checkbox
                      checked={bit.alertToWhatsApp}
                      onCheckedChange={(checked) =>
                        handleBitChange(index, "alertToWhatsApp", !!checked)
                      }
                    />
                    <Label className="text-sm">Alert WA</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBit(index)}
                    className="col-span-1 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBit}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Bit
              </Button>
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
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Apply sorting using useSortableTable hook
  const { sorted: sortedAlarms, sortKey, sortDirection, handleSort } = useSortableTable(alarms);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedAlarms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlarms = sortedAlarms.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortKey, sortDirection]);

  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alarms");
      if (!response.ok) throw new Error("Failed to fetch alarms");
      setAlarms(await response.json());
    } catch (error: any) {
      console.error(error);
      showToast.error("Failed to fetch alarms", error.message || "Could not fetch alarm configurations.");
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
    showConfirmation({
      type: "destructive",
      title: "Delete Alarm",
      description: "Are you sure you want to delete this alarm? This action cannot be undone.",
      confirmText: "Yes, delete it",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/alarms/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete alarm.");
          showToast.success("The alarm has been deleted.");
          fetchAlarms();
        } catch (error: any) {
          showToast.error("Deletion failed", error.message);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Alarm Management
            </h1>
            <p className="text-muted-foreground">
              Define, view, and manage all system alarm configurations.
            </p>
          </div>

          <Button onClick={handleAdd}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Alarm
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <PlusCircle className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Alarms</p>
                  <p className="text-2xl font-bold">{alarms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Badge className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</Badge>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alarms.filter(a => a.alarmType === 'CRITICAL').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Badge className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</Badge>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Major</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {alarms.filter(a => a.alarmType === 'MAJOR').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Badge className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">m</Badge>
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Minor</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {alarms.filter(a => a.alarmType === 'MINOR').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Search alarms by name..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table/List Toggle */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {paginatedAlarms.length} of {sortedAlarms.length} alarms
            </span>
          </div>
        </div>

        {/* Devices Table */}
        <Card>
          <CardContent className="p-0">
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
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-48"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-8 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : paginatedAlarms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <PlusCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Alarms Found</h3>
                        <p className="text-muted-foreground">
                          Get started by adding your first alarm configuration
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAlarms.map((alarm) => (
                    <TableRow key={alarm.id} className="hover:bg-muted/50">
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
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <AlarmDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={fetchAlarms}
          initialData={selectedAlarm}
        />
      </div>
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
