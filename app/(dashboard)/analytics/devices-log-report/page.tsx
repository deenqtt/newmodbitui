"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Search,
  ChevronRight as ChevronRightIcon,
  BarChart3,
  Database,
  FileText,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// --- Hooks ---
import { useSortableTable, UseSortableTableReturn } from "@/hooks/use-sort-table";

// --- Type Definitions ---
type LoggedData = {
  id: string;
  deviceName: string;
  logName: string;
  value: number;
  units: string | null;
  timestamp: string;
};

type LoggingConfig = {
  id: string;
  customName: string;
  device: { name: string };
};

// Confirmation Dialog State - moved inside component

// =================================================================
// Main Page Component - Enhanced with Sorting, Cards & Advanced Pagination
// =================================================================
export default function DeviceLogReportPage() {
  const [logs, setLogs] = useState<LoggedData[]>([]);
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const [filters, setFilters] = useState<{
    configId: string;
    datePreset: string;
  }>({
    configId: "all",
    datePreset: "last_7_days",
  });

  const { toast } = useToast();

  // Fetch logging configurations and check database status
  useEffect(() => {
    async function fetchConfigs() {
      try {
        const loggingRes = await fetch("/api/logging-configs");
        if (loggingRes.ok) {
          setLoggingConfigs(await loggingRes.json());
        }

        // Check database status
        const healthResponse = await fetch("/api/health");
        if (healthResponse.ok) {
          setDbStatus("connected");
        } else {
          setDbStatus("disconnected");
        }
      } catch (error) {
        console.error(error);
        setDbStatus("disconnected");
      }
    }
    fetchConfigs();
  }, []);

  // Fetch device logs with filters
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.configId && filters.configId !== "all") {
        params.append("configId", filters.configId);
      }

      // Convert date presets to date ranges
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = new Date();

      switch (filters.datePreset) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case "last_7_days":
          startDate = startOfDay(subDays(now, 6));
          break;
        case "last_30_days":
          startDate = startOfDay(subDays(now, 29));
          break;
        case "all_time":
          startDate = null;
          endDate = null;
          break;
      }

      if (startDate && endDate) {
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }

      const response = await fetch(`/api/devices-log-report?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch device logs");
      setLogs(await response.json());
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Failed to fetch device logs",
        description: error.message || "Could not fetch device logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.logName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(log.value).includes(searchTerm);
    return matchesSearch;
  });

  // Apply sorting using useSortableTable hook
  const hookResult = useSortableTable(filteredLogs);
  const { sorted: sortedLogs, sortField, sortDirection, handleSort } = hookResult;

  // Paginate sorted results
  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection, filters]);

  const handleDeleteAll = () => {
    console.log("Delete all functionality disabled");
  };

  const handleExport = () => {
    const csvData = [
      ['Timestamp', 'Device', 'Log Name', 'Value', 'Units'],
      ...logs.map(log => [
        log.timestamp,
        log.deviceName,
        log.logName,
        log.value,
        log.units || ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `device-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: "CSV file downloaded successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Device Log Report</h1>
            <p className="text-muted-foreground">
              View and export historical data from your devices
            </p>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Database className={`h-6 w-6 ${dbStatus === 'connected' ? 'text-emerald-600' : 'text-red-600'}`} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Database</p>
                  <p className={`text-sm font-medium ${dbStatus === 'connected' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Active Devices</p>
                  <p className="text-2xl font-bold">
                    {new Set(logs.map(log => log.deviceName)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Download className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Log Types</p>
                  <p className="text-2xl font-bold">
                    {new Set(logs.map(log => log.logName)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search logs by device name, log name, or value..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button onClick={handleDeleteAll} variant="destructive" size="sm" disabled={logs.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Filter by Device/Log</Label>
            <Select
              value={filters.configId}
              onValueChange={(val) => setFilters((f) => ({ ...f, configId: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices & Logs</SelectItem>
                {loggingConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.device.name} - {config.customName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filter by Date</Label>
            <Select
              value={filters.datePreset}
              onValueChange={(val) => setFilters((f) => ({ ...f, datePreset: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchLogs} className="md:col-span-2 mt-8" disabled={isLoading}>
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>

        {/* Items per page control */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedLogs.length} of {sortedLogs.length} log entries
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="items-per-page" className="text-sm">Show:</label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('timestamp')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Timestamp
                      {sortField === 'timestamp' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('deviceName')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Device Name
                      {sortField === 'deviceName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('logName')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Log Name
                      {sortField === 'logName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('value')}
                      className="h-auto p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Value & Units
                      {sortField === 'value' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Logs Found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "No logs match your search criteria" : "No log entries found for the selected filters"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="font-normal">
                          {log.deviceName}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.logName}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-lg font-semibold text-primary">
                          {log.value.toFixed(2)}
                        </span>
                        {log.units && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {log.units}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Advanced Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Dynamic Page Numbers */}
              {totalPages <= 7 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                ))
              ) : (
                <>
                  {currentPage <= 4 && (
                    <>
                      {[1, 2, 3, 4, 5].map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10 h-10 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                      <span className="px-2 text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10 h-10 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  {currentPage > 4 && currentPage < totalPages - 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="w-10 h-10 p-0"
                      >
                        1
                      </Button>
                      <span className="px-2 text-muted-foreground">...</span>
                      {[currentPage - 1, currentPage, currentPage + 1].map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10 h-10 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                      <span className="px-2 text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10 h-10 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  {currentPage >= totalPages - 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="w-10 h-10 p-0"
                      >
                        1
                      </Button>
                      <span className="px-2 text-muted-foreground">...</span>
                      {[totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10 h-10 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
