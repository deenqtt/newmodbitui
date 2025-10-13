// File: app/(dashboard)/lo-ra-wan/ec25-modem/components/AlertsPanel.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSortableTable } from "@/hooks/use-sort-table";
import { getEc25ListenerService } from "@/lib/services/ec25-listener";
import type { EC25Alert } from "@/lib/services/ec25-listener";

interface AlertsPanelProps {
  alerts?: EC25Alert[];
}

export default function AlertsPanel({ alerts: propAlerts }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<EC25Alert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const ec25Service = getEc25ListenerService();

  useEffect(() => {
    // Subscribe to real-time alerts
    const unsubscribeAlerts = ec25Service.subscribe(
      "alerts",
      (newAlert: EC25Alert) => {
        setAlerts((prevAlerts) => {
          const updatedAlerts = [newAlert, ...prevAlerts];
          // Keep only last 100 alerts
          return updatedAlerts.slice(0, 100);
        });
      }
    );

    // Get existing alerts from service
    const existingAlerts = ec25Service.getAlerts();
    if (existingAlerts.length > 0) {
      setAlerts(existingAlerts);
    }

    // Use prop alerts if provided and no existing alerts
    if (propAlerts && propAlerts.length > 0 && existingAlerts.length === 0) {
      setAlerts(propAlerts);
    }

    return () => {
      unsubscribeAlerts();
    };
  }, [propAlerts]);

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <Info className="w-4 h-4 text-blue-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-700" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "info":
        return "border-blue-200 bg-blue-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "critical":
        return "border-red-300 bg-red-100";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case "info":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredAlerts =
    filterSeverity === "all"
      ? alerts
      : alerts.filter((alert) => alert.severity === filterSeverity);

  const alertCounts = {
    total: alerts.length,
    info: alerts.filter((a) => a.severity === "info").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    error: alerts.filter((a) => a.severity === "error").length,
    critical: alerts.filter((a) => a.severity === "critical").length,
  };

  // Generate alert type statistics from real data
  const alertTypeStats = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getAlertTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      service_started: "Service Events",
      service_stopped: "Service Events",
      weak_signal: "Signal Issues",
      strong_signal: "Signal Events",
      network_registered: "Network Events",
      network_disconnected: "Network Events",
      sim_pin_required: "SIM Issues",
      sim_ready: "SIM Events",
      gps_fix_acquired: "GPS Events",
      gps_fix_lost: "GPS Events",
      modem_restart: "Modem Events",
      apn_updated: "Configuration Events",
      heartbeat_missed: "System Health",
      memory_usage_high: "System Health",
    };
    return (
      typeLabels[type] ||
      type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Calculate recent activity stats
  const now = new Date();
  const last24Hours = alerts.filter(
    (alert) =>
      now.getTime() - new Date(alert.timestamp).getTime() < 24 * 60 * 60 * 1000
  ).length;

  const last7Days = alerts.filter(
    (alert) =>
      now.getTime() - new Date(alert.timestamp).getTime() <
      7 * 24 * 60 * 60 * 1000
  ).length;

  const requiresAttention = alerts.filter(
    (alert) => alert.requires_action
  ).length;

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          className="bg-white/70 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setFilterSeverity("all")}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {alertCounts.total}
            </div>
            <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Critical
            </div>
            {filterSeverity === "critical" && (
              <div className="w-full h-1 bg-red-700 rounded-full mt-2"></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Filter */}
      {filterSeverity !== "all" && (
        <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              Filtering by:
            </span>
            <Badge variant={getBadgeVariant(filterSeverity)}>
              {filterSeverity.charAt(0).toUpperCase() + filterSeverity.slice(1)}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterSeverity("all")}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Alerts List */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            System Alerts
            <Badge variant="outline" className="ml-2">
              {filteredAlerts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-600 mb-2">
                No alerts found
              </p>
              <p className="text-sm text-slate-500">
                {filterSeverity === "all"
                  ? "All systems are running smoothly"
                  : `No ${filterSeverity} alerts at this time`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert, index) => (
                <Alert
                  key={`${alert.timestamp}-${index}`}
                  className={getAlertColor(alert.severity)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-slate-900">
                            {alert.message}
                          </h4>
                          <Badge
                            variant={getBadgeVariant(alert.severity)}
                            className="ml-2"
                          >
                            {alert.severity}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-slate-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          <span className="text-slate-400">•</span>
                          <span>Type: {getAlertTypeLabel(alert.type)}</span>
                        </div>

                        {alert.requires_action && (
                          <div className="bg-white/50 rounded-md p-2 mb-2">
                            <p className="text-xs font-medium text-orange-700">
                              ⚠️ Action Required
                            </p>
                          </div>
                        )}

                        {alert.details && alert.details.length > 0 && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedAlert(
                                  expandedAlert === index ? null : index
                                )
                              }
                              className="p-0 h-auto text-xs text-slate-600 hover:text-slate-900"
                            >
                              {expandedAlert === index
                                ? "Hide Details"
                                : `Show Details (${alert.details.length})`}
                            </Button>

                            {expandedAlert === index && (
                              <div className="mt-2 bg-white/50 rounded-md p-3">
                                <ul className="space-y-1">
                                  {alert.details.map((detail, detailIndex) => (
                                    <li
                                      key={detailIndex}
                                      className="text-xs text-slate-700 flex items-start"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 mr-2 flex-shrink-0"></span>
                                      {detail}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Statistics */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            Alert Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">
                Recent Activity
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Last 24 hours</span>
                  <span className="font-medium text-slate-900">
                    {last24Hours} alerts
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Last 7 days</span>
                  <span className="font-medium text-slate-900">
                    {last7Days} alerts
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Average per day</span>
                  <span className="font-medium text-slate-900">
                    ~{last7Days > 0 ? Math.ceil(last7Days / 7) : 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Requires attention</span>
                  <span className="font-medium text-slate-900">
                    {requiresAttention}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">
                Alert Types
              </h4>
              <div className="space-y-2">
                {Object.entries(alertTypeStats)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {getAlertTypeLabel(type)}
                      </span>
                      <span className="font-medium text-slate-900">
                        {count}
                      </span>
                    </div>
                  ))}
                {Object.keys(alertTypeStats).length === 0 && (
                  <div className="text-sm text-slate-500 italic">
                    No alert data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
