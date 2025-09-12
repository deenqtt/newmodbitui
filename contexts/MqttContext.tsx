"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import Paho from "paho-mqtt";

// Tipe untuk callback listener
type MqttListener = (topic: string, payload: string) => void;

interface MqttContextType {
  isReady: boolean;
  connectionStatus: string;
  publish: (topic: string, payload: string) => void;
  subscribe: (topic: string, listener: MqttListener) => void;
  unsubscribe: (topic: string, listener: MqttListener) => void;
}

const MqttContext = createContext<MqttContextType>({
  isReady: false,
  connectionStatus: "Disconnected",
  publish: () => console.warn("MQTT Provider not ready"),
  subscribe: () => console.warn("MQTT Provider not ready"),
  unsubscribe: () => console.warn("MQTT Provider not ready"),
});

export function useMqtt() {
  return useContext(MqttContext);
}

export function MqttProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<Paho.Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [isReady, setIsReady] = useState(false);
  const listenersRef = useRef<Map<string, MqttListener[]>>(new Map());

  const publish = useCallback((topic: string, payload: string) => {
    if (clientRef.current && clientRef.current.isConnected()) {
      const message = new Paho.Message(payload);
      message.destinationName = topic;
      clientRef.current.send(message);
    }
  }, []);

  const subscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    if (!topicListeners.includes(listener)) {
      listenersRef.current.set(topic, [...topicListeners, listener]);
    }
    if (clientRef.current && clientRef.current.isConnected()) {
      clientRef.current.subscribe(topic);
    }
  }, []);

  const unsubscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    const newListeners = topicListeners.filter((l) => l !== listener);
    if (newListeners.length > 0) {
      listenersRef.current.set(topic, newListeners);
    } else {
      listenersRef.current.delete(topic);
      if (clientRef.current && clientRef.current.isConnected()) {
        clientRef.current.unsubscribe(topic);
      }
    }
  }, []);

  useEffect(() => {
    if (clientRef.current) return;

    // Fungsi untuk mendapatkan MQTT host berdasarkan environment
    const getMqttHost = () => {
      if (process.env.NODE_ENV === "production") {
        // Di production, gunakan window.location.hostname jika tersedia
        if (typeof window !== "undefined") {
          return window.location.hostname;
        }
        // Fallback jika window belum tersedia
        return "localhost";
      } else {
        // Di development, gunakan environment variable
        return process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
      }
    };

    const mqttHost = getMqttHost();
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000");
    const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

    console.log(
      `[MQTT] Connecting to ${mqttHost}:${mqttPort} (Environment: ${process.env.NODE_ENV})`
    );

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;
    mqttClient.onConnectionLost = (responseObject: Paho.MQTTError) => {
      if (responseObject.errorCode !== 0) {
        setConnectionStatus("Disconnected");
      }
    };
    mqttClient.onMessageArrived = (message: Paho.Message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;
      const topicListeners = listenersRef.current.get(topic) || [];
      topicListeners.forEach((listener) => listener(topic, payload));
    };
    mqttClient.connect({
      onSuccess: () => {
        setConnectionStatus("Connected");
        setIsReady(true);
        listenersRef.current.forEach((_, topic) => {
          mqttClient.subscribe(topic);
        });
      },
      onFailure: (responseObject: Paho.MQTTError) => {
        setConnectionStatus("Failed to Connect");
        setIsReady(true);
      },
      useSSL: false,
      reconnect: true,
      cleanSession: true,
    });
    return () => {
      if (clientRef.current && clientRef.current.isConnected()) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    console.log("[Global Cron] Memulai interval logging di background.");

    const intervalId = setInterval(() => {
      console.log("[Global Cron] Memicu semua cron job...");

      fetch("/api/cron/log-data").catch((err) => {
        console.error("[Global Cron] Gagal memicu log-data API:", err);
      });

      fetch("/api/cron/bill-logger").catch((err) => {
        console.error("[Global Cron] Gagal memicu bill-logger API:", err);
      });
    }, 600000); // 600000 ms = 10 menit

    return () => {
      console.log("[Global Cron] Menghentikan interval logging di background.");
      clearInterval(intervalId);
    };
  }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
