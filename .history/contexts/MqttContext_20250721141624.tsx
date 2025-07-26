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
  const [connectionStatus, setConnectionStatus] = useState("Connecting"); // Ubah state awal
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
    const topicListeners = listenersRef.current.get(topic) || [];
    if (!topicListeners.includes(listener)) {
      listenersRef.current.set(topic, [...topicListeners, listener]);
    }
    // Lakukan subscribe ke broker hanya jika sudah terkoneksi
    if (clientRef.current && clientRef.current.isConnected()) {
      console.log(`Subscribing to topic: ${topic}`);
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
        console.log(`Unsubscribing from topic: ${topic}`);
        clientRef.current.unsubscribe(topic);
      }
    }
  }, []);

  useEffect(() => {
    // Pastikan useEffect hanya berjalan sekali
    if (clientRef.current) return;

    // --- PASTIKAN VARIABEL INI BENAR ---
    // Paho.js di browser menggunakan WebSockets, bukan TCP.
    // Pastikan broker Anda mengaktifkan listener WebSocket di port ini.
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001"); // Port WebSocket umum adalah 9001
    const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

    console.log(
      `Attempting to connect to MQTT broker at ws://${mqttHost}:${mqttPort}`
    );

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);
    clientRef.current = mqttClient;

    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.error("MQTT Connection Lost:", responseObject.errorMessage);
        setConnectionStatus("Disconnected");
        // Tidak perlu set isReady ke false, agar tidak memicu re-subscribe yang tidak perlu
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
        console.log("MQTT Connected Successfully!");
        setConnectionStatus("Connected");
        setIsReady(true); // Tandai provider siap setelah konek
        // Subscribe ulang semua topic yang sudah terdaftar di listeners
        listenersRef.current.forEach((_, topic) => {
          console.log(`Re-subscribing to topic on connect: ${topic}`);
          mqttClient.subscribe(topic);
        });
      },
      onFailure: (responseObject) => {
        // --- INI BAGIAN PENTING UNTUK DEBUGGING ---
        console.error("MQTT Connection Failed:", responseObject.errorMessage);
        setConnectionStatus("Failed to Connect");
        setIsReady(true); // Tetap tandai siap agar UI tidak stuck
      },
      useSSL: false, // ganti ke true jika broker Anda menggunakan wss://
      reconnect: true,
      cleanSession: true,
    });

    // Cleanup function untuk disconnect saat komponen di-unmount
    return () => {
      if (clientRef.current && clientRef.current.isConnected()) {
        console.log("Disconnecting MQTT client...");
        clientRef.current.disconnect();
      }
    };
  }, []); // Dependensi kosong agar hanya berjalan sekali

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
