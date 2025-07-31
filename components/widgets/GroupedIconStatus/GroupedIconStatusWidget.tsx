// File: components/widgets/GroupedIconStatus/GroupedIconStatusWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle } from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap item dari config
interface ItemConfig {
  customName: string;
  deviceUniqId: string;
  selectedKey: string;
  units: string;
  multiply: string;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
}

// Sub-komponen untuk setiap baris status
const StatusRow = ({ itemConfig }: { itemConfig: ItemConfig }) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [topic, setTopic] = useState<string | null>(null);

  // 1. Ambil topic untuk item ini
  useEffect(() => {
    const fetchDeviceTopic = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${itemConfig.deviceUniqId}`
        );
        if (!response.ok) return;
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDeviceTopic();
  }, [itemConfig.deviceUniqId]);

  // 2. Handler MQTT
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(itemConfig.selectedKey)) {
          const rawValue = innerPayload[itemConfig.selectedKey];
          const multiplier = parseFloat(itemConfig.multiply) || 1;
          const finalValue =
            typeof rawValue === "number" ? rawValue * multiplier : rawValue;
          setDisplayValue(finalValue);
        }
      } catch (e) {
        /* silent fail */
      }
    },
    [itemConfig.selectedKey, itemConfig.multiply]
  );

  // 3. Subscribe/Unsubscribe
  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      subscribe(topic, handleMqttMessage);
      return () => unsubscribe(topic, handleMqttMessage);
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const IconComponent = getIconComponent(itemConfig.selectedIcon || "Zap");

  return (
    <div className="flex items-center gap-3 py-2">
      {IconComponent && (
        <div
          className="p-2 rounded-md flex items-center justify-center"
          style={{
            backgroundColor: itemConfig.iconBgColor,
            color: itemConfig.iconColor,
          }}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium truncate">{itemConfig.customName}</p>
      </div>
      <div className="font-semibold text-right">
        {displayValue === null ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {typeof displayValue === "number"
              ? displayValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : displayValue}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {itemConfig.units}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

interface Props {
  config: {
    title: string;
    items: ItemConfig[];
  };
}

export const GroupedIconStatusWidget = ({ config }: Props) => {
  if (!config || !config.items) {
    return (
      <div className="p-4 text-destructive text-center">
        <AlertTriangle className="mx-auto mb-2" />
        Widget not configured correctly.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <h3 className="font-bold text-lg mb-2 truncate">{config.title}</h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-1">
        {config.items.map((item, index) => (
          <StatusRow key={index} itemConfig={item} />
        ))}
      </div>
    </div>
  );
};
