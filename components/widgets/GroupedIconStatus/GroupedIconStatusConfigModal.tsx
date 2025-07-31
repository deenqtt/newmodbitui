// File: components/widgets/GroupedIconStatus/GroupedIconStatusConfigModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext";
import { iconLibrary } from "@/lib/icon-library";
import { PlusCircle, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap item dalam grup
interface GroupItem {
  id: string;
  customName: string;
  deviceUniqId: string | null;
  selectedKey: string | null;
  units: string;
  multiply: string;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
}

// Tipe untuk data perangkat dari API
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

// Komponen Form untuk satu item (diperbarui dengan logika MQTT)
const ItemForm = ({
  item,
  updateItem,
  removeItem,
  allDevices,
  isLoadingDevices,
}: {
  item: GroupItem;
  updateItem: (id: string, field: keyof GroupItem, value: any) => void;
  removeItem: (id: string) => void;
  allDevices: DeviceForSelection[];
  isLoadingDevices: boolean;
}) => {
  const { subscribe, unsubscribe } = useMqtt();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error("Failed to parse MQTT payload in item form:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const selectedDevice = allDevices.find(
      (d) => d.uniqId === item.deviceUniqId
    );
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    item.deviceUniqId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const handleDeviceChange = (value: string) => {
    updateItem(item.id, "deviceUniqId", value);
    updateItem(item.id, "selectedKey", null); // Reset key saat device berubah
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg relative bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={() => removeItem(item.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <div className="grid gap-2">
        <Label>Custom Name</Label>
        <Input
          value={item.customName}
          onChange={(e) => updateItem(item.id, "customName", e.target.value)}
          placeholder="e.g., Room Temperature"
        />
      </div>
      <div className="grid gap-2">
        <Label>Device</Label>
        {isLoadingDevices ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            onValueChange={handleDeviceChange}
            value={item.deviceUniqId || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a device" />
            </SelectTrigger>
            <SelectContent>
              {allDevices.map((d) => (
                <SelectItem key={d.uniqId} value={d.uniqId}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Data Key</Label>
        <Select
          onValueChange={(value) => updateItem(item.id, "selectedKey", value)}
          value={item.selectedKey || ""}
          disabled={!item.deviceUniqId || availableKeys.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                isWaitingForKey ? "Waiting for data..." : "Select a key"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Units</Label>
          <Input
            value={item.units}
            onChange={(e) => updateItem(item.id, "units", e.target.value)}
            placeholder="e.g., °C"
          />
        </div>
        <div className="grid gap-2">
          <Label>Multiplier</Label>
          <Input
            type="number"
            value={item.multiply}
            onChange={(e) => updateItem(item.id, "multiply", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export const GroupedIconStatusConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [items, setItems] = useState<GroupItem[]>([]);
  const [widgetTitle, setWidgetTitle] = useState("Grouped Status");

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setWidgetTitle("Grouped Status");
      addItem();

      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          setDevices(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();
    }
  }, [isOpen, onClose]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        customName: "",
        deviceUniqId: null,
        selectedKey: null,
        units: "",
        multiply: "1",
        selectedIcon: "Zap", // Ikon default bisa disesuaikan
        iconColor: "#FFFFFF",
        iconBgColor: "#3B82F6",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GroupItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    if (!widgetTitle || items.length === 0) {
      Swal.fire(
        "Incomplete",
        "Widget title and at least one item are required.",
        "warning"
      );
      return;
    }
    for (const item of items) {
      if (!item.customName || !item.deviceUniqId || !item.selectedKey) {
        Swal.fire(
          "Incomplete",
          `Please complete all fields for item: "${
            item.customName || "Untitled"
          }"`,
          "warning"
        );
        return;
      }
    }

    onSave({
      title: widgetTitle,
      items: items.map(({ id, ...rest }) => ({
        ...rest,
        multiply: parseFloat(rest.multiply) || 1,
      })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Grouped Icon Status
          </DialogTitle>
          <DialogDescription>
            Add and configure multiple status items to display in one widget.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Server Room Status"
            />
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <ItemForm
                key={item.id}
                item={item}
                updateItem={updateItem}
                removeItem={removeItem}
                allDevices={devices}
                isLoadingDevices={isLoadingDevices}
              />
            ))}
          </div>
          <Button variant="outline" onClick={addItem} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Another Item
          </Button>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
