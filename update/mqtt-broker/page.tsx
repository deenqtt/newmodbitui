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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Wifi,
  Settings,
  Server,
  KeyRound,
  Database,
  Cpu,
} from "lucide-react";

// --- Type Definitions ---
interface MqttConfigBase {
  broker_address: string;
  broker_port: number;
  username: string;
  password: string;
  mac_address?: string;
}

interface ConnectionStatus {
  status: string;
  response_time?: number;
  message?: string;
}

interface MqttConfigResponse {
  status: string;
  data: MqttConfigBase;
  connection: ConnectionStatus;
  timestamp: string;
}

// --- Helper Function ---
const formatLabel = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

// =================================================================
// Sub-Component: DisplayField
// =================================================================
const DisplayField = ({ label, value }: { label: string; value: any }) => {
  const renderValue = () => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return <span className="text-slate-400 italic">Not Set</span>;
    }
    // Mask password
    if (label.toLowerCase().includes("password") && value) {
      return <span className="font-semibold text-primary">••••••••</span>;
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
// Sub-Component: ConfigSkeleton
// =================================================================
const ConfigSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
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
// Sub-Component: ConnectionStatusBadge
// =================================================================
const ConnectionStatusBadge = ({
  connection,
}: {
  connection: ConnectionStatus;
}) => {
  const isConnected = connection.status === "connected";

  return (
    <div className="flex items-center gap-2">
      <Wifi
        size={20}
        className={isConnected ? "text-green-500" : "text-red-500"}
      />
      <div className="flex flex-col">
        <span
          className={`text-sm font-bold ${
            isConnected ? "text-green-600" : "text-red-600"
          }`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        {connection.response_time && (
          <span className="text-xs text-muted-foreground">
            Response: {connection.response_time}ms
          </span>
        )}
      </div>
    </div>
  );
};

// =================================================================
// Sub-Component: MqttConfigCard (Reusable untuk Modbus & Modular)
// =================================================================
interface MqttConfigCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  config: MqttConfigBase | null;
  connection: ConnectionStatus | null;
  isLoading: boolean;
  onEditClick: () => void;
  isReady: boolean;
}

const MqttConfigCard = ({
  title,
  description,
  icon,
  config,
  connection,
  isLoading,
  onEditClick,
  isReady,
}: MqttConfigCardProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {connection && <ConnectionStatusBadge connection={connection} />}
            <Button
              onClick={onEditClick}
              disabled={isLoading || !isReady}
              className="w-full sm:w-auto"
              size="sm"
            >
              <Settings className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ConfigSkeleton />
        ) : config ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(config)
              .filter(([key]) => key !== "mac_address") // Hide MAC from grid
              .map(([key, value]) => (
                <DisplayField key={key} label={key} value={value} />
              ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No configuration data available
          </div>
        )}
      </CardContent>
      {config?.mac_address && !isLoading && (
        <CardFooter className="flex-col items-start gap-1 border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">Device MAC Address</p>
          <p className="font-mono text-sm font-semibold">
            {config.mac_address}
          </p>
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
  title: string;
  initialConfig: MqttConfigBase | null;
  onSave: (newConfig: MqttConfigBase) => void;
  isSubmitting: boolean;
}

const ConfigEditDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialConfig,
  onSave,
  isSubmitting,
}: ConfigEditDialogProps) => {
  const [editableConfig, setEditableConfig] = useState<MqttConfigBase>({
    broker_address: "",
    broker_port: 1883,
    username: "",
    password: "",
  });

  useEffect(() => {
    if (initialConfig && isOpen) {
      setEditableConfig({
        broker_address: initialConfig.broker_address || "",
        broker_port: initialConfig.broker_port || 1883,
        username: initialConfig.username || "",
        password: initialConfig.password || "",
      });
    }
  }, [initialConfig, isOpen]);

  const handleChange = (key: keyof MqttConfigBase, value: string | number) => {
    setEditableConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveClick = () => {
    const finalConfig = {
      ...editableConfig,
      broker_port: Number(editableConfig.broker_port),
    };
    onSave(finalConfig);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit {title}</DialogTitle>
          <DialogDescription>
            Update MQTT broker connection details. Only modify broker address,
            port, username, and password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Broker Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Server size={20} /> Broker Settings
            </h3>
            <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="broker_address">Broker Address</Label>
                <Input
                  id="broker_address"
                  value={editableConfig.broker_address}
                  onChange={(e) =>
                    handleChange("broker_address", e.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="localhost or IP address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker_port">Broker Port</Label>
                <Input
                  id="broker_port"
                  type="number"
                  value={editableConfig.broker_port}
                  onChange={(e) => handleChange("broker_port", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="1883"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound size={20} /> Authentication
            </h3>
            <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editableConfig.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Leave empty if not required"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={editableConfig.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Leave empty if not required"
                />
              </div>
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
          <Button onClick={handleSaveClick} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
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

  // State untuk Modbus Config
  const [modbusConfig, setModbusConfig] = useState<MqttConfigBase | null>(null);
  const [modbusConnection, setModbusConnection] =
    useState<ConnectionStatus | null>(null);
  const [isModbusLoading, setIsModbusLoading] = useState(true);
  const [isModbusModalOpen, setIsModbusModalOpen] = useState(false);

  // State untuk Modular Config
  const [modularConfig, setModularConfig] = useState<MqttConfigBase | null>(
    null
  );
  const [modularConnection, setModularConnection] =
    useState<ConnectionStatus | null>(null);
  const [isModularLoading, setIsModularLoading] = useState(true);
  const [isModularModalOpen, setIsModularModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to response topics
  useEffect(() => {
    if (!isReady) return;

    const handleModbusResponse = (topic: string, payloadStr: string) => {
      try {
        const response: MqttConfigResponse = JSON.parse(payloadStr);
        console.log("Modbus response:", response);

        if (response.status === "success" && response.data) {
          setModbusConfig(response.data);
          setModbusConnection(response.connection);
        }
        setIsModbusLoading(false);
      } catch (error) {
        console.error("Error parsing Modbus MQTT response:", error);
        setIsModbusLoading(false);
      }
    };

    const handleModularResponse = (topic: string, payloadStr: string) => {
      try {
        const response: MqttConfigResponse = JSON.parse(payloadStr);
        console.log("Modular response:", response);

        if (response.status === "success" && response.data) {
          setModularConfig(response.data);
          setModularConnection(response.connection);
        }
        setIsModularLoading(false);
      } catch (error) {
        console.error("Error parsing Modular MQTT response:", error);
        setIsModularLoading(false);
      }
    };

    // Subscribe to both response topics
    subscribe("mqtt_config/modbus/response", handleModbusResponse);
    subscribe("mqtt_config/modular/response", handleModularResponse);

    // Set timeout untuk loading
    const timer = setTimeout(() => {
      setIsModbusLoading(false);
      setIsModularLoading(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      unsubscribe("mqtt_config/modbus/response", handleModbusResponse);
      unsubscribe("mqtt_config/modular/response", handleModularResponse);
    };
  }, [isReady, subscribe, unsubscribe]);

  // Handle save Modbus config
  const handleSaveModbus = (newConfig: MqttConfigBase) => {
    setIsSubmitting(true);

    const payload = {
      command: "updateMqttModbus",
      data: {
        broker_address: newConfig.broker_address,
        broker_port: newConfig.broker_port,
        username: newConfig.username,
        password: newConfig.password,
      },
    };

    publish("mqtt_config/modbus/command", JSON.stringify(payload));

    setIsModbusModalOpen(false);
    setIsSubmitting(false);

    Swal.fire({
      icon: "success",
      title: "Modbus Config Updated!",
      text: "MQTT configuration has been updated successfully.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Handle save Modular config
  const handleSaveModular = (newConfig: MqttConfigBase) => {
    setIsSubmitting(true);

    const payload = {
      command: "updateMqttModular",
      data: {
        broker_address: newConfig.broker_address,
        broker_port: newConfig.broker_port,
        username: newConfig.username,
        password: newConfig.password,
      },
    };

    publish("mqtt_config/modular/command", JSON.stringify(payload));

    setIsModularModalOpen(false);
    setIsSubmitting(false);

    Swal.fire({
      icon: "success",
      title: "Modular Config Updated!",
      text: "MQTT configuration has been updated successfully.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          MQTT Broker Configuration
        </h1>
        <p className="text-muted-foreground">
          Manage MQTT broker settings for Modbus and Modular services.
        </p>
      </div>

      <Tabs defaultValue="modbus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="modbus" className="flex items-center gap-2">
            <Database size={16} />
            Modbus SNMP
          </TabsTrigger>
          <TabsTrigger value="modular" className="flex items-center gap-2">
            <Cpu size={16} />
            Modular I2C
          </TabsTrigger>
        </TabsList>

        {/* Modbus Tab */}
        <TabsContent value="modbus" className="space-y-4">
          <MqttConfigCard
            title="Modbus SNMP MQTT Configuration"
            description="MQTT broker settings for Modbus and SNMP devices"
            icon={<Database size={28} className="text-blue-500" />}
            config={modbusConfig}
            connection={modbusConnection}
            isLoading={isModbusLoading}
            isReady={isReady ?? false}
            onEditClick={() => setIsModbusModalOpen(true)}
          />
        </TabsContent>

        {/* Modular Tab */}
        <TabsContent value="modular" className="space-y-4">
          <MqttConfigCard
            title="Modular I2C MQTT Configuration"
            description="MQTT broker settings for I2C modular devices"
            icon={<Cpu size={28} className="text-green-500" />}
            config={modularConfig}
            connection={modularConnection}
            isLoading={isModularLoading}
            isReady={isReady ?? false}
            onEditClick={() => setIsModularModalOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      <ConfigEditDialog
        isOpen={isModbusModalOpen}
        onOpenChange={setIsModbusModalOpen}
        title="Modbus SNMP Configuration"
        initialConfig={modbusConfig}
        onSave={handleSaveModbus}
        isSubmitting={isSubmitting}
      />

      <ConfigEditDialog
        isOpen={isModularModalOpen}
        onOpenChange={setIsModularModalOpen}
        title="Modular I2C Configuration"
        initialConfig={modularConfig}
        onSave={handleSaveModular}
        isSubmitting={isSubmitting}
      />
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
