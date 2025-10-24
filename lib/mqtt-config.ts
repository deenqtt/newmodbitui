// src/config/mqtt.ts

// MQTT Configuration Interface
export interface MQTTConfig {
  brokerUrl: string;
  wsUrl?: string; // Websocket URL for frontend
  tcpUrl?: string; // TCP URL for backend services
  username?: string;
  password?: string;
  source: 'env' | 'database';
  configId?: string;
  configName?: string;
}

// Pragma global variable untuk cache MQTT config
declare global {
  var __mqttConfigCache: MQTTConfig | null;
}

let currentMQTTConfig: MQTTConfig | null = null;

// Get MQTT source preference
export function getMQTTSource(): 'env' | 'database' {
  // Default to 'env' for backward compatibility
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mqtt-source');
      return (stored || 'env') as 'env' | 'database';
    }
    return global.__mqttConfigCache?.source || 'env';
  } catch {
    return 'env';
  }
}

// Set MQTT source preference (only for client-side)
export function setMQTTSource(source: 'env' | 'database'): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('mqtt-source', source);
      // Force reload MQTT connection
      if (currentMQTTConfig && currentMQTTConfig.source !== source) {
        forceReloadMQTT();
      }
    } catch (error) {
      console.error('Failed to save MQTT source preference:', error);
    }
  }
}

// Force reload MQTT connection by clearing cache
export function forceReloadMQTT(): void {
  currentMQTTConfig = null;
  global.__mqttConfigCache = null;

  // Dispatch event to notify client-side MQTT context to reconnect
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mqtt-config-reload'));
  }
}

// Legacy helper function - get only broker URL
export function getMQTTConfig(): string {
  return getMTTQConfigSync().brokerUrl;
}

// Get complete MQTT configuration with authentication
export async function getMQTTFullConfig(): Promise<MQTTConfig> {
  // Return cached config if available
  if (currentMQTTConfig) {
    return currentMQTTConfig;
  }

  const source = getMQTTSource();

  if (source === 'database') {
    try {
      // Try to get active config from database
      const response = await fetch('/api/mqtt-configurations/active');
      const result = await response.json();

      if (result.success && result.data) {
        currentMQTTConfig = {
          brokerUrl: result.data.brokerUrl,
          username: result.data.username,
          password: result.data.password,
          source: 'database',
          configId: result.data.id,
          configName: result.data.name,
        };

        console.log(`✅ CONFIG: Using database MQTT config: ${result.data.name}`);
        console.log(`✅ CONFIG: MQTT broker URL: ${result.data.brokerUrl}`);
        if (result.data.username) {
          console.log(`✅ CONFIG: MQTT authentication enabled for user: ${result.data.username}`);
        }

        return currentMQTTConfig;
      }
    } catch (error) {
      console.warn('Failed to load MQTT config from database, falling back to ENV:', error);
    }
  }

  // Parse environment variables to build different URLs
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
  const wsPort = parseInt(process.env.NEXT_PUBLIC_MQTT_WS_PORT || '9000');
  const tcpPort = parseInt(process.env.NEXT_PUBLIC_MQTT_TCP_PORT || '1883');
  const useSSL = process.env.NEXT_PUBLIC_MQTT_SSL === 'true';
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME || process.env.MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD || process.env.MQTT_PASSWORD;

  // Build URLs for different protocols
  const wsProtocol = useSSL ? 'wss://' : 'ws://';
  const tcpProtocol = useSSL ? 'mqtts://' : 'mqtt://';

  const wsUrl = `${wsProtocol}${host}:${wsPort}`;
  const tcpUrl = `${tcpProtocol}${host}:${tcpPort}`;

  // Silent config - no verbose logging on startup
  // Only log basic status for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📡 MQTT ready (${host}:${wsPort}/${tcpPort})`);
  }

  currentMQTTConfig = {
    brokerUrl: wsUrl, // Default to WebSocket for backward compatibility
    wsUrl,
    tcpUrl,
    ...(username && { username }),
    ...(password && { password }),
    source: 'env',
  };

  return currentMQTTConfig;
}

// Synchronous version for backward compatibility
export function getMTTQConfigSync(): MQTTConfig {
  // Try to return cached config
  if (currentMQTTConfig) {
    return currentMQTTConfig;
  }

  // Parse environment variables synchronously
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
  const wsPort = parseInt(process.env.NEXT_PUBLIC_MQTT_WS_PORT || '9000');
  const tcpPort = parseInt(process.env.NEXT_PUBLIC_MQTT_TCP_PORT || '1883');
  const useSSL = process.env.NEXT_PUBLIC_MQTT_SSL === 'true';
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME || process.env.MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD || process.env.MQTT_PASSWORD;

  // Build URLs for different protocols
  const wsProtocol = useSSL ? 'wss://' : 'ws://';
  const tcpProtocol = useSSL ? 'mqtts://' : 'mqtt://';

  const wsUrl = `${wsProtocol}${host}:${wsPort}`;
  const tcpUrl = `${tcpProtocol}${host}:${tcpPort}`;

  console.log(`ℹ️  CONFIG: Using synchronous MQTT config (ENV)`);

  currentMQTTConfig = {
    brokerUrl: wsUrl, // Default to WebSocket for backward compatibility
    wsUrl,
    tcpUrl,
    ...(username && { username }),
    ...(password && { password }),
    source: 'env',
  };

  return currentMQTTConfig;
}

// New helper functions for different protocols
export function getMQTTHost(): string {
  return process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
}

export function getMQTTWebSocketUrl(): string {
  const config = getMTTQConfigSync();
  return config.wsUrl || 'ws://localhost:9000';
}

export function getMQTTTcpUrl(): string {
  const config = getMTTQConfigSync();
  return config.tcpUrl || 'mqtt://localhost:1883';
}

export function getMQTTUsername(): string | undefined {
  const config = getMTTQConfigSync();
  return config.username;
}

export function getMQTTPassword(): string | undefined {
  const config = getMTTQConfigSync();
  return config.password;
}

// Legacy helper functions
export function getEnvMQTTBrokerUrl(): string {
  return getMTTQConfigSync().brokerUrl;
}

// Async versions for API routes
export async function getMQTTWebSocketUrlAsync(): Promise<string> {
  const config = await getMQTTFullConfig();
  return config.wsUrl || 'ws://localhost:9000';
}

export async function getMQTTTcpUrlAsync(): Promise<string> {
  const config = await getMQTTFullConfig();
  return config.tcpUrl || 'mqtt://localhost:1883';
}

export async function getMQTTAuthAsync(): Promise<{ username?: string; password?: string }> {
  const config = await getMQTTFullConfig();
  return {
    username: config.username,
    password: config.password,
  };
}
