// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/ConfigurationPanel.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Wifi,
  Smartphone,
  Shield,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Globe,
  Power,
  RotateCcw,
} from "lucide-react";

import { getEc25ListenerService } from "@/lib/services/ec25-listener";

interface ConfigurationPanelProps {
  currentConfig: any;
  isConnected: boolean;
  onRestartModem?: () => void;
}

export default function ConfigurationPanel({
  currentConfig,
  isConnected,
  onRestartModem,
}: ConfigurationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string>("");

  // APN Configuration State
  const [apnConfig, setApnConfig] = useState({
    apn: currentConfig?.apn?.name || "",
    username: currentConfig?.apn?.username || "",
    password: "",
  });

  // SIM Configuration State
  const [simConfig, setSimConfig] = useState({
    pin: "",
  });

  // Advanced Settings State
  const [advancedSettings, setAdvancedSettings] = useState({
    gpsEnabled: true,
    refreshInterval: 15,
    autoReconnect: true,
    signalThreshold: -100,
    dataUpdateOnly: true,
  });

  const sendCommand = async (command: any, actionName: string = "Command") => {
    setIsLoading(true);
    setLoadingAction(actionName);
    try {
      const ec25Service = getEc25ListenerService();
      await ec25Service.sendCommand(command);

      const mockResponse = {
        status: "success",
        message: `${actionName} executed successfully`,
        command: command.type,
      };

      setLastResponse(mockResponse);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      setLastResponse({
        status: "error",
        message: `Failed to execute ${actionName}`,
        error: error,
      });
    } finally {
      setIsLoading(false);
      setLoadingAction("");
    }
  };

  const handleSetAPN = async () => {
    if (!apnConfig.apn.trim()) {
      alert("APN name is required");
      return;
    }

    await sendCommand(
      {
        type: "set_apn",
        data: {
          apn: apnConfig.apn,
          username: apnConfig.username,
          password: apnConfig.password,
        },
      },
      "APN Configuration"
    );
  };

  const handleSetSIMPin = async () => {
    if (!simConfig.pin.trim() || simConfig.pin.length !== 4) {
      alert("PIN must be exactly 4 digits");
      return;
    }

    await sendCommand(
      {
        type: "set_sim_pin",
        data: {
          pin: simConfig.pin,
        },
      },
      "SIM PIN"
    );

    // Clear PIN from form for security
    setSimConfig({ pin: "" });
  };

  const handleRestartModem = async () => {
    if (
      confirm(
        "Are you sure you want to restart the modem? This will temporarily interrupt connectivity."
      )
    ) {
      await sendCommand(
        {
          type: "restart_modem",
          data: {},
        },
        "Modem Restart"
      );

      if (onRestartModem) {
        onRestartModem();
      }
    }
  };

  const handleSoftReboot = async () => {
    if (
      confirm("This will perform a software reboot of the modem. Continue?")
    ) {
      await sendCommand(
        {
          type: "soft_reboot",
          data: {},
        },
        "Soft Reboot"
      );
    }
  };

  const handleHardReset = async () => {
    if (
      confirm(
        "This will perform a hard reset and restore factory settings. This action cannot be undone. Continue?"
      )
    ) {
      await sendCommand(
        {
          type: "factory_reset",
          data: {},
        },
        "Factory Reset"
      );
    }
  };

  const handleTestInternet = async () => {
    await sendCommand(
      {
        type: "test_internet",
        data: {},
      },
      "Internet Connection Test"
    );
  };

  const handleGetDetailedStatus = async () => {
    await sendCommand(
      {
        type: "get_detailed_status",
        data: {},
      },
      "Detailed Status Check"
    );
  };

  const handleSaveAdvancedSettings = async () => {
    await sendCommand(
      {
        type: "update_config",
        data: advancedSettings,
      },
      "Advanced Settings Update"
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Configuration changes are disabled while disconnected from modem
            service.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {lastResponse?.message} The changes will take effect shortly.
          </AlertDescription>
        </Alert>
      )}

      {/* Last Response */}
      {lastResponse && !showSuccess && (
        <Alert
          className={`border-${
            lastResponse.status === "success" ? "green" : "red"
          }-200 bg-${lastResponse.status === "success" ? "green" : "red"}-50`}
        >
          <AlertDescription
            className={`text-${
              lastResponse.status === "success" ? "green" : "red"
            }-800`}
          >
            <strong>{lastResponse.command}:</strong> {lastResponse.message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="network" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-sm">
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="sim">SIM Card</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Network Configuration */}
        <TabsContent value="network">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                APN Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apn">APN Name *</Label>
                  <Input
                    id="apn"
                    placeholder="e.g., internet, telkomsel, xl"
                    value={apnConfig.apn}
                    onChange={(e) =>
                      setApnConfig((prev) => ({ ...prev, apn: e.target.value }))
                    }
                    disabled={!isConnected || isLoading}
                  />
                  <p className="text-xs text-slate-600">
                    Common APNs: internet, telkomsel, indosatooredo, 3gprs
                  </p>
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
                    disabled={!isConnected || isLoading}
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
                    disabled={!isConnected || isLoading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Current APN
                  </p>
                  <p className="text-sm text-slate-600">
                    {currentConfig?.apn?.name || "Not configured"}
                  </p>
                </div>
                <Button
                  onClick={handleSetAPN}
                  disabled={!isConnected || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading && loadingAction === "APN Configuration" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Apply APN Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SIM Configuration */}
        <TabsContent value="sim">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                SIM Card Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Enter your SIM PIN only if the SIM card is locked. The PIN
                  will be saved securely and used for automatic unlocking.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="simPin">SIM PIN</Label>
                  <Input
                    id="simPin"
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    value={simConfig.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // Only digits
                      if (value.length <= 4) {
                        setSimConfig({ pin: value });
                      }
                    }}
                    disabled={!isConnected || isLoading}
                    className="font-mono text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-slate-600">
                    PIN must be exactly 4 digits
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      SIM Status
                    </p>
                    <Badge variant="default" className="mt-1">
                      Ready
                    </Badge>
                  </div>
                  <Button
                    onClick={handleSetSIMPin}
                    disabled={
                      !isConnected || isLoading || simConfig.pin.length !== 4
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading && loadingAction === "SIM PIN" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Set PIN & Unlock
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
                <Settings className="w-5 h-5 mr-2 text-purple-600" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        GPS Tracking
                      </Label>
                      <p className="text-xs text-slate-600">
                        Enable GPS location tracking
                      </p>
                    </div>
                    <Switch
                      checked={advancedSettings.gpsEnabled}
                      onCheckedChange={(checked) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          gpsEnabled: checked,
                        }))
                      }
                      disabled={!isConnected}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        Auto Reconnect
                      </Label>
                      <p className="text-xs text-slate-600">
                        Automatically reconnect if connection lost
                      </p>
                    </div>
                    <Switch
                      checked={advancedSettings.autoReconnect}
                      onCheckedChange={(checked) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          autoReconnect: checked,
                        }))
                      }
                      disabled={!isConnected}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        Data Update Only
                      </Label>
                      <p className="text-xs text-slate-600">
                        Send MQTT updates only when data changes
                      </p>
                    </div>
                    <Switch
                      checked={advancedSettings.dataUpdateOnly}
                      onCheckedChange={(checked) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          dataUpdateOnly: checked,
                        }))
                      }
                      disabled={!isConnected}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">
                      Refresh Interval (seconds)
                    </Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="5"
                      max="300"
                      value={advancedSettings.refreshInterval}
                      onChange={(e) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          refreshInterval: parseInt(e.target.value) || 15,
                        }))
                      }
                      disabled={!isConnected}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signalThreshold">
                      Signal Alert Threshold (dBm)
                    </Label>
                    <Input
                      id="signalThreshold"
                      type="number"
                      min="-120"
                      max="-50"
                      value={advancedSettings.signalThreshold}
                      onChange={(e) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          signalThreshold: parseInt(e.target.value) || -100,
                        }))
                      }
                      disabled={!isConnected}
                    />
                    <p className="text-xs text-slate-600">
                      Alert when signal strength falls below this value
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  onClick={handleSaveAdvancedSettings}
                  disabled={!isConnected || isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading && loadingAction === "Advanced Settings Update" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
                <RefreshCw className="w-5 h-5 mr-2 text-orange-600" />
                System Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={handleTestInternet}
                  disabled={!isConnected || isLoading}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  {isLoading && loadingAction === "Internet Connection Test" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Wifi className="w-6 h-6" />
                  )}
                  <span>Test Internet</span>
                </Button>

                <Button
                  onClick={handleGetDetailedStatus}
                  disabled={!isConnected || isLoading}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  {isLoading && loadingAction === "Detailed Status Check" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Smartphone className="w-6 h-6" />
                  )}
                  <span>Get Status</span>
                </Button>

                <Button
                  onClick={handleSoftReboot}
                  disabled={!isConnected || isLoading}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  {isLoading && loadingAction === "Soft Reboot" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <RotateCcw className="w-6 h-6" />
                  )}
                  <span>Soft Reboot</span>
                </Button>

                <Button
                  onClick={handleRestartModem}
                  disabled={!isConnected || isLoading}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-orange-200 hover:bg-orange-50"
                >
                  {isLoading && loadingAction === "Modem Restart" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <RefreshCw className="w-6 h-6 text-orange-600" />
                  )}
                  <span>Restart Modem</span>
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  disabled={isLoading}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Power className="w-6 h-6" />
                  <span>Reload Page</span>
                </Button>

                <Button
                  onClick={handleHardReset}
                  disabled={!isConnected || isLoading}
                  variant="destructive"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  {isLoading && loadingAction === "Factory Reset" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                  <span>Factory Reset</span>
                </Button>
              </div>

              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Action Differences:</strong>
                  <br />• <strong>Soft Reboot:</strong> Quick restart of modem
                  service only
                  <br />• <strong>Restart Modem:</strong> Full modem restart
                  with AT commands
                  <br />• <strong>Factory Reset:</strong> Restores all settings
                  to default (irreversible)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
