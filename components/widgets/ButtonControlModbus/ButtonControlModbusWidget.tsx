// File: components/widgets/ButtonControlModbus/ButtonControlModbusWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, Power, AlertTriangle } from "lucide-react";
import Swal from "sweetalert2";

// Tipe untuk data perangkat dari respons MQTT
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
  };
  protocol_setting: any;
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

// Helper function to map pin name to address, based on your Vue code
const mapPinToAddress = (key: string): number => {
  const match = key.match(/\d+/);
  return match ? parseInt(match[0], 10) + 8 : 9;
};

export const ButtonControlModbusWidget = ({ config }: Props) => {
  const { publish, subscribe, unsubscribe, isReady, connectionStatus } =
    useMqtt();

  const [currentState, setCurrentState] = useState<"UNKNOWN" | "ON" | "OFF">(
    "UNKNOWN"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [macAddress, setMacAddress] = useState<string | null>(null);

  // Subscribe ke 2 topik: status device dan config global (untuk MAC)
  useEffect(() => {
    if (
      !config.selectedDevice?.profile.topic ||
      !isReady ||
      connectionStatus !== "Connected"
    ) {
      setIsLoading(false);
      return;
    }

    const deviceTopic = config.selectedDevice.profile.topic;
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
  }, [config, isReady, connectionStatus, subscribe, unsubscribe]);

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
    const { protocol_setting } = selectedDevice;
    const newValue = currentState === "ON" ? offValue : onValue;

    const commandPayload = {
      mac: macAddress,
      number_address: protocol_setting.address,
      value: {
        address: mapPinToAddress(selectedKey),
        value: Number(newValue),
      },
      port: protocol_setting.port,
      baudrate: protocol_setting.baudrate,
      parity: protocol_setting.parity,
      bytesize: protocol_setting.bytesize,
      stop_bit: protocol_setting.stop_bit,
      timeout: protocol_setting.timeout,
      endianness: protocol_setting.endianness,
      data_type: "UINT16",
      function: "single",
    };

    const commandTopic = "modbus/control/command";
    const payloadString = JSON.stringify(commandPayload, null, 2);

    publish(commandTopic, JSON.stringify(commandPayload));
  };

  const buttonColor = {
    ON: "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/50",
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
