// File: app/(dashboard)/network/communication-setup/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import { useMqtt } from "@/contexts/MqttContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Network, Rss } from "lucide-react";

// --- Type Definitions ---
interface NetworkInterface {
  name: string;
  description: string;
  ipAddress: string;
}
interface IpConfig {
  ipAddress: string;
  netmask: string;
  gateway: string;
  interfaceType: "static" | "dhcp";
}
interface ModbusSettings {
  modbusTCP_IP: string;
  modbusTCP_Port: number | string;
}
interface SnmpSettings {
  [key: string]: any;
}

// =================================================================
// Sub-Component: IpAddressSettingsCard
// =================================================================
interface IpAddressSettingsCardProps {
  onConfigure: (config: IpConfig) => void;
  isSubmitting: boolean;
}

const IpAddressSettingsCard = ({
  onConfigure,
  isSubmitting,
}: IpAddressSettingsCardProps) => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [config, setConfig] = useState<IpConfig>({
    ipAddress: "",
    netmask: "",
    gateway: "",
    interfaceType: "static",
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchIpAddresses = async () => {
    setIsLoading(true);
    try {
      // Dummy data for demonstration
      const dummyData: NetworkInterface[] = [
        {
          name: "eth0",
          description: "Primary Ethernet",
          ipAddress: "192.168.1.100",
        },
        {
          name: "wlan0",
          description: "Wireless LAN",
          ipAddress: "192.168.1.101",
        },
      ];
      setInterfaces(dummyData);
      // In a real scenario, you would use axios:
      // const { data } = await axios.get<NetworkInterface[]>("/api/ip-address");
      // setInterfaces(data);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch IP addresses.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof IpConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network size={22} /> IP Address Settings
        </CardTitle>
        <CardDescription>
          Configure the device's network interface settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="font-semibold">Current Network Interfaces</Label>
          <Button
            size="sm"
            variant="link"
            onClick={fetchIpAddresses}
            disabled={isLoading}
          >
            {isLoading ? "Fetching..." : "Fetch Current IPs"}
          </Button>
          <div className="p-3 mt-2 bg-muted rounded-md text-sm space-y-1">
            {interfaces.length > 0 ? (
              interfaces.map((iface) => (
                <p key={iface.name}>
                  <span className="font-medium">{iface.name}:</span>{" "}
                  {iface.ipAddress} ({iface.description})
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">
                Click "Fetch Current IPs" to see details.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="interfaceType">Interface Type</Label>
            <Select
              value={config.interfaceType}
              onValueChange={(val: "static" | "dhcp") =>
                handleInputChange("interfaceType", val)
              }
            >
              <SelectTrigger id="interfaceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static</SelectItem>
                <SelectItem value="dhcp">DHCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ipAddress">IP Address</Label>
            <Input
              id="ipAddress"
              value={config.ipAddress}
              onChange={(e) => handleInputChange("ipAddress", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="netmask">Netmask</Label>
            <Input
              id="netmask"
              value={config.netmask}
              onChange={(e) => handleInputChange("netmask", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gateway">Gateway</Label>
            <Input
              id="gateway"
              value={config.gateway}
              onChange={(e) => handleInputChange("gateway", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onConfigure(config)} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply Network Configuration
        </Button>
      </CardFooter>
    </Card>
  );
};

// =================================================================
// Sub-Component: ModbusTcpSettingsCard
// =================================================================
interface ModbusTcpSettingsCardProps {
  settings: ModbusSettings;
  status: string;
  onSettingsChange: (newSettings: ModbusSettings) => void;
  onSave: () => void;
}

const ModbusTcpSettingsCard = ({
  settings,
  status,
  onSettingsChange,
  onSave,
}: ModbusTcpSettingsCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Rss size={22} /> MODBUS TCP Settings
      </CardTitle>
      <CardDescription>
        Set the IP address and port for the MODBUS TCP server.
        <Badge
          variant={status === "Connected" ? "success" : "destructive"}
          className="ml-2"
        >
          {status}
        </Badge>
      </CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="modbusIp">IP Address</Label>
        <Input
          id="modbusIp"
          value={settings.modbusTCP_IP}
          onChange={(e) =>
            onSettingsChange({ ...settings, modbusTCP_IP: e.target.value })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="modbusPort">Port</Label>
        <Input
          id="modbusPort"
          type="number"
          value={settings.modbusTCP_Port}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              modbusTCP_Port:
                e.target.value === "" ? "" : parseInt(e.target.value),
            })
          }
        />
      </div>
    </CardContent>
    <CardFooter>
      <Button onClick={onSave}>Save MODBUS Settings</Button>
    </CardFooter>
  </Card>
);

// =================================================================
// Sub-Component: SnmpSettingsCard
// =================================================================
interface SnmpSettingsCardProps {
  settings: SnmpSettings;
  status: string;
  onSettingsChange: (newSettings: SnmpSettings) => void;
  onSave: () => void;
}

const SnmpSettingsCard = ({
  settings,
  status,
  onSettingsChange,
  onSave,
}: SnmpSettingsCardProps) => {
  const formatKey = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace("Snmp", "SNMP");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings size={22} /> SNMP Settings
        </CardTitle>
        <CardDescription>
          Configure SNMP agent parameters.
          <Badge
            variant={status === "Active" ? "success" : "destructive"}
            className="ml-2"
          >
            {status}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(settings).length > 0 ? (
          Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{formatKey(key)}</Label>
              <Input
                id={key}
                value={value ?? ""}
                onChange={(e) =>
                  onSettingsChange({ ...settings, [key]: e.target.value })
                }
              />
            </div>
          ))
        ) : (
          <p className="text-muted-foreground col-span-2">
            Waiting for SNMP settings from service...
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onSave} disabled={Object.keys(settings).length === 0}>
          Save SNMP Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

// =================================================================
// --- Komponen Halaman Utama ---
// =================================================================
export default function CommunicationSetupPage() {
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();

  const [isSubmittingIp, setIsSubmittingIp] = useState(false);
  const [modbusSettings, setModbusSettings] = useState<ModbusSettings>({
    modbusTCP_IP: "",
    modbusTCP_Port: 502,
  });
  const [modbusStatus, setModbusStatus] = useState("Checking...");
  const [snmpSettings, setSnmpSettings] = useState<SnmpSettings>({});
  const [snmpStatus, setSnmpStatus] = useState("Checking...");

  const handleMqttMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      const data = JSON.parse(payloadStr);
      switch (topic) {
        case "IOT/Containment/modbustcp/setting/data":
          setModbusSettings({
            modbusTCP_IP: data.modbus_tcp_ip,
            modbusTCP_Port: data.modbus_tcp_port,
          });
          break;
        case "IOT/Containment/modbustcp/status":
          setModbusStatus(data.modbusTCPStatus);
          break;
        case "IOT/Containment/snmp/setting/data":
          setSnmpSettings(data);
          break;
        case "IOT/Containment/snmp/status":
          setSnmpStatus(data.snmpStatus);
          break;
      }
    } catch (e) {
      console.error(`Error parsing MQTT message from ${topic}:`, e);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      const topics = [
        "IOT/Containment/modbustcp/setting/data",
        "IOT/Containment/modbustcp/status",
        "IOT/Containment/snmp/setting/data",
        "IOT/Containment/snmp/status",
      ];
      topics.forEach((t) => subscribe(t, handleMqttMessage));

      publish(
        "IOT/Containment/modbustcp/setting/command",
        JSON.stringify({ command: "read" })
      );
      publish(
        "IOT/Containment/snmp/setting/command",
        JSON.stringify({ command: "read" })
      );

      return () => topics.forEach((t) => unsubscribe(t, handleMqttMessage));
    }
  }, [isReady, publish, subscribe, unsubscribe, handleMqttMessage]);

  const configureNetwork = async (config: IpConfig) => {
    setIsSubmittingIp(true);
    try {
      // Dummy success for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Swal.fire("Success", "Network configuration command sent!", "success");
      // In a real scenario, you would use axios:
      // const { data } = await axios.post("/api/network/configure", config);
      // Swal.fire("Success", data.message || "Configuration sent!", "success");
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.response?.data?.message ||
          "Failed to send network configuration.",
        "error"
      );
    } finally {
      setIsSubmittingIp(false);
    }
  };

  const writeModbusSettings = () => {
    const payload = JSON.stringify({
      command: "write",
      modbus_tcp_ip: modbusSettings.modbusTCP_IP,
      modbus_tcp_port: Number(modbusSettings.modbusTCP_Port),
    });
    publish("IOT/Containment/modbustcp/setting/command", payload);
    Swal.fire("Sent!", "MODBUS TCP settings have been sent.", "success");
  };

  const writeSnmpSettings = () => {
    const payload = JSON.stringify({ ...snmpSettings, command: "write" });
    publish("IOT/Containment/snmp/setting/command", payload);
    Swal.fire("Sent!", "SNMP settings have been sent.", "success");
  };

  return (
    <main className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Manage network, MODBUS, and SNMP configurations for the device.
        </p>
      </div>

      <IpAddressSettingsCard
        onConfigure={configureNetwork}
        isSubmitting={isSubmittingIp}
      />

      <ModbusTcpSettingsCard
        settings={modbusSettings}
        status={modbusStatus}
        onSettingsChange={setModbusSettings}
        onSave={writeModbusSettings}
      />

      <SnmpSettingsCard
        settings={snmpSettings}
        status={snmpStatus}
        onSettingsChange={setSnmpSettings}
        onSave={writeSnmpSettings}
      />
    </main>
  );
}
