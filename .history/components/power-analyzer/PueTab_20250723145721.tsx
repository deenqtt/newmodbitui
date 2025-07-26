// File: PueTab.tsx

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
import {
  AlertDialog, // NEW: Import AlertDialog components
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useMqtt } from "@/contexts/MqttContext"; // Pastikan path ini benar
import Swal from "sweetalert2";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Search, // NEW: Import Loader2 and other icons
} from "lucide-react";

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
  lastPayload?: Record<string, any>; // NEW: Menyimpan payload terakhir dari backend
  lastUpdatedByMqtt?: string; // NEW: Kapan terakhir diupdate oleh MQTT (akan jadi string Date dari backend)
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

  // --- NEW: State untuk Loading/Disable Buttons ---
  const [isSubmitting, setIsSubmitting] = useState(false); // Untuk Add/Edit Save button
  const [isDeletingConfig, setIsDeletingConfig] = useState(false); // Untuk Delete Config button
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Mirip isLoading di BillTab

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

  // --- NEW: State untuk Delete Konfirmasi ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PueConfig | null>(null);

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
  const formTopicSubscriptionRef = useRef<Map<string, string>>(new Map());

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
        data.map((device: DeviceForSelection) => ({
          ...device,
          payload: device.lastPayload || {},
        }))
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
          innerValuePayload = outerParsedPayload;
        }
      } else if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "object"
      ) {
        innerValuePayload = outerParsedPayload.value;
        console.log(
          "[PUE Tab] Inner 'value' Payload (already object):",
          innerValuePayload
        );
      } else {
        innerValuePayload = outerParsedPayload;
        console.log(
          "[PUE Tab] No 'value' field or not string/object. Using full outer payload for keys:",
          innerValuePayload
        );
      }

      // Update the live payload in the `devicesForSelection` state
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) => {
          if (d.topic === topicName) {
            console.log(
              `[PUE Tab] Updating payload for device: ${d.name} (${d.uniqId}) with new data.`
            );
            return {
              ...d,
              payload: innerValuePayload,
            };
          }
          return d;
        })
      );

      // Update form's filtered keys based on new payload
      setPduListForm((prev) => {
        let updated = false;
        const newPduList = prev.map((pdu) => {
          const deviceInState = devicesForSelection.find(
            (d) => d.uniqId === pdu.topicUniqId
          );
          if (deviceInState && deviceInState.topic === topicName) {
            const newFilteredKeys = Object.keys(innerValuePayload).filter(
              (key) =>
                key.toLowerCase().includes("power") ||
                key.toLowerCase().includes("lux")
            );
            if (
              JSON.stringify(newFilteredKeys) !==
              JSON.stringify(pdu.filteredKeys)
            ) {
              updated = true;
              return { ...pdu, filteredKeys: newFilteredKeys };
            }
          }
          return pdu;
        });
        return updated ? newPduList : prev;
      });

      setMainPowerForm((prev) => {
        const deviceInState = devicesForSelection.find(
          (d) => d.uniqId === prev.topicUniqId
        );
        if (deviceInState && deviceInState.topic === topicName) {
          const newFilteredKeys = Object.keys(innerValuePayload).filter(
            (key) =>
              key.toLowerCase().includes("power") ||
              key.toLowerCase().includes("lux")
          );
          if (
            JSON.stringify(newFilteredKeys) !==
            JSON.stringify(prev.filteredKeys)
          ) {
            return { ...prev, filteredKeys: newFilteredKeys };
          }
        }
        return prev;
      });

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
    [calculatePUE, devicesForSelection]
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

      // Fetch topic names for all unique Topic UniqIds
      const topicFetchPromises = Array.from(allTopicUniqIdsToSubscribe).map(
        async (topicUniqId) => {
          try {
            console.log(
              `[PUE Tab] Fetching topic name for UniqId: ${topicUniqId}`
            );
            // Menggunakan API by-uniqid untuk mendapatkan topicName
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
      );
      await Promise.all(topicFetchPromises); // Wait for all topic names to be fetched

      console.log(
        "[PUE Tab] Current Topic UniqId to Name Map (for configs):",
        currentTopicUniqIdToNameMap
      );
      console.log(
        "[PUE Tab] Previous Topic UniqId to Name Map (for configs):",
        topicUniqIdToTopicNameMapRef.current
      );

      // Unsubscribe from topics that are no longer needed for existing configs
      topicUniqIdToTopicNameMapRef.current.forEach((topicName, topicUniqId) => {
        if (!currentTopicUniqIdToNameMap.has(topicUniqId)) {
          console.log(
            `[PUE Tab] Unsubscribing from old MQTT topic: ${topicName} (UniqId: ${topicUniqId})`
          );
          unsubscribe(topicName, handleMqttMessage);
        }
      });

      // Subscribe to new/relevant topics for existing configs
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
    setIsLoadingInitialData(true); // NEW: Set loading state for initial data fetch
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
        .map((item) => {
          const mainPowerDevice = devicesForSelection.find(
            (d) => d.uniqId === item.mainPower.topicUniqId
          );

          let currentMainPowerValue: number | null = null;
          if (
            mainPowerDevice &&
            mainPowerDevice.payload &&
            item.mainPower.key in mainPowerDevice.payload
          ) {
            const parsedValue = parseFloat(
              mainPowerDevice.payload[item.mainPower.key]
            );
            if (!isNaN(parsedValue)) {
              currentMainPowerValue = parsedValue;
            } else {
              console.warn(
                `[PUE Tab] Main Power Key "${
                  item.mainPower.key
                }" has non-numeric value in initial payload: ${
                  mainPowerDevice.payload[item.mainPower.key]
                }`
              );
            }
          }

          const updatedPduList = (item.pduList || []).map((pdu) => {
            const pduDevice = devicesForSelection.find(
              (d) => d.uniqId === pdu.topicUniqId
            );
            let totalPduValue: number | null = null;

            if (pduDevice && pduDevice.payload) {
              let sumKeys = 0;
              let hasValidValue = false;
              pdu.keys.forEach((key) => {
                if (key in pduDevice.payload) {
                  const val = parseFloat(pduDevice.payload[key]);
                  if (!isNaN(val)) {
                    sumKeys += val;
                    hasValidValue = true;
                  } else {
                    console.warn(
                      `[PUE Tab] PDU Key "${key}" has non-numeric value in initial payload: ${pduDevice.payload[key]} for PDU ${pdu.name}`
                    );
                  }
                } else {
                  console.warn(
                    `[PUE Tab] PDU Key "${key}" not found in initial payload for PDU ${
                      pdu.name
                    }. Payload keys: ${Object.keys(pduDevice.payload)}`
                  );
                }
              });
              totalPduValue = hasValidValue ? sumKeys : null;
            }

            return {
              ...pdu,
              value: totalPduValue, // <-- NEW: Inisialisasi `value` dari `lastPayload`
              topic: pduDevice, // Pastikan `topic` di PduConfig juga terisi
            };
          });

          return {
            ...item,
            pduList: updatedPduList as PduConfig[],
            mainPower: {
              ...item.mainPower,
              value: currentMainPowerValue, // <-- NEW: Inisialisasi `value` dari `lastPayload`
              topic: mainPowerDevice, // Pastikan `topic` di MainPowerConfig juga terisi
            },
          };
        });

      fetchedPueConfigs.forEach((config) => {
        config.pue = calculatePUE(config.mainPower.value, config.pduList);
      });

      setPueConfigs(fetchedPueConfigs);
      console.log("[PUE Tab] PUE configs state updated.");

      await subscribeToRelevantTopics(fetchedPueConfigs);
    } catch (error) {
      console.error("[PUE Tab] Error fetching PUE data:", error);
      Swal.fire("Error", "Failed to fetch PUE data", "error");
    } finally {
      setIsLoadingInitialData(false); // NEW: Set loading state to false
    }
  }, [
    getAuthHeaders,
    calculatePUE,
    subscribeToRelevantTopics,
    devicesForSelection,
  ]);

  const resetForm = useCallback(() => {
    formTopicSubscriptionRef.current.forEach((topicName) => {
      console.log(
        `[PUE Tab] Unsubscribing from form-related topic on reset: ${topicName}`
      );
      unsubscribe(topicName, handleMqttMessage);
    });
    formTopicSubscriptionRef.current.clear();

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
  }, [unsubscribe, handleMqttMessage]);

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
    setPduListForm((prev) => {
      const pduToRemove = prev[index];
      if (pduToRemove.topicUniqId) {
        const topicName = devicesForSelection.find(
          (d) => d.uniqId === pduToRemove.topicUniqId
        )?.topic;
        if (topicName && formTopicSubscriptionRef.current.has(topicName)) {
          console.log(
            `[PUE Tab] Unsubscribing from PDU topic on remove: ${topicName}`
          );
          unsubscribe(topicName, handleMqttMessage);
          formTopicSubscriptionRef.current.delete(topicName);
        }
      }
      return prev.filter((_, i) => i !== index);
    });
    console.log(`[PUE Tab] Removed PDU row at index ${index} from form.`);
  };

  const updatePduTopic = async (index: number, selectedTopicUniqId: string) => {
    console.log(
      `[PUE Tab] Updating PDU topic for index ${index}. Selected UniqId: ${selectedTopicUniqId}`
    );

    const prevPdu = pduListForm[index];
    const prevTopicName = devicesForSelection.find(
      (d) => d.uniqId === prevPdu.topicUniqId
    )?.topic;

    const newDeviceObj = devicesForSelection.find(
      (d) => d.uniqId === selectedTopicUniqId
    );
    const newTopicName = newDeviceObj?.topic;

    if (prevTopicName && formTopicSubscriptionRef.current.has(prevTopicName)) {
      console.log(
        `[PUE Tab] Unsubscribing from old PDU topic: ${prevTopicName}`
      );
      unsubscribe(prevTopicName, handleMqttMessage);
      formTopicSubscriptionRef.current.delete(prevTopicName);
    }

    if (
      newTopicName &&
      !topicUniqIdToTopicNameMapRef.current.has(selectedTopicUniqId) &&
      !formTopicSubscriptionRef.current.has(newTopicName)
    ) {
      console.log(`[PUE Tab] Subscribing to new PDU topic: ${newTopicName}`);
      subscribe(newTopicName, handleMqttMessage);
      formTopicSubscriptionRef.current.set(selectedTopicUniqId, newTopicName);
    } else if (newTopicName) {
      console.log(
        `[PUE Tab] Not subscribing to PDU topic ${newTopicName}. Already subscribed by main config or another form element.`
      );
    }

    setPduListForm((prev) => {
      const newPduList = [...prev];
      const currentPdu = newPduList[index];
      currentPdu.topicUniqId = selectedTopicUniqId;
      currentPdu.topic = newDeviceObj;

      const keysFromPayload = Object.keys(newDeviceObj?.payload || {});
      currentPdu.filteredKeys = keysFromPayload.filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );
      currentPdu.keys = [];
      console.log(
        `[PUE Tab] PDU filtered keys for index ${index}:`,
        currentPdu.filteredKeys
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

  const updateMainPowerTopic = async (selectedTopicUniqId: string) => {
    console.log(
      `[PUE Tab] Updating Main Power topic. Selected UniqId: ${selectedTopicUniqId}`
    );

    const prevTopicName = devicesForSelection.find(
      (d) => d.uniqId === mainPowerForm.topicUniqId
    )?.topic;

    const newDeviceObj = devicesForSelection.find(
      (d) => d.uniqId === selectedTopicUniqId
    );
    const newTopicName = newDeviceObj?.topic;

    if (prevTopicName && formTopicSubscriptionRef.current.has(prevTopicName)) {
      console.log(
        `[PUE Tab] Unsubscribing from old Main Power topic: ${prevTopicName}`
      );
      unsubscribe(prevTopicName, handleMqttMessage);
      formTopicSubscriptionRef.current.delete(prevTopicName);
    }

    if (
      newTopicName &&
      !topicUniqIdToTopicNameMapRef.current.has(selectedTopicUniqId) &&
      !formTopicSubscriptionRef.current.has(newTopicName)
    ) {
      console.log(
        `[PUE Tab] Subscribing to new Main Power topic: ${newTopicName}`
      );
      subscribe(newTopicName, handleMqttMessage);
      formTopicSubscriptionRef.current.set(selectedTopicUniqId, newTopicName);
    } else if (newTopicName) {
      console.log(
        `[PUE Tab] Not subscribing to Main Power topic ${newTopicName}. Already subscribed by main config or another form element.`
      );
    }

    setMainPowerForm((prev) => {
      const filteredKeys = Object.keys(newDeviceObj?.payload || {}).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );
      console.log(`[PUE Tab] Main Power filtered keys:`, filteredKeys);
      return {
        ...prev,
        topicUniqId: selectedTopicUniqId,
        topic: newDeviceObj,
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

    setIsSubmitting(true); // NEW: Set loading state to true for add

    try {
      const payload = {
        customName,
        type: "pue",
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
          value: null, // Tetap null saat disimpan ke DB, akan diisi dari MQTT
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
          value: null, // Tetap null saat disimpan ke DB, akan diisi dari MQTT
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
    } finally {
      setIsSubmitting(false); // NEW: Set loading state to false
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

      if (
        mainPowerDeviceObj?.topic &&
        !topicUniqIdToTopicNameMapRef.current.has(
          itemToEdit.mainPower.topicUniqId
        ) &&
        !formTopicSubscriptionRef.current.has(mainPowerDeviceObj.topic)
      ) {
        console.log(
          `[PUE Tab] Subscribing to Main Power topic for edit: ${mainPowerDeviceObj.topic}`
        );
        subscribe(mainPowerDeviceObj.topic, handleMqttMessage);
        formTopicSubscriptionRef.current.set(
          itemToEdit.mainPower.topicUniqId,
          mainPowerDeviceObj.topic
        );
      }

      const mainPowerFilteredKeys = Object.keys(
        mainPowerDeviceObj?.payload || {}
      ).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );

      setMainPowerForm({
        topicUniqId: itemToEdit.mainPower.topicUniqId,
        key: itemToEdit.mainPower.key,
        value: itemToEdit.mainPower.value,
        topic: mainPowerDeviceObj,
        filteredKeys: mainPowerFilteredKeys,
      });
      console.log("[PUE Tab] Edit form - Main Power populated (initial):", {
        topicUniqId: itemToEdit.mainPower.topicUniqId,
        key: itemToEdit.mainPower.key,
        value: itemToEdit.mainPower.value,
        topic: mainPowerDeviceObj,
        filteredKeys: mainPowerFilteredKeys,
      });

      const newPduListForm = itemToEdit.pduList.map((pdu) => {
        const pduDeviceObj = devicesForSelection.find(
          (d) => d.uniqId === pdu.topicUniqId
        );

        if (
          pduDeviceObj?.topic &&
          !topicUniqIdToTopicNameMapRef.current.has(pdu.topicUniqId) &&
          !formTopicSubscriptionRef.current.has(pduDeviceObj.topic)
        ) {
          console.log(
            `[PUE Tab] Subscribing to PDU topic for edit: ${pduDeviceObj.topic}`
          );
          subscribe(pduDeviceObj.topic, handleMqttMessage);
          formTopicSubscriptionRef.current.set(
            pdu.topicUniqId,
            pduDeviceObj.topic
          );
        }

        const pduFilteredKeys = Object.keys(pduDeviceObj?.payload || {}).filter(
          (key) =>
            key.toLowerCase().includes("power") ||
            key.toLowerCase().includes("lux")
        );

        return {
          topicUniqId: pdu.topicUniqId,
          name: pdu.name,
          keys: pdu.keys,
          value: pdu.value,
          topic: pduDeviceObj,
          filteredKeys: pduFilteredKeys,
        };
      });
      setPduListForm(newPduListForm);
      console.log(
        "[PUE Tab] Edit form - PDU List populated (initial):",
        newPduListForm
      );

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

    setIsSubmitting(true); // NEW: Set loading state to true for edit

    try {
      const payload: Partial<PueConfig> = {
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
    } finally {
      setIsSubmitting(false); // NEW: Set loading state to false
    }
  };

  const deleteItem = async (id: string) => {
    setConfigToDelete(pueConfigs.find((config) => config.id === id) || null); // Store config to delete
    setIsDeleteAlertOpen(true); // Open alert dialog
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true); // NEW: Set loading state for delete action

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/pue-configs/${configToDelete.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      console.log(
        `[PUE Tab] PUE configuration with ID ${configToDelete.id} deleted successfully.`
      );

      Swal.fire("Deleted!", "Your data has been deleted.", "success");
      setIsDeleteAlertOpen(false); // Close alert dialog
      setConfigToDelete(null); // Clear config to delete
      await fetchData();
      await fetchDevicesForSelection();
    } catch (error: any) {
      console.error("[PUE Tab] Error deleting item:", error.message);
      Swal.fire("Error", `Failed to delete data: ${error.message}`, "error");
    } finally {
      setIsDeletingConfig(false); // NEW: Set loading state to false
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
    if (devicesForSelection.length > 0) {
      fetchData();
    }
    return () => {
      console.log(
        "[PUE Tab] Unsubscribing from all MQTT topics on PueTab unmount cleanup."
      );
      topicUniqIdToTopicNameMapRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      topicUniqIdToTopicNameMapRef.current.clear();

      formTopicSubscriptionRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      formTopicSubscriptionRef.current.clear();
    };
  }, [fetchData, unsubscribe, handleMqttMessage, devicesForSelection]);

  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isAddModalOpen, isEditModalOpen, resetForm]);

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
          <Button
            onClick={openAddDataModal}
            disabled={isSubmitting || isLoadingInitialData || isDeletingConfig}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Data
          </Button>
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
              {isLoadingInitialData ? (
                <tr>
                  <TableCell colSpan={5} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </TableCell>
                </tr>
              ) : paginatedData.length === 0 ? (
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
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig
                        }
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
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig
                        }
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig
                        }
                      >
                        {isDeletingConfig && configToDelete?.id === item.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        <Trash2 className="h-4 w-4" /> Delete
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
            disabled={
              currentPage === 1 ||
              isSubmitting ||
              isLoadingInitialData ||
              isDeletingConfig
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
              isSubmitting ||
              isLoadingInitialData ||
              isDeletingConfig
            }
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
                    disabled={isSubmitting} // NEW: Disable input during submission
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
                          disabled={isSubmitting} // NEW: Disable select during submission
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
                          disabled={isSubmitting} // NEW: Disable select during submission
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
                        disabled={isSubmitting} // NEW: Disable button during submission
                      >
                        Remove Rack
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPdu}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Rack/PDU
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
                    disabled={isSubmitting} // NEW: Disable select during submission
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
                    disabled={isSubmitting} // NEW: Disable select during submission
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
                    disabled={isSubmitting} // NEW: Disable input during submission
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
                          disabled={isSubmitting} // NEW: Disable select during submission
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
                          disabled={isSubmitting} // NEW: Disable select during submission
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
                        disabled={isSubmitting} // NEW: Disable button during submission
                      >
                        Remove Rack
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPdu}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Rack/PDU
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
                    disabled={isSubmitting} // NEW: Disable select during submission
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
                    disabled={isSubmitting} // NEW: Disable select during submission
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

        {/* NEW: Alert Dialog untuk Konfirmasi Hapus */}
        <AlertDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the PUE configuration for{" "}
                <b>{configToDelete?.customName}</b>.
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
      </CardContent>
    </Card>
  );
}
