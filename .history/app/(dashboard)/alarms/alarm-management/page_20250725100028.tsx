// File: app/(dashboard)/alarm-management/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Swal from "sweetalert2";

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

// --- Zod Schema for Validation ---
const alarmFormSchema = z
  .object({
    deviceUniqId: z.string().min(1, "Device is required."),
    key: z.string().min(1, "Key is required."),
    customName: z.string().min(3, "Custom name must be at least 3 characters."),
    alarmType: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
    keyType: z.enum(["DIRECT", "THRESHOLD", "BIT_VALUE"]),
    minValue: z.coerce.number().optional().nullable(),
    maxValue: z.coerce.number().optional().nullable(),
    maxOnly: z.boolean().optional(),
    bits: z
      .array(
        z.object({
          bit: z.string().min(1, "Bit position is required."),
          customName: z.string().min(1, "Bit custom name is required."),
          alertToWhatsApp: z.boolean(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.keyType === "THRESHOLD" && !data.maxOnly) {
        return data.minValue != null && data.minValue !== undefined;
      }
      return true;
    },
    {
      message: "Min Value is required unless 'Max Only' is checked.",
      path: ["minValue"],
    }
  )
  .refine(
    (data) => {
      if (data.keyType === "THRESHOLD") {
        return data.maxValue != null && data.maxValue !== undefined;
      }
      return true;
    },
    { message: "Max Value is required.", path: ["maxValue"] }
  );

type AlarmFormData = z.infer<typeof alarmFormSchema>;

// =================================================================
// Sub-Component: AlarmDialog (Add/Edit Form)
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
  const [devices, setDevices] = useState<DeviceExternal[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceExternal | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AlarmFormData>({
    resolver: zodResolver(alarmFormSchema),
    defaultValues: {
      deviceUniqId: "",
      key: "",
      customName: "",
      alarmType: "MINOR",
      keyType: "DIRECT",
      bits: [],
      maxOnly: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "bits",
  });

  const keyType = form.watch("keyType");
  const selectedDeviceUniqId = form.watch("deviceUniqId");

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

  useEffect(() => {
    const device =
      devices.find((d) => d.uniqId === selectedDeviceUniqId) || null;
    setSelectedDevice(device);
    if (form.getValues("deviceUniqId") !== selectedDeviceUniqId) {
      form.resetField("key");
    }
  }, [selectedDeviceUniqId, devices, form]);

  useEffect(() => {
    if (isOpen && initialData) {
      form.reset({
        deviceUniqId: initialData.deviceUniqId,
        key: initialData.key,
        customName: initialData.customName,
        alarmType: initialData.alarmType,
        keyType: initialData.keyType,
        minValue: initialData.minValue,
        maxValue: initialData.maxValue,
        maxOnly: initialData.maxOnly || false,
        bits:
          initialData.bits?.map((b) => ({
            bit: String(b.bitPosition),
            customName: b.customName,
            alertToWhatsApp: b.alertToWhatsApp,
          })) || [],
      });
    } else if (isOpen && !initialData) {
      form.reset({
        deviceUniqId: "",
        key: "",
        customName: "",
        alarmType: "MINOR",
        keyType: "DIRECT",
        bits: [],
        maxOnly: false,
      });
    }
  }, [initialData, isOpen, form]);

  const onSubmit = async (data: AlarmFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        deviceUniqId: data.deviceUniqId, // Ensure deviceUniqId is in payload
        bits: data.keyType === "BIT_VALUE" ? data.bits : undefined,
      };
      const url = initialData ? `/api/alarms/${initialData.id}` : "/api/alarms";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    if (!selectedDevice?.lastPayload) return [];
    const payload = selectedDevice.lastPayload;
    const isNumber = (value: any) => typeof value === "number";
    const isBooleanOrBinary = (value: any) =>
      typeof value === "boolean" || value === 0 || value === 1;

    switch (keyType) {
      case "THRESHOLD":
        return Object.keys(payload).filter((k) => isNumber(payload[k]));
      case "DIRECT":
        return Object.keys(payload).filter((k) =>
          isBooleanOrBinary(payload[k])
        );
      case "BIT_VALUE":
        return Object.keys(payload).filter((k) => Number.isInteger(payload[k]));
      default:
        return Object.keys(payload);
    }
  }, [selectedDevice, keyType]);

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
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4"
        >
          {/* --- ROW 1: Device, Custom Name --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="deviceUniqId"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="deviceUniqId">Device</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="deviceUniqId">
                      <SelectValue placeholder="Select a device..." />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.uniqId} value={d.uniqId}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="customName">Alarm Name</Label>
              <Input
                id="customName"
                {...form.register("customName")}
                placeholder="e.g., Server Room Overheat"
              />
              {form.formState.errors.customName && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.customName.message}
                </p>
              )}
            </div>
          </div>

          {/* --- ROW 2: Alarm Type, Key Type, Key --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Controller
              name="alarmType"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="alarmType">Alarm Type</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="alarmType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="MAJOR">Major</SelectItem>
                      <SelectItem value="MINOR">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="keyType"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="keyType">Key Type</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="keyType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="THRESHOLD">Threshold</SelectItem>
                      <SelectItem value="BIT_VALUE">Bit Value</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="key"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="key">Monitored Key</Label>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedDevice || payloadKeys.length === 0}
                  >
                    <SelectTrigger id="key">
                      <SelectValue placeholder="Select a key..." />
                    </SelectTrigger>
                    <SelectContent>
                      {payloadKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          {/* --- CONDITIONAL: THRESHOLD --- */}
          {keyType === "THRESHOLD" && (
            <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-medium">Threshold Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="minValue">Min Value</Label>
                  <Input
                    id="minValue"
                    type="number"
                    {...form.register("minValue")}
                    disabled={form.watch("maxOnly")}
                  />
                  {form.formState.errors.minValue && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.minValue.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Max Value</Label>
                  <Input
                    id="maxValue"
                    type="number"
                    {...form.register("maxValue")}
                  />
                  {form.formState.errors.maxValue && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.maxValue.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Controller
                    name="maxOnly"
                    control={form.control}
                    render={({ field }) => (
                      <Checkbox
                        id="maxOnly"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label
                    htmlFor="maxOnly"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Max Value Only
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* --- CONDITIONAL: BIT VALUE --- */}
          {keyType === "BIT_VALUE" && (
            <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-medium">Bit Configuration</h4>
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-end border-b pb-4"
                >
                  <Controller
                    name={`bits.${index}.bit`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-2 col-span-3">
                        <Label>Bit Position</Label>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
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
                        {fieldState.error && (
                          <p className="text-sm text-red-500">
                            {fieldState.error.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                  <div className="space-y-2 col-span-6">
                    <Label>Custom Name</Label>
                    <Input
                      {...form.register(`bits.${index}.customName`)}
                      placeholder="e.g., Door Open Alarm"
                    />
                    {form.formState.errors.bits?.[index]?.customName && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.bits[index].customName.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 col-span-2 pb-2">
                    <Controller
                      name={`bits.${index}.alertToWhatsApp`}
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label className="text-sm">Alert WA</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="col-span-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ bit: "0", customName: "", alertToWhatsApp: false })
                }
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
export default function AlarmManagementPage() {
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
            Page {currentPage} of {totalPages}
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
