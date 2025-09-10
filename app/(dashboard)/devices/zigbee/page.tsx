// File: app/(dashboard)/zigbee/page.tsx - Clean Layout Improvements
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
import { Separator } from "@/components/ui/separator";
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
  ChevronDown,
  ChevronRight,
  Power,
  Battery,
  Signal,
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pairingCountdown, setPairingCountdown] = useState<number>(0);
  const [pairingInterval, setPairingInterval] = useState<NodeJS.Timer | null>(
    null
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

  // ========== IMPROVED DELETE FUNCTION ==========
  const removeDevice = async (
    device: ZigbeeDevice,
    method: "smart" | "force" | "database-only" = "smart"
  ) => {
    // Show loading with immediate update prediction
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

      // STEP 1: Optimistically remove from UI immediately
      const updatedDevices = devices.filter(
        (d) => d.deviceId !== device.deviceId
      );
      setDevices(updatedDevices);
      console.log(
        `🗑️ [UI] Optimistically removed ${device.friendlyName} from UI`
      );

      // STEP 2: Send delete request (now with improved backend)
      const url = `/api/zigbee/devices/${encodeURIComponent(
        device.deviceId
      )}?method=${method}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });

      const result = await response.json();

      if (response.ok) {
        // Success - device already removed from UI optimistically
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

        console.log(`✅ [UI] Device removal completed successfully`);
      } else {
        // Error - revert optimistic update
        setDevices(devices);
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Remove error:", error);

      // Revert optimistic update on error
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
          
          <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm"><strong>What happened:</strong></p>
            <p class="text-sm">Device was not removed due to an error</p>
          </div>
        </div>
      `,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setActionLoading(null);
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

  // ========== IMPROVED RENAME FUNCTION ==========
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

      // STEP 1: Optimistically update UI
      const updatedDevices = devices.map((d) =>
        d.deviceId === device.deviceId ? { ...d, friendlyName: newName } : d
      );
      setDevices(updatedDevices);
      console.log(`✏️ [UI] Optimistically renamed to ${newName}`);

      // STEP 2: Send rename request
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

        console.log(`✅ [UI] Rename completed successfully`);
      } else {
        // Error - revert optimistic update
        setDevices(devices);
        throw new Error(result.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Rename error:", error);

      // Revert optimistic update on error
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
          
          <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm"><strong>What happened:</strong></p>
            <p class="text-sm">Name was not changed due to an error</p>
          </div>
        </div>
      `,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setActionLoading(null);
    }
  };
  // Enhanced command function with SweetAlert2
  const sendDeviceCommand = async (device: ZigbeeDevice, command: any) => {
    const commandKey = `${device.deviceId}-${Object.keys(command)[0]}`;

    try {
      setActionLoading(commandKey);

      // Optimistic update
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
        setDevices(devices); // Revert optimistic update
        throw new Error(`Command failed: ${response.status}`);
      }

      // Simple success toast for commands
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
      setDevices(devices); // Revert optimistic update

      Toast.fire({
        icon: "error",
        title: "Command Failed",
        text: `Failed to control ${device.friendlyName}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ========== IMPROVED PAIRING FUNCTION ==========
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
      // Show loading
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

          // Start countdown timer
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

          // Auto-refresh during pairing
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

  // Enhanced disable pairing dengan proper cleanup
  const disablePairing = async () => {
    console.log(`🛑 [UI] Disabling pairing mode`);

    try {
      // STEP 1: Immediately update UI state untuk responsiveness
      if (pairingInterval) {
        clearInterval(pairingInterval);
        setPairingInterval(null);
      }

      // Set UI to "disabling" state
      const originalCountdown = pairingCountdown;
      setPairingCountdown(-1); // Special state indicating "disabling"

      // STEP 2: Send disable command dengan timeout protection
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
        // STEP 3: Successful disable - update UI completely
        setPairingMode(false);
        setPairingCountdown(0);

        Toast.fire({
          icon: "success",
          title: "Pairing Stopped",
          text: "Pairing mode disabled successfully",
        });

        console.log(`✅ [UI] Pairing disabled successfully`);
      } else {
        throw new Error(result.error || "Failed to disable pairing");
      }
    } catch (error) {
      console.error("Disable pairing error:", error);

      // STEP 4: Handle disable failure
      const isTimeout =
        error instanceof Error && error.message.includes("timeout");

      if (isTimeout) {
        // For timeout: assume it worked but show warning
        setPairingMode(false);
        setPairingCountdown(0);

        await Swal.fire({
          icon: "warning",
          title: "Pairing Stop Timeout",
          html: `
          <div class="text-left space-y-3">
            <p>The disable command timed out, but pairing may have stopped.</p>
            
            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p class="text-sm"><strong>What to do:</strong></p>
              <ul class="text-sm mt-1 space-y-1 ml-4 list-disc">
                <li>Check if new devices can still pair</li>
                <li>If pairing is still active, restart the bridge</li>
                <li>Monitor Zigbee2MQTT logs for confirmation</li>
              </ul>
            </div>
          </div>
        `,
          confirmButtonText: "Got it",
          confirmButtonColor: "#f59e0b",
        });
      } else {
        // For other errors: revert to previous state with option to force stop
        const result = await Swal.fire({
          icon: "error",
          title: "Failed to Stop Pairing",
          html: `
          <div class="text-left space-y-3">
            <p><strong>Error:</strong> ${
              error instanceof Error ? error.message : "Unknown error"
            }</p>
            
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p class="text-sm"><strong>Options:</strong></p>
              <ul class="text-sm mt-1 space-y-1 ml-4 list-disc">
                <li><strong>Force Stop:</strong> Reset UI state anyway</li>
                <li><strong>Restart Bridge:</strong> Restart to stop pairing</li>
                <li><strong>Cancel:</strong> Keep pairing active</li>
              </ul>
            </div>
          </div>
        `,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "Force Stop UI",
          confirmButtonColor: "#f59e0b",
          denyButtonText: "Restart Bridge",
          denyButtonColor: "#ef4444",
          cancelButtonText: "Keep Pairing",
        });

        if (result.isConfirmed) {
          // Force stop UI state
          setPairingMode(false);
          setPairingCountdown(0);

          Toast.fire({
            icon: "warning",
            title: "Force Stopped",
            text: "UI pairing state cleared (check Zigbee2MQTT)",
          });
        } else if (result.isDenied) {
          // Restart bridge to stop pairing
          setPairingMode(false);
          setPairingCountdown(0);
          await executeCoordinatorAction("restart");
        } else {
          // Keep pairing - revert to previous state
          const remainingTime = originalCountdown > 0 ? originalCountdown : 60;
          setPairingCountdown(remainingTime);

          // Restart countdown timer
          const countdownInterval = setInterval(() => {
            setPairingCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                setPairingMode(false);
                setPairingInterval(null);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          setPairingInterval(countdownInterval);

          Toast.fire({
            icon: "info",
            title: "Pairing Continues",
            text: "Pairing mode is still active",
          });
        }
      }
    }
  };

  // Enhanced pairing button dengan better state management
  const renderPairingButton = () => {
    if (pairingCountdown === -1) {
      // Special "disabling" state
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

  // Update existing pairing status card untuk handle "disabling" state
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
  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  // Enhanced coordinator actions with SweetAlert2
  // ========== IMPROVED COORDINATOR ACTIONS ==========
  const executeCoordinatorAction = async (action: string) => {
    const actionNames = {
      restart: "Restart Bridge",
      health_check: "Check Coordinator",
      clear_database: "Clear Device List",
      reset_network: "Reset Network",
      force_remove_all: "Force Remove All Devices",
      backup: "Backup Configuration",
    };

    const actionName =
      actionNames[action as keyof typeof actionNames] || action;

    // Enhanced confirmation dialogs
    const getConfirmationConfig = (action: string) => {
      switch (action) {
        case "reset_network":
          return {
            title: `⚠️ ${actionName}?`,
            html: `<div class="text-left space-y-3">
            <p class="text-red-600 font-medium">This will completely reset your Zigbee network!</p>
            <ul class="text-sm space-y-1 ml-4 list-disc">
              <li>All devices will be unpaired</li>
              <li>All device names will be lost</li>
              <li>You'll need to re-pair every device</li>
            </ul>
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-sm text-red-600"><strong>Warning:</strong> This action cannot be undone!</p>
            </div>
          </div>`,
            icon: "warning" as const,
            confirmButtonColor: "#ef4444",
          };
        case "force_remove_all":
          return {
            title: `${actionName}?`,
            html: `<div class="text-left space-y-2">
            <p>This will forcibly remove ALL devices from the network.</p>
            <div class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
              <p class="text-sm text-orange-600"><strong>Note:</strong> Devices will be unpaired but not factory reset.</p>
            </div>
          </div>`,
            icon: "warning" as const,
            confirmButtonColor: "#f59e0b",
          };
        case "clear_database":
          return {
            title: `${actionName}?`,
            html: "This will remove all devices from the interface but keep them in the Zigbee network. They will reappear when they send data.",
            icon: "question" as const,
            confirmButtonColor: "#3b82f6",
          };
        default:
          return {
            title: `${actionName}?`,
            html: `This will ${actionName.toLowerCase()}.`,
            icon: "question" as const,
            confirmButtonColor: "#3b82f6",
          };
      }
    };

    const config = getConfirmationConfig(action);

    const result = await Swal.fire({
      title: config.title,
      html: config.html,
      icon: config.icon,
      showCancelButton: true,
      confirmButtonText: actionName,
      confirmButtonColor: config.confirmButtonColor,
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal-wide",
      },
    });

    if (result.isConfirmed) {
      // Show loading
      Swal.fire({
        title: `${actionName}...`,
        html: `
        <div class="text-left space-y-2">
          <p>Executing: <strong>${actionName}</strong></p>
          <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div class="text-xs text-blue-600">Processing command...</div>
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
        // Use unified coordinator API
        const response = await fetch("/api/zigbee/coordinator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({ action }),
        });

        const result = await response.json();

        if (result.success) {
          await Swal.fire({
            icon: "success",
            title: "Action Completed",
            html: `
            <div class="text-left space-y-3">
              <p><strong>Action:</strong> ${actionName}</p>
              <p><strong>Status:</strong> ${result.message}</p>
              ${
                result.recommendation
                  ? `
                <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                  <p class="text-sm"><strong>Note:</strong> ${result.recommendation}</p>
                </div>
              `
                  : ""
              }
              ${
                result.warning
                  ? `
                <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p class="text-sm text-yellow-600"><strong>Warning:</strong> ${result.warning}</p>
                </div>
              `
                  : ""
              }
            </div>
          `,
            confirmButtonColor: "#10b981",
            timer: action === "reset_network" ? 10000 : 6000,
            timerProgressBar: true,
          });

          // Auto-refresh for actions that modify device list
          if (
            ["clear_database", "reset_network", "force_remove_all"].includes(
              action
            )
          ) {
            console.log(`🔄 [UI] Auto-refreshing after ${action}`);
            setTimeout(() => {
              fetchDevices(true);
            }, 2000);
          }
        } else {
          throw new Error(result.error || "Action failed");
        }
      } catch (error) {
        console.error("Coordinator action error:", error);

        await Swal.fire({
          icon: "error",
          title: "Action Failed",
          html: `
          <div class="text-left space-y-2">
            <p><strong>Action:</strong> ${actionName}</p>
            <p><strong>Error:</strong> ${
              error instanceof Error ? error.message : "Unknown error"
            }</p>
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-sm text-red-600">Check Zigbee2MQTT logs for more details</p>
            </div>
          </div>
        `,
          confirmButtonColor: "#ef4444",
        });
      }
    }
  };

  // Enhanced fetch with better error handling and caching
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

          // Sort devices: online first, then by name
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

          console.log(`📊 [UI] Loaded ${sortedData.length} devices`);
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

  // Toggle row expansion
  const toggleRow = (deviceId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(deviceId)) {
      newExpanded.delete(deviceId);
    } else {
      newExpanded.add(deviceId);
    }
    setExpandedRows(newExpanded);
  };

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

  useEffect(() => {
    fetchDevices();

    // Calculate if there are online devices
    const hasOnlineDevices = devices.some((d) => d.isOnline);

    // Different refresh intervals based on device activity
    const interval = setInterval(
      () => {
        const currentlyOnline = devices.some((d) => d.isOnline);
        if (currentlyOnline) {
          fetchDevices(false, false); // Normal refresh for active networks
        } else {
          fetchDevices(false, true); // Force refresh for inactive networks
        }
      },
      hasOnlineDevices ? 30000 : 60000
    ); // 30s vs 60s

    return () => clearInterval(interval);
  }, [fetchDevices, devices]);

  // Utility functions (keep existing ones)
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
      return <Badge variant="destructive">Offline</Badge>;
    }

    const state = device.currentState;
    if (state?.state === "ON" || state?.state === true) {
      return <Badge variant="default">On</Badge>;
    }
    if (state?.state === "OFF" || state?.state === false) {
      return <Badge variant="secondary">Off</Badge>;
    }

    return <Badge variant="outline">Online</Badge>;
  };

  const formatDeviceType = (deviceType: string) => {
    return deviceType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render device controls (keep existing function)
  const renderDeviceControls = (device: ZigbeeDevice) => {
    const state = device.currentState || {};
    const isCommandLoading = (cmd: string) =>
      actionLoading === `${device.deviceId}-${cmd}`;

    return (
      <div className="p-6 bg-gray-50 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Power Control */}
          {state.state !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Power className="h-4 w-4" />
                  Power
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
                <span className="text-sm text-gray-600 px-2 py-1 bg-white rounded border">
                  {Math.round((state.brightness / 254) * 100)}%
                </span>
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
                <span className="text-sm text-gray-600 px-2 py-1 bg-white rounded border">
                  {state.color_temp} mired
                </span>
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

          {/* Sensor Values */}
          {state.temperature !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <Thermometer className="h-5 w-5 text-blue-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Temperature
                </span>
                <div className="text-lg font-bold">{state.temperature}°C</div>
              </div>
            </div>
          )}

          {state.humidity !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <Droplets className="h-5 w-5 text-blue-400" />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Humidity
                </span>
                <div className="text-lg font-bold">{state.humidity}%</div>
              </div>
            </div>
          )}

          {state.battery !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <Battery className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
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
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <DoorOpen className="h-5 w-5 text-gray-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">
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
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">
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
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <Droplets className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">
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
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <RefreshCcw className="h-8 w-8 animate-spin text-gray-500" />
        <p className="text-gray-600">Loading devices...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header dengan Enhanced Pairing Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zigbee Devices</h1>
          <p className="text-gray-600 mt-1">
            Manage your Zigbee smart home network
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          {/* Enhanced Pairing Status Card with disable state */}
          {renderPairingStatusCard()}

          <Button
            variant="outline"
            onClick={() => fetchDevices(true)}
            disabled={refreshing}
          >
            <RefreshCcw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          {/* Enhanced Pairing Button dengan state management */}
          {renderPairingButton()}
        </div>
      </div>
      {/* Enhanced Stats Cards dengan Pairing Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Devices",
            value: devices.length,
            icon: Package,
            color: "text-gray-600",
          },
          {
            label: "Online",
            value: devices.filter((d) => d.isOnline).length,
            icon: Wifi,
            color: "text-green-600",
          },
          {
            label: "Offline",
            value: devices.filter((d) => !d.isOnline).length,
            icon: WifiOff,
            color: "text-red-600",
          },
          {
            label: pairingMode ? "Pairing Active" : "Device Types",
            value: pairingMode
              ? formatCountdown(pairingCountdown)
              : new Set(devices.map((d) => d.deviceType)).size,
            icon: pairingMode ? Activity : Settings,
            color: pairingMode ? "text-blue-600" : "text-gray-600",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className={
              pairingMode && i === 3 ? "bg-blue-50 border-blue-200" : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${stat.color}`}>
                {stat.label}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${stat.color} ${
                  pairingMode && i === 3 ? "animate-pulse" : ""
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  pairingMode && i === 3 ? "font-mono text-blue-700" : ""
                }`}
              >
                {stat.value}
              </div>
              {pairingMode && i === 3 && (
                <div className="text-xs text-blue-500 mt-1">Remaining time</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device List</CardTitle>
          <CardDescription>
            Click on a device to expand controls and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {devices.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No devices found</h3>
              <p className="text-gray-600 mb-4">
                Start by pairing your first Zigbee device
              </p>
              <Button onClick={enablePairing}>
                <Plus className="h-4 w-4 mr-2" />
                Pair Device
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>

                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <>
                    <TableRow
                      key={device.deviceId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleRow(device.deviceId)}
                    >
                      <TableCell>
                        {expandedRows.has(device.deviceId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>{getDeviceIcon(device.deviceType)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {device.friendlyName}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {device.deviceId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            device.manufacturer ? "" : "text-gray-400 italic"
                          }
                        >
                          {device.manufacturer || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {device.modelId ? (
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {device.modelId}
                          </code>
                        ) : (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {device.isOnline ? (
                            <Wifi className="h-4 w-4 text-green-600" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-600" />
                          )}
                          {getStatusBadge(device)}
                        </div>
                      </TableCell>

                      <TableCell>
                        {device.lastSeen ? (
                          <div className="text-sm">
                            <div>
                              {new Date(device.lastSeen).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(device.lastSeen).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
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
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row Controls */}
                    {expandedRows.has(device.deviceId) && (
                      <TableRow>
                        <TableCell colSpan={9} className="p-0">
                          {renderDeviceControls(device)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
    </div>
  );
}
