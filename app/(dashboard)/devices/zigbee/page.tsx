// File: app/(dashboard)/zigbee/page.tsx - Modern Clean Layout
"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  Thermometer,
  Droplets,
  DoorOpen,
  Eye,
  Wifi,
  WifiOff,
  RefreshCcw,
  Settings,
  Package,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Zap,
  Activity,
  AlertTriangle,
  Power,
  Battery,
  Signal,
  Router,
  Search,
  HardDrive,
  Network,
} from "lucide-react";

interface ZigbeeDevice {
  id: string;
  deviceId: string;
  friendlyName: string;
  deviceType: string;
  manufacturer?: string;
  modelId?: string;
  capabilities: any;
  lastSeen?: string;
  isOnline: boolean;
  currentState?: any;
  createdAt: string;
  updatedAt: string;
}

interface EditDeviceData {
  friendlyName: string;
  deviceType: string;
  manufacturer: string;
  modelId: string;
}

export default function ZigbeePage() {
  const [devices, setDevices] = useState<ZigbeeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ZigbeeDevice | null>(null);
  const [editData, setEditData] = useState<EditDeviceData>({
    friendlyName: "",
    deviceType: "",
    manufacturer: "",
    modelId: "",
  });
  const [pairingMode, setPairingMode] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pairingCountdown, setPairingCountdown] = useState<number>(0);
  const [pairingInterval, setPairingInterval] = useState<NodeJS.Timer | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<ZigbeeDevice | null>(
    null
  );
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  // Filter devices based on search term
  const filteredDevices = devices.filter(
    (device) =>
      device.friendlyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.modelId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom SweetAlert2 configuration
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  // Enhanced delete with SweetAlert2 confirmation
  const confirmDelete = async (device: ZigbeeDevice) => {
    const result = await Swal.fire({
      title: `Remove ${device.friendlyName}?`,
      html: `
        <div class="text-left space-y-3">
          <p><strong>Device:</strong> ${device.friendlyName}</p>
          <p><strong>Type:</strong> ${device.deviceType.replace("_", " ")}</p>
          <p><strong>ID:</strong> <code class="bg-gray-100 px-2 py-1 rounded">${
            device.deviceId
          }</code></p>
          
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p class="text-sm"><strong>Choose removal method:</strong></p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      showConfirmButton: true,
      confirmButtonText: "Smart Remove",
      confirmButtonColor: "#10b981",
      denyButtonText: "Force Remove",
      denyButtonColor: "#f59e0b",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal-wide",
        htmlContainer: "text-left",
      },
      footer: `
        <div class="text-xs text-gray-500 mt-2">
          <p><strong>Smart:</strong> Try normal → force → database removal</p>
          <p><strong>Force:</strong> Skip to force removal immediately</p>
        </div>
      `,
    });

    if (result.isConfirmed) {
      removeDevice(device, "smart");
    } else if (result.isDenied) {
      removeDevice(device, "force");
    }
  };

  // Enhanced rename with SweetAlert2 input
  const confirmRename = async (device: ZigbeeDevice) => {
    const { value: newName } = await Swal.fire({
      title: "Rename Device",
      html: `
        <div class="text-left mb-4">
          <p><strong>Current name:</strong> ${device.friendlyName}</p>
          <p class="text-sm text-gray-600">Enter new friendly name:</p>
        </div>
      `,
      input: "text",
      inputValue: device.friendlyName,
      inputPlaceholder: "Enter new device name",
      showCancelButton: true,
      confirmButtonText: "Rename",
      confirmButtonColor: "#3b82f6",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Device name cannot be empty";
        }
        if (value === device.friendlyName) {
          return "Name must be different from current name";
        }
      },
    });

    if (newName) {
      renameDevice(device, newName.trim());
    }
  };

  // Remove device function
  const removeDevice = async (
    device: ZigbeeDevice,
    method: "smart" | "force" | "database-only" = "smart"
  ) => {
    Swal.fire({
      title: "Removing Device...",
      html: `
      <div class="text-left space-y-2">
        <p>Device: <strong>${device.friendlyName}</strong></p>
        <p>Method: <strong>${method.replace("-", " ")}</strong></p>
        <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <div class="text-xs text-blue-600">
            ${
              method === "database-only"
                ? "Removing from interface only..."
                : "Removing from interface first, then network..."
            }
          </div>
        </div>
      </div>
    `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setActionLoading(`remove-${device.deviceId}`);

      const updatedDevices = devices.filter(
        (d) => d.deviceId !== device.deviceId
      );
      setDevices(updatedDevices);

      const url = `/api/zigbee/devices/${encodeURIComponent(
        device.deviceId
      )}?method=${method}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });

      const result = await response.json();

      if (response.ok) {
        if (result.warning) {
          await Swal.fire({
            icon: "warning",
            title: "Device Removed",
            html: `
            <div class="text-left space-y-3">
              <p><strong>Status:</strong> ${result.message}</p>
              ${
                result.recommendation
                  ? `
                <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p class="text-sm"><strong>Note:</strong> ${result.recommendation}</p>
                </div>
              `
                  : ""
              }
            </div>
          `,
            confirmButtonText: "Got it",
            confirmButtonColor: "#f59e0b",
            timer: 6000,
            timerProgressBar: true,
          });
        } else {
          Toast.fire({
            icon: "success",
            title: "Device Removed",
            text: `${device.friendlyName} removed successfully`,
          });
        }
      } else {
        setDevices(devices);
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Remove error:", error);
      setDevices(devices);

      await Swal.fire({
        icon: "error",
        title: "Remove Failed",
        html: `
        <div class="text-left space-y-3">
          <p><strong>Device:</strong> ${device.friendlyName}</p>
          <p><strong>Error:</strong> ${
            error instanceof Error ? error.message : "Unknown error"
          }</p>
        </div>
      `,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Rename device function
  const renameDevice = async (device: ZigbeeDevice, newName: string) => {
    Swal.fire({
      title: "Renaming Device...",
      html: `
      <div class="text-left space-y-2">
        <p>Device: <strong>${device.friendlyName}</strong></p>
        <p>New Name: <strong>${newName}</strong></p>
        <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <div class="text-xs text-blue-600">Updating name...</div>
        </div>
      </div>
    `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setActionLoading(`rename-${device.deviceId}`);

      const updatedDevices = devices.map((d) =>
        d.deviceId === device.deviceId ? { ...d, friendlyName: newName } : d
      );
      setDevices(updatedDevices);

      const response = await fetch(
        `/api/zigbee/devices/${encodeURIComponent(device.deviceId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            action: "rename",
            friendlyName: newName,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        if (result.warning) {
          await Swal.fire({
            icon: "warning",
            title: "Rename Sent",
            html: `
            <div class="text-left space-y-2">
              <p><strong>Status:</strong> ${result.message}</p>
              <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p class="text-sm">${result.recommendation}</p>
              </div>
            </div>
          `,
            confirmButtonColor: "#f59e0b",
            timer: 6000,
            timerProgressBar: true,
          });
        } else {
          Toast.fire({
            icon: "success",
            title: "Device Renamed",
            text: `${device.friendlyName} → ${newName}`,
          });
        }
      } else {
        setDevices(devices);
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Rename error:", error);
      setDevices(devices);

      await Swal.fire({
        icon: "error",
        title: "Rename Failed",
        html: `
        <div class="text-left space-y-3">
          <p><strong>Device:</strong> ${device.friendlyName}</p>
          <p><strong>New Name:</strong> ${newName}</p>
          <p><strong>Error:</strong> ${
            error instanceof Error ? error.message : "Unknown error"
          }</p>
        </div>
      `,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Send device command
  const sendDeviceCommand = async (device: ZigbeeDevice, command: any) => {
    const commandKey = `${device.deviceId}-${Object.keys(command)[0]}`;

    try {
      setActionLoading(commandKey);

      const updatedDevices = devices.map((d) =>
        d.deviceId === device.deviceId
          ? { ...d, currentState: { ...d.currentState, ...command } }
          : d
      );
      setDevices(updatedDevices);

      const response = await fetch(
        `/api/zigbee/devices/${device.deviceId}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        }
      );

      if (!response.ok) {
        setDevices(devices);
        throw new Error(`Command failed: ${response.status}`);
      }

      const commandName = Object.keys(command)[0];
      const commandValue = Object.values(command)[0];

      Toast.fire({
        icon: "success",
        title: "Command Sent",
        text: `${device.friendlyName}: ${commandName} = ${commandValue}`,
      });

      setTimeout(() => fetchDevices(), 2000);
    } catch (error) {
      console.error("Command error:", error);
      setDevices(devices);

      Toast.fire({
        icon: "error",
        title: "Command Failed",
        text: `Failed to control ${device.friendlyName}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Enhanced pairing function
  const enablePairing = async () => {
    if (pairingMode) {
      await disablePairing();
      return;
    }

    const result = await Swal.fire({
      title: "Enable Pairing Mode?",
      html: `
      <div class="text-left space-y-3">
        <p>This will allow new Zigbee devices to join your network.</p>
        
        <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <p class="text-sm"><strong>Instructions:</strong></p>
          <ol class="text-sm mt-2 space-y-1">
            <li>1. Click "Enable Pairing" below</li>
            <li>2. Put your Zigbee device in pairing mode</li>
            <li>3. Wait for device to appear in the list</li>
            <li>4. Pairing will auto-disable after 4 minutes</li>
          </ol>
        </div>
      </div>
    `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Enable Pairing",
      confirmButtonColor: "#10b981",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "Enabling Pairing Mode...",
        html: `
        <div class="text-center space-y-3">
          <p>Activating Zigbee network pairing...</p>
          <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div class="text-xs text-blue-600">This may take a few seconds...</div>
          </div>
        </div>
      `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const response = await fetch("/api/zigbee/coordinator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "enable_pairing",
            duration: 254,
          }),
        });

        const result = await response.json();

        if (result.success) {
          const duration = result.duration || 254;
          setPairingMode(true);
          setPairingCountdown(duration);

          const countdownInterval = setInterval(() => {
            setPairingCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                setPairingMode(false);
                setPairingInterval(null);

                Toast.fire({
                  icon: "info",
                  title: "Pairing Disabled",
                  text: "Pairing mode automatically disabled",
                });

                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          setPairingInterval(countdownInterval);

          await Swal.fire({
            icon: "success",
            title: "Pairing Mode Active!",
            html: `
            <div class="text-left space-y-3">
              <div class="text-center p-4 bg-green-50 border border-green-200 rounded">
                <p class="text-lg font-semibold text-green-700">Ready to Pair Devices</p>
                <p class="text-sm text-green-600 mt-1">Duration: ${Math.floor(
                  duration / 60
                )} minutes</p>
              </div>
              
              <div class="mt-3 space-y-2">
                <p class="text-sm"><strong>Next Steps:</strong></p>
                <ol class="text-sm space-y-1 ml-4 list-decimal">
                  <li>Put your Zigbee device in pairing mode</li>
                  <li>Device should appear in the list automatically</li>
                  <li>If it doesn't work, try moving device closer</li>
                </ol>
              </div>
            </div>
          `,
            confirmButtonText: "Got it",
            confirmButtonColor: "#10b981",
            timer: 8000,
            timerProgressBar: true,
          });

          const pairingRefreshInterval = setInterval(() => {
            fetchDevices(false, true);
          }, 5000);

          setTimeout(() => {
            clearInterval(pairingRefreshInterval);
          }, duration * 1000);
        } else {
          throw new Error(result.error || "Pairing failed");
        }
      } catch (error) {
        console.error("Pairing error:", error);

        setPairingMode(false);
        setPairingCountdown(0);

        await Swal.fire({
          icon: "error",
          title: "Pairing Failed",
          html: `
          <div class="text-left space-y-3">
            <p><strong>Error:</strong> ${
              error instanceof Error ? error.message : "Unknown error"
            }</p>
            
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p class="text-sm"><strong>Try this:</strong></p>
              <ul class="text-sm mt-1 space-y-1 ml-4 list-disc">
                <li>Restart the bridge first</li>
                <li>Check Zigbee2MQTT logs</li>
                <li>Verify coordinator hardware connection</li>
              </ul>
            </div>
          </div>
        `,
          confirmButtonColor: "#ef4444",
        });
      }
    }
  };

  // Disable pairing function
  const disablePairing = async () => {
    try {
      if (pairingInterval) {
        clearInterval(pairingInterval);
        setPairingInterval(null);
      }

      const originalCountdown = pairingCountdown;
      setPairingCountdown(-1);

      const response = await Promise.race([
        fetch("/api/zigbee/coordinator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "disable_pairing",
          }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Disable request timeout")), 8000)
        ),
      ]);

      const result = await response.json();

      if (response.ok && result.success) {
        setPairingMode(false);
        setPairingCountdown(0);

        Toast.fire({
          icon: "success",
          title: "Pairing Stopped",
          text: "Pairing mode disabled successfully",
        });
      } else {
        throw new Error(result.error || "Failed to disable pairing");
      }
    } catch (error) {
      console.error("Disable pairing error:", error);
      setPairingMode(false);
      setPairingCountdown(0);

      Toast.fire({
        icon: "warning",
        title: "Pairing Stopped",
        text: "Pairing mode disabled (check logs if unsure)",
      });
    }
  };

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Enhanced fetch with better error handling
  const fetchDevices = useCallback(
    async (showToast = false, forceRefresh = false) => {
      try {
        if (showToast) {
          setRefreshing(true);
        }

        const cacheParam = forceRefresh ? `?t=${Date.now()}` : "";
        const response = await fetch(`/api/zigbee/devices${cacheParam}`, {
          cache: forceRefresh ? "no-cache" : "default",
          headers: forceRefresh
            ? {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              }
            : {},
        });

        if (response.ok) {
          const data = await response.json();

          const sortedData = data.sort((a: ZigbeeDevice, b: ZigbeeDevice) => {
            if (a.isOnline !== b.isOnline) {
              return a.isOnline ? -1 : 1;
            }
            return a.friendlyName.localeCompare(b.friendlyName);
          });

          setDevices(sortedData);

          if (showToast) {
            const onlineCount = sortedData.filter(
              (d: ZigbeeDevice) => d.isOnline
            ).length;
            Toast.fire({
              icon: "success",
              title: "Refreshed",
              text: `${sortedData.length} devices (${onlineCount} online)`,
            });
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
        if (showToast) {
          Toast.fire({
            icon: "error",
            title: "Refresh Failed",
            text: "Failed to fetch devices",
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Edit dialog handlers
  const openEditDialog = (device: ZigbeeDevice) => {
    setEditingDevice(device);
    setEditData({
      friendlyName: device.friendlyName,
      deviceType: device.deviceType,
      manufacturer: device.manufacturer || "",
      modelId: device.modelId || "",
    });
  };

  const saveEdit = async () => {
    if (!editingDevice) return;

    if (editData.friendlyName !== editingDevice.friendlyName) {
      await renameDevice(editingDevice, editData.friendlyName);
    }

    setEditingDevice(null);
  };

  // Open device controls dialog
  const openDeviceControls = (device: ZigbeeDevice) => {
    setSelectedDevice(device);
    setIsControlsOpen(true);
  };

  useEffect(() => {
    fetchDevices();

    const hasOnlineDevices = devices.some((d) => d.isOnline);

    const interval = setInterval(
      () => {
        const currentlyOnline = devices.some((d) => d.isOnline);
        if (currentlyOnline) {
          fetchDevices(false, false);
        } else {
          fetchDevices(false, true);
        }
      },
      hasOnlineDevices ? 30000 : 60000
    );

    return () => clearInterval(interval);
  }, [fetchDevices, devices]);

  // Utility functions
  const getDeviceIcon = (deviceType: string) => {
    const icons = {
      light: <Lightbulb className="h-4 w-4 text-yellow-500" />,
      color_light: <Lightbulb className="h-4 w-4 text-purple-500" />,
      temperature_sensor: <Thermometer className="h-4 w-4 text-blue-500" />,
      humidity_sensor: <Droplets className="h-4 w-4 text-blue-400" />,
      door_sensor: <DoorOpen className="h-4 w-4 text-gray-500" />,
      motion_sensor: <Eye className="h-4 w-4 text-green-500" />,
      water_sensor: <Droplets className="h-4 w-4 text-blue-600" />,
      switch: <Zap className="h-4 w-4 text-orange-500" />,
    };
    return (
      icons[deviceType as keyof typeof icons] || (
        <Settings className="h-4 w-4 text-gray-400" />
      )
    );
  };

  const getStatusBadge = (device: ZigbeeDevice) => {
    if (!device.isOnline) {
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          Offline
        </Badge>
      );
    }

    const state = device.currentState;
    if (state?.state === "ON" || state?.state === true) {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
        >
          Active
        </Badge>
      );
    }
    if (state?.state === "OFF" || state?.state === false) {
      return (
        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
        >
          Idle
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      >
        Online
      </Badge>
    );
  };

  const formatDeviceType = (deviceType: string) => {
    return deviceType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render pairing button
  const renderPairingButton = () => {
    if (pairingCountdown === -1) {
      return (
        <Button disabled className="opacity-60">
          <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
          Stopping...
        </Button>
      );
    }

    if (pairingMode && pairingCountdown > 0) {
      return (
        <Button
          onClick={disablePairing}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700"
        >
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-white rounded-full w-2 h-2"></div>
            <span>Stop Pairing ({formatCountdown(pairingCountdown)})</span>
          </div>
        </Button>
      );
    }

    return (
      <Button onClick={enablePairing}>
        <Plus className="h-4 w-4 mr-2" />
        Pair Device
      </Button>
    );
  };

  // Render pairing status card
  const renderPairingStatusCard = () => {
    if (pairingCountdown === -1) {
      return (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 min-w-fit">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-3 w-3 animate-spin text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-700">
                Stopping Pairing
              </div>
              <div className="text-xs text-yellow-600">
                Disabling network join...
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (pairingMode && pairingCountdown > 0) {
      return (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 min-w-fit">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-green-500 rounded-full w-3 h-3"></div>
            <div>
              <div className="text-sm font-medium text-green-700">
                Pairing Active
              </div>
              <div className="text-xs text-green-600 font-mono">
                {formatCountdown(pairingCountdown)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={disablePairing}
              className="ml-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              Stop
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render device controls dialog content
  const renderDeviceControls = (device: ZigbeeDevice) => {
    const state = device.currentState || {};
    const isCommandLoading = (cmd: string) =>
      actionLoading === `${device.deviceId}-${cmd}`;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Power Control */}
          {state.state !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Power className="h-4 w-4" />
                  Power Control
                </Label>
                <Switch
                  checked={state.state === "ON" || state.state === true}
                  disabled={isCommandLoading("state")}
                  onCheckedChange={(checked) =>
                    sendDeviceCommand(device, { state: checked ? "ON" : "OFF" })
                  }
                />
              </div>
            </div>
          )}

          {/* Brightness Control */}
          {state.brightness !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Brightness</Label>
                <Badge variant="outline" className="text-xs">
                  {Math.round((state.brightness / 254) * 100)}%
                </Badge>
              </div>
              <Slider
                value={[state.brightness || 0]}
                max={254}
                step={1}
                disabled={isCommandLoading("brightness")}
                onValueChange={([value]) =>
                  sendDeviceCommand(device, { brightness: value })
                }
                className="w-full"
              />
            </div>
          )}

          {/* Color Temperature */}
          {state.color_temp !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Color Temperature</Label>
                <Badge variant="outline" className="text-xs">
                  {state.color_temp} mired
                </Badge>
              </div>
              <Slider
                value={[state.color_temp || 150]}
                min={150}
                max={500}
                step={1}
                disabled={isCommandLoading("color_temp")}
                onValueChange={([value]) =>
                  sendDeviceCommand(device, { color_temp: value })
                }
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Sensor Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.temperature !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <Thermometer className="h-5 w-5 text-blue-500" />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Temperature
                </span>
                <div className="text-lg font-bold">{state.temperature}°C</div>
              </div>
            </div>
          )}

          {state.humidity !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <Droplets className="h-5 w-5 text-blue-400" />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Humidity
                </span>
                <div className="text-lg font-bold">{state.humidity}%</div>
              </div>
            </div>
          )}

          {state.battery !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <Battery className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Battery
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{state.battery}%</span>
                  {state.battery < 20 && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact/Motion Sensors */}
          {state.contact !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <DoorOpen className="h-5 w-5 text-gray-500" />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Door Status
                </span>
                <div className="mt-1">
                  <Badge variant={state.contact ? "destructive" : "default"}>
                    {state.contact ? "Open" : "Closed"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {state.occupancy !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Motion
                </span>
                <div className="mt-1">
                  <Badge
                    variant={state.occupancy ? "destructive" : "secondary"}
                  >
                    {state.occupancy ? "Detected" : "Clear"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {state.water_leak !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
              <Droplets className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Water Status
                </span>
                <div className="mt-1">
                  <Badge variant={state.water_leak ? "destructive" : "default"}>
                    {state.water_leak ? "Leak Detected" : "Normal"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 md:p-8">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading Zigbee devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4 md:p-6 space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Zigbee Network
                </h1>
                <p className="text-muted-foreground">
                  Manage and control your Zigbee smart home devices
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Devices
                    </p>
                    <p className="text-3xl font-bold">{devices.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Online
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {devices.filter((d) => d.isOnline).length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Offline
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {devices.filter((d) => !d.isOnline).length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`border-0 shadow-md backdrop-blur-sm ${
                pairingMode
                  ? "bg-green-100/80 dark:bg-green-900/20"
                  : "bg-white/80 dark:bg-slate-900/80"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {pairingMode ? "Pairing Active" : "Device Types"}
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        pairingMode ? "font-mono text-green-700" : ""
                      }`}
                    >
                      {pairingMode
                        ? formatCountdown(pairingCountdown)
                        : new Set(devices.map((d) => d.deviceType)).size}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      pairingMode
                        ? "bg-green-200 dark:bg-green-800/30"
                        : "bg-purple-100 dark:bg-purple-900/20"
                    }`}
                  >
                    {pairingMode ? (
                      <Activity className="h-6 w-6 text-green-600 dark:text-green-400 animate-pulse" />
                    ) : (
                      <Router className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Device Management</CardTitle>
                  <CardDescription>
                    Control and monitor your Zigbee smart home devices
                  </CardDescription>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Pairing Status Card */}
                  {renderPairingStatusCard()}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDevices(true)}
                    disabled={refreshing}
                    className="whitespace-nowrap"
                  >
                    <RefreshCcw
                      className={`mr-2 h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>

                  {/* Enhanced Pairing Button */}
                  {renderPairingButton()}
                </div>
              </div>

              {/* Search Bar */}
              <div className="pt-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-hidden">
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          {searchTerm
                            ? "No devices found"
                            : "No Zigbee devices"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm
                            ? "Try adjusting your search terms"
                            : "Start by pairing your first Zigbee device"}
                        </p>
                      </div>
                      {!searchTerm && (
                        <Button onClick={enablePairing} className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Pair Device
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Device
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Type & Model
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Status & Activity
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Last Seen
                        </TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.map((device) => (
                        <TableRow
                          key={device.deviceId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {getDeviceIcon(device.deviceType)}
                              <div className="space-y-1">
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {device.friendlyName}
                                </p>
                                <code className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {device.deviceId}
                                </code>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs">
                                {formatDeviceType(device.deviceType)}
                              </Badge>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                  {device.manufacturer || "Unknown"}
                                </p>
                                {device.modelId && (
                                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {device.modelId}
                                  </code>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {device.isOnline ? (
                                  <Wifi className="h-4 w-4 text-green-600" />
                                ) : (
                                  <WifiOff className="h-4 w-4 text-red-600" />
                                )}
                                {getStatusBadge(device)}
                              </div>

                              {/* Battery indicator */}
                              {device.currentState?.battery !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Battery
                                    className={`h-3 w-3 ${
                                      device.currentState.battery < 20
                                        ? "text-red-500"
                                        : "text-green-500"
                                    }`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {device.currentState.battery}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            {device.lastSeen ? (
                              <div className="space-y-1">
                                <p className="text-sm">
                                  {new Date(
                                    device.lastSeen
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    device.lastSeen
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">
                                Never
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right py-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* Control Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                    onClick={() => openDeviceControls(device)}
                                    disabled={!device.isOnline}
                                  >
                                    <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Device controls</TooltipContent>
                              </Tooltip>

                              {/* More Actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    disabled={actionLoading?.includes(
                                      device.deviceId
                                    )}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => confirmRename(device)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Rename Device
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => confirmDelete(device)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Device
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Device Controls Dialog */}
      <Dialog open={isControlsOpen} onOpenChange={setIsControlsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDevice && getDeviceIcon(selectedDevice.deviceType)}
              Device Controls
            </DialogTitle>
            <DialogDescription>
              {selectedDevice && (
                <>
                  Control and monitor{" "}
                  <strong>{selectedDevice.friendlyName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="pt-4">{renderDeviceControls(selectedDevice)}</div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsControlsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingDevice}
        onOpenChange={() => setEditingDevice(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>
              Change the friendly name for this device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="friendlyName">Friendly Name</Label>
              <Input
                id="friendlyName"
                value={editData.friendlyName}
                onChange={(e) =>
                  setEditData({ ...editData, friendlyName: e.target.value })
                }
                placeholder="Enter new device name"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDevice(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={actionLoading?.startsWith("rename-")}
            >
              {actionLoading?.startsWith("rename-") && (
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
