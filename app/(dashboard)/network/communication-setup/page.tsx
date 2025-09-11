// File: app/(dashboard)/network/communication-setup/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";

// --- UI Components & Icons ---
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
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Settings, Network, Rss, Info } from "lucide-react";

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
    netmask: "255.255.255.0",
    gateway: "",
    interfaceType: "static",
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchIpAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
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
    } catch (error) {
      Swal.fire("Error", "Failed to fetch IP addresses.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIpAddresses();
  }, [fetchIpAddresses]);

  const handleInputChange = (field: keyof IpConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Network size={24} /> IP Address Settings
        </CardTitle>
        <CardDescription>
          Configure the device's primary network interface (e.g., eth0).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="font-semibold">Detected Network Interfaces</Label>
          <div className="mt-2 space-y-2 rounded-lg border bg-slate-50 p-4 dark:bg-slate-800/50">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : interfaces.length > 0 ? (
              interfaces.map((iface) => (
                <div
                  key={iface.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {iface.name} ({iface.description})
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {iface.ipAddress}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No interfaces found.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="ipAddress">IP Address</Label>
            <Input
              id="ipAddress"
              value={config.ipAddress}
              onChange={(e) => handleInputChange("ipAddress", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
              placeholder="e.g., 192.168.1.50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="netmask">Netmask</Label>
            <Input
              id="netmask"
              value={config.netmask}
              onChange={(e) => handleInputChange("netmask", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
              placeholder="e.g., 255.255.255.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gateway">Gateway</Label>
            <Input
              id="gateway"
              value={config.gateway}
              onChange={(e) => handleInputChange("gateway", e.target.value)}
              disabled={config.interfaceType === "dhcp"}
              placeholder="e.g., 192.168.1.1"
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
// Sub-Component: ProtocolSettingsCard (Generic for MODBUS/SNMP)
// =================================================================
interface ProtocolSettingsCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: string;
  statusVariant: "success" | "destructive" | "warning";
  settings: Record<string, any>;
  isLoading: boolean;
  onSettingsChange: (newSettings: Record<string, any>) => void;
  onSave: () => void;
  formatKey?: (key: string) => string;
}

const ProtocolSettingsCard = ({
  title,
  description,
  icon,
  status,
  statusVariant,
  settings,
  isLoading,
  onSettingsChange,
  onSave,
  formatKey = (k) => k,
}: ProtocolSettingsCardProps) => {
  const statusClasses = {
    success:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300",
    destructive:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {icon} {title}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{description}</span>
          <Badge
            variant="outline"
            className={`ml-2 ${statusClasses[statusVariant]}`}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </>
        ) : Object.keys(settings).length > 0 ? (
          Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{formatKey(key)}</Label>
              <Input
                id={key}
                value={value ?? ""}
                type={typeof value === "number" ? "number" : "text"}
                onChange={(e) =>
                  onSettingsChange({ ...settings, [key]: e.target.value })
                }
              />
            </div>
          ))
        ) : (
          <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
            <Info size={16} />
            <span>Settings data not yet available from the service.</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSave}
          disabled={isLoading || Object.keys(settings).length === 0}
        >
          Save {title}
        </Button>
      </CardFooter>
    </Card>
  );
};

// =================================================================
// --- Main Page Component ---
// =================================================================
function CommunicationSetupPage() {
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();
  const [isSubmittingIp, setIsSubmittingIp] = useState(false);
  const [modbusSettings, setModbusSettings] = useState<ModbusSettings>({
    modbusTCP_IP: "",
    modbusTCP_Port: "",
  });
  const [modbusStatus, setModbusStatus] = useState("Checking...");
  const [snmpSettings, setSnmpSettings] = useState<SnmpSettings>({});
  const [snmpStatus, setSnmpStatus] = useState("Checking...");
  const [isLoadingModbus, setIsLoadingModbus] = useState(true);
  const [isLoadingSnmp, setIsLoadingSnmp] = useState(true);

  const handleMqttMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      const data = JSON.parse(payloadStr);
      switch (topic) {
        case "IOT/Containment/modbustcp/setting/data":
          setModbusSettings({
            modbusTCP_IP: data.modbus_tcp_ip,
            modbusTCP_Port: data.modbus_tcp_port,
          });
          setIsLoadingModbus(false);
          break;
        case "IOT/Containment/modbustcp/status":
          setModbusStatus(data.modbusTCPStatus);
          break;
        case "IOT/Containment/snmp/setting/data":
          setSnmpSettings(data);
          setIsLoadingSnmp(false);
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Swal.fire("Success", "Network configuration command sent!", "success");
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
    <div className=" p-4 md:p-6 lg:p-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Communication Setup
        </h1>
        <p className="text-muted-foreground">
          Manage core network, MODBUS, and SNMP configurations for the device.
        </p>
      </div>
      <div className="space-y-8">
        <IpAddressSettingsCard
          onConfigure={configureNetwork}
          isSubmitting={isSubmittingIp}
        />
        <ProtocolSettingsCard
          title="MODBUS TCP Settings"
          description="Set IP address and port for the MODBUS TCP server."
          icon={<Rss size={24} />}
          status={modbusStatus}
          statusVariant={
            modbusStatus === "Connected" ? "success" : "destructive"
          }
          settings={modbusSettings}
          isLoading={isLoadingModbus}
          onSettingsChange={(s) => setModbusSettings(s as ModbusSettings)}
          onSave={writeModbusSettings}
          formatKey={(k) => (k === "modbusTCP_IP" ? "IP Address" : "Port")}
        />
        <ProtocolSettingsCard
          title="SNMP Settings"
          description="Configure SNMP agent parameters."
          icon={<Settings size={24} />}
          status={snmpStatus}
          statusVariant={snmpStatus === "Active" ? "success" : "warning"}
          settings={snmpSettings}
          isLoading={isLoadingSnmp}
          onSettingsChange={(s) => setSnmpSettings(s as SnmpSettings)}
          onSave={writeSnmpSettings}
          formatKey={(key) =>
            key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())
              .replace("Snmp", "SNMP")
          }
        />
      </div>
    </div>
  );
}

// Wrapper component with MqttProvider
export default function CommunicationSetupPageWithProvider() {
  return (
    <MqttProvider>
      <CommunicationSetupPage />
    </MqttProvider>
  );
}
