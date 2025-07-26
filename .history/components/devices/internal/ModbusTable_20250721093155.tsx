// File: components/devices/internal/ModbusTable.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
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
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Tipe Data ---
interface DeviceProfile {
  name?: string;
  device_type?: string;
  manufacturer?: string;
  part_number?: string;
  topic?: string;
  [key: string]: any; // Untuk field lain di special modal
}

interface ProtocolSetting {
  protocol?: string;
  address?: number;
  ip_address?: string;
  [key: string]: any; // Untuk field lain
}

interface Device {
  profile: DeviceProfile;
  protocol_setting: ProtocolSetting;
}

// --- Komponen Utama ---
export function ModbusTable() {
  const { client, connectionStatus } = useMqtt();

  // --- State Management ---
  const [devices, setDevices] = useState<Record<string, any[]>>({});
  const [summaryData, setSummaryData] = useState<Record<string, any[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {},
    protocol_setting: {},
  });
  const [oldDeviceName, setOldDeviceName] = useState("");

  // State untuk form dinamis
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);

  // --- Logika MQTT ---
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      const topics = [
        "response_device_modbus",
        "response/ping",
        "response_service_restart",
        "service/response",
      ];
      topics.forEach((topic) => client.subscribe(topic));

      client.onMessageArrived = (message: Paho.Message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          if (message.destinationName === "response_device_modbus") {
            // Cek apakah ini response dari getDataSummaryByProtocol
            if (payload.summary) {
              setSummaryData(payload.summary);
              const types = Object.keys(payload.summary).filter(
                (type) => payload.summary[type].length > 0
              );
              setDeviceTypes(types);
            } else {
              setDevices(payload);
            }
          } else {
            handleGenericResponse(message.payloadString);
          }
        } catch (e) {
          handleGenericResponse(message.payloadString);
        }
      };
    }
  }, [client, connectionStatus]);

  const handleGenericResponse = (payloadString: string) => {
    /* ... (Sama seperti sebelumnya) ... */
  };

  // --- Fungsi Aksi ---
  const getAllData = () => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const restartService = () => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const addDevice = () => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const updateDevice = () => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const deleteDevice = (deviceName: string) => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const pingIp = (ip: string) => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const updateSpecialDevice = () => {
    /* ... (Sama seperti sebelumnya, sama dengan updateDevice) ... */
  };

  // --- Logika Modal & Form ---
  const showAddDeviceModal = () => {
    setIsUpdateMode(false);
    setNewDevice({ profile: {}, protocol_setting: { protocol: "" } });
    setDeviceTypes([]);
    setManufacturers([]);
    setPartNumbers([]);
    setIsModalOpen(true);
  };

  const showUpdateDeviceModal = (device: Device) => {
    const isSpecial = ["DPC_SC5011", "DPC_SC501_TBG_consumtion"].includes(
      device.profile?.name || ""
    );
    setIsUpdateMode(true);
    setOldDeviceName(device.profile?.name || "");
    const deviceCopy = JSON.parse(JSON.stringify(device));
    setNewDevice(deviceCopy);

    if (isSpecial) {
      setIsSpecialModalOpen(true);
    } else {
      // Pre-fetch summary data for editing
      handleProtocolChange(
        deviceCopy.protocol_setting.protocol || "",
        deviceCopy
      );
      setIsModalOpen(true);
    }
  };

  const handleProtocolChange = (protocol: string, deviceToUpdate?: Device) => {
    if (!client || !protocol) return;
    setNewDevice((prev) => ({
      ...prev,
      protocol_setting: { ...prev.protocol_setting, protocol },
    }));

    const command = JSON.stringify({
      command: "getDataSummaryByProtocol",
      protocol,
    });
    const message = new Paho.Message(command);
    message.destinationName = "command_device_modbus";
    client.send(message);

    // Jika sedang update, langsung filter dropdown
    if (deviceToUpdate) {
      // Beri sedikit waktu agar summaryData ter-update
      setTimeout(() => {
        handleDeviceTypeChange(
          deviceToUpdate.profile.device_type || "",
          deviceToUpdate
        );
      }, 500);
    }
  };

  const handleDeviceTypeChange = (type: string, deviceData?: Device) => {
    const currentData = deviceData || newDevice;
    const protocol = currentData.protocol_setting.protocol || "";
    const summaryForProtocol = summaryData[protocol] || {};
    const devicesForType = summaryForProtocol[type] || [];

    const mfrs = [
      ...new Set<string>(
        devicesForType.map((d) => d.manufacturer).filter(Boolean)
      ),
    ];
    setManufacturers(mfrs);

    let pns: string[] = [];
    if (deviceData) {
      // Jika update, filter berdasarkan manufacturer yang ada
      const selectedMfr = deviceData.profile.manufacturer;
      pns = [
        ...new Set<string>(
          devicesForType
            .filter((d) => d.manufacturer === selectedMfr)
            .map((d) => d.part_number)
            .filter(Boolean)
        ),
      ];
    }
    setPartNumbers(pns);

    setNewDevice((prev) => ({
      ...prev,
      profile: { ...prev.profile, device_type: type },
    }));
  };

  const handleManufacturerChange = (manufacturer: string) => {
    const protocol = newDevice.protocol_setting.protocol || "";
    const type = newDevice.profile.device_type || "";
    const summaryForProtocol = summaryData[protocol] || {};
    const devicesForType = summaryForProtocol[type] || [];

    const pns = [
      ...new Set<string>(
        devicesForType
          .filter((d) => d.manufacturer === manufacturer)
          .map((d) => d.part_number)
          .filter(Boolean)
      ),
    ];
    setPartNumbers(pns);

    setNewDevice((prev) => ({
      ...prev,
      profile: { ...prev.profile, manufacturer, part_number: "" }, // Reset part_number
    }));
  };

  const handleInputChange = (
    part: "profile" | "protocol_setting",
    field: string,
    value: any
  ) => {
    setNewDevice((prev) => ({
      ...prev,
      [part]: {
        ...prev[part],
        [field]: value,
      },
    }));
  };

  const allDevices = useMemo(() => Object.values(devices).flat(), [devices]);
  const totalPages = useMemo(
    () => Math.ceil(allDevices.length / itemsPerPage),
    [allDevices, itemsPerPage]
  );
  const pagedDevices = useMemo(() => {
    /* ... (Sama seperti sebelumnya) ... */
  }, [allDevices, currentPage, itemsPerPage]);

  return (
    <div className="p-4 border rounded-lg mt-4 bg-card text-card-foreground">
      {/* ... (Tombol-tombol utama sama seperti sebelumnya) ... */}
      {/* ... (Tabel dan Pagination sama seperti sebelumnya) ... */}

      {/* --- Modal Add/Update --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isUpdateMode ? "Update Device" : "Add New Device"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-4">
            <form
              id="deviceForm"
              onSubmit={(e) => {
                e.preventDefault();
                isUpdateMode ? updateDevice() : addDevice();
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* --- FORM KONTEN --- */}
                <div>
                  <Label>Protocol Type</Label>
                  <Select
                    onValueChange={(val) => handleProtocolChange(val)}
                    value={newDevice.protocol_setting.protocol}
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

                {newDevice.protocol_setting.protocol && (
                  <>
                    <div>
                      <Label>Device Name</Label>
                      <Input
                        value={newDevice.profile.name || ""}
                        onChange={(e) =>
                          handleInputChange("profile", "name", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Device Type</Label>
                      <Select
                        onValueChange={handleDeviceTypeChange}
                        value={newDevice.profile.device_type}
                      >
                        <SelectTrigger>
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
                      <Label>Manufacturer</Label>
                      <Select
                        onValueChange={handleManufacturerChange}
                        value={newDevice.profile.manufacturer}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Manufacturer" />
                        </SelectTrigger>
                        <SelectContent>
                          {manufacturers.map((mfr) => (
                            <SelectItem key={mfr} value={mfr}>
                              {mfr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                    {/* Fields for Modbus RTU */}
                    {newDevice.protocol_setting.protocol === "Modbus RTU" && (
                      <>
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
                        {/* Tambahkan field Modbus RTU lainnya di sini (Port, Baudrate, dll) */}
                      </>
                    )}

                    {/* Fields for SNMP */}
                    {newDevice.protocol_setting.protocol === "SNMP" && (
                      <>
                        <div>
                          <Label>IP Address</Label>
                          <Input
                            value={newDevice.protocol_setting.ip_address || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "protocol_setting",
                                "ip_address",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        {/* Tambahkan field SNMP lainnya di sini (Port, Version, dll) */}
                      </>
                    )}

                    <div>
                      <Label>MQTT Topic</Label>
                      <Input
                        value={newDevice.profile.topic || ""}
                        onChange={(e) =>
                          handleInputChange("profile", "topic", e.target.value)
                        }
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </form>
          </ScrollArea>
          <DialogFooter>
            <Button type="submit" form="deviceForm">
              {isUpdateMode ? "Update Device" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modal Special Device --- */}
      <Dialog open={isSpecialModalOpen} onOpenChange={setIsSpecialModalOpen}>
        {/* ... (Konten modal khusus bisa dibuat di sini dengan cara yang sama) ... */}
      </Dialog>
    </div>
  );
}
