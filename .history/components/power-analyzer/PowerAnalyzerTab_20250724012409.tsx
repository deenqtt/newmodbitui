// File: components/power-analyzer/PowerAnalyzerTab.tsx
"use client"; // Ini adalah Client Component di Next.js

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  FormEvent,
} from "react";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext"; // Asumsi ada MqttContext

// --- UI Components dari Shadcn UI ---
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react"; // Icons

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// --- PLACEHOLDER Multiselect Component (bisa diganti dengan Shadcn/library lain) ---
// Mengadaptasi Multiselect dari Vue-multiselect.
// Untuk kesederhanaan, ini akan menjadi multiple select HTML biasa,
// Anda bisa menggantinya dengan implementasi Shadcn/Radix UI yang lebih kompleks jika diperlukan.
interface MultiselectProps {
  value: string[];
  options: string[];
  placeholder?: string;
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
}

const Multiselect: React.FC<MultiselectProps> = ({
  value,
  options,
  placeholder = "Select...",
  onChange,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    onChange?.(selectedOptions);
  };

  return (
    <select
      multiple
      value={value}
      onChange={handleChange}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ height: "auto", minHeight: "40px" }}
      disabled={disabled}
    >
      {options.length === 0 && (
        <option value="" disabled>
          {placeholder} (No options)
        </option>
      )}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
// --- END PLACEHOLDER Multiselect Component ---

// --- Type Definitions (sesuai dengan schema.prisma dan payload Vue) ---
interface DeviceForSelection {
  id: number; // ID numerik dari backend Vue (topics.id)
  uniqId: string; // ID unik dari DeviceExternal (React)
  name: string;
  topicName: string; // topicName dari backend Vue (topics.topicName)
  isModular: number; // isModular dari backend Vue
  payload?: Record<string, any>; // Untuk live MQTT payload
  lastPayload?: Record<string, any>; // Dari backend
}

interface PduConfig {
  topicId: string; // ID topik dari backend
  name: string; // Auto-generated name like PDU-1
  keys: string[]; // Array of keys for PDU
  value: number | null; // Live value from MQTT
  topic?: DeviceForSelection; // Full device object
  filteredKeys?: string[]; // Keys available from the device's payload
  topicName?: string; // Untuk subscribe MQTT
}

interface MainPowerConfig {
  topicId: string; // ID topik dari backend
  key: string; // Single key for Main Power
  value: number | null; // Live value from MQTT
  topic?: DeviceForSelection; // Full device object
  filteredKeys?: string[]; // Keys available from the device's payload
  topicName?: string; // Untuk subscribe MQTT
}

interface PowerAnalyzerConfig {
  id: string; // ID unik dari konfigurasi Power Analyzer
  customName: string;
  type: "powerAn"; // Sesuai dengan Vue code
  apiTopicId: string | null; // ID topik dari DeviceExternal untuk Power Analyzer itu sendiri
  pduList: PduConfig[]; // Array of PDU sensors
  mainPower: MainPowerConfig | null; // Single Main Power sensor
  chartConfig: Record<string, any> | null;
  apiTopic?: DeviceForSelection; // The DeviceExternal object for the Power Analyzer's own topic
}

interface PowerAnalyzerLog {
  id: string;
  config: { customName: string };
  value: number;
  timestamp: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function PowerAnalyzerTab() {
  const { subscribe, unsubscribe } = useMqtt();

  // --- State Utama ---
  const [powerAnalyzerConfigs, setPowerAnalyzerConfigs] = useState<
    PowerAnalyzerConfig[]
  >([]);
  const [allLogs, setAllLogs] = useState<PowerAnalyzerLog[]>([]);
  const [devicesForSelection, setDevicesForSelection] = useState<
    DeviceForSelection[]
  >([]);
  const [liveSensorValues, setLiveSensorValues] = useState<
    Record<
      string,
      { mainPower: number | null; pduValues: Record<string, number | null> }
    >
  >({}); // key: configId, value: { mainPower: value, pduValues: { pduTopicId: value } }

  // --- Form State (Modal Add/Edit) ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // For Detail Modal
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] =
    useState<PowerAnalyzerConfig | null>(null); // For Detail Modal
  const [customName, setCustomName] = useState("");
  const [pduListForm, setPduListForm] = useState<PduConfig[]>([
    { topicId: "", name: "", keys: [], filteredKeys: [], value: null },
  ]);
  const [mainPowerForm, setMainPowerForm] = useState<MainPowerConfig>({
    topicId: "",
    key: "",
    filteredKeys: [],
    value: null,
  });
  const [chartConfigForm, setChartConfigForm] = useState<Record<string, any>>(
    {}
  );

  // --- UI Loading/Disable State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);
  const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false);

  // --- Delete Konfirmasi State ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] =
    useState<PowerAnalyzerConfig | null>(null);
  const [isDeleteAllLogsAlertOpen, setIsDeleteAllLogsAlertOpen] =
    useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [logsPage, setLogsPage] = useState(1);
  const logsPerPage = 10;

  // Ref untuk melacak langganan MQTT aktif untuk configs (main table data)
  const configTopicSubscriptionsRef = useRef<Map<string, string>>(new Map()); // Key: topicName, Value: topicName (for easy lookup)
  // Ref untuk melacak langganan MQTT aktif untuk form (untuk populate keys)
  const formTopicSubscriptionsRef = useRef<Map<string, string>>(new Map()); // Key: topicName, Value: topicName

  // Refs untuk menyimpan state terbaru agar `handleMqttMessage` yang stabil bisa mengaksesnya
  const powerAnalyzerConfigsRef = useRef<PowerAnalyzerConfig[]>([]);
  const devicesForSelectionRef = useRef<DeviceForSelection[]>([]);

  // Update refs whenever the state changes
  useEffect(() => {
    powerAnalyzerConfigsRef.current = powerAnalyzerConfigs;
  }, [powerAnalyzerConfigs]);

  useEffect(() => {
    devicesForSelectionRef.current = devicesForSelection;
  }, [devicesForSelection]);

  const paginatedConfigs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return powerAnalyzerConfigs.slice(start, start + itemsPerPage);
  }, [powerAnalyzerConfigs, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(powerAnalyzerConfigs.length / itemsPerPage);
  }, [powerAnalyzerConfigs, itemsPerPage]);

  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage;
    return allLogs.slice(start, start + logsPerPage);
  }, [allLogs, logsPage, logsPerPage]);

  const totalLogsPages = useMemo(() => {
    return Math.ceil(allLogs.length / logsPerPage);
  }, [allLogs, logsPerPage]);

  // --- Helper Functions ---
  const getAuthHeaders = useCallback(() => {
    const authToken = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
  }, []);

  // Fungsi untuk menghitung nilai PUE total (Main Power / IT Power)
  const calculatePUE = useCallback(
    (mainPowerValue: number | null, pduList: PduConfig[]): string => {
      if (mainPowerValue === null || !pduList || pduList.length === 0) {
        return "N/A"; // Data tidak valid
      }

      const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
      if (mainPowerValue === 0) {
        // Jika mainPowerValue nol, dan itPower juga nol, bisa jadi 0% atau N/A
        // Jika itPower ada nilainya tapi mainPower nol, ini adalah kasus error / tak terhingga
        return itPower === 0 ? "0%" : "N/A";
      }

      const puePercentage = ((itPower / mainPowerValue) * 100).toFixed(2);
      return `${puePercentage}%`;
    },
    [] // Tidak ada dependensi karena hanya menggunakan argumen
  );

  // Fungsi untuk menghitung PUE per PDU (untuk detail modal)
  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue == null || pduValue == null) return "N/A";
      if (mainPowerValue === 0) return "N/A";
      return ((pduValue / mainPowerValue) * 100).toFixed(2) + "%";
    },
    []
  );

  // --- MQTT Message Handler ---
  const handleMqttMessage = useCallback(
    (topicName: string, messageString: string) => {
      let outerParsedPayload: Record<string, any>;
      try {
        outerParsedPayload = JSON.parse(messageString);
      } catch (e) {
        console.error(
          `[PowerAnalyzerTab MQTT] Error parsing outer payload for ${topicName}:`,
          e
        );
        return;
      }

      let innerValuePayload: Record<string, any> = {};
      if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "string"
      ) {
        try {
          innerValuePayload = JSON.parse(outerParsedPayload.value);
        } catch (e) {
          console.warn(
            `[PowerAnalyzerTab MQTT] 'value' field not valid JSON string for ${topicName}. Falling back.`
          );
          innerValuePayload = outerParsedPayload;
        }
      } else if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "object"
      ) {
        innerValuePayload = outerParsedPayload.value;
      } else {
        innerValuePayload = outerParsedPayload;
      }

      // Update devicesForSelection's payload for key filtering in forms
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) => {
          if (d.topicName === topicName) {
            return { ...d, payload: innerValuePayload };
          }
          return d;
        })
      );

      // Update liveSensorValues for PowerAnalyzerConfigs
      setLiveSensorValues((prevLiveValues) => {
        const newLiveValues = { ...prevLiveValues };
        let configsUpdated = false;

        const currentConfigs = powerAnalyzerConfigsRef.current;
        const currentDevices = devicesForSelectionRef.current;

        currentConfigs.forEach((config) => {
          let configLiveValuesUpdated = false;
          const currentConfigLiveValues = newLiveValues[config.id] || {
            mainPower: null,
            pduValues: {},
          };

          // Update PDU values
          config.pduList.forEach((pdu) => {
            const device = currentDevices.find(
              (d) => d.topicName === topicName && d.id === parseInt(pdu.topicId)
            );
            if (device && device.topicName === topicName) {
              let totalPduValue = 0;
              pdu.keys.forEach((key) => {
                if (key in innerValuePayload) {
                  const val = parseFloat(innerValuePayload[key]);
                  if (!isNaN(val)) {
                    totalPduValue += val;
                  }
                } else {
                  console.warn(
                    `[PowerAnalyzerTab MQTT] PDU key "${key}" not found in payload for device ${device.name} on topic ${topicName}.`
                  );
                }
              });
              if (
                currentConfigLiveValues.pduValues[pdu.topicId] !== totalPduValue
              ) {
                currentConfigLiveValues.pduValues[pdu.topicId] = totalPduValue;
                // Update the config's pduList value directly for rendering
                config.pduList.find((p) => p.topicId === pdu.topicId)!.value =
                  totalPduValue;
                configsUpdated = true;
                configLiveValuesUpdated = true;
              }
            }
          });

          // Update Main Power value
          if (config.mainPower) {
            const device = currentDevices.find(
              (d) =>
                d.topicName === topicName &&
                d.id === parseInt(config.mainPower!.topicId)
            );
            if (device && device.topicName === topicName) {
              const mainKey = config.mainPower.key;
              if (mainKey in innerValuePayload) {
                const val = parseFloat(innerValuePayload[mainKey]);
                if (!isNaN(val) && currentConfigLiveValues.mainPower !== val) {
                  currentConfigLiveValues.mainPower = val;
                  // Update the config's mainPower value directly for rendering
                  config.mainPower.value = val;
                  configsUpdated = true;
                  configLiveValuesUpdated = true;
                }
              } else {
                console.warn(
                  `[PowerAnalyzerTab MQTT] Main Power key "${mainKey}" not found in payload for device ${device.name} on topic ${topicName}.`
                );
              }
            }
          }

          if (configLiveValuesUpdated) {
            newLiveValues[config.id] = currentConfigLiveValues;
            // IMPORTANT: Trigger re-render for the main table by updating powerAnalyzerConfigs
            // This is crucial because `calculatePowerAnalyzerValue` depends on `liveSensorValues`
            // and the `pduList`/`mainPower` values directly on the config object.
            setPowerAnalyzerConfigs((prevConfigs) =>
              prevConfigs.map((c) => (c.id === config.id ? { ...config } : c))
            );
          }
        });
        return configsUpdated ? newLiveValues : prevLiveValues;
      });
    },
    [] // Dependensi kosong karena menggunakan refs dan functional updates
  );

  // Fungsi untuk update nilai PDU/MainPower di backend setelah MQTT update
  const updatePduValuesInBackend = useCallback(
    async (puePdu: PowerAnalyzerConfig) => {
      try {
        // Stringify JSON untuk field pduList dan mainPower
        const updatedPuePdu = {
          ...puePdu,
          pduList: puePdu.pduList.map((pdu) => ({
            topicId: pdu.topicId,
            name: pdu.name,
            keys: pdu.keys,
            value: pdu.value, // Kirim nilai live yang sudah diupdate
          })),
          mainPower: puePdu.mainPower
            ? {
                topicId: puePdu.mainPower.topicId,
                key: puePdu.mainPower.key,
                value: puePdu.mainPower.value, // Kirim nilai live yang sudah diupdate
              }
            : null,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/puePdu/${puePdu.id}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedPuePdu),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            `Error updating PDU values for ID: ${puePdu.id}`,
            errorData
          );
        }
      } catch (error) {
        console.error(`Error updating PDU values for ID: ${puePdu.id}`, error);
      }
    },
    [getAuthHeaders]
  );

  // --- Data Fetching Functions ---
  const fetchDevicesForSelection = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/topics`, // Mengambil dari /api/topics sesuai Vue
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch devices for selection."
        );
      }
      const data: any[] = await response.json(); // Data mentah dari /api/topics
      // Filter untuk hanya menampilkan perangkat dengan isModular = 0
      const filteredTopics = data.filter((topic) => topic.isModular === 0);
      setDevicesForSelection(
        filteredTopics.map((device) => ({
          id: device.id,
          uniqId: device.id.toString(), // Menggunakan ID numerik sebagai uniqId
          name: device.Name,
          topicName: device.TopicName,
          isModular: device.IsModular,
          payload: {}, // Akan diisi oleh MQTT
          lastPayload: device.LastPayload || {}, // Jika ada lastPayload di response topics
        }))
      );
    } catch (error: any) {
      console.error(
        "[PowerAnalyzerTab] Error fetching devices for selection:",
        error
      );
      Toast.fire({
        icon: "error",
        title: `Failed to fetch devices: ${error.message}`,
      });
    }
  }, [getAuthHeaders]);

  const fetchData = useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      // Fetch configs (puePdu)
      const configsRes = await fetch(
        `${API_BASE_URL}/api/puePdu`, // Mengambil dari /api/puePdu sesuai Vue
        {
          headers: getAuthHeaders(),
        }
      );
      if (!configsRes.ok) {
        const errorData = await configsRes.json();
        throw new Error(
          errorData.message || "Failed to fetch power analyzer configurations."
        );
      }
      const configsData: any[] = await configsRes.json(); // Data mentah dari puePdu

      // Fetch logs
      const logsRes = await fetch(`${API_BASE_URL}/api/power-analyzer-logs`, {
        headers: getAuthHeaders(),
      });
      if (!logsRes.ok) {
        const errorData = await logsRes.json();
        throw new Error(
          errorData.message || "Failed to fetch power analyzer logs."
        );
      }
      const logsData: PowerAnalyzerLog[] = await logsRes.json();

      const initialLiveSensorData: Record<
        string,
        { mainPower: number | null; pduValues: Record<string, number | null> }
      > = {};

      const processedConfigs: PowerAnalyzerConfig[] = configsData
        .filter((item) => item.type === "powerAn") // Filter hanya type powerAn
        .map((config) => {
          // Parse JSON string fields from backend
          const pduListParsed = config.pduListJson
            ? JSON.parse(config.pduListJson)
            : [];
          const mainPowerParsed = config.mainPowerJson
            ? JSON.parse(config.mainPowerJson)
            : null;

          const currentDevices = devicesForSelectionRef.current; // Menggunakan ref

          // Map PDU list
          const pduListMapped: PduConfig[] = (pduListParsed || []).map(
            (pdu: any) => {
              const device = currentDevices.find(
                (d) => d.id === parseInt(pdu.topicId)
              );
              const pduValue =
                liveSensorValues[config.id]?.pduValues[pdu.topicId] || null; // Use live value if available
              return {
                topicId: pdu.topicId,
                name: pdu.name || `PDU-${pdu.topicId}`,
                keys: pdu.keys || [],
                value: pduValue,
                topic: device,
                topicName: device?.topicName,
                filteredKeys: Object.keys(device?.payload || {}).filter((key) =>
                  key.toLowerCase().includes("power")
                ),
              };
            }
          );

          // Map Main Power
          let mainPowerMapped: MainPowerConfig | null = null;
          if (mainPowerParsed) {
            const device = currentDevices.find(
              (d) => d.id === parseInt(mainPowerParsed.topicId)
            );
            const mainPowerValue =
              liveSensorValues[config.id]?.mainPower || null; // Use live value if available
            mainPowerMapped = {
              topicId: mainPowerParsed.topicId,
              key: mainPowerParsed.key,
              value: mainPowerValue,
              topic: device,
              topicName: device?.topicName,
              filteredKeys: Object.keys(device?.payload || {}).filter((key) =>
                key.toLowerCase().includes("power")
              ),
            };
          }

          // Initialize live sensor data for this config
          initialLiveSensorData[config.id] = {
            mainPower: mainPowerMapped?.value || null,
            pduValues: pduListMapped.reduce((acc, pdu) => {
              acc[pdu.topicId] = pdu.value;
              return acc;
            }, {} as Record<string, number | null>),
          };

          // Find apiTopic device
          const apiTopicDevice = currentDevices.find(
            (d) => d.id === parseInt(config.apiTopicId)
          );

          return {
            ...config,
            pduList: pduListMapped,
            mainPower: mainPowerMapped,
            apiTopic: apiTopicDevice,
          };
        });

      setPowerAnalyzerConfigs(processedConfigs);
      setLiveSensorValues(initialLiveSensorData);
      setAllLogs(logsData);

      // --- Logic Subscribe/Unsubscribe MQTT ---
      const topicsToSubscribe = new Set<string>();
      processedConfigs.forEach((config) => {
        // Subscribe to apiTopic if available
        if (config.apiTopic?.topicName) {
          topicsToSubscribe.add(config.apiTopic.topicName);
        }
        // Subscribe to PDU topics
        config.pduList.forEach((pdu) => {
          if (pdu.topic?.topicName) {
            topicsToSubscribe.add(pdu.topic.topicName);
          }
        });
        // Subscribe to Main Power topic
        if (config.mainPower?.topic?.topicName) {
          topicsToSubscribe.add(config.mainPower.topic.topicName);
        }
      });

      const currentSubscribedTopics = new Set(
        configTopicSubscriptionsRef.current.values()
      );

      // Unsubscribe topics no longer needed
      currentSubscribedTopics.forEach((topic) => {
        if (!topicsToSubscribe.has(topic)) {
          unsubscribe(topic, handleMqttMessage);
          // Hapus dari ref
          for (let [
            refTopic,
          ] of configTopicSubscriptionsRef.current.entries()) {
            if (refTopic === topic)
              configTopicSubscriptionsRef.current.delete(refTopic);
          }
        }
      });

      // Subscribe to new topics
      topicsToSubscribe.forEach((topic) => {
        if (!currentSubscribedTopics.has(topic)) {
          subscribe(topic, handleMqttMessage);
          configTopicSubscriptionsRef.current.set(topic, topic); // Store topicName
        }
      });
    } catch (error: any) {
      console.error("[PowerAnalyzerTab] Error fetching data:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to fetch data: ${error.message}`,
      });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [
    getAuthHeaders,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    liveSensorValues,
  ]); // liveSensorValues sebagai dependensi karena digunakan untuk inisialisasi

  // --- Form Related Functions ---
  const resetForm = useCallback(() => {
    setCustomName("");
    setPduListForm([
      { topicId: "", name: "", keys: [], filteredKeys: [], value: null },
    ]);
    setMainPowerForm({ topicId: "", key: "", filteredKeys: [], value: null });
    setChartConfigForm({});
    // Unsubscribe topik yang mungkin masih aktif dari form sebelumnya
    formTopicSubscriptionsRef.current.forEach((topicName) => {
      unsubscribe(topicName, handleMqttMessage);
    });
    formTopicSubscriptionsRef.current.clear();
  }, [unsubscribe, handleMqttMessage]);

  const openAddDataModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const addPduToForm = () => {
    // Renamed from addSensorToForm
    setPduListForm((prev) => [
      ...prev,
      { topicId: "", name: "", keys: [], filteredKeys: [], value: null },
    ]);
  };

  const removePduFromForm = (index: number) => {
    // Renamed from removeSensorFromForm
    setPduListForm((prev) => {
      const pduToRemove = prev[index];
      if (pduToRemove.topicId) {
        const device = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(pduToRemove.topicId)
        );
        const topicName = device?.topicName;
        if (topicName && formTopicSubscriptionsRef.current.has(topicName)) {
          unsubscribe(topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.delete(topicName);
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePduTopic = useCallback(
    async (index: number, selectedTopicId: string) => {
      setPduListForm((prev) => {
        const newList = [...prev];
        const selectedDeviceObj = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(selectedTopicId)
        );

        // Unsubscribe previous topic
        const prevPdu = newList[index];
        const prevDevice = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(prevPdu.topicId)
        );
        const prevTopicName = prevDevice?.topicName;

        if (
          prevTopicName &&
          formTopicSubscriptionsRef.current.has(prevTopicName)
        ) {
          unsubscribe(prevTopicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.delete(prevTopicName);
        }

        // Subscribe new topic
        if (
          selectedDeviceObj?.topicName &&
          !formTopicSubscriptionsRef.current.has(selectedDeviceObj.topicName)
        ) {
          subscribe(selectedDeviceObj.topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(
            selectedDeviceObj.topicName,
            selectedDeviceObj.topicName
          );
        }

        newList[index] = {
          ...newList[index],
          topicId: selectedTopicId,
          topic: selectedDeviceObj,
          filteredKeys: Object.keys(selectedDeviceObj?.payload || {}).filter(
            (key) => key.toLowerCase().includes("power")
          ),
          keys: [], // Reset selected keys
        };
        return newList;
      });
    },
    [subscribe, unsubscribe, handleMqttMessage]
  );

  const updatePduKeys = useCallback((index: number, selectedKeys: string[]) => {
    setPduListForm((prev) => {
      const newList = [...prev];
      newList[index] = { ...newList[index], keys: selectedKeys };
      return newList;
    });
  }, []);

  const updateMainPowerTopic = useCallback(
    async (selectedTopicId: string) => {
      setMainPowerForm((prev) => {
        const selectedDeviceObj = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(selectedTopicId)
        );

        // Unsubscribe previous topic
        const prevTopicName = prev.topic?.topicName;
        if (
          prevTopicName &&
          formTopicSubscriptionsRef.current.has(prevTopicName)
        ) {
          unsubscribe(prevTopicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.delete(prevTopicName);
        }

        // Subscribe new topic
        if (
          selectedDeviceObj?.topicName &&
          !formTopicSubscriptionsRef.current.has(selectedDeviceObj.topicName)
        ) {
          subscribe(selectedDeviceObj.topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(
            selectedDeviceObj.topicName,
            selectedDeviceObj.topicName
          );
        }

        return {
          ...prev,
          topicId: selectedTopicId,
          topic: selectedDeviceObj,
          filteredKeys: Object.keys(selectedDeviceObj?.payload || {}).filter(
            (key) => key.toLowerCase().includes("power")
          ),
          key: "", // Reset key
        };
      });
    },
    [subscribe, unsubscribe, handleMqttMessage]
  );

  const updateMainPowerKey = useCallback((selectedKey: string) => {
    setMainPowerForm((prev) => ({ ...prev, key: selectedKey }));
  }, []);

  const handleAddData = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !customName ||
      !mainPowerForm.topicId ||
      !mainPowerForm.key ||
      pduListForm.some((p) => !p.topicId || p.keys.length === 0)
    ) {
      Toast.fire({ icon: "error", title: "Please fill all required fields." });
      return;
    }
    const isDuplicate = powerAnalyzerConfigs.some(
      (c) => c.customName.toLowerCase() === customName.toLowerCase()
    );
    if (isDuplicate) {
      Toast.fire({ icon: "error", title: "Custom name already exists." });
      return;
    }

    setIsSubmitting(true);
    try {
      // Buat DeviceExternal virtual untuk apiTopic (sesuai Vue: /api/topics)
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const apiTopicPayload = {
        Name: customName,
        SerialNumber: null,
        IpDevice: null,
        TopicName: `IOT/${sanitizedCustomName}`,
        IsModular: 0,
        PartNumber: null,
        DeviceBus: null,
      };

      const apiTopicResponse = await fetch(`${API_BASE_URL}/api/topics`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(apiTopicPayload),
      });

      if (!apiTopicResponse.ok) {
        const errorData = await apiTopicResponse.json();
        throw new Error(
          errorData.message || "Failed to create API topic device."
        );
      }
      const apiTopicData = await apiTopicResponse.json();
      const apiTopicId = apiTopicData.id; // ID numerik dari /api/topics

      // Membuat payload untuk puePdu
      const payload = {
        customName,
        type: "powerAn",
        apiTopicId: apiTopicId.toString(), // Simpan sebagai string
        pduListJson: JSON.stringify(
          pduListForm.map((pdu, index) => ({
            topicId: pdu.topicId,
            name: pdu.name || `PDU-${index + 1}`,
            keys: pdu.keys,
            value: null, // Initial value
          }))
        ),
        mainPowerJson: JSON.stringify({
          topicId: mainPowerForm.topicId,
          key: mainPowerForm.key,
          value: null, // Initial value
        }),
      };

      const response = await fetch(`${API_BASE_URL}/api/puePdu`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add config.");
      }

      Toast.fire({ icon: "success", title: "Power Analyzer config added!" });
      setIsAddModalOpen(false);
      resetForm();
      await fetchDevicesForSelection(); // Refresh devices for potential new apiTopic
      await fetchData(); // Refresh all data
    } catch (error: any) {
      console.error("[PowerAnalyzerTab] Error adding config:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to add config: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editItem = useCallback(
    (configId: string) => {
      const configToEdit = powerAnalyzerConfigs.find((c) => c.id === configId);
      if (!configToEdit) {
        Toast.fire({
          icon: "error",
          title: "Configuration not found for editing.",
        });
        return;
      }

      setSelectedConfigId(configId);
      setCustomName(configToEdit.customName);
      setChartConfigForm(configToEdit.chartConfig || {});

      // Populate Main Power form
      if (configToEdit.mainPower) {
        const mainPowerDevice = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(configToEdit.mainPower!.topicId)
        );
        setMainPowerForm({
          topicId: configToEdit.mainPower.topicId,
          key: configToEdit.mainPower.key,
          value: configToEdit.mainPower.value,
          topic: mainPowerDevice,
          filteredKeys: Object.keys(mainPowerDevice?.payload || {}).filter(
            (key) => key.toLowerCase().includes("power")
          ),
        });
        // Subscribe to main power topic for key filtering
        if (
          mainPowerDevice?.topicName &&
          !formTopicSubscriptionsRef.current.has(mainPowerDevice.topicName)
        ) {
          subscribe(mainPowerDevice.topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(
            mainPowerDevice.topicName,
            mainPowerDevice.topicName
          );
        }
      } else {
        setMainPowerForm({
          topicId: "",
          key: "",
          filteredKeys: [],
          value: null,
        });
      }

      // Populate PDU List form
      const preparedPduListForm = configToEdit.pduList.map((pdu) => {
        const pduDevice = devicesForSelectionRef.current.find(
          (d) => d.id === parseInt(pdu.topicId)
        );
        // Subscribe to PDU topic for key filtering
        if (
          pduDevice?.topicName &&
          !formTopicSubscriptionsRef.current.has(pduDevice.topicName)
        ) {
          subscribe(pduDevice.topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(
            pduDevice.topicName,
            pduDevice.topicName
          );
        }
        return {
          ...pdu,
          topic: pduDevice,
          filteredKeys: Object.keys(pduDevice?.payload || {}).filter((key) =>
            key.toLowerCase().includes("power")
          ),
        };
      });
      setPduListForm(preparedPduListForm);

      setIsEditModalOpen(true);
    },
    [powerAnalyzerConfigs, subscribe, handleMqttMessage]
  );

  const handleEditData = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !selectedConfigId ||
      !customName ||
      !mainPowerForm.topicId ||
      !mainPowerForm.key ||
      pduListForm.some((p) => !p.topicId || p.keys.length === 0)
    ) {
      Toast.fire({ icon: "error", title: "Please fill all required fields." });
      return;
    }
    const isDuplicate = powerAnalyzerConfigs.some(
      (c) =>
        c.customName.toLowerCase() === customName.toLowerCase() &&
        c.id !== selectedConfigId
    );
    if (isDuplicate) {
      Toast.fire({ icon: "error", title: "Custom name already exists." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customName,
        type: "powerAn",
        pduListJson: JSON.stringify(
          pduListForm.map((pdu, index) => ({
            topicId: pdu.topicId,
            name: pdu.name || `PDU-${index + 1}`,
            keys: pdu.keys,
            value: null,
          }))
        ),
        mainPowerJson: JSON.stringify({
          topicId: mainPowerForm.topicId,
          key: mainPowerForm.key,
          value: null,
        }),
        chartConfig: chartConfigForm,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/puePdu/${selectedConfigId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update config.");
      }

      Toast.fire({ icon: "success", title: "Power Analyzer config updated!" });
      setIsEditModalOpen(false);
      resetForm();
      await fetchDevicesForSelection(); // Refresh devices just in case apiTopic name/topic changed
      await fetchData(); // Refresh all data
    } catch (error: any) {
      console.error("[PowerAnalyzerTab] Error updating config:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to update config: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = useCallback(
    (configId: string) => {
      setConfigToDelete(
        powerAnalyzerConfigs.find((c) => c.id === configId) || null
      );
      setIsDeleteAlertOpen(true);
    },
    [powerAnalyzerConfigs]
  );

  const confirmDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true);
    try {
      // Delete from puePdu
      const response = await fetch(
        `${API_BASE_URL}/api/puePdu/${configToDelete.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete config.");
      }

      // Delete from topics (apiTopicId)
      if (configToDelete.apiTopicId) {
        const topicDeleteResponse = await fetch(
          `${API_BASE_URL}/api/topics/${configToDelete.apiTopicId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        if (!topicDeleteResponse.ok) {
          const errorData = await topicDeleteResponse.json();
          console.error(
            `Failed to delete associated API topic: ${errorData.message}`
          );
          // Don't throw here, as the main config is already deleted. Just log.
        }
      }

      Toast.fire({ icon: "success", title: "Power Analyzer config deleted!" });
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
      await fetchDevicesForSelection(); // Refresh devices for potential apiTopic deletion
      await fetchData(); // Refresh all data
    } catch (error: any) {
      console.error("[PowerAnalyzerTab] Error deleting config:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to delete config: ${error.message}`,
      });
    } finally {
      setIsDeletingConfig(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeletingAllLogs(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/power-analyzer-logs/delete-all`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete all logs.");
      }
      Toast.fire({ icon: "success", title: "All logs deleted!" });
      setAllLogs([]);
      setLogsPage(1);
    } catch (error: any) {
      console.error("[PowerAnalyzerTab] Error deleting all logs:", error);
      Toast.fire({
        icon: "error",
        title: `Failed to delete all logs: ${error.message}`,
      });
    } finally {
      setIsDeletingAllLogs(false);
      setIsDeleteAllLogsAlertOpen(false);
    }
  };

  const showDetails = useCallback((item: PowerAnalyzerConfig) => {
    setSelectedItemForDetail(item);
    setIsDetailModalOpen(true);
  }, []);

  // --- useEffects ---

  // Effect 1: Fetch devices for selection on component mount.
  // Ini hanya akan dijalankan sekali saat komponen dimuat.
  // Juga menangani cleanup langganan MQTT saat komponen di-unmount.
  useEffect(() => {
    fetchDevicesForSelection();

    // Cleanup MQTT subscriptions on unmount
    return () => {
      configTopicSubscriptionsRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      formTopicSubscriptionsRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      configTopicSubscriptionsRef.current.clear();
      formTopicSubscriptionsRef.current.clear();
    };
  }, [fetchDevicesForSelection, unsubscribe, handleMqttMessage]);

  // Effect 2: Fetch Power Analyzer configs and logs.
  // Ini akan dijalankan setiap kali `devicesForSelection` berubah (setelah fetch awal,
  // atau setelah add/edit/delete yang memicu refresh devices).
  useEffect(() => {
    if (devicesForSelection.length > 0) {
      fetchData();
    }
  }, [devicesForSelection, fetchData]);

  // Effect 3: Reset form when modals are closed
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isAddModalOpen, isEditModalOpen, resetForm]);

  // Effect 4: Update backend when live sensor values change (similar to Vue's watch and updatePduValuesInBackend)
  useEffect(() => {
    // Iterate through current powerAnalyzerConfigs to find which one needs update
    // This effect runs whenever liveSensorValues changes.
    // We need to be careful not to create an infinite loop.
    // Only trigger updatePduValuesInBackend if the *calculated* PUE or values actually change.
    // This is a simplified approach. A more robust solution might involve debouncing or checking deep equality.

    // A more precise way would be to pass the specific config that changed to updatePduValuesInBackend
    // from handleMqttMessage, but for simplicity and to match Vue's `watch` behavior,
    // we iterate here.

    const currentConfigs = powerAnalyzerConfigsRef.current; // Get latest configs via ref
    currentConfigs.forEach((config) => {
      const liveDataForConfig = liveSensorValues[config.id];
      if (liveDataForConfig) {
        // Create a temporary config object with updated live values to check for changes
        const tempPduList: PduConfig[] = config.pduList.map((pdu) => ({
          ...pdu,
          value:
            liveDataForConfig.pduValues[pdu.topicId] !== undefined
              ? liveDataForConfig.pduValues[pdu.topicId]
              : pdu.value,
        }));
        const tempMainPower: MainPowerConfig | null = config.mainPower
          ? {
              ...config.mainPower,
              value:
                liveDataForConfig.mainPower !== undefined
                  ? liveDataForConfig.mainPower
                  : config.mainPower.value,
            }
          : null;

        // Check if values actually changed before calling backend
        const hasPduValueChanges = config.pduList.some(
          (pdu, idx) => pdu.value !== tempPduList[idx].value
        );
        const hasMainPowerValueChange =
          config.mainPower?.value !== tempMainPower?.value;

        if (hasPduValueChanges || hasMainPowerValueChange) {
          // Create a new config object with updated values for the backend call
          const updatedConfigForBackend = {
            ...config,
            pduList: tempPduList,
            mainPower: tempMainPower,
          };
          updatePduValuesInBackend(updatedConfigForBackend);
        }
      }
    });
  }, [liveSensorValues, updatePduValuesInBackend]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Power Analyzer Configurations</CardTitle>
            <CardDescription>
              Configure sensors for detailed power analysis and charting.
            </CardDescription>
          </div>
          <Button
            onClick={openAddDataModal}
            disabled={
              isLoadingInitialData ||
              isSubmitting ||
              isDeletingConfig ||
              isDeletingAllLogs
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Data
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table for Power Analyzer Configurations */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Custom Name</TableHead>
                <TableHead>Total PDU/Rack</TableHead>
                <TableHead>PUE (Main Power / IT Power)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingInitialData ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedConfigs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-48 text-muted-foreground"
                  >
                    No configurations found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedConfigs.map((config, index) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      {index + 1 + (currentPage - 1) * itemsPerPage}
                    </TableCell>
                    <TableCell>{config.customName}</TableCell>
                    <TableCell>{config.pduList?.length || 0}</TableCell>
                    <TableCell>
                      {calculatePUE(
                        liveSensorValues[config.id]?.mainPower !== undefined
                          ? liveSensorValues[config.id]?.mainPower
                          : config.mainPower?.value,
                        config.pduList.map((pdu) => ({
                          ...pdu,
                          value:
                            liveSensorValues[config.id]?.pduValues[
                              pdu.topicId
                            ] !== undefined
                              ? liveSensorValues[config.id]?.pduValues[
                                  pdu.topicId
                                ]
                              : pdu.value,
                        }))
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => showDetails(config)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        Detail
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2"
                        onClick={() => editItem(config.id)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(config.id)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        {isDeletingConfig &&
                        configToDelete?.id === config.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Configs */}
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={
              currentPage === 1 ||
              isLoadingInitialData ||
              isSubmitting ||
              isDeletingConfig ||
              isDeletingAllLogs
            }
          >
            Previous
          </Button>
          <span className="mx-2 text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={
              currentPage === totalPages ||
              isLoadingInitialData ||
              isSubmitting ||
              isDeletingConfig ||
              isDeletingAllLogs
            }
          >
            Next
          </Button>
        </div>
      </CardContent>

      {/* Power Analyzer Logs Table */}
      <Card className="shadow-sm mt-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Power Analyzer Logs</CardTitle>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteAllLogsAlertOpen(true)}
            disabled={
              allLogs.length === 0 ||
              isLoadingInitialData ||
              isSubmitting ||
              isDeletingConfig ||
              isDeletingAllLogs
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete All Logs
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Config Name</TableHead>
                  <TableHead>Value (W)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInitialData ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No logs available.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.config?.customName || "N/A"}</TableCell>
                      <TableCell>{log.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 border-t">
          <div className="text-xs text-muted-foreground">
            Page {logsPage} of {totalLogsPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
              disabled={
                logsPage === 1 ||
                isLoadingInitialData ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLogsPage((prev) => Math.min(totalLogsPages, prev + 1))
              }
              disabled={
                logsPage >= totalLogsPages ||
                isLoadingInitialData ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Add Data Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Add Power Analyzer Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddData}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customName">Custom Name</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <h6 className="font-semibold mt-3">PDU (Racks)</h6>
              {pduListForm.map((pdu, index) => (
                <div key={index} className="border p-4 rounded-md mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Topic (Rack)</Label>
                      <Select
                        value={pdu.topicId}
                        onValueChange={(value) => updatePduTopic(index, value)}
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {devicesForSelection.map((device) => (
                            <SelectItem
                              key={device.id}
                              value={device.id.toString()}
                            >
                              {device.name} ({device.topicName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Select Keys</Label>
                      <Multiselect
                        value={pdu.keys}
                        options={pdu.filteredKeys || []}
                        onChange={(selected) => updatePduKeys(index, selected)}
                        placeholder={
                          pdu.filteredKeys?.length
                            ? "Select keys"
                            : "No keys (select topic first)"
                        }
                        disabled={
                          isSubmitting || (pdu.filteredKeys?.length || 0) === 0
                        }
                      />
                    </div>
                  </div>
                  {pduListForm.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => removePduFromForm(index)}
                      disabled={isSubmitting}
                    >
                      Remove Rack
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addPduToForm}
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Rack/PDU
              </Button>

              {/* Main Power Section */}
              <h6 className="font-semibold mt-3">Main Power</h6>
              <div className="space-y-2">
                <Label htmlFor="mainPowerTopicSelection">Select Topic</Label>
                <Select
                  value={mainPowerForm.topicId}
                  onValueChange={updateMainPowerTopic}
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {devicesForSelection.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name} ({device.topicName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainPowerKeySelection">Select Key</Label>
                <Select
                  value={mainPowerForm.key}
                  onValueChange={updateMainPowerKey}
                  required
                  disabled={
                    isSubmitting ||
                    (mainPowerForm.filteredKeys?.length || 0) === 0
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        mainPowerForm.filteredKeys?.length
                          ? "Select a key"
                          : "No keys (select topic first)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {mainPowerForm.filteredKeys?.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Configuration Section (Optional, bisa dikembangkan) */}
              <h6 className="font-semibold mt-3">Chart Configuration (JSON)</h6>
              <div className="space-y-2">
                <Label htmlFor="chartConfig">Chart Config (JSON)</Label>
                <Input
                  id="chartConfig"
                  type="text"
                  value={JSON.stringify(chartConfigForm)}
                  onChange={(e) => {
                    try {
                      setChartConfigForm(JSON.parse(e.target.value));
                    } catch {
                      setChartConfigForm({}); // Invalid JSON
                    }
                  }}
                  placeholder='{"type": "line", "options": {}}'
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Data Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit Power Analyzer Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditData}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customNameEdit">Custom Name</Label>
                <Input
                  id="customNameEdit"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <h6 className="font-semibold mt-3">PDU (Racks)</h6>
              {pduListForm.map((pdu, index) => (
                <div key={index} className="border p-4 rounded-md mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Topic (Rack)</Label>
                      <Select
                        value={pdu.topicId}
                        onValueChange={(value) => updatePduTopic(index, value)}
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {devicesForSelection.map((device) => (
                            <SelectItem
                              key={device.id}
                              value={device.id.toString()}
                            >
                              {device.name} ({device.topicName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Select Keys</Label>
                      <Multiselect
                        value={pdu.keys}
                        options={pdu.filteredKeys || []}
                        onChange={(selected) => updatePduKeys(index, selected)}
                        placeholder={
                          pdu.filteredKeys?.length
                            ? "Select keys"
                            : "No keys (select topic first)"
                        }
                        disabled={
                          isSubmitting || (pdu.filteredKeys?.length || 0) === 0
                        }
                      />
                    </div>
                  </div>
                  {pduListForm.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => removePduFromForm(index)}
                      disabled={isSubmitting}
                    >
                      Remove Rack
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addPduToForm}
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Rack/PDU
              </Button>

              {/* Main Power Section */}
              <h6 className="font-semibold mt-3">Main Power</h6>
              <div className="space-y-2">
                <Label htmlFor="mainPowerTopicSelectionEdit">
                  Select Topic
                </Label>
                <Select
                  value={mainPowerForm.topicId}
                  onValueChange={updateMainPowerTopic}
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {devicesForSelection.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name} ({device.topicName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainPowerKeySelectionEdit">Select Key</Label>
                <Select
                  value={mainPowerForm.key}
                  onValueChange={updateMainPowerKey}
                  required
                  disabled={
                    isSubmitting ||
                    (mainPowerForm.filteredKeys?.length || 0) === 0
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        mainPowerForm.filteredKeys?.length
                          ? "Select a key"
                          : "No keys (select topic first)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {mainPowerForm.filteredKeys?.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Configuration Section */}
              <h6 className="font-semibold mt-3">Chart Configuration (JSON)</h6>
              <div className="space-y-2">
                <Label htmlFor="chartConfigEdit">Chart Config (JSON)</Label>
                <Input
                  id="chartConfigEdit"
                  type="text"
                  value={JSON.stringify(chartConfigForm)}
                  onChange={(e) => {
                    try {
                      setChartConfigForm(JSON.parse(e.target.value));
                    } catch {
                      setChartConfigForm({}); // Invalid JSON
                    }
                  }}
                  placeholder='{"type": "line", "options": {}}'
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              Detail PUE for {selectedItemForDetail?.customName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Rack Name</TableHead>
                  <TableHead>PUE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItemForDetail?.pduList?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No racks available
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedItemForDetail?.pduList.map((pdu, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{pdu.name}</TableCell>
                      <TableCell>
                        {calculatePUEForPdu(
                          liveSensorValues[selectedItemForDetail.id]
                            ?.mainPower !== undefined
                            ? liveSensorValues[selectedItemForDetail.id]
                                ?.mainPower
                            : selectedItemForDetail.mainPower?.value,
                          liveSensorValues[selectedItemForDetail.id]?.pduValues[
                            pdu.topicId
                          ] !== undefined
                            ? liveSensorValues[selectedItemForDetail.id]
                                ?.pduValues[pdu.topicId]
                            : pdu.value
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Power Analyzer configuration for{" "}
              <b>{configToDelete?.customName}</b> and its associated logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingConfig}
              onClick={() => setConfigToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeletingConfig}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingConfig ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Logs Confirmation Alert Dialog */}
      <AlertDialog
        open={isDeleteAllLogsAlertOpen}
        onOpenChange={setIsDeleteAllLogsAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL
              Power Analyzer logs from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAllLogs}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllLogs}
              disabled={isDeletingAllLogs}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAllLogs ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
