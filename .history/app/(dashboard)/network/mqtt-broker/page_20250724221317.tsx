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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Current Configuration</span>
                  <Wifi
                    size={20}
                    className={
                      connectionStatus === "Connected"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  />
                </CardTitle>
                <CardDescription>
                  This is the current configuration loaded on the service.
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      connectionStatus === "Connected"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenModal}
                disabled={isLoading || !isReady}
              >
                Update Configuration
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-4">
                  Waiting for configuration from service...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {Object.entries(mqttConfig).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2">
                    <span className="font-semibold capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span>{renderConfigValue(value)}</span>
                  </div>
                ))}
                {Object.entries(modbusConfig).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2">
                    <span className="font-semibold capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span>{renderConfigValue(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Dialog untuk Update --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Update MQTT Configuration</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Render form fields dynamically */}
              {Object.entries(editableMqttConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
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
                      <SelectTrigger id={key}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={key}
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
                    />
                  )}
                </div>
              ))}
              {Object.entries(editableModbusConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <Input
                    id={key}
                    value={value as any}
                    onChange={(e) =>
                      setEditableModbusConfig((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes & Restart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
