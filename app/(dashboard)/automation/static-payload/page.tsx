// File: app/(dashboard)/automation/static-payload/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { PlusCircle, Edit, Trash2, X, RefreshCw, FileJson } from "lucide-react";

// --- Type Definitions ---
type DataField = {
  key: string;
  type: "string" | "int" | "boolean" | "object" | "array";
  value: string;
};

type StaticPayloadConfig = {
  topic: string;
  data: Record<string, any>;
  interval: number;
  qos: number;
  lwt: boolean;
  retain: boolean;
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
// Sub-Component: StaticPayloadDialog
// =================================================================
interface StaticPayloadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  onUpdate: (payload: any) => void;
  initialData?: StaticPayloadConfig | null;
}

const StaticPayloadDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  onUpdate,
  initialData,
}: StaticPayloadDialogProps) => {
  const [topic, setTopic] = useState("");
  const [interval, setInterval] = useState(10);
  const [qos, setQos] = useState(0);
  const [lwt, setLwt] = useState(false);
  const [retain, setRetain] = useState(false);
  const [fields, setFields] = useState<DataField[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTopic(initialData.topic);
        setInterval(initialData.interval);
        setQos(initialData.qos);
        setLwt(initialData.lwt);
        setRetain(initialData.retain);
        // Konversi objek data kembali ke format array fields untuk form
        const initialFields = Object.entries(initialData.data).map(
          ([key, value]) => {
            let type: DataField["type"] = "string";
            if (typeof value === "boolean") type = "boolean";
            else if (typeof value === "number") type = "int";
            else if (Array.isArray(value)) type = "array";
            else if (typeof value === "object" && value !== null)
              type = "object";

            return { key, type, value: JSON.stringify(value) };
          }
        );
        setFields(initialFields);
      } else {
        // Reset form untuk data baru
        setTopic("");
        setInterval(10);
        setQos(0);
        setLwt(false);
        setRetain(false);
        setFields([{ key: "", type: "string", value: "" }]);
      }
    }
  }, [isOpen, initialData]);

  const handleFieldChange = (
    index: number,
    field: keyof DataField,
    value: any
  ) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFields(newFields);
  };

  const addField = () => {
    setFields([...fields, { key: "", type: "string", value: "" }]);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const parseValue = (type: DataField["type"], value: string) => {
    try {
      switch (type) {
        case "int":
          return parseInt(value, 10);
        case "boolean":
          return value.toLowerCase() === "true";
        case "object":
        case "array":
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (e) {
      Toast.fire({
        icon: "error",
        title: `Invalid format for type '${type}'.`,
      });
      throw e;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataObject = fields.reduce((acc, field) => {
        if (field.key) {
          acc[field.key] = parseValue(field.type, field.value);
        }
        return acc;
      }, {} as Record<string, any>);

      const payload = {
        topic,
        interval,
        qos,
        lwt,
        retain,
        data: dataObject,
      };

      if (initialData) {
        onUpdate(payload);
      } else {
        onSave(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to build payload:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Static Payload" : "Create Static Payload"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4"
        >
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Interval (s)</Label>
              <Input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>QoS</Label>
              <Select
                value={String(qos)}
                onValueChange={(v) => setQos(parseInt(v))}
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
              <Switch id="lwt" checked={lwt} onCheckedChange={setLwt} />
              <Label htmlFor="lwt">LWT</Label>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="retain"
                checked={retain}
                onCheckedChange={setRetain}
              />
              <Label htmlFor="retain">Retain</Label>
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <h4 className="font-medium">Data Fields</h4>
            {fields.map((field, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-4"
                  value={field.key}
                  onChange={(e) =>
                    handleFieldChange(index, "key", e.target.value)
                  }
                  placeholder="Key"
                />
                <Select
                  className="col-span-3"
                  value={field.type}
                  onValueChange={(v) => handleFieldChange(index, "type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="int">Integer</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="object">Object (JSON)</SelectItem>
                    <SelectItem value="array">Array (JSON)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-4"
                  value={field.value}
                  onChange={(e) =>
                    handleFieldChange(index, "value", e.target.value)
                  }
                  placeholder="Value"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
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
              onClick={addField}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
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
function StaticPayloadPage() {
  const { client, connectionStatus } = useMqtt();
  const [staticPayloads, setStaticPayloads] = useState<StaticPayloadConfig[]>(
    []
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StaticPayloadConfig | null>(
    null
  );

  const TOPICS = {
    COMMAND: "command/data/payload",
    RESPONSE: "response/data/payload",
  };

  const publish = useCallback(
    (payload: object) => {
      if (client) client.publish(TOPICS.COMMAND, JSON.stringify(payload));
    },
    [client, TOPICS.COMMAND]
  );

  const handleMqttMessage = useCallback(
    (topic: string, message: Buffer) => {
      if (topic === TOPICS.RESPONSE) {
        try {
          const data = JSON.parse(message.toString());
          setStaticPayloads(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("Failed to parse static payload data:", e);
        }
      }
    },
    [TOPICS.RESPONSE]
  );

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(TOPICS.RESPONSE);
      client.on("message", handleMqttMessage);
      publish({ command: "getData" }); // Initial fetch
      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, publish, handleMqttMessage, TOPICS.RESPONSE]);

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: StaticPayloadConfig) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (topic: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete payload for topic "${topic}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish({ command: "deleteData", topic });
        Toast.fire({ icon: "success", title: "Delete command sent!" });
      }
    });
  };

  const handleSave = (data: any) => {
    publish({ command: "writeData", data });
    Toast.fire({ icon: "success", title: "Configuration saved!" });
  };

  const handleUpdate = (data: any) => {
    publish({ command: "updateData", ...data });
    Toast.fire({ icon: "success", title: "Configuration updated!" });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Static Payload</h1>
          <p className="text-muted-foreground">
            Create and manage periodic MQTT payloads with static, user-defined
            data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => publish({ command: "getData" })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Get Data
          </Button>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Payload
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staticPayloads.length > 0 ? (
                  staticPayloads.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {item.topic}
                      </TableCell>
                      <TableCell>
                        <pre className="text-xs p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <span>Interval: {item.interval}s</span>
                          <span>QoS: {item.qos}</span>
                          <span>LWT: {item.lwt ? "Yes" : "No"}</span>
                          <span>Retain: {item.retain ? "Yes" : "No"}</span>
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
                          onClick={() => handleDelete(item.topic)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No static payloads configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StaticPayloadDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        onUpdate={handleUpdate}
        initialData={editingItem}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function StaticPayloadPageWithProvider() {
  return (
    <MqttProvider>
      <StaticPayloadPage />
    </MqttProvider>
  );
}
