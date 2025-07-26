// File: components/devices/internal/GenericInternalTable.tsx
"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import Paho from "paho-mqtt";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GenericTableProps {
  title: string;
  commandTopic: string;
  responseTopic: string;
  getDataCommand: string;
}

export function GenericInternalTable({
  title,
  commandTopic,
  responseTopic,
  getDataCommand,
}: GenericTableProps) {
  const { client, connectionStatus } = useMqtt();
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe(responseTopic);
      client.onMessageArrived = (message: Paho.Message) => {
        if (message.destinationName === responseTopic) {
          try {
            const payload = JSON.parse(message.payloadString);
            setDevices(Array.isArray(payload) ? payload : []);
          } catch (e) {
            console.error("Error parsing message:", e);
          }
        }
      };
    }
  }, [client, connectionStatus, responseTopic]);

  const getAllData = () => {
    if (!client) return;
    const command = JSON.stringify({ command: getDataCommand });
    const message = new Paho.Message(command);
    message.destinationName = commandTopic;
    client.send(message);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button onClick={getAllData}>Get All Data</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Device Name</TableHead>
            <TableHead>PN</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Topic</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length > 0 ? (
            devices.map((device, index) => (
              <TableRow key={device.profile?.name}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{device.profile?.name}</TableCell>
                <TableCell>{device.profile?.part_number}</TableCell>
                <TableCell>{device.protocol_setting?.address}</TableCell>
                <TableCell>{device.profile?.topic}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                No data found. Click "Get All Data".
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
