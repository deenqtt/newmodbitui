// File: components/devices/internal/ModbusTable.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext"; // Pastikan path ini benar
import Swal from "sweetalert2";
import Paho from "paho-mqtt";

// Import komponen UI dari Shadcn/UI
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

// Tipe data untuk state form
const initialDeviceState = {
  profile: {
    name: "",
    device_type: "",
    manufacturer: "",
    part_number: "",
    topic: "",
  },
  protocol_setting: { protocol: "" },
};

export function ModbusTable() {
  const { client, connectionStatus } = useMqtt();

  // --- STATE MANAGEMENT (Mirip 'ref' di Vue) ---
  const [devices, setDevices] = useState<Record<string, any[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<any>(initialDeviceState);
  const [oldDeviceName, setOldDeviceName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State untuk form dinamis
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);

  // --- LOGIKA MQTT & DATA HANDLING ---

  // Fungsi yang akan menangani pesan MQTT yang masuk
  const onMessageArrived = (message: Paho.Message) => {
    let payload;
    try {
      payload = JSON.parse(message.payloadString);
    } catch (error) {
      // Handle pesan non-JSON seperti PING
      if (message.payloadString.startsWith("Ping to")) {
        Swal.fire({
          icon: "info",
          title: "Ping Response",
          text: message.payloadString,
        });
      }
      return;
    }

    if (payload.result === "success" || payload.result === "error") {
      Swal.fire({
        icon: payload.result,
        title: payload.result.charAt(0).toUpperCase() + payload.result.slice(1),
        text: payload.message,
      }).then(() => {
        if (payload.result === "success") {
          setIsModalOpen(false); // Tutup modal jika sukses
          getAllData(); // Ambil data terbaru
        }
      });
    } else if (typeof payload === "object" && Object.keys(payload).length > 0) {
      setDevices(payload);
      // Ekstrak tipe device dari data yang diterima untuk dropdown
      setDeviceTypes(
        Object.keys(payload).filter((type) => payload[type].length > 0)
      );
    } else {
      setDevices({});
    }
  };

  // Mirip dengan onMounted di Vue
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      // Subscribe ke topik yang relevan untuk komponen ini
      client.subscribe("response_device_modbus");
      client.subscribe("response/ping");
      client.subscribe("response_service_restart");
      client.subscribe("service/response");
      // Ganti handler onMessageArrived global dengan yang spesifik untuk komponen ini
      client.onMessageArrived = onMessageArrived;
      // Langsung ambil data saat terhubung
      getAllData();
    }
  }, [client, connectionStatus]);

  // --- FUNGSI-FUNGSI AKSI (Mirip 'methods' di Vue) ---
  const sendMqttCommand = (command: object) => {
    if (!client) return;
    const message = new Paho.Message(JSON.stringify(command));
    message.destinationName = "command_device_modbus";
    client.send(message);
  };

  const getAllData = () => sendMqttCommand({ command: "getDataModbus" });

  const restartService = () => {
    Swal.fire({
      title: "Restarting Services",
      text: "Mohon tunggu...",
      icon: "info",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    sendMqttCommand({
      action: "restart",
      services: ["modbus_snmp.service", "mqtt_config.service"],
    });
  };

  const pingIp = (ip: string) => {
    if (!client) return;
    const message = new Paho.Message(ip);
    message.destinationName = "request/ping";
    client.send(message);
    Swal.fire({
      title: "Ping Request Sent",
      text: `Mengirim ping ke ${ip}`,
      icon: "info",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdateMode) {
      sendMqttCommand({
        command: "updateDevice",
        old_name: oldDeviceName,
        device: newDevice,
      });
    } else {
      sendMqttCommand({ command: "addDevice", device: newDevice });
    }
  };

  const deleteDevice = (deviceName: string) => {
    Swal.fire({
      title: "Anda yakin?",
      text: `Device bernama: ${deviceName} akan dihapus!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
    }).then((result) => {
      if (result.isConfirmed) {
        sendMqttCommand({ command: "deleteDevice", name: deviceName });
      }
    });
  };

  const showAddDeviceModal = () => {
    setIsUpdateMode(false);
    setNewDevice(initialDeviceState);
    setIsModalOpen(true);
  };

  const showUpdateDeviceModal = (device: any) => {
    setIsUpdateMode(true);
    // Deep copy agar tidak mengubah state asli sebelum disimpan
    const deviceCopy = JSON.parse(JSON.stringify(device));
    setNewDevice(deviceCopy);
    setOldDeviceName(device.profile.name);
    setIsModalOpen(true);
  };

  // --- LOGIKA FORM DINAMIS ---
  // Mirip dengan 'watch' di Vue
  useEffect(() => {
    const protocol = newDevice.protocol_setting?.protocol;
    const deviceType = newDevice.profile?.device_type;

    if (protocol && devices[protocol]) {
      const allManufacturers = [
        ...new Set(
          devices[protocol]
            .filter((d) => d.device_type === deviceType)
            .map((d) => d.manufacturer)
        ),
      ];
      setManufacturers(allManufacturers);
    }
    if (protocol && deviceType && devices[protocol]) {
      const allPartNumbers = [
        ...new Set(
          devices[protocol]
            .filter((d) => d.device_type === deviceType)
            .map((d) => d.part_number)
        ),
      ];
      setPartNumbers(allPartNumbers);
    }
  }, [
    newDevice.profile?.device_type,
    newDevice.protocol_setting?.protocol,
    devices,
  ]);

  // --- LOGIKA PAGINASI (Mirip 'computed' di Vue) ---
  const allDevices = useMemo(() => Object.values(devices).flat(), [devices]);
  const totalPages = useMemo(
    () => Math.ceil(allDevices.length / itemsPerPage),
    [allDevices]
  );
  const pagedDevices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return allDevices.slice(start, end);
  }, [currentPage, allDevices]);

  // --- RENDER JSX ---
  return (
    <div className="p-4 border rounded-lg mt-4 bg-card text-card-foreground">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Modbus & SNMP Devices</h2>
        <div>
          <Button onClick={getAllData} className="mr-2">
            Get All Data
          </Button>
          <Button
            onClick={showAddDeviceModal}
            variant="secondary"
            className="mr-2"
          >
            Add Device
          </Button>
          <Button onClick={restartService} variant="destructive">
            Restart Services
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
          {pagedDevices.length > 0 ? (
            pagedDevices.map((device, index) => (
              <TableRow key={device.profile?.name}>
                <TableCell>
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell>{device.profile?.name}</TableCell>
                <TableCell>{device.profile?.part_number}</TableCell>
                <TableCell>
                  {device.protocol_setting?.protocol === "SNMP" ? (
                    <span
                      className="text-blue-500 cursor-pointer hover:underline"
                      onClick={() =>
                        pingIp(device.protocol_setting?.ip_address)
                      }
                    >
                      {device.protocol_setting?.ip_address}
                    </span>
                  ) : (
                    <span>{device.protocol_setting?.address}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {device.profile?.topic}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => showUpdateDeviceModal(device)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!["DPC_SC5011", "DPC_SC501_TBG_consumtion"].includes(
                    device.profile?.name
                  ) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDevice(device.profile?.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                No data found. Click "Get All Data".
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="pagination-controls mt-3 flex justify-center gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Prev
        </Button>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>

      {/* --- MODAL UNTUK ADD / UPDATE --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode ? "Update Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleFormSubmit}
            className="space-y-4 max-h-[70vh] overflow-y-auto p-4"
          >
            <div>
              <Label>Protocol Type</Label>
              <Select
                value={newDevice.protocol_setting?.protocol}
                onValueChange={(value) =>
                  setNewDevice((prev) => ({
                    ...prev,
                    protocol_setting: {
                      ...prev.protocol_setting,
                      protocol: value,
                    },
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Modbus RTU">Modbus RTU</SelectItem>
                  <SelectItem value="SNMP">SNMP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Form Dinamis */}
            {newDevice.protocol_setting?.protocol === "Modbus RTU" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Name</Label>
                  <Input
                    value={newDevice.profile?.name || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, name: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Device Type</Label>
                  <Select
                    value={newDevice.profile?.device_type}
                    onValueChange={(v) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, device_type: v },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <Select
                    value={newDevice.profile?.manufacturer}
                    onValueChange={(v) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, manufacturer: v },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Part Number</Label>
                  <Select
                    value={newDevice.profile?.part_number}
                    onValueChange={(v) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, part_number: v },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Part Number" />
                    </SelectTrigger>
                    <SelectContent>
                      {partNumbers.map((pn) => (
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
                    value={newDevice.protocol_setting?.address || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        protocol_setting: {
                          ...p.protocol_setting,
                          address: Number(e.target.value),
                        },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>MQTT Topic</Label>
                  <Input
                    value={newDevice.profile?.topic || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, topic: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
              </div>
            )}

            {newDevice.protocol_setting?.protocol === "SNMP" && (
              <div className="grid grid-cols-2 gap-4">
                {/* Fields for SNMP */}
                <div>
                  <Label>Device Name</Label>
                  <Input
                    value={newDevice.profile?.name || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, name: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>IP Address</Label>
                  <Input
                    value={newDevice.protocol_setting?.ip_address || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        protocol_setting: {
                          ...p.protocol_setting,
                          ip_address: e.target.value,
                        },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={newDevice.protocol_setting?.port || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        protocol_setting: {
                          ...p.protocol_setting,
                          port: Number(e.target.value),
                        },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Read Community</Label>
                  <Input
                    value={newDevice.protocol_setting?.read_community || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        protocol_setting: {
                          ...p.protocol_setting,
                          read_community: e.target.value,
                        },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>MQTT Topic</Label>
                  <Input
                    value={newDevice.profile?.topic || ""}
                    onChange={(e) =>
                      setNewDevice((p) => ({
                        ...p,
                        profile: { ...p.profile, topic: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit">
                {isUpdateMode ? "Update Device" : "Add Device"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
