"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2"; // <-- 1. Import SweetAlert2
import { Plus, Edit, Trash2, MoreVertical, Loader2 } from "lucide-react";

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
  const itemsPerPage = 10;

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
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return configs.slice(start, start + itemsPerPage);
  }, [configs, currentPage]);
  const totalPages = useMemo(
    () => Math.ceil(configs.length / itemsPerPage),
    [configs]
  );
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
      Swal.fire("Error", "Harap isi semua field yang wajib diisi.", "error");
      return;
    }
    setIsSubmitting(true);
    Swal.fire({
      title: "Menyimpan...",
      text: "Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const payload = { customName, pduList, mainPower };
      const promise = editingId
        ? axios.put(`/api/power-analyzer/${editingId}`, payload)
        : axios.post("/api/power-analyzer", payload);

      await promise;

      Swal.fire({
        title: "Berhasil!",
        text: `Data berhasil ${editingId ? "diperbarui" : "disimpan"}.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) {
      Swal.fire({
        title: "Gagal!",
        text:
          error.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan data.",
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Anda tidak akan bisa mengembalikan data ini!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true);
        Swal.fire({
          title: "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        try {
          await axios.delete(`/api/power-analyzer/${id}`);
          Swal.fire("Dihapus!", "Data Anda telah berhasil dihapus.", "success");
          fetchAllData();
        } catch (error: any) {
          Swal.fire(
            "Gagal!",
            error.response?.data?.message || "Gagal menghapus data.",
            "error"
          );
        } finally {
          setIsSubmitting(false);
        }
      }
    });
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
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada data.
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
                            <span className="sr-only">Buka menu</span>
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
                            onClick={() => handleDelete(config.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
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
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Berikutnya
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Tambah"} Data Power Analyzer
            </DialogTitle>
            <DialogDescription>
              Isi detail untuk membuat atau memperbarui konfigurasi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customName" className="text-right">
                Nama Kustom
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
                    <Label>Pilih Topik (Rack)</Label>
                    <Select
                      value={pdu.uniqId ?? undefined}
                      onValueChange={(value) =>
                        handlePduDeviceChange(index, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih topik..." />
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
                    <Label>Pilih Keys</Label>
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
                      isDisabled={!pdu.uniqId}
                      placeholder="Pilih keys..."
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
              <Plus className="mr-2 h-4 w-4" /> Tambah Rack/PDU
            </Button>
            <hr />
            <h4 className="font-semibold text-center text-sm text-muted-foreground">
              Main Power
            </h4>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Pilih Topik</Label>
                <Select
                  value={mainPower.uniqId ?? undefined}
                  onValueChange={handleMainPowerDeviceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih topik..." />
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
                <Label>Pilih Key</Label>
                <Select
                  value={mainPower.key ?? undefined}
                  onValueChange={(value) =>
                    setMainPower({ ...mainPower, key: value })
                  }
                >
                  <SelectTrigger disabled={!mainPower.uniqId}>
                    <SelectValue placeholder="Pilih key..." />
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
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Detail PUE untuk {selectedConfig?.customName}
            </DialogTitle>
            <DialogDescription>
              Rincian perhitungan PUE untuk setiap rack yang dikonfigurasi.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nama Rack</TableHead>
                <TableHead>PUE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedConfig || selectedConfig.pduList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada data PDU/Rack.
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
