// File: app/(dashboard)/automation/automation-values/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Edit,
  Trash2,
  ArrowRight,
  Zap,
  Settings2,
} from "lucide-react";

// --- Type Definitions ---
type AutomationValue = {
  name: string;
  topic: string;
  config: {
    key_value: string;
    logic: string;
    value: number;
  };
  relay: {
    name: string;
    pin: number;
    logic: boolean;
    address: number;
    bus: number;
  };
  type: string;
};

type DeviceProfile = {
  profile: {
    name: string;
    topic: string;
    manufacturer: string;
    part_number: string;
  };
  protocol_setting?: {
    address?: number;
    device_bus?: number;
  };
  data?: { var_name: string }[];
};

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// =================================================================
// Sub-Component: AutomationDialog
// =================================================================
interface AutomationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  onUpdate: (payload: any) => void;
  initialData?: AutomationValue | null;
  modbusDevices: DeviceProfile[];
  modularDevices: DeviceProfile[];
}

const AutomationDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  onUpdate,
  initialData,
  modbusDevices,
  modularDevices,
}: AutomationDialogProps) => {
  const [formData, setFormData] = useState<Partial<AutomationValue>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(JSON.parse(JSON.stringify(initialData)));
      } else {
        setFormData({
          config: { logic: "==", value: 0 },
          relay: { logic: true, pin: 1 },
          type: "Modular",
        });
      }
    }
  }, [isOpen, initialData]);

  const handleTriggerDeviceChange = (deviceName: string) => {
    const device = modbusDevices.find((d) => d.profile.name === deviceName);
    if (device) {
      setFormData((prev) => ({
        ...prev,
        name: device.profile.name,
        topic: device.profile.topic,
      }));
    }
  };

  const handleOutputDeviceChange = (deviceName: string) => {
    const device = modularDevices.find((d) => d.profile.name === deviceName);
    if (device) {
      setFormData((prev) => ({
        ...prev,
        relay: {
          ...prev.relay!,
          name: device.profile.name,
          address: device.protocol_setting?.address,
          bus: device.protocol_setting?.device_bus,
        },
      }));
    }
  };

  const triggerDeviceData = useMemo(() => {
    return modbusDevices.find((d) => d.profile.name === formData.name);
  }, [formData.name, modbusDevices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      onUpdate(formData);
    } else {
      onSave(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Automation Value" : "Add Automation Value"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 py-2 max-h-[70vh] overflow-y-auto pr-4"
        >
          {/* --- Trigger Section --- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap size={16} /> Trigger Condition (IF)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Trigger Device</Label>
                <Select
                  value={formData.name}
                  onValueChange={handleTriggerDeviceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modbusDevices.map((d) => (
                      <SelectItem key={d.profile.name} value={d.profile.name}>
                        {d.profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variable to Monitor</Label>
                <Select
                  value={formData.config?.key_value}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      config: { ...p.config!, key_value: val },
                    }))
                  }
                  disabled={!triggerDeviceData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a variable..." />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerDeviceData?.data?.map((item) => (
                      <SelectItem key={item.var_name} value={item.var_name}>
                        {item.var_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Logic</Label>
                <Select
                  value={formData.config?.logic}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      config: { ...p.config!, logic: val },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                    <SelectItem value=">=">
                      Greater than or equal to (&gt;=)
                    </SelectItem>
                    <SelectItem value="<=">
                      Less than or equal to (&lt;=)
                    </SelectItem>
                    <SelectItem value="==">Equal to (==)</SelectItem>
                    <SelectItem value="!=">Not equal to (!=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={formData.config?.value}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      config: {
                        ...p.config!,
                        value: parseFloat(e.target.value),
                      },
                    }))
                  }
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* --- Action Section --- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 size={16} /> Action (THEN)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Output Device</Label>
                <Select
                  value={formData.relay?.name}
                  onValueChange={handleOutputDeviceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modularDevices.map((d) => (
                      <SelectItem key={d.profile.name} value={d.profile.name}>
                        {d.profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Output Pin</Label>
                <Select
                  value={String(formData.relay?.pin)}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      relay: { ...p.relay!, pin: parseInt(val) },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Pin {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Output Logic</Label>
                <Select
                  value={String(formData.relay?.logic)}
                  onValueChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      relay: { ...p.relay!, logic: val === "true" },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ON (True)</SelectItem>
                    <SelectItem value="false">OFF (False)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Automation" : "Save Automation"}
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
function AutomationValuesPage() {
  const { client, connectionStatus } = useMqtt();
  const [automationValues, setAutomationValues] = useState<AutomationValue[]>(
    []
  );
  const [modbusDevices, setModbusDevices] = useState<DeviceProfile[]>([]);
  const [modularDevices, setModularDevices] = useState<DeviceProfile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutomationValue | null>(null);

  const TOPICS = {
    AUTOMATION_DATA: "automation_value/data",
    AUTOMATION_CREATE: "automation_value/create",
    AUTOMATION_UPDATE: "automation_value/update",
    AUTOMATION_DELETE: "automation_value/delete",
    MODBUS_DATA: "modbus_value/data",
    MODULAR_DATA: "modular_value/data",
  };

  const handleMqttMessage = useCallback(
    (topic: string, message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        switch (topic) {
          case TOPICS.AUTOMATION_DATA:
            setAutomationValues(data);
            break;
          case TOPICS.MODBUS_DATA:
            setModbusDevices(data);
            break;
          case TOPICS.MODULAR_DATA:
            setModularDevices(data);
            break;
        }
      } catch (e) {
        console.error(`Failed to parse MQTT message on ${topic}:`, e);
      }
    },
    [TOPICS]
  );

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      const topicsToSubscribe = Object.values(TOPICS).filter((t) =>
        t.endsWith("/data")
      );
      client.subscribe(topicsToSubscribe);
      client.on("message", handleMqttMessage);
      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, handleMqttMessage, TOPICS]);

  const publish = (topic: string, payload: object) => {
    if (client) client.publish(topic, JSON.stringify(payload));
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: AutomationValue) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (item: AutomationValue) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete automation "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(TOPICS.AUTOMATION_DELETE, { name: item.name });
        Toast.fire({ icon: "success", title: "Delete command sent!" });
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Automation Values
          </h1>
          <p className="text-muted-foreground">
            Create simple IF-THEN logic to automate device actions based on
            sensor values.
          </p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Automation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger Device</TableHead>
                  <TableHead className="text-center">Condition</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automationValues.length > 0 ? (
                  automationValues.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.topic}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        IF{" "}
                        <Badge variant="secondary">
                          {item.config.key_value}
                        </Badge>{" "}
                        {item.config.logic} {item.config.value}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.relay.name} (Pin {item.relay.pin})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Turn{" "}
                          <span
                            className={
                              item.relay.logic
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {item.relay.logic ? "ON" : "OFF"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No automation rules found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AutomationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={(payload) => publish(TOPICS.AUTOMATION_CREATE, payload)}
        onUpdate={(payload) => publish(TOPICS.AUTOMATION_UPDATE, payload)}
        initialData={editingItem}
        modbusDevices={modbusDevices}
        modularDevices={modularDevices}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function AutomationValuesPageWithProvider() {
  return (
    <MqttProvider>
      <AutomationValuesPage />
    </MqttProvider>
  );
}
