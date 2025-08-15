// File: components/widgets/ButtonControlModular/ButtonControlModularWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, Power, AlertTriangle } from "lucide-react";
import Swal from "sweetalert2";

// Tipe untuk data perangkat dari config
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
    part_number: string;
  };
  protocol_setting: {
    protocol: string;
    address: number;
    device_bus: number | string;
  };
}

interface Props {
  config: {
    widgetTitle: string;
    selectedDevice: MqttDevice;
    selectedKey: string;
    onValue: string;
    offValue: string;
  };
}

// Helper function untuk mengambil nomor pin dari key
const extractPin = (key: string): number => {
  const match = key.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

export const ButtonControlModularWidget = ({ config }: Props) => {
  const { publish, subscribe, unsubscribe, isReady, connectionStatus } =
    useMqtt();

  const [currentState, setCurrentState] = useState<"UNKNOWN" | "ON" | "OFF">(
    "UNKNOWN"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [macAddress, setMacAddress] = useState<string | null>(null);

  const deviceTopic = config.selectedDevice?.profile.topic;

  // Subscribe ke 2 topik: status device dan config global (untuk MAC)
  useEffect(() => {
    if (!deviceTopic || !isReady || connectionStatus !== "Connected") {
      setIsLoading(false);
      return;
    }

    const configTopic = "mqtt_config";

    const handleMessage = (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        if (topic === configTopic) {
          setMacAddress(payload.mac || null);
        } else if (topic === deviceTopic) {
          const innerPayload =
            typeof payload.value === "string"
              ? JSON.parse(payload.value)
              : payload.value || {};
          if (innerPayload.hasOwnProperty(config.selectedKey)) {
            const rawValue = String(innerPayload[config.selectedKey]);
            if (rawValue === String(config.onValue)) {
              setCurrentState("ON");
            } else if (rawValue === String(config.offValue)) {
              setCurrentState("OFF");
            } else {
              setCurrentState("UNKNOWN");
            }
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Failed to parse payload:", e);
      }
    };

    setIsLoading(true);
    subscribe(deviceTopic, handleMessage);
    subscribe(configTopic, handleMessage);

    return () => {
      unsubscribe(deviceTopic, handleMessage);
      unsubscribe(configTopic, handleMessage);
    };
  }, [config, deviceTopic, isReady, connectionStatus, subscribe, unsubscribe]);

  const handleToggle = () => {
    if (currentState === "UNKNOWN" || !macAddress) {
      Swal.fire(
        "Error",
        "Cannot send command: device state is unknown or MAC address is missing.",
        "error"
      );
      return;
    }

    const { selectedDevice, selectedKey, onValue, offValue } = config;
    const { protocol_setting, profile } = selectedDevice;
    const newValue = currentState === "ON" ? Number(offValue) : Number(onValue);

    const commandPayload = {
      mac: macAddress,
      protocol_type: "Modular",
      device: profile.part_number,
      function: "write",
      value: {
        pin: extractPin(selectedKey),
        data: newValue,
      },
      address: protocol_setting.address,
      device_bus: protocol_setting.device_bus,
      Timestamp: new Date().toISOString(),
    };

    const commandTopic = "modular";
    const payloadString = JSON.stringify(commandPayload, null, 2);

    // Console Log untuk Debugging
    console.log(`[MQTT PUBLISH] to topic: ${commandTopic}`);
    console.log(`[MQTT PAYLOAD]:`, payloadString);

    publish(commandTopic, JSON.stringify(commandPayload));
  };

  const buttonColor = {
    ON: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/50",
    OFF: "bg-gray-400 hover:bg-gray-500 text-white",
    UNKNOWN: "bg-yellow-400 text-white cursor-not-allowed",
  }[currentState];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move">
      <h3 className="font-semibold text-md text-center truncate mb-4">
        {config.widgetTitle}
      </h3>
      <div className="flex-1 w-full flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        ) : (
          <button
            onClick={handleToggle}
            disabled={currentState === "UNKNOWN"}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 ${buttonColor}`}
          >
            <Power className="w-12 h-12" />
          </button>
        )}
      </div>
    </div>
  );
};
