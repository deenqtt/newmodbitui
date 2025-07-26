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
  CardFooter,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Wifi,
  Settings,
  FileText,
  Server,
  KeyRound,
} from "lucide-react";

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
// Sub-Component: DisplayField (Menampilkan satu baris info config)
// =================================================================
const DisplayField = ({ label, value }: { label: string; value: any }) => {
  const renderValue = () => {
    if (typeof value === "boolean") {
      return (
        <span
          className={`font-semibold ${
            value ? "text-green-600" : "text-red-600"
          }`}
        >
          {value ? "Enabled" : "Disabled"}
        </span>
      );
    }
    if (value === null || value === undefined || String(value).trim() === "") {
      return <span className="text-slate-400 italic">Not Set</span>;
    }
    return <span className="font-semibold text-primary">{String(value)}</span>;
  };

  return (
    <div className="flex flex-col space-y-1 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-sm text-muted-foreground">{formatLabel(label)}</p>
      <div>{renderValue()}</div>
    </div>
  );
};

// =================================================================
// Sub-Component: ConfigSkeleton (Efek loading)
// =================================================================
const ConfigSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 9 }).map((_, index) => (
      <div
        key={index}
        className="flex flex-col space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
      >
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    ))}
  </div>
);

// =================================================================
// Sub-Component: ConfigDisplayCard
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
  const isConnected = connectionStatus === "Connected";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Wifi
              size={28}
              className={isConnected ? "text-green-500" : "text-red-500"}
            />
            <div>
              <CardTitle className="text-xl">Current Configuration</CardTitle>
              <CardDescription>
                Connection Status:{" "}
                <span
                  className={`font-bold ${
                    isConnected ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {connectionStatus}
                </span>
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onEditClick}
            disabled={isLoading || !isReady}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            Change Configuration
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ConfigSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(config)
              .filter(([key]) => key !== "mac") // Hide MAC from the main grid
              .map(([key, value]) => (
                <DisplayField key={key} label={key} value={value} />
              ))}
          </div>
        )}
      </CardContent>
      {config.mac && !isLoading && (
        <CardFooter className="flex-col items-start gap-1 border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">Device MAC Address</p>
          <p className="font-mono text-sm font-semibold">{config.mac}</p>
        </CardFooter>
      )}
    </Card>
  );
};

// =================================================================
// Sub-Component: ConfigEditDialog
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
  const [editableConfig, setEditableConfig] = useState(initialConfig);

  useEffect(() => {
    setEditableConfig(initialConfig);
  }, [initialConfig, isOpen]);

  const handleChange = (key: string, value: string | boolean | number) => {
    setEditableConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveChangesClick = () => {
    const finalConfig = {
      ...editableConfig,
      enable: String(editableConfig.enable) === "true",
      retain: String(editableConfig.retain) === "true",
      broker_port: Number(editableConfig.broker_port),
      pub_interval: Number(editableConfig.pub_interval),
    };
    onSave(finalConfig);
  };

  const renderFormField = (key: string, value: any) => {
    const isReadOnly = ["mac", "pub_topic", "qos"].includes(key);

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
        className={
          isReadOnly
            ? "cursor-not-allowed bg-slate-100 focus-visible:ring-transparent dark:bg-slate-800"
            : ""
        }
      />
    );
  };

  // Group fields for better structure in the dialog
  const brokerFields = [
    "enable",
    "broker_address",
    "broker_port",
    "pub_interval",
  ];
  const authFields = ["username", "password"];
  const topicFields = Object.keys(initialConfig).filter(
    (k) => !brokerFields.includes(k) && !authFields.includes(k)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Configuration</DialogTitle>
          <DialogDescription>
            Update your MQTT broker connection details. Changes will require a
            service restart.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-6 overflow-y-auto p-1 pr-4">
          {/* Section: Broker Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Server size={20} /> Broker Settings
            </h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 rounded-md border p-4 sm:grid-cols-2">
              {brokerFields
                .filter((key) => key in editableConfig)
                .map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`config-${key}`}>{formatLabel(key)}</Label>
                    {renderFormField(
                      key,
                      editableConfig[key as keyof CombinedConfig]
                    )}
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Section: Authentication */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound size={20} /> Authentication
            </h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 rounded-md border p-4 sm:grid-cols-2">
              {authFields
                .filter((key) => key in editableConfig)
                .map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`config-${key}`}>{formatLabel(key)}</Label>
                    {renderFormField(
                      key,
                      editableConfig[key as keyof CombinedConfig]
                    )}
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Section: Topic Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <FileText size={20} /> Topic Settings
            </h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 rounded-md border p-4 sm:grid-cols-2">
              {topicFields
                .filter((key) => key in editableConfig)
                .map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`config-${key}`}>{formatLabel(key)}</Label>
                    {renderFormField(
                      key,
                      editableConfig[key as keyof CombinedConfig]
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveChangesClick} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Restart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// --- Main Page Component ---
// =================================================================
function MqttBrokerPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();

  const [config, setConfig] = useState<CombinedConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestConfiguration = useCallback(() => {
    if (isReady) {
      console.log("Requesting configurations from MQTT...");
      publish("mqtt_config/request", JSON.stringify({ action: "read" }));
      publish("mqtt_config_modbus/request", JSON.stringify({ action: "read" }));
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

      // Set a timeout to stop loading if no data is received
      const timer = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          console.warn("Timeout: No configuration data received.");
        }
      }, 5000); // 5 seconds timeout

      return () => {
        clearTimeout(timer);
        topics.forEach((topic) => unsubscribe(topic, handleMessage));
      };
    }
  }, [isReady, subscribe, unsubscribe, requestConfiguration, isLoading]);

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

    // Split config to publish to respective topics
    const mqttConfigKeys: (keyof MqttConfig)[] = [
      "enable",
      "pub_interval",
      "broker_address",
      "broker_port",
      "username",
      "password",
      "qos",
      "retain",
      "pub_topic",
      "mac",
    ];
    const modbusTopicKeys: (keyof ModbusTopicsConfig)[] = [
      "sub_topic_system",
      "sub_topic_modbusRTU",
      "sub_topic_modbusTCP",
      "sub_topic_snmp",
      "publish_failed_data_modbusrtu",
    ];

    const mqttConfigPayload: Partial<MqttConfig> = {};
    const modbusTopicsPayload: Partial<ModbusTopicsConfig> = {};

    Object.keys(newConfig).forEach((key) => {
      if (mqttConfigKeys.includes(key as keyof MqttConfig)) {
        mqttConfigPayload[key as keyof MqttConfig] = newConfig[
          key as keyof CombinedConfig
        ] as any;
      }
      if (modbusTopicKeys.includes(key as keyof ModbusTopicsConfig)) {
        modbusTopicsPayload[key as keyof ModbusTopicsConfig] = newConfig[
          key as keyof CombinedConfig
        ] as any;
      }
    });

    publish("mqtt_config/update", JSON.stringify(mqttConfigPayload));
    publish("mqtt_config_modbus/update", JSON.stringify(modbusTopicsPayload));

    setIsModalOpen(false);
    setIsSubmitting(false);

    Swal.fire({
      icon: "info",
      title: "Configuration Sent!",
      text: "The update command has been sent. Services will now restart.",
      showConfirmButton: true,
      timer: 2500,
    }).then(() => {
      restartServices();
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">MQTT Broker</h1>
        <p className="text-muted-foreground">
          View and manage MQTT broker settings for your services.
        </p>
      </div>

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
    </div>
  );
}

export default function MqttPage() {
  return (
    <MqttProvider>
      <MqttBrokerPage />
    </MqttProvider>
  );
}
