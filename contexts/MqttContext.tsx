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
    if (clientRef.current && typeof clientRef.current.isConnected === 'function' && clientRef.current.isConnected()) {
      try {
        const message = new Paho.Message(payload);
        message.destinationName = topic;
        clientRef.current.send(message);
      } catch (err) {
        console.warn(`MQTT publish failed for topic ${topic}:`, err);
      }
    }
  }, []);

  const subscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    if (!topicListeners.includes(listener)) {
      listenersRef.current.set(topic, [...topicListeners, listener]);
    }
    // Defer subscription to avoid constructor issues during React mount
    setTimeout(() => {
      if (clientRef.current && typeof clientRef.current.isConnected === 'function' && clientRef.current.isConnected()) {
        try {
          clientRef.current.subscribe(topic);
        } catch (err) {
          // Silently handle subscription error
        }
      }
    }, 1000); // Wait 1 second after connection is established
  }, []);

  const matchesTopic = (wildcard: string, actualTopic: string): boolean => {
    if (wildcard === actualTopic) return true;
    if (wildcard.endsWith('/#')) {
      const prefix = wildcard.slice(0, -2);
      return actualTopic.startsWith(prefix + '/');
    }
    if (wildcard.includes('+')) {
      // Basic + matching for single level
      const pattern = wildcard.replace(/\//g, '\\/').replace(/\+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(actualTopic);
    }
    return false;
  };

  const unsubscribe = useCallback((topic: string, listener: MqttListener) => {
    const topicListeners = listenersRef.current.get(topic) || [];
    const newListeners = topicListeners.filter((l) => l !== listener);
    if (newListeners.length > 0) {
      listenersRef.current.set(topic, newListeners);
    } else {
      listenersRef.current.delete(topic);
      if (clientRef.current && typeof clientRef.current.isConnected === 'function' && clientRef.current.isConnected()) {
        try {
          clientRef.current.unsubscribe(topic);
        } catch (err) {
          console.warn(`MQTT unsubscribe failed for topic ${topic}:`, err);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (clientRef.current) return;

    const getMqttHost = () => {
      // Production: SELALU gunakan window.location.hostname, abaikan ENV variables
      if (process.env.NODE_ENV === "production") {
        if (typeof window !== "undefined" && window.location) {
          return window.location.hostname;
        }
        // Fallback untuk SSR
        return "localhost";
      }

      // Development: gunakan env variable jika tersedia
      if (process.env.NEXT_PUBLIC_MQTT_HOST) {
        return process.env.NEXT_PUBLIC_MQTT_HOST;
      }

      // Fallback untuk development
      return "localhost";
    };

    const mqttHost = getMqttHost();
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000");
    const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

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
      listenersRef.current.forEach((topicListeners, wildcard) => {
        if (matchesTopic(wildcard, topic)) {
          topicListeners.forEach((listener) => listener(topic, payload));
        }
      });
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

  // DISABLED: Cron jobs are causing spam API calls. Run manually only when needed.
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     if (!(window as any).cronLogDataFetched) {
  //       (window as any).cronLogDataFetched = true;

  //       fetch("/api/cron/log-data").catch((err) => {
  //         // Silently handle cron API errors
  //       }).finally(() => {
  //         setTimeout(() => {
  //           if (window as any) {
  //             (window as any).cronLogDataFetched = false;
  //           }
  //         }, 60000); // Reset after 1 minute for log-data
  //       });
  //     }

  //     if (!(window as any).cronBillLoggerFetched) {
  //       (window as any).cronBillLoggerFetched = true;

  //       fetch("/api/cron/bill-logger").catch((err) => {
  //         // Silently handle cron API errors
  //       }).finally(() => {
  //         setTimeout(() => {
  //           if (window as any) {
  //             (window as any).cronBillLoggerFetched = false;
  //           }
  //         }, 60000); // Reset after 1 minute for bill-logger
  //       });
  //     }
  //   }, 600000); // 600000 ms = 10 menit
  // }, []);

  const value = { isReady, connectionStatus, publish, subscribe, unsubscribe };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
