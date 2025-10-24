// File: components/network/SnmpSettingsCard.tsx
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
import { Settings, Info } from "lucide-react";

interface SnmpSettings {
  [key: string]: any;
}

interface SnmpSettingsCardProps {
  settings: SnmpSettings;
  status: string;
  isLoading: boolean;
  onSettingsChange: (settings: SnmpSettings) => void;
  onSave: () => void;
}

export function SnmpSettingsCard({
  settings,
  status,
  isLoading,
  onSettingsChange,
  onSave,
}: SnmpSettingsCardProps) {
  const statusVariant =
    status === "Active"
      ? "default"
      : status === "Checking..."
      ? "secondary"
      : "secondary";

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace("Snmp", "SNMP");
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Settings size={24} /> SNMP Settings
        </CardTitle>
        <div className="flex items-center gap-2">
          <CardDescription>
            Configure SNMP agent parameters for network monitoring.
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
        ) : Object.keys(settings).length > 0 ? (
          Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{formatKey(key)}</Label>
              <Input
                id={key}
                value={value ?? ""}
                type={typeof value === "number" ? "number" : "text"}
                onChange={(e) =>
                  onSettingsChange({ ...settings, [key]: e.target.value })
                }
              />
            </div>
          ))
        ) : (
          <div className="col-span-full flex items-center gap-2 rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-slate-800/50">
            <Info size={16} />
            <span>Settings data not yet available from the service.</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={onSave}
          disabled={isLoading || Object.keys(settings).length === 0}
        >
          Save SNMP Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
