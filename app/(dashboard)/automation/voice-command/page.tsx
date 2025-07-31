// File: app/(dashboard)/automation/voice-command/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";
import { v4 as uuidv4 } from "uuid";

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
import { PlusCircle, Edit, Trash2, Mic, Bot } from "lucide-react";

// --- Type Definitions ---
type MqttBrokerInfo = {
  mac_address: string;
  broker_address: string;
  broker_port: number;
  username?: string;
  password?: string;
};

type ModularDevice = {
  profile: { name: string };
  protocol_setting: { address: number; device_bus: number };
};

type VoiceControlConfig = {
  uuid: string;
  device_name: string;
  data: {
    pin: number;
    custom_name: string;
    address: number;
    bus: number;
  };
};

// =================================================================
// Sub-Component: AddEditDialog
// =================================================================
interface AddEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: VoiceControlConfig) => void;
  initialData?: VoiceControlConfig | null;
  modularDevices: ModularDevice[];
}

const AddEditDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  modularDevices,
}: AddEditDialogProps) => {
  const [formData, setFormData] = useState<Omit<VoiceControlConfig, "uuid">>({
    device_name: "",
    data: { pin: 1, custom_name: "", address: 0, bus: 0 },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          device_name: initialData.device_name,
          data: { ...initialData.data },
        });
      } else {
        setFormData({
          device_name: "",
          data: { pin: 1, custom_name: "", address: 0, bus: 0 },
        });
      }
    }
  }, [isOpen, initialData]);

  const handleDeviceChange = (deviceName: string) => {
    const device = modularDevices.find((d) => d.profile.name === deviceName);
    if (device) {
      setFormData((prev) => ({
        device_name: deviceName,
        data: {
          ...prev.data,
          address: device.protocol_setting.address,
          bus: device.protocol_setting.device_bus,
        },
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: VoiceControlConfig = {
      uuid: initialData?.uuid || uuidv4(),
      ...formData,
    };
    onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Update" : "Add"} Voice Control
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Device Name</Label>
            <Select
              value={formData.device_name}
              onValueChange={handleDeviceChange}
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
            <Label>Custom Name (Voice Keyword)</Label>
            <Input
              value={formData.data.custom_name}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  data: { ...p.data, custom_name: e.target.value },
                }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pin</Label>
              <Select
                value={String(formData.data.pin)}
                onValueChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    data: { ...p.data, pin: parseInt(val) },
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
              <Label>Address</Label>
              <Input type="number" value={formData.data.address} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Bus</Label>
              <Input type="number" value={formData.data.bus} readOnly />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Update" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// Sub-Component: VoiceControlDialog
// =================================================================
interface VoiceControlDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  voiceControlList: VoiceControlConfig[];
  brokerInfo: MqttBrokerInfo | null;
}

const VoiceControlDialog = ({
  isOpen,
  onOpenChange,
  voiceControlList,
  brokerInfo,
}: VoiceControlDialogProps) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [responseText, setResponseText] = useState("");

  const startRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponseText(
        "Speech Recognition API is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = false;

    setIsListening(true);
    setSpokenText("");
    setResponseText("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSpokenText(transcript);
      processVoiceCommand(transcript);
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event);
      setResponseText(`Error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const processVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    let action: number | null = null;

    if (lowerText.includes("nyalakan")) action = 1;
    else if (lowerText.includes("matikan")) action = 0;

    if (action === null) {
      setResponseText(`Command not recognized in "${text}"`);
      return;
    }

    const deviceName = lowerText
      .replace("nyalakan", "")
      .replace("matikan", "")
      .trim();
    const foundDevice = voiceControlList.find(
      (d) => d.data.custom_name.toLowerCase() === deviceName
    );

    if (foundDevice && brokerInfo) {
      const relayPayload = {
        mac: brokerInfo.mac_address,
        protocol_type: "Modular",
        device: "RELAYMINI",
        function: "write",
        value: { pin: foundDevice.data.pin, data: action },
        address: foundDevice.data.address,
        device_bus: foundDevice.data.bus,
        Timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      };

      // Temporarily connect and publish
      const tempClient = mqtt.connect(
        `ws://${brokerInfo.broker_address}:9000`,
        {
          username: brokerInfo.username,
          password: brokerInfo.password,
        }
      );

      tempClient.on("connect", () => {
        tempClient.publish("modular", JSON.stringify(relayPayload), (err) => {
          if (err) {
            setResponseText(`Failed to send command: ${err.message}`);
          } else {
            setResponseText(
              `Command sent to "${deviceName}" to turn ${
                action === 1 ? "ON" : "OFF"
              }.`
            );
          }
          tempClient.end();
        });
      });
    } else {
      setResponseText(
        `Device "${deviceName}" not found or broker info is missing.`
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voice Recognition Control</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 space-y-4">
          <Button onClick={startRecognition} disabled={isListening} size="lg">
            <Mic className="mr-2 h-5 w-5" />{" "}
            {isListening ? "Listening..." : "Start Voice Command"}
          </Button>
          {spokenText && (
            <p className="text-sm">
              You said: <strong className="text-primary">{spokenText}</strong>
            </p>
          )}
          {responseText && (
            <p className="text-sm font-semibold">{responseText}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// Main Page Component
// =================================================================
function VoiceCommandPage() {
  const { client, connectionStatus } = useMqtt();
  const [brokerInfo, setBrokerInfo] = useState<MqttBrokerInfo | null>(null);
  const [modularDevices, setModularDevices] = useState<ModularDevice[]>([]);
  const [voiceControlList, setVoiceControlList] = useState<
    VoiceControlConfig[]
  >([]);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isVoiceControlOpen, setIsVoiceControlOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VoiceControlConfig | null>(
    null
  );

  const TOPICS = {
    MODULAR_DATA: "modular_value/data",
    BROKER_INFO: "mqtt_broker_server",
    VOICE_DATA: "voice_control/data",
    VOICE_CREATE: "voice_control/create",
    VOICE_UPDATE: "voice_control/update",
    VOICE_DELETE: "voice_control/delete",
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
        if (topic === TOPICS.MODULAR_DATA) setModularDevices(data);
        else if (topic === TOPICS.BROKER_INFO) setBrokerInfo(data);
        else if (topic === TOPICS.VOICE_DATA) setVoiceControlList(data);
      } catch (e) {
        console.error(`Failed to parse MQTT message on ${topic}:`, e);
      }
    },
    [TOPICS]
  );

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      const topicsToSubscribe = [
        TOPICS.MODULAR_DATA,
        TOPICS.BROKER_INFO,
        TOPICS.VOICE_DATA,
      ];
      client.subscribe(topicsToSubscribe);
      client.on("message", handleMqttMessage);
      return () => {
        client.off("message", handleMqttMessage);
      };
    }
  }, [client, connectionStatus, handleMqttMessage, TOPICS]);

  const handleAdd = () => {
    setEditingItem(null);
    setIsAddEditDialogOpen(true);
  };

  const handleEdit = (item: VoiceControlConfig) => {
    setEditingItem(item);
    setIsAddEditDialogOpen(true);
  };

  const handleDelete = (uuid: string) => {
    Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(TOPICS.VOICE_DELETE, { uuid });
      }
    });
  };

  const handleSave = (payload: VoiceControlConfig) => {
    const topic =
      payload.uuid &&
      voiceControlList.some((item) => item.uuid === payload.uuid)
        ? TOPICS.VOICE_UPDATE
        : TOPICS.VOICE_CREATE;
    publish(topic, payload);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Voice Command</h1>
        <p className="text-muted-foreground">
          Configure and use voice commands to control your devices.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>MQTT Broker Server Info</CardTitle>
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
          {brokerInfo ? (
            <div className="text-sm space-y-1">
              <p>
                <strong>MAC:</strong> {brokerInfo.mac_address}
              </p>
              <p>
                <strong>Address:</strong> {brokerInfo.broker_address}:
                {brokerInfo.broker_port}
              </p>
              <p>
                <strong>Username:</strong> {brokerInfo.username || "-"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for broker data...
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Voice Control Devices</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsVoiceControlOpen(true)}
              >
                <Bot className="mr-2 h-4 w-4" /> Voice Command Control
              </Button>
              <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Voice Control
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Pin</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voiceControlList.length > 0 ? (
                  voiceControlList.map((item) => (
                    <TableRow key={item.uuid}>
                      <TableCell>
                        <div className="font-medium">
                          {item.data.custom_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.device_name}
                        </div>
                      </TableCell>
                      <TableCell>{item.data.pin}</TableCell>
                      <TableCell>{item.data.address}</TableCell>
                      <TableCell>{item.data.bus}</TableCell>
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
                          onClick={() => handleDelete(item.uuid)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No voice control devices configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddEditDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onSave={handleSave}
        initialData={editingItem}
        modularDevices={modularDevices}
      />

      <VoiceControlDialog
        isOpen={isVoiceControlOpen}
        onOpenChange={setIsVoiceControlOpen}
        voiceControlList={voiceControlList}
        brokerInfo={brokerInfo}
      />
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function VoiceCommandPageWithProvider() {
  return (
    <MqttProvider>
      <VoiceCommandPage />
    </MqttProvider>
  );
}
