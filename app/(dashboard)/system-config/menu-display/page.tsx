// File: app/(dashboard)/system-config/menu-display/page.tsx

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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator"; // <-- Tambahkan Separator untuk garis pemisah

// --- Type Definitions (Tidak Berubah) ---
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

// --- Data Default (Tidak Berubah) ---
const defaultMenuConfig: MenuConfig = {
  Monitoring: { enabled: true, submenus: { "Main Dashboard": true } },
  Devices: {
    enabled: true,
    submenus: {
      "Devices Internal": true,
      "Devices External": true,
      "Devices for Logging": true,
      "Access Controllers": true,
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
    },
  },
  SecurityAccess: {
    enabled: true,
    submenus: { "Device Access": true, "Surveillance CCTV": true },
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
};

// Helper untuk format label (Tidak Berubah)
const formatLabel = (key: string) => key.replace(/([A-Z])/g, " $1").trim();

// --- Komponen Halaman ---
export default function MenuDisplayPage() {
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(defaultMenuConfig);
  const [configExists, setConfigExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Semua Logika (fetch, handle, save, delete) tidak berubah ---
  const fetchMenuConfig = useCallback(async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      Swal.fire("Error", "Gagal memuat konfigurasi menu.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);
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
    Swal.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      await axios.post("/api/menu-configuration", menuConfig);
      Swal.fire("Berhasil!", "Konfigurasi menu berhasil disimpan.", "success");
      setConfigExists(true);
      // TAMBAHKAN BARIS INI untuk me-refresh halaman
      window.location.reload();
    } catch (error) {
      Swal.fire("Gagal!", "Gagal menyimpan konfigurasi menu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = () => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Ini akan menghapus pengaturan menu dan kembali ke default.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true);
        Swal.fire({
          title: "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        try {
          await axios.delete("/api/menu-configuration");
          Swal.fire(
            "Dihapus!",
            "Konfigurasi menu berhasil dihapus.",
            "success"
          );
          setMenuConfig(defaultMenuConfig);
          setConfigExists(false);
        } catch (error) {
          Swal.fire("Gagal!", "Gagal menghapus konfigurasi menu.", "error");
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Tampilan JSX yang Diperbarui ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Display Settings</CardTitle>
        <CardDescription>
          Pilih menu dan submenu yang akan ditampilkan di sidebar navigasi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(menuConfig).map(([menuKey, menuData]) => (
            <Card key={menuKey} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <Label
                  htmlFor={menuKey}
                  className="text-base font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    id={menuKey}
                    checked={menuData.enabled}
                    onCheckedChange={(checked) =>
                      handleMenuChange(menuKey, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  {formatLabel(menuKey)}
                </Label>
              </CardHeader>
              {menuData.enabled && (
                <>
                  <Separator />
                  <CardContent className="p-4 space-y-4 flex-grow">
                    {Object.entries(menuData.submenus).map(
                      ([subKey, isEnabled]) => (
                        <div
                          key={subKey}
                          className="flex items-center justify-between"
                        >
                          <Label
                            htmlFor={`${menuKey}-${subKey}`}
                            className="font-normal text-muted-foreground cursor-pointer"
                          >
                            {subKey}
                          </Label>
                          <Checkbox
                            id={`${menuKey}-${subKey}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              handleSubmenuChange(menuKey, subKey, !!checked)
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                      )
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
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
              Delete Settings
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
