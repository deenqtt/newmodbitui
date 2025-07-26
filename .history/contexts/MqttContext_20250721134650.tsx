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
  isReady: boolean; // <-- PROPERTI BARU
  connectionStatus: string;
  publish: (topic: string, payload: string) => void;
  subscribe: (topic: string, listener: MqttListener) => void;
  unsubscribe: (topic: string, listener: MqttListener) => void;
}

// Beri nilai awal yang aman untuk semua properti
const MqttContext = createContext<MqttContextType>({
  isReady: false,
  connectionStatus: "Disconnected",
  publish: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
});

export function useMqtt() {
  return useContext(MqttContext);
}

export function MqttProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<Paho.Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [isReady, setIsReady] = useState(false); // <-- STATE BARU
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

    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001");
    const clientId = `client-${Math.random()}`;

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;

    mqttClient.onConnectionLost = (responseObject) => {
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
        setIsReady(true); // <-- Tandai provider siap setelah konek
        listenersRef.current.forEach((_, topic) => {
          mqttClient.subscribe(topic);
        });
      },
      onFailure: () => {
        setConnectionStatus("Failed to Connect");
        setIsReady(true); // Tandai siap meskipun gagal, agar UI bisa lanjut
      },
      useSSL: false,
      reconnect: true,
    });
  }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
