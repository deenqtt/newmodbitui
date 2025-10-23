// File: lib/services/ec25-listener.ts
import mqtt from "mqtt";

// Import centralized MQTT configuration
import { getMQTTFullConfig } from "@/lib/mqtt-config";

// Configuration
const EC25_MQTT_CONFIG = getMQTTFullConfig();

interface ModemInfo {
  manufacturer?: string;
  model?: string;
  revision?: string;
  imei?: string;
}

interface NetworkInfo {
  operator?: string;
  registration_status?: string;
  network_type?: string;
  signal_strength?: number;
  signal_quality?: number;
}

interface GPSData {
  fix_status: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  satellites: number;
  gps_timestamp: string;
  imei?: string;
}

interface GSMData {
  timestamp: string;
  connected: boolean;
  status: string;
  modem: ModemInfo;
  network: NetworkInfo;
  signal_detailed?: any;
  apn: {
    name: string;
    username: string;
  };
}

interface EC25Status {
  timestamp: string;
  status: string;
  service_id: string;
  uptime: number;
  data?: any;
}

interface EC25Alert {
  timestamp: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  requires_action?: boolean;
  details?: string[];
}

interface EC25Response {
  timestamp: string;
  command: string;
  status: "success" | "error";
  message: string;
  data?: any;
}

interface EC25Heartbeat {
  timestamp: string;
  service_id: string;
  uptime: number;
  memory_usage: {
    cpu?: number;
    memory?: number;
    disk?: number;
    [key: string]: any;
  };
  status: string;
}

interface NetworkConnection {
  name: string;
  device: string | null;
  type: string;
  uuid: string;
  config?: {
    metric: number | string; // "auto", -1, atau angka
  };
  runtime?: {
    ip?: string;
    metric?: number;
  };
}

interface NetworkConnectionsResponse {
  timestamp: string;
  command: string;
  status: "success" | "error";
  message: string;
  data: {
    connections: NetworkConnection[];
  };
}

class EC25ListenerService {
  private client: mqtt.MqttClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private isConnected = false;

  // Data storage
  private currentGSMData: GSMData | null = null;
  private currentGPSData: GPSData | null = null;
  private currentStatus: EC25Status | null = null;
  private alerts: EC25Alert[] = [];
  private heartbeat: EC25Heartbeat | null = null;
  private responses: EC25Response[] = [];
  private networkConnections: NetworkConnection[] = [];

  // Callbacks for real-time updates
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Setup connection options with authentication if available
      const connectionOptions: mqtt.IClientOptions = {
        clientId: `ec25-web-client-${Date.now()}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: this.reconnectInterval,
      };

      // Add authentication if available
      if (EC25_MQTT_CONFIG.username) {
        connectionOptions.username = EC25_MQTT_CONFIG.username;
        connectionOptions.password = EC25_MQTT_CONFIG.password;
      }

      this.client = mqtt.connect(EC25_MQTT_CONFIG.brokerUrl, connectionOptions);

      this.client.on("connect", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
      });

      this.client.on("message", this.handleMessage.bind(this));

      this.client.on("error", (error) => {
        console.error("[EC25-LISTENER] MQTT Error:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });

      this.client.on("reconnect", () => {
        this.reconnectAttempts++;
      });
    } catch (error) {
      console.error("[EC25-LISTENER] Failed to connect to MQTT:", error);
    }
  }

  private subscribeToTopics() {
    if (!this.client) return;

    const topics = [
      "ec25/status",
      "ec25/gsm",
      "ec25/gps",
      "ec25/response",
      "ec25/alerts",
      "ec25/heartbeat",
      "ec25/network_connections", // Add network connections topic
    ];

    topics.forEach((topic) => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(
            `[EC25-LISTENER] Failed to subscribe to ${topic}:`,
            err
          );
        } else {
          console.log(`[EC25-LISTENER] Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      switch (topic) {
        case "ec25/gsm":
          this.currentGSMData = data as GSMData;
          this.notifyCallbacks("gsm", this.currentGSMData);
          break;

        case "ec25/gps":
          this.currentGPSData = data as GPSData;
          this.notifyCallbacks("gps", this.currentGPSData);
          break;

        case "ec25/status":
          this.currentStatus = data as EC25Status;
          this.notifyCallbacks("status", this.currentStatus);
          break;

        case "ec25/alerts":
          const alert = data as EC25Alert;
          this.alerts.unshift(alert); // Add to beginning
          // Keep only last 100 alerts
          if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(0, 100);
          }
          this.notifyCallbacks("alerts", alert);
          break;

        case "ec25/response":
          const response = data as EC25Response;

          // Handle network connections response specifically
          if (
            response.command === "list_network_connections" &&
            response.data?.connections
          ) {
            this.networkConnections = response.data
              .connections as NetworkConnection[];
            this.notifyCallbacks(
              "network_connections",
              this.networkConnections
            );
          }

          this.responses.unshift(response);
          if (this.responses.length > 50) {
            this.responses = this.responses.slice(0, 50);
          }
          this.notifyCallbacks("response", response);
          break;

        case "ec25/heartbeat":
          this.heartbeat = data as EC25Heartbeat;
          this.notifyCallbacks("heartbeat", this.heartbeat);
          break;

        case "ec25/network_connections":
          // Direct network connections data
          if (Array.isArray(data)) {
            this.networkConnections = data as NetworkConnection[];
          } else if (data.connections && Array.isArray(data.connections)) {
            this.networkConnections = data.connections as NetworkConnection[];
          }
          this.notifyCallbacks("network_connections", this.networkConnections);
          break;

        default:
          console.log(`[EC25-LISTENER] Unknown topic: ${topic}`, data);
      }
    } catch (error) {
      console.error(
        `[EC25-LISTENER] Error parsing message from ${topic}:`,
        error,
        "Raw message:",
        message.toString()
      );
    }
  }

  private notifyCallbacks(event: string, data: any) {
    const eventCallbacks = this.callbacks.get(event) || [];
    eventCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EC25-LISTENER] Error in callback for ${event}:`, error);
      }
    });
  }

  // Public methods for components to use
  public subscribe(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  public sendCommand(command: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        console.warn("[EC25-LISTENER] Client not connected, command queued");
        reject(new Error("MQTT client not connected"));
        return;
      }

      const commandPayload = {
        ...command,
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      this.client.publish(
        "ec25/commands",
        JSON.stringify(commandPayload),
        { qos: 1 },
        (error) => {
          if (error) {
            console.error("[EC25-LISTENER] Failed to send command:", error);
            reject(error);
          } else {
            console.log("[EC25-LISTENER] Command sent successfully");
            resolve();
          }
        }
      );
    });
  }

  // Getters for current data
  public getCurrentGSMData(): GSMData | null {
    return this.currentGSMData;
  }

  public getCurrentGPSData(): GPSData | null {
    return this.currentGPSData;
  }

  public getCurrentStatus(): EC25Status | null {
    return this.currentStatus;
  }

  public getAlerts(): EC25Alert[] {
    return [...this.alerts];
  }

  public getResponses(): EC25Response[] {
    return [...this.responses];
  }

  public getHeartbeat(): EC25Heartbeat | null {
    return this.heartbeat;
  }

  public isServiceConnected(): boolean {
    return this.isConnected;
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.heartbeat?.timestamp || null,
      lastUpdate:
        this.currentGSMData?.timestamp ||
        this.currentGPSData?.gps_timestamp ||
        null,
    };
  }

  public disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.isConnected = false;
  }

  // Network Management Methods
  public async listNetworkConnections(): Promise<void> {
    return this.sendCommand({
      type: "list_network_connections",
      data: {},
    });
  }

  public async setNetworkMetric(
    connectionName: string,
    metric: number
  ): Promise<void> {
    if (metric < 0 || metric > 1000) {
      throw new Error("Metric must be between 0 and 1000");
    }

    return this.sendCommand({
      type: "set_network_metric",
      data: {
        connection: connectionName,
        metric: metric,
      },
    });
  }

  public getNetworkConnections(): NetworkConnection[] {
    return [...this.networkConnections];
  }

  // Debug methods
  public getDebugInfo() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      hasGSMData: !!this.currentGSMData,
      hasGPSData: !!this.currentGPSData,
      hasStatus: !!this.currentStatus,
      hasHeartbeat: !!this.heartbeat,
      alertsCount: this.alerts.length,
      responsesCount: this.responses.length,
      networkConnectionsCount: this.networkConnections.length,
      callbacks: Object.fromEntries(
        Array.from(this.callbacks.entries()).map(([key, callbacks]) => [
          key,
          callbacks.length,
        ])
      ),
    };
  }

  // Force reconnection
  public forceReconnect() {
    if (this.client) {
      console.log("[EC25-LISTENER] Forcing reconnection...");
      this.client.end(true);
      setTimeout(() => {
        this.connect();
      }, 1000);
    }
  }
}

// Singleton instance
let ec25ListenerService: EC25ListenerService | null = null;

export function getEc25ListenerService(): EC25ListenerService {
  if (!ec25ListenerService) {
    ec25ListenerService = new EC25ListenerService();
  }
  return ec25ListenerService;
}

export type {
  ModemInfo,
  NetworkInfo,
  GPSData,
  GSMData,
  EC25Status,
  EC25Alert,
  EC25Response,
  EC25Heartbeat,
  NetworkConnection,
  NetworkConnectionsResponse,
};
