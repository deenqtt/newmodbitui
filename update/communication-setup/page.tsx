// File: app/(dashboard)/network/communication-setup/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";

// --- UI Components & Icons ---
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Network, Rss, Settings, Wifi, Cable, Radio, Info } from "lucide-react";

// --- Import Components ---
import { EthernetSettingsCard } from "@/components/network/EthernetSettingsCard";
import { WiFiSettingsCard } from "@/components/network/WiFiSettingsCard";
import { ModbusSettingsCard } from "@/components/network/ModbusSettingsCard";
import { SnmpSettingsCard } from "@/components/network/SnmpSettingsCard";

// --- Type Definitions ---
interface IpConfig {
  interface: string;
  method: "static" | "dhcp";
  static_ip?: string;
  netmask?: string;
  gateway?: string;
  dns?: string;
}

interface ModbusSettings {
  modbusTCP_IP: string;
  modbusTCP_Port: number | string;
}

interface SnmpSettings {
  [key: string]: any;
}

interface WiFiNetwork {
  ssid: string;
  security: string;
  signal: string;
  frequency: string;
  is_current: boolean;
  is_saved: boolean;
}

interface WiFiStatus {
  connected: boolean;
  current_network: {
    ssid: string;
    ip_address: string;
    signal_strength: string;
  } | null;
  saved_networks: Array<{
    ssid: string;
    is_current: boolean;
  }>;
  device_state: string;
}

// =================================================================
// --- Main Page Component ---
// =================================================================
function CommunicationSetupPage() {
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();

  // --- Ethernet States ---
  const [networkConfig, setNetworkConfig] = useState<any>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

  // --- WiFi States ---
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [wifiStatus, setWifiStatus] = useState<WiFiStatus | null>(null);
  const [isLoadingWiFi, setIsLoadingWiFi] = useState(true);
  const [isScanningWiFi, setIsScanningWiFi] = useState(false);

  // --- MODBUS States ---
  const [modbusSettings, setModbusSettings] = useState<ModbusSettings>({
    modbusTCP_IP: "",
    modbusTCP_Port: "",
  });
  const [modbusStatus, setModbusStatus] = useState("Checking...");
  const [isLoadingModbus, setIsLoadingModbus] = useState(true);

  // --- SNMP States ---
  const [snmpSettings, setSnmpSettings] = useState<SnmpSettings>({});
  const [snmpStatus, setSnmpStatus] = useState("Checking...");
  const [isLoadingSnmp, setIsLoadingSnmp] = useState(true);

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState("ethernet");

  // =================================================================
  // MQTT Message Handler
  // =================================================================
  const handleMqttMessage = useCallback(
    (topic: string, payloadStr: string) => {
      try {
        const data = JSON.parse(payloadStr);

        switch (topic) {
          // --- Network Config Response ---
          case "rpi/network/response":
            if (data.action === "get_network_config") {
              setNetworkConfig(data.network_config);
              setIsLoadingNetwork(false);
            } else if (data.action === "set_network_config") {
              if (data.status === "success") {
                Swal.fire({
                  icon: "success",
                  title: "Configuration Applied",
                  text: data.message,
                  timer: 3000,
                  showConfirmButton: false,
                });
                // Refresh network config
                setTimeout(() => {
                  publish("rpi/network/get", "{}");
                }, 2000);
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Configuration Failed",
                  text: data.message,
                });
              }
            }
            break;

          // --- WiFi Scan Response ---
          case "rpi/wifi/scan_response":
            if (data.status === "success") {
              setWifiNetworks(data.networks || []);
              setIsScanningWiFi(false);
            } else {
              setIsScanningWiFi(false);
              Swal.fire({
                icon: "error",
                title: "Scan Failed",
                text: data.error || "Failed to scan WiFi networks",
              });
            }
            break;

          // --- WiFi Status Response ---
          case "rpi/wifi/status/response":
            if (data.status === "success") {
              setWifiStatus(data.wifi_status);
              setIsLoadingWiFi(false);
            }
            break;

          // --- WiFi Connect Response ---
          case "rpi/wifi/connect_response":
            if (data.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Connected!",
                html: `
                <div class="space-y-2">
                  <p><strong>Network:</strong> ${data.ssid}</p>
                  <p><strong>IP Address:</strong> ${data.ip_address}</p>
                </div>
              `,
                timer: 4000,
              });
              // Refresh WiFi status
              setTimeout(() => {
                publish("rpi/wifi/status/get", "{}");
              }, 1000);
            } else {
              Swal.fire({
                icon: "error",
                title: "Connection Failed",
                text: data.error || "Failed to connect to WiFi",
              });
            }
            break;

          // --- WiFi Disconnect Response ---
          case "rpi/wifi/disconnect_response":
            if (data.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Disconnected",
                text: data.message,
                timer: 2000,
                showConfirmButton: false,
              });
              setTimeout(() => {
                publish("rpi/wifi/status/get", "{}");
              }, 1000);
            }
            break;

          // --- WiFi Delete Response ---
          case "rpi/wifi/delete_response":
            if (data.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Network Deleted",
                text: data.message,
                timer: 2000,
                showConfirmButton: false,
              });
              setTimeout(() => {
                publish("rpi/wifi/status/get", "{}");
                publish("rpi/wifi/scan", "{}");
              }, 1000);
            } else {
              Swal.fire({
                icon: "error",
                title: "Delete Failed",
                text: data.error,
              });
            }
            break;

          // --- MODBUS ---
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

          // --- SNMP ---
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
    },
    [publish]
  );

  // =================================================================
  // Subscribe to MQTT Topics on Mount
  // =================================================================
  useEffect(() => {
    if (isReady) {
      const topics = [
        // Network topics
        "rpi/network/response",
        // WiFi topics
        "rpi/wifi/scan_response",
        "rpi/wifi/status/response",
        "rpi/wifi/connect_response",
        "rpi/wifi/disconnect_response",
        "rpi/wifi/delete_response",
        // MODBUS topics
        "IOT/Containment/modbustcp/setting/data",
        "IOT/Containment/modbustcp/status",
        // SNMP topics
        "IOT/Containment/snmp/setting/data",
        "IOT/Containment/snmp/status",
      ];

      topics.forEach((t) => subscribe(t, handleMqttMessage));

      // Request initial data
      publish("rpi/network/get", "{}");
      publish("rpi/wifi/status/get", "{}");
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

  // =================================================================
  // Handler Functions
  // =================================================================

  // --- Ethernet ---
  const handleConfigureEthernet = (config: IpConfig) => {
    const payload = JSON.stringify(config);
    publish("rpi/network/set", payload);
  };

  // --- WiFi ---
  const handleScanWiFi = () => {
    setIsScanningWiFi(true);
    publish("rpi/wifi/scan", "{}");
  };

  const handleConnectWiFi = (ssid: string, password?: string) => {
    const payload = JSON.stringify({ ssid, password });
    publish("rpi/wifi/connect", payload);
  };

  const handleDisconnectWiFi = () => {
    publish("rpi/wifi/disconnect", "{}");
  };

  const handleDeleteWiFi = (ssid: string) => {
    const payload = JSON.stringify({ ssid });
    publish("rpi/wifi/delete", payload);
  };

  // --- MODBUS ---
  const handleSaveModbus = () => {
    const payload = JSON.stringify({
      command: "write",
      modbus_tcp_ip: modbusSettings.modbusTCP_IP,
      modbus_tcp_port: Number(modbusSettings.modbusTCP_Port),
    });
    publish("IOT/Containment/modbustcp/setting/command", payload);
    Swal.fire({
      icon: "success",
      title: "Settings Sent",
      text: "MODBUS TCP settings have been sent to the device.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // --- SNMP ---
  const handleSaveSnmp = () => {
    const payload = JSON.stringify({ ...snmpSettings, command: "write" });
    publish("IOT/Containment/snmp/setting/command", payload);
    Swal.fire({
      icon: "success",
      title: "Settings Sent",
      text: "SNMP settings have been sent to the device.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // =================================================================
  // Render
  // =================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className=" p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Communication Setup
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure network, protocols, and connectivity settings
              </p>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">MQTT Connection:</span>{" "}
              {isReady ? (
                <Badge variant="default" className="ml-2">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-2">
                  Connecting...
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        </div>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-xl shadow-sm">
            <TabsTrigger
              value="ethernet"
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Cable className="h-4 w-4" />
              <span className="hidden sm:inline">Ethernet</span>
            </TabsTrigger>
            <TabsTrigger
              value="wifi"
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">WiFi</span>
            </TabsTrigger>
            <TabsTrigger
              value="modbus"
              className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Rss className="h-4 w-4" />
              <span className="hidden sm:inline">MODBUS</span>
            </TabsTrigger>
            <TabsTrigger
              value="snmp"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">SNMP</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Tab 1: Ethernet */}
            <TabsContent value="ethernet" className="p-6 m-0 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Cable className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    Ethernet Configuration
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure wired network interface (eth0)
                  </p>
                </div>
              </div>

              <EthernetSettingsCard
                networkConfig={networkConfig}
                isLoading={isLoadingNetwork}
                onConfigure={handleConfigureEthernet}
              />
            </TabsContent>

            {/* Tab 2: WiFi */}
            <TabsContent value="wifi" className="p-6 m-0 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Wifi className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">WiFi Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect and manage wireless networks
                  </p>
                </div>
              </div>

              <WiFiSettingsCard
                wifiNetworks={wifiNetworks}
                wifiStatus={wifiStatus}
                isLoading={isLoadingWiFi}
                isScanning={isScanningWiFi}
                onScan={handleScanWiFi}
                onConnect={handleConnectWiFi}
                onDisconnect={handleDisconnectWiFi}
                onDelete={handleDeleteWiFi}
              />
            </TabsContent>

            {/* Tab 3: MODBUS */}
            <TabsContent value="modbus" className="p-6 m-0 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Rss className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">MODBUS TCP Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure industrial communication protocol
                  </p>
                </div>
              </div>

              <ModbusSettingsCard
                settings={modbusSettings}
                status={modbusStatus}
                isLoading={isLoadingModbus}
                onSettingsChange={setModbusSettings}
                onSave={handleSaveModbus}
              />
            </TabsContent>

            {/* Tab 4: SNMP */}
            <TabsContent value="snmp" className="p-6 m-0 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">SNMP Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure network monitoring protocol
                  </p>
                </div>
              </div>

              <SnmpSettingsCard
                settings={snmpSettings}
                status={snmpStatus}
                isLoading={isLoadingSnmp}
                onSettingsChange={setSnmpSettings}
                onSave={handleSaveSnmp}
              />
            </TabsContent>
          </div>
        </Tabs>
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
