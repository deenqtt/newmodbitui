// MQTT Configuration - Simplified WebSocket only version

// Get MQTT broker WebSocket URL from environment
export function getMQTTBrokerUrl(): string {
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
  const port = process.env.NEXT_PUBLIC_MQTT_PORT || '9000';
  const useSSL = process.env.NEXT_PUBLIC_MQTT_SSL === 'true';

  const protocol = useSSL ? 'wss://' : 'ws://';
  return `${protocol}${host}:${port}`;
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
