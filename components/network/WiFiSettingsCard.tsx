// File: components/network/WiFiSettingsCard.tsx
"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  WifiOff,
  Loader2,
  Lock,
  LockOpen,
  Signal,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Globe,
  Radio,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface WiFiSettingsCardProps {
  wifiNetworks: WiFiNetwork[];
  wifiStatus: WiFiStatus | null;
  isLoading: boolean;
  isScanning: boolean;
  onScan: () => void;
  onConnect: (ssid: string, password?: string) => void;
  onDisconnect: () => void;
  onDelete: (ssid: string) => void;
  onRefresh?: () => void;
}

export function WiFiSettingsCard({
  wifiNetworks,
  wifiStatus,
  isLoading,
  isScanning,
  onScan,
  onConnect,
  onDisconnect,
  onDelete,
  onRefresh,
}: WiFiSettingsCardProps) {
  // Console logs untuk debugging
  useEffect(() => {
    console.log("📡 [WiFiCard] WiFi Status Received:", wifiStatus);
  }, [wifiStatus]);

  useEffect(() => {
    console.log("📶 [WiFiCard] WiFi Networks Received:", wifiNetworks);
  }, [wifiNetworks]);

  const handleConnect = async (network: WiFiNetwork) => {
    console.log("🔗 [WiFiCard] Connect clicked for:", network.ssid);

    const hasPassword = network.security && network.security.trim() !== "";

    if (hasPassword) {
      const { value: password, isConfirmed } = await Swal.fire({
        title: `Connect to ${network.ssid}`,
        html: `
          <div class="space-y-3">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span class="px-2 py-1 bg-blue-100 rounded-md font-medium">${network.security}</span>
              <span>•</span>
              <span>Signal: ${network.signal}%</span>
            </div>
          </div>
        `,
        input: "password",
        inputLabel: "WiFi Password",
        inputPlaceholder: "Enter network password",
        showCancelButton: true,
        confirmButtonText: "Connect",
        confirmButtonColor: "#3b82f6",
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (!value) {
            return "Password is required!";
          }
          if (value.length < 8) {
            return "Password must be at least 8 characters!";
          }
        },
      });

      if (isConfirmed && password) {
        console.log("📤 [WiFiCard] Connecting with password to:", network.ssid);
        onConnect(network.ssid, password);
      } else {
        console.log("❌ [WiFiCard] Connection cancelled by user");
      }
    } else {
      // Open network
      console.log("📤 [WiFiCard] Connecting to open network:", network.ssid);
      onConnect(network.ssid);
    }
  };

  const handleDisconnect = () => {
    console.log("🔌 [WiFiCard] Disconnect clicked");

    Swal.fire({
      title: "Disconnect WiFi?",
      text: "Are you sure you want to disconnect from the current network?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, disconnect",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("📤 [WiFiCard] Disconnecting...");
        onDisconnect();
      } else {
        console.log("❌ [WiFiCard] Disconnect cancelled");
      }
    });
  };

  const handleDelete = (ssid: string) => {
    console.log("🗑️ [WiFiCard] Delete clicked for:", ssid);

    Swal.fire({
      title: "Delete WiFi Network?",
      html: `
        <div class="space-y-2">
          <p>Are you sure you want to delete <strong>"${ssid}"</strong>?</p>
          <p class="text-sm text-gray-600">This will remove the saved network and its password.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("📤 [WiFiCard] Deleting network:", ssid);
        onDelete(ssid);
      } else {
        console.log("❌ [WiFiCard] Delete cancelled");
      }
    });
  };

  const handleScan = () => {
    console.log("🔍 [WiFiCard] Scan WiFi clicked");
    onScan();
  };

  const handleRefresh = () => {
    console.log("🔄 [WiFiCard] Manual refresh triggered");
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get signal strength icon and color
  const getSignalInfo = (signal: string) => {
    const signalNum = parseInt(signal);
    if (signalNum >= 70) {
      return {
        icon: <Signal className="h-4 w-4" />,
        color: "text-green-500",
        badge: "Excellent",
        badgeColor:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      };
    }
    if (signalNum >= 50) {
      return {
        icon: <Signal className="h-4 w-4" />,
        color: "text-yellow-500",
        badge: "Good",
        badgeColor:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      };
    }
    return {
      icon: <Signal className="h-4 w-4" />,
      color: "text-red-500",
      badge: "Weak",
      badgeColor:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  };

  // Get connection status
  const getConnectionStatus = () => {
    if (!wifiStatus) {
      return {
        variant: "secondary" as const,
        icon: <AlertCircle className="h-4 w-4" />,
        text: "Unknown",
        color: "text-gray-500",
      };
    }

    if (wifiStatus.connected && wifiStatus.current_network) {
      return {
        variant: "default" as const,
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: "Connected",
        color: "text-green-600 dark:text-green-400",
      };
    }

    return {
      variant: "destructive" as const,
      icon: <XCircle className="h-4 w-4" />,
      text: "Disconnected",
      color: "text-red-600 dark:text-red-400",
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <Wifi className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">WiFi Configuration</CardTitle>
              <CardDescription className="text-sm mt-1">
                Connect and manage wireless networks
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30">
          <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-sm text-purple-700 dark:text-purple-300">
            Scan for available networks and connect to your preferred WiFi.
            Saved networks will reconnect automatically.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current WiFi Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Current Connection
            </Label>
            <Badge variant={connectionStatus.variant} className="gap-1.5">
              {connectionStatus.icon}
              {connectionStatus.text}
            </Badge>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-4/5" />
              </div>
            ) : wifiStatus?.connected && wifiStatus.current_network ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Network Name (SSID)
                    </span>
                    <p className="text-base font-semibold flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-purple-500" />
                      {wifiStatus.current_network.ssid}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      IP Address
                    </span>
                    <p className="text-sm font-mono font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      {wifiStatus.current_network.ip_address || "Obtaining..."}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Signal Strength
                    </span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const signalInfo = getSignalInfo(
                          wifiStatus.current_network.signal_strength || "0"
                        );
                        return (
                          <>
                            <span className={signalInfo.color}>
                              {signalInfo.icon}
                            </span>
                            <span className="text-sm font-semibold">
                              {wifiStatus.current_network.signal_strength}%
                            </span>
                            <Badge
                              variant="outline"
                              className={signalInfo.badgeColor}
                            >
                              {signalInfo.badge}
                            </Badge>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Device State
                    </span>
                    <p className="text-sm">
                      <Badge variant="default">
                        {wifiStatus.device_state || "Connected"}
                      </Badge>
                    </p>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  className="w-full md:w-auto gap-2"
                >
                  <WifiOff className="h-4 w-4" />
                  Disconnect from Network
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <WifiOff className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Not connected to any WiFi network
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scan and select a network below to connect
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Available Networks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Available Networks
              {wifiNetworks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {wifiNetworks.length}
                </Badge>
              )}
            </Label>
            <Button
              variant="default"
              size="sm"
              onClick={handleScan}
              disabled={isScanning}
              className="gap-2 bg-purple-500 hover:bg-purple-600"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isScanning ? "Scanning..." : "Scan Networks"}
            </Button>
          </div>

          {/* Networks Table */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
            {isScanning ? (
              <div className="p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-sm font-medium">Scanning for networks...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take a few seconds
                </p>
              </div>
            ) : wifiNetworks.length === 0 ? (
              <div className="p-12 text-center">
                <Wifi className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  No networks found
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click "Scan Networks" to search for available WiFi
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScan}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan Now
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                    <TableHead className="font-semibold">
                      Network Name
                    </TableHead>
                    <TableHead className="font-semibold">Security</TableHead>
                    <TableHead className="font-semibold">Signal</TableHead>
                    <TableHead className="font-semibold">Frequency</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wifiNetworks.map((network, index) => {
                    const signalInfo = getSignalInfo(network.signal);
                    return (
                      <TableRow
                        key={`${network.ssid}-${index}`}
                        className={
                          network.is_current
                            ? "bg-purple-50 dark:bg-purple-950/20"
                            : ""
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-purple-500" />
                            <span>{network.ssid}</span>
                            {network.is_current && (
                              <Badge
                                variant="default"
                                className="text-xs bg-purple-500"
                              >
                                Current
                              </Badge>
                            )}
                            {network.is_saved && !network.is_current && (
                              <Badge variant="outline" className="text-xs">
                                Saved
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {network.security &&
                            network.security.trim() !== "" ? (
                              <>
                                <Lock className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs font-medium">
                                  {network.security}
                                </span>
                              </>
                            ) : (
                              <>
                                <LockOpen className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-xs font-medium text-green-600">
                                  Open
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <span className={signalInfo.color}>
                                    {signalInfo.icon}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {network.signal}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {signalInfo.badge} Signal
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {network.frequency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!network.is_current && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleConnect(network)}
                                className="gap-1.5 bg-purple-500 hover:bg-purple-600"
                              >
                                <Wifi className="h-3.5 w-3.5" />
                                Connect
                              </Button>
                            )}
                            {network.is_saved && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(network.ssid)}
                                      className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Delete saved network
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Saved Networks Info */}
        {wifiStatus && wifiStatus.saved_networks.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Saved Networks:</strong> You have{" "}
              {wifiStatus.saved_networks.length} saved network(s). They will
              reconnect automatically when in range.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
