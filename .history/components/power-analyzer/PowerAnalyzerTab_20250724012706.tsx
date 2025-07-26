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
import { Loader2, PlusCircle, Edit, Trash2, Search } from "lucide-react"; // Icons

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// --- PLACEHOLDER Multiselect Component (bisa diganti dengan Shadcn/library lain) ---
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

// --- Type Definitions (sesuai dengan schema.prisma dan payload) ---
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  payload?: Record<string, any>; // Untuk live MQTT payload
  lastPayload?: Record<string, any>; // Dari backend
}

interface SensorConfig {
  topicUniqId: string;
  name?: string;
  key: string;
  value: number | null;
  topic?: DeviceForSelection; // Objek device lengkap
  filteredKeys?: string[]; // Kunci yang difilter untuk dropdown
}

interface PowerAnalyzerConfig {
  id: string;
  customName: string;
  type: "powerAnalyzer";
  apiTopicUniqId: string | null; // uniqId dari DeviceExternal API Topic
  listSensors: SensorConfig[]; // Array sensor
  chartConfig: Record<string, any> | null; // Konfigurasi chart
  apiTopic?: DeviceForSelection; // Properti tambahan dari backend yang mungkin di-include
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
  const { subscribe, unsubscribe } = useMqtt(); // Menggunakan MqttContext

  // --- State Utama ---
  const [powerAnalyzerConfigs, setPowerAnalyzerConfigs] = useState<
    PowerAnalyzerConfig[]
  >([]);
  const [allLogs, setAllLogs] = useState<PowerAnalyzerLog[]>([]);
  const [devicesForSelection, setDevicesForSelection] = useState<
    DeviceForSelection[]
  >([]);
  const [liveSensorValues, setLiveSensorValues] = useState<
    Record<string, Record<string, number | null>>
  >({}); // key: configId, value: { sensorUniqId: value }

  // --- Form State (Modal Add/Edit) ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null); // Untuk edit
  const [customName, setCustomName] = useState("");
  const [listSensorsForm, setListSensorsForm] = useState<SensorConfig[]>([
    {
      topicUniqId: "",
      key: "",
      value: null,
      topic: undefined,
      filteredKeys: [],
    },
  ]);
  const [chartConfigForm, setChartConfigForm] = useState<Record<string, any>>(
    {}
  ); // Untuk chart config, bisa lebih detail

  // --- UI Loading/Disable State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Untuk tombol Add/Save
  const [isDeletingConfig, setIsDeletingConfig] = useState(false); // Untuk tombol Delete
  const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false); // Untuk tombol Delete All Logs

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

  // Ref untuk melacak langganan MQTT aktif untuk configs
  const configTopicSubscriptionsRef = useRef<Map<string, string>>(new Map()); // Key: deviceUniqId, Value: topicName
  // Ref untuk melacak langganan MQTT aktif untuk form
  const formTopicSubscriptionsRef = useRef<Map<string, string>>(new Map()); // Key: deviceUniqId, Value: topicName

  // Refs untuk menyimpan state terbaru agar `handleMqttMessage` yang stabil bisa mengaksesnya
  // Ini penting agar callback `handleMqttMessage` tidak perlu di-recreate setiap kali state berubah
  // tetapi tetap bisa mengakses nilai state terbaru.
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

  // Fungsi untuk menghitung nilai Power Analyzer
  const calculatePowerAnalyzerValue = useCallback(
    (config: PowerAnalyzerConfig): number | "N/A" => {
      if (!config.listSensors || config.listSensors.length === 0) {
        return "N/A";
      }
      let totalValue = 0;
      let hasValidSensor = false;
      config.listSensors.forEach((sensor) => {
        // Akses liveSensorValues secara langsung karena ini di dalam komponen
        const liveVal = liveSensorValues[config.id]?.[sensor.topicUniqId];
        if (liveVal !== null && liveVal !== undefined && !isNaN(liveVal)) {
          totalValue += liveVal;
          hasValidSensor = true;
        }
      });

      if (!hasValidSensor) return "N/A";
      return parseFloat(totalValue.toFixed(2)); // Sesuaikan perhitungan yang sebenarnya jika diperlukan
    },
    [liveSensorValues]
  );

  // --- MQTT Message Handler ---
  // Callback ini dibuat stabil (deps kosong) dan mengakses state terbaru via refs
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
          if (d.topic === topicName) {
            return { ...d, payload: innerValuePayload };
          }
          return d;
        })
      );

      // Update liveSensorValues for PowerAnalyzerConfigs
      setLiveSensorValues((prevLiveValues) => {
        const newLiveValues = { ...prevLiveValues };
        let configsUpdated = false;

        // Akses state terbaru melalui refs
        const currentConfigs = powerAnalyzerConfigsRef.current;
        const currentDevices = devicesForSelectionRef.current;

        currentConfigs.forEach((config) => {
          let configLiveValuesUpdated = false;
          const currentConfigSensorValues = newLiveValues[config.id] || {};

          // Periksa apakah pesan ini dari sensor yang relevan dengan konfigurasi ini
          config.listSensors.forEach((sensor) => {
            const device = currentDevices.find(
              (d) => d.uniqId === sensor.topicUniqId
            );
            if (device?.topic === topicName) {
              if (sensor.key in innerValuePayload) {
                const val = parseFloat(innerValuePayload[sensor.key]);
                if (
                  !isNaN(val) &&
                  currentConfigSensorValues[sensor.topicUniqId] !== val
                ) {
                  currentConfigSensorValues[sensor.topicUniqId] = val;
                  configLiveValuesUpdated = true;
                }
              } else {
                console.warn(
                  `[PowerAnalyzerTab MQTT] Sensor key "${sensor.key}" not found in payload for device ${device.name} on topic ${topicName}.`
                );
              }
            }
          });

          if (configLiveValuesUpdated) {
            newLiveValues[config.id] = currentConfigSensorValues;
            configsUpdated = true;
          }
        });
        return configsUpdated ? newLiveValues : prevLiveValues;
      });
    },
    [] // handleMqttMessage tidak perlu dependensi apapun karena menggunakan functional updates dan refs
  );

  // --- Data Fetching Functions ---
  const fetchDevicesForSelection = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/devices/for-selection`,
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
      const data: DeviceForSelection[] = await response.json();
      setDevicesForSelection(
        data.map((device) => ({
          ...device,
          payload: device.lastPayload || {}, // Gunakan lastPayload dari backend
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

  const fetchPowerAnalyzerData = useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      // Fetch configs
      const configsRes = await fetch(
        `${API_BASE_URL}/api/power-analyzer-configs`,
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
      const configsData: PowerAnalyzerConfig[] = await configsRes.json();

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
        Record<string, number | null>
      > = {};

      // Inisialisasi konfigurasi dengan nilai dari lastPayload dan tambahkan apiTopic object
      const processedConfigs = configsData
        .filter((item) => item.type === "powerAnalyzer")
        .map((config) => {
          const sensorsWithInitialValues = (config.listSensors || []).map(
            (sensor) => {
              const device = devicesForSelectionRef.current.find(
                // Menggunakan ref untuk devicesForSelection
                (d) => d.uniqId === sensor.topicUniqId
              );
              let initialValue: number | null = null;
              if (device && device.payload && sensor.key in device.payload) {
                const parsed = parseFloat(device.payload[sensor.key]);
                if (!isNaN(parsed)) initialValue = parsed;
              }
              if (!initialLiveSensorData[config.id])
                initialLiveSensorData[config.id] = {};
              initialLiveSensorData[config.id][sensor.topicUniqId] =
                initialValue; // Simpan nilai awal sensor
              return { ...sensor, value: initialValue, topic: device };
            }
          );

          // Tambahkan apiTopic object ke config
          const apiTopicDevice = devicesForSelectionRef.current.find(
            // Menggunakan ref untuk devicesForSelection
            (d) => d.uniqId === config.apiTopicUniqId
          );

          return {
            ...config,
            listSensors: sensorsWithInitialValues as SensorConfig[],
            apiTopic: apiTopicDevice, // Menambahkan objek apiTopic
          };
        });

      setPowerAnalyzerConfigs(processedConfigs);
      setLiveSensorValues(initialLiveSensorData);
      setAllLogs(logsData);

      // --- Logic Subscribe/Unsubscribe MQTT ---
      const topicsToSubscribe = new Set<string>();
      processedConfigs.forEach((config) => {
        if (config.apiTopic?.topic)
          topicsToSubscribe.add(config.apiTopic.topic);
        config.listSensors.forEach((sensor) => {
          const device = devicesForSelectionRef.current.find(
            // Menggunakan ref untuk devicesForSelection
            (d) => d.uniqId === sensor.topicUniqId
          );
          if (device?.topic) topicsToSubscribe.add(device.topic);
        });
      });

      const currentSubscribedTopics = new Set(
        configTopicSubscriptionsRef.current.values()
      );

      // Unsubscribe topik yang tidak lagi dibutuhkan
      currentSubscribedTopics.forEach((topic) => {
        if (!topicsToSubscribe.has(topic)) {
          unsubscribe(topic, handleMqttMessage);
          // Hapus dari ref
          for (let [
            uniqId,
            refTopic,
          ] of configTopicSubscriptionsRef.current.entries()) {
            if (refTopic === topic)
              configTopicSubscriptionsRef.current.delete(uniqId);
          }
        }
      });

      // Subscribe ke topik baru
      topicsToSubscribe.forEach((topic) => {
        if (!currentSubscribedTopics.has(topic)) {
          subscribe(topic, handleMqttMessage);
          const device = devicesForSelectionRef.current.find(
            (d) => d.topic === topic
          ); // Menggunakan ref
          if (device)
            configTopicSubscriptionsRef.current.set(device.uniqId, topic);
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
  }, [getAuthHeaders, subscribe, unsubscribe, handleMqttMessage]); // devicesForSelection tidak perlu di sini karena menggunakan ref

  // --- Form Related Functions ---
  const resetForm = useCallback(() => {
    setCustomName("");
    setListSensorsForm([
      {
        topicUniqId: "",
        key: "",
        value: null,
        topic: undefined,
        filteredKeys: [],
      },
    ]);
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

  const addSensorToForm = () => {
    setListSensorsForm((prev) => [
      ...prev,
      {
        topicUniqId: "",
        key: "",
        value: null,
        topic: undefined,
        filteredKeys: [],
      },
    ]);
  };

  const removeSensorFromForm = (index: number) => {
    setListSensorsForm((prev) => {
      const sensorToRemove = prev[index];
      if (sensorToRemove.topicUniqId) {
        const device = devicesForSelectionRef.current.find(
          // Menggunakan ref
          (d) => d.uniqId === sensorToRemove.topicUniqId
        );
        const topicName = device?.topic;
        if (topicName && formTopicSubscriptionsRef.current.has(topicName)) {
          unsubscribe(topicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.delete(topicName);
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateSensorTopic = useCallback(
    async (index: number, selectedUniqId: string) => {
      setListSensorsForm((prev) => {
        const newList = [...prev];
        const selectedDeviceObj = devicesForSelectionRef.current.find(
          // Menggunakan ref
          (d) => d.uniqId === selectedUniqId
        );

        // Unsubscribe topik sebelumnya
        const prevSensor = newList[index];
        const prevDevice = devicesForSelectionRef.current.find(
          // Menggunakan ref
          (d) => d.uniqId === prevSensor.topicUniqId
        );
        const prevTopicName = prevDevice?.topic;

        if (
          prevTopicName &&
          formTopicSubscriptionsRef.current.has(prevTopicName)
        ) {
          unsubscribe(prevTopicName, handleMqttMessage);
          formTopicSubscriptionsRef.current.delete(prevTopicName);
        }

        // Subscribe topik baru
        if (
          selectedDeviceObj?.topic &&
          !formTopicSubscriptionsRef.current.has(selectedDeviceObj.topic)
        ) {
          subscribe(selectedDeviceObj.topic, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(
            selectedDeviceObj.uniqId,
            selectedDeviceObj.topic
          );
        }

        newList[index] = {
          ...newList[index],
          topicUniqId: selectedUniqId,
          topic: selectedDeviceObj,
          filteredKeys: Object.keys(selectedDeviceObj?.payload || {}), // Dari lastPayload/MQTT
          key: "", // Reset key
        };
        return newList;
      });
    },
    [subscribe, unsubscribe, handleMqttMessage] // devicesForSelection tidak perlu di sini karena menggunakan ref
  );

  const updateSensorKey = useCallback((index: number, selectedKey: string) => {
    setListSensorsForm((prev) => {
      const newList = [...prev];
      newList[index] = { ...newList[index], key: selectedKey };
      return newList;
    });
  }, []);

  const handleAddData = async (e: FormEvent) => {
    e.preventDefault();
    if (!customName || listSensorsForm.some((s) => !s.topicUniqId || !s.key)) {
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
      // Buat DeviceExternal virtual untuk apiTopic menggunakan fetch
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const apiTopicResponse = await fetch(
        `${API_BASE_URL}/api/devices/external`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: `${customName} (Power Analyzer API)`,
            topic: `IOT/PowerAnalyzer/${sanitizedCustomName}`,
            address: "power-analyzer-system-virtual",
          }),
        }
      );

      if (!apiTopicResponse.ok) {
        const errorData = await apiTopicResponse.json();
        throw new Error(
          errorData.message || "Failed to create API topic device."
        );
      }
      const apiTopicData = await apiTopicResponse.json();
      const apiTopicUniqId = apiTopicData.uniqId;

      const payload = {
        customName,
        type: "powerAnalyzer",
        apiTopicUniqId,
        listSensors: listSensorsForm.map((s) => ({
          topicUniqId: s.topicUniqId,
          name: s.topic?.name || `Sensor-${s.key}`, // Gunakan device name jika ada
          key: s.key,
          value: null, // Initial value
        })),
        chartConfig: chartConfigForm, // Placeholder for now
      };

      const response = await fetch(
        `${API_BASE_URL}/api/power-analyzer-configs`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add config.");
      }

      Toast.fire({ icon: "success", title: "Power Analyzer config added!" });
      setIsAddModalOpen(false);
      resetForm();
      await fetchDevicesForSelection(); // Refresh devices for potential new apiTopic
      // fetchPowerAnalyzerData akan terpanggil otomatis karena devicesForSelection berubah
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

      // Prepare listSensorsForm
      const preparedSensorsForm = configToEdit.listSensors.map((sensor) => {
        const device = devicesForSelectionRef.current.find(
          // Menggunakan ref
          (d) => d.uniqId === sensor.topicUniqId
        );
        // Subscribe ke topik sensor untuk key filtering jika belum di-subscribe
        if (
          device?.topic &&
          !formTopicSubscriptionsRef.current.has(device.topic)
        ) {
          subscribe(device.topic, handleMqttMessage);
          formTopicSubscriptionsRef.current.set(device.uniqId, device.topic);
        }

        return {
          ...sensor,
          topic: device,
          filteredKeys: Object.keys(device?.payload || {}), // Gunakan payload live untuk keys
        };
      });
      setListSensorsForm(preparedSensorsForm);

      setIsEditModalOpen(true);
    },
    [powerAnalyzerConfigs, subscribe, handleMqttMessage] // devicesForSelection tidak perlu di sini karena menggunakan ref
  );

  const handleEditData = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !selectedConfigId ||
      !customName ||
      listSensorsForm.some((s) => !s.topicUniqId || !s.key)
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
        listSensors: listSensorsForm.map((s) => ({
          topicUniqId: s.topicUniqId,
          name: s.topic?.name || `Sensor-${s.key}`,
          key: s.key,
          value: null,
        })),
        chartConfig: chartConfigForm,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/power-analyzer-configs/${selectedConfigId}`,
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
      // fetchPowerAnalyzerData akan terpanggil otomatis karena devicesForSelection berubah
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
      const response = await fetch(
        `${API_BASE_URL}/api/power-analyzer-configs/${configToDelete.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete config.");
      }

      Toast.fire({ icon: "success", title: "Power Analyzer config deleted!" });
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
      await fetchDevicesForSelection(); // Refresh devices for potential apiTopic deletion
      // fetchPowerAnalyzerData akan terpanggil otomatis karena devicesForSelection berubah
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
  }, [fetchDevicesForSelection, unsubscribe, handleMqttMessage]); // handleMqttMessage dan unsubscribe sebagai dependensi untuk cleanup

  // Effect 2: Fetch Power Analyzer configs and logs.
  // Ini akan dijalankan setiap kali `devicesForSelection` berubah (setelah fetch awal,
  // atau setelah add/edit/delete yang memicu refresh devices).
  useEffect(() => {
    if (devicesForSelection.length > 0) {
      fetchPowerAnalyzerData();
    }
  }, [devicesForSelection, fetchPowerAnalyzerData]);

  // Effect 3: Reset form when modals are closed
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isAddModalOpen, isEditModalOpen, resetForm]);

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
                <TableHead>Total Sensors</TableHead>
                <TableHead>Current Value</TableHead>
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
                    <TableCell>{config.listSensors?.length || 0}</TableCell>
                    <TableCell>
                      {calculatePowerAnalyzerValue(config)} W
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

              <h6 className="font-semibold mt-3">Sensors</h6>
              {listSensorsForm.map((sensor, index) => (
                <div key={index} className="border p-4 rounded-md mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Device</Label>
                      <Select
                        value={sensor.topicUniqId}
                        onValueChange={(value) =>
                          updateSensorTopic(index, value)
                        }
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devicesForSelection.map((device) => (
                            <SelectItem
                              key={device.uniqId}
                              value={device.uniqId}
                            >
                              {device.name} ({device.topic})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Select Key</Label>
                      <Select
                        value={sensor.key}
                        onValueChange={(value) => updateSensorKey(index, value)}
                        required
                        disabled={
                          isSubmitting ||
                          (sensor.filteredKeys?.length || 0) === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              sensor.filteredKeys?.length
                                ? "Select a key"
                                : "No keys (select device first)"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sensor.filteredKeys?.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {listSensorsForm.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => removeSensorFromForm(index)}
                      disabled={isSubmitting}
                    >
                      Remove Sensor
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addSensorToForm}
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Sensor
              </Button>

              {/* Chart Configuration Section (Optional, bisa dikembangkan) */}
              <h6 className="font-semibold mt-3">Chart Configuration (JSON)</h6>
              <div className="space-y-2">
                <Label htmlFor="chartConfig">Chart Config (JSON)</Label>
                <Input
                  id="chartConfig"
                  type="text" // Atau ganti dengan textarea untuk JSON yang lebih kompleks
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

              <h6 className="font-semibold mt-3">Sensors</h6>
              {listSensorsForm.map((sensor, index) => (
                <div key={index} className="border p-4 rounded-md mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Device</Label>
                      <Select
                        value={sensor.topicUniqId}
                        onValueChange={(value) =>
                          updateSensorTopic(index, value)
                        }
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devicesForSelection.map((device) => (
                            <SelectItem
                              key={device.uniqId}
                              value={device.uniqId}
                            >
                              {device.name} ({device.topic})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Select Key</Label>
                      <Select
                        value={sensor.key}
                        onValueChange={(value) => updateSensorKey(index, value)}
                        required
                        disabled={
                          isSubmitting ||
                          (sensor.filteredKeys?.length || 0) === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              sensor.filteredKeys?.length
                                ? "Select a key"
                                : "No keys (select device first)"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sensor.filteredKeys?.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {listSensorsForm.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => removeSensorFromForm(index)}
                      disabled={isSubmitting}
                    >
                      Remove Sensor
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addSensorToForm}
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Sensor
              </Button>

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
