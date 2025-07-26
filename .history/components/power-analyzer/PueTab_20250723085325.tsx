"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { useMqtt } from "@/contexts/MqttContext"; // Pastikan path ini benar
import Swal from "sweetalert2";
// import axios from "axios"; // Axios tidak lagi digunakan

// --- START: Basic React Multiselect Component Placeholder ---
// PENTING: Ini adalah implementasi dasar untuk multiselect HTML native.
// Untuk pengalaman pengguna yang lebih baik dan fitur lengkap (seperti pencarian, tag),
// disarankan untuk menggantinya dengan library React yang lebih robust seperti 'react-select'.
interface MultiselectProps {
  value: string[]; // Nilai yang dipilih (array of strings)
  options: string[]; // Opsi yang tersedia (array of strings)
  placeholder: string;
  onChange?: (selected: string[]) => void; // Callback saat nilai berubah
}

const Multiselect: React.FC<MultiselectProps> = ({
  value,
  options,
  placeholder,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    onChange?.(selectedOptions);
  };

  return (
    <select
      multiple // Mengaktifkan mode multi-select
      value={value}
      onChange={handleChange}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ height: "auto", minHeight: "40px" }} // Sesuaikan tinggi agar terlihat lebih baik
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
// --- END: Basic React Multiselect Component Placeholder ---

// --- Tipe Data ---
// DeviceExternal yang diambil dari /api/devices/for-selection
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string; // Ini adalah nama topik MQTT (topicName)
  payload?: Record<string, any>; // Untuk menyimpan payload MQTT live untuk filtering key
}

interface PduConfig {
  topicUniqId: string; // uniqId dari DeviceExternal yang merujuk pada PDU
  name?: string; // Nama PDU (misal: "PDU-1")
  keys: string[]; // Daftar kunci dari payload MQTT yang akan dijumlahkan (misal: ["power_a", "power_b"])
  value: number | null; // Nilai daya aktual dari MQTT untuk PDU ini
  topic?: DeviceForSelection; // Objek DeviceForSelection lengkap (untuk form UI)
  filteredKeys?: string[]; // Untuk dropdown pilihan keys di UI
}

interface MainPowerConfig {
  topicUniqId: string; // uniqId dari DeviceExternal yang merujuk pada Main Power
  key: string; // Kunci tunggal dari payload MQTT (misal: "total_power")
  value: number | null; // Nilai daya aktual dari MQTT untuk Main Power ini
  topic?: DeviceForSelection; // Objek DeviceForSelection lengkap (untuk form UI)
  filteredKeys?: string[]; // Untuk dropdown pilihan key di UI
}

interface PueConfig {
  id: string; // ID internal Prisma untuk PueConfiguration
  customName: string;
  type: "pue";
  apiTopicUniqId: string | null; // uniqId dari DeviceExternal yang mewakili "grouping" PUE ini
  pduList: PduConfig[];
  mainPower: MainPowerConfig;
  pue?: string; // Nilai PUE yang dihitung, opsional
}

// URL API
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function PueTab() {
  const { subscribe, unsubscribe } = useMqtt();
  const [devicesForSelection, setDevicesForSelection] = useState<
    DeviceForSelection[]
  >([]);
  const [pueConfigs, setPueConfigs] = useState<PueConfig[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form State
  const [customName, setCustomName] = useState("");
  const [pduListForm, setPduListForm] = useState<PduConfig[]>([
    {
      topicUniqId: "",
      keys: [],
      value: null,
      topic: undefined,
      filteredKeys: [],
    },
  ]);
  const [mainPowerForm, setMainPowerForm] = useState<MainPowerConfig>({
    topicUniqId: "",
    key: "",
    value: null,
    topic: undefined,
    filteredKeys: [],
  });
  const [selectedPueConfigId, setSelectedPueConfigId] = useState<string | null>(
    null
  );
  const [selectedPueConfigDetail, setSelectedPueConfigDetail] =
    useState<PueConfig | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return pueConfigs.slice(start, start + itemsPerPage);
  }, [pueConfigs, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(pueConfigs.length / itemsPerPage);
  }, [pueConfigs, itemsPerPage]);

  // Ref untuk menyimpan mapping topicUniqId ke topicName untuk efisiensi MQTT handling
  const topicUniqIdToTopicNameMapRef = useRef<Map<string, string>>(new Map());

  // --- Utility Functions ---

  const getAuthHeaders = useCallback(() => {
    // Mengubah nama fungsi menjadi getAuthHeaders
    const authToken = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json", // Penting untuk POST/PUT requests
      Authorization: `Bearer ${authToken}`,
    };
  }, []);

  const calculatePUE = useCallback(
    (mainPowerValue: number | null, pduList: PduConfig[]): string => {
      if (
        mainPowerValue === null ||
        mainPowerValue === 0 ||
        !pduList ||
        pduList.length === 0
      ) {
        return "N/A";
      }

      const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
      if (itPower === 0) {
        return "0"; // PUE tak terhingga jika IT Power 0, tapi 0 lebih informatif di UI
      }

      const pue = (mainPowerValue / itPower).toFixed(2);
      return pue;
    },
    []
  );

  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue === null || pduValue === null || mainPowerValue === 0)
        return "N/A";
      if (pduValue === 0) return "0";

      return (mainPowerValue / pduValue).toFixed(2);
    },
    []
  );

  // --- Fetch Devices for Selection ---
  const fetchDevicesForSelection = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/devices/for-selection`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDevicesForSelection(
        data.map((device: DeviceForSelection) => ({ ...device, payload: {} })) // Inisialisasi payload
      );
    } catch (error) {
      console.error("Error fetching devices for selection:", error);
      Swal.fire("Error", "Failed to fetch devices for selection", "error");
    }
  }, [getAuthHeaders]);

  // Handle MQTT Message Callback
  const handleMqttMessage = useCallback(
    (topicName: string, messageString: string) => {
      let outerParsedPayload: Record<string, any>;
      try {
        outerParsedPayload = JSON.parse(messageString);
      } catch (e) {
        console.error(`Error parsing MQTT payload for topic ${topicName}:`, e);
        return;
      }

      let innerValuePayload: Record<string, any> = {};
      // Cek apakah 'value' key ada dan merupakan string, lalu parse sebagai JSON
      if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "string"
      ) {
        try {
          innerValuePayload = JSON.parse(outerParsedPayload.value);
        } catch (e) {
          console.warn(
            `Warning: 'value' field in payload for topic ${topicName} is not valid JSON: ${outerParsedPayload.value}`,
            e
          );
          // Jika inner value bukan JSON, fallback ke seluruh payload terluar
          innerValuePayload = outerParsedPayload;
        }
      } else if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "object"
      ) {
        // Jika 'value' sudah berupa objek (bukan stringified JSON)
        innerValuePayload = outerParsedPayload.value;
      } else {
        // Jika tidak ada field 'value' atau bukan string/objek, gunakan seluruh payload terluar
        innerValuePayload = outerParsedPayload;
      }

      // Update the live payload in the `devicesForSelection` state
      // Sekarang, devicesForSelection.payload akan menyimpan objek yang berisi "lux"
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) =>
          d.topic === topicName ? { ...d, payload: innerValuePayload } : d
        )
      );

      // Update pueConfigs based on incoming MQTT data
      setPueConfigs((prevConfigs) => {
        let configsUpdated = false;
        const newConfigs = prevConfigs.map((config) => {
          let currentConfigUpdated = false;
          const newPduList = config.pduList.map((pdu) => {
            const pduTopicName = topicUniqIdToTopicNameMapRef.current.get(
              pdu.topicUniqId
            );
            if (pduTopicName === topicName) {
              let totalValue = 0;
              pdu.keys.forEach((key) => {
                // Gunakan innerValuePayload di sini
                if (key in innerValuePayload) {
                  const value = parseFloat(innerValuePayload[key]);
                  if (!isNaN(value)) {
                    totalValue += value;
                  } else {
                    console.warn(
                      `Key "${key}" has non-numeric value: ${innerValuePayload[key]}`
                    );
                  }
                } else {
                  console.warn(`Key "${key}" not found in payload for PDU.`);
                }
              });
              // Hanya update jika nilai berubah untuk menghindari re-render yang tidak perlu
              if (pdu.value !== totalValue) {
                currentConfigUpdated = true;
                return { ...pdu, value: totalValue };
              }
            }
            return pdu;
          });

          let newMainPower = { ...config.mainPower };
          const mainPowerTopicName = topicUniqIdToTopicNameMapRef.current.get(
            config.mainPower.topicUniqId
          );
          if (mainPowerTopicName === topicName) {
            const mainKey = config.mainPower.key;
            // Gunakan innerValuePayload di sini
            if (mainKey in innerValuePayload) {
              const value = parseFloat(innerValuePayload[mainKey]);
              if (!isNaN(value)) {
                // Hanya update jika nilai berubah
                if (newMainPower.value !== value) {
                  currentConfigUpdated = true;
                  newMainPower.value = value;
                }
              } else {
                console.warn(
                  `Main Power Key "${mainKey}" has non-numeric value: ${innerValuePayload[mainKey]}`
                );
              }
            } else {
              console.warn(`Main Power Key "${mainKey}" not found in payload.`);
            }
          }

          if (currentConfigUpdated) {
            configsUpdated = true;
            const updatedConfig = {
              ...config,
              pduList: newPduList,
              mainPower: newMainPower,
            };
            // Hitung ulang PUE segera untuk tampilan
            updatedConfig.pue = calculatePUE(
              updatedConfig.mainPower.value,
              updatedConfig.pduList
            );
            return updatedConfig;
          }
          return config;
        });

        // Di sini Anda bisa memicu penyimpanan ke backend jika ada perubahan
        // Disarankan menggunakan debounce atau interval untuk ini agar tidak terlalu banyak request
        if (configsUpdated) {
          console.log(
            "PUE config updated by MQTT. Consider saving to backend (with debounce)."
          );
          // Contoh: updatePueValuesInBackend(updatedConfig);
        }
        return newConfigs;
      });
    },
    [calculatePUE]
  );

  // --- MQTT Subscription Management ---
  const subscribeToRelevantTopics = useCallback(
    async (configs: PueConfig[]) => {
      const allTopicUniqIdsToSubscribe = new Set<string>();
      const currentTopicUniqIdToNameMap = new Map<string, string>();

      // Kumpulkan semua uniqId topik unik dari konfigurasi yang diambil
      configs.forEach((config) => {
        config.pduList.forEach((pdu) => {
          if (pdu.topicUniqId) allTopicUniqIdsToSubscribe.add(pdu.topicUniqId);
        });
        if (config.mainPower && config.mainPower.topicUniqId) {
          allTopicUniqIdsToSubscribe.add(config.mainPower.topicUniqId);
        }
        // Juga sertakan apiTopicUniqId jika ada (untuk topik utama PUE)
        if (config.apiTopicUniqId) {
          allTopicUniqIdsToSubscribe.add(config.apiTopicUniqId);
        }
      });

      // Ambil nama topik aktual untuk uniqId ini dan bangun map
      for (const topicUniqId of Array.from(allTopicUniqIdsToSubscribe)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/topics/by-uniqid/${topicUniqId}`,
            {
              headers: getAuthHeaders(),
            }
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          currentTopicUniqIdToNameMap.set(topicUniqId, data.topicName);
        } catch (error) {
          console.warn(
            `Failed to get topic name for UniqId ${topicUniqId}:`,
            error
          );
        }
      }

      // Unsubscribe dari topik lama yang tidak lagi relevan
      topicUniqIdToTopicNameMapRef.current.forEach((topicName, topicUniqId) => {
        if (!currentTopicUniqIdToNameMap.has(topicUniqId)) {
          console.log(`Unsubscribing from old MQTT topic: ${topicName}`);
          unsubscribe(topicName, handleMqttMessage);
        }
      });

      // Subscribe ke topik baru atau yang masih relevan
      currentTopicUniqIdToNameMap.forEach((topicName, topicUniqId) => {
        if (!topicUniqIdToTopicNameMapRef.current.has(topicUniqId)) {
          console.log(`Subscribing to new/relevant MQTT topic: ${topicName}`);
          subscribe(topicName, handleMqttMessage);
        }
      });

      // Perbarui ref untuk siklus berikutnya
      topicUniqIdToTopicNameMapRef.current = currentTopicUniqIdToNameMap;
    },
    [getAuthHeaders, subscribe, unsubscribe, handleMqttMessage]
  );

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PueConfig[] = await response.json();

      const fetchedPueConfigs: PueConfig[] = data
        .filter((item) => item.type === "pue")
        .map((item) => ({
          ...item,
          pduList: (item.pduList || []) as PduConfig[],
          mainPower: (item.mainPower || {}) as MainPowerConfig,
        }));

      // Inisialisasi PUE untuk tampilan awal (sebelum ada data MQTT live)
      fetchedPueConfigs.forEach((config) => {
        config.pue = calculatePUE(config.mainPower.value, config.pduList);
      });

      setPueConfigs(fetchedPueConfigs);

      // Setelah data diambil, kelola langganan MQTT
      await subscribeToRelevantTopics(fetchedPueConfigs);
    } catch (error) {
      console.error("Error fetching PUE data:", error);
      Swal.fire("Error", "Failed to fetch PUE data", "error");
    }
  }, [getAuthHeaders, calculatePUE, subscribeToRelevantTopics]);

  // --- Form Handlers ---
  const resetForm = useCallback(() => {
    setCustomName("");
    setPduListForm([
      {
        topicUniqId: "",
        keys: [],
        value: null,
        topic: undefined,
        filteredKeys: [],
      },
    ]);
    setMainPowerForm({
      topicUniqId: "",
      key: "",
      value: null,
      topic: undefined,
      filteredKeys: [],
    });
  }, []);

  const openAddDataModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleAddPdu = () => {
    setPduListForm((prev) => [
      ...prev,
      {
        topicUniqId: "",
        keys: [],
        value: null,
        topic: undefined,
        filteredKeys: [],
      },
    ]);
  };

  const handleRemovePdu = (index: number) => {
    setPduListForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePduTopic = (index: number, selectedTopicUniqId: string) => {
    setPduListForm((prev) => {
      const newPduList = [...prev];
      const selectedDeviceObj = devicesForSelection.find(
        (d) => d.uniqId === selectedTopicUniqId
      );
      newPduList[index].topicUniqId = selectedTopicUniqId;
      newPduList[index].topic = selectedDeviceObj;
      // Filter keys dari payload yang sudah di-parse (innerValuePayload)
      newPduList[index].filteredKeys = Object.keys(
        selectedDeviceObj?.payload || {}
      ).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux") // Tambahkan filter untuk 'lux'
      );
      newPduList[index].keys = [];
      return newPduList;
    });
  };

  const updatePduKeys = (index: number, selectedKeys: string[]) => {
    setPduListForm((prev) => {
      const newPduList = [...prev];
      newPduList[index].keys = selectedKeys;
      return newPduList;
    });
  };

  const updateMainPowerTopic = (selectedTopicUniqId: string) => {
    const selectedDeviceObj = devicesForSelection.find(
      (d) => d.uniqId === selectedTopicUniqId
    );
    setMainPowerForm((prev) => ({
      ...prev,
      topicUniqId: selectedTopicUniqId,
      topic: selectedDeviceObj,
      // Filter keys dari payload yang sudah di-parse (innerValuePayload)
      filteredKeys: Object.keys(selectedDeviceObj?.payload || {}).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux") // Tambahkan filter untuk 'lux'
      ),
      key: "",
    }));
  };

  const updateMainPowerKey = (selectedKey: string) => {
    setMainPowerForm((prev) => ({ ...prev, key: selectedKey }));
  };

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      return;
    }

    const isDuplicateName = pueConfigs.some(
      (item) => item.customName.toLowerCase() === customName.toLowerCase()
    );
    if (isDuplicateName) {
      Swal.fire(
        "Error",
        "Custom name already exists. Please choose another name.",
        "error"
      );
      return;
    }

    try {
      const payload = {
        customName,
        type: "pue",
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
          value: null,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
          value: null,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      Swal.fire("Success", "Data has been saved successfully!", "success");
      setIsAddModalOpen(false);
      resetForm();
      await fetchData(); // Refresh data and re-subscribe to MQTT
      await fetchDevicesForSelection(); // Refresh devices (in case new ones were added/changed)
    } catch (error: any) {
      console.error("Error saving data:", error.message);
      Swal.fire("Error", `Failed to save data: ${error.message}`, "error");
    }
  };

  const editItem = (id: string) => {
    const itemToEdit = pueConfigs.find((item) => item.id === id);
    if (itemToEdit) {
      setSelectedPueConfigId(id);
      setCustomName(itemToEdit.customName);

      // Populate Main Power form
      const mainPowerDeviceObj = devicesForSelection.find(
        (d) => d.uniqId === itemToEdit.mainPower.topicUniqId
      );
      setMainPowerForm({
        topicUniqId: itemToEdit.mainPower.topicUniqId,
        key: itemToEdit.mainPower.key,
        value: itemToEdit.mainPower.value,
        topic: mainPowerDeviceObj,
        // Filter keys dari payload yang sudah di-parse (innerValuePayload)
        filteredKeys: Object.keys(mainPowerDeviceObj?.payload || {}).filter(
          (key) =>
            key.toLowerCase().includes("power") ||
            key.toLowerCase().includes("lux")
        ),
      });

      // Populate PDU List form
      setPduListForm(
        itemToEdit.pduList.map((pdu) => {
          const pduDeviceObj = devicesForSelection.find(
            (d) => d.uniqId === pdu.topicUniqId
          );
          return {
            topicUniqId: pdu.topicUniqId,
            name: pdu.name,
            keys: pdu.keys,
            value: pdu.value,
            topic: pduDeviceObj,
            // Filter keys dari payload yang sudah di-parse (innerValuePayload)
            filteredKeys: Object.keys(pduDeviceObj?.payload || {}).filter(
              (key) =>
                key.toLowerCase().includes("power") ||
                key.toLowerCase().includes("lux")
            ),
          };
        })
      );
      setIsEditModalOpen(true);
    }
  };

  const handleEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPueConfigId) {
      Swal.fire("Error", "No item selected for editing", "error");
      return;
    }
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      return;
    }

    try {
      const payload: Partial<PueConfig> = {
        customName,
        type: "pue",
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
          value: pdu.value, // Pertahankan nilai dari state yang sudah ada
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
          value: mainPowerForm.value, // Pertahankan nilai dari state yang sudah ada
        },
      };

      const response = await fetch(
        `${API_BASE_URL}/api/pue-configs/${selectedPueConfigId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      Swal.fire("Success", "Data has been updated successfully!", "success");
      setIsEditModalOpen(false);
      resetForm();
      await fetchData(); // Refresh data and re-subscribe to MQTT
    } catch (error: any) {
      console.error("Error updating data:", error.message);
      Swal.fire("Error", `Failed to update data: ${error.message}`, "error");
    }
  };

  const deleteItem = async (id: string) => {
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirmResult.isConfirmed) {
      try {
        // DELETE from /api/pue-configs/:id will also delete associated DeviceExternal by uniqId in backend
        const response = await fetch(`${API_BASE_URL}/api/pue-configs/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }

        Swal.fire("Deleted!", "Your data has been deleted.", "success");
        await fetchData(); // Refresh data and manage subscriptions
        await fetchDevicesForSelection(); // Refresh devices (in case a DeviceExternal was deleted)
      } catch (error: any) {
        console.error("Error deleting item:", error.message);
        Swal.fire("Error", `Failed to delete data: ${error.message}`, "error");
      }
    }
  };

  const showDetails = (item: PueConfig) => {
    setSelectedPueConfigDetail(item);
    setIsDetailModalOpen(true);
  };

  // --- Lifecycle Hooks ---
  useEffect(() => {
    fetchDevicesForSelection(); // Mengambil daftar perangkat untuk selectbox
  }, [fetchDevicesForSelection]);

  useEffect(() => {
    fetchData(); // Mengambil konfigurasi PUE dan mengelola langganan MQTT

    // Cleanup function for MQTT subscriptions when component unmounts
    return () => {
      console.log("Unsubscribing from all MQTT topics on PueTab unmount.");
      topicUniqIdToTopicNameMapRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      topicUniqIdToTopicNameMapRef.current.clear();
    };
  }, [fetchData, unsubscribe, handleMqttMessage]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>PUE (Power Usage Effectiveness)</CardTitle>
        <CardDescription>
          Configure and monitor the PUE of your facility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* PUE Data Table */}
        <div className="mb-4 flex justify-between items-center">
          <h5 className="text-lg font-semibold">PUE Data</h5>
          <Button onClick={openAddDataModal}>Add Data</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custom Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total PDU/Rack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PUE (Main Power / IT Power)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1 + (currentPage - 1) * itemsPerPage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.customName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.pduList?.length || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.pue}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => showDetails(item)}
                      >
                        Detail
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2"
                        onClick={() => editItem(item.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
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
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>

        {/* Add Data Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Add PUE Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddData}>
              <div className="grid gap-4 py-4">
                {/* Custom Name */}
                <div className="space-y-2">
                  <label htmlFor="customName" className="text-sm font-medium">
                    Custom Name
                  </label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter custom name"
                    required
                  />
                </div>

                {/* PDU (Racks) Section */}
                <h6 className="font-semibold mt-3">PDU (Racks)</h6>
                {pduListForm.map((pdu, index) => (
                  <div key={index} className="border p-4 rounded-md mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Select Device (Rack)
                        </label>
                        <Select
                          value={pdu.topicUniqId}
                          onValueChange={(value) =>
                            updatePduTopic(index, value)
                          }
                          required={index === 0}
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
                        <label className="text-sm font-medium">
                          Select Keys
                        </label>
                        <Multiselect // PERLU DIGANTI DENGAN KOMPONEN REACT MULTISELECT YANG LEBIH CANGGIH
                          value={pdu.keys}
                          options={pdu.filteredKeys || []}
                          placeholder="Select keys"
                          onChange={(selected) =>
                            updatePduKeys(index, selected)
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
                        onClick={() => handleRemovePdu(index)}
                      >
                        Remove Rack
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddPdu}>
                  Add Rack/PDU
                </Button>

                {/* Main Power Section */}
                <h6 className="font-semibold mt-3">Main Power</h6>
                <div className="space-y-2">
                  <label
                    htmlFor="mainPowerTopicSelection"
                    className="text-sm font-medium"
                  >
                    Select Device
                  </label>
                  <Select
                    value={mainPowerForm.topicUniqId}
                    onValueChange={updateMainPowerTopic}
                    required
                  >
                    <SelectTrigger id="mainPowerTopicSelection">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devicesForSelection.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name} ({device.topic})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="mainPowerKeySelection"
                    className="text-sm font-medium"
                  >
                    Select Key
                  </label>
                  <Select
                    value={mainPowerForm.key}
                    onValueChange={updateMainPowerKey}
                    required
                  >
                    <SelectTrigger id="mainPowerKeySelection">
                      <SelectValue placeholder="Select a key" />
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
              </div>
              <DialogFooter>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Data Modal (similar structure to Add Data Modal) */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Edit PUE Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditData}>
              <div className="grid gap-4 py-4">
                {/* Custom Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="customNameEdit"
                    className="text-sm font-medium"
                  >
                    Custom Name
                  </label>
                  <Input
                    id="customNameEdit"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter custom name"
                    required
                  />
                </div>

                {/* PDU (Racks) Section - Re-use logic from Add */}
                <h6 className="font-semibold mt-3">PDU (Racks)</h6>
                {pduListForm.map((pdu, index) => (
                  <div key={index} className="border p-4 rounded-md mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Select Device (Rack)
                        </label>
                        <Select
                          value={pdu.topicUniqId}
                          onValueChange={(value) =>
                            updatePduTopic(index, value)
                          }
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
                        <label className="text-sm font-medium">
                          Select Keys
                        </label>
                        <Multiselect // PERLU DIGANTI DENGAN KOMPONEN REACT MULTISELECT YANG LEBIH CANGGIH
                          value={pdu.keys}
                          options={pdu.filteredKeys || []}
                          placeholder="Select keys"
                          onChange={(selected) =>
                            updatePduKeys(index, selected)
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
                        onClick={() => handleRemovePdu(index)}
                      >
                        Remove Rack
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddPdu}>
                  Add Rack/PDU
                </Button>

                {/* Main Power Section - Re-use logic from Add */}
                <h6 className="font-semibold mt-3">Main Power</h6>
                <div className="space-y-2">
                  <label
                    htmlFor="mainPowerTopicSelectionEdit"
                    className="text-sm font-medium"
                  >
                    Select Device
                  </label>
                  <Select
                    value={mainPowerForm.topicUniqId}
                    onValueChange={updateMainPowerTopic}
                  >
                    <SelectTrigger id="mainPowerTopicSelectionEdit">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devicesForSelection.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name} ({device.topic})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="mainPowerKeySelectionEdit"
                    className="text-sm font-medium"
                  >
                    Select Key
                  </label>
                  <Select
                    value={mainPowerForm.key}
                    onValueChange={updateMainPowerKey}
                  >
                    <SelectTrigger id="mainPowerKeySelectionEdit">
                      <SelectValue placeholder="Select a key" />
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
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                Detail PUE for {selectedPueConfigDetail?.customName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rack Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PUE
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedPueConfigDetail?.pduList?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500"
                      >
                        No racks available
                      </td>
                    </tr>
                  ) : (
                    selectedPueConfigDetail?.pduList?.map((pdu, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pdu.name || `PDU-${index + 1}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculatePUEForPdu(
                            selectedPueConfigDetail.mainPower.value,
                            pdu.value
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
