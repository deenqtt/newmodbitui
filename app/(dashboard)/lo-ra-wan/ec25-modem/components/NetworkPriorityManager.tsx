// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/NetworkPriorityManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  Smartphone,
  Server,
  ArrowUpDown,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { getEc25ListenerService } from "@/lib/services/ec25-listener";
import type { NetworkConnection } from "@/lib/services/ec25-listener";

interface NetworkPriorityManagerProps {
  isConnected: boolean;
}

export default function NetworkPriorityManager({
  isConnected,
}: NetworkPriorityManagerProps) {
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConnection, setEditingConnection] = useState<string | null>(
    null
  );
  const [newMetric, setNewMetric] = useState<number>(100);
  const [updateStatus, setUpdateStatus] = useState<{ [key: string]: string }>(
    {}
  );

  const ec25Service = getEc25ListenerService();

  // Load connections
  const loadConnections = async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      await ec25Service.listNetworkConnections();
    } catch (error) {
      console.error("Failed to load connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to network connections updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = ec25Service.subscribe(
      "network_connections",
      (data: NetworkConnection[]) => {
        setConnections(data);
      }
    );

    // Load initial data
    loadConnections();

    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  // Update metric for a connection
  const updateMetric = async (connectionName: string, metric: number) => {
    if (metric < 0 || metric > 1000) return;

    setUpdateStatus((prev) => ({ ...prev, [connectionName]: "updating" }));

    try {
      await ec25Service.setNetworkMetric(connectionName, metric);
      setUpdateStatus((prev) => ({ ...prev, [connectionName]: "success" }));

      // Clear success status after 2 seconds
      setTimeout(() => {
        setUpdateStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[connectionName];
          return newStatus;
        });
      }, 2000);
    } catch (error) {
      console.error("Failed to update metric:", error);
      setUpdateStatus((prev) => ({ ...prev, [connectionName]: "error" }));
    }
  };

  // Get icon based on connection type
  const getConnectionIcon = (type: string) => {
    if (type.includes("wireless")) return <Wifi className="w-4 h-4" />;
    if (type.includes("ethernet")) return <Smartphone className="w-4 h-4" />;
    return <Server className="w-4 h-4" />;
  };

  // Get connection type label
  const getConnectionTypeLabel = (type: string) => {
    if (type.includes("wireless")) return "Wi-Fi";
    if (type.includes("ethernet")) return "Ethernet";
    return type;
  };

  // Filter important connections only
  const importantConnections = connections.filter(
    (conn) => conn.type.includes("wireless") || conn.type.includes("ethernet")
  );

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <ArrowUpDown className="w-5 h-5" />
          <span>Network Priority Manager</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConnections}
          disabled={isLoading || !isConnected}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Not connected to modem service</p>
          </div>
        ) : importantConnections.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading network connections...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {importantConnections.map((conn) => (
              <div
                key={conn.uuid}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    {getConnectionIcon(conn.type)}
                  </div>
                  <div>
                    <div className="font-medium">{conn.name}</div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Badge variant="secondary">
                        {getConnectionTypeLabel(conn.type)}
                      </Badge>
                      {conn.device && (
                        <span className="font-mono">{conn.device}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Runtime Info */}
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {conn.runtime?.ip || "No IP"}
                    </div>
                    <div className="text-slate-500">
                      Metric: {conn.runtime?.metric ?? "auto"}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm">
                      <div className="text-slate-500">Config</div>
                      <div className="font-medium">
                        {conn.config?.metric !== undefined
                          ? typeof conn.config.metric === "number"
                            ? conn.config.metric
                            : conn.config.metric === -1
                            ? "auto"
                            : conn.config.metric
                          : "auto"}
                      </div>
                    </div>

                    {/* Edit Button */}
                    {editingConnection === conn.name ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={newMetric}
                          onChange={(e) => setNewMetric(Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            updateMetric(conn.name, newMetric);
                            setEditingConnection(null);
                          }}
                          className="h-8"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingConnection(null)}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingConnection(conn.name);
                          setNewMetric(
                            conn.config?.metric !== undefined &&
                              typeof conn.config.metric === "number"
                              ? conn.config.metric
                              : 100
                          );
                        }}
                        className="h-8"
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {updateStatus[conn.name] === "updating" && (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {updateStatus[conn.name] === "success" && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {updateStatus[conn.name] === "error" && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}

            {/* Priority Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Priority Guide:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <span className="font-medium">
                        Lower number = Higher priority
                      </span>
                    </li>
                    <li>Recommended: Wi-Fi (10-50), Modem (100-200)</li>
                    <li>Default values: Wi-Fi (600), Modem (auto)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
