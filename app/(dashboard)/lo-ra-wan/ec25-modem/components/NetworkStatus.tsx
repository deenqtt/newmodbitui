// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/NetworkStatus.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Signal,
  Wifi,
  Activity,
  Globe,
  TowerControl,
  Radio,
  BarChart3,
  ArrowUpDown,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import NetworkPriorityManager from "./NetworkPriorityManager";

interface NetworkStatusProps {
  data: {
    connected: boolean;
    network: {
      operator?: string;
      registration_status?: string;
      network_type?: string;
      signal_strength?: number;
      signal_quality?: number;
    };
    signal_detailed?: any;
  };
  isConnected: boolean;
}

export default function NetworkStatus({
  data,
  isConnected,
}: NetworkStatusProps) {
  const getSignalPercent = () => {
    const strength = data.network.signal_strength || -113;
    return Math.max(0, Math.min(100, ((strength + 113) * 100) / 62));
  };

  const getSignalCategory = () => {
    const strength = data.network.signal_strength || -113;
    if (strength >= -70)
      return {
        label: "Excellent",
        color: "text-green-600",
        bg: "bg-green-100",
      };
    if (strength >= -85)
      return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (strength >= -100)
      return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Poor", color: "text-red-600", bg: "bg-red-100" };
  };

  const getNetworkTypeInfo = (type?: string) => {
    switch (type?.toUpperCase()) {
      case "LTE":
        return {
          name: "LTE (4G)",
          icon: <Wifi className="w-5 h-5" />,
          color: "text-blue-600",
          description: "High-speed mobile data",
        };
      case "GSM":
        return {
          name: "GSM (2G)",
          icon: <Signal className="w-5 h-5" />,
          color: "text-green-600",
          description: "Basic mobile connectivity",
        };
      case "WCDMA":
        return {
          name: "WCDMA (3G)",
          icon: <Activity className="w-5 h-5" />,
          color: "text-orange-600",
          description: "Standard mobile data",
        };
      default:
        return {
          name: "Unknown",
          icon: <Radio className="w-5 h-5" />,
          color: "text-gray-600",
          description: "Network type not detected",
        };
    }
  };

  const getRegistrationStatus = (status?: string) => {
    switch (status) {
      case "Registered":
        return {
          label: "Registered",
          color: "text-green-600",
          bg: "bg-green-100",
        };
      case "Registered (roaming)":
        return {
          label: "Roaming",
          color: "text-orange-600",
          bg: "bg-orange-100",
        };
      case "Searching":
        return {
          label: "Searching",
          color: "text-yellow-600",
          bg: "bg-yellow-100",
        };
      case "Denied":
        return { label: "Denied", color: "text-red-600", bg: "bg-red-100" };
      case "Not registered":
        return {
          label: "Not Registered",
          color: "text-red-600",
          bg: "bg-red-100",
        };
      default:
        return { label: "Unknown", color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  const signalCategory = getSignalCategory();
  const networkInfo = getNetworkTypeInfo(data.network.network_type);
  const regStatus = getRegistrationStatus(data.network.registration_status);

  return (
    <div className="space-y-6">
      {/* Network Connection Overview */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Globe className="w-5 h-5 mr-2 text-blue-600" />
            Network Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-full ${networkInfo.color} bg-opacity-10`}
              >
                <div className={networkInfo.color}>{networkInfo.icon}</div>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data.network.operator || "Unknown Operator"}
                </p>
                <p className="text-sm text-slate-600">
                  {networkInfo.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${networkInfo.color} bg-opacity-10 border-0`}>
                {networkInfo.name}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Registration Status
              </label>
              <div className="mt-2">
                <Badge
                  className={`${regStatus.bg} ${regStatus.color} border-0`}
                >
                  {regStatus.label}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Connection Status
              </label>
              <div className="mt-2">
                <Badge variant={data.connected ? "default" : "destructive"}>
                  {data.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Strength */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <TowerControl className="w-5 h-5 mr-2 text-green-600" />
            Signal Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Signal Strength
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {data.network.signal_strength || -113} dBm
                </span>
              </div>
              <Progress value={getSignalPercent()} className="h-3 mb-2" />
              <div className="flex items-center justify-between">
                <Badge
                  className={`${signalCategory.bg} ${signalCategory.color} border-0`}
                >
                  {signalCategory.label}
                </Badge>
                <span className="text-sm text-slate-600">
                  {getSignalPercent().toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Signal Quality
                </label>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {data.network.signal_quality || 0} BER
                </p>
                <p className="text-xs text-slate-600">Bit Error Rate</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Signal Bars
                </label>
                <div className="flex items-center space-x-1 mt-2">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`w-2 h-6 rounded-sm ${
                        bar <= Math.ceil(getSignalPercent() / 20)
                          ? "bg-blue-500"
                          : "bg-slate-200"
                      }`}
                      style={{ height: `${8 + bar * 3}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Signal Information */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            Detailed Signal Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {data.network.signal_strength || -113}
              </div>
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                RSSI (dBm)
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Received Signal Strength
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {data.signal_detailed?.rsrp || "N/A"}
              </div>
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                RSRP (dBm)
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Reference Signal Power
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {data.signal_detailed?.rsrq || "N/A"}
              </div>
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                RSRQ (dB)
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Reference Signal Quality
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {data.signal_detailed?.sinr || "N/A"}
              </div>
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                SINR (dB)
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Signal to Noise Ratio
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Network Cell ID</span>
              <span className="font-mono text-slate-900">
                {data.signal_detailed?.cell_id || "Unknown"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Priority Manager */}
      <NetworkPriorityManager isConnected={isConnected} />
    </div>
  );
}
