// File: components/network/EthernetSettingsCard.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Network,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cable,
  Settings2,
  Info,
} from "lucide-react";

interface IpConfig {
  interface: string;
  method: "static" | "dhcp";
  static_ip?: string;
  netmask?: string;
  gateway?: string;
  dns?: string;
}

interface NetworkConfig {
  eth0?: {
    state?: string;
    connection?: string;
    type?: string;
    method?: string;
    address?: string;
    cidr?: string;
    netmask?: string;
    gateway?: string;
    "dns-nameservers"?: string;
    current_address?: string;
    device_state?: string;
  };
}

interface EthernetSettingsCardProps {
  networkConfig: NetworkConfig | null;
  isLoading: boolean;
  onConfigure: (config: IpConfig) => void;
  onRefresh?: () => void;
}

export function EthernetSettingsCard({
  networkConfig,
  isLoading,
  onConfigure,
  onRefresh,
}: EthernetSettingsCardProps) {
  const [config, setConfig] = useState<IpConfig>({
    interface: "eth0",
    method: "static",
    static_ip: "",
    netmask: "255.255.255.0",
    gateway: "",
    dns: "8.8.8.8 8.8.4.4",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Console log untuk debugging
  useEffect(() => {
    console.log("🔌 [EthernetCard] Network Config Received:", networkConfig);
  }, [networkConfig]);

  // Load config dari network config yang diterima
  useEffect(() => {
    if (networkConfig?.eth0) {
      const eth0 = networkConfig.eth0;
      console.log("📥 [EthernetCard] Loading eth0 config:", eth0);

      const newConfig: IpConfig = {
        interface: "eth0",
        method: (eth0.method as "static" | "dhcp") || "dhcp",
        static_ip: eth0.address || "",
        netmask: eth0.netmask || "255.255.255.0",
        gateway: eth0.gateway || "",
        dns: eth0["dns-nameservers"] || "8.8.8.8 8.8.4.4",
      };

      console.log("✅ [EthernetCard] New config set:", newConfig);
      setConfig(newConfig);
    }
  }, [networkConfig]);

  const handleInputChange = (field: keyof IpConfig, value: string) => {
    console.log(`📝 [EthernetCard] Field changed: ${field} = ${value}`);
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    console.log("🚀 [EthernetCard] Submit clicked with config:", config);

    // Validation
    if (config.method === "static") {
      if (!config.static_ip) {
        Swal.fire({
          icon: "warning",
          title: "Missing IP Address",
          text: "Please enter a valid IP address for static configuration.",
        });
        console.warn("⚠️ [EthernetCard] Validation failed: Missing IP");
        return;
      }
      if (!config.netmask) {
        Swal.fire({
          icon: "warning",
          title: "Missing Netmask",
          text: "Please enter a valid netmask.",
        });
        console.warn("⚠️ [EthernetCard] Validation failed: Missing Netmask");
        return;
      }
      if (!config.gateway) {
        Swal.fire({
          icon: "warning",
          title: "Missing Gateway",
          text: "Please enter a valid gateway address.",
        });
        console.warn("⚠️ [EthernetCard] Validation failed: Missing Gateway");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: IpConfig = {
        interface: config.interface,
        method: config.method,
      };

      if (config.method === "static") {
        payload.static_ip = config.static_ip;
        payload.netmask = config.netmask;
        payload.gateway = config.gateway;
        payload.dns = config.dns;
      }

      console.log("📤 [EthernetCard] Sending payload:", payload);
      onConfigure(payload);

      // Show loading alert
      Swal.fire({
        title: "Applying Configuration...",
        text: "Please wait while the network configuration is being applied.",
        icon: "info",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });
    } catch (error) {
      console.error("❌ [EthernetCard] Submit error:", error);
      Swal.fire({
        icon: "error",
        title: "Configuration Failed",
        text: "An error occurred while applying the configuration.",
      });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        console.log("✅ [EthernetCard] Submit completed");
      }, 2000);
    }
  };

  const handleRefresh = () => {
    console.log("🔄 [EthernetCard] Manual refresh triggered");
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get connection status info
  const getConnectionStatus = () => {
    if (!networkConfig?.eth0) {
      return {
        variant: "secondary" as const,
        icon: <AlertCircle className="h-4 w-4" />,
        text: "Unknown",
        color: "text-gray-500",
      };
    }

    const state = networkConfig.eth0.state?.toLowerCase();

    if (state === "connected") {
      return {
        variant: "default" as const,
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: "Connected",
        color: "text-green-600 dark:text-green-400",
      };
    } else if (state === "disconnected" || state === "unavailable") {
      return {
        variant: "destructive" as const,
        icon: <XCircle className="h-4 w-4" />,
        text: "Disconnected",
        color: "text-red-600 dark:text-red-400",
      };
    } else {
      return {
        variant: "secondary" as const,
        icon: <AlertCircle className="h-4 w-4" />,
        text: state || "Unknown",
        color: "text-yellow-600 dark:text-yellow-400",
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Cable className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Ethernet Configuration</CardTitle>
              <CardDescription className="text-sm mt-1">
                Configure wired network interface (eth0)
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
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
            Changes will be applied immediately. Make sure you have physical or
            remote console access before changing network settings.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Network Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Network className="h-4 w-4" />
              Current Status
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
            ) : networkConfig?.eth0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Connection Method
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        networkConfig.eth0.method === "static"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {networkConfig.eth0.method?.toUpperCase() || "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Connection Name
                  </span>
                  <p className="text-sm font-mono">
                    {networkConfig.eth0.connection || "N/A"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    IP Address
                  </span>
                  <p className="text-sm font-mono font-semibold">
                    {networkConfig.eth0.current_address ||
                      networkConfig.eth0.address ||
                      "Not assigned"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Netmask
                  </span>
                  <p className="text-sm font-mono">
                    {networkConfig.eth0.netmask || "N/A"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Gateway
                  </span>
                  <p className="text-sm font-mono">
                    {networkConfig.eth0.gateway || "N/A"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    DNS Servers
                  </span>
                  <p className="text-sm font-mono">
                    {networkConfig.eth0["dns-nameservers"] || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  No ethernet interface detected or data not available.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Configuration Form */}
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Network Configuration
          </Label>

          <div className="grid grid-cols-1 gap-6">
            {/* Connection Method */}
            <div className="space-y-2">
              <Label htmlFor="method" className="font-medium">
                Connection Method
              </Label>
              <Select
                value={config.method}
                onValueChange={(val: "static" | "dhcp") =>
                  handleInputChange("method", val)
                }
              >
                <SelectTrigger id="method" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      <span>Static IP (Manual)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dhcp">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>DHCP (Automatic)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.method === "static"
                  ? "Configure network settings manually"
                  : "Obtain network settings automatically from DHCP server"}
              </p>
            </div>

            {/* Static IP Fields */}
            {config.method === "static" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="static_ip" className="font-medium">
                      IP Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="static_ip"
                      value={config.static_ip}
                      onChange={(e) =>
                        handleInputChange("static_ip", e.target.value)
                      }
                      placeholder="e.g., 192.168.0.100"
                      className="h-11 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="netmask" className="font-medium">
                      Netmask <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="netmask"
                      value={config.netmask}
                      onChange={(e) =>
                        handleInputChange("netmask", e.target.value)
                      }
                      placeholder="e.g., 255.255.255.0"
                      className="h-11 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gateway" className="font-medium">
                      Gateway <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="gateway"
                      value={config.gateway}
                      onChange={(e) =>
                        handleInputChange("gateway", e.target.value)
                      }
                      placeholder="e.g., 192.168.0.1"
                      className="h-11 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dns" className="font-medium">
                      DNS Servers
                    </Label>
                    <Input
                      id="dns"
                      value={config.dns}
                      onChange={(e) => handleInputChange("dns", e.target.value)}
                      placeholder="e.g., 8.8.8.8 8.8.4.4"
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple DNS servers with spaces
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* DHCP Info */}
            {config.method === "dhcp" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                  <strong>DHCP Mode:</strong> Network settings will be obtained
                  automatically from your DHCP server. No manual configuration
                  required.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3 pt-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
          className="flex-1 h-11 gap-2"
          size="lg"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Applying..." : "Apply Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
