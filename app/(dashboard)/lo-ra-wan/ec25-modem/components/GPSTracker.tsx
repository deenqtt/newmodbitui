// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/GPSTracker.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Satellite,
  Navigation,
  Clock,
  Compass,
  Mountain,
  Zap,
  ExternalLink,
} from "lucide-react";

interface GPSTrackerProps {
  data: {
    fix_status: string;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    satellites: number;
    gps_timestamp: string;
    imei?: string;
  };
  isConnected: boolean;
}

export default function GPSTracker({ data, isConnected }: GPSTrackerProps) {
  const getFixStatusInfo = (status: string) => {
    switch (status) {
      case "GPS Fix":
        return {
          label: "GPS Fixed",
          color: "text-green-600",
          bg: "bg-green-100",
          icon: <Satellite className="w-4 h-4" />,
        };
      case "DGPS Fix":
        return {
          label: "DGPS Fixed",
          color: "text-blue-600",
          bg: "bg-blue-100",
          icon: <Navigation className="w-4 h-4" />,
        };
      case "No Fix":
        return {
          label: "No Fix",
          color: "text-red-600",
          bg: "bg-red-100",
          icon: <Satellite className="w-4 h-4" />,
        };
      default:
        return {
          label: "Unknown",
          color: "text-gray-600",
          bg: "bg-gray-100",
          icon: <Satellite className="w-4 h-4" />,
        };
    }
  };

  const getSatelliteSignalQuality = (count: number) => {
    if (count >= 8) return { label: "Excellent", color: "text-green-600" };
    if (count >= 6) return { label: "Good", color: "text-blue-600" };
    if (count >= 4) return { label: "Fair", color: "text-yellow-600" };
    return { label: "Poor", color: "text-red-600" };
  };

  const formatCoordinate = (coord: number, type: "lat" | "lng") => {
    const direction =
      type === "lat" ? (coord >= 0 ? "N" : "S") : coord >= 0 ? "E" : "W";
    return `${Math.abs(coord).toFixed(6)}° ${direction}`;
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
    window.open(url, "_blank");
  };

  const fixInfo = getFixStatusInfo(data.fix_status);
  const satQuality = getSatelliteSignalQuality(data.satellites);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GPS Status Overview */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <MapPin className="w-5 h-5 mr-2 text-red-600" />
            GPS Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${fixInfo.bg}`}>
                <div className={fixInfo.color}>{fixInfo.icon}</div>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data.satellites} Satellites
                </p>
                <p className="text-sm text-slate-600">
                  {satQuality.label} signal quality
                </p>
              </div>
            </div>
            <Badge className={`${fixInfo.bg} ${fixInfo.color} border-0`}>
              {fixInfo.label}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Satellite Coverage
                </span>
                <span className="text-sm text-slate-600">
                  {data.satellites}/12+
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (data.satellites / 12) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                <div className="text-sm font-medium text-slate-900">
                  Last Update
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {data.gps_timestamp}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Zap className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                <div className="text-sm font-medium text-slate-900">
                  Accuracy
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {data.fix_status === "GPS Fix" ? "3-5m" : "No Fix"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Navigation className="w-5 h-5 mr-2 text-blue-600" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  Latitude
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                  {formatCoordinate(data.latitude, "lat")}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {data.latitude.toFixed(6)}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center">
                  <Compass className="w-3 h-3 mr-1" />
                  Longitude
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                  {formatCoordinate(data.longitude, "lng")}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {data.longitude.toFixed(6)}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center">
                  <Mountain className="w-3 h-3 mr-1" />
                  Altitude
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {data.altitude.toFixed(1)} m
                </p>
                <p className="text-xs text-slate-500">Above sea level</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  Speed
                </label>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {data.speed.toFixed(1)} km/h
                </p>
                <p className="text-xs text-slate-500">Current velocity</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button
                onClick={openInGoogleMaps}
                disabled={data.fix_status === "No Fix"}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Google Maps
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Map Visualization */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <MapPin className="w-5 h-5 mr-2 text-green-600" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {data.fix_status === "GPS Fix" ? (
              <div className="bg-slate-100 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                {/* Simple map placeholder - in real implementation, use Google Maps or OpenStreetMap */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 70% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)
                    `,
                  }}
                />

                <div className="relative z-10 text-center">
                  <MapPin className="w-8 h-8 text-red-500 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    Current Location
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Click "View on Google Maps" for detailed map
                  </p>
                </div>

                {/* Coordinate grid overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-8 grid-rows-6 h-full w-full">
                    {Array.from({ length: 48 }, (_, i) => (
                      <div key={i} className="border border-slate-400"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <Satellite className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-slate-600 mb-2">
                    GPS Fix Required
                  </p>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Waiting for GPS satellites to establish location fix. Make
                    sure the device has a clear view of the sky.
                  </p>
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Satellite constellation visualization */}
            <div className="mt-4 bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">
                  Satellite Constellation
                </span>
                <Badge className={`${satQuality.color} bg-opacity-10 border-0`}>
                  {data.satellites} visible
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      i < data.satellites
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Weak Signal</span>
                <span>Strong Signal</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
