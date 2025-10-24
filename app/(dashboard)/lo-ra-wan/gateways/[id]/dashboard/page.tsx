"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Router,
  Activity,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  ArrowLeft,
  RefreshCw,
  Clock,
  Signal,
  Zap,
  TrendingUp,
  TrendingDown,
  Radio,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Gateway = {
  id: string;
  gatewayId: string;
  name: string;
  description?: string;
  lastSeen: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  stats: GatewayStats[];
};

type GatewayStats = {
  id: string;
  gatewayId: string;
  timestamp: string;
  // Upstream Statistics
  rfPacketsReceived: number;
  rfPacketsOk: number;
  rfPacketsBad: number;
  rfPacketsNocrc: number;
  rfPacketsForwarded: number;
  upstreamPayloadBytes: number;
  upstreamDatagramsSent: number;
  upstreamNetworkBytes: number;
  upstreamAckRatio: number;
  crcOkRatio: number;
  crcFailRatio: number;
  noCrcRatio: number;
  // Downstream Statistics
  pullDataSent: number;
  pullAckReceived: number;
  downstreamDatagramsReceived: number;
  downstreamNetworkBytes: number;
  downstreamPayloadBytes: number;
  txOk: number;
  txErrors: number;
  downstreamAckRatio: number;
  // SX1302 Status
  counterInst: string;
  counterPps: string;
  // Beacon Status
  beaconQueued: number;
  beaconSent: number;
  beaconRejected: number;
  createdAt: string;
};

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (isOnline: boolean, lastSeen: string | null) => {
  if (!lastSeen) {
    return (
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Never
      </Badge>
    );
  }

  const lastSeenTime = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - lastSeenTime) / (1000 * 60);

  if (diffMinutes < 5) {
    return (
      <Badge variant="default" className="bg-green-500 text-white">
        <CheckCircle className="w-3 h-3 mr-1" />
        Online
      </Badge>
    );
  } else if (diffMinutes < 30) {
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Warning
      </Badge>
    );
  } else {
    return (
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    );
  }
};

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  isLoading,
}: {
  title: string;
  value: string | number;
  change?: string | null;
  icon: any;
  trend?: "up" | "down";
  isLoading: boolean;
}) => {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? "text-green-600" : "text-red-600";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <Icon className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-bold">{isLoading ? "..." : value}</div>
          {change && !isLoading && (
            <div className={`flex items-center text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {change}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SimpleChart = ({
  data,
  color = "blue",
}: {
  data: number[];
  color?: string;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-400">
        <span className="text-sm">No data available</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-end space-x-1 h-16">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 100 || 10;
        return (
          <div
            key={index}
            className={`${
              colorClasses[color as keyof typeof colorClasses] ||
              colorClasses.blue
            } rounded-t-sm flex-1 opacity-70 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(height, 5)}%` }}
            title={`${value}`}
          />
        );
      })}
    </div>
  );
};

export default function GatewayDashboard() {
  const params = useParams();
  const router = useRouter();
  const gatewayId = params.id as string;

  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [stats, setStats] = useState<GatewayStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchGatewayData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch gateway info
      const gatewayResponse = await fetch("/api/lorawan/gateways");
      if (!gatewayResponse.ok) {
        throw new Error(
          `Failed to fetch gateways: ${gatewayResponse.statusText}`
        );
      }

      const gateways = await gatewayResponse.json();
      const currentGateway = gateways.find((g: Gateway) => g.id === gatewayId);

      if (!currentGateway) {
        throw new Error("Gateway not found");
      }

      setGateway(currentGateway);

      // Fetch gateway stats
      const statsResponse = await fetch(
        `/api/lorawan/gateways/${gatewayId}/stats?hours=${timeRange}`
      );
      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch stats: ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();
      setStats(Array.isArray(statsData) ? statsData : []);

      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("Error fetching gateway data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (gatewayId) {
      fetchGatewayData();

      const interval = setInterval(fetchGatewayData, 30000);
      return () => clearInterval(interval);
    }
  }, [gatewayId, timeRange]);

  // Calculate metrics from stats
  const latestStats = stats[0] || ({} as GatewayStats);
  const previousStats = stats[1] || ({} as GatewayStats);

  const metrics = useMemo(() => {
    const current = latestStats;
    const previous = previousStats;

    const safeValue = (val: any, fallback = 0) => val || fallback;
    const safeDiff = (curr: any, prev: any) => {
      if (!prev || prev === 0) return null;
      return curr - prev;
    };

    const formatChange = (change: number | null, isPercentage = false) => {
      if (change === null) return null;
      const prefix = change >= 0 ? "+" : "";
      const suffix = isPercentage ? "%" : "";
      return `${prefix}${change.toFixed(isPercentage ? 1 : 0)}${suffix}`;
    };

    return {
      packetsReceived: {
        value: safeValue(current.rfPacketsReceived),
        change: formatChange(
          safeDiff(
            safeValue(current.rfPacketsReceived),
            safeValue(previous.rfPacketsReceived)
          )
        ),
        trend:
          safeValue(current.rfPacketsReceived) >=
          safeValue(previous.rfPacketsReceived)
            ? "up"
            : "down",
      },
      crcSuccess: {
        value: `${(safeValue(current.crcOkRatio) * 100).toFixed(1)}%`,
        change: formatChange(
          safeDiff(
            safeValue(current.crcOkRatio),
            safeValue(previous.crcOkRatio)
          ) * 100,
          true
        ),
        trend:
          safeValue(current.crcOkRatio) >= safeValue(previous.crcOkRatio)
            ? "up"
            : "down",
      },
      ackRatio: {
        value: `${(safeValue(current.upstreamAckRatio) * 100).toFixed(1)}%`,
        change: formatChange(
          safeDiff(
            safeValue(current.upstreamAckRatio),
            safeValue(previous.upstreamAckRatio)
          ) * 100,
          true
        ),
        trend:
          safeValue(current.upstreamAckRatio) >=
          safeValue(previous.upstreamAckRatio)
            ? "up"
            : "down",
      },
      dataBytes: {
        value: `${(safeValue(current.upstreamPayloadBytes) / 1024).toFixed(
          1
        )} KB`,
        change: formatChange(
          safeDiff(
            safeValue(current.upstreamPayloadBytes),
            safeValue(previous.upstreamPayloadBytes)
          ) / 1024
        ),
        trend:
          safeValue(current.upstreamPayloadBytes) >=
          safeValue(previous.upstreamPayloadBytes)
            ? "up"
            : "down",
      },
    };
  }, [latestStats, previousStats]);

  // Chart data from real stats
  const chartData = useMemo(() => {
    if (!stats || stats.length === 0) {
      return { packets: [], crc: [], ack: [] };
    }

    return {
      packets: stats
        .map((s) => s.rfPacketsReceived || 0)
        .reverse()
        .slice(-10),
      crc: stats
        .map((s) => (s.crcOkRatio || 0) * 100)
        .reverse()
        .slice(-10),
      ack: stats
        .map((s) => (s.upstreamAckRatio || 0) * 100)
        .reverse()
        .slice(-10),
    };
  }, [stats]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error Loading Gateway
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchGatewayData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !gateway) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading gateway data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/lo-ra-wan/gateways")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gateways
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {gateway?.name || `Gateway ${gateway?.gatewayId}`}
              </h1>
              <p className="text-sm text-gray-500">
                Gateway ID: {gateway?.gatewayId} • Last seen:{" "}
                {formatTimestamp(gateway?.lastSeen)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right text-sm text-gray-500">
              <p>Last updated</p>
              <p className="font-medium">{lastUpdate.toLocaleTimeString()}</p>
            </div>
            <Button
              onClick={fetchGatewayData}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Router className="h-5 w-5 text-blue-600" />
                  <span>Gateway Status</span>
                </CardTitle>
                <CardDescription>
                  Real-time gateway health and connectivity
                </CardDescription>
              </div>
              {gateway && getStatusBadge(gateway.isOnline, gateway.lastSeen)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">Last Seen</div>
                <div className="font-medium">
                  {formatTimestamp(gateway?.lastSeen)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium">
                  {gateway?.isOnline ? (
                    <span className="text-green-600">Online</span>
                  ) : (
                    <span className="text-red-600">Offline</span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Total Stats</div>
                <div className="font-medium">{stats.length} records</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Time Range</div>
                <div className="font-medium">{timeRange}h</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Packets Received"
            value={metrics.packetsReceived.value}
            change={metrics.packetsReceived.change}
            trend={metrics.packetsReceived.trend}
            icon={Radio}
            isLoading={isLoading}
          />
          <MetricCard
            title="CRC Success Rate"
            value={metrics.crcSuccess.value}
            change={metrics.crcSuccess.change}
            trend={metrics.crcSuccess.trend}
            icon={CheckCircle}
            isLoading={isLoading}
          />
          <MetricCard
            title="ACK Ratio"
            value={metrics.ackRatio.value}
            change={metrics.ackRatio.change}
            trend={metrics.ackRatio.trend}
            icon={Signal}
            isLoading={isLoading}
          />
          <MetricCard
            title="Data Throughput"
            value={metrics.dataBytes.value}
            change={metrics.dataBytes.change}
            trend={metrics.dataBytes.trend}
            icon={Activity}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Packet Activity</CardTitle>
              <CardDescription>RF packets received over time</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={chartData.packets} color="blue" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">CRC Success Rate</CardTitle>
              <CardDescription>Data integrity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={chartData.crc} color="green" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ACK Ratio</CardTitle>
              <CardDescription>Network acknowledgments</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={chartData.ack} color="purple" />
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upstream Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-4 w-4 text-green-600" />
                <span>Upstream Statistics</span>
              </CardTitle>
              <CardDescription>
                Latest data flow from devices to network server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    RF Packets Received
                  </span>
                  <span className="font-medium">
                    {latestStats.rfPacketsReceived || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">RF Packets OK</span>
                  <span className="font-medium text-green-600">
                    {latestStats.rfPacketsOk || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">RF Packets Bad</span>
                  <span className="font-medium text-red-600">
                    {latestStats.rfPacketsBad || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    RF Packets No CRC
                  </span>
                  <span className="font-medium text-yellow-600">
                    {latestStats.rfPacketsNocrc || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    Packets Forwarded
                  </span>
                  <span className="font-medium">
                    {latestStats.rfPacketsForwarded || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payload Bytes</span>
                  <span className="font-medium">
                    {(latestStats.upstreamPayloadBytes || 0).toLocaleString()}{" "}
                    bytes
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Network Bytes</span>
                  <span className="font-medium">
                    {(latestStats.upstreamNetworkBytes || 0).toLocaleString()}{" "}
                    bytes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Downstream Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span>Downstream Statistics</span>
              </CardTitle>
              <CardDescription>
                Latest data flow from network server to devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Pull Data Sent</span>
                  <span className="font-medium">
                    {latestStats.pullDataSent || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    Pull ACK Received
                  </span>
                  <span className="font-medium text-green-600">
                    {latestStats.pullAckReceived || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    Datagrams Received
                  </span>
                  <span className="font-medium">
                    {latestStats.downstreamDatagramsReceived || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">TX Success</span>
                  <span className="font-medium text-green-600">
                    {latestStats.txOk || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">TX Errors</span>
                  <span className="font-medium text-red-600">
                    {latestStats.txErrors || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Payload Bytes</span>
                  <span className="font-medium">
                    {(latestStats.downstreamPayloadBytes || 0).toLocaleString()}{" "}
                    bytes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quality Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span>Signal Quality & Performance</span>
            </CardTitle>
            <CardDescription>
              Real-time quality indicators and ratios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((latestStats.crcOkRatio || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">CRC Success</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(latestStats.crcOkRatio || 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {((latestStats.upstreamAckRatio || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Upstream ACK</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(latestStats.upstreamAckRatio || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((latestStats.downstreamAckRatio || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Downstream ACK</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(latestStats.downstreamAckRatio || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {((latestStats.crcFailRatio || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">CRC Failures</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(latestStats.crcFailRatio || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span>Recent Activity Log</span>
            </CardTitle>
            <CardDescription>
              Latest events and status changes ({stats.length} records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.length > 0 ? (
                stats.slice(0, 5).map((stat, index) => (
                  <div
                    key={stat.id || index}
                    className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        (stat.crcOkRatio || 0) > 0.95
                          ? "bg-green-400"
                          : (stat.crcOkRatio || 0) > 0.8
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm">
                        Received <strong>{stat.rfPacketsReceived || 0}</strong>{" "}
                        packets with{" "}
                        <strong>
                          {((stat.crcOkRatio || 0) * 100).toFixed(1)}%
                        </strong>{" "}
                        CRC success
                        {stat.rfPacketsBad > 0 &&
                          `, ${stat.rfPacketsBad} bad packets`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(stat.timestamp)}
                      </p>
                    </div>
                    {(stat.rfPacketsBad > 0 || stat.txErrors > 0) && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
