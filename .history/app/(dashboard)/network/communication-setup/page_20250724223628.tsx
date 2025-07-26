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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";

// --- Type Definitions ---
interface NetworkInterface {
  name: string;
  description: string;
  ipAddress: string;
}
interface ModbusSettings {
  modbusTCP_IP: string;
  modbusTCP_Port: number | null;
}
interface SnmpSettings {
  [key: string]: any;
}

export default function CommunicationSetupPage() {
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();

  // IP Address States
  const [networkInterfaces, setNetworkInterfaces] = useState<
    NetworkInterface[]
  >([]);
  const [ipConfig, setIpConfig] = useState({
    ipAddress: "",
    netmask: "",
    gateway: "",
    interfaceType: "static",
  });
  const [isSubmittingIp, setIsSubmittingIp] = useState(false);

  // MODBUS TCP States
  const [modbusSettings, setModbusSettings] = useState<ModbusSettings>({
    modbusTCP_IP: "",
    modbusTCP_Port: 502,
  });
  const [modbusStatus, setModbusStatus] = useState("Checking...");

  // SNMP States
  const [snmpSettings, setSnmpSettings] = useState<SnmpSettings>({});
  const [snmpStatus, setSnmpStatus] = useState("Checking...");

  const handleMqttMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      const data = JSON.parse(payloadStr);
      if (topic === "IOT/Containment/modbustcp/setting/data") {
        setModbusSettings({
          modbusTCP_IP: data.modbus_tcp_ip,
          modbusTCP_Port: data.modbus_tcp_port,
        });
      } else if (topic === "IOT/Containment/modbustcp/status") {
        setModbusStatus(data.modbusTCPStatus);
      } else if (topic === "IOT/Containment/snmp/setting/data") {
        setSnmpSettings(data);
      } else if (topic === "IOT/Containment/snmp/status") {
        setSnmpStatus(data.snmpStatus);
      }
    } catch (e) {
      console.error("Error parsing MQTT message:", e);
    }
  }, []);

  // Subscribe to MQTT topics on component mount
  useEffect(() => {
    if (isReady) {
      const topics = [
        "IOT/Containment/modbustcp/setting/data",
        "IOT/Containment/modbustcp/status",
        "IOT/Containment/snmp/setting/data",
        "IOT/Containment/snmp/status",
      ];
      topics.forEach((t) => subscribe(t, handleMqttMessage));

      // Request initial data
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

  const fetchIpAddresses = async () => {
    try {
      const { data } = await axios.get<NetworkInterface[]>("/api/ip-address");
      setNetworkInterfaces(data);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch IP addresses.", "error");
    }
  };

  const configureNetwork = async () => {
    setIsSubmittingIp(true);
    try {
      const { data } = await axios.post("/api/network/configure", ipConfig);
      Swal.fire(
        "Success",
        data.message || "Network configuration command sent!",
        "success"
      );
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
      modbus_tcp_port: modbusSettings.modbusTCP_Port,
    });
    publish("IOT/Containment/modbustcp/setting/command", payload);
    Swal.fire("Sent!", "MODBUS TCP settings have been sent.", "success");
  };

  const writeSnmpSettings = () => {
    const payload = JSON.stringify({ ...snmpSettings, command: "write" });
    publish("IOT/Containment/snmp/setting/command", payload);
    Swal.fire("Sent!", "SNMP settings have been sent.", "success");
  };

  const formatKey = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace("Snmp", "SNMP");

  return (
    <main className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Communication Setup</h1>

      <Accordion
        type="single"
        collapsible
        defaultValue="item-1"
        className="w-full"
      >
        {/* IP Address Settings */}
        <AccordionItem value="item-1">
          <AccordionTrigger>IP Address Settings</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">
                Current Network Interfaces:
              </h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {networkInterfaces.map((iface) => (
                  <li key={iface.name}>
                    {iface.name} ({iface.description}): {iface.ipAddress}
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" onClick={fetchIpAddresses}>
                Get IP Addresses
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  value={ipConfig.ipAddress}
                  onChange={(e) =>
                    setIpConfig((p) => ({ ...p, ipAddress: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="netmask">Netmask</Label>
                <Input
                  id="netmask"
                  value={ipConfig.netmask}
                  onChange={(e) =>
                    setIpConfig((p) => ({ ...p, netmask: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway">Gateway</Label>
                <Input
                  id="gateway"
                  value={ipConfig.gateway}
                  onChange={(e) =>
                    setIpConfig((p) => ({ ...p, gateway: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Interface Type</Label>
                <Select
                  value={ipConfig.interfaceType}
                  onValueChange={(val) =>
                    setIpConfig((p) => ({ ...p, interfaceType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="dhcp">DHCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={configureNetwork} disabled={isSubmittingIp}>
              {isSubmittingIp && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Configure Network
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* MODBUS TCP Settings */}
        <AccordionItem value="item-2">
          <AccordionTrigger>MODBUS TCP Settings</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm">
              Status: <span className="font-semibold">{modbusStatus}</span>
            </p>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modbusIp">MODBUS TCP IP Address</Label>
                <Input
                  id="modbusIp"
                  value={modbusSettings.modbusTCP_IP}
                  onChange={(e) =>
                    setModbusSettings((p) => ({
                      ...p,
                      modbusTCP_IP: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modbusPort">MODBUS TCP Port</Label>
                <Input
                  id="modbusPort"
                  type="number"
                  value={modbusSettings.modbusTCP_Port ?? ""}
                  onChange={(e) =>
                    setModbusSettings((p) => ({
                      ...p,
                      modbusTCP_Port: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <Button onClick={writeModbusSettings}>
              Write MODBUS TCP Settings
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* SNMP Settings */}
        <AccordionItem value="item-3">
          <AccordionTrigger>SNMP Settings</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm">
              Status: <span className="font-semibold">{snmpStatus}</span>
            </p>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(snmpSettings).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{formatKey(key)}</Label>
                  <Input
                    id={key}
                    value={value ?? ""}
                    onChange={(e) =>
                      setSnmpSettings((p) => ({ ...p, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button onClick={writeSnmpSettings}>Write SNMP Settings</Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
}
