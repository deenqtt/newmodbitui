// hooks/useMQTTStatus.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { connectMQTT } from "@/lib/mqttClient";

export function useMQTTStatus() {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");

  const updateStatus = useCallback((newStatus: "connecting" | "connected" | "disconnected" | "error") => {
    setStatus(currentStatus => {
      // Prevent unnecessary updates
      if (currentStatus === newStatus) return currentStatus;
      return newStatus;
    });
  }, []);

  useEffect(() => {
    let client = connectMQTT();

    // Event handlers with stable references
    const handleConnect = () => updateStatus("connected");
    const handleError = () => updateStatus("error");
    const handleClose = () => {
      // Check if really disconnected, not just temp
      setTimeout(() => {
        if (client && !client.connected) {
          updateStatus("disconnected");
        }
      }, 100);
    };
    const handleReconnect = () => updateStatus("connecting");
    const handleOffline = () => updateStatus("disconnected");

    // Attach event listeners
    client.on("connect", handleConnect);
    client.on("error", handleError);
    client.on("close", handleClose);
    client.on("reconnect", handleReconnect);
    client.on("offline", handleOffline);

    // Initial status check
    if (client.connected) {
      updateStatus("connected");
    } else if (client.disconnected) {
      updateStatus("disconnected");
    } else {
      updateStatus("connecting");
    }

    // Cleanup function
    return () => {
      client.off("connect", handleConnect);
      client.off("error", handleError);
      client.off("close", handleClose);
      client.off("reconnect", handleReconnect);
      client.off("offline", handleOffline);
    };
  }, [updateStatus]);

  return status;
}
