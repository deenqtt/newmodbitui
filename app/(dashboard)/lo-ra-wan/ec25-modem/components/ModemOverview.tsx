// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/ModemOverview.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Smartphone,
  Signal,
  Wifi,
  Globe,
  MapPin,
  Satellite,
  Activity,
  Info,
} from "lucide-react";

interface ModemOverviewProps {
  data: {
    gsm: any;
    gps: any;
    status: any;
  };
  isConnected: boolean;
}

export default function ModemOverview({
  data,
  isConnected,
}: ModemOverviewProps) {
  const getSignalPercent = () => {
    const strength = data.gsm.network.signal_strength;
    // Convert dBm to percentage (rough approximation)
    return Math.max(0, Math.min(100, ((strength + 113) * 100) / 62));
  };

  const getNetworkTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "LTE":
        return <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "GSM":
        return <Signal className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "WCDMA":
        return <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <Signal className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Modem Information */}
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800 dark:text-slate-200">
            <Smartphone className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Modem Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Manufacturer
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {data.gsm.modem.manufacturer || "Unknown"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Model
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {data.gsm.modem.model || "Unknown"}
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Firmware Version
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {data.gsm.modem.revision || "Unknown"}
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                IMEI
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {data.gsm.modem.imei || "Unknown"}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Connection Status
              </span>
              <Badge variant={data.gsm.connected ? "default" : "destructive"}>
                {data.gsm.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Service Status
              </span>
              <Badge
                variant={
                  data.status.status === "service_ready" ? "default" : "outline"
                }
              >
                {data.status.status?.replace("_", " ") || "Unknown"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Overview */}
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800 dark:text-slate-200">
            <Globe className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
            Network Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getNetworkTypeIcon(data.gsm.network.network_type)}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {data.gsm.network.operator || "Unknown Operator"}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {data.gsm.network.network_type || "Unknown"} Network
                </p>
              </div>
            </div>
            <Badge
              variant={
                data.gsm.network.registration_status === "Registered"
                  ? "default"
                  : "outline"
              }
              className="text-xs"
            >
              {data.gsm.network.registration_status || "Unknown"}
            </Badge>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Signal Strength
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {data.gsm.network.signal_strength} dBm
              </span>
            </div>
            <Progress value={getSignalPercent()} className="h-2 mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400 text-right">
              {getSignalPercent().toFixed(0)}% Signal Quality
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                APN Configuration
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">APN Name</label>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {data.gsm.apn.name || "Not configured"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Username</label>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {data.gsm.apn.username || "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Overview */}
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800 dark:text-slate-200">
            <MapPin className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
            GPS Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Satellite className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {data.gps.satellites} Satellites
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{data.gps.fix_status}</p>
              </div>
            </div>
            <Badge
              variant={
                data.gps.fix_status === "GPS Fix" ? "default" : "outline"
              }
              className="text-xs"
            >
              {data.gps.fix_status === "GPS Fix" ? "Fixed" : "No Fix"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Latitude
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {data.gps.latitude.toFixed(6)}°
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Longitude
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {data.gps.longitude.toFixed(6)}°
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Altitude
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {data.gps.altitude.toFixed(1)} m
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Speed
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {data.gps.speed.toFixed(1)} km/h
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Last Update
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {data.gps.gps_timestamp}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800 dark:text-slate-200">
            <Activity className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Service Uptime
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {Math.floor(data.status.uptime / 3600)}h{" "}
                {Math.floor((data.status.uptime % 3600) / 60)}m
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                MQTT Status
              </label>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Service Health
              </span>
              <Badge variant="default" className="bg-green-600">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                All systems operational
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Last Status Update
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {new Date(data.status.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
