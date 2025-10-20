// src/config/appConfig.ts

interface AppConfig {
  mqttBrokerUrl: string;
  apiBaseUrl: string;
}

// Legacy function for backward compatibility
// New code should use MQTTModeContext instead
export function getAppConfig(): AppConfig {
  let mqttBrokerUrl: string;
  let apiBaseUrl: string;

  // Check if we have a saved MQTT mode preference
  const savedMode =
    typeof window !== "undefined"
      ? localStorage.getItem("mqtt_connection_mode")
      : null;

  if (savedMode === "database") {
    // For legacy compatibility, return a placeholder URL
    // The actual URL will be resolved by MQTTModeContext
    mqttBrokerUrl = getEnvMQTTBrokerUrl(); // Use env fallback even in database mode
  } else {
    // ENV mode (default)
    mqttBrokerUrl = getEnvMQTTBrokerUrl();
  }

  // API URL logic remains the same
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:"
    ) {
      apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:8000";
    } else if (typeof window !== "undefined") {
      apiBaseUrl = `http://${window.location.hostname}:8000`;
    } else {
      apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    }
  } else {
    apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  }

  // Ensure URLs are defined
  if (!mqttBrokerUrl) {
    throw new Error("MQTT broker URL is not defined.");
  }
  if (!apiBaseUrl) {
    throw new Error("API base URL is not defined.");
  }

  return { mqttBrokerUrl, apiBaseUrl };
}

// Helper function to get MQTT URL from environment variables
export function getEnvMQTTBrokerUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  let host: string;
  let port: string;
  let protocol: string;

  if (isDevelopment) {
    // Development: Use ENV variables
    host = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    port = process.env.NEXT_PUBLIC_MQTT_PORT || "9000";
    protocol = "ws";
    console.log(`Config: Development mode - MQTT broker: ${host}:${port}`);
  } else if (isProduction) {
    // Production: Always use window.location.hostname, ignore ENV variables
    if (typeof window !== "undefined") {
      host = window.location.hostname;
      port = "9000"; // Fixed port for production
      protocol = window.location.protocol === "https:" ? "wss" : "ws";
      console.log(`Config: Production mode - MQTT broker: ${host}:${port} (${protocol})`);
      console.log(`Config: Using window.location.hostname: ${host}`);
    } else {
      // Fallback for SSR - still use hostname if available
      host = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
      port = "9000";
      protocol = "ws";
      console.log(`Config: SSR mode - MQTT broker: ${host}:${port}`);
    }
  } else {
    // Fallback
    host = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
    port = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000";
    protocol = "ws";
    console.log(`Config: Fallback mode - MQTT broker: ${host}:${port}`);
  }

  const brokerUrl = `${protocol}://${host}:${port}`;
  console.log(`Config: Final MQTT broker URL: ${brokerUrl}`);

  return brokerUrl;
}
