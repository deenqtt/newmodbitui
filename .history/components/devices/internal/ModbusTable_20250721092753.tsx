// File: components/devices/internal/ModbusTable.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext"; // Menggunakan Context MQTT kita
import Swal from "sweetalert2";
import Paho from "paho-mqtt";

// --- Import Komponen UI dari Shadcn/UI ---
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
  DialogTrigger,
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

// Definisikan tipe data untuk kejelasan
interface Device {
  profile?: any;
  protocol_setting?: any;
}

export function ModbusTable() {
  const { client, connectionStatus } = useMqtt();

  // --- State Management (Menggantikan ref() dari Vue) ---
  const [devices, setDevices] = useState<Record<string, Device[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State untuk dialog/modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {},
    protocol_setting: {},
  });
  const [oldDeviceName, setOldDeviceName] = useState("");

  // --- Logika MQTT ---
  useEffect(() => {
    // onMounted() dari Vue diterjemahkan ke useEffect dengan dependency array kosong
    if (client && connectionStatus === "Connected") {
      const topic = "response_device_modbus";
      console.log(`Subscribing to ${topic}`);
      client.subscribe(topic);
      client.subscribe("response/ping");
      client.subscribe("response_service_restart"); // Sesuaikan dengan topic response restart

      // Menangani pesan yang masuk
      client.onMessageArrived = (message: Paho.Message) => {
        if (message.destinationName === topic) {
          try {
            const payload = JSON.parse(message.payloadString);
            setDevices(payload);
          } catch (e) {
            console.error("Error parsing devices payload:", e);
          }
        } else if (message.destinationName.startsWith("response/")) {
          // Menangani response umum (ping, restart, dll)
          handleGenericResponse(message.payloadString);
        }
      };
    }
  }, [client, connectionStatus]);

  const handleGenericResponse = (payloadString: string) => {
    try {
      const payload = JSON.parse(payloadString);
      if (payload.result === "success") {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: payload.message,
        }).then(() => getAllData());
      } else if (payload.result === "error") {
        Swal.fire({ icon: "error", title: "Error", text: payload.message });
      } else if (payloadString.startsWith("Ping to")) {
        Swal.fire({
          icon: "info",
          title: "Ping Response",
          text: payloadString,
        });
      }
    } catch (e) {
      if (payloadString.startsWith("Ping to")) {
        Swal.fire({
          icon: "info",
          title: "Ping Response",
          text: payloadString,
        });
      } else {
        console.error("Could not handle response:", payloadString);
      }
    }
  };

  // --- Fungsi-Fungsi Aksi (diterjemahkan dari methods di Vue) ---
  const getAllData = () => {
    if (!client) return;
    const command = JSON.stringify({ command: "getDataModbus" });
    const message = new Paho.Message(command);
    message.destinationName = "command_device_modbus";
    client.send(message);
  };

  const restartService = () => {
    if (!client) return;
    const services = ["modbus_snmp.service", "mqtt_config.service"];
    const command = JSON.stringify({ action: "restart", services });
    const message = new Paho.Message(command);
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
    if (!client) return;
    const command = JSON.stringify({ command: "addDevice", device: newDevice });
    const message = new Paho.Message(command);
    message.destinationName = "command_device_modbus";
    client.send(message);
    setIsModalOpen(false);
  };

  const updateDevice = () => {
    if (!client) return;
    const command = JSON.stringify({
      command: "updateDevice",
      old_name: oldDeviceName,
      device: newDevice,
    });
    const message = new Paho.Message(command);
    message.destinationName = "command_device_modbus";
    client.send(message);
    setIsModalOpen(false);
    setIsSpecialModalOpen(false);
  };

  const deleteDevice = (deviceName: string) => {
    if (!client) return;
    Swal.fire({
      title: "Are you sure?",
      text: `Delete device: ${deviceName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const command = JSON.stringify({
          command: "deleteDevice",
          name: deviceName,
        });
        const message = new Paho.Message(command);
        message.destinationName = "command_device_modbus";
        client.send(message);
      }
    });
  };

  const pingIp = (ip: string) => {
    if (!client) return;
    const message = new Paho.Message(ip);
    message.destinationName = "request/ping";
    client.send(message);
    Swal.fire({
      title: "Ping Request Sent",
      text: `Sending ping to ${ip}`,
      icon: "info",
    });
  };

  // --- Logika untuk Modal/Dialog ---
  const showAddDeviceModal = () => {
    setIsUpdateMode(false);
    setNewDevice({ profile: {}, protocol_setting: { protocol: "" } });
    setIsModalOpen(true);
  };

  const showUpdateDeviceModal = (device: Device) => {
    const isSpecial = ["DPC_SC5011", "DPC_SC501_TBG_consumtion"].includes(
      device.profile?.name
    );
    setIsUpdateMode(true);
    setOldDeviceName(device.profile?.name);
    setNewDevice(JSON.parse(JSON.stringify(device))); // Deep copy

    if (isSpecial) {
      setIsSpecialModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  // --- Logika Tampilan (Menggantikan computed() dari Vue) ---
  const allDevices = useMemo(() => Object.values(devices).flat(), [devices]);
  const totalPages = useMemo(
    () => Math.ceil(allDevices.length / itemsPerPage),
    [allDevices]
  );
  const pagedDevices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return allDevices.slice(start, end);
  }, [allDevices, currentPage]);

  return (
    <div className="p-4 border rounded-lg mt-4 bg-card text-card-foreground">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">Modbus & SNMP Devices</h2>
        <div className="flex gap-2">
          <Button onClick={getAllData}>Get All Data</Button>
          <Button onClick={showAddDeviceModal} variant="secondary">
            Add Device
          </Button>
          <Button onClick={restartService} variant="destructive">
            Restart Services
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Device Name</TableHead>
              <TableHead>PN</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Mfr</TableHead>
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
                  <TableCell className="font-medium">
                    {device.profile?.name}
                  </TableCell>
                  <TableCell>{device.profile?.part_number}</TableCell>
                  <TableCell>
                    {device.protocol_setting?.protocol === "Modbus RTU" ? (
                      <span>{device.protocol_setting?.address}</span>
                    ) : (
                      <span
                        onClick={() =>
                          pingIp(device.protocol_setting?.ip_address)
                        }
                        className="text-blue-500 cursor-pointer hover:underline"
                      >
                        {device.protocol_setting?.ip_address}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{device.profile?.manufacturer}</TableCell>
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
                <TableCell colSpan={7} className="text-center h-24">
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <Button
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 1}
        >
          Prev
        </Button>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </Button>
      </div>

      {/* --- Modal Add/Update --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode ? "Update Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          {/* Form akan kita buat di sini. Karena sangat kompleks, untuk sementara kita tampilkan placeholder. */}
          <div className="py-4">
            <p>
              Form untuk Add/Update device Modbus/SNMP akan ditampilkan di sini.
            </p>
            <pre className="mt-4 bg-muted p-4 rounded-md text-xs overflow-auto">
              {JSON.stringify(newDevice, null, 2)}
            </pre>
          </div>
          <Button onClick={isUpdateMode ? updateDevice : addDevice}>
            {isUpdateMode ? "Update" : "Add"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* --- Modal Special Device --- */}
      <Dialog open={isSpecialModalOpen} onOpenChange={setIsSpecialModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Update Special Device: {newDevice.profile?.name}
            </DialogTitle>
          </DialogHeader>
          {/* Form akan kita buat di sini. Karena sangat kompleks, untuk sementara kita tampilkan placeholder. */}
          <div className="py-4">
            <p>Form untuk update Special Device akan ditampilkan di sini.</p>
            <pre className="mt-4 bg-muted p-4 rounded-md text-xs overflow-auto">
              {JSON.stringify(newDevice, null, 2)}
            </pre>
          </div>
          <Button onClick={updateDevice}>Update Special Device</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
