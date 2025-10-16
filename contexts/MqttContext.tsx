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

    const getMqttHost = () => {
      // Development: gunakan env variable
      if (process.env.NEXT_PUBLIC_MQTT_HOST) {
        return process.env.NEXT_PUBLIC_MQTT_HOST;
      }

      // Production: gunakan window.location.hostname jika tersedia (browser only)
      if (typeof window !== "undefined" && window.location) {
        return window.location.hostname;
      }

      // Fallback ke localhost
      return "localhost";
    };

    const mqttHost = getMqttHost();
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000");
    const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

    console.log(`MQTT Context: Connecting to broker at ${mqttHost}:${mqttPort}`);
    console.log(`MQTT Context: Broker host: ${mqttHost}`);
    console.log(`MQTT Context: Broker port: ${mqttPort}`);
    console.log(`MQTT Context: Environment: ${process.env.NODE_ENV}`);
    console.log(`MQTT Context: Client ID: ${clientId}`);

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;

    mqttClient.onConnectionLost = (responseObject: Paho.MQTTError) => {
      if (responseObject.errorCode !== 0) {
        console.warn(`MQTT Context: Connection lost to ${mqttHost}:${mqttPort}`);
        console.warn(`MQTT Context: Error code: ${responseObject.errorCode}`);
        console.warn(`MQTT Context: Error message: ${responseObject.errorMessage}`);
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
        console.log(`MQTT Context: Successfully connected to ${mqttHost}:${mqttPort}`);
        console.log(`MQTT Context: Connection state: CONNECTED`);
        setConnectionStatus("Connected");
        setIsReady(true);
        listenersRef.current.forEach((_, topic) => {
          mqttClient.subscribe(topic);
        });
      },
      onFailure: (responseObject: Paho.MQTTError) => {
        console.error(`MQTT Context: Failed to connect to ${mqttHost}:${mqttPort}`);
        console.error(`MQTT Context: Error code: ${responseObject.errorCode}`);
        console.error(`MQTT Context: Error message: ${responseObject.errorMessage}`);
        setConnectionStatus("Failed to Connect");
        setIsReady(false); // Set isReady ke false jika koneksi gagal
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
      // console.log("[Global Cron] Menghentikan interval logging di background.");
      clearInterval(intervalId);
    };
  }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
