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
interface MultiselectProps {
  value: string[];
  options: string[];
  placeholder: string;
  onChange?: (selected: string[]) => void;
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
      multiple
      value={value}
      onChange={handleChange}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ height: "auto", minHeight: "40px" }}
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
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  payload?: Record<string, any>; // Untuk menyimpan payload MQTT live untuk filtering key
}

interface PduConfig {
  topicUniqId: string;
  name?: string;
  keys: string[];
  value: number | null;
  topic?: DeviceForSelection;
  filteredKeys?: string[];
}

interface MainPowerConfig {
  topicUniqId: string;
  key: string;
  value: number | null;
  topic?: DeviceForSelection;
  filteredKeys?: string[];
}

interface PueConfig {
  id: string;
  customName: string;
  type: "pue";
  apiTopicUniqId: string | null;
  pduList: PduConfig[];
  mainPower: MainPowerConfig;
  pue?: string;
}

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return pueConfigs.slice(start, start + itemsPerPage);
  }, [pueConfigs, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(pueConfigs.length / itemsPerPage);
  }, [pueConfigs, itemsPerPage]);

  const topicUniqIdToTopicNameMapRef = useRef<Map<string, string>>(new Map());

  const getAuthHeaders = useCallback(() => {
    const authToken = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
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
        return "0";
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

  const fetchDevicesForSelection = useCallback(async () => {
    console.log("[PUE Tab] Fetching devices for selection...");
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
      console.log("[PUE Tab] Fetched devices:", data);
      setDevicesForSelection(
        data.map((device: DeviceForSelection) => ({ ...device, payload: {} }))
      );
    } catch (error) {
      console.error("[PUE Tab] Error fetching devices for selection:", error);
      Swal.fire("Error", "Failed to fetch devices for selection", "error");
    }
  }, [getAuthHeaders]);

  const handleMqttMessage = useCallback(
    (topicName: string, messageString: string) => {
      console.log(`[PUE Tab] MQTT Message Received on topic: ${topicName}`);
      console.log(`[PUE Tab] Raw Message String: ${messageString}`);

      let outerParsedPayload: Record<string, any>;
      try {
        outerParsedPayload = JSON.parse(messageString);
        console.log("[PUE Tab] Outer Parsed Payload:", outerParsedPayload);
      } catch (e) {
        console.error(
          `[PUE Tab] Error parsing outer MQTT payload for topic ${topicName}:`,
          e
        );
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
          console.log(
            "[PUE Tab] Inner 'value' Payload (parsed):",
            innerValuePayload
          );
        } catch (e) {
          console.warn(
            `[PUE Tab] Warning: 'value' field in payload for topic ${topicName} is not valid JSON string. Falling back to outer payload.`,
            outerParsedPayload.value,
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
        console.log(
          "[PUE Tab] Inner 'value' Payload (already object):",
          innerValuePayload
        );
      } else {
        // Jika tidak ada field 'value' atau bukan string/objek, gunakan seluruh payload terluar
        innerValuePayload = outerParsedPayload;
        console.log(
          "[PUE Tab] No 'value' field or not string/object. Using full outer payload for keys:",
          innerValuePayload
        );
      }

      // Update the live payload in the `devicesForSelection` state
      // Sekarang, devicesForSelection.payload akan menyimpan objek yang berisi "lux" atau payload penuh
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) => {
          if (d.topic === topicName) {
            console.log(
              `[PUE Tab] Updating payload for device: ${d.name} (${d.uniqId}) with new data.`
            );
            return { ...d, payload: innerValuePayload };
          }
          return d;
        })
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
                if (key in innerValuePayload) {
                  // Gunakan innerValuePayload di sini
                  const value = parseFloat(innerValuePayload[key]);
                  if (!isNaN(value)) {
                    totalValue += value;
                  } else {
                    console.warn(
                      `[PUE Tab] Key "${key}" has non-numeric value: ${innerValuePayload[key]} for PDU config ${config.customName}`
                    );
                  }
                } else {
                  console.warn(
                    `[PUE Tab] Key "${key}" not found in payload for PDU config ${
                      config.customName
                    }. Payload keys: ${Object.keys(innerValuePayload)}`
                  );
                }
              });
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
            if (mainKey in innerValuePayload) {
              // Gunakan innerValuePayload di sini
              const value = parseFloat(innerValuePayload[mainKey]);
              if (!isNaN(value)) {
                if (newMainPower.value !== value) {
                  currentConfigUpdated = true;
                  newMainPower.value = value;
                }
              } else {
                console.warn(
                  `[PUE Tab] Main Power Key "${mainKey}" has non-numeric value: ${innerValuePayload[mainKey]} for config ${config.customName}`
                );
              }
            } else {
              console.warn(
                `[PUE Tab] Main Power Key "${mainKey}" not found in payload for config ${
                  config.customName
                }. Payload keys: ${Object.keys(innerValuePayload)}`
              );
            }
          }

          if (currentConfigUpdated) {
            configsUpdated = true;
            const updatedConfig = {
              ...config,
              pduList: newPduList,
              mainPower: newMainPower,
            };
            updatedConfig.pue = calculatePUE(
              updatedConfig.mainPower.value,
              updatedConfig.pduList
            );
            console.log(
              `[PUE Tab] Config '${config.customName}' updated by MQTT. New PUE: ${updatedConfig.pue}`
            );
            return updatedConfig;
          }
          return config;
        });

        if (configsUpdated) {
          console.log(
            "[PUE Tab] At least one PUE config was updated by MQTT message."
          );
        }
        return newConfigs;
      });
    },
    [calculatePUE]
  );

  const subscribeToRelevantTopics = useCallback(
    async (configs: PueConfig[]) => {
      console.log("[PUE Tab] Starting MQTT subscription management...");
      const allTopicUniqIdsToSubscribe = new Set<string>();
      const currentTopicUniqIdToNameMap = new Map<string, string>();

      configs.forEach((config) => {
        config.pduList.forEach((pdu) => {
          if (pdu.topicUniqId) allTopicUniqIdsToSubscribe.add(pdu.topicUniqId);
        });
        if (config.mainPower && config.mainPower.topicUniqId) {
          allTopicUniqIdsToSubscribe.add(config.mainPower.topicUniqId);
        }
        if (config.apiTopicUniqId) {
          allTopicUniqIdsToSubscribe.add(config.apiTopicUniqId);
        }
      });
      console.log(
        "[PUE Tab] All unique Topic UniqIds to potentially subscribe:",
        Array.from(allTopicUniqIdsToSubscribe)
      );

      for (const topicUniqId of Array.from(allTopicUniqIdsToSubscribe)) {
        try {
          console.log(
            `[PUE Tab] Fetching topic name for UniqId: ${topicUniqId}`
          );
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
          console.log(
            `[PUE Tab] Mapped UniqId ${topicUniqId} to Topic Name: ${data.topicName}`
          );
        } catch (error) {
          console.warn(
            `[PUE Tab] Failed to get topic name for UniqId ${topicUniqId}:`,
            error
          );
        }
      }
      console.log(
        "[PUE Tab] Current Topic UniqId to Name Map:",
        currentTopicUniqIdToNameMap
      );
      console.log(
        "[PUE Tab] Previous Topic UniqId to Name Map:",
        topicUniqIdToTopicNameMapRef.current
      );

      topicUniqIdToTopicNameMapRef.current.forEach((topicName, topicUniqId) => {
        if (!currentTopicUniqIdToNameMap.has(topicUniqId)) {
          console.log(
            `[PUE Tab] Unsubscribing from old MQTT topic: ${topicName} (UniqId: ${topicUniqId})`
          );
          unsubscribe(topicName, handleMqttMessage);
        }
      });

      currentTopicUniqIdToNameMap.forEach((topicName, topicUniqId) => {
        if (!topicUniqIdToTopicNameMapRef.current.has(topicUniqId)) {
          console.log(
            `[PUE Tab] Subscribing to new/relevant MQTT topic: ${topicName} (UniqId: ${topicUniqId})`
          );
          subscribe(topicName, handleMqttMessage);
        } else {
          console.log(
            `[PUE Tab] Already subscribed to MQTT topic: ${topicName} (UniqId: ${topicUniqId})`
          );
        }
      });

      topicUniqIdToTopicNameMapRef.current = currentTopicUniqIdToNameMap;
      console.log("[PUE Tab] MQTT subscription management finished.");
    },
    [getAuthHeaders, subscribe, unsubscribe, handleMqttMessage]
  );

  const fetchData = useCallback(async () => {
    console.log("[PUE Tab] Fetching PUE configurations...");
    try {
      const response = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PueConfig[] = await response.json();
      console.log("[PUE Tab] Fetched PUE configs:", data);

      const fetchedPueConfigs: PueConfig[] = data
        .filter((item) => item.type === "pue")
        .map((item) => ({
          ...item,
          pduList: (item.pduList || []) as PduConfig[],
          mainPower: (item.mainPower || {}) as MainPowerConfig,
        }));

      fetchedPueConfigs.forEach((config) => {
        config.pue = calculatePUE(config.mainPower.value, config.pduList);
      });

      setPueConfigs(fetchedPueConfigs);
      console.log("[PUE Tab] PUE configs state updated.");

      await subscribeToRelevantTopics(fetchedPueConfigs);
    } catch (error) {
      console.error("[PUE Tab] Error fetching PUE data:", error);
      Swal.fire("Error", "Failed to fetch PUE data", "error");
    }
  }, [getAuthHeaders, calculatePUE, subscribeToRelevantTopics]);

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
    console.log("[PUE Tab] Form reset.");
  }, []);

  const openAddDataModal = () => {
    resetForm();
    setIsAddModalOpen(true);
    console.log("[PUE Tab] Add Data Modal opened.");
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
    console.log("[PUE Tab] Added new PDU row to form.");
  };

  const handleRemovePdu = (index: number) => {
    setPduListForm((prev) => prev.filter((_, i) => i !== index));
    console.log(`[PUE Tab] Removed PDU row at index ${index} from form.`);
  };

  const updatePduTopic = (index: number, selectedTopicUniqId: string) => {
    console.log(
      `[PUE Tab] Updating PDU topic for index ${index}. Selected UniqId: ${selectedTopicUniqId}`
    );
    setPduListForm((prev) => {
      const newPduList = [...prev];
      const selectedDeviceObj = devicesForSelection.find(
        (d) => d.uniqId === selectedTopicUniqId
      );
      newPduList[index].topicUniqId = selectedTopicUniqId;
      newPduList[index].topic = selectedDeviceObj;

      console.log(
        `[PUE Tab] Found selected device object for PDU:`,
        selectedDeviceObj
      );
      console.log(
        `[PUE Tab] Payload used for PDU keys:`,
        selectedDeviceObj?.payload
      );

      // Filter keys dari payload yang sudah di-parse (innerValuePayload)
      const keysFromPayload = Object.keys(selectedDeviceObj?.payload || {});
      newPduList[index].filteredKeys = keysFromPayload.filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );
      newPduList[index].keys = []; // Reset selected keys
      console.log(
        `[PUE Tab] PDU filtered keys for index ${index}:`,
        newPduList[index].filteredKeys
      );
      return newPduList;
    });
  };

  const updatePduKeys = (index: number, selectedKeys: string[]) => {
    console.log(
      `[PUE Tab] Updating PDU selected keys for index ${index}:`,
      selectedKeys
    );
    setPduListForm((prev) => {
      const newPduList = [...prev];
      newPduList[index].keys = selectedKeys;
      return newPduList;
    });
  };

  const updateMainPowerTopic = (selectedTopicUniqId: string) => {
    console.log(
      `[PUE Tab] Updating Main Power topic. Selected UniqId: ${selectedTopicUniqId}`
    );
    const selectedDeviceObj = devicesForSelection.find(
      (d) => d.uniqId === selectedTopicUniqId
    );

    // Log di sini sebelum set state
    console.log(
      `[PUE Tab] Found selected device object for Main Power:`,
      selectedDeviceObj
    );
    console.log(
      `[PUE Tab] Payload used for Main Power keys:`,
      selectedDeviceObj?.payload
    );

    setMainPowerForm((prev) => {
      // Filter keys dari payload yang sudah di-parse (innerValuePayload)
      const filteredKeys = Object.keys(selectedDeviceObj?.payload || {}).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );
      console.log(`[PUE Tab] Main Power filtered keys:`, filteredKeys); // Log di sini
      return {
        ...prev,
        topicUniqId: selectedTopicUniqId,
        topic: selectedDeviceObj,
        filteredKeys: filteredKeys,
        key: "",
      };
    });
  };

  const updateMainPowerKey = (selectedKey: string) => {
    console.log(`[PUE Tab] Updating Main Power selected key: ${selectedKey}`);
    setMainPowerForm((prev) => ({ ...prev, key: selectedKey }));
  };

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[PUE Tab] Attempting to add new PUE configuration.");
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      console.warn("[PUE Tab] Add Data failed: Missing required fields.");
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
      console.warn("[PUE Tab] Add Data failed: Duplicate custom name.");
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
      console.log("[PUE Tab] Sending payload to API:", payload);

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
      console.log("[PUE Tab] PUE configuration added successfully.");

      Swal.fire("Success", "Data has been saved successfully!", "success");
      setIsAddModalOpen(false);
      resetForm();
      await fetchData();
      await fetchDevicesForSelection();
    } catch (error: any) {
      console.error("[PUE Tab] Error saving data:", error.message);
      Swal.fire("Error", `Failed to save data: ${error.message}`, "error");
    }
  };

  const editItem = (id: string) => {
    const itemToEdit = pueConfigs.find((item) => item.id === id);
    if (itemToEdit) {
      console.log(`[PUE Tab] Editing item with ID: ${id}`, itemToEdit);
      setSelectedPueConfigId(id);
      setCustomName(itemToEdit.customName);

      const mainPowerDeviceObj = devicesForSelection.find(
        (d) => d.uniqId === itemToEdit.mainPower.topicUniqId
      );
      setMainPowerForm({
        topicUniqId: itemToEdit.mainPower.topicUniqId,
        key: itemToEdit.mainPower.key,
        value: itemToEdit.mainPower.value,
        topic: mainPowerDeviceObj,
        filteredKeys: Object.keys(mainPowerDeviceObj?.payload || {}).filter(
          (key) =>
            key.toLowerCase().includes("power") ||
            key.toLowerCase().includes("lux")
        ),
      });
      console.log("[PUE Tab] Edit form - Main Power populated:", mainPowerForm);

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
            filteredKeys: Object.keys(pduDeviceObj?.payload || {}).filter(
              (key) =>
                key.toLowerCase().includes("power") ||
                key.toLowerCase().includes("lux")
            ),
          };
        })
      );
      console.log("[PUE Tab] Edit form - PDU List populated:", pduListForm);
      setIsEditModalOpen(true);
    } else {
      console.warn(`[PUE Tab] Item with ID ${id} not found for editing.`);
    }
  };

  const handleEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[PUE Tab] Attempting to edit PUE configuration.");
    if (!selectedPueConfigId) {
      Swal.fire("Error", "No item selected for editing", "error");
      console.warn("[PUE Tab] Edit Data failed: No item selected.");
      return;
    }
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      console.warn("[PUE Tab] Edit Data failed: Missing required fields.");
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
          value: pdu.value,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
          value: mainPowerForm.value,
        },
      };
      console.log("[PUE Tab] Sending update payload to API:", payload);

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
      console.log(
        `[PUE Tab] PUE configuration with ID ${selectedPueConfigId} updated successfully.`
      );

      Swal.fire("Success", "Data has been updated successfully!", "success");
      setIsEditModalOpen(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error("[PUE Tab] Error updating data:", error.message);
      Swal.fire("Error", `Failed to update data: ${error.message}`, "error");
    }
  };

  const deleteItem = async (id: string) => {
    console.log(`[PUE Tab] Attempting to delete item with ID: ${id}`);
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirmResult.isConfirmed) {
      try {
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
        console.log(
          `[PUE Tab] PUE configuration with ID ${id} deleted successfully.`
        );

        Swal.fire("Deleted!", "Your data has been deleted.", "success");
        await fetchData();
        await fetchDevicesForSelection();
      } catch (error: any) {
        console.error("[PUE Tab] Error deleting item:", error.message);
        Swal.fire("Error", `Failed to delete data: ${error.message}`, "error");
      }
    }
  };

  const showDetails = (item: PueConfig) => {
    console.log("[PUE Tab] Showing details for item:", item);
    setSelectedPueConfigDetail(item);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    fetchDevicesForSelection();
  }, [fetchDevicesForSelection]);

  useEffect(() => {
    fetchData();

    return () => {
      console.log(
        "[PUE Tab] Unsubscribing from all MQTT topics on PueTab unmount cleanup."
      );
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
