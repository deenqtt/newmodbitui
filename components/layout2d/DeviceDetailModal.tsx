"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  Database,
  Settings,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useMqtt } from "@/contexts/MqttContext";

interface KeyConfig {
  key: string;
  units?: string;
  multiply?: number;
  customName?: string;
}

interface Layout2DDataPoint {
  id: string;
  layoutId: string;
  deviceUniqId: string;
  selectedKeys?: KeyConfig[];
  selectedKey?: string;
  units?: string | null;
  multiply?: number;
  customName: string;
  positionX: number;
  positionY: number;
  fontSize?: number;
  color?: string;
  iconName?: string | null;
  iconColor?: string | null;
  showIcon?: boolean | null;
  displayLayout?: "vertical" | "horizontal" | "grid";
  device: {
    uniqId: string;
    name: string;
    topic: string;
    lastPayload?: string | null;
  };
}

interface DeviceDetailModalProps {
  dataPoint: Layout2DDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeviceDetailModal({
  dataPoint,
  isOpen,
  onClose,
}: DeviceDetailModalProps) {
  const [currentData, setCurrentData] = useState<Record<string, any>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { connectionStatus } = useMqtt();


  // Parse last payload for initial data
  useEffect(() => {
    if (dataPoint?.device.lastPayload) {
      try {
        const payload = JSON.parse(dataPoint.device.lastPayload);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        setCurrentData(innerPayload);
      } catch (error) {
        console.error("Failed to parse device payload:", error);
      }
    }
  }, [dataPoint]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";

    if (typeof value === "boolean") {
      return value ? "True" : "False";
    }

    if (typeof value === "number") {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }

    return String(value);
  };

  const getValueColor = (value: any): string => {
    if (typeof value === "boolean") {
      return value ? "text-green-600" : "text-red-600";
    }
    if (typeof value === "number") {
      return "text-blue-600";
    }
    return "text-gray-900";
  };

  if (!dataPoint) return null;

  const allKeys = dataPoint.selectedKeys || [];
  if (dataPoint.selectedKey) {
    allKeys.push({
      key: dataPoint.selectedKey,
      units: dataPoint.units || undefined,
      multiply: dataPoint.multiply || 1,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {connectionStatus === "Connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span>Device Details</span>
            </div>
            <Badge variant="outline" className="ml-auto">
              {dataPoint.customName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Device Name
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium">{dataPoint.device.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(dataPoint.device.name, "name")
                      }
                    >
                      {copiedField === "name" ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Unique ID
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm">
                      {dataPoint.device.uniqId}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(dataPoint.device.uniqId, "uniqId")
                      }
                    >
                      {copiedField === "uniqId" ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    MQTT Topic
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm">
                      {dataPoint.device.topic}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(dataPoint.device.topic, "topic")
                      }
                    >
                      {copiedField === "topic" ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Connection Status
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {connectionStatus === "Connected" ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Point Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Point Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Display Name
                  </label>
                  <p className="mt-1 font-medium">{dataPoint.customName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Position
                  </label>
                  <p className="mt-1">
                    X: {dataPoint.positionX.toFixed(1)}%, Y:{" "}
                    {dataPoint.positionY.toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Font Size
                  </label>
                  <p className="mt-1">{dataPoint.fontSize || 14}px</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Display Layout
                  </label>
                  <p className="mt-1 capitalize">
                    {dataPoint.displayLayout || "vertical"}
                  </p>
                </div>
              </div>

              {dataPoint.iconName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Icon
                  </label>
                  <p className="mt-1">{dataPoint.iconName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Data Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Data Values
                <Badge variant="outline" className="ml-auto">
                  {allKeys.length} key{allKeys.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allKeys.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No data keys configured
                </p>
              ) : (
                <div className="space-y-3">
                  {allKeys.map((keyConfig, index) => {
                    const rawValue = currentData[keyConfig.key];
                    const displayName = keyConfig.customName || keyConfig.key;
                    const processedValue = formatValue(rawValue);
                    const valueColor = getValueColor(rawValue);

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {displayName}
                            </span>
                            {keyConfig.units && (
                              <Badge variant="secondary" className="text-xs">
                                {keyConfig.units}
                              </Badge>
                            )}
                            {keyConfig.multiply && keyConfig.multiply !== 1 && (
                              <Badge variant="outline" className="text-xs">
                                ×{keyConfig.multiply}
                              </Badge>
                            )}
                          </div>
                          <div
                            className={`text-lg font-bold ${valueColor} mt-1`}
                          >
                            {processedValue}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            copyToClipboard(String(rawValue), keyConfig.key)
                          }
                        >
                          {copiedField === keyConfig.key ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw JSON Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Raw JSON Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{JSON.stringify(currentData, null, 2)}</pre>
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(currentData, null, 2),
                      "json"
                    )
                  }
                >
                  {copiedField === "json" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
