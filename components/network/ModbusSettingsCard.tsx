// File: components/network/ModbusSettingsCard.tsx
"use client";

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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Rss, Info } from "lucide-react";

interface ModbusSettings {
  modbusTCP_IP: string;
  modbusTCP_Port: number | string;
}

interface ModbusSettingsCardProps {
  settings: ModbusSettings;
  status: string;
  isLoading: boolean;
  onSettingsChange: (settings: ModbusSettings) => void;
  onSave: () => void;
}

export function ModbusSettingsCard({
  settings,
  status,
  isLoading,
  onSettingsChange,
  onSave,
}: ModbusSettingsCardProps) {
  const statusVariant =
    status === "Connected"
      ? "default"
      : status === "Checking..."
      ? "secondary"
      : "destructive";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Rss size={24} /> MODBUS TCP Settings
        </CardTitle>
        <div className="flex items-center gap-2">
          <CardDescription>
            Configure IP address and port for the MODBUS TCP server.
          </CardDescription>
          <Badge variant={statusVariant}>{status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="modbus_ip">MODBUS TCP IP Address</Label>
              <Input
                id="modbus_ip"
                value={settings.modbusTCP_IP}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    modbusTCP_IP: e.target.value,
                  })
                }
                placeholder="e.g., 192.168.0.100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modbus_port">MODBUS TCP Port</Label>
              <Input
                id="modbus_port"
                type="number"
                value={settings.modbusTCP_Port}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    modbusTCP_Port: e.target.value,
                  })
                }
                placeholder="e.g., 502"
              />
            </div>
          </>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={onSave} disabled={isLoading}>
          Save MODBUS Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
