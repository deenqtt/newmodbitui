// File: components/devices/internal/GenericI2CTable.tsx
"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";
import Paho from "paho-mqtt";

// --- Komponen UI & Ikon ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // <-- Tambahkan komponen Card
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
import { Edit, Trash2, RefreshCw } from "lucide-react"; // <-- Tambahkan ikon RefreshCw

// --- Tipe Data (Interface) ---
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

  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {},
    protocol_setting: {},
  });

  // --- Fungsi Aksi ---
  const sendMessage = (command: object) => {
    if (!client) return;
    const message = new Paho.Message(JSON.stringify(command));
    message.destinationName = commandTopic;
    client.send(message);
  };

  const getAllData = () => sendMessage({ command: getDataCommand });
  const restartServices = () => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const addDevice = () => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const updateDevice = () => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const deleteDevice = (deviceName: string) => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const showAddDeviceModal = () => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const showUpdateDeviceModal = (device: Device) => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };
  const handleInputChange = (
    part: "profile" | "protocol_setting",
    field: string,
    value: any
  ) => {
    /* ... (fungsi sama seperti sebelumnya) ... */
  };

  // --- Logika MQTT & Auto Get Data ---
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      // 1. Ambil data secara otomatis saat tab aktif dan MQTT terhubung
      getAllData();

      // 2. Subscribe ke topic untuk menerima update
      client.subscribe(responseTopic);
      client.subscribe("service/response");

      client.onMessageArrived = (message: Paho.Message) => {
        // ... (logika onMessageArrived sama seperti sebelumnya)
      };
    }
  }, [client, connectionStatus, responseTopic]); // Dependency array memastikan ini berjalan saat koneksi siap

  return (
    // Menggunakan komponen <Card> untuk styling yang lebih baik
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2">
          <Button onClick={getAllData} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button onClick={showAddDeviceModal} size="sm">
            Add Device
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                  Tidak ada data. Coba klik "Refresh Data".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* --- Modal Add/Update --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* ... (Konten Dialog sama seperti sebelumnya, tidak ada perubahan) ... */}
      </Dialog>
    </Card>
  );
}
