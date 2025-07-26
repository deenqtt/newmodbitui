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

// Beri nilai awal yang aman untuk semua properti
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
  // State awal diubah menjadi "Connecting" untuk feedback UI yang lebih baik
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [isReady, setIsReady] = useState(false);
  const listenersRef = useRef<Map<string, MqttListener[]>>(new Map());

  const publish = useCallback((topic: string, payload: string) => {
    if (clientRef.current && clientRef.current.isConnected()) {
      const message = new Paho.Message(payload);
      message.destinationName = topic;
      clientRef.current.send(message);
    } else {
      console.error("MQTT client is not connected. Cannot publish message.");
    }
  }, []);

  const subscribe = useCallback((topic: string, listener: MqttListener) => {
    console.log(`[MQTT Context] Received subscribe request for: ${topic}`);
    const topicListeners = listenersRef.current.get(topic) || [];
    if (!topicListeners.includes(listener)) {
      listenersRef.current.set(topic, [...topicListeners, listener]);
    }
    // Lakukan subscribe ke broker hanya jika sudah terkoneksi
    if (clientRef.current && clientRef.current.isConnected()) {
      console.log(`[MQTT Broker] Subscribing to topic: ${topic}`);
      clientRef.current.subscribe(topic);
    }
  }, []);

  const unsubscribe = useCallback((topic: string, listener: MqttListener) => {
    console.log(`[MQTT Context] Received unsubscribe request for: ${topic}`);
    const topicListeners = listenersRef.current.get(topic) || [];
    const newListeners = topicListeners.filter((l) => l !== listener);
    if (newListeners.length > 0) {
      listenersRef.current.set(topic, newListeners);
    } else {
      listenersRef.current.delete(topic);
      if (clientRef.current && clientRef.current.isConnected()) {
        console.log(`[MQTT Broker] Unsubscribing from topic: ${topic}`);
        clientRef.current.unsubscribe(topic);
      }
    }
  }, []);

  useEffect(() => {
    if (clientRef.current) return;

    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"); // Sesuaikan dengan port Anda
    const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

    console.log(
      `[MQTT Provider] Attempting to connect to MQTT broker at ws://${mqttHost}:${mqttPort}`
    );

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;

    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.error(
          "[MQTT Provider] Connection Lost:",
          responseObject.errorMessage
        );
        setConnectionStatus("Disconnected");
      }
    };

    mqttClient.onMessageArrived = (message: Paho.Message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;
      // console.log(`[MQTT Provider] Message arrived on topic ${topic}:`, payload); // Uncomment untuk debug payload
      const topicListeners = listenersRef.current.get(topic) || [];
      topicListeners.forEach((listener) => listener(topic, payload));
    };

    mqttClient.connect({
      onSuccess: () => {
        console.log("[MQTT Provider] MQTT Connected Successfully!");
        setConnectionStatus("Connected");
        setIsReady(true);
        listenersRef.current.forEach((_, topic) => {
          console.log(
            `[MQTT Broker] Re-subscribing to topic on connect: ${topic}`
          );
          mqttClient.subscribe(topic);
        });
      },
      onFailure: (responseObject) => {
        console.error(
          "[MQTT Provider] MQTT Connection Failed:",
          responseObject.errorMessage
        );
        setConnectionStatus("Failed to Connect");
        setIsReady(true);
      },
      useSSL: false,
      reconnect: true,
      cleanSession: true,
    });

    return () => {
      if (clientRef.current && clientRef.current.isConnected()) {
        console.log("[MQTT Provider] Disconnecting MQTT client...");
        clientRef.current.disconnect();
      }
    };
  }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
