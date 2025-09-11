"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Settings,
  RefreshCw,
  Save,
  Trash2,
  Menu,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Type Definitions ---
interface Submenus {
  [key: string]: boolean;
}
interface Menu {
  enabled: boolean;
  submenus: Submenus;
}
interface MenuConfig {
  [key: string]: Menu;
}

// --- Data Default ---
const defaultMenuConfig: MenuConfig = {
  Monitoring: { enabled: true, submenus: { "Main Dashboard": true } },
  Devices: {
    enabled: true,
    submenus: {
      "Devices Internal": true,
      "Devices External": true,
      "Devices for Logging": true,
      "Access Controllers": true,
      Zigbee: true,
    },
  },
  SystemConfig: {
    enabled: true,
    submenus: {
      "User Management": true,
      "Power Analyzer": true,
      "Menu Display": true,
      "System Backup": true,
    },
  },
  LoRaWAN: {
    enabled: true,
    submenus: {
      "Device List": true,
      "Device Profiles": true,
      Applications: true,
      Gateways: true,
      "EC25-Modem": true, // Tambahkan ini
    },
  },
  SecurityAccess: {
    enabled: true,
    submenus: {
      "Surveillance CCTV": true,
      "Access-Control": true,
    },
  },
  Network: {
    enabled: true,
    submenus: {
      "Communication Setup": true,
      "Register SNMP": true,
      "MQTT Broker": true,
    },
  },
  Automation: {
    enabled: true,
    submenus: {
      "Automated Scheduling": true,
      "Smart Logic Automation": true,
      "Voice Command": true,
      "Automation Values": true,
      "Dynamic Payload": true,
      "Static Payload": true,
    },
  },
  Alarms: {
    enabled: true,
    submenus: { "Alarm Management": true, "Alarm Log Reports": true },
  },
  VoiceRecognition: {
    enabled: true,
    submenus: { "Relay Control": true, "Relay STT": true },
  },
  Analytics: { enabled: true, submenus: { "Devices Log Report": true } },
  Maintenance: {
    // Tambahkan section baru ini
    enabled: true,
    submenus: { "Schedule Management": true, "Task Reports": true },
  },
};
// Tambahkan array ini setelah defaultMenuConfig
const menuOrder = [
  "Monitoring",
  "Devices",
  "LoRaWAN",
  "Network",
  "SecurityAccess",
  "Automation",
  "Alarms",
  "VoiceRecognition",
  "Analytics",
  "Maintenance",
  "SystemConfig",
];

// Helper untuk format label
const formatLabel = (key: string) => key.replace(/([A-Z])/g, " $1").trim();

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export default function MenuDisplayPage() {
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(defaultMenuConfig);
  const [configExists, setConfigExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate statistics
  const totalMenus = Object.keys(menuConfig).length;
  const enabledMenus = Object.values(menuConfig).filter(
    (menu) => menu.enabled
  ).length;
  const totalSubmenus = Object.values(menuConfig).reduce(
    (total, menu) => total + Object.keys(menu.submenus).length,
    0
  );
  const enabledSubmenus = Object.values(menuConfig).reduce(
    (total, menu) =>
      total + Object.values(menu.submenus).filter(Boolean).length,
    0
  );

  const fetchMenuConfig = useCallback(
    async (showToast = false) => {
      try {
        if (showToast) {
          setRefreshing(true);
        }
        setIsLoading(true);

        const { data } = await axios.get<MenuConfig | null>(
          "/api/menu-configuration"
        );

        if (data) {
          setMenuConfig(data);
          setConfigExists(true);
        } else {
          setMenuConfig(defaultMenuConfig);
          setConfigExists(false);
        }

        if (showToast) {
          Toast.fire({
            icon: "success",
            title: "Configuration refreshed",
            text: `${enabledMenus}/${totalMenus} menus enabled`,
          });
        }
      } catch (error) {
        Toast.fire({
          icon: "error",
          title: "Failed to load menu configuration",
        });
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [enabledMenus, totalMenus]
  );

  useEffect(() => {
    fetchMenuConfig();
  }, [fetchMenuConfig]);

  const handleMenuChange = (menuKey: string, checked: boolean) => {
    setMenuConfig((prev) => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], enabled: checked },
    }));
  };

  const handleSubmenuChange = (
    menuKey: string,
    subKey: string,
    checked: boolean
  ) => {
    setMenuConfig((prev) => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        submenus: { ...prev[menuKey].submenus, [subKey]: checked },
      },
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await axios.post("/api/menu-configuration", menuConfig);
      // Update toast messages
      Toast.fire({
        icon: "success",
        title: "UniBoard menu configuration saved successfully!",
      });
      setConfigExists(true);
      window.location.reload();
    } catch (error) {
      Toast.fire({
        icon: "error",
        title: "Failed to save menu configuration",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Swal.fire({
      title: "Reset to Default?",
      text: "This will delete your custom settings and restore default menu configuration.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reset to default",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true);
        try {
          await axios.delete("/api/menu-configuration");
          Toast.fire({
            icon: "success",
            title: "Configuration reset to default",
          });
          setMenuConfig(defaultMenuConfig);
          setConfigExists(false);
        } catch (error) {
          Toast.fire({
            icon: "error",
            title: "Failed to reset configuration",
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-2">
          Loading menu configuration...
        </p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Menu Display Settings
            </CardTitle>
            <CardDescription>
              Configure which navigation menus and submenus are visible in the
              UniBoard sidebar
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMenuConfig(true)}
              disabled={refreshing || isSubmitting}
              className="whitespace-nowrap"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Menu className="h-3 w-3 mr-1" />
                {enabledMenus}/{totalMenus} Menus
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {enabledSubmenus}/{totalSubmenus} Submenus
              </Badge>
            </div>
            {configExists && (
              <Badge variant="default" className="text-xs">
                Custom Configuration
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuOrder
            .filter((menuKey) => menuConfig[menuKey]) // Filter menu yang ada
            .map((menuKey) => {
              const menuData = menuConfig[menuKey];
              const enabledSubCount = Object.values(menuData.submenus).filter(
                Boolean
              ).length;
              const totalSubCount = Object.keys(menuData.submenus).length;

              return (
                <Card
                  key={menuKey}
                  className={`transition-all duration-200 hover:shadow-md ${
                    menuData.enabled
                      ? "border-primary/20 bg-primary/5"
                      : "border-muted bg-muted/20"
                  }`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={menuKey}
                          checked={menuData.enabled}
                          onCheckedChange={(checked) =>
                            handleMenuChange(menuKey, !!checked)
                          }
                          disabled={isSubmitting}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="space-y-1">
                          <Label
                            htmlFor={menuKey}
                            className="text-base font-semibold cursor-pointer flex items-center gap-2"
                          >
                            {formatLabel(menuKey)}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                menuData.enabled ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {menuData.enabled ? (
                                <Eye className="h-3 w-3 mr-1" />
                              ) : (
                                <EyeOff className="h-3 w-3 mr-1" />
                              )}
                              {menuData.enabled ? "Visible" : "Hidden"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {enabledSubCount}/{totalSubCount}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {menuData.enabled && (
                    <>
                      <Separator />
                      <CardContent className="p-4 space-y-3">
                        {Object.entries(menuData.submenus).map(
                          ([subKey, isEnabled]) => (
                            <div
                              key={subKey}
                              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                isEnabled
                                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                  : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              <Label
                                htmlFor={`${menuKey}-${subKey}`}
                                className="font-normal cursor-pointer flex-1 text-sm"
                              >
                                {subKey}
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2">
                                    {isEnabled ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-400" />
                                    )}
                                    <Checkbox
                                      id={`${menuKey}-${subKey}`}
                                      checked={isEnabled}
                                      onCheckedChange={(checked) =>
                                        handleSubmenuChange(
                                          menuKey,
                                          subKey,
                                          !!checked
                                        )
                                      }
                                      disabled={isSubmitting}
                                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isEnabled
                                    ? "Submenu is visible"
                                    : "Submenu is hidden"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
        </div>
      </CardContent>

      <CardFooter className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="flex gap-2 flex-1">
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>

            {configExists && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Trash2 className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground flex items-center">
            Changes will be applied to UniBoard sidebar after saving and page
            refresh
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
