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

import { useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";

// --- START: Basic React Multiselect Component Placeholder ---
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
      disabled={disabled}
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return pueConfigs.slice(start, start + itemsPerPage);
  }, [pueConfigs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(pueConfigs.length / itemsPerPage);
  }, [pueConfigs]);

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
          `[PUE Tab] Failed to parse MQTT payload from topic ${topicName}:`,
          e
        );
        return;
      }

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

  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingInitialData(true);
      try {
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
      } catch (error: any) {
        console.error("[PUE Tab] Failed to load initial data:", error);
        Swal.fire(
          "Error",
          error.message || "Failed to load initial data",
          "error"
        );
      } finally {
        setIsLoadingInitialData(false);
      }
    };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen) {
      const getFilteredKeys = (device: DeviceForSelection | undefined) => {
        return Object.keys(device?.payload || device?.lastPayload || {}).filter(
          (key) =>
            key.toLowerCase().includes("power") ||
            key.toLowerCase().includes("lux")
        );
      };

      setPduListForm((currentList) =>
        currentList.map((pdu) => {
          if (!pdu.topicUniqId) return pdu;
          const device = devicesForSelection.find(
            (d) => d.uniqId === pdu.topicUniqId
          );
          const newFilteredKeys = getFilteredKeys(device);
          if (
            JSON.stringify(pdu.filteredKeys) !== JSON.stringify(newFilteredKeys)
          ) {
            return { ...pdu, filteredKeys: newFilteredKeys };
          }
          return pdu;
        })
      );

      setMainPowerForm((currentMainPower) => {
        if (!currentMainPower.topicUniqId) return currentMainPower;
        const device = devicesForSelection.find(
          (d) => d.uniqId === currentMainPower.topicUniqId
        );
        const newFilteredKeys = getFilteredKeys(device);
        if (
          JSON.stringify(currentMainPower.filteredKeys) !==
          JSON.stringify(newFilteredKeys)
        ) {
          return { ...currentMainPower, filteredKeys: newFilteredKeys };
        }
        return currentMainPower;
      });
    }
  }, [devicesForSelection, isAddModalOpen, isEditModalOpen]);

  const resetForm = useCallback(() => {
    formTopicSubscriptionRef.current.forEach((uniqId, topic) => {
      const isUsedByMainConfig = Array.from(
        topicUniqIdToTopicNameMapRef.current.values()
      ).includes(topic);
      if (!isUsedByMainConfig) {
        unsubscribe(topic, handleMqttMessage);
      }
    });
    formTopicSubscriptionRef.current.clear();

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

  const refreshDataAndSubscriptions = async () => {
    try {
      const deviceResponse = await fetch(
        `${API_BASE_URL}/api/devices/for-selection`,
        { headers: getAuthHeaders() }
      );
      if (!deviceResponse.ok) throw new Error("Failed to fetch devices");
      const deviceData = await deviceResponse.json();
      const devicesWithPayload = deviceData.map((d: DeviceForSelection) => ({
        ...d,
        payload: d.lastPayload || {},
      }));
      setDevicesForSelection(devicesWithPayload);

      const pueResponse = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        headers: getAuthHeaders(),
      });
      if (!pueResponse.ok)
        throw new Error("Failed to fetch PUE configurations");
      const pueData = await pueResponse.json();

      const processedConfigs = pueData
        .filter((item: PueConfig) => item.type === "pue")
        .map((item: PueConfig) => {
          const newConfig = { ...item };
          newConfig.pue = calculatePUE(item.mainPower.value, item.pduList);
          return newConfig;
        });
      setPueConfigs(processedConfigs);

      await manageMqttSubscriptions(processedConfigs, devicesWithPayload);
    } catch (error: any) {
      Swal.fire("Error", `Failed to refresh data: ${error.message}`, "error");
    }
  };

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields.", "error");
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
      Swal.fire("Success", "Data has been saved successfully!", "success");
      setIsAddModalOpen(false);
      await refreshDataAndSubscriptions();
    } catch (error: any) {
      Swal.fire("Error", `Failed to save data: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPueConfigId) return;
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      Swal.fire("Error", "Please fill in all required fields.", "error");
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
      Swal.fire("Success", "Data has been updated successfully!", "success");
      setIsEditModalOpen(false);
      await refreshDataAndSubscriptions();
    } catch (error: any) {
      Swal.fire("Error", `Failed to update data: ${error.message}`, "error");
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
      Swal.fire("Deleted!", "Your data has been deleted.", "success");
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
      await refreshDataAndSubscriptions();
    } catch (error: any) {
      Swal.fire("Error", `Failed to delete data: ${error.message}`, "error");
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

    const getFilteredKeys = (device: DeviceForSelection | undefined) => {
      return Object.keys(device?.payload || device?.lastPayload || {}).filter(
        (key) =>
          key.toLowerCase().includes("power") ||
          key.toLowerCase().includes("lux")
      );
    };

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

    const oldPdu = pduListForm[index];
    if (oldPdu?.topicUniqId) {
      const oldDevice = devicesForSelection.find(
        (d) => d.uniqId === oldPdu.topicUniqId
      );
      if (
        oldDevice?.topic &&
        formTopicSubscriptionRef.current.has(oldDevice.topic)
      ) {
        const isUsedByMainConfig = Array.from(
          topicUniqIdToTopicNameMapRef.current.values()
        ).includes(oldDevice.topic);
        if (!isUsedByMainConfig) {
          unsubscribe(oldDevice.topic, handleMqttMessage);
        }
        formTopicSubscriptionRef.current.delete(oldDevice.topic);
      }
    }

    if (device.topic) {
      const isSubscribedByMain = Array.from(
        topicUniqIdToTopicNameMapRef.current.values()
      ).includes(device.topic);
      const isSubscribedByForm = formTopicSubscriptionRef.current.has(
        device.topic
      );
      if (!isSubscribedByMain && !isSubscribedByForm) {
        subscribe(device.topic, handleMqttMessage);
        formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
      }
    }

    const filteredKeys = Object.keys(
      device?.payload || device?.lastPayload || {}
    ).filter(
      (key) =>
        key.toLowerCase().includes("power") || key.toLowerCase().includes("lux")
    );
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

    if (mainPowerForm.topicUniqId) {
      const oldDevice = devicesForSelection.find(
        (d) => d.uniqId === mainPowerForm.topicUniqId
      );
      if (
        oldDevice?.topic &&
        formTopicSubscriptionRef.current.has(oldDevice.topic)
      ) {
        const isUsedByMainConfig = Array.from(
          topicUniqIdToTopicNameMapRef.current.values()
        ).includes(oldDevice.topic);
        if (!isUsedByMainConfig) {
          unsubscribe(oldDevice.topic, handleMqttMessage);
        }
        formTopicSubscriptionRef.current.delete(oldDevice.topic);
      }
    }

    if (device.topic) {
      const isSubscribedByMain = Array.from(
        topicUniqIdToTopicNameMapRef.current.values()
      ).includes(device.topic);
      const isSubscribedByForm = formTopicSubscriptionRef.current.has(
        device.topic
      );
      if (!isSubscribedByMain && !isSubscribedByForm) {
        subscribe(device.topic, handleMqttMessage);
        formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
      }
    }

    const filteredKeys = Object.keys(
      device?.payload || device?.lastPayload || {}
    ).filter(
      (key) =>
        key.toLowerCase().includes("power") || key.toLowerCase().includes("lux")
    );
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Custom Name</TableHead>
                <TableHead>Total PDU/Rack</TableHead>
                <TableHead>PUE (Main / IT)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingInitialData ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-gray-500"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {index + 1 + (currentPage - 1) * itemsPerPage}
                    </TableCell>
                    <TableCell>{item.customName}</TableCell>
                    <TableCell>{item.pduList?.length || "N/A"}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2"
                        onClick={() => editItem(item)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item)}
                        disabled={
                          isSubmitting ||
                          isLoadingInitialData ||
                          isDeletingConfig
                        }
                      >
                        {isDeletingConfig && configToDelete?.id === item.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-center items-center mt-4 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoadingInitialData}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoadingInitialData}
          >
            Next
          </Button>
        </div>

        <Dialog
          open={isAddModalOpen || isEditModalOpen}
          onOpenChange={isAddModalOpen ? setIsAddModalOpen : setIsEditModalOpen}
        >
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>
                {isEditModalOpen ? "Edit" : "Add"} PUE Configuration
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={isEditModalOpen ? handleEditData : handleAddData}>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
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
                    disabled={isSubmitting}
                  />
                </div>
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
                          required={pduListForm.length === 1}
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
                        <label className="text-sm font-medium">
                          Select Keys
                        </label>
                        <Multiselect
                          value={pdu.keys}
                          options={pdu.filteredKeys || []}
                          placeholder="Select keys"
                          onChange={(selected) =>
                            updatePduKeys(index, selected)
                          }
                          disabled={isSubmitting || !pdu.topicUniqId}
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
                  onClick={handleAddPdu}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Rack/PDU
                </Button>

                <h6 className="font-semibold mt-3">Main Power</h6>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Device</label>
                  <Select
                    value={mainPowerForm.topicUniqId}
                    onValueChange={updateMainPowerTopic}
                    required
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Select Key</label>
                  <Select
                    value={mainPowerForm.key}
                    onValueChange={updateMainPowerKey}
                    required
                    disabled={isSubmitting || !mainPowerForm.topicUniqId}
                  >
                    <SelectTrigger>
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
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    isEditModalOpen
                      ? setIsEditModalOpen(false)
                      : setIsAddModalOpen(false)
                  }
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}{" "}
                  {isEditModalOpen ? "Save Changes" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                PUE Details for {selectedPueConfigDetail?.customName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Rack Name</TableHead>
                    <TableHead>PUE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPueConfigDetail?.pduList?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No racks available
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedPueConfigDetail?.pduList?.map((pdu, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{pdu.name || `PDU-${index + 1}`}</TableCell>
                        <TableCell>
                          {calculatePUEForPdu(
                            selectedPueConfigDetail.mainPower.value,
                            pdu.value
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
