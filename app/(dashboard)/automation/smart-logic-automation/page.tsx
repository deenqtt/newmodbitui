// File: app/(dashboard)/automation/smart-logic-automation/page.tsx
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
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Edit,
  Trash2,
  X,
  RefreshCw,
  Zap,
  Settings2,
} from "lucide-react";

// --- Type Definitions ---
type ControlRelay = {
  customName: string;
  address: number;
  bus: number;
  pin: number;
  set_value: boolean;
  control_type: "auto" | "delay";
  delay: number;
  latching_mode: boolean;
};

type DryContact = {
  customName: string;
  address: number;
  bus: number;
  pin: number;
  expected_value: boolean;
  control_relays: ControlRelay[];
};

type LogicConfig = {
  id: string;
  drycontact: DryContact;
};

type DeviceOption = {
  name: string;
  address: number;
  bus: number;
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
// Sub-Component: LogicDialog
// =================================================================
interface LogicDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  initialData?: LogicConfig | null;
  inputDevices: DeviceOption[];
  outputDevices: DeviceOption[];
}

const LogicDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  inputDevices,
  outputDevices,
}: LogicDialogProps) => {
  const [formData, setFormData] = useState<Partial<LogicConfig>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(JSON.parse(JSON.stringify(initialData))); // Deep copy
      } else {
        setFormData({
          drycontact: {
            customName: "",
            address: 0,
            bus: 0,
            pin: 1,
            expected_value: true,
            control_relays: [
              {
                customName: "",
                address: 0,
                bus: 0,
                pin: 1,
                set_value: true,
                control_type: "auto",
                delay: 0,
                latching_mode: false,
              },
            ],
          },
        });
      }
    }
  }, [isOpen, initialData]);

  const handleInputChange = (field: keyof DryContact, value: any) => {
    setFormData((p) => ({
      ...p,
      drycontact: { ...p.drycontact!, [field]: value },
    }));
  };

  const handleInputDeviceChange = (deviceName: string) => {
    const device = inputDevices.find((d) => d.name === deviceName);
    if (device) {
      handleInputChange("customName", device.name);
      handleInputChange("address", device.address);
      handleInputChange("bus", device.bus);
    }
  };

  const handleRelayChange = (
    index: number,
    field: keyof ControlRelay,
    value: any
  ) => {
    const newRelays = [...(formData.drycontact?.control_relays || [])];
    newRelays[index] = { ...newRelays[index], [field]: value };
    handleInputChange("control_relays", newRelays);
  };

  const handleRelayDeviceChange = (index: number, deviceName: string) => {
    const device = outputDevices.find((d) => d.name === deviceName);
    if (device) {
      const newRelays = [...(formData.drycontact?.control_relays || [])];
      newRelays[index] = {
        ...newRelays[index],
        customName: device.name,
        address: device.address,
        bus: device.bus,
      };
      handleInputChange("control_relays", newRelays);
    }
  };

  const addRelay = () => {
    const newRelay: ControlRelay = {
      customName: "",
      address: 0,
      bus: 0,
      pin: 1,
      set_value: true,
      control_type: "auto",
      delay: 0,
      latching_mode: false,
    };
    handleInputChange("control_relays", [
      ...(formData.drycontact?.control_relays || []),
      newRelay,
    ]);
  };

  const removeRelay = (index: number) => {
    const newRelays = [...(formData.drycontact?.control_relays || [])];
    newRelays.splice(index, 1);
    handleInputChange("control_relays", newRelays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = initialData ? "update" : "create";
    const data = initialData ? { ...formData, id: initialData.id } : formData;
    onSave({ command, data });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? "Edit Logic Configuration"
              : "Add Logic Configuration"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 py-2 max-h-[80vh] overflow-y-auto pr-4"
        >
          {/* --- Input Section --- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap size={16} /> Input Trigger (IF)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Input Device (Dry Contact)</Label>
                <Select
                  value={formData.drycontact?.customName}
                  onValueChange={handleInputDeviceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an input device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inputDevices.map((d) => (
                      <SelectItem key={d.name} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Input Pin</Label>
                <Input
                  type="number"
                  value={formData.drycontact?.pin}
                  onChange={(e) =>
                    handleInputChange("pin", parseInt(e.target.value))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Value to Trigger</Label>
                <Select
                  value={String(formData.drycontact?.expected_value)}
                  onValueChange={(val) =>
                    handleInputChange("expected_value", val === "true")
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

          {/* --- Output Section --- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 size={16} /> Output Actions (THEN)
            </legend>
            <div className="space-y-4 pt-2">
              {formData.drycontact?.control_relays.map((relay, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-md bg-slate-50 dark:bg-slate-800/50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Relay Action {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRelay(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Output Device (Relay)</Label>
                      <Select
                        value={relay.customName}
                        onValueChange={(name) =>
                          handleRelayDeviceChange(index, name)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an output device..." />
                        </SelectTrigger>
                        <SelectContent>
                          {outputDevices.map((d) => (
                            <SelectItem key={d.name} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Pin</Label>
                      <Input
                        type="number"
                        value={relay.pin}
                        onChange={(e) =>
                          handleRelayChange(
                            index,
                            "pin",
                            parseInt(e.target.value)
                          )
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Set Value</Label>
                      <Select
                        value={String(relay.set_value)}
                        onValueChange={(val) =>
                          handleRelayChange(index, "set_value", val === "true")
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
                    <div className="space-y-2">
                      <Label>Control Type</Label>
                      <Select
                        value={relay.control_type}
                        onValueChange={(val) =>
                          handleRelayChange(index, "control_type", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="delay">Delay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {relay.control_type === "delay" && (
                      <div className="space-y-2">
                        <Label>Delay (seconds)</Label>
                        <Input
                          type="number"
                          value={relay.delay}
                          onChange={(e) =>
                            handleRelayChange(
                              index,
                              "delay",
                              parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id={`latching-${index}`}
                        checked={relay.latching_mode}
                        onCheckedChange={(val) =>
                          handleRelayChange(index, "latching_mode", val)
                        }
                      />
                      <Label htmlFor={`latching-${index}`}>Latching Mode</Label>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRelay}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Relay Action
              </Button>
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
              {initialData ? "Update Logic" : "Save Logic"}
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
function SmartLogicAutomationPage() {
  const { client, connectionStatus } = useMqtt();
  const [logicConfigs, setLogicConfigs] = useState<LogicConfig[]>([]);
  const [inputDevices, setInputDevices] = useState<DeviceOption[]>([]);
  const [outputDevices, setOutputDevices] = useState<DeviceOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LogicConfig | null>(null);

  const TOPICS = {
    COMMAND_CONTROL: "command_control_drycontact",
    RESPONSE_CONTROL: "response_control_drycontact",
    COMMAND_DEVICES: "command_installed_device",
    RESPONSE_DEVICES: "response_installed_device",
    RESPONSE_GET_DATA: "response_get_data",
  };

  const publish = useCallback(
    (topic: string, payload: object) => {
      if (client) client.publish(topic, JSON.stringify(payload));
    },
    [client]
  );

  const handleMqttMessage = useCallback(
    (topic: string, message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === TOPICS.RESPONSE_DEVICES) {
          setInputDevices(
            data.data
              .filter((d: any) => d.profile.part_number === "DRYCONTACT")
              .map((d: any) => ({
                name: d.profile.name,
                address: d.protocol_setting.address,
                bus: d.protocol_setting.device_bus,
              }))
          );
          setOutputDevices(
            data.data
              .filter((d: any) => d.profile.part_number.startsWith("RELAY"))
              .map((d: any) => ({
                name: d.profile.name,
                address: d.protocol_setting.address,
                bus: d.protocol_setting.device_bus,
              }))
          );
        } else if (topic === TOPICS.RESPONSE_GET_DATA) {
          setLogicConfigs(data.data.read_data || []);
        } else if (topic === TOPICS.RESPONSE_CONTROL) {
          if (data.status === "success") {
            Toast.fire({ icon: "success", title: data.message });
            publish(TOPICS.COMMAND_CONTROL, { action: "get" }); // Refresh data
          } else {
            Swal.fire({ icon: "error", title: "Error", text: data.message });
          }
        }
      } catch (e) {
        console.error(`Failed to parse MQTT message on ${topic}:`, e);
      }
    },
    [TOPICS, publish]
  );

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      const topicsToSubscribe = [
        TOPICS.RESPONSE_DEVICES,
        TOPICS.RESPONSE_GET_DATA,
        TOPICS.RESPONSE_CONTROL,
      ];
      client.subscribe(topicsToSubscribe);
      client.on("message", handleMqttMessage);
      publish(TOPICS.COMMAND_CONTROL, { action: "get" });
      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, publish, handleMqttMessage, TOPICS]);

  const handleAdd = () => {
    publish(TOPICS.COMMAND_DEVICES, '"read_device"');
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: LogicConfig) => {
    publish(TOPICS.COMMAND_DEVICES, '"read_device"');
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This logic rule will be deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(TOPICS.COMMAND_CONTROL, { command: "delete", data: { id } });
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Smart Logic Automation
          </h1>
          <p className="text-muted-foreground">
            Define IF-THEN rules to automate relay actions based on dry contact
            inputs.
          </p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Logic
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logic Control Configurations</CardTitle>
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
                  <TableHead>Input (IF)</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Output Actions (THEN)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logicConfigs.length > 0 ? (
                  logicConfigs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">
                          {item.drycontact.customName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pin {item.drycontact.pin}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          is {item.drycontact.expected_value ? "ON" : "OFF"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {item.drycontact.control_relays.map((relay, i) => (
                            <li key={i}>
                              <span className="font-semibold">
                                {relay.customName}
                              </span>{" "}
                              (Pin {relay.pin}) →
                              <span
                                className={
                                  relay.set_value
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {" "}
                                {relay.set_value ? "ON" : "OFF"}{" "}
                              </span>
                              {relay.control_type === "delay" &&
                                `after ${relay.delay}s`}
                            </li>
                          ))}
                        </ul>
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
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No logic rules configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <LogicDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={(payload) => publish(TOPICS.COMMAND_CONTROL, payload)}
        initialData={editingItem}
        inputDevices={inputDevices}
        outputDevices={outputDevices}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function SmartLogicAutomationPageWithProvider() {
  return (
    <MqttProvider>
      <SmartLogicAutomationPage />
    </MqttProvider>
  );
}
