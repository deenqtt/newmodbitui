// src/config/mqtt.ts

// MQTT Configuration Interface
export interface MQTTConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
}

// Legacy helper function - get only broker URL
export function getMQTTConfig(): string {
  return getMQTTFullConfig().brokerUrl;
}

// Get complete MQTT configuration with authentication
export function getMQTTFullConfig(): MQTTConfig {
  // Get MQTT_BROKER_URL from environment variables (NEXT_PUBLIC_ prefix for client-side)
  const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || process.env.MQTT_BROKER_URL;
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME || process.env.MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD || process.env.MQTT_PASSWORD;

  // Provide development fallback with warning for URL
  const finalUrl = brokerUrl || "ws://localhost:9000";

  if (!brokerUrl) {
    console.warn(
      "⚠️  CONFIG: NEXT_PUBLIC_MQTT_BROKER_URL not set! Using development fallback: ws://localhost:9000",
      "\n📝 Please set MQTT configuration in your .env file:",
      "\n   NEXT_PUBLIC_MQTT_BROKER_URL=\"wss://your-domain.com:8883\"",
      "\n   NEXT_PUBLIC_MQTT_USERNAME=\"your_username\" (optional)",
      "\n   NEXT_PUBLIC_MQTT_PASSWORD=\"your_password\" (optional)"
    );
  } else {
    console.log(`✅ CONFIG: MQTT broker URL: ${brokerUrl}`);
    if (username) {
      console.log(`✅ CONFIG: MQTT authentication enabled for user: ${username}`);
    } else {
      console.log(`ℹ️  CONFIG: MQTT authentication disabled (public broker)`);
    }
  }

  return {
    brokerUrl: finalUrl,
    ...(username && { username }),
    ...(password && { password }),
  };
}

// Legacy helper function - get only broker URL
export function getEnvMQTTBrokerUrl(): string {
  return getMQTTFullConfig().brokerUrl;
}
