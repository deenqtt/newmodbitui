// File: components/widgets/LoRaWANDevice/LoRaWANDeviceWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Wifi, WifiOff, Clock, Database } from "lucide-react";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoRaWANDeviceConfig {
  deviceId: string;
  deviceName: string;
  refreshInterval?: number; // dalam detik, default 10
}

interface DeviceData {
  id: string;
  timestamp: string;
  data: any; // JSON data dari sensor
}

interface LoRaDevice {
  id: string;
  devEui: string;
  name: string;
  lastSeen: string | null;
  data: DeviceData[];
}

interface Props {
  config: LoRaWANDeviceConfig;
}

export const LoRaWANDeviceWidget = ({ config }: Props) => {
  const [deviceData, setDeviceData] = useState<LoRaDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshInterval = (config.refreshInterval || 10) * 1000; // Convert to milliseconds

  // Fetch data dari API
  const fetchDeviceData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/lorawan/devices/${config.deviceId}/history`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch device data");
      }

      const data: LoRaDevice = await response.json();
      setDeviceData(data);
      setLastUpdate(new Date());

      // Cek apakah device online (lastSeen dalam 5 menit terakhir)
      if (data.lastSeen) {
        const lastSeenTime = new Date(data.lastSeen);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        setIsOnline(lastSeenTime > fiveMinutesAgo);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      console.error("Error fetching LoRaWAN device data:", error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup polling untuk real-time updates
  useEffect(() => {
    fetchDeviceData();

    const interval = setInterval(fetchDeviceData, refreshInterval);

    return () => clearInterval(interval);
  }, [config.deviceId, refreshInterval]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Radio className="h-4 w-4 mr-2" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deviceData) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-destructive">
            <Radio className="h-4 w-4 mr-2" />
            Device Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load device data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestData =
    deviceData.data && deviceData.data.length > 0 ? deviceData.data[0] : null;

  // Render data sensor dalam format yang mudah dibaca
  const renderSensorData = (data: any) => {
    if (!data) return null;

    // Jika data adalah objek dengan key-value pairs
    if (typeof data === "object" && data !== null) {
      return (
        <div className="space-y-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground capitalize">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :
              </span>
              <span className="text-sm font-mono">
                {typeof value === "number"
                  ? Number(value).toFixed(2)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Jika data adalah string atau nilai sederhana
    return <div className="text-sm font-mono text-center">{String(data)}</div>;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center">
            <Radio className="h-4 w-4 mr-2" />
            {config.deviceName}
          </div>
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className="text-xs"
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" /> Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" /> Offline
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Device Info */}
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>DevEUI:</span>
            <span className="font-mono">{deviceData.devEui}</span>
          </div>
          {deviceData.lastSeen && (
            <div className="flex items-center justify-between mt-1">
              <span>Last Seen:</span>
              <span>{format(new Date(deviceData.lastSeen), "HH:mm:ss")}</span>
            </div>
          )}
        </div>

        {/* Latest Sensor Data */}
        <div>
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <Database className="h-3 w-3 mr-1" />
            Latest Data:
          </div>

          {latestData ? (
            <div className="bg-muted/30 rounded-md p-2">
              {renderSensorData(latestData.data)}
              <div className="flex items-center justify-center text-xs text-muted-foreground mt-2 pt-2 border-t">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(latestData.timestamp), "dd/MM HH:mm:ss")}
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-md p-4 text-center">
              <p className="text-xs text-muted-foreground">
                No data received yet
              </p>
            </div>
          )}
        </div>

        {/* Update Info */}
        {lastUpdate && (
          <div className="text-xs text-muted-foreground text-center">
            Updated: {format(lastUpdate, "HH:mm:ss")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
