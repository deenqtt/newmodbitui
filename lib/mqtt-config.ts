// MQTT Configuration - Simplified WebSocket only version

// Get MQTT broker WebSocket URL
export function getMQTTBrokerUrl(): string {
  let host: string;
  let port: string;
  let useSSL: boolean;

  if (process.env.NODE_ENV === 'production') {
    // In production, use dynamic hostname from browser location
    host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    // Assume MQTT WS ports: 9000 for ws, 9443 for wss (common defaults)
    useSSL = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;
    port = useSSL ? '443' : '9000';
  } else {
    // In development, use environment variables
    host = process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
    port = process.env.NEXT_PUBLIC_MQTT_PORT || '9000';
    useSSL = process.env.NEXT_PUBLIC_MQTT_SSL === 'true';
  }

  const protocol = useSSL ? 'wss://' : 'ws://';
  const url = `${protocol}${host}:${port}`;

  console.log(`Connecting to MQTT broker: ${url}`);
  return url;
}

// Get MQTT authentication credentials
export function getMQTTUsername(): string | undefined {
  return process.env.NEXT_PUBLIC_MQTT_USERNAME || process.env.MQTT_USERNAME;
}

export function getMQTTPassword(): string | undefined {
  return process.env.NEXT_PUBLIC_MQTT_PASSWORD || process.env.MQTT_PASSWORD;
}

// Legacy compatibility functions
export function getMQTTConfig(): string {
  return getMQTTBrokerUrl();
}

export function getEnvMQTTBrokerUrl(): string {
  return getMQTTBrokerUrl();
}

// Async versions for backward compatibility
export async function getMQTTWebSocketUrlAsync(): Promise<string> {
  return getMQTTBrokerUrl();
}

export async function getMQTTAuthAsync(): Promise<{ username?: string; password?: string }> {
  return {
    username: getMQTTUsername(),
    password: getMQTTPassword(),
  };
}
