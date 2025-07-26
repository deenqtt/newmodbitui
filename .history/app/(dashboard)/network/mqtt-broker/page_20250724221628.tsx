// File: app/(dashboard)/network/mqtt-broker/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wifi } from "lucide-react";
import { useMqtt } from "@/contexts/MqttContext";

// --- Type Definitions ---
interface MqttConfig {
  enable: boolean;
  pub_interval: number;
  broker_address: string;
  broker_port: number;
  username?: string;
  password?: string;
  qos: number;
  retain: boolean;
  pub_topic: string;
  mac: string;
}

interface ModbusTopicsConfig {
  sub_topic_system: string;
  sub_topic_modbusRTU: string;
  sub_topic_modbusTCP: string;
  sub_topic_snmp: string;
  publish_failed_data_modbusrtu: string;
}

// --- Komponen Halaman ---
export default function MqttBrokerPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();

  // State untuk menyimpan konfigurasi dari MQTT
  const [mqttConfig, setMqttConfig] = useState<Partial<MqttConfig>>({});
  const [modbusConfig, setModbusConfig] = useState<Partial<ModbusTopicsConfig>>(
    {}
  );

  // State untuk form di dalam modal
  const [editableMqttConfig, setEditableMqttConfig] = useState<
    Partial<MqttConfig>
  >({});
  const [editableModbusConfig, setEditableModbusConfig] = useState<
    Partial<ModbusTopicsConfig>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fungsi untuk meminta konfigurasi dari service melalui MQTT
  const requestConfiguration = useCallback(() => {
    if (isReady) {
      console.log("Requesting configurations from MQTT...");
      publish(
        "mqtt_config/request",
        JSON.stringify({ action: "readConfiguration" })
      );
      publish(
        "mqtt_config_modbus/request",
        JSON.stringify({ action: "readConfiguration" })
      );
    }
  }, [isReady, publish]);

  // Efek untuk subscribe dan meminta konfigurasi saat komponen dimuat
  useEffect(() => {
    const handleMessage = (topic: string, payloadStr: string) => {
      try {
        const receivedConfig = JSON.parse(payloadStr);

        if (topic === "mqtt_config") {
          setMqttConfig(receivedConfig);
          setIsLoading(false);
        } else if (topic === "mqtt_config_modbus") {
          setModbusConfig(receivedConfig);
        } else if (topic === "service/response" && receivedConfig.result) {
          Swal.close(); // Tutup loading alert dari restart
          Swal.fire({
            icon: receivedConfig.result, // 'success' or 'error'
            title: receivedConfig.result === "success" ? "Success" : "Error",
            text: receivedConfig.message,
          });
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    };

    if (isReady) {
      subscribe("mqtt_config", handleMessage);
      subscribe("mqtt_config_modbus", handleMessage);
      subscribe("service/response", handleMessage);
      requestConfiguration();
    }

    return () => {
      if (isReady) {
        unsubscribe("mqtt_config", handleMessage);
        unsubscribe("mqtt_config_modbus", handleMessage);
        unsubscribe("service/response", handleMessage);
      }
    };
  }, [isReady, subscribe, unsubscribe, requestConfiguration]);

  const handleOpenModal = () => {
    // Salin config saat ini ke state editable untuk form
    setEditableMqttConfig({ ...mqttConfig });
    setEditableModbusConfig({ ...modbusConfig });
    setIsModalOpen(true);
  };

  const handleSaveChanges = () => {
    setIsSubmitting(true);

    // Gabungkan kedua bagian config menjadi satu payload
    const fullConfigPayload = {
      ...editableMqttConfig,
      ...editableModbusConfig,
      // Pastikan tipe data boolean benar
      enable:
        editableMqttConfig.enable === true ||
        String(editableMqttConfig.enable) === "true",
      retain:
        editableMqttConfig.retain === true ||
        String(editableMqttConfig.retain) === "true",
    };

    // Kirim update via MQTT
    publish("mqtt_config_modbus/update", JSON.stringify(fullConfigPayload));

    // Tampilkan notifikasi dan restart service setelahnya
    Swal.fire({
      icon: "info",
      title: "Configuration Sent!",
      text: "Update command has been sent. Restarting services...",
      showConfirmButton: true,
    }).then(() => {
      restartServices();
    });

    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const restartServices = () => {
    const services = [
      "MODBUS_SNMP.service",
      "mqtt_config.service",
      "modular_i2c.service",
    ];
    const command = JSON.stringify({ action: "restart", services });
    publish("service/command", command);

    Swal.fire({
      title: "Restarting Services",
      text: "Please wait...",
      icon: "info",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
  };

  const renderConfigValue = (value: any) => {
    if (typeof value === "boolean") {
      return value ? "True" : "False";
    }
    return value || <span className="text-muted-foreground">Not Set</span>;
  };

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          MQTT Broker Configuration
        </h1>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Wifi
                  size={24}
                  className={
                    connectionStatus === "Connected"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                />
                Status Konfigurasi Saat Ini
              </CardTitle>
              <Button
                onClick={handleOpenModal}
                disabled={isLoading || !isReady}
              >
                Ubah Konfigurasi
              </Button>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Status koneksi:{" "}
              <span
                className={`font-medium ${
                  connectionStatus === "Connected"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              >
                {connectionStatus}
              </span>
              . Terakhir diperbarui dari layanan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-3 text-sm text-muted-foreground">
                  Menunggu konfigurasi dari layanan...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {Object.entries(mqttConfig).map(([key, value]) => (
                  <div key={key} className="py-2">
                    <div className="font-medium text-gray-700 capitalize">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-gray-500">
                      {renderConfigValue(value)}
                    </div>
                  </div>
                ))}
                {Object.entries(modbusConfig).map(([key, value]) => (
                  <div key={key} className="py-2">
                    <div className="font-medium text-gray-700 capitalize">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-gray-500">
                      {renderConfigValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Dialog untuk Update --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Ubah Konfigurasi MQTT
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Perbarui detail koneksi MQTT broker Anda. Pastikan detail yang
                Anda masukkan benar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {Object.entries(editableMqttConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label
                    htmlFor={`mqtt-${key}`}
                    className="text-sm font-medium capitalize"
                  >
                    {key.replace(/_/g, " ")}
                  </Label>
                  {typeof value === "boolean" ? (
                    <Select
                      value={String(value)}
                      onValueChange={(val) =>
                        setEditableMqttConfig((prev) => ({
                          ...prev,
                          [key]: val === "true",
                        }))
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id={`mqtt-${key}`} className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true" className="text-sm">
                          Ya
                        </SelectItem>
                        <SelectItem value="false" className="text-sm">
                          Tidak
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`mqtt-${key}`}
                      value={value as any}
                      onChange={(e) =>
                        setEditableMqttConfig((prev) => ({
                          ...prev,
                          [key]:
                            e.target.type === "number"
                              ? parseFloat(e.target.value)
                              : e.target.value,
                        }))
                      }
                      type={typeof value === "number" ? "number" : "text"}
                      readOnly={["qos", "mac", "pub_topic"].includes(key)}
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
              {Object.entries(editableModbusConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label
                    htmlFor={`modbus-${key}`}
                    className="text-sm font-medium capitalize"
                  >
                    {key.replace(/_/g, " ")}
                  </Label>
                  <Input
                    id={`modbus-${key}`}
                    value={value as any}
                    onChange={(e) =>
                      setEditableModbusConfig((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-sm"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                className="text-sm"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Perubahan & Restart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
