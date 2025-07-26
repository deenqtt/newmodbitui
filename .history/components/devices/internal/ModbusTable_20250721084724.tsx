// File: components/devices/internal/ModbusTable.tsx
"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
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

export function ModbusTable() {
  const { client, connectionStatus } = useMqtt();
  const [devices, setDevices] = useState<any[]>([]);

  const onMessageArrived = (message: Paho.Message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      if (typeof payload === "object" && Object.keys(payload).length > 0) {
        // Menggabungkan semua device dari semua kategori menjadi satu array
        const allDevices = Object.values(payload).flat();
        setDevices(allDevices);
      } else {
        setDevices([]);
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  };

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe("response_device_modbus");
      client.onMessageArrived = onMessageArrived;
    }
  }, [client, connectionStatus]);

  const getAllData = () => {
    if (!client) return;
    const command = JSON.stringify({ command: "getDataModbus" });
    const message = new Paho.Message(command);
    message.destinationName = "command_device_modbus";
    client.send(message);
  };

  // Placeholder untuk fungsi lainnya, Anda bisa menambahkan logika modal di sini
  const showAddDeviceModal = () => {
    Swal.fire(
      "Info",
      'Fitur "Add Device" untuk Modbus/SNMP sedang dalam pengembangan.',
      "info"
    );
  };
  const restartService = () => {
    Swal.fire(
      "Info",
      'Fitur "Restart Service" sedang dalam pengembangan.',
      "info"
    );
  };
  const showUpdateDeviceModal = (device: any) => {
    Swal.fire(
      "Info",
      `Edit untuk ${device.profile?.name} sedang dalam pengembangan.`,
      "info"
    );
  };
  const deleteDevice = (deviceName: string) => {
    Swal.fire(
      "Info",
      `Delete untuk ${deviceName} sedang dalam pengembangan.`,
      "info"
    );
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
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
          {devices.length > 0 ? (
            devices.map((device, index) => (
              <TableRow key={device.profile?.name}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{device.profile?.name}</TableCell>
                <TableCell>{device.profile?.part_number}</TableCell>
                <TableCell>
                  {device.protocol_setting?.protocol === "Modbus RTU"
                    ? device.protocol_setting?.address
                    : device.protocol_setting?.ip_address}
                </TableCell>
                <TableCell>{device.profile?.topic}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showUpdateDeviceModal(device)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDevice(device.profile?.name)}
                    className="text-red-500"
                  >
                    Delete
                  </Button>
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
    </div>
  );
}
