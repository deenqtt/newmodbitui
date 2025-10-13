// File: BillCalculationTab.tsx

"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import Swal from "sweetalert2";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import { useSortableTable } from "@/hooks/use-sort-table";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  Search,
  Calculator,
  RefreshCw,
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// --- Type Definitions ---
interface DeviceSelection {
  id: string; // Ini uniqId
  uniqId: string;
  name: string;
  topic: string;
  lastPayload?: Record<string, any>;
  lastUpdatedByMqtt?: string;
}

interface BillConfig {
  id: string;
  customName: string;
  sourceDevice: DeviceSelection;
  sourceDeviceKey: string;
  rupiahRatePerKwh: number;
  dollarRatePerKwh: number;
}

interface BillLog {
  id: string;
  config: { customName: string };
  rawValue: number;
  rupiahCost: number;
  dollarCost: number;
  timestamp: string;
}

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function BillCalculationTab() {
  const { isReady, subscribe, unsubscribe } = useMqtt();

  const [configs, setConfigs] = useState<BillConfig[]>([]);
  const [allLogs, setAllLogs] = useState<BillLog[]>([]);
  const [externalDevices, setExternalDevices] = useState<DeviceSelection[]>([]);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | "">("");

  // --- State untuk Pagination ---
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PER_PAGE = 10;

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<
    Partial<BillConfig & { sourceDeviceUniqId: string }>
  >({});
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<DeviceSelection | null>(null);
  const [payloadKeys, setPayloadKeys] = useState<string[]>([]);

  // --- NEW: State untuk Loading/Disable Buttons ---
  const [isSubmitting, setIsSubmitting] = useState(false); // Untuk Add/Edit Save button
  const [isDeletingConfig, setIsDeletingConfig] = useState(false); // Untuk Delete Config button
  const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false); // Untuk Delete All Logs button
  const [refreshing, setRefreshing] = useState(false);
  // --- Delete State ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<BillConfig | null>(null);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);

  // --- Logika untuk pagination di sisi klien ---
  const paginatedLogs = useMemo(() => {
    const startIndex = (logsPage - 1) * LOGS_PER_PAGE;
    const endIndex = startIndex + LOGS_PER_PAGE;
    return allLogs.slice(startIndex, endIndex);
  }, [allLogs, logsPage]);

  // --- Data Fetching ---
  const fetchInitialData = useCallback(async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      }
      setIsLoading(true);

      const [configsRes, devicesRes, logsRes] = await Promise.all([
        fetch("/api/bill-configs"),
        fetch("/api/devices/for-selection"),
        fetch("/api/bill-logs"),
      ]);

      if (!configsRes.ok)
        throw new Error("Failed to fetch bill configurations.");
      if (!devicesRes.ok) throw new Error("Failed to fetch external devices.");
      if (!logsRes.ok) throw new Error("Failed to fetch bill logs.");

      const configsData = await configsRes.json();
      const devicesData: DeviceSelection[] = await devicesRes.json();
      const logsData = await logsRes.json();

      const formattedDevices: DeviceSelection[] = devicesData.map((device) => ({
        id: device.uniqId || device.id,
        uniqId: device.uniqId,
        name: device.name,
        topic: device.topic,
        lastPayload: device.lastPayload || {},
        lastUpdatedByMqtt: device.lastUpdatedByMqtt,
      }));
      setExternalDevices(formattedDevices);

      const initialLiveValues: Record<string, number> = {};
      configsData.forEach((config: BillConfig) => {
        const correspondingDevice = formattedDevices.find(
          (d) => d.id === config.sourceDevice.id
        );
        if (
          correspondingDevice &&
          correspondingDevice.lastPayload &&
          config.sourceDeviceKey in correspondingDevice.lastPayload
        ) {
          const val = parseFloat(
            correspondingDevice.lastPayload[config.sourceDeviceKey]
          );
          if (!isNaN(val)) {
            initialLiveValues[config.id] = val;
          }
        }
      });
      setLiveValues(initialLiveValues);

      setConfigs(configsData);

      if (Array.isArray(logsData)) {
        setAllLogs(logsData);
      } else {
        console.error("Expected an array for logs, but received:", logsData);
        setAllLogs([]);
      }

      if (showToast) {
        Toast.fire({
          icon: "success",
          title: "Refreshed",
          text: `${configsData.length} bill configurations loaded`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to fetch initial data: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!isReady || configs.length === 0) return;
    const handleMessage = (topic: string, payloadStr: string) => {
      const relevantConfig = configs.find(
        (c) => c.sourceDevice.topic === topic
      );
      if (relevantConfig) {
        try {
          const payload = JSON.parse(payloadStr);
          let innerValue: Record<string, any> = {};
          if (payload.value && typeof payload.value === "string") {
            try {
              innerValue = JSON.parse(payload.value);
            } catch (e) {
              console.warn(
                `[BillTab MQTT] Warning: 'value' field is not valid JSON string for topic ${topic}. Falling back to outer payload.`
              );
              innerValue = payload;
            }
          } else if (payload.value && typeof payload.value === "object") {
            innerValue = payload.value;
          } else {
            innerValue = payload;
          }

          const value = parseFloat(innerValue[relevantConfig.sourceDeviceKey]);
          if (!isNaN(value)) {
            setLiveValues((prev) => ({ ...prev, [relevantConfig.id]: value }));
          } else {
            console.warn(
              `[BillTab MQTT] Key "${
                relevantConfig.sourceDeviceKey
              }" has non-numeric value: ${
                innerValue[relevantConfig.sourceDeviceKey]
              } for config ${relevantConfig.customName}`
            );
          }
        } catch (e) {
          console.error(
            `[BillTab MQTT] Error processing MQTT message for topic ${topic}:`,
            e
          );
        }
      }
    };
    const topicsToSubscribe = [
      ...new Set(configs.map((c) => c.sourceDevice.topic)),
    ];
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMessage));
    return () => {
      topicsToSubscribe.forEach((topic) => unsubscribe(topic, handleMessage));
    };
  }, [isReady, configs, subscribe, unsubscribe]);

  useEffect(() => {
    if (!isModalOpen || !selectedDeviceForModal || !isReady) return;
    const topic = selectedDeviceForModal.topic;
    const handleMessage = (msgTopic: string, payloadStr: string) => {
      if (msgTopic === topic) {
        try {
          const payload = JSON.parse(payloadStr);
          let innerValue: Record<string, any> = {};
          if (payload.value && typeof payload.value === "string") {
            try {
              innerValue = JSON.parse(payload.value);
            } catch (e) {
              console.warn(
                `[BillTab Modal MQTT] Warning: 'value' field is not valid JSON string for topic ${topic}. Falling back to outer payload.`
              );
              innerValue = payload;
            }
          } else if (payload.value && typeof payload.value === "object") {
            innerValue = payload.value;
          } else {
            innerValue = payload;
          }
          setPayloadKeys(Object.keys(innerValue));
        } catch (e) {
          console.error(
            `[BillTab Modal MQTT] Error parsing payload for key selection:`,
            e
          );
          setPayloadKeys([]);
        }
      }
    };
    subscribe(topic, handleMessage);
    return () => {
      unsubscribe(topic, handleMessage);
    };
  }, [isModalOpen, selectedDeviceForModal, isReady, subscribe, unsubscribe]);

  const handleDeviceChange = (uniqId: string) => {
    const device = externalDevices.find((d) => d.id === uniqId);
    setSelectedDeviceForModal(device || null);
    setCurrentConfig((prev) => ({
      ...prev,
      sourceDeviceUniqId: uniqId,
      sourceDeviceKey: undefined,
    }));
    setPayloadKeys(Object.keys(device?.lastPayload || {}));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !currentConfig.customName ||
      !currentConfig.sourceDeviceUniqId ||
      !currentConfig.sourceDeviceKey
    ) {
      Toast.fire({ icon: "error", title: "Please fill all required fields." });
      return;
    }

    setIsSubmitting(true); // NEW: Set loading state to true

    const url = isEditMode
      ? `/api/bill-configs/${currentConfig.id}`
      : "/api/bill-configs";
    const method = isEditMode ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentConfig),
      });
      if (!response.ok) throw new Error((await response.json()).message);

      const savedConfig = await response.json();

      Toast.fire({
        icon: "success",
        title: `Configuration ${isEditMode ? "updated" : "saved"}!`,
      });
      setIsModalOpen(false);

      // --- PERUBAHAN: Panggil API untuk log pertama kali setelah add ---
      // (Ini jika Anda ingin log segera setelah save, jika tidak biarkan MQTT Listener yang log)
      if (!isEditMode) {
        await fetch("/api/bill-logs/log-once", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configId: savedConfig.id }),
        });
      }

      fetchInitialData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsSubmitting(false); // NEW: Set loading state to false
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true); // NEW: Set loading state for delete

    try {
      const response = await fetch(`/api/bill-configs/${configToDelete.id}`, {
        method: "DELETE",
      });
      if (response.status !== 204)
        throw new Error((await response.json()).message);
      Toast.fire({ icon: "success", title: "Configuration deleted!" });
      fetchInitialData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsDeletingConfig(false); // NEW: Set loading state to false
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeletingAllLogs(true); // NEW: Set loading state for delete all logs
    try {
      const response = await fetch(`/api/bill-logs/delete-all`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          (await response.json()).message || "Failed to delete logs."
        );
      }
      const result = await response.json();
      Toast.fire({ icon: "success", title: result.message });
      setAllLogs([]);
      setLogsPage(1);
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsDeletingAllLogs(false); // NEW: Set loading state to false
      setIsDeleteAllAlertOpen(false);
    }
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return "0.00";
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateCost = (value: number | undefined | null, rate: number) => {
    if (value === null || value === undefined) return 0;
    const energyKwh = (value * 1) / 1000;
    return energyKwh * rate;
  };

  const filteredConfigs = useMemo(
    () =>
      configs.filter((c) =>
        c.customName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [configs, searchQuery]
  );
  const resetForm = () => {
    setCurrentConfig({
      rupiahRatePerKwh: 1467,
      dollarRatePerKwh: 0.1,
    });
    setSelectedDeviceForModal(null);
    setPayloadKeys([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bill Calculation
            </h1>
            <p className="text-muted-foreground">
              Monitor and calculate electricity costs in real-time
            </p>
          </div>

          <Button onClick={openAddModal}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calculator className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Active Configurations</p>
                  <p className="text-2xl font-bold">{configs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-6 w-6 text-emerald-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Live Data Points</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {Object.keys(liveValues).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{allLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Current Avg Cost</p>
                  <p className="text-2xl font-bold">
                    {configs.length > 0
                      ? formatNumber(
                          configs.reduce((sum, config) => {
                            const cost = calculateCost(liveValues[config.id], config.rupiahRatePerKwh);
                            return sum + (cost || 0);
                          }, 0) / configs.length
                        )
                      : '0.00'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search configurations by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results info */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">
            Showing {filteredConfigs.length} of {configs.length} configurations
          </span>
          <Button
            variant="outline"
            onClick={() => fetchInitialData(true)}
            disabled={refreshing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        setSortKey('customName');
                      }}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Custom Name
                      {sortKey === 'customName' ? (
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
                  <TableHead>Source Device</TableHead>
                  <TableHead>Live Data (Watts)</TableHead>
                  <TableHead>Cost (IDR/hour)</TableHead>
                  <TableHead>Cost (USD/hour)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredConfigs.length > 0 ? (
                  filteredConfigs.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <TableCell className="font-medium">
                        {item.customName}
                      </TableCell>
                      <TableCell>
                        {item.sourceDevice.name} ({item.sourceDeviceKey})
                      </TableCell>
                      <TableCell>
                        {liveValues[item.id] !== undefined
                          ? formatNumber(liveValues[item.id])
                          : "Waiting..."}{" "}
                        W
                      </TableCell>
                      <TableCell>
                        Rp{" "}
                        {formatNumber(
                          calculateCost(
                            liveValues[item.id],
                            item.rupiahRatePerKwh
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        ${" "}
                        {formatNumber(
                          calculateCost(
                            liveValues[item.id],
                            item.dollarRatePerKwh
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsEditMode(true);
                            setCurrentConfig({
                              ...item,
                              sourceDeviceUniqId: item.sourceDevice.id,
                            });
                            const deviceInEdit = externalDevices.find(
                              (d) => d.id === item.sourceDevice.id
                            );
                            setSelectedDeviceForModal(deviceInEdit || null);
                            setPayloadKeys(
                              Object.keys(deviceInEdit?.lastPayload || {})
                            );
                            setIsModalOpen(true);
                          }}
                          disabled={
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setConfigToDelete(item);
                            setIsDeleteAlertOpen(true);
                          }}
                          disabled={
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-48 text-muted-foreground"
                    >
                      No configurations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>


      {Math.ceil(allLogs.length / LOGS_PER_PAGE) > 1 && (
        <div className="flex items-center justify-between mt-4 px-4">
          <div className="text-sm text-muted-foreground">
            Page {logsPage} of {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev - 1)}
              disabled={
                logsPage === 1 ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page Numbers for History */}
            {Math.ceil(allLogs.length / LOGS_PER_PAGE) <= 7 ? (
              Array.from({ length: Math.ceil(allLogs.length / LOGS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={logsPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogsPage(page)}
                  className="w-10 h-10 p-0"
                  disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                >
                  {page}
                </Button>
              ))
            ) : (
              <>
                {logsPage <= 4 && (
                  <>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <Button
                        key={page}
                        variant={logsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogsPage(page)}
                        className="w-10 h-10 p-0"
                        disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                      >
                        {page}
                      </Button>
                    ))}
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(Math.ceil(allLogs.length / LOGS_PER_PAGE))}
                      className="w-10 h-10 p-0"
                      disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                    >
                      {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                    </Button>
                  </>
                )}

                {logsPage > 4 && logsPage < Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(1)}
                      className="w-10 h-10 p-0"
                      disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                    >
                      1
                    </Button>
                    <span className="px-2 text-muted-foreground">...</span>
                    {[logsPage - 1, logsPage, logsPage + 1].map((page) => (
                      <Button
                        key={page}
                        variant={logsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogsPage(page)}
                        className="w-10 h-10 p-0"
                        disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                      >
                        {page}
                      </Button>
                    ))}
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(Math.ceil(allLogs.length / LOGS_PER_PAGE))}
                      className="w-10 h-10 p-0"
                      disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                    >
                      {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                    </Button>
                  </>
                )}

                {logsPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(1)}
                      className="w-10 h-10 p-0"
                      disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
                    >
                      1
                    </Button>
                    <span className="px-2 text-muted-foreground">...</span>
                    {[Math.ceil(allLogs.length / LOGS_PER_PAGE) - 4, Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3, Math.ceil(allLogs.length / LOGS_PER_PAGE) - 2, Math.ceil(allLogs.length / LOGS_PER_PAGE) - 1, Math.ceil(allLogs.length / LOGS_PER_PAGE)].map((page) => (
                      <Button
                        key={page}
                        variant={logsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogsPage(page)}
                        className="w-10 h-10 p-0"
                        disabled={isLoading || isSubmitting || isDeletingConfig || isDeletingAllLogs}
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
              onClick={() => setLogsPage((prev) => prev + 1)}
              disabled={
                logsPage === Math.ceil(allLogs.length / LOGS_PER_PAGE) ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* History Table */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Historical record of electricity cost calculations
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteAllAlertOpen(true)}
              disabled={
                allLogs.length === 0 ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
              className="whitespace-nowrap"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All History
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Raw Value (W)</TableHead>
                  <TableHead>IDR Cost</TableHead>
                  <TableHead>USD Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.config?.customName || "N/A"}</TableCell>
                      <TableCell>{formatNumber(log.rawValue)}</TableCell>
                      <TableCell>Rp {formatNumber(log.rupiahCost)}</TableCell>
                      <TableCell>$ {formatNumber(log.dollarCost)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No logs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 border-t">
          <div className="text-xs text-muted-foreground">
            Page {logsPage} of {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev - 1)}
              disabled={
                logsPage === 1 ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              } // NEW: Disable
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev + 1)}
              disabled={
                logsPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE) ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              } // NEW: Disable
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit" : "Add"} Bill Configuration
            </DialogTitle>
            <DialogDescription>
              Configure a new item for cost calculation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customName">Custom Name</Label>
              <Input
                id="customName"
                placeholder="e.g., Biaya Server Rack A"
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                required
                disabled={isSubmitting} // NEW: Disable input during submission
              />
            </div>
            <div>
              <Label>Select Device (Source)</Label>
              <Select
                onValueChange={handleDeviceChange}
                value={currentConfig.sourceDeviceUniqId}
                required
                disabled={isSubmitting} // NEW: Disable select during submission
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent>
                  {externalDevices.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDeviceForModal && (
              <div>
                <Label>Select Key from Payload</Label>
                <Select
                  onValueChange={(value) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      sourceDeviceKey: value,
                    }))
                  }
                  value={currentConfig.sourceDeviceKey}
                  disabled={payloadKeys.length === 0 || isSubmitting} // NEW: Disable select during submission
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        payloadKeys.length > 0
                          ? "Select a key..."
                          : "Waiting for payload..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {payloadKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IDR Rate (/kWh)</Label>
                <Input
                  type="number"
                  value={currentConfig.rupiahRatePerKwh || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      rupiahRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  disabled={isSubmitting} // NEW: Disable input during submission
                />
              </div>
              <div>
                <Label>USD Rate (/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.dollarRatePerKwh || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      dollarRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  disabled={isSubmitting} // NEW: Disable input during submission
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting} // NEW: Disable cancel button during submission
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditMode ? "Save Changes" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Config */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the configuration for{" "}
              <b>{configToDelete?.customName}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingConfig || isDeletingAllLogs}
              onClick={() => setConfigToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingConfig || isDeletingAllLogs} // NEW: Disable delete button during its own operation
            >
              {isDeletingConfig ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Hapus Semua Log */}
      <AlertDialog
        open={isDeleteAllAlertOpen}
        onOpenChange={setIsDeleteAllAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              bill calculation logs from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConfig || isDeletingAllLogs}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllLogs}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingConfig || isDeletingAllLogs}
            >
              {isDeletingAllLogs ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
