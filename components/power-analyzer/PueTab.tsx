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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  BarChart3,
  Activity,
  RefreshCw,
  Zap,
  Database,
  Search,
  Eye,
  X,
} from "lucide-react";

// --- Enhanced Multiselect Component ---
interface MultiselectProps {
  value: string[];
  options: string[];
  placeholder: string;
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
}

const Multiselect: React.FC<MultiselectProps> = ({
  value,
  options,
  placeholder,
  onChange,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange?.(newValue);
  };

  const removeItem = (option: string) => {
    const newValue = value.filter((v) => v !== option);
    onChange?.(newValue);
  };

  return (
    <div className="relative">
      <div
        className={`flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="text-xs px-2 py-1"
              >
                {item}
                {!disabled && (
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item);
                    }}
                  />
                )}
              </Badge>
            ))
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                  value.includes(option) ? "bg-accent" : ""
                }`}
                onClick={() => handleToggle(option)}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.includes(option)}
                    onChange={() => {}} // Handled by parent click
                    className="rounded"
                  />
                  <span>{option}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// --- Type Definitions ---
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  payload?: Record<string, any>;
  lastPayload?: Record<string, any>;
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

// --- Toast Configuration ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PueConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Real-time payload data for modal
  const [modalPayloadData, setModalPayloadData] = useState<Record<string, any>>(
    {}
  );

  // Filter configs based on search
  const filteredConfigs = useMemo(() => {
    if (!searchQuery) return pueConfigs;
    return pueConfigs.filter((config) =>
      config.customName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pueConfigs, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredConfigs.slice(start, start + itemsPerPage);
  }, [filteredConfigs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredConfigs.length / itemsPerPage);
  }, [filteredConfigs]);

  const topicUniqIdToTopicNameMapRef = useRef<Map<string, string>>(new Map());
  const formTopicSubscriptionRef = useRef<Map<string, string>>(new Map());

  const getAuthHeaders = useCallback(() => {
    const authToken = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
      if (itPower === 0) return "0";
      return (mainPowerValue / itPower).toFixed(2);
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

  // Enhanced MQTT message handler
  const handleMqttMessage = useCallback(
    (topicName: string, messageString: string) => {
      let payload: Record<string, any>;
      try {
        const outerPayload = JSON.parse(messageString);
        if (outerPayload.value && typeof outerPayload.value === "object") {
          payload = outerPayload.value;
        } else if (
          outerPayload.value &&
          typeof outerPayload.value === "string"
        ) {
          try {
            payload = JSON.parse(outerPayload.value);
          } catch {
            payload = outerPayload;
          }
        } else {
          payload = outerPayload;
        }
      } catch (e) {
        console.error(
          `Failed to parse MQTT payload from topic ${topicName}:`,
          e
        );
        return;
      }

      // Update modal payload data for real-time key detection
      setModalPayloadData((prev) => ({
        ...prev,
        [topicName]: payload,
      }));

      // Update main configs
      setPueConfigs((prevConfigs) => {
        return prevConfigs.map((config) => {
          let configUpdated = false;
          let newMainPower = { ...config.mainPower };
          const mainPowerTopic = topicUniqIdToTopicNameMapRef.current.get(
            config.mainPower.topicUniqId
          );
          if (mainPowerTopic === topicName) {
            const value = parseFloat(payload[config.mainPower.key]);
            if (!isNaN(value) && newMainPower.value !== value) {
              newMainPower.value = value;
              configUpdated = true;
            }
          }

          const newPduList = config.pduList.map((pdu) => {
            const pduTopic = topicUniqIdToTopicNameMapRef.current.get(
              pdu.topicUniqId
            );
            if (pduTopic === topicName) {
              const totalValue = pdu.keys.reduce((sum, key) => {
                const value = parseFloat(payload[key]);
                return sum + (isNaN(value) ? 0 : value);
              }, 0);
              if (pdu.value !== totalValue) {
                configUpdated = true;
                return { ...pdu, value: totalValue };
              }
            }
            return pdu;
          });

          if (configUpdated) {
            const updatedConfig = {
              ...config,
              mainPower: newMainPower,
              pduList: newPduList,
            };
            updatedConfig.pue = calculatePUE(
              updatedConfig.mainPower.value,
              updatedConfig.pduList
            );
            return updatedConfig;
          }
          return config;
        });
      });

      // Update device payload data
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) => {
          if (d.topic === topicName) {
            return { ...d, payload: payload };
          }
          return d;
        })
      );
    },
    [calculatePUE]
  );

  // Enhanced key filtering function
  const getFilteredKeys = useCallback(
    (device: DeviceForSelection | undefined, topicName?: string): string[] => {
      if (!device) return [];

      // Use real-time payload data if available
      const payload =
        modalPayloadData[device.topic] ||
        device.payload ||
        device.lastPayload ||
        {};

      return Object.keys(payload).filter((key) => {
        const value = payload[key];
        // Filter for numeric values that might be power-related
        if (typeof value === "number" || !isNaN(parseFloat(value))) {
          const keyLower = key.toLowerCase();
          return (
            keyLower.includes("power") ||
            keyLower.includes("watt") ||
            keyLower.includes("current") ||
            keyLower.includes("voltage") ||
            keyLower.includes("energy") ||
            keyLower.includes("consumption")
          );
        }
        return false;
      });
    },
    [modalPayloadData]
  );

  // Modal MQTT subscription management
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) return;

    // Subscribe to all devices for real-time key detection
    const activeTopics = new Set<string>();

    // Subscribe to PDU devices
    pduListForm.forEach((pdu) => {
      if (pdu.topicUniqId) {
        const device = devicesForSelection.find(
          (d) => d.uniqId === pdu.topicUniqId
        );
        if (device?.topic) {
          activeTopics.add(device.topic);
        }
      }
    });

    // Subscribe to main power device
    if (mainPowerForm.topicUniqId) {
      const device = devicesForSelection.find(
        (d) => d.uniqId === mainPowerForm.topicUniqId
      );
      if (device?.topic) {
        activeTopics.add(device.topic);
      }
    }

    // Subscribe to topics
    activeTopics.forEach((topic) => {
      if (!formTopicSubscriptionRef.current.has(topic)) {
        subscribe(topic, handleMqttMessage);
        formTopicSubscriptionRef.current.set(topic, topic);
      }
    });

    // Update filtered keys when payload data changes
    setPduListForm((currentList) =>
      currentList.map((pdu) => {
        if (!pdu.topicUniqId) return pdu;
        const device = devicesForSelection.find(
          (d) => d.uniqId === pdu.topicUniqId
        );
        const newFilteredKeys = getFilteredKeys(device);
        return { ...pdu, filteredKeys: newFilteredKeys };
      })
    );

    setMainPowerForm((currentMainPower) => {
      if (!currentMainPower.topicUniqId) return currentMainPower;
      const device = devicesForSelection.find(
        (d) => d.uniqId === currentMainPower.topicUniqId
      );
      const newFilteredKeys = getFilteredKeys(device);
      return { ...currentMainPower, filteredKeys: newFilteredKeys };
    });

    return () => {
      // Cleanup subscriptions when modal closes
      if (!isAddModalOpen && !isEditModalOpen) {
        formTopicSubscriptionRef.current.forEach((_, topic) => {
          unsubscribe(topic, handleMqttMessage);
        });
        formTopicSubscriptionRef.current.clear();
        setModalPayloadData({});
      }
    };
  }, [
    isAddModalOpen,
    isEditModalOpen,
    pduListForm,
    mainPowerForm,
    devicesForSelection,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    getFilteredKeys,
  ]);

  const manageMqttSubscriptions = useCallback(
    async (configs: PueConfig[], devices: DeviceForSelection[]) => {
      const requiredUniqIds = new Set<string>();
      configs.forEach((config) => {
        if (config.mainPower?.topicUniqId)
          requiredUniqIds.add(config.mainPower.topicUniqId);
        config.pduList.forEach((pdu) => {
          if (pdu.topicUniqId) requiredUniqIds.add(pdu.topicUniqId);
        });
      });

      const newTopicMap = new Map<string, string>();
      requiredUniqIds.forEach((uniqId) => {
        const device = devices.find((d) => d.uniqId === uniqId);
        if (device?.topic) {
          newTopicMap.set(uniqId, device.topic);
        }
      });

      const oldTopics = new Set(topicUniqIdToTopicNameMapRef.current.values());
      const newTopics = new Set(newTopicMap.values());

      oldTopics.forEach((topic) => {
        if (!newTopics.has(topic)) {
          unsubscribe(topic, handleMqttMessage);
        }
      });

      newTopics.forEach((topic) => {
        if (!oldTopics.has(topic)) {
          subscribe(topic, handleMqttMessage);
        }
      });

      topicUniqIdToTopicNameMapRef.current = newTopicMap;
    },
    [subscribe, unsubscribe, handleMqttMessage]
  );

  // Enhanced data initialization
  const initializeData = useCallback(
    async (showToast = false) => {
      try {
        if (showToast) {
          setRefreshing(true);
        }
        setIsLoadingInitialData(true);

        const deviceResponse = await fetch(
          `${API_BASE_URL}/api/devices/for-selection`,
          { headers: getAuthHeaders() }
        );
        if (!deviceResponse.ok) throw new Error("Failed to fetch devices");
        const deviceData: DeviceForSelection[] = await deviceResponse.json();
        const devicesWithPayload = deviceData.map((d) => ({
          ...d,
          payload: d.lastPayload || {},
        }));
        setDevicesForSelection(devicesWithPayload);

        const pueResponse = await fetch(`${API_BASE_URL}/api/pue-configs`, {
          headers: getAuthHeaders(),
        });
        if (!pueResponse.ok)
          throw new Error("Failed to fetch PUE configurations");
        const pueData: PueConfig[] = await pueResponse.json();

        const processedConfigs = pueData
          .filter((item) => item.type === "pue")
          .map((item) => {
            const mainPowerDevice = devicesWithPayload.find(
              (d) => d.uniqId === item.mainPower.topicUniqId
            );
            let mainPowerValue: number | null = null;
            if (
              mainPowerDevice?.payload &&
              item.mainPower.key in mainPowerDevice.payload
            ) {
              const val = parseFloat(
                mainPowerDevice.payload[item.mainPower.key]
              );
              if (!isNaN(val)) mainPowerValue = val;
            }

            const pduListWithValues = (item.pduList || []).map((pdu) => {
              const pduDevice = devicesWithPayload.find(
                (d) => d.uniqId === pdu.topicUniqId
              );
              let totalPduValue: number | null = 0;
              if (pduDevice?.payload) {
                totalPduValue = pdu.keys.reduce((sum, key) => {
                  const val = parseFloat(pduDevice.payload[key]);
                  return sum + (isNaN(val) ? 0 : val);
                }, 0);
              }
              return { ...pdu, value: totalPduValue };
            });

            const newConfig = {
              ...item,
              mainPower: { ...item.mainPower, value: mainPowerValue },
              pduList: pduListWithValues,
            };
            newConfig.pue = calculatePUE(
              newConfig.mainPower.value,
              newConfig.pduList
            );
            return newConfig;
          });
        setPueConfigs(processedConfigs);

        await manageMqttSubscriptions(processedConfigs, devicesWithPayload);

        if (showToast) {
          Toast.fire({
            icon: "success",
            title: "Refreshed",
            text: `${processedConfigs.length} PUE configurations loaded`,
          });
        }
      } catch (error: any) {
        console.error("Failed to load initial data:", error);
        Toast.fire(
          "Error",
          error.message || "Failed to load initial data",
          "error"
        );
      } finally {
        setIsLoadingInitialData(false);
        setRefreshing(false);
      }
    },
    [getAuthHeaders, calculatePUE, manageMqttSubscriptions]
  );

  useEffect(() => {
    initializeData();

    return () => {
      topicUniqIdToTopicNameMapRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      formTopicSubscriptionRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage);
      });
      topicUniqIdToTopicNameMapRef.current.clear();
      formTopicSubscriptionRef.current.clear();
    };
  }, [initializeData, unsubscribe, handleMqttMessage]);

  const resetForm = useCallback(() => {
    // Clean up form subscriptions
    formTopicSubscriptionRef.current.forEach((_, topic) => {
      const isUsedByMainConfig = Array.from(
        topicUniqIdToTopicNameMapRef.current.values()
      ).includes(topic);
      if (!isUsedByMainConfig) {
        unsubscribe(topic, handleMqttMessage);
      }
    });
    formTopicSubscriptionRef.current.clear();
    setModalPayloadData({});

    setCustomName("");
    setPduListForm([
      { topicUniqId: "", keys: [], value: null, filteredKeys: [] },
    ]);
    setMainPowerForm({
      topicUniqId: "",
      key: "",
      value: null,
      filteredKeys: [],
    });
    setSelectedPueConfigId(null);
  }, [unsubscribe, handleMqttMessage]);

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Toast.fire({
        icon: "error",
        title: "Please fill in all required fields.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customName,
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save data");
      }

      Toast.fire({
        icon: "success",
        title: "PUE configuration saved successfully!",
      });
      setIsAddModalOpen(false);
      await initializeData();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: `Failed to save: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPueConfigId) return;
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Toast.fire({
        icon: "error",
        title: "Please fill in all required fields.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customName,
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
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
        throw new Error(errorData.message || "Failed to update data");
      }

      Toast.fire({
        icon: "success",
        title: "PUE configuration updated successfully!",
      });
      setIsEditModalOpen(false);
      await initializeData();
    } catch (error: any) {
      Toast.fire({
        icon: "error",
        title: `Failed to update: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true);
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
        throw new Error(errorData.message || "Failed to delete data");
      }

      Toast.fire({ icon: "success", title: "PUE configuration deleted!" });
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
      await initializeData();
    } catch (error: any) {
      Toast.fire({
        icon: "error",
        title: `Failed to delete: ${error.message}`,
      });
    } finally {
      setIsDeletingConfig(false);
    }
  };

  const openAddDataModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const editItem = (item: PueConfig) => {
    resetForm();
    setSelectedPueConfigId(item.id);
    setCustomName(item.customName);

    const mainPowerDevice = devicesForSelection.find(
      (d) => d.uniqId === item.mainPower.topicUniqId
    );
    setMainPowerForm({
      ...item.mainPower,
      topic: mainPowerDevice,
      filteredKeys: getFilteredKeys(mainPowerDevice),
    });

    const newPduListForm = item.pduList.map((pdu) => {
      const pduDevice = devicesForSelection.find(
        (d) => d.uniqId === pdu.topicUniqId
      );
      return {
        ...pdu,
        topic: pduDevice,
        filteredKeys: getFilteredKeys(pduDevice),
      };
    });
    setPduListForm(newPduListForm);
    setIsEditModalOpen(true);
  };

  const deleteItem = (item: PueConfig) => {
    setConfigToDelete(item);
    setIsDeleteAlertOpen(true);
  };

  const showDetails = (item: PueConfig) => {
    setSelectedPueConfigDetail(item);
    setIsDetailModalOpen(true);
  };

  const handleAddPdu = () => {
    setPduListForm((prev) => [
      ...prev,
      { topicUniqId: "", keys: [], value: null, filteredKeys: [] },
    ]);
  };

  const handleRemovePdu = (index: number) => {
    const pduToRemove = pduListForm[index];
    if (pduToRemove?.topicUniqId) {
      const device = devicesForSelection.find(
        (d) => d.uniqId === pduToRemove.topicUniqId
      );
      if (device?.topic && formTopicSubscriptionRef.current.has(device.topic)) {
        const isUsedByMainConfig = Array.from(
          topicUniqIdToTopicNameMapRef.current.values()
        ).includes(device.topic);
        if (!isUsedByMainConfig) {
          unsubscribe(device.topic, handleMqttMessage);
        }
        formTopicSubscriptionRef.current.delete(device.topic);
      }
    }
    setPduListForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePduTopic = (index: number, topicUniqId: string) => {
    const device = devicesForSelection.find((d) => d.uniqId === topicUniqId);
    if (!device) return;

    // Subscribe to new device topic for real-time updates
    if (device.topic && !formTopicSubscriptionRef.current.has(device.topic)) {
      subscribe(device.topic, handleMqttMessage);
      formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
    }

    const filteredKeys = getFilteredKeys(device);
    setPduListForm((prev) => {
      const newList = [...prev];
      newList[index] = {
        ...newList[index],
        topicUniqId,
        topic: device,
        filteredKeys,
        keys: [],
      };
      return newList;
    });
  };

  const updatePduKeys = (index: number, keys: string[]) => {
    setPduListForm((prev) => {
      const newList = [...prev];
      newList[index].keys = keys;
      return newList;
    });
  };

  const updateMainPowerTopic = (topicUniqId: string) => {
    const device = devicesForSelection.find((d) => d.uniqId === topicUniqId);
    if (!device) return;

    // Subscribe to new device topic for real-time updates
    if (device.topic && !formTopicSubscriptionRef.current.has(device.topic)) {
      subscribe(device.topic, handleMqttMessage);
      formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
    }

    const filteredKeys = getFilteredKeys(device);
    setMainPowerForm({
      ...mainPowerForm,
      topicUniqId,
      topic: device,
      filteredKeys,
      key: "",
    });
  };

  const updateMainPowerKey = (key: string) => {
    setMainPowerForm((prev) => ({ ...prev, key }));
  };

  return (
    <div className="space-y-6">
      {/* Main PUE Configuration Card */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                PUE (Power Usage Effectiveness)
              </CardTitle>
              <CardDescription>
                Configure and monitor Power Usage Effectiveness of your data
                center
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => initializeData(true)}
                disabled={refreshing || isLoadingInitialData}
                className="whitespace-nowrap"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={openAddDataModal}
                disabled={
                  isSubmitting || isLoadingInitialData || isDeletingConfig
                }
                className="bg-primary hover:bg-primary/90 whitespace-nowrap"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add PUE Config
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PUE configurations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoadingInitialData}
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden">
            {isLoadingInitialData ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-2">
                  Loading PUE configurations...
                </p>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-medium">
                      {searchQuery
                        ? "No configurations found"
                        : "No PUE configurations"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search terms"
                        : "Add your first PUE configuration to monitor efficiency"}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Button onClick={openAddDataModal} className="mt-2">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add PUE Config
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        #
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Configuration
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        PDU/Racks
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        PUE Value
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                      >
                        <TableCell className="py-4">
                          {index + 1 + (currentPage - 1) * itemsPerPage}
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {item.customName}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Database className="h-3 w-3 mr-1" />
                                Main:{" "}
                                {item.mainPower.value?.toFixed(2) || "N/A"}W
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">
                              {item.pduList?.length || 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              racks
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.pue === "N/A"
                                  ? "secondary"
                                  : parseFloat(item.pue || "0") > 2
                                  ? "destructive"
                                  : parseFloat(item.pue || "0") > 1.5
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-sm"
                            >
                              {item.pue}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => showDetails(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                View detailed PUE breakdown
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                  onClick={() => editItem(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Edit configuration
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                  onClick={() => deleteItem(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                >
                                  {isDeletingConfig &&
                                  configToDelete?.id === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-red-600 dark:text-red-400" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Delete configuration
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1 || isLoadingInitialData}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={
                          currentPage === totalPages || isLoadingInitialData
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditModalOpen ? "Edit" : "Add"} PUE Configuration
            </DialogTitle>
            <DialogDescription>
              Configure power monitoring devices to calculate Power Usage
              Effectiveness
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={isEditModalOpen ? handleEditData : handleAddData}
            className="space-y-6 pt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="customName" className="text-sm font-medium">
                Configuration Name *
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Data Center Main PUE"
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
                  onClick={handleAddPdu}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Rack
                </Button>
              </div>

              {pduListForm.map((pdu, index) => (
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
                          value={pdu.topicUniqId}
                          onValueChange={(value) =>
                            updatePduTopic(index, value)
                          }
                          required={pduListForm.length === 1}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Choose a device..." />
                          </SelectTrigger>
                          <SelectContent>
                            {devicesForSelection.map((device) => (
                              <SelectItem
                                key={device.uniqId}
                                value={device.uniqId}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    {device.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {device.topic}
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
                        <Multiselect
                          value={pdu.keys}
                          options={pdu.filteredKeys || []}
                          placeholder="Choose power keys..."
                          onChange={(selected) =>
                            updatePduKeys(index, selected)
                          }
                          disabled={isSubmitting || !pdu.topicUniqId}
                        />
                        {pdu.topicUniqId && pdu.filteredKeys?.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Waiting for power data from device...
                          </p>
                        )}
                      </div>
                    </div>

                    {pduListForm.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => handleRemovePdu(index)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Power Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
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
                        value={mainPowerForm.topicUniqId}
                        onValueChange={updateMainPowerTopic}
                        required
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose main power device..." />
                        </SelectTrigger>
                        <SelectContent>
                          {devicesForSelection.map((device) => (
                            <SelectItem
                              key={device.uniqId}
                              value={device.uniqId}
                            >
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {device.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {device.topic}
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
                        value={mainPowerForm.key}
                        onValueChange={updateMainPowerKey}
                        required
                        disabled={isSubmitting || !mainPowerForm.topicUniqId}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose power key..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mainPowerForm.filteredKeys?.map((key) => (
                            <SelectItem key={key} value={key}>
                              <code className="font-mono">{key}</code>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mainPowerForm.topicUniqId &&
                        mainPowerForm.filteredKeys?.length === 0 && (
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
            {mainPowerForm.topicUniqId &&
              mainPowerForm.key &&
              pduListForm.some((p) => p.topicUniqId && p.keys.length > 0) && (
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
                        {
                          devicesForSelection.find(
                            (d) => d.uniqId === mainPowerForm.topicUniqId
                          )?.name
                        }
                        → {mainPowerForm.key}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        IT Power Sources:
                      </span>
                      <span>
                        {
                          pduListForm.filter(
                            (p) => p.topicUniqId && p.keys.length > 0
                          ).length
                        }{" "}
                        racks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Keys Monitored:
                      </span>
                      <span>
                        {pduListForm.reduce((sum, p) => sum + p.keys.length, 0)}{" "}
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
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pueForm"
              onClick={isEditModalOpen ? handleEditData : handleAddData}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditModalOpen ? "Update Configuration" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PUE Details: {selectedPueConfigDetail?.customName}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of Power Usage Effectiveness calculation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total PUE</p>
                    <p className="text-2xl font-bold">
                      {selectedPueConfigDetail?.pue}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monitored Racks
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedPueConfigDetail?.pduList?.length || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </Card>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Rack Name</TableHead>
                    <TableHead>Power (W)</TableHead>
                    <TableHead>Individual PUE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPueConfigDetail?.pduList?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">
                            No racks configured
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedPueConfigDetail?.pduList?.map((pdu, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {pdu.name || `Rack-${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pdu.keys.length} power keys
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {pdu.value?.toFixed(2) || "0.00"} W
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {calculatePUEForPdu(
                              selectedPueConfigDetail.mainPower.value,
                              pdu.value
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PUE Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the PUE configuration for{" "}
              <strong>{configToDelete?.customName}</strong>? This action cannot
              be undone.
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeletingConfig && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
