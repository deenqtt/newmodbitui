// File: components/devices/internal/GenericI2CTable.tsx
"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";
import Paho from "paho-mqtt";

// --- Komponen UI & Ikon ---
import { Button } from "@/components/ui/button";
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
import { Edit, Trash2 } from "lucide-react";

// --- Tipe Data ---
interface DeviceProfile {
  name?: string;
  device_type?: string;
  manufacturer?: string;
  part_number?: string;
  topic?: string;
}
interface ProtocolSetting {
  protocol?: string;
  address?: number | null;
  device_bus?: number | null;
}
interface Device {
  profile: DeviceProfile;
  protocol_setting: ProtocolSetting;
}

// Props untuk komponen generik kita
interface GenericTableProps {
  title: string;
  commandTopic: string;
  responseTopic: string;
  getDataCommand: string;
  partNumberOptions: string[];
  servicesToRestart: string[];
}

export function GenericI2CTable({
  title,
  commandTopic,
  responseTopic,
  getDataCommand,
  partNumberOptions,
  servicesToRestart,
}: GenericTableProps) {
  const { client, connectionStatus } = useMqtt();

  // --- State Management ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {},
    protocol_setting: {},
  });

  // --- Logika MQTT ---
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(responseTopic);
      client.subscribe("service/response");

      client.onMessageArrived = (message: Paho.Message) => {
        if (message.destinationName === responseTopic) {
          try {
            const payload = JSON.parse(message.payloadString);
            if (Array.isArray(payload)) {
              setDevices(payload);
            } else if (payload.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Success",
                text: payload.message,
              }).then(() => getAllData());
              setIsModalOpen(false);
            } else if (payload.status === "error") {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: payload.message,
              });
            }
          } catch (e) {
            console.error("Error parsing message:", e);
          }
        } else if (message.destinationName === "service/response") {
          // Handle restart response
          const payload = JSON.parse(message.payloadString);
          if (payload.result === "success") {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: payload.message,
            });
          } else {
            Swal.fire({ icon: "error", title: "Error", text: payload.message });
          }
        }
      };
    }
  }, [client, connectionStatus, responseTopic]);

  // --- Fungsi Aksi ---
  const sendMessage = (command: object) => {
    if (!client) return;
    const message = new Paho.Message(JSON.stringify(command));
    message.destinationName = commandTopic;
    client.send(message);
  };

  const getAllData = () => sendMessage({ command: getDataCommand });
  const restartServices = () => {
    const command = { action: "restart", services: servicesToRestart };
    const message = new Paho.Message(JSON.stringify(command));
    message.destinationName = "service/command";
    client.send(message);
    Swal.fire({
      title: "Restarting Services...",
      text: "Please wait.",
      icon: "info",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
  };

  const addDevice = () => {
    sendMessage({ command: "addDevice", device: newDevice });
    restartServices();
  };
  const updateDevice = () =>
    sendMessage({
      command: "updateDevice",
      old_name: newDevice.profile.name,
      device: newDevice,
    });
  const deleteDevice = (deviceName: string) => {
    Swal.fire({
      title: "Anda yakin?",
      text: `Hapus device: ${deviceName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
    }).then((result) => {
      if (result.isConfirmed) {
        sendMessage({ command: "deleteDevice", name: deviceName });
        restartServices();
      }
    });
  };

  // --- Logika Modal ---
  const showAddDeviceModal = () => {
    setIsUpdateMode(false);
    setNewDevice({
      profile: { device_type: "Modular", manufacturer: "IOT" },
      protocol_setting: { protocol: "Modular" },
    });
    setIsModalOpen(true);
  };

  const showUpdateDeviceModal = (device: Device) => {
    setIsUpdateMode(true);
    setNewDevice(JSON.parse(JSON.stringify(device)));
    setIsModalOpen(true);
  };

  const handleInputChange = (
    part: "profile" | "protocol_setting",
    field: string,
    value: any
  ) => {
    setNewDevice((prev) => ({
      ...prev,
      [part]: { ...prev[part], [field]: value },
    }));
  };

  return (
    <div className="p-4 border rounded-lg mt-4 bg-card text-card-foreground">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div>
          <Button onClick={getAllData} className="mr-2">
            Get All Data
          </Button>
          <Button onClick={showAddDeviceModal} variant="secondary">
            Add Device
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Device Name</TableHead>
            <TableHead>PN</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length > 0 ? (
            devices.map((device, index) => (
              <TableRow key={device.profile?.name}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">
                  {device.profile?.name}
                </TableCell>
                <TableCell>{device.profile?.part_number}</TableCell>
                <TableCell>{device.protocol_setting?.address}</TableCell>
                <TableCell>{device.profile?.topic}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => showUpdateDeviceModal(device)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDevice(device.profile?.name || "")}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                No data found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode ? "Update Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          <form
            id="i2cForm"
            className="grid grid-cols-2 gap-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              isUpdateMode ? updateDevice() : addDevice();
            }}
          >
            <div>
              <Label>Device Name</Label>
              <Input
                value={newDevice.profile.name || ""}
                onChange={(e) =>
                  handleInputChange("profile", "name", e.target.value)
                }
                required
                disabled={isUpdateMode}
              />
            </div>
            <div>
              <Label>Part Number</Label>
              <Select
                onValueChange={(val) =>
                  handleInputChange("profile", "part_number", val)
                }
                value={newDevice.profile.part_number}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a part number" />
                </SelectTrigger>
                <SelectContent>
                  {partNumberOptions.map((pn) => (
                    <SelectItem key={pn} value={pn}>
                      {pn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                type="number"
                value={newDevice.protocol_setting.address || ""}
                onChange={(e) =>
                  handleInputChange(
                    "protocol_setting",
                    "address",
                    parseInt(e.target.value)
                  )
                }
                required
              />
            </div>
            <div>
              <Label>Device Bus</Label>
              <Input
                type="number"
                value={newDevice.protocol_setting.device_bus || ""}
                onChange={(e) =>
                  handleInputChange(
                    "protocol_setting",
                    "device_bus",
                    parseInt(e.target.value)
                  )
                }
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Topic</Label>
              <Input
                value={newDevice.profile.topic || ""}
                onChange={(e) =>
                  handleInputChange("profile", "topic", e.target.value)
                }
                required
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="i2cForm">
              {isUpdateMode ? "Update Device" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
