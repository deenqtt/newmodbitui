// File: app/(dashboard)/lo-ra-wan/ec25-modem/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Signal,
  Wifi,
  MapPin,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Smartphone,
  Globe,
  Satellite,
  Activity,
  Clock,
  Zap,
  Lock,
  Save,
} from "lucide-react";

import { getEc25ListenerService } from "@/lib/services/ec25-listener";
import { useMounted } from "@/hooks/useMounted";
import type {
  GSMData,
  GPSData,
  EC25Status,
  EC25Alert,
} from "@/lib/services/ec25-listener";

// Import components
import ModemOverview from "./components/ModemOverview";
import NetworkStatus from "./components/NetworkStatus";
import GPSTracker from "./components/GPSTracker";
import ConfigurationPanel from "./components/ConfigurationPanel";
import AlertsPanel from "./components/AlertsPanel";
import SystemHealth from "./components/SystemHealth";

export default function EC25ModemPage() {
  const mounted = useMounted();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  // Real data from MQTT
  const [gsmData, setGsmData] = useState<GSMData | null>(null);
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [statusData, setStatusData] = useState<EC25Status | null>(null);
  const [alerts, setAlerts] = useState<EC25Alert[]>([]);

  // SIM PIN Dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [simPin, setSimPin] = useState("");
  const [pinError, setPinError] = useState("");

  // APN Configuration Dialog
  const [showApnDialog, setShowApnDialog] = useState(false);
  const [apnConfig, setApnConfig] = useState({
    apn: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const ec25Service = getEc25ListenerService();

    // Subscribe to real-time updates
    const unsubscribeGsm = ec25Service.subscribe("gsm", (data: GSMData) => {
      setGsmData(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setIsConnected(true);
      setConnectionStatus("Connected");

      // Check for SIM PIN required
      if (data.status === "SIM PIN required") {
        setShowPinDialog(true);
      }
    });

    const unsubscribeGps = ec25Service.subscribe("gps", (data: GPSData) => {
      setGpsData(data);
    });

    const unsubscribeStatus = ec25Service.subscribe(
      "status",
      (data: EC25Status) => {
        setStatusData(data);
      }
    );

    const unsubscribeAlerts = ec25Service.subscribe(
      "alerts",
      (alert: EC25Alert) => {
        setAlerts((prev) => [alert, ...prev.slice(0, 99)]);

        // Show PIN dialog for SIM PIN alerts
        if (alert.type === "sim_pin_required") {
          setShowPinDialog(true);
        }
      }
    );

    // Connection status monitoring
    const checkConnection = () => {
      const connectionInfo = ec25Service.getConnectionStatus();
      if (!connectionInfo.connected) {
        setIsConnected(false);
        setConnectionStatus("Disconnected");
      }
    };

    const connectionInterval = setInterval(checkConnection, 5000);

    return () => {
      unsubscribeGsm();
      unsubscribeGps();
      unsubscribeStatus();
      unsubscribeAlerts();
      clearInterval(connectionInterval);
    };
  }, []);

  const handlePinSubmit = async () => {
    if (simPin.length !== 4 || !simPin.match(/^\d{4}$/)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }

    try {
      const ec25Service = getEc25ListenerService();
      await ec25Service.sendCommand({
        type: "set_sim_pin",
        data: { pin: simPin },
      });

      setShowPinDialog(false);
      setSimPin("");
      setPinError("");

      // Show success alert
      setAlerts((prev) => [
        {
          timestamp: new Date().toISOString(),
          type: "sim_pin_set",
          message: "SIM PIN entered successfully. Modem is restarting...",
          severity: "info",
        },
        ...prev,
      ]);
    } catch (error) {
      setPinError("Failed to set PIN. Please try again.");
    }
  };

  const handleApnSave = async () => {
    if (!apnConfig.apn.trim()) {
      return;
    }

    try {
      const ec25Service = getEc25ListenerService();
      await ec25Service.sendCommand({
        type: "set_apn",
        data: apnConfig,
      });

      setShowApnDialog(false);

      // Show success alert
      setAlerts((prev) => [
        {
          timestamp: new Date().toISOString(),
          type: "apn_updated",
          message: `APN updated to ${apnConfig.apn}. Modem is restarting...`,
          severity: "info",
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Failed to update APN:", error);
    }
  };

  const restartModem = async () => {
    try {
      const ec25Service = getEc25ListenerService();
      await ec25Service.sendCommand({
        type: "restart_modem",
        data: {},
      });

      setAlerts((prev) => [
        {
          timestamp: new Date().toISOString(),
          type: "modem_restart",
          message: "Modem restart command sent",
          severity: "info",
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Failed to restart modem:", error);
    }
  };

  // Current data or default values
  const currentData = {
    gsm: gsmData || {
      connected: false,
      status: "initializing",
      modem: {
        manufacturer: "Unknown",
        model: "Unknown",
        revision: "Unknown",
        imei: "Unknown",
      },
      network: {
        operator: "Unknown",
        registration_status: "Not registered",
        network_type: "Unknown",
        signal_strength: -113,
        signal_quality: 0,
      },
      apn: {
        name: "",
        username: "",
      },
    },
    gps: gpsData || {
      fix_status: "No Fix",
      latitude: 0,
      longitude: 0,
      altitude: 0,
      speed: 0,
      satellites: 0,
      gps_timestamp: mounted ? new Date().toLocaleTimeString() : "--:--:--",
    },
    status: statusData || {
      status: "initializing",
      uptime: 0,
      timestamp: mounted ? new Date().toISOString() : new Date(0).toISOString(),
      service_id: "",
    },
  };

  const getStatusColor = () => {
    if (!isConnected) return "bg-red-500";
    if (gsmData?.connected) return "bg-green-500";
    return "bg-yellow-500";
  };

  const getSignalStrength = () => {
    const strength = gsmData?.network?.signal_strength || -113;
    if (strength >= -70) return "Excellent";
    if (strength >= -85) return "Good";
    if (strength >= -100) return "Fair";
    return "Poor";
  };

  const getSignalBars = () => {
    const strength = gsmData?.network?.signal_strength || -113;
    if (strength >= -70) return 4;
    if (strength >= -85) return 3;
    if (strength >= -100) return 2;
    return 1;
  };

  // Load current APN when dialog opens
  useEffect(() => {
    if (showApnDialog && gsmData?.apn) {
      setApnConfig({
        apn: gsmData.apn.name || "",
        username: gsmData.apn.username || "",
        password: "",
      });
    }
  }, [showApnDialog, gsmData]);

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              EC25 Modem Monitor
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Real-time monitoring and configuration for Quectel EC25 cellular
              modem
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {connectionStatus}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {mounted ? `Last update: ${lastUpdate}` : "Last update: --:--:--"}
            </div>
            <Button
              onClick={() => setShowApnDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="w-4 h-4 mr-1" />
              APN
            </Button>
          </div>
        </div>

        {/* Quick Status Cards with Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Network</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {currentData.gsm.network.operator}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-full ${
                    currentData.gsm.connected ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  <Smartphone
                    className={`w-5 h-5 ${
                      currentData.gsm.connected
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    currentData.gsm.connected ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {currentData.gsm.network.registration_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Signal</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {currentData.gsm.network.signal_strength} dBm
                  </p>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-4 rounded-full ${
                        bar <= getSignalBars() ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Badge
                  variant={getSignalBars() >= 3 ? "default" : "outline"}
                  className="text-xs"
                >
                  {getSignalStrength()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    GPS Status
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {currentData.gps.satellites} Satellites
                  </p>
                </div>
                <div
                  className={`p-2 rounded-full ${
                    currentData.gps.fix_status === "GPS Fix"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-yellow-100 dark:bg-yellow-900/30"
                  }`}
                >
                  <Satellite
                    className={`w-5 h-5 ${
                      currentData.gps.fix_status === "GPS Fix"
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    currentData.gps.fix_status === "GPS Fix"
                      ? "default"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {currentData.gps.fix_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Uptime</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {Math.floor(currentData.status.uptime / 3600)}h{" "}
                    {Math.floor((currentData.status.uptime % 3600) / 60)}m
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Badge variant="outline" className="text-xs">
                  {currentData.status.status.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Alert */}
      {!isConnected && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/30">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            Connecting to EC25 modem service via MQTT...
          </AlertDescription>
        </Alert>
      )}

      {/* SIM PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2 text-red-600" />
              SIM PIN Required
            </DialogTitle>
            <DialogDescription>
              Your SIM card is locked. Please enter the 4-digit PIN to unlock
              it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                value={simPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    setSimPin(value);
                    setPinError("");
                  }
                }}
                className="font-mono text-center text-lg tracking-widest"
              />
              {pinError && <p className="text-sm text-red-600">{pinError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handlePinSubmit}
              disabled={simPin.length !== 4}
              className="w-full"
            >
              Unlock SIM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APN Configuration Dialog */}
      <Dialog open={showApnDialog} onOpenChange={setShowApnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-600" />
              APN Configuration
            </DialogTitle>
            <DialogDescription>
              Configure APN settings for data connection. Modem will restart
              after changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apn">APN Name *</Label>
              <Input
                id="apn"
                placeholder="e.g., internet, data"
                value={apnConfig.apn}
                onChange={(e) =>
                  setApnConfig((prev) => ({ ...prev, apn: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Leave empty if not required"
                value={apnConfig.username}
                onChange={(e) =>
                  setApnConfig((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave empty if not required"
                value={apnConfig.password}
                onChange={(e) =>
                  setApnConfig((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowApnDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApnSave}
              disabled={!apnConfig.apn.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Restart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center space-x-2">
            <Signal className="w-4 h-4" />
            <span>Network</span>
          </TabsTrigger>
          <TabsTrigger value="gps" className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>GPS</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Config</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Health</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ModemOverview data={currentData} isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <NetworkStatus data={currentData.gsm} isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="gps" className="space-y-6">
          <GPSTracker data={currentData.gps} isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <ConfigurationPanel
            currentConfig={currentData.gsm}
            isConnected={isConnected}
            onRestartModem={restartModem}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsPanel alerts={alerts} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <SystemHealth
            status={currentData.status}
            connectionStatus={{
              connected: isConnected,
              lastHeartbeat: new Date().toISOString(),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
