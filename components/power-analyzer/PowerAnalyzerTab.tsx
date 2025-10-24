"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { showToast } from "@/lib/toast-utils";
import Swal from "sweetalert2";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  HardDrive,
  Zap,
  Gauge,
  Calculator,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";

// Shadcn/UI & Custom Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMqtt } from "@/contexts/MqttContext";

// --- Type Definitions (Tidak Berubah) ---
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
}
interface PduItem {
  uniqId: string;
  name: string;
  keys: string[];
}
interface MainPowerItem {
  uniqId: string;
  key: string;
}
interface PowerAnalyzerConfig {
  id: string;
  customName: string;
  pduList: PduItem[];
  mainPower: MainPowerItem;
  apiTopic: {
    uniqId: string;
    name: string;
    topic: string;
  };
}
interface SelectOption {
  value: string;
  label: string;
}

// --- Main Component ---
export function PowerAnalyzerTab() {
  // --- States ---
  const [configs, setConfigs] = useState<PowerAnalyzerConfig[]>([]);
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [liveData, setLiveData] = useState<{ [topic: string]: any }>({});
  const [modalSubscribedTopics, setModalSubscribedTopics] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // <-- State untuk disable tombol
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] =
    useState<PowerAnalyzerConfig | null>(null);
  const [customName, setCustomName] = useState("");
  const [pduList, setPduList] = useState<
    { uniqId: string | null; keys: string[] }[]
  >([{ uniqId: null, keys: [] }]);
  const [mainPower, setMainPower] = useState<{
    uniqId: string | null;
    key: string | null;
  }>({ uniqId: null, key: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // ... (Semua logika MQTT, data fetching, kalkulasi, dan helper lainnya tidak berubah)
  const { subscribe, unsubscribe } = useMqtt();
  const handleMqttMessage = useCallback((topic: string, payload: string) => {
    try {
      let parsedPayload = JSON.parse(payload);
      if (typeof parsedPayload.value === "string") {
        try {
          const nestedValue = JSON.parse(parsedPayload.value);
          parsedPayload = { ...parsedPayload, ...nestedValue };
        } catch (e) {}
      }
      setLiveData((prev) => ({ ...prev, [topic]: parsedPayload }));
    } catch (e) {
      console.error(`Failed to parse MQTT payload for topic ${topic}:`, e);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (!isModalOpen && modalSubscribedTopics.size > 0) {
        modalSubscribedTopics.forEach((topic) =>
          unsubscribe(topic, handleMqttMessage)
        );
        setModalSubscribedTopics(new Set());
      }
    };
  }, [isModalOpen, modalSubscribedTopics, unsubscribe, handleMqttMessage]);
  useEffect(() => {
    const allTopics = new Set<string>();
    configs.forEach((config) => {
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === config.mainPower.uniqId
      );
      if (mainPowerDevice) allTopics.add(mainPowerDevice.topic);
      config.pduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) allTopics.add(pduDevice.topic);
      });
    });
    const topicsToSubscribe = Array.from(allTopics);
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMqttMessage));
    return () => {
      topicsToSubscribe.forEach((topic) =>
        unsubscribe(topic, handleMqttMessage)
      );
    };
  }, [configs, devices, subscribe, unsubscribe, handleMqttMessage]);
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configsRes, devicesRes] = await Promise.all([
        axios.get<PowerAnalyzerConfig[]>("/api/power-analyzer"),
        axios.get<DeviceForSelection[]>("/api/devices/for-selection"),
      ]);
      setConfigs(configsRes.data);
      setDevices(devicesRes.data);
    } catch (error) {
      console.error("Failed to load initial data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  const deviceOptions: SelectOption[] = useMemo(
    () => devices.map((d) => ({ value: d.uniqId, label: d.name })),
    [devices]
  );
  const getKeyOptions = useCallback(
    (uniqId: string | null): SelectOption[] => {
      if (!uniqId) return [];
      const device = devices.find((d) => d.uniqId === uniqId);
      const rawPayload = liveData[device?.topic || ""] || device?.lastPayload;
      if (!rawPayload) return [];
      let dataObject = null;
      if (typeof rawPayload.value === "string") {
        try {
          dataObject = JSON.parse(rawPayload.value);
        } catch (e) {}
      }
      if (dataObject === null) {
        dataObject = rawPayload;
      }
      if (typeof dataObject !== "object" || dataObject === null) {
        return [];
      }
      return Object.keys(dataObject)
        .filter((key) => typeof dataObject[key] === "number")
        .map((key) => ({ value: key, label: key }));
    },
    [devices, liveData]
  );
  const getPduValue = useCallback(
    (pdu: PduItem): number | null => {
      const device = devices.find((d) => d.uniqId === pdu.uniqId);
      if (!device) return null;
      const payload = liveData[device.topic];
      if (!payload) return null;
      return pdu.keys.reduce(
        (sum, key) => sum + (Number(payload[key]) || 0),
        0
      );
    },
    [devices, liveData]
  );
  const getMainPowerValue = useCallback(
    (config: PowerAnalyzerConfig): number | null => {
      const device = devices.find((d) => d.uniqId === config.mainPower.uniqId);
      if (!device) return null;
      const payload = liveData[device.topic];
      if (!payload || payload[config.mainPower.key] === undefined) return null;
      return Number(payload[config.mainPower.key]) || 0;
    },
    [devices, liveData]
  );
  const calculateTotalPUE = useCallback(
    (config: PowerAnalyzerConfig): string => {
      const mainPowerValue = getMainPowerValue(config);
      if (mainPowerValue === null || mainPowerValue === 0) return "N/A";
      const totalItPower = config.pduList.reduce(
        (sum, pdu) => sum + (getPduValue(pdu) || 0),
        0
      );
      return `${((totalItPower / mainPowerValue) * 100).toFixed(2)}%`;
    },
    [getMainPowerValue, getPduValue]
  );
  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue == null || pduValue == null || mainPowerValue === 0)
        return "N/A";
      return `${((pduValue / mainPowerValue) * 100).toFixed(2)}%`;
    },
    []
  );
  // Filter devices based on search
  const filteredConfigs = useMemo(() => {
    return configs.filter(config =>
      config.customName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [configs, searchTerm]);

  // Apply sorting using useSortableTable hook
  const { sorted: sortedConfigs, sortKey, sortDirection, handleSort } = useSortableTable(filteredConfigs);

  // Paginate the sorted results
  const totalPages = Math.ceil(sortedConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigs = sortedConfigs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection]);
  const resetForm = () => {
    setCustomName("");
    setPduList([{ uniqId: null, keys: [] }]);
    setMainPower({ uniqId: null, key: null });
    setEditingId(null);
  };
  const handleOpenModal = (config: PowerAnalyzerConfig | null = null) => {
    if (config) {
      setEditingId(config.id);
      setCustomName(config.customName);
      const initialPduList = config.pduList.map((p) => ({
        uniqId: p.uniqId,
        keys: p.keys,
      }));
      setPduList(initialPduList);
      const initialMainPower = {
        uniqId: config.mainPower.uniqId,
        key: config.mainPower.key,
      };
      setMainPower(initialMainPower);
      const topicsToSub = new Set<string>();
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === initialMainPower.uniqId
      );
      if (mainPowerDevice) topicsToSub.add(mainPowerDevice.topic);
      initialPduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) topicsToSub.add(pduDevice.topic);
      });
      topicsToSub.forEach((topic) => subscribe(topic, handleMqttMessage));
      setModalSubscribedTopics(topicsToSub);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };
  const manageTopicSubscription = (
    oldUniqId: string | null,
    newUniqId: string | null
  ) => {
    const oldTopic = devices.find((d) => d.uniqId === oldUniqId)?.topic;
    const newTopic = devices.find((d) => d.uniqId === newUniqId)?.topic;
    setModalSubscribedTopics((prevSubs) => {
      const newSubs = new Set(prevSubs);
      if (oldTopic && oldTopic !== newTopic) {
        unsubscribe(oldTopic, handleMqttMessage);
        newSubs.delete(oldTopic);
      }
      if (newTopic && oldTopic !== newTopic) {
        subscribe(newTopic, handleMqttMessage);
        newSubs.add(newTopic);
      }
      return newSubs;
    });
  };
  const handlePduDeviceChange = (index: number, newUniqId: string | null) => {
    const oldUniqId = pduList[index].uniqId;
    manageTopicSubscription(oldUniqId, newUniqId);
    const newList = [...pduList];
    newList[index] = { uniqId: newUniqId, keys: [] };
    setPduList(newList);
  };
  const handlePduKeysChange = (index: number, newKeys: string[]) => {
    const newList = [...pduList];
    newList[index] = { ...newList[index], keys: newKeys };
    setPduList(newList);
  };
  const handleMainPowerDeviceChange = (newUniqId: string | null) => {
    manageTopicSubscription(mainPower.uniqId, newUniqId);
    setMainPower({ uniqId: newUniqId, key: null });
  };
  const handleShowDetails = (config: PowerAnalyzerConfig) => {
    setSelectedConfig(config);
    setIsDetailModalOpen(true);
  };
  const addPdu = () => setPduList([...pduList, { uniqId: null, keys: [] }]);
  const removePdu = (index: number) => {
    const pduToRemove = pduList[index];
    manageTopicSubscription(pduToRemove.uniqId, null);
    setPduList(pduList.filter((_, i) => i !== index));
  };

  // --- FUNGSI DIPERBARUI: handleSubmit & handleDelete ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customName ||
      !mainPower.uniqId ||
      !mainPower.key ||
      pduList.some((p) => !p.uniqId || p.keys.length === 0)
    ) {
      showToast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = { customName, pduList, mainPower };
      const promise = editingId
        ? axios.put(`/api/power-analyzer/${editingId}`, payload)
        : axios.post("/api/power-analyzer", payload);

      await promise;

      showToast.success(`Configuration ${editingId ? "updated" : "saved"} successfully!`);

      fetchAllData();
      setIsModalOpen(false);

      // ✅ Trigger calculation service reload
      try {
        await axios.post("/api/cron/calculation-reload");
        console.log("✅ Calculation service reload triggered");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error(
        error.response?.data?.message ||
        "An error occurred while saving data."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      try {
        await axios.delete(`/api/power-analyzer/${id}`);

        Swal.fire({
          title: "Deleted!",
          text: "Configuration has been deleted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        fetchAllData();

        // ✅ Trigger calculation service reload
        try {
          await axios.post("/api/cron/calculation-reload");
          console.log("✅ Calculation service reload triggered");
        } catch (reloadError) {
          console.error("Failed to trigger calculation reload:", reloadError);
        }
      } catch (error: any) {
        Swal.fire({
          title: "Error!",
          text: error.response?.data?.message || "Failed to delete configuration.",
          icon: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Power Analyzer
              </h1>
              <p className="text-muted-foreground">
                Monitor and analyze power usage efficiency across your infrastructure
              </p>
            </div>

            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-2">
                      Active Configurations
                    </p>
                    <p className="text-4xl font-bold">{configs.length}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Calculator className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-2">
                      Total Racks Monitored
                    </p>
                    <p className="text-4xl font-bold">
                      {configs.reduce((sum, config) => sum + config.pduList.length, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <HardDrive className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-2">
                      Avg IT Load
                    </p>
                    <p className="text-4xl font-bold">
                      {configs.length > 0
                        ? (
                          configs.reduce((sum, config) => {
                            const pue = calculateTotalPUE(config);
                            return sum + (pue !== 'N/A' ? parseFloat(pue.replace('%', '')) : 0);
                          }, 0) / configs.filter(config => calculateTotalPUE(config) !== 'N/A').length
                        ).toFixed(1) + '%'
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Gauge className="h-6 w-6" />
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
              Showing {paginatedConfigs.length} of {sortedConfigs.length} configurations
            </span>
          </div>

          {/* Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <CardTitle className="text-xl flex items-center gap-2">
                <Gauge className="h-5 w-5 text-purple-600" />
                Power Analyzer Configurations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">#</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('customName')}
                          className="h-auto p-0 font-semibold hover:bg-transparent text-slate-700 dark:text-slate-300"
                        >
                          Configuration Name
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
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Total Racks</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">IT Load %</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-b border-slate-100 dark:border-slate-800">
                          <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-8"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-16"></div></TableCell>
                          <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20"></div></TableCell>
                          <TableCell className="text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-8 ml-auto"></div></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 rounded-full">
                              <Gauge className="h-16 w-16 text-purple-600" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {searchTerm
                                  ? "No configurations found"
                                  : "No Power Analyzer Configurations Yet"}
                              </p>
                              <p className="text-sm text-muted-foreground max-w-md">
                                {searchTerm
                                  ? "Try adjusting your search terms or clear the search"
                                  : "Start monitoring your IT power load by adding your first Power Analyzer configuration"}
                              </p>
                            </div>
                            {!searchTerm && (
                              <Button
                                onClick={() => handleOpenModal()}
                                className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Configuration
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedConfigs.map((config, index) => (
                        <TableRow
                          key={config.id}
                          className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all duration-200 border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell className="py-4 font-medium text-slate-600 dark:text-slate-400">
                            {index + 1 + (currentPage - 1) * itemsPerPage}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {config.customName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="w-2 h-2 bg-purple-500 rounded-full inline-block mr-1 animate-pulse" />
                                Live monitoring
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
                                <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {config.pduList?.length || 0} racks
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {calculateTotalPUE(config)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShowDetails(config)}
                                className="h-7 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                                onClick={() => handleOpenModal(config)}
                              >
                                <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                onClick={() => handleDelete(config.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

      {/* Pagination */}
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

            {/* Page Numbers */}
            {totalPages <= 7 ? (
              // Show all pages if 7 or fewer
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
              // Show ellipsis pattern for more pages
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingId ? "Edit" : "Add"} Power Analyzer Configuration
            </DialogTitle>
            <DialogDescription>
              Configure power monitoring devices to calculate IT load percentage
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customName" className="text-sm font-medium">
                Configuration Name *
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Data Center IT Load Monitor"
                className="h-10"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* PDU/Racks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  IT Power (PDU/Racks)
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPdu}
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rack
                </Button>
              </div>

              {pduList.map((pdu, index) => (
                <Card
                  key={index}
                  className="relative border border-slate-200 dark:border-slate-700"
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Select Device (Rack) *
                        </Label>
                        <Select
                          value={pdu.uniqId ?? undefined}
                          onValueChange={(value) =>
                            handlePduDeviceChange(index, value)
                          }
                          required={pduList.length === 1}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Choose a device..." />
                          </SelectTrigger>
                          <SelectContent>
                            {deviceOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{opt.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {devices.find((d) => d.uniqId === opt.value)?.topic}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Select Power Keys *
                        </Label>
                        <MultiSelect
                          options={getKeyOptions(pdu.uniqId)}
                          isMulti
                          value={getKeyOptions(pdu.uniqId).filter((option) =>
                            pdu.keys.includes(option.value)
                          )}
                          onChange={(opts: any) =>
                            handlePduKeysChange(
                              index,
                              opts.map((o: any) => o.value)
                            )
                          }
                          isDisabled={!pdu.uniqId || isSubmitting}
                          placeholder="Choose power keys..."
                        />
                        {pdu.uniqId && getKeyOptions(pdu.uniqId).length === 0 && (
                          <p className="text-xs text-amber-600">
                            Waiting for power data from device...
                          </p>
                        )}
                      </div>
                    </div>

                    {pduList.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removePdu(index)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Power Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Total Facility Power
              </h3>

              <Card className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Select Device *
                      </Label>
                      <Select
                        value={mainPower.uniqId ?? undefined}
                        onValueChange={handleMainPowerDeviceChange}
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose main power device..." />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {devices.find((d) => d.uniqId === opt.value)?.topic}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Select Power Key *
                      </Label>
                      <Select
                        value={mainPower.key ?? undefined}
                        onValueChange={(value) =>
                          setMainPower({ ...mainPower, key: value })
                        }
                        required
                        disabled={isSubmitting || !mainPower.uniqId}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose power key..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getKeyOptions(mainPower.uniqId).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <code className="font-mono">{opt.label}</code>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mainPower.uniqId &&
                        getKeyOptions(mainPower.uniqId).length === 0 && (
                          <p className="text-xs text-amber-600">
                            Waiting for power data from device...
                          </p>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            {mainPower.uniqId &&
              mainPower.key &&
              pduList.some((p) => p.uniqId && p.keys.length > 0) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <h4 className="text-sm font-medium mb-2">
                    Configuration Preview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Facility Power:
                      </span>
                      <span>
                        {devices.find((d) => d.uniqId === mainPower.uniqId)?.name}
                        {" → "}
                        {mainPower.key}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        IT Power Sources:
                      </span>
                      <span>
                        {pduList.filter((p) => p.uniqId && p.keys.length > 0).length}{" "}
                        racks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Keys Monitored:
                      </span>
                      <span>
                        {pduList.reduce((sum, p) => sum + p.keys.length, 0)}{" "}
                        power keys
                      </span>
                    </div>
                  </div>
                </div>
              )}
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              IT Load Details for {selectedConfig?.customName}
            </DialogTitle>
            <DialogDescription>
              Breakdown of IT load calculation for each configured rack.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Rack Name</TableHead>
                <TableHead>IT Load %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedConfig || selectedConfig.pduList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No PDU/Rack data available.
                  </TableCell>
                </TableRow>
              ) : (
                selectedConfig.pduList.map((pdu, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {devices.find((d) => d.uniqId === pdu.uniqId)?.name ||
                        `PDU-${index + 1}`}
                    </TableCell>
                    <TableCell>
                      {calculatePUEForPdu(
                        getMainPowerValue(selectedConfig),
                        getPduValue(pdu)
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
