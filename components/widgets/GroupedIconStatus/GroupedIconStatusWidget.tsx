// File: components/widgets/GroupedIconStatus/GroupedIconStatusWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle, RadioTower } from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Tipe untuk setiap item dari config
interface ItemConfig {
  customName: string;
  deviceUniqId: string;
  selectedKey: string;
  units: string;
  multiply: number;
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
          const multiplier = itemConfig.multiply || 1;
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
    <div className="flex items-center gap-3 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors">
      {IconComponent && (
        <div
          className="p-2 rounded-md flex items-center justify-center self-start"
          style={{
            backgroundColor: itemConfig.iconBgColor,
            color: itemConfig.iconColor,
          }}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <p
          className="text-sm font-medium truncate"
          title={itemConfig.customName}
        >
          {itemConfig.customName}
        </p>
        <div className="font-semibold text-primary text-lg">
          {displayValue === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Ganti ke 2 kolom jika lebar widget cukup
        if (width > 350) {
          setColumnCount(2);
        } else {
          setColumnCount(1);
        }
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

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
      <div className="flex items-center text-sm font-semibold mb-2">
        <RadioTower className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.title}</h3>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto pr-2">
        <div
          className="grid gap-x-4 gap-y-2"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {config.items.map((item, index) => (
            <StatusRow key={index} itemConfig={item} />
          ))}
        </div>
      </div>
    </div>
  );
};
