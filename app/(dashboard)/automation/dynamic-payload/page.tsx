// File: app/(dashboard)/automation/dynamic-payload/page.tsx
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PlusCircle,
  Edit,
  Trash2,
  X,
  RefreshCw,
  Cuboid,
  ArrowRight,
} from "lucide-react";

// --- Type Definitions ---
type IncludedDevice = {
  name: string;
  value_group: string;
  value_keys: Record<string, string>; // { original_key: new_key_name }
};

type DynamicPayloadGroup = {
  summary_topic: string;
  included_devices: IncludedDevice[];
  retain: boolean;
  qos: number;
  interval: number;
};

type SummaryConfig = {
  groups: DynamicPayloadGroup[];
};

type AvailableDevice = {
  name: string;
  part_number: string;
  // Assuming keys are provided, if not, this needs adjustment
  keys: string[];
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
// Sub-Component: DynamicPayloadDialog
// =================================================================
interface DynamicPayloadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  initialData?: DynamicPayloadGroup | null;
  availableDevices: AvailableDevice[];
}

const DynamicPayloadDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  availableDevices,
}: DynamicPayloadDialogProps) => {
  const [formData, setFormData] = useState<Partial<DynamicPayloadGroup>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Deep copy to avoid direct state mutation
        setFormData(JSON.parse(JSON.stringify(initialData)));
      } else {
        setFormData({
          summary_topic: "",
          included_devices: [],
          interval: 10,
          qos: 0,
          retain: false,
        });
      }
    }
  }, [isOpen, initialData]);

  const handleDeviceChange = (deviceIndex: number, newDeviceName: string) => {
    const newDevices = [...(formData.included_devices || [])];
    newDevices[deviceIndex] = {
      ...newDevices[deviceIndex],
      name: newDeviceName,
      value_keys: {},
    };
    setFormData((prev) => ({ ...prev, included_devices: newDevices }));
  };

  const handleValueKeyChange = (
    devIdx: number,
    keyIdx: number,
    field: "original" | "new",
    value: string
  ) => {
    const newDevices = [...(formData.included_devices || [])];
    const oldKeys = newDevices[devIdx].value_keys;
    const entries = Object.entries(oldKeys);

    if (field === "original") entries[keyIdx][0] = value;
    if (field === "new") entries[keyIdx][1] = value;

    newDevices[devIdx].value_keys = Object.fromEntries(entries);
    setFormData((p) => ({ ...p, included_devices: newDevices }));
  };

  const addDevice = () => {
    const newDevice: IncludedDevice = {
      name: "",
      value_group: "",
      value_keys: {},
    };
    setFormData((p) => ({
      ...p,
      included_devices: [...(p.included_devices || []), newDevice],
    }));
  };

  const removeDevice = (index: number) => {
    const newDevices = [...(formData.included_devices || [])];
    newDevices.splice(index, 1);
    setFormData((p) => ({ ...p, included_devices: newDevices }));
  };

  const addValueKey = (deviceIndex: number) => {
    const newDevices = [...(formData.included_devices || [])];
    newDevices[deviceIndex].value_keys[
      `new_key_${Object.keys(newDevices[deviceIndex].value_keys).length}`
    ] = "custom_name";
    setFormData((p) => ({ ...p, included_devices: newDevices }));
  };

  const removeValueKey = (deviceIndex: number, keyToRemove: string) => {
    const newDevices = [...(formData.included_devices || [])];
    delete newDevices[deviceIndex].value_keys[keyToRemove];
    setFormData((p) => ({ ...p, included_devices: newDevices }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Dynamic Payload" : "Create Dynamic Payload"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custom Topic Name</Label>
              <Input
                value={formData.summary_topic}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, summary_topic: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Publish Interval (seconds)</Label>
              <Input
                type="number"
                value={formData.interval}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    interval: parseInt(e.target.value),
                  }))
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
            <div className="space-y-2">
              <Label>QoS Level</Label>
              <Select
                value={String(formData.qos)}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, qos: parseInt(val) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="retain"
                checked={formData.retain}
                onCheckedChange={(val) =>
                  setFormData((p) => ({ ...p, retain: val }))
                }
              />
              <Label htmlFor="retain">Retain Message</Label>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="font-medium">Included Devices & Keys</h4>
            {formData.included_devices?.map((device, devIdx) => {
              const selectedDevice = availableDevices.find(
                (d) => d.name === device.name
              );
              return (
                <Card key={devIdx} className="bg-slate-50 dark:bg-slate-800/50">
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="space-y-2 w-full pr-4">
                      <Label>Device {devIdx + 1}</Label>
                      <Select
                        value={device.name}
                        onValueChange={(name) =>
                          handleDeviceChange(devIdx, name)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a device..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDevices.map((d) => (
                            <SelectItem key={d.name} value={d.name}>
                              {d.name} ({d.part_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDevice(devIdx)}
                      className="mt-6 text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Group Name (Optional)</Label>
                      <Input
                        value={device.value_group}
                        onChange={(e) => {
                          const newDevs = [...formData.included_devices!];
                          newDevs[devIdx].value_group = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            included_devices: newDevs,
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Value Keys (Original → New Name)</Label>
                      {Object.entries(device.value_keys).map(
                        ([key, val], keyIdx) => (
                          <div key={keyIdx} className="flex items-center gap-2">
                            <Select
                              value={key}
                              onValueChange={(newKey) =>
                                handleValueKeyChange(
                                  devIdx,
                                  keyIdx,
                                  "original",
                                  newKey
                                )
                              }
                              disabled={!selectedDevice}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedDevice?.keys?.map((k) => (
                                  <SelectItem key={k} value={k}>
                                    {k}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={val}
                              onChange={(e) =>
                                handleValueKeyChange(
                                  devIdx,
                                  keyIdx,
                                  "new",
                                  e.target.value
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeValueKey(devIdx, key)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addValueKey(devIdx)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Key
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Button type="button" variant="secondary" onClick={addDevice}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Device to Group
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
              {initialData ? "Update Payload" : "Save Payload"}
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
function DynamicPayloadPage() {
  const { client, connectionStatus } = useMqtt();
  const [summaryConfig, setSummaryConfig] = useState<SummaryConfig | null>(
    null
  );
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>(
    []
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DynamicPayloadGroup | null>(
    null
  );

  const TOPICS = {
    GET_DATA: "config/summary_device",
    RESPONSE_DATA: "config/summary_device/response",
    GET_DEVICES: "config/device_info",
    RESPONSE_DEVICES: "config/device_info/response",
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
        if (topic === TOPICS.RESPONSE_DATA) {
          setSummaryConfig(data);
        } else if (topic === TOPICS.RESPONSE_DEVICES) {
          // Assuming the payload is an array of devices with a 'keys' property
          setAvailableDevices(data);
        }
      } catch (e) {
        console.error(`Failed to parse MQTT message on ${topic}:`, e);
      }
    },
    [TOPICS]
  );

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe([TOPICS.RESPONSE_DATA, TOPICS.RESPONSE_DEVICES]);
      client.on("message", handleMqttMessage);

      // Initial fetch
      publish(TOPICS.GET_DATA, { command: "getData" });
      publish(TOPICS.GET_DEVICES, { command: "getDeviceInfo" });

      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, publish, handleMqttMessage, TOPICS]);

  const handleAdd = () => {
    setEditingGroup(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (group: DynamicPayloadGroup) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleDelete = (group: DynamicPayloadGroup) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete payload for topic "${group.summary_topic}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(TOPICS.GET_DATA, {
          command: "deleteData",
          data: { summary_topic: group.summary_topic },
        });
        Toast.fire({ icon: "success", title: "Delete command sent!" });
      }
    });
  };

  const handleSave = (data: any) => {
    publish(TOPICS.GET_DATA, { command: "writeData", data });
    Toast.fire({ icon: "success", title: "Configuration saved!" });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dynamic Payload</h1>
          <p className="text-muted-foreground">
            Combine data from multiple devices into a single, custom MQTT
            payload.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => publish(TOPICS.GET_DATA, { command: "getData" })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Get Data
          </Button>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Payload
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Payloads</CardTitle>
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
          {summaryConfig?.groups && summaryConfig.groups.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {summaryConfig.groups.map((group, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4 items-center">
                      <div className="text-left">
                        <p className="font-semibold text-primary">
                          {group.summary_topic}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Publishes every {group.interval}s
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <Badge variant="outline">QoS: {group.qos}</Badge>
                        <Badge variant={group.retain ? "default" : "secondary"}>
                          Retain: {group.retain ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold mb-2">
                          Included Devices & Keys
                        </h4>
                        <ul className="list-disc pl-5 space-y-2">
                          {group.included_devices.map((device, devIdx) => (
                            <li key={devIdx}>
                              <span className="font-medium">{device.name}</span>
                              {device.value_group && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  (as "{device.value_group}")
                                </span>
                              )}
                              <ul className="list-circle pl-5 text-sm">
                                {Object.entries(device.value_keys).map(
                                  ([key, val]) => (
                                    <li key={key}>
                                      {key} →{" "}
                                      <span className="font-mono text-primary">
                                        {val}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
              No dynamic payloads configured yet.
            </div>
          )}
        </CardContent>
      </Card>

      <DynamicPayloadDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        initialData={editingGroup}
        availableDevices={availableDevices}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function DynamicPayloadPageWithProvider() {
  return (
    <MqttProvider>
      <DynamicPayloadPage />
    </MqttProvider>
  );
}
