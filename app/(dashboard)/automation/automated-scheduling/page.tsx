// File: app/(dashboard)/automation/automated-scheduling/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Switch } from "@/components/ui/switch";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  X,
  RefreshCw,
  CalendarDays,
} from "lucide-react";

// --- Type Definitions ---
type Control = {
  pin: number;
  customName: string;
  onTime: string;
  offTime: string;
};

type DeviceSchedule = {
  id: string;
  customName: string;
  deviceName: string;
  mac: string;
  address: string;
  device_bus: string;
  part_number: string;
  startDay: string;
  endDay: string;
  controls: Control[];
};

type AvailableDevice = {
  name: string;
  address: string;
  device_bus: string;
  part_number: string;
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// =================================================================
// Sub-Component: ScheduleDialog (Add/Edit Form)
// =================================================================
interface ScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (action: "add" | "set", data: any) => void;
  initialData?: DeviceSchedule | null;
  availableDevices: AvailableDevice[];
}

const ScheduleDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  availableDevices,
}: ScheduleDialogProps) => {
  const [formData, setFormData] = useState<Partial<DeviceSchedule>>({});
  const [selectedDeviceName, setSelectedDeviceName] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(JSON.parse(JSON.stringify(initialData))); // Deep copy
        setSelectedDeviceName(initialData.deviceName);
      } else {
        setFormData({
          customName: "",
          startDay: "Mon",
          endDay: "Sun",
          controls: [
            { pin: 1, customName: "", onTime: "08:00", offTime: "17:00" },
          ],
        });
        setSelectedDeviceName("");
      }
    }
  }, [isOpen, initialData]);

  const uniqueDeviceNames = useMemo(
    () => [...new Set(availableDevices.map((d) => d.name))],
    [availableDevices]
  );

  const handleDeviceNameChange = (name: string) => {
    setSelectedDeviceName(name);
    const device = availableDevices.find((d) => d.name === name);
    if (device) {
      setFormData((prev) => ({
        ...prev,
        deviceName: device.name,
        address: device.address,
        device_bus: device.device_bus,
        part_number: device.part_number,
      }));
    }
  };

  const handleControlChange = (
    index: number,
    field: keyof Control,
    value: any
  ) => {
    const newControls = [...(formData.controls || [])];
    newControls[index] = { ...newControls[index], [field]: value };
    setFormData((prev) => ({ ...prev, controls: newControls }));
  };

  const addControl = () => {
    const newControls = [...(formData.controls || [])];
    const usedPins = new Set(newControls.map((c) => c.pin));
    let nextPin = 1;
    while (usedPins.has(nextPin)) {
      nextPin++;
    }
    newControls.push({
      pin: nextPin,
      customName: "",
      onTime: "08:00",
      offTime: "17:00",
    });
    setFormData((prev) => ({ ...prev, controls: newControls }));
  };

  const removeControl = (index: number) => {
    const newControls = [...(formData.controls || [])];
    newControls.splice(index, 1);
    setFormData((prev) => ({ ...prev, controls: newControls }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = initialData ? "set" : "add";
    const dataToSave = { ...formData };
    if (!initialData) {
      dataToSave.id = `${Date.now()}`;
    }
    onSave(action, dataToSave);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Device Schedule" : "Add New Device Schedule"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Select
                value={selectedDeviceName}
                onValueChange={handleDeviceNameChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDeviceNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custom Name</Label>
              <Input
                value={formData.customName}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, customName: e.target.value }))
                }
                placeholder="Enter Custom Name"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Day</Label>
              <Select
                value={formData.startDay}
                onValueChange={(day) =>
                  setFormData((p) => ({ ...p, startDay: day }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Day</Label>
              <Select
                value={formData.endDay}
                onValueChange={(day) =>
                  setFormData((p) => ({ ...p, endDay: day }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <h4 className="font-medium">Controls</h4>
            {formData.controls?.map((control, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-b-0"
              >
                <div className="col-span-12 md:col-span-6 space-y-2">
                  <Label>Control Name</Label>
                  <Input
                    value={control.customName}
                    onChange={(e) =>
                      handleControlChange(index, "customName", e.target.value)
                    }
                    placeholder="e.g., Main Light"
                  />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-2">
                  <Label>Pin</Label>
                  <Input
                    type="number"
                    value={control.pin}
                    onChange={(e) =>
                      handleControlChange(
                        index,
                        "pin",
                        parseInt(e.target.value)
                      )
                    }
                    required
                  />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-2">
                  <Label>On Time</Label>
                  <Input
                    type="time"
                    value={control.onTime}
                    onChange={(e) =>
                      handleControlChange(index, "onTime", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-2">
                  <Label>Off Time</Label>
                  <Input
                    type="time"
                    value={control.offTime}
                    onChange={(e) =>
                      handleControlChange(index, "offTime", e.target.value)
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeControl(index)}
                  className="col-span-12 md:col-span-1 text-red-500 hover:text-red-700 mt-2 md:mt-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addControl}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Control
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Schedule" : "Add Schedule"}
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
function AutomatedSchedulingPage() {
  const { client, connectionStatus } = useMqtt();
  const [schedules, setSchedules] = useState<DeviceSchedule[]>([]);
  const [autoControl, setAutoControl] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>(
    []
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeviceSchedule | null>(
    null
  );

  const TOPIC_COMMAND = "command_control_scheduler";
  const TOPIC_RESPONSE = "response_control_scheduler";

  const publishMessage = useCallback(
    (payload: object, topic = TOPIC_COMMAND) => {
      if (client) {
        client.publish(topic, JSON.stringify(payload));
      }
    },
    [client]
  );

  const handleMqttMessage = useCallback((topic: string, message: Buffer) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log(`[MQTT] Message on ${topic}:`, payload);

      if (topic === TOPIC_RESPONSE) {
        if (payload.devices) setSchedules(payload.devices);
        if (typeof payload.autoControl === "boolean")
          setAutoControl(payload.autoControl);
        if (payload.availableDevices)
          setAvailableDevices(payload.availableDevices);
      }
    } catch (e) {
      console.error("Failed to parse MQTT message:", e);
    }
  }, []);

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(TOPIC_RESPONSE);
      client.on("message", handleMqttMessage);

      // Initial fetch
      publishMessage({ action: "get" });

      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, publishMessage, handleMqttMessage]);

  const handleAdd = () => {
    publishMessage({ action: "get_devices" }); // Get latest devices before opening modal
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (schedule: DeviceSchedule) => {
    publishMessage({ action: "get_devices" });
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This schedule will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publishMessage({ action: "delete", data: { id } });
        Toast.fire({ icon: "success", title: "Delete command sent!" });
      }
    });
  };

  const handleSave = (action: "add" | "set", data: any) => {
    publishMessage({ action, data });
    Toast.fire({
      icon: "success",
      title: `Schedule ${action === "add" ? "added" : "updated"}!`,
    });
  };

  const handleToggleAutoControl = (checked: boolean) => {
    setAutoControl(checked);
    publishMessage({
      action: "update_autoControl",
      data: { autoControl: checked },
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Automated Scheduling
        </h1>
        <p className="text-muted-foreground">
          Manage and automate device controls based on time and day schedules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Device Scheduler Control</CardTitle>
              <CardDescription>
                Status:{" "}
                <span
                  className={
                    connectionStatus === "Connected"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {connectionStatus}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => publishMessage({ action: "get" })}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Get Configuration
              </Button>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-control"
                  checked={autoControl}
                  onCheckedChange={handleToggleAutoControl}
                />
                <Label htmlFor="auto-control">Control State</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Device Schedule
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custom Name</TableHead>
                  <TableHead>Active Days</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.customName}
                      </TableCell>
                      <TableCell>
                        {schedule.startDay} - {schedule.endDay}
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc pl-5 space-y-1">
                          {schedule.controls.map((control, i) => (
                            <li key={i} className="text-sm">
                              <span className="font-semibold">
                                {control.customName || `Pin ${control.pin}`}
                              </span>
                              : ON at {control.onTime}, OFF at {control.offTime}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No schedules found. Click "Add Device Schedule" to create
                      one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ScheduleDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        initialData={editingSchedule}
        availableDevices={availableDevices}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function AutomatedSchedulingPageWithProvider() {
  return (
    <MqttProvider>
      <AutomatedSchedulingPage />
    </MqttProvider>
  );
}
