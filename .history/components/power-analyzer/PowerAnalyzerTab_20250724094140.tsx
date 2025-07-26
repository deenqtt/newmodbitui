"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";

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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMqtt } from "@/contexts/MqttContext"; // Adjust path if needed

// --- Type Definitions ---
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const itemsPerPage = 10;

  // --- MQTT Integration ---
  const { subscribe, unsubscribe } = useMqtt();

  const handleMqttMessage = useCallback((topic: string, payload: string) => {
    try {
      const parsedPayload = JSON.parse(payload);
      setLiveData((prev) => ({ ...prev, [topic]: parsedPayload }));
    } catch (e) {
      console.error(`Failed to parse MQTT payload for topic ${topic}:`, e);
    }
  }, []);

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

  // --- Data Fetching ---
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
      toast.error("Failed to load initial data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Select Options & PUE Calculations ---
  const deviceOptions: SelectOption[] = useMemo(
    () => devices.map((d) => ({ value: d.uniqId, label: d.name })),
    [devices]
  );

  const getKeyOptions = useCallback(
    (uniqId: string | null): SelectOption[] => {
      if (!uniqId) return [];
      const device = devices.find((d) => d.uniqId === uniqId);
      const payload = liveData[device?.topic || ""] || device?.lastPayload;
      if (!payload) return [];
      return Object.keys(payload)
        .filter((key) => typeof payload[key] === "number")
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
      if (mainPowerValue === null) return "N/A";
      const totalItPower = config.pduList.reduce(
        (sum, pdu) => sum + (getPduValue(pdu) || 0),
        0
      );
      if (mainPowerValue === 0) return "N/A";
      return `${((totalItPower / mainPowerValue) * 100).toFixed(2)}%`;
    },
    [getMainPowerValue, getPduValue]
  );

  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue == null || pduValue == null) return "N/A";
      if (mainPowerValue === 0) return "N/A";
      return `${((pduValue / mainPowerValue) * 100).toFixed(2)}%`;
    },
    []
  );

  // --- Pagination ---
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return configs.slice(start, start + itemsPerPage);
  }, [configs, currentPage]);
  const totalPages = useMemo(
    () => Math.ceil(configs.length / itemsPerPage),
    [configs]
  );

  // --- Action Handlers ---
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
      setPduList(
        config.pduList.map((p) => ({ uniqId: p.uniqId, keys: p.keys }))
      );
      setMainPower({
        uniqId: config.mainPower.uniqId,
        key: config.mainPower.key,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleShowDetails = (config: PowerAnalyzerConfig) => {
    setSelectedConfig(config);
    setIsDetailModalOpen(true);
  };

  const promptDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    toast.promise(axios.delete(`/api/power-analyzer/${deletingId}`), {
      loading: "Deleting data...",
      success: () => {
        fetchAllData();
        return "Data deleted successfully!";
      },
      error: (err) => err.response?.data?.message || "Failed to delete data.",
    });
    setDeletingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customName ||
      !mainPower.uniqId ||
      !mainPower.key ||
      pduList.some((p) => !p.uniqId || p.keys.length === 0)
    ) {
      toast.error("Please fill all required fields.");
      return;
    }
    const payload = { customName, pduList, mainPower };
    const promise = editingId
      ? axios.put(`/api/power-analyzer/${editingId}`, payload)
      : axios.post("/api/power-analyzer", payload);

    toast.promise(promise, {
      loading: "Saving data...",
      success: () => {
        fetchAllData();
        setIsModalOpen(false);
        return `Data ${editingId ? "updated" : "saved"} successfully!`;
      },
      error: (err) => err.response?.data?.message || "Failed to save data.",
    });
  };

  const addPdu = () => setPduList([...pduList, { uniqId: null, keys: [] }]);
  const removePdu = (index: number) =>
    setPduList(pduList.filter((_, i) => i !== index));
  const handlePduChange = (
    index: number,
    field: "uniqId" | "keys",
    value: any
  ) => {
    const newList = [...pduList];
    if (field === "uniqId") {
      newList[index] = { uniqId: value, keys: [] };
    } else {
      newList[index] = { ...newList[index], keys: value };
    }
    setPduList(newList);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Power Analyzer</CardTitle>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" /> Add Data
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Custom Name</TableHead>
                <TableHead>Total PDU/Rack</TableHead>
                <TableHead>PUE (IT / Main)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((config, index) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      {index + 1 + (currentPage - 1) * itemsPerPage}
                    </TableCell>
                    <TableCell className="font-medium">
                      {config.customName}
                    </TableCell>
                    <TableCell>{config.pduList?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{calculateTotalPUE(config)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowDetails(config)}
                        >
                          Detail
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenModal(config)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => promptDelete(config.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"} Power Analyzer Data
            </DialogTitle>
            {/* SOLUSI WARNING 2: Tambahkan deskripsi untuk aksesibilitas */}
            <DialogDescription>
              Fill in the details to create or update a configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* ... sisa isi form tidak berubah ... */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customName" className="text-right">
                Custom Name
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <hr />
            <h4 className="font-semibold text-center text-sm text-muted-foreground">
              PDU (Racks) / IT Power
            </h4>
            {pduList.map((pdu, index) => (
              <div
                key={index}
                className="relative rounded-lg border p-4 grid gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Topic (Rack)</Label>
                    <Select
                      value={pdu.uniqId ?? undefined}
                      onValueChange={(value) =>
                        handlePduChange(index, "uniqId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Keys</Label>
                    <MultiSelect
                      options={getKeyOptions(pdu.uniqId)}
                      isMulti
                      value={getKeyOptions(pdu.uniqId).filter((o) =>
                        pdu.keys.includes(o.value)
                      )}
                      onChange={(opts: any) =>
                        handlePduChange(
                          index,
                          "keys",
                          opts.map((o: any) => o.value)
                        )
                      }
                      isDisabled={!pdu.uniqId}
                      placeholder="Select keys..."
                    />
                  </div>
                </div>
                {pduList.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-3 -right-3 h-6 w-6 rounded-full"
                    onClick={() => removePdu(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addPdu}>
              <Plus className="mr-2 h-4 w-4" /> Add Rack/PDU
            </Button>
            <hr />
            <h4 className="font-semibold text-center text-sm text-muted-foreground">
              Main Power
            </h4>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Select Topic</Label>
                <Select
                  value={mainPower.uniqId ?? undefined}
                  onValueChange={(value) =>
                    setMainPower({ uniqId: value, key: null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Key</Label>
                <Select
                  value={mainPower.key ?? undefined}
                  onValueChange={(value) =>
                    setMainPower({ ...mainPower, key: value })
                  }
                >
                  <SelectTrigger disabled={!mainPower.uniqId}>
                    <SelectValue placeholder="Select a key..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getKeyOptions(mainPower.uniqId).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Detail PUE for {selectedConfig?.customName}
            </DialogTitle>
            {/* SOLUSI WARNING 2: Tambahkan deskripsi untuk aksesibilitas */}
            <DialogDescription>
              A breakdown of PUE calculation for each configured rack.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Rack Name</TableHead>
                <TableHead>PUE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* SOLUSI WARNING 1: Logika kondisional ditaruh di luar map */}
              {!selectedConfig || selectedConfig.pduList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No PDU/Rack data.
                  </TableCell>
                </TableRow>
              ) : (
                selectedConfig.pduList.map((pdu, index) => {
                  const mainPowerValue = getMainPowerValue(selectedConfig);
                  const pduValue = getPduValue(pdu);
                  // Pastikan hanya return <TableRow> di sini
                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {devices.find((d) => d.uniqId === pdu.uniqId)?.name ||
                          `PDU-${index + 1}`}
                      </TableCell>
                      <TableCell>
                        {calculatePUEForPdu(mainPowerValue, pduValue)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
