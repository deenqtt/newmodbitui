// File: app/(dashboard)/network/mqtt-broker/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { useMqtt, MqttProvider } from "@/contexts/MqttContext";

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
import { Loader2, Wifi, Settings, FileText } from "lucide-react";

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

type CombinedConfig = Partial<MqttConfig & ModbusTopicsConfig>;

// --- Helper Function ---
const formatLabel = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

// =================================================================
// Sub-Component: ConfigItem (Untuk menampilkan satu baris config)
// =================================================================
const ConfigItem = ({ label, value }: { label: string; value: any }) => {
  const renderValue = () => {
    if (typeof value === "boolean") {
      return value ? "Enabled" : "Disabled";
    }
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">Not Set</span>;
    }
    return String(value);
  };

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-gray-700">{formatLabel(label)}</p>
      <p className="text-sm text-gray-500">{renderValue()}</p>
    </div>
  );
};

// =================================================================
// Sub-Component: ConfigDisplayCard (Kartu untuk menampilkan semua config)
// =================================================================
interface ConfigDisplayCardProps {
  config: CombinedConfig;
  connectionStatus: string;
  isLoading: boolean;
  onEditClick: () => void;
  isReady: boolean;
}

const ConfigDisplayCard = ({
  config,
  connectionStatus,
  isLoading,
  onEditClick,
  isReady,
}: ConfigDisplayCardProps) => {
  return (
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
            Current Configuration
          </CardTitle>
          <Button onClick={onEditClick} disabled={isLoading || !isReady}>
            <Settings className="mr-2 h-4 w-4" />
            Change Configuration
          </Button>
        </div>
        <CardDescription>
          Connection status:{" "}
          <span
            className={`font-medium ${
              connectionStatus === "Connected"
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {connectionStatus}
          </span>
          . Last updated from service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-4 text-muted-foreground">
              Fetching configuration from service...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(config).map(([key, value]) => (
              <ConfigItem key={key} label={key} value={value} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =================================================================
// Sub-Component: ConfigEditDialog (Dialog untuk mengedit config)
// =================================================================
interface ConfigEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: CombinedConfig;
  onSave: (newConfig: CombinedConfig) => void;
  isSubmitting: boolean;
}

const ConfigEditDialog = ({
  isOpen,
  onOpenChange,
  initialConfig,
  onSave,
  isSubmitting,
}: ConfigEditDialogProps) => {
  const [editableConfig, setEditableConfig] =
    useState<CombinedConfig>(initialConfig);

  useEffect(() => {
    // Reset form state when initialConfig changes (e.g., when dialog is reopened)
    setEditableConfig(initialConfig);
  }, [initialConfig]);

  const handleChange = (key: string, value: string | boolean | number) => {
    setEditableConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveChangesClick = () => {
    // Ensure boolean values are correctly typed before saving
    const finalConfig = {
      ...editableConfig,
      enable: String(editableConfig.enable) === "true",
      retain: String(editableConfig.retain) === "true",
    };
    onSave(finalConfig);
  };

  const renderFormField = (key: string, value: any) => {
    const isReadOnly = ["qos", "mac", "pub_topic"].includes(key);

    if (typeof value === "boolean") {
      return (
        <Select
          value={String(value)}
          onValueChange={(val) => handleChange(key, val === "true")}
          disabled={isSubmitting}
        >
          <SelectTrigger id={`config-${key}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Enable</SelectItem>
            <SelectItem value="false">Disable</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        id={`config-${key}`}
        value={value ?? ""}
        onChange={(e) =>
          handleChange(
            key,
            typeof value === "number"
              ? parseFloat(e.target.value)
              : e.target.value
          )
        }
        type={typeof value === "number" ? "number" : "text"}
        readOnly={isReadOnly}
        disabled={isSubmitting}
        className={isReadOnly ? "bg-gray-100" : ""}
      />
    );
  };

  const mqttEntries = Object.entries(editableConfig).filter(
    ([k]) => k in (initialConfig as MqttConfig)
  );
  const modbusEntries = Object.entries(editableConfig).filter(
    ([k]) => k in (initialConfig as ModbusTopicsConfig)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit MQTT Configuration</DialogTitle>
          <DialogDescription>
            Update your MQTT broker connection details below. Please ensure the
            details are correct.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4 py-4 space-y-6">
          <fieldset className="border p-4 rounded-lg">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings size={16} /> Broker Settings
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {mqttEntries.map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`config-${key}`}>{formatLabel(key)}</Label>
                  {renderFormField(key, value)}
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-lg">
            <legend className="px-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText size={16} /> Topic Settings
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {modbusEntries.map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`config-${key}`}>{formatLabel(key)}</Label>
                  {renderFormField(key, value)}
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveChangesClick} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes & Restart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// --- Komponen Halaman Utama ---
// =================================================================
export default function MqttBrokerPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();

  const [config, setConfig] = useState<CombinedConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    const handleMessage = (topic: string, payloadStr: string) => {
      try {
        const receivedData = JSON.parse(payloadStr);

        if (topic === "mqtt_config" || topic === "mqtt_config_modbus") {
          setConfig((prev) => ({ ...prev, ...receivedData }));
          setIsLoading(false);
        } else if (topic === "service/response" && receivedData.result) {
          Swal.close(); // Close loading alert
          Swal.fire({
            icon: receivedData.result,
            title: receivedData.result === "success" ? "Success!" : "Error!",
            text: receivedData.message,
            timer: 3000,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    };

    if (isReady) {
      const topics = ["mqtt_config", "mqtt_config_modbus", "service/response"];
      topics.forEach((topic) => subscribe(topic, handleMessage));
      requestConfiguration();

      return () => {
        topics.forEach((topic) => unsubscribe(topic, handleMessage));
      };
    }
  }, [isReady, subscribe, unsubscribe, requestConfiguration]);

  const restartServices = () => {
    const services = [
      "MODBUS_SNMP.service",
      "mqtt_config.service",
      "modular_i2c.service",
    ];
    publish("service/command", JSON.stringify({ action: "restart", services }));

    Swal.fire({
      title: "Restarting Services",
      text: "Please wait while services are being restarted...",
      icon: "info",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
  };

  const handleSaveChanges = (newConfig: CombinedConfig) => {
    setIsSubmitting(true);

    // Publish the updated configuration
    publish("mqtt_config_modbus/update", JSON.stringify(newConfig));

    setIsModalOpen(false);
    setIsSubmitting(false);

    // Show confirmation and then restart
    Swal.fire({
      icon: "info",
      title: "Configuration Sent!",
      text: "The update command has been sent. Services will now restart.",
      showConfirmButton: true,
      timer: 2500,
    }).then((result) => {
      // Restart services whether the user clicks OK or the timer runs out
      restartServices();
    });
  };

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <ConfigDisplayCard
          config={config}
          connectionStatus={connectionStatus}
          isLoading={isLoading}
          isReady={isReady ?? false}
          onEditClick={() => setIsModalOpen(true)}
        />

        <ConfigEditDialog
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          initialConfig={config}
          onSave={handleSaveChanges}
          isSubmitting={isSubmitting}
        />
      </div>
    </main>
  );
}

export default function DevicesExternalPage() {
  return (
    <MqttProvider>
      <MqttBrokerPage />
    </MqttProvider>
  );
}
