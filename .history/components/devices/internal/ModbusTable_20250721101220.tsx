"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext"; // Adjust the path to your MqttContext
import Swal from "sweetalert2";
import Paho from "paho-mqtt";

// Import UI components from Shadcn/UI
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
  DialogClose,
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

// Initial state for the device form
const initialDeviceState = {
  profile: {
    name: "",
    device_type: "",
    manufacturer: "",
    part_number: "",
    topic: "",
    interval_publish: 10,
    qos: 0,
    retain: false,
    custom_payload: false,
    custom_by_customer: false,
    customer: "",
  },
  protocol_setting: {
    protocol: "",
    address: null,
    port: "",
    baudrate: 9600,
    parity: "NONE",
    bytesize: 8,
    stop_bit: 1,
    timeout: 3,
    endianness: "Big Endian",
    ip_address: "",
    snmp_version: "2",
    read_community: "public",
  },
};

// Main component for the Modbus/SNMP device table
export function ModbusTable() {
  const { client, connectionStatus } = useMqtt();

  // --- STATE MANAGEMENT ---
  const [devices, setDevices] = useState<Record<string, any[]>>({});
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<any>(
    JSON.parse(JSON.stringify(initialDeviceState))
  );
  const [oldDeviceName, setOldDeviceName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- DERIVED STATE FOR DROPDOWNS (EQUIVALENT TO VUE'S COMPUTED/WATCH) ---
  const allDevices = useMemo(() => Object.values(devices).flat(), [devices]);
  const totalPages = useMemo(
    () => Math.ceil(allDevices.length / itemsPerPage) || 1,
    [allDevices, itemsPerPage]
  );
  const pagedDevices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return allDevices.slice(start, end);
  }, [currentPage, allDevices, itemsPerPage]);

  // Gets device types from the fetched catalog based on the selected protocol
  const deviceTypes = useMemo(() => {
    const protocol = newDevice.protocol_setting?.protocol;
    if (!protocol || !deviceCatalog[protocol]) return [];
    return Object.keys(deviceCatalog[protocol]).filter(
      (type) => deviceCatalog[protocol][type].length > 0
    );
  }, [newDevice.protocol_setting?.protocol, deviceCatalog]);

  // Gets manufacturers based on the selected protocol and device type
  const manufacturers = useMemo(() => {
    const protocol = newDevice.protocol_setting?.protocol;
    const type = newDevice.profile?.device_type;
    if (!protocol || !type || !deviceCatalog[protocol]?.[type]) return [];
    const allManufacturers = deviceCatalog[protocol][type].map(
      (d: any) => d.manufacturer
    );
    return [...new Set(allManufacturers)]; // Return unique values
  }, [
    newDevice.protocol_setting?.protocol,
    newDevice.profile?.device_type,
    deviceCatalog,
  ]);

  // Gets part numbers based on the selected protocol and device type
  const partNumbers = useMemo(() => {
    const protocol = newDevice.protocol_setting?.protocol;
    const type = newDevice.profile?.device_type;
    if (!protocol || !type || !deviceCatalog[protocol]?.[type]) return [];
    const allPartNumbers = deviceCatalog[protocol][type].map(
      (d: any) => d.part_number
    );
    return [...new Set(allPartNumbers)]; // Return unique values
  }, [
    newDevice.protocol_setting?.protocol,
    newDevice.profile?.device_type,
    deviceCatalog,
  ]);

  // --- MQTT & DATA HANDLING ---
  const onMessageArrived = (message: Paho.Message) => {
    let payload;
    console.log(`Message arrived on topic: ${message.destinationName}`);
    console.log("Payload:", message.payloadString);
    try {
      payload = JSON.parse(message.payloadString);
    } catch (error) {
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
          setIsModalOpen(false);
          setIsSpecialModalOpen(false);
          getAllData();
        }
      });
    } else if (message.destinationName === "response_device_modbus") {
      // **NEW LOGIC**: Check if the message is a response for the dropdown catalog
      if (payload.command === "getDataSummaryByProtocol") {
        console.log("Payload getDataSummaryByProtocol:", payload);
        setDeviceCatalog((prev) => ({
          ...prev,
          [payload.protocol]: payload.data,
        }));
      } else {
        // Otherwise, it's the main device list for the table
        setDevices(payload);
      }
    } else if (message.destinationName === "response_service_restart") {
      Swal.close();
      Swal.fire({
        icon: payload.status === "success" ? "success" : "error",
        title: "Service Restart",
        text: payload.message,
      });
    }
  };

  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      client.subscribe("response_device_modbus");
      console.log("Subscribed to response_device_modbus");
      client.subscribe("response/ping");
      client.subscribe("response_service_restart");
      client.subscribe("service/response");
      client.onMessageArrived = onMessageArrived;
      getAllData();
    }
  }, [client, connectionStatus]);

  // --- ACTIONS (EQUIVALENT TO VUE'S METHODS) ---
  const sendMqttCommand = (topic: string, command: object, qos: number = 0) => {
    if (!client) return;
    const message = new Paho.Message(JSON.stringify(command));
    message.destinationName = topic;
    message.qos = qos;
    client.send(message);
  };

  const getAllData = () =>
    sendMqttCommand("command_device_modbus", { command: "getDataModbus" });

  // Fetches the catalog for dropdowns
  const fetchDataByProtocol = (protocol: string) => {
    if (!protocol) return;
    sendMqttCommand("command_device_modbus", {
      command: "getDataSummaryByProtocol",
      protocol: protocol,
    });
  };

  // **NEW LOGIC**: Handles protocol change, fetches catalog, and resets dependent fields
  const handleProtocolChange = (protocol: string) => {
    fetchDataByProtocol(protocol);
    setNewDevice((prev: any) => ({
      ...initialDeviceState, // Reset to initial state
      profile: { ...initialDeviceState.profile },
      protocol_setting: { ...initialDeviceState.protocol_setting, protocol },
    }));
  };

  // **NEW LOGIC**: Handles device type change and resets dependent fields
  const handleDeviceTypeChange = (type: string) => {
    setNewDevice((prev: any) => ({
      ...prev,
      profile: {
        ...prev.profile,
        device_type: type,
        manufacturer: "", // Reset manufacturer
        part_number: "", // Reset part number
      },
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = isUpdateMode ? "updateDevice" : "addDevice";
    const payload: any = { command, device: newDevice };
    if (isUpdateMode) {
      payload.old_name = oldDeviceName;
    }
    sendMqttCommand("command_device_modbus", payload);
  };

  const deleteDevice = (deviceName: string) => {
    if (!deviceName) return; // Prevent deleting if name is undefined
    Swal.fire({
      title: "Are you sure?",
      text: `You will not be able to recover the device: ${deviceName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        sendMqttCommand("command_device_modbus", {
          command: "deleteDevice",
          name: deviceName,
        });
      }
    });
  };

  const showAddDeviceModal = () => {
    setIsUpdateMode(false);
    setNewDevice(JSON.parse(JSON.stringify(initialDeviceState)));
    setDeviceCatalog({}); // Reset catalog on add
    setIsModalOpen(true);
  };

  const showUpdateDeviceModal = (device: any) => {
    const isSpecial = ["DPC_SC5011", "DPC_SC501_TBG_consumtion"].includes(
      device.profile.name
    );

    setIsUpdateMode(true);
    setOldDeviceName(device.profile.name);
    // Deep copy to avoid direct state mutation
    const deviceCopy = JSON.parse(JSON.stringify(device));
    setNewDevice(deviceCopy);

    if (isSpecial) {
      setIsSpecialModalOpen(true);
    } else {
      // Fetch the catalog for the existing device's protocol to populate dropdowns
      fetchDataByProtocol(device.protocol_setting.protocol);
      setIsModalOpen(true);
    }
  };

  const restartService = () => {
    Swal.fire({
      title: "Restarting Services",
      text: "Please wait...",
      icon: "info",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    sendMqttCommand(
      "service/command",
      {
        action: "restart",
        services: ["modbus_snmp.service", "mqtt_config.service"],
      },
      0
    );
  };

  const pingIp = (ip: string) => {
    if (!client || !ip) return;
    const message = new Paho.Message(ip);
    message.destinationName = "request/ping";
    client.send(message);
    Swal.fire({
      title: "Ping Request Sent",
      text: `Sending ping request to ${ip}`,
      icon: "info",
    });
  };

  // --- FORM FIELD RENDERERS ---
  const renderModbusFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="deviceName">Device Name</Label>
        <Input
          id="deviceName"
          value={newDevice.profile.name}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, name: e.target.value },
            }))
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="deviceType">Device Type</Label>
        <Select
          value={newDevice.profile.device_type}
          onValueChange={handleDeviceTypeChange} // Use the new handler
        >
          <SelectTrigger id="deviceType">
            <SelectValue placeholder="Select Device Type" />
          </SelectTrigger>
          <SelectContent>
            {deviceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Select
          value={newDevice.profile.manufacturer}
          onValueChange={(v) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, manufacturer: v },
            }))
          }
          disabled={!newDevice.profile.device_type}
        >
          <SelectTrigger id="manufacturer">
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
        <Label htmlFor="partNumber">Part Number</Label>
        <Select
          value={newDevice.profile.part_number}
          onValueChange={(v) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, part_number: v },
            }))
          }
          disabled={!newDevice.profile.device_type}
        >
          <SelectTrigger id="partNumber">
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
        <Label htmlFor="modbusAddress">Address</Label>
        <Input
          id="modbusAddress"
          type="number"
          value={newDevice.protocol_setting.address || ""}
          onChange={(e) =>
            setNewDevice((p: any) => ({
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
        <Label htmlFor="modbusPort">Port</Label>
        <Select
          value={newDevice.protocol_setting.port}
          onValueChange={(v) =>
            setNewDevice((p: any) => ({
              ...p,
              protocol_setting: { ...p.protocol_setting, port: v },
            }))
          }
          required
        >
          <SelectTrigger id="modbusPort">
            <SelectValue placeholder="Select Port" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="/dev/ttyUSB0">/dev/ttyUSB0</SelectItem>
            <SelectItem value="/dev/ttyAMA0">/dev/ttyAMA0</SelectItem>
            <SelectItem value="/dev/ttyAMA1">/dev/ttyAMA1</SelectItem>
            <SelectItem value="/dev/ttyAMA2">/dev/ttyAMA2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="topic">MQTT Topic</Label>
        <Input
          id="topic"
          value={newDevice.profile.topic}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, topic: e.target.value },
            }))
          }
          required
        />
      </div>
    </div>
  );

  const renderSnmpFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* SNMP fields remain largely the same, but they will now correctly show 
          when the protocol is changed thanks to the improved handleProtocolChange logic. */}
      <div className="md:col-span-2">
        <Label htmlFor="deviceNameSnmp">Device Name</Label>
        <Input
          id="deviceNameSnmp"
          value={newDevice.profile.name}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, name: e.target.value },
            }))
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="snmpIp">SNMP IP Address</Label>
        <Input
          id="snmpIp"
          value={newDevice.protocol_setting.ip_address}
          onChange={(e) =>
            setNewDevice((p: any) => ({
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
        <Label htmlFor="snmpPort">SNMP Port</Label>
        <Input
          id="snmpPort"
          type="number"
          value={newDevice.protocol_setting.port}
          onChange={(e) =>
            setNewDevice((p: any) => ({
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
        <Label htmlFor="snmpVersion">SNMP Version</Label>
        <Select
          value={newDevice.protocol_setting.snmp_version}
          onValueChange={(v) =>
            setNewDevice((p: any) => ({
              ...p,
              protocol_setting: { ...p.protocol_setting, snmp_version: v },
            }))
          }
        >
          <SelectTrigger id="snmpVersion">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">SNMPv1</SelectItem>
            <SelectItem value="2">SNMPv2</SelectItem>
            <SelectItem value="3">SNMPv3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="readCommunity">Read Community</Label>
        <Select
          value={newDevice.protocol_setting.read_community}
          onValueChange={(v) =>
            setNewDevice((p: any) => ({
              ...p,
              protocol_setting: { ...p.protocol_setting, read_community: v },
            }))
          }
          required
        >
          <SelectTrigger id="readCommunity">
            <SelectValue placeholder="Select Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="topicSnmp">MQTT Topic</Label>
        <Input
          id="topicSnmp"
          value={newDevice.profile.topic}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, topic: e.target.value },
            }))
          }
          required
        />
      </div>
    </div>
  );

  const renderSpecialDeviceFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Device Info (Readonly) */}
      <div>
        <Label>Device Name</Label>
        <Input value={newDevice.profile.name} readOnly />
      </div>
      <div>
        <Label>Device Type</Label>
        <Input value={newDevice.profile.device_type} readOnly />
      </div>
      <div>
        <Label>Manufacturer</Label>
        <Input value={newDevice.profile.manufacturer} readOnly />
      </div>
      <div>
        <Label>Part Number</Label>
        <Input value={newDevice.profile.part_number} readOnly />
      </div>

      {/* Editable Fields */}
      <div>
        <Label htmlFor="specialTopic">MQTT Topic</Label>
        <Input
          id="specialTopic"
          value={newDevice.profile.topic}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: { ...p.profile, topic: e.target.value },
            }))
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="intervalPublish">Interval Publish (s)</Label>
        <Input
          id="intervalPublish"
          type="number"
          value={newDevice.profile.interval_publish}
          onChange={(e) =>
            setNewDevice((p: any) => ({
              ...p,
              profile: {
                ...p.profile,
                interval_publish: Number(e.target.value),
              },
            }))
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="specialSnmpIp">SNMP IP Address</Label>
        <Input
          id="specialSnmpIp"
          value={newDevice.protocol_setting.ip_address}
          onChange={(e) =>
            setNewDevice((p: any) => ({
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
        <Label htmlFor="specialSnmpPort">SNMP Port</Label>
        <Input
          id="specialSnmpPort"
          type="number"
          value={newDevice.protocol_setting.port}
          onChange={(e) =>
            setNewDevice((p: any) => ({
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
    </div>
  );

  // --- RENDER JSX ---
  return (
    <div className="p-4 border rounded-lg mt-4 bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">Modbus & SNMP Devices</h2>
        <div className="flex flex-wrap gap-2">
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
                <TableRow key={device.profile?.name || `device-${index}`}>
                  <TableCell>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {device.profile?.name}
                  </TableCell>
                  <TableCell>{device.profile?.part_number}</TableCell>
                  <TableCell>
                    {device.protocol_setting?.protocol === "SNMP" ? (
                      <span
                        className="text-blue-500 cursor-pointer hover:underline"
                        onClick={() =>
                          pingIp(device.protocol_setting?.ip_address)
                        }
                        title={`Ping ${device.protocol_setting?.ip_address}`}
                      >
                        {device.protocol_setting?.ip_address}
                      </span>
                    ) : (
                      <span>{device.protocol_setting?.address}</span>
                    )}
                  </TableCell>
                  <TableCell>{device.profile?.manufacturer}</TableCell>
                  <TableCell
                    className="max-w-[200px] truncate"
                    title={device.profile?.topic}
                  >
                    {device.profile?.topic}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => showUpdateDeviceModal(device)}
                      title="Edit"
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
                        title="Delete"
                        disabled={!device.profile?.name}
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
                  No data found. Click "Get All Data" to fetch devices.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="pagination-controls mt-4 flex justify-center gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>

      {/* --- ADD / UPDATE MODAL --- */}
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
                onValueChange={handleProtocolChange}
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

            {newDevice.protocol_setting?.protocol === "Modbus RTU" &&
              renderModbusFields()}
            {newDevice.protocol_setting?.protocol === "SNMP" &&
              renderSnmpFields()}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
              <Button type="submit">
                {isUpdateMode ? "Update Device" : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* --- SPECIAL DEVICE MODAL --- */}
      <Dialog open={isSpecialModalOpen} onOpenChange={setIsSpecialModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Update Special Device</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleFormSubmit}
            className="space-y-4 max-h-[70vh] overflow-y-auto p-4"
          >
            {renderSpecialDeviceFields()}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
              <Button type="submit">Update Special Device</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
